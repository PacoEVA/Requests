# Despliegue Docker para LAN

Esta guia deja Requests disponible en la red local usando:

- Frontend: `http://10.0.0.54:9090`
- Backend: `http://10.0.0.54:5001`
- SQL Server externo en la misma PC host

## Requisitos

- Docker Desktop instalado y ejecutandose.
- SQL Server con TCP/IP habilitado.
- SQL Server escuchando en el puerto `1433`.
- Autenticacion SQL habilitada.
- Base de datos `Requests` creada manualmente.
- Usuario SQL con permisos sobre la base de datos.
- Firewall de Windows permitiendo TCP `9090` y `5001`.

## Configuracion

1. Copie el archivo de ejemplo:

```powershell
Copy-Item .env.docker.example .env.docker
```

2. Edite `.env.docker` y coloque valores reales:

```env
JWT_SECRET=una-clave-larga-y-segura
DB_USER=request_user
DB_PASSWORD=su-password-real
```

Para SQL Server en la misma PC donde corre Docker Desktop, deje:

```env
DB_SERVER=host.docker.internal
```

## Levantar la aplicacion

```powershell
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d
```

## Validar

Desde la PC host:

```powershell
Invoke-WebRequest http://10.0.0.54:9090 -UseBasicParsing
Invoke-WebRequest http://10.0.0.54:9090/api/health -UseBasicParsing
Invoke-WebRequest http://10.0.0.54:5001/api/health -UseBasicParsing
```

Desde otro equipo de la LAN, abra:

```text
http://10.0.0.54:9090
```

## Logs

```powershell
docker compose --env-file .env.docker logs -f
```

## Detener

```powershell
docker compose --env-file .env.docker down
```

## Base de datos

Docker no ejecuta migraciones ni seeds automaticamente. Ejecute los scripts SQL manualmente en SQL Server cuando sea necesario.

Los scripts estan en:

- `backend/src/database/migrations`
- `backend/src/database/seeds`
