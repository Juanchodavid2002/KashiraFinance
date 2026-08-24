# 12 — Decisiones Técnicas (ADRs)

Formato: **Decisión → Contexto → Opciones → Selección → Justificación → Consecuencias**.
Las decisiones aquí registran la fuente de verdad; cambiar una decisión exige actualizar este documento y la documentación afectada.

---

## ADR-001 — PostgreSQL como base de datos

- **Contexto:** aplicación financiera con relaciones fuertes entre usuarios, gastos, ingresos y categorías; requiere integridad y agregaciones precisas.
- **Opciones:** PostgreSQL · MySQL · MongoDB.
- **Selección:** PostgreSQL (Neon gestionado).
- **Justificación:** datos estructurados con integridad referencial obligatoria; tipos `DECIMAL` exactos para dinero; funciones de agregación robustas para dashboard; Neon ofrece Postgres estándar en free tier real.
- **Consecuencias:** esquema rígido controlado por migraciones; MongoDB descartada por falta de transacciones relacionales naturales.

## ADR-002 — Prisma como ORM

- **Contexto:** NestJS + TypeScript necesita acceso tipado a la BD con migraciones mantenibles.
- **Opciones:** Prisma · TypeORM · Sequelize · SQL crudo.
- **Selección:** Prisma.
- **Justificación:** tipado end-to-end generado desde el schema, migraciones declarativas claras, prevención de SQLi por construcción, mejor DX del ecosistema actual.
- **Consecuencias:** dependencia del generador de cliente; queries crudas limitadas a casos excepcionales.

## ADR-003 — Monorepo único

- **Contexto:** dos aplicaciones (Angular/NestJS) desplegadas independientemente.
- **Opciones:** monorepo · dos repositorios.
- **Selección:** monorepo con carpetas `frontend/` y `backend/`; Vercel y Render configuran root directory.
- **Justificación:** un solo lugar para docs, issues y versionado; commits atómicos que cruzan front/back; sin necesidad de Nx/turborepo para esta escala.
- **Consecuencias:** CI/CD por servicio filtrando cambios por carpeta si luego se necesita.

## ADR-004 — Monolito modular NestJS

- **Contexto:** MVP personal con visión de crecimiento hacia negocios.
- **Opciones:** microservicios · monolito modular.
- **Selección:** monolito modular.
- **Justificación:** simplicidad operativa (un deploy), transacciones locales fáciles, refactor a servicios posterior posible gracias al aislamiento por módulos.
- **Consecuencias:** escala vertical; límites de free tier documentados aceptados.

## ADR-005 — JWT simple en localStorage (MVP)

- **Contexto:** autenticación stateless para API REST + SPA.
- **Opciones:** access token 7d en localStorage · refresh token corto + cookie httpOnly.
- **Selección:** access token único (~7 días) en localStorage.
- **Justificación:** mínima complejidad para MVP personal; CSRF no aplica a tokens en header; riesgo XSS mitigado (sanitización Angular, Helmet, whitelist DTOs).
- **Consecuencias:** token no revocable antes de expirar; refresh tokens httpOnly documentados como evolución en Fase 8.

## ADR-006 — Categorías híbridas

- **Contexto:** UX requiere categorías listas para usar + flexibilidad personal.
- **Opciones:** solo globales · solo por usuario · híbrido.
- **Selección:** híbrido — 11 predeterminadas globales (`isDefault=true`, `userId=null`) + personalizadas por usuario.
- **Justificación:** onboarding inmediato sin seed por registro; personalización real; un solo modelo/tabla; las globales no son editables ni eliminables.
- **Consecuencias:** queries filtran `OR(userId = X, isDefault)`; borrado de propias restringido si tiene gastos (409).

## ADR-007 — Sin campo de moneda en el MVP

- **Contexto:** ejemplos del producto usan COP; no hay conversión de divisas.
- **Opciones:** decimal puro · campo currency por usuario · multi-moneda completa.
- **Selección:** decimal sin divisa explícita; formato visual COP en UI.
- **Justificación:** cero complejidad analítica; agregar columna después es migración trivial.
- **Consecuencias:** i18n/multi-moneda quedan como mejora futura.

## ADR-008 — Enum fijo de métodos de pago

- **Contexto:** gasto necesita método de pago para análisis.
- **Opciones:** enum fijo · tabla de métodos personalizables.
- **Selección:** enum fijo `CASH | DEBIT_CARD | CREDIT_CARD | TRANSFER | OTHER`.
- **Justificación:** consistencia garantizada para agrupaciones; cubre casos personales; "OTHER" absorbe excepciones.
- **Consecuencias:** nuevo método = migración enum (barata en PG); tabla personalizable postergada a etapa 2.

## ADR-009 — UUIDs como claves primarias

- **Contexto:** PKs para entidades expuestas en URLs REST.
- **Opciones:** serial/int · UUID v4.
- **Selección:** UUID v4.
- **Justificación:** no revelan volumen ni orden; seguras en URLs; sin coordinación para inserts futuros distribuidos.
- **Consecuencias:** índices ligeramente mayores que int; irrelevante a esta escala.

## ADR-010 — Fechas: DATE para movimientos, TIMESTAMPTZ para auditoría

- **Contexto:** reportes mensuales exigen agrupar por día calendario sin sorpresas de timezone.
- **Selección:** `expense_date`/`income_date` como `DATE`; `created_at`/`updated_at` como `TIMESTAMPTZ`.
- **Justificación:** el valor financiero vive en el día; eliminar la hora elimina bugs de TZ en agregaciones; auditoría conserva precisión UTC.
- **Consecuencias:** frontend formatea fechas localmente (`dd/mm/yyyy`).

## ADR-011 — Chart.js directo (sin wrapper)

- **Contexto:** gráficos de dona y barras en dashboard/reports.
- **Opciones:** chart.js directo · ng2-charts · librería alternativa (ApexCharts).
- **Selección:** chart.js directo con componentes wrapper propios.
- **Justificación:** menos dependencias intermedias; control total del ciclo de vida del canvas; bundle menor.
- **Consecuencias:** gestión manual de instancias (destroy on destroy) documentada.

## ADR-012 — CSS propio con design tokens (sin framework UI)

- **Contexto:** UI responsive mobile-first sin dependencias pesadas.
- **Opciones:** Tailwind · Angular Material · CSS propio.
- **Selección:** CSS propio con variables (tokens) para el MVP.
- **Justificación:** control total del look financiero (verde ingresos / rojo gastos), sin curva ni lock-in; la app tiene pocas pantallas.
- **Consecuencias:** más trabajo artesanal de estilos; revisar decisión si crece el catálogo de componentes (Material/Tailwind como candidatas).

## ADR-013 — Guard global con @Public()

- **Contexto:** evitar endpoints privados olvidados.
- **Selección:** `JwtAuthGuard` global vía APP_GUARD; solo register/login/health marcados públicos.
- **Justificación:** secure by default; añadir endpoint nuevo lo hace privado automáticamente.
- **Consecuencias:** cada endpoint público debe justificarse explícitamente.

## ADR-014 — Hard delete en el MVP

- **Contexto:** eliminación de gastos/ingresos/categorías.
- **Opciones:** soft delete (deletedAt) · hard delete físico.
- **Selección:** hard delete físico.
- **Justificación:** simplicidad de queries y totales; backups futuros darán red de seguridad.
- **Consecuencias:** sin papelera; soft delete registrado como decisión pendiente.

## ADR-015 — Entorno de desarrollo con PostgreSQL 18 local

- **Contexto:** la documentación original planteaba desarrollar directamente contra Neon; los cold starts y la dependencia de red frenan el ciclo local. El equipo dispone de PostgreSQL 17 y 18 instalados en Windows.
- **Opciones:** desarrollo contra Neon remoto · desarrollo contra PostgreSQL 18 local · SQLite (excluido por decisión de stack).
- **Selección:** PostgreSQL 18.6 local (`localhost:5432`), base `kashira_dev`, rol dedicado `kashira_app` con `CREATEDB` (necesario para el shadow database de `prisma migrate dev`) y contraseña aleatoria solo en `.env`.
- **Justificación:** iteración rápida sin latencia ni cold starts; mismo motor y versión mayor que producción; Prisma se comporta idéntico.
- **Consecuencias:** producción continúa en Neon (`sslmode=require`, pooler); riesgo de divergencia mínimo; backups locales manuales hasta definir estrategia en Fase 8.

---

## Decisiones pendientes (NO implementar sin aprobar)

### DP-01 — Recuperación de contraseña
- **Problema:** usuario pierde acceso si olvida contraseña; no hay flujo.
- **Opciones:** email con token temporario · preguntas de seguridad (inseguras) · soporte manual.
- **Recomendación:** email con token expirable (requiere proveedor de correo gratis, ej. Resend).
- **Impacto:** bajo; Fase 8. Sin email transaccional no hay alternativa segura automática.

### DP-02 — Soft delete
- **Problema:** borrados físicos son irreversibles.
- **Opciones:** mantener hard delete · `deletedAt` parcial en Expense/Income.
- **Recomendación:** evaluar tras usar la app 1 mes; los backups pueden bastar.
- **Impacto:** medio en queries y filtros si se adopta.

### DP-03 — Backups independientes
- **Problema:** confiar solo en snapshots del proveedor.
- **Opciones:** pg_dump programado desde CI · script manual mensual · servicio gestionado.
- **Recomendación:** GitHub Action semanal con pg_dump cifrado a storage externo.
- **Impacto:** bajo costo; definir retención y prueba de restauración.

### DP-04 — Refresh tokens
- **Problema:** expiración 7d implica logins frecuentes en uso diario largo plazo.
- **Recomendación:** medir fricción real; si molesta, implementar rotación de refresh en cookie httpOnly (cambia estrategia CSRF).
- **Impacto:** medio-alto en auth.

### DP-05 — Monitoreo externo
- **Problema:** errores de producción invisibles hoy.
- **Opciones:** Sentry free tier · UptimeRobot (disponibilidad) · logs manuales.
- **Recomendación:** Sentry backend+frontend (free) en Fase 8.
- **Impacto:** bajo.

### DP-06 — Presupuestos y metas
- **Problema:** valor alto de producto pero fuera del alcance definido.
- **Recomendación:** etapa 2, tras validar el MVP en uso diario.
- **Impacto:** alta complejidad (nueva entidad + UI + alertas).

### DP-07 — PWA instalable
- **Problema:** acceso móvil frecuente sugiere app instalable.
- **Recomendación:** post-MVP; Angular service worker nativo, sin infra extra.
- **Impacto:** bajo.
