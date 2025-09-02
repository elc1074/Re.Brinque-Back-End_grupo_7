<?php
// Não precisa de cabeçalhos aqui, pois já estão no index.php

echo "<pre>"; // Formata a saída para ser mais legível no navegador

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    echo "FALHA NA CONEXÃO.\n\n";
    echo "Verifique os logs do container 'app_php' e 'sqlserver_db' para ver a mensagem de erro detalhada.";
    exit();
}

echo "CONEXÃO BEM-SUCEDIDA!\n\n";

try {
    // 1. Verifica em qual banco de dados estamos conectados
    $dbNameStmt = $db->query("SELECT DB_NAME() as db_name");
    $dbName = $dbNameStmt->fetch(PDO::FETCH_ASSOC);
    echo "Conectado ao banco de dados: " . htmlspecialchars($dbName['db_name']) . "\n\n";

    // 2. Lista todas as tabelas de usuário no banco de dados atual
    echo "Procurando por tabelas de usuário...\n";
    $queryTables = "SELECT name FROM sys.tables WHERE type = 'U' ORDER BY name";
    $stmtTables = $db->prepare($queryTables);
    $stmtTables->execute();

    $num = $stmtTables->rowCount();

    if ($num > 0) {
        echo "Tabelas encontradas ($num):\n";
        while ($row = $stmtTables->fetch(PDO::FETCH_ASSOC)) {
            echo "- " . htmlspecialchars($row['name']) . "\n";
        }
    } else {
        echo "Nenhuma tabela de usuário foi encontrada neste banco de dados.\n";
    }

    echo "\n----------------------------------------\n";
    echo "TENTANDO EXECUTAR 'SELECT' NA TABELA 'usuarios'...\n";
    echo "----------------------------------------\n\n";

    // 3. Tenta fazer uma contagem na tabela 'usuarios'
    $queryCount = "SELECT COUNT(*) as total FROM usuarios";
    $stmtCount = $db->prepare($queryCount);
    $stmtCount->execute();
    $result = $stmtCount->fetch(PDO::FETCH_ASSOC);

    echo "SUCESSO!\n";
    echo "Total de registros encontrados na tabela 'usuarios': " . $result['total'] . "\n";


} catch (PDOException $e) {
    echo "\nERRO DURANTE A CONSULTA:\n";
    // Exibe a mensagem de erro exata do SQL Server
    echo $e->getMessage();
}

echo "</pre>";