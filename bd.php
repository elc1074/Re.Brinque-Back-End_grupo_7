<?php

$dbHost     = getenv('DB_HOST');
$dbPort     = getenv('DB_PORT');
$database   = getenv('DB_DATABASE');
$username   = getenv('DB_USERNAME');
$password   = getenv('DB_PASSWORD');

if (empty($dbHost) || empty($dbPort) || empty($database) || empty($username) || empty($password)) {
    die("Erro: As variáveis de ambiente para conexão com o banco de dados não foram configuradas.");
}

$serverName = $dbHost . ',' . $dbPort;

try {
    $conn = new PDO(
        "sqlsrv:server=$serverName;Database=$database;Encrypt=yes;TrustServerCertificate=yes",
        $username,
        $password
    );

    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "Conexão com o banco de dados '" . htmlspecialchars($database) . "' foi um sucesso!";

    $conn = null;

} catch (PDOException $e) {

    error_log("Falha na conexão: " . $e->getMessage());

    die("Falha na conexão com o banco de dados.");
}
?>