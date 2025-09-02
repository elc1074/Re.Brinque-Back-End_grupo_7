<?php

class Usuario
{
    private PDO $conn;
    private string $tableName = "usuarios";

    public int $id;
    public string $nome_completo;
    public string $email;
    public string $senha;
    public ?string $telefone;
    public int $pontuacao;
    public string $data_cadastro;

    // Construtor com a conexão
    public function __construct(PDO $db)
    {
        $this->conn = $db;
    }


    // LER todos os usuários
    public function getAll(): PDOStatement
    {
        $query = "SELECT id, nome_completo, email, telefone, pontuacao, data_cadastro FROM " . $this->tableName . " ORDER BY nome_completo ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    // LER um único usuário pelo ID
    public function getById(int $id): ?array
    {
        $query = "SELECT id, nome_completo, email, telefone, pontuacao, data_cadastro FROM " . $this->tableName . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row) {
            return $row;
        }
        return null;
    }

    // CRIAR um novo usuário
    public function create(): bool
    {
        $query = "INSERT INTO " . $this->tableName . " (nome_completo, email, senha_hash, telefone) VALUES (:nome, :email, :senha_hash, :telefone)";

        $stmt = $this->conn->prepare($query);

        $this->nome_completo = htmlspecialchars(strip_tags($this->nome_completo));
        $this->email = htmlspecialchars(strip_tags($this->email));
        $this->telefone = htmlspecialchars(strip_tags($this->telefone ?? ''));
        
        $senha_hash = password_hash($this->senha, PASSWORD_BCRYPT);

        $stmt->bindParam(":nome", $this->nome_completo);
        $stmt->bindParam(":email", $this->email);
        $stmt->bindParam(":senha_hash", $senha_hash);
        $stmt->bindParam(":telefone", $this->telefone);

        if ($stmt->execute()) {
            return true;
        }

        error_log("Erro ao criar usuário: " . implode(" | ", $stmt->errorInfo()));
        return false;
    }

    public function login(string $email, string $senha): ?array
    {
        $query = "SELECT TOP (1) id, nome_completo, email, senha_hash FROM " . $this->tableName . " WHERE email = :email";

        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();
        
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($senha, $user['senha_hash'])) {
            return [
                'id' => $user['id'],
                'nome_completo' => $user['nome_completo'],
                'email' => $user['email']
            ];
        }

        return null;
    }
}