<?php
include_once __DIR__ . '/../models/Usuario.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class UsuarioController
{
    private ?PDO $db;
    private ?Usuario $usuario = null;

    public function __construct()
    {
        $database = new Database();
        $this->db = $database->getConnection();

        if ($this->db) {
            $this->usuario = new Usuario($this->db);
        }
    }
    
    private function checkConnection(): bool
    {
        if ($this->usuario === null) {
            http_response_code(503); 
            echo json_encode(["message" => "Não foi possível conectar ao serviço de banco de dados. Verifique os logs."]);
            return false;
        }
        return true;
    }

    private function validateToken(): ?object
    {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? null;

        if (!$authHeader) {
            http_response_code(401);
            echo json_encode(["message" => "Token de acesso não fornecido."]);
            return null;
        }

        $arr = explode(" ", $authHeader);
        $jwt = $arr[1] ?? '';

        if ($jwt) {
            try {
                $config = require __DIR__ . '/../config/config.php';
                $secret_key = $config['jwt']['key'];

                $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
                return $decoded;

            } catch (Exception $e) {
                http_response_code(401); 
                echo json_encode(["message" => "Token de acesso inválido ou expirado.", "error" => $e->getMessage()]);
                return null;
            }
        }
        
        http_response_code(401);
        echo json_encode(["message" => "Formato de token inválido."]);
        return null;
    }

    public function handleGetRequest(?int $id): void
    {
        $decodedToken = $this->validateToken();
        if (!$decodedToken) {
            return;
        }

        if (!$this->checkConnection()) {
            return;
        }

        if ($id) {
            $result = $this->usuario->getById($id);
            if ($result) {
                http_response_code(200);
                echo json_encode($result);
            } else {
                http_response_code(404);
                echo json_encode(["message" => "Usuário não encontrado."]);
            }
        } else {
            $stmt = $this->usuario->getAll();
            $num = $stmt->rowCount();

            if ($num > 0) {
                $usuarios_arr = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $usuarios_arr[] = $row;
                }
                http_response_code(200);
                echo json_encode($usuarios_arr);
            } else {
                http_response_code(200);
                echo json_encode([]);
            }
        }
    }

    public function handlePostRequest(): void
    {
        
        if (!$this->checkConnection()) {
            return;
        }
        
        $data = json_decode(file_get_contents("php://input"));

        if (
            !empty($data->nome_completo) &&
            !empty($data->email) &&
            !empty($data->senha)
        ) {
            $this->usuario->nome_completo = $data->nome_completo;
            $this->usuario->email = $data->email;
            $this->usuario->senha = $data->senha;
            $this->usuario->telefone = $data->telefone ?? null;

            if ($this->usuario->create()) {
                http_response_code(201);
                echo json_encode(["message" => "Usuário criado com sucesso."]);
            } else {
                http_response_code(503);
                echo json_encode(["message" => "Não foi possível criar o usuário. O e-mail pode já estar em uso."]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Dados incompletos. Por favor, envie nome_completo, email e senha."]);
        }
    }

    public function handleLoginRequest(): void
    {
        if (!$this->checkConnection()) {
            return;
        }

        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->email) || empty($data->senha)) {
            http_response_code(400); // Bad Request
            echo json_encode(["message" => "Por favor, forneça email e senha."]);
            return;
        }

        $user = $this->usuario->login($data->email, $data->senha);

        if ($user) {
            $config = require __DIR__ . '/../config/config.php';
            $secret_key = $config['jwt']['key'];
            $issuer_claim = $config['jwt']['iss'];
            $audience_claim = $config['jwt']['aud'];
            $issuedat_claim = time();
            $notbefore_claim = $issuedat_claim;
            $expire_claim = $issuedat_claim + 3600;

            $payload = [
                "iss" => $issuer_claim,
                "aud" => $audience_claim,
                "iat" => $issuedat_claim,
                "nbf" => $notbefore_claim,
                "exp" => $expire_claim,
                "data" => [
                    "id" => $user['id'],
                    "nome" => $user['nome_completo'],
                    "email" => $user['email']
                ]
            ];

            $jwt = JWT::encode($payload, $secret_key, 'HS256');

            http_response_code(200);
            echo json_encode([
                "message" => "Login bem-sucedido.",
                "token" => $jwt,
                "expiresIn" => $expire_claim
            ]);
        } else {
            http_response_code(401); 
            echo json_encode(["message" => "Login falhou. E-mail ou senha incorretos."]);
        }
    }
}
