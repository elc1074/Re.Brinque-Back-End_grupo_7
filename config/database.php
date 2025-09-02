<?php

class Database
{
    private ?PDO $conn = null;

    public function getConnection(): ?PDO
    {
        if ($this->conn === null) {
            $dbHost     = getenv('DB_HOST');
            $dbPort     = getenv('DB_PORT');
            $database   = getenv('DB_DATABASE');
            $username   = getenv('DB_USERNAME');
            $password   = getenv('DB_PASSWORD');

            if (empty($dbHost) || empty($dbPort) || empty($database) || empty($username)) {
                error_log("Erro: As variáveis de ambiente para conexão com o banco de dados não foram configuradas.");
                return null;
            }

            $serverName = $dbHost . ',' . $dbPort;

            try {
                $this->conn = new PDO(
                    "sqlsrv:server=$serverName;Database=$database;Encrypt=yes;TrustServerCertificate=yes",
                    $username,
                    $password
                );

                $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            } catch (PDOException $e) {
                error_log("Falha na conexão com o banco de dados: " . $e->getMessage());
                return null;
            }
        }

        return $this->conn;
    }
}

    

