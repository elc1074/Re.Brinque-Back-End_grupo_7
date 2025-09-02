<?php
// Inclui a classe do banco de dados
include_once __DIR__ . '/../config/database.php';

// Tenta estabelecer a conexão
$database = new Database();
$db = $database->getConnection();

// Prepara a resposta
if ($db) {
    // Se a conexão for bem-sucedida
    http_response_code(200);
    echo json_encode(
        [
            "status" => "ok",
            "message" => "Conexão com o banco de dados bem-sucedida."
        ]
    );
} else {
    // Se a conexão falhar
    http_response_code(500); // Erro Interno do Servidor
    echo json_encode(
        [
            "status" => "error",
            "message" => "Falha na conexão com o banco de dados. Verifique os logs do container para mais detalhes."
        ]
    );
}