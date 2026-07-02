# ornimap

Mapa interactivo de avistamientos de aves en España, construido sobre la API de [eBird](https://ebird.org/). Muestra los avistamientos recientes en un mapa (Leaflet) y, al seleccionar una comunidad autónoma, estadísticas por especie, por día y por tamaño de grupo (Chart.js).

## Stack

- **Backend**: Rust, actúa de proxy/agregador sobre la API de eBird.
- **Frontend**: Vue 3 + TypeScript + Vite, con Leaflet para el mapa y Chart.js para las gráficas.

## Estructura

```
ornimap/
-> backend/     # API en Rust (Axum)
    -> src/
     * communities.json   # listado de comunidades autónomas (id, nombre, código eBird, coordenadas)
    * Dockerfile
-> frontend/    # SPA en Vue 3 + Vite
    -> src/
```

## Requisitos

- [Rust](https://rustup.rs/) (edición 2024, se recomienda toolchain estable reciente)
- [Node.js](https://nodejs.org/) 20+
- Un token de la API de eBird: solicítalo en <https://ebird.org/api/keygen>

## Backend

```bash
cd backend
```

Crea el archivo `backend/.env` con tu token:

```
EBIRD_TOKEN=tu_token_aqui
```

Ejecutar en desarrollo:

```bash
cargo run
```

El servidor arranca en `http://0.0.0.0:3001` y expone:

- `GET /api/communities`           -> listado de comunidades autónomas
- `GET /api/all_observations`      -> todos los avistamientos
- `GET /api/observations/{region}` -> avistamientos de una región concreta

Compilar en modo release:

```bash
cargo build --release
```

### Con Docker

```bash
cd backend
docker build -t ornimap-backend .
docker run -p 3001:3001 --env-file .env ornimap-backend
```

## Frontend

```bash
cd frontend
npm install
```

Ejecutar en desarrollo (por defecto en `http://localhost:5173`, esperando el backend en `http://localhost:3001`):

```bash
npm run dev
```

Compilar para producción:

```bash
npm run build
```

Los archivos generados quedan en `frontend/dist`. Para previsualizar el build:

```bash
npm run preview
```

### Variables de entorno del frontend

- `VITE_API_BASE` -> URL base del backend (p. ej. `http://localhost:3001` en local, o la URL del backend desplegado en producción).
- `VITE_BASE_URL` -> ruta base de la app (usada para desplegar en GitHub Pages bajo `/<repo>/`); en local no hace falta configurarla.

## Despliegue

El frontend se despliega automáticamente a GitHub Pages mediante GitHub Actions (`.github/workflows/deploy.yml`) en cada push a `main`. Requiere:

1. Activar en el repo **Settings -> Pages -> Source -> GitHub Actions**.
2. Definir la variable de repositorio **`VITE_API_BASE`** (Settings -> Secrets and variables -> Actions -> Variables) apuntando al backend desplegado.

El backend no se despliega automáticamente; puede publicarse con la imagen Docker incluida en `backend/Dockerfile` en cualquier proveedor (Fly.io, Render, un VPS, etc.).
