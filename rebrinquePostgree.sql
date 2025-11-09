-- Tabela de usuários
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    pontuacao INT DEFAULT 100,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de endereços
CREATE TABLE enderecos (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    cep VARCHAR(9) NOT NULL,
    logradouro VARCHAR(255) NOT NULL,
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado CHAR(2) NOT NULL,
    principal BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabela de categorias
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

-- Tabela de anúncios
CREATE TABLE anuncios (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    categoria_id INT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    marca VARCHAR(100) NULL,
    endereco_completo TEXT,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('TROCA','DOACAO')),
    condicao VARCHAR(10) NOT NULL CHECK (condicao IN ('NOVO','SEMINOVO','USADO')),
    status VARCHAR(15) DEFAULT 'DISPONIVEL' CHECK (status IN ('DISPONIVEL','NEGOCIANDO','FINALIZADO')),
    data_publicacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

-- Tabela de imagens dos anúncios
CREATE TABLE imagensAnuncio (
    id SERIAL PRIMARY KEY,
    anuncio_id INT NOT NULL,
    url_imagem VARCHAR(512) NOT NULL,
    principal BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (anuncio_id) REFERENCES anuncios(id) ON DELETE CASCADE
);

-- Tabela de transações
CREATE TABLE transacoes (
    id SERIAL PRIMARY KEY,
    anuncio_id INT NOT NULL,
    anunciante_id INT NOT NULL,
    interessado_id INT NOT NULL,
    status VARCHAR(15) DEFAULT 'EM_ANDAMENTO' CHECK (status IN ('EM_ANDAMENTO','CONCLUIDA','CANCELADA')),
    data_conclusao TIMESTAMP,
    FOREIGN KEY (anuncio_id) REFERENCES anuncios(id),
    FOREIGN KEY (anunciante_id) REFERENCES usuarios(id),
    FOREIGN KEY (interessado_id) REFERENCES usuarios(id)
);

-- Tabela de avaliações
CREATE TABLE avaliacoes (
    id SERIAL PRIMARY KEY,
    transacao_id INT NOT NULL UNIQUE,
    avaliador_id INT NOT NULL,
    avaliado_id INT NOT NULL,
    nota INT NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario TEXT,
    data_avaliacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transacao_id) REFERENCES transacoes(id),
    FOREIGN KEY (avaliador_id) REFERENCES usuarios(id),
    FOREIGN KEY (avaliado_id) REFERENCES usuarios(id)
);

-- Adiciona a coluna google_id na tabela de usuários
ALTER TABLE usuarios
ADD COLUMN google_id VARCHAR(255) NULL;

-- Torna a coluna senha_hash opcional (permite valores nulos)
ALTER TABLE usuarios
ALTER COLUMN senha_hash DROP NOT NULL;


CREATE TABLE conversas (
    id SERIAL PRIMARY KEY,
    anuncio_id INT NOT NULL,
    anunciante_id INT NOT NULL,
    interessado_id INT NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversa_anuncio FOREIGN KEY (anuncio_id) REFERENCES anuncios(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversa_anunciante FOREIGN KEY (anunciante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversa_interessado FOREIGN KEY (interessado_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    -- Garante que só exista uma conversa por anúncio/interessado
    UNIQUE (anuncio_id, interessado_id)
);

-- Tabela para armazenar cada mensagem individualmente
CREATE TABLE mensagens (
    id SERIAL PRIMARY KEY,
    conversa_id INT NOT NULL,
    remetente_id INT NOT NULL, -- ID do usuário que enviou
    conteudo TEXT NOT NULL,
    data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lida BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_mensagem_conversa FOREIGN KEY (conversa_id) REFERENCES conversas(id) ON DELETE CASCADE,
    CONSTRAINT fk_mensagem_remetente FOREIGN KEY (remetente_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

ALTER TABLE usuarios
ADD COLUMN foto_perfil_url VARCHAR(255) NULL; -- NULL torna o campo opcional