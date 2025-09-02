<?php
require_once __DIR__ . '/vendor/autoload.php';

header("Access-Control-Allow-Origin: *");

if (strpos($_SERVER['REQUEST_URI'], '/api/debug') === false) {
    header("Content-Type: application/json; charset=UTF-8");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once __DIR__ . '/config/database.php';
include_once __DIR__ . '/controllers/UsuarioController.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$requestMethod = $_SERVER["REQUEST_METHOD"];

// Remove a barra inicial e final para consistência no roteamento
$trimmedUri = trim($uri, '/');
$uriSegments = explode('/', $trimmedUri);

// CORREÇÃO: Trata a rota raiz ('/' ou '/index.php') para o Health Check do Render
if (empty($trimmedUri) || $trimmedUri === 'index.php') {
    http_response_code(200);
    echo json_encode(["status" => "ok", "message" => "API Re.Brinque está online."]);
    exit();
}

if (isset($uriSegments[0]) && $uriSegments[0] !== 'api') {
    http_response_code(404);
    echo json_encode(["message" => "Endpoint não encontrado. A rota deve começar com /api."]);
    exit();
}

$resource = $uriSegments[1] ?? null;
$id = $uriSegments[2] ?? null;


switch ($resource) {
    case 'debug':
        include_once __DIR__ . '/api/debug.php';
        break;

    case 'usuarios':
        $controller = new UsuarioController();
        switch ($requestMethod) {
            case 'GET':
                $controller->handleGetRequest($id);
                break;
            case 'POST':
                $controller->handlePostRequest();
                break;
            default:
                http_response_code(405);
                echo json_encode(["message" => "Método não permitido para este recurso."]);
                break;
        }
        break;
    case 'login':
        $controller = new UsuarioController();
        if ($requestMethod == 'POST') {
            $controller->handleLoginRequest();
        } else {
            http_response_code(405);
            echo json_encode(["message" => "Use o método POST para fazer login."]);
        }
        break;
    default:
        http_response_code(404);
        echo json_encode(["message" => "Recurso não encontrado."]);
        break;
}