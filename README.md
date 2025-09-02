
# Re.Brinque-Back-End_grupo_7
- Banco hospedado na azure for students (**usar o minimo possivel!!**)
- Usar o banco local sempre que possivel

- Como utilizar o back-end:
	- Clonar repositório
	-  Ter o docker instalado
	- Entrar na pasta do repositorio e executar esse comando no cmd: `docker-compose up -d --build`
	- A principio rodará a aplicação local e o banco
	- Depois entrar em um gerenciado de banco de dados (que suporte sql server)
	- Os dados para conexão estão no arquivo `docker-compose.yml`
	- É possivel utilizar outros, mas ai atualizar ali também.
	- Depois de ter realizado a conexão criar o banco
	- `CREATE DATABASE master;`
	- Depois executar o codigo do arquivo `sqlServer.sql` no banco

 - Sistemas de login e cadastro prontos (daqui um tempo adiciono as rotas)
