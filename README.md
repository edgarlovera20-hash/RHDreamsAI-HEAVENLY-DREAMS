# RHDreams

Plataforma de RH con WhatsApp + Agentes AI (Claude / OpenAI / Gemini / Groq / cualquier endpoint OpenAI-compatible).

## Estructura

- `src/` — Frontend (React + Vite + TypeScript + Tailwind)
- `server/` — Backend (Express + SQLite + whatsapp-web.js + multi-IA)
- `server/data/` — DB local (`rhdreams.db`) + sesiones WhatsApp persistidas. **No** se commitea.

## Requisitos

- Node.js 20+
- Chromium (incluido vía Puppeteer cuando instalas deps; ya está en `~/.cache/puppeteer`)

## Instalación

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` por conflicto pre-existente de `react-quill` con React 19.

Copia `.env.example` a `.env.local` y ajusta si quieres cambiar el puerto del API:

```
API_PORT=3001
```

## Desarrollo

```bash
npm run dev
```

Esto levanta:
- Frontend: http://localhost:3000 (Vite, proxy `/api` → backend)
- Backend: http://localhost:3001

Si prefieres correrlos por separado:

```bash
npm run dev:web      # solo frontend
npm run dev:server   # solo backend
```

## Configuración inicial

1. Abre http://localhost:3000
2. Ve a **Configuración → Proveedores IA**
3. Agrega tu primer proveedor (recomendado: Claude). Pega tu API key (`sk-ant-...`) y marca como default.
4. Pulsa **Probar** para verificar la conexión.
5. Ve a **Cuentas de WhatsApp → Enlazar Nueva Cuenta**.
6. Escanea el QR real con tu teléfono (WhatsApp → Dispositivos vinculados).
7. Elige un agente (los 3 viven sembrados en DB). Las respuestas automáticas usan el proveedor default.

## Endpoints API

| Método | Ruta                         | Descripción                                    |
|--------|------------------------------|------------------------------------------------|
| GET    | `/api/health`                | Healthcheck                                    |
| GET    | `/api/agents`                | Lista agentes                                  |
| PATCH  | `/api/agents/:id`            | Actualizar agente (nombre, prompt, status…)    |
| GET    | `/api/accounts`              | Lista cuentas WhatsApp + estado live           |
| POST   | `/api/accounts`              | Crear cuenta + iniciar sesión WhatsApp         |
| PATCH  | `/api/accounts/:id`          | Actualizar (agente, mensajes automáticos…)     |
| DELETE | `/api/accounts/:id`          | Desvincular y borrar sesión                    |
| GET    | `/api/accounts/:id/stream`   | SSE: estado + QR data URL en vivo              |
| GET    | `/api/providers`             | Lista proveedores IA                           |
| POST   | `/api/providers`             | Agregar proveedor                              |
| PATCH  | `/api/providers/:id`         | Actualizar                                     |
| POST   | `/api/providers/:id/default` | Marcar como default                            |
| POST   | `/api/providers/:id/test`    | Probar (envía un "say hello")                  |
| DELETE | `/api/providers/:id`         | Eliminar                                       |

## Límites

- Máximo **3 cuentas WhatsApp activas simultáneas** (configurable en `server/whatsapp.ts`, `MAX_ACTIVE_SESSIONS`).
- Las sesiones se persisten en `server/data/wa-sessions/session-<id>/` — sobreviven reinicios.

## Build

```bash
npm run build
```

Compila sólo el frontend a `dist/`. Para deployar el backend, usa `npm run dev:server` o compila con `tsc` (luego `node dist-server/index.js`).
