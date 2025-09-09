CREATE TABLE usuarios (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    pontuacao INT DEFAULT 100,
    data_cadastro DATETIME DEFAULT GETDATE()
);

CREATE TABLE enderecos (
    id INT IDENTITY(1,1) PRIMARY KEY,
    usuario_id INT NOT NULL,
    cep VARCHAR(9) NOT NULL,
    logradouro VARCHAR(255) NOT NULL,
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado CHAR(2) NOT NULL,
    principal BIT DEFAULT 0,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE categorias (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE anuncios (
    id INT IDENTITY(1,1) PRIMARY KEY,
    usuario_id INT NOT NULL,
    categoria_id INT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao VARCHAR(MAX),
    marca VARCHAR(100) NULL, -- <-- Nova coluna adicionada
    endereco_completo VARCHAR(MAX),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('TROCA','DOACAO')),
    condicao VARCHAR(10) NOT NULL CHECK (condicao IN ('NOVO','SEMINOVO','USADO')),
    status VARCHAR(15) DEFAULT 'DISPONIVEL' CHECK (status IN ('DISPONIVEL','NEGOCIANDO','FINALIZADO')),
    data_publicacao DATETIME DEFAULT GETDATE(),
    data_atualizacao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

CREATE TABLE imagensAnuncio (
    id INT IDENTITY(1,1) PRIMARY KEY,
    anuncio_id INT NOT NULL,
    url_imagem VARCHAR(512) NOT NULL,
    principal BIT DEFAULT 0,
    FOREIGN KEY (anuncio_id) REFERENCES anuncios(id) ON DELETE CASCADE
);


CREATE TABLE transacoes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    anuncio_id INT NOT NULL,
    anunciante_id INT NOT NULL,
    interessado_id INT NOT NULL,
    status VARCHAR(15) DEFAULT 'EM_ANDAMENTO' CHECK (status IN ('EM_ANDAMENTO','CONCLUIDA','CANCELADA')),
    data_conclusao DATETIME,
    FOREIGN KEY (anuncio_id) REFERENCES anuncios(id),
    FOREIGN KEY (anunciante_id) REFERENCES usuarios(id),
    FOREIGN KEY (interessado_id) REFERENCES usuarios(id)
);

CREATE TABLE avaliacoes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    transacao_id INT NOT NULL UNIQUE,
    avaliador_id INT NOT NULL,
    avaliado_id INT NOT NULL,
    nota INT NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario VARCHAR(MAX),
    data_avaliacao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (transacao_id) REFERENCES transacoes(id),
    FOREIGN KEY (avaliador_id) REFERENCES usuarios(id),
    FOREIGN KEY (avaliado_id) REFERENCES usuarios(id)
);