# Estágio 1: Instalar as dependências com o Composer
FROM composer:2.7 as builder
WORKDIR /app
# ALTERAÇÃO: Copia composer.json e composer.lock (se existir)
# Isso evita o erro de build se o composer.lock for deletado.
COPY composer.* ./
RUN composer install --no-interaction --no-dev --optimize-autoloader

# Estágio 2: Preparar a imagem final com PHP, Apache e os drivers do SQL Server
FROM php:8.2-apache

# --- INÍCIO: Instalação dos drivers do SQL Server (Método Moderno) ---
# 1. Instala utilitários e dependências do sistema
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    lsb-release \
    unixodbc-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 2. Cria o diretório para as chaves GPG
RUN install -d -m 0755 /etc/apt/keyrings

# 3. Baixa a chave GPG da Microsoft, converte e salva no local correto
RUN curl -sS https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /etc/apt/keyrings/microsoft.gpg

# 4. Adiciona o repositório da Microsoft, referenciando a chave salva
RUN echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/microsoft.gpg] https://packages.microsoft.com/debian/11/prod bullseye main" > /etc/apt/sources.list.d/mssql-release.list

# 5. Instala o driver ODBC da Microsoft
RUN apt-get update && ACCEPT_EULA=Y apt-get install -y msodbcsql18

# 6. Instala as extensões PHP para SQL Server via PECL
RUN pecl install sqlsrv pdo_sqlsrv

# 7. Habilita as extensões no PHP
RUN docker-php-ext-enable sqlsrv pdo_sqlsrv
# --- FIM: Instalação dos drivers ---

WORKDIR /var/www/html

# Copia a pasta 'vendor' com as dependências já instaladas do estágio anterior
COPY --from=builder /app/vendor/ /var/www/html/vendor/

# Copia o restante do código da sua aplicação
COPY . /var/www/html/

# Habilita o mod_rewrite do Apache para URLs amigáveis
RUN a2enmod rewrite

# Garante que o Apache tenha as permissões corretas
RUN chown -R www-data:www-data /var/www/html
