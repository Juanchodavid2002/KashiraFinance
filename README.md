# Kashira Finance

Plataforma web de gestión y organización financiera personal. Registra ingresos y gastos en segundos y convierte tus movimientos en información clara, visual y útil para tomar mejores decisiones.

> "No se trata solamente de registrar dinero. Se trata de entender qué está pasando con él."

---

## Misión

Proporcionar una herramienta sencilla, accesible y organizada que permita registrar, visualizar y analizar la información financiera de personas y organizaciones, facilitando el control de sus ingresos, gastos y recursos para promover una gestión financiera más consciente, organizada y eficiente.

## Visión

Convertir a Kashira Finance en una plataforma integral de gestión financiera que evolucione desde el control de las finanzas personales hasta la administración financiera de pequeños negocios y empresas.

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 18+ (standalone), TypeScript estricto, Reactive Forms, Chart.js |
| Backend | NestJS (monolito modular), TypeScript estricto |
| Base de datos | PostgreSQL (Neon) |
| ORM | Prisma |
| Autenticación | JWT + bcrypt |
| Despliegue | Cloudflare Workers (frontend) · Render (backend) · Neon (BD) |

## Arquitectura

```
     Cloudflare                   Render                  Neon
   ┌─────────────┐    HTTPS   ┌─────────────┐   Prisma   ┌──────────┐
   │   Angular   │ ─────────▶ │    NestJS   │ ─────────▶ │PostgreSQL│
   │  frontend/  │ ◀───────── │  backend/   │ ◀───────── │          │
   └─────────────┘  JSON+JWT  └─────────────┘            └──────────┘
```

Documentación completa en [`docs/`](docs/) — es la fuente de verdad del proyecto:

1. [Visión del proyecto](docs/01-vision-del-proyecto.md)
2. [Requerimientos funcionales](docs/02-requerimientos-funcionales.md)
3. [Requerimientos no funcionales](docs/03-requerimientos-no-funcionales.md)
4. [Arquitectura](docs/04-arquitectura.md)
5. [Arquitectura frontend](docs/05-arquitectura-frontend.md)
6. [Arquitectura backend](docs/06-arquitectura-backend.md)
7. [Modelo de datos](docs/07-modelo-de-datos.md)
8. [API REST](docs/08-api.md)
9. [Autenticación y seguridad](docs/09-autenticacion-y-seguridad.md)
10. [Despliegue](docs/10-despliegue.md)
11. [Roadmap](docs/11-roadmap.md)
12. [Decisiones técnicas](docs/12-decisiones-tecnicas.md)

## Requisitos

- Node.js LTS (20+)
- npm
- PostgreSQL 18 local (desarrollo) · cuenta Neon (producción)

## Estructura del proyecto

```
KashiraFinance/
├── docs/        # Documentación del proyecto
├── frontend/    # Aplicación Angular (Fase 2)
└── backend/     # API NestJS + Prisma (Fase 2)
```

## Instalación y ejecución local (a partir de Fase 2)

```bash
# Backend
cd backend
npm install
cp .env.example .env        # completar DATABASE_URL, JWT_SECRET, etc.
npx prisma migrate dev
npm run start:dev           # http://localhost:3000/api

# Frontend (otra terminal)
cd frontend
npm install
npm start                   # http://localhost:4200
```

## Variables de entorno (backend)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Cadena conexión PostgreSQL (Neon, `sslmode=require`) |
| `JWT_SECRET` | Secreto firma JWT (>= 32 caracteres aleatorios) |
| `JWT_EXPIRES_IN` | Expiración token (ej. `7d`) |
| `PORT` | Puerto HTTP |
| `CORS_ORIGIN` | Origen permitido del frontend |

Nunca subir `.env` reales al repositorio (ver `.gitignore`). Referencia sin secretos: `.env.example`.

## Estado actual

**Fase 7 — Producción** completada. Siguiente: seguridad y mantenimiento (Fase 8). Ver [Roadmap](docs/11-roadmap.md).

## Roadmap (resumen)

1. Documentación y arquitectura ✅
2. Inicialización técnica (Angular + NestJS + Prisma + Neon) ✅
3. Autenticación (JWT, guards, interceptores) ✅
4. Gastos (CRUD, filtros, categorías) ✅
5. Ingresos ✅
6. Dashboard (resumen mensual, gráficos) ✅
7. Producción (Cloudflare Workers + Render + Neon) ✅
8. Seguridad y mantenimiento (rate limiting, backups, monitoreo)
