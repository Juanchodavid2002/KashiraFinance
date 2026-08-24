# 03 — Requerimientos No Funcionales

**Kashira Finance** — MVP Etapa 1

---

## 1. Seguridad

| ID | Requerimiento |
|----|---------------|
| RNF-S1 | Contraseñas hasheadas con bcrypt (cost >= 10). Jamás en texto plano ni reversibles. |
| RNF-S2 | Autenticación stateless con JWT; expiración máxima 7 días. |
| RNF-S3 | Todos los endpoints privados protegidos por JWT Guard global. |
| RNF-S4 | Autorización por propiedad (ownership): cada query filtra por el `userId` del token. |
| RNF-S5 | Validación estricta de entrada en backend (DTOs + `class-validator`, whitelist). |
| RNF-S6 | CORS restringido al origen del frontend (variable `CORS_ORIGIN`). |
| RNF-S7 | Secretos únicamente en variables de entorno; `.env` jamás en Git (solo `.env.example`). |
| RNF-S8 | Protección SQL Injection: Prisma usa queries parametrizadas; sin SQL crudo concatenado. |
| RNF-S9 | XSS: Angular sanitiza por defecto; no usar `bypassSecurityTrust` sin justificación; headers de seguridad con Helmet en backend. |
| RNF-S10 | Rate limiting con `@nestjs/throttler` (Fase 8; documentado desde ya). |

Detalle completo en `09-autenticacion-y-seguridad.md`.

## 2. Rendimiento

| ID | Objetivo |
|----|----------|
| RNF-P1 | Endpoints CRUD simples: p95 < 500 ms (sin contar latencia de red). |
| RNF-P2 | Dashboard agregado: < 1 s con hasta ~10.000 registros por usuario. |
| RNF-P3 | Listados siempre paginados (default 20, máximo 100 por página). |
| RNF-P4 | Bundle inicial de Angular < 500 KB gzipped; rutas con lazy loading. |
| RNF-P5 | Cold starts de Neon y Render free tier documentados y aceptados como límite del plan gratuito. |

## 3. Usabilidad / Accesibilidad

| ID | Requerimiento |
|----|---------------|
| RNF-U1 | Responsive mobile-first; usable en celular, tablet, portátil y computador. |
| RNF-U2 | Registrar un gasto en menos de 30 segundos desde móvil (máximo 3 pasos, teclado numérico para monto). |
| RNF-U3 | Tamaños táctiles mínimos (botones >= 44 px) y contrastes legibles. |
| RNF-U4 | Mensajes de error claros y accionables, en español. |
| RNF-U5 | Estados de carga visibles (spinners/skeletons) en operaciones de red. |

## 4. Disponibilidad

| ID | Requerimiento |
|----|---------------|
| RNF-D1 | Despliegue en free tiers: Vercel (frontend), Render (backend), Neon (BD). Costo objetivo: $0/mes. |
| RNF-D2 | Spin-down de Render (~15 min de inactividad) y autosuspend de Neon aceptados y documentados. |
| RNF-D3 | Health check endpoint (`GET /api/health`) sin autenticación para monitoreo. |

Límites de los planes gratuitos documentados en `10-despliegue.md`.

## 5. Mantenibilidad y Calidad de Código

| ID | Requerimiento |
|----|---------------|
| RNF-M1 | TypeScript en modo estricto en frontend y backend. |
| RNF-M2 | Monolito modular NestJS: un dominio = un módulo. |
| RNF-M3 | DTOs con validación declarativa; sin tipos `any`. |
| RNF-M4 | Lógica de negocio en services; controllers delgados. |
| RNF-M5 | Sin sobreingeniería: prohibidos Docker, Kubernetes, microservicios, Redis, Kafka, GraphQL (prompt maestro §41). |
| RNF-M6 | `docs/` es la fuente de verdad; toda decisión relevante genera un ADR en `12-decisiones-tecnicas.md`. |
| RNF-M7 | Commits atómicos con mensajes descriptivos (convención tipo Conventional Commits). |
| RNF-M8 | Pruebas automatizadas donde aporten valor real (auth, autorización, servicios críticos). |

## 6. Escalabilidad (preparación, no implementación)

- Modelo multiusuario con UUID y ownership desde el inicio.
- Módulos NestJS autocontenidos: agregar "organizations" o "roles" no obliga a reescribir lo existente.
- Categorías híbridas soportan personalización por usuario y futuras entidades de negocio.
- PostgreSQL + Prisma escalan verticalmente suficiente para cubrir las etapas 1 y 2.

## 7. Compatibilidad

- Navegadores evergreen (Chrome, Edge, Firefox, Safari en versiones recientes).
- Sin soporte a Internet Explorer.
- Instalable como PWA en el futuro (no MVP).

## 8. Observabilidad

| ID | Requerimiento |
|----|---------------|
| RNF-O1 | Logging básico de errores en backend (logger de NestJS). |
| RNF-O2 | Sin PII ni secretos en logs. |
| RNF-O3 | Monitoreo externo (Sentry/UptimeRobot): decisión pendiente, Fase 8. |
