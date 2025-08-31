# Re.Brinque-Back-End_grupo_7

- Banco hospedado na azure for students (**usar o minimo possivel!!**)
- Back hospedado no render
- Usar o banco local sempre que possivel
- Configurar banco localmente:
	- Baixar o codigo sql sqlServer.sql
	- Ter o docker (opcional)
	- Rodar isso no cmd:
	- `docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=#Dsf8491!" -p 1433:1433 --name sql-server-dev -v sql-data-volume:/var/opt/mssql -d mcr.microsoft.com/mssql/server:2022-latest`