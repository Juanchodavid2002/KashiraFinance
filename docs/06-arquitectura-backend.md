# 06 — Arquitectura Backend (NestJS)

---

## 1. Decisiones base

| Aspecto | Decisión |
|---------|----------|
| Framework | NestJS 10+ (TypeScript estricto) |
| Tipo | Monolito modular (un deploy, módulos por dominio) |
| API | REST bajo prefijo global `/api` |
| Validación | DTOs + `class-validator` + `ValidationPipe` global (whitelist + transform) |
| Auth | Passport JWT (`@nestjs/passport`, `passport-jwt`) + bcrypt |
| Config | `@nestjs/config` con validación de variables de entorno al arranque |
| Seguridad HTTP | Helmet desde el inicio; rate limiting en Fase 8 con `@nestjs/throttler` |
| ORM | Prisma (ver `07-modelo-de-datos.md`) |

## 2. Estructura de módulos

```
backend/src/
├── auth/
│   ├── auth.controller.ts        # POST register, login | GET me
│   ├── auth.service.ts           # hash, verificación, emisión JWT
│   ├── dto/                      # register.dto, login.dto
│   ├── strategies/jwt.strategy.ts
│   └── guards/                   # jwt-auth.guard (global), public.decorator
├── users/
│   └── users.service.ts          # creación, búsqueda por email, perfil
├── expenses/
│   ├── expenses.controller.ts
│   ├── expenses.service.ts       # CRUD + filtros + totales (siempre userId)
│   └── dto/                      # create-expense, update-expense (PartialType), query params
├── incomes/
│   └── (misma estructura que expenses)
├── categories/
│   ├── categories.service.ts     # merge defaults + propias, reglas de borrado
│   └── dto/
├── dashboard/
│   └── dashboard.service.ts      # agregaciones del mes, evolución 6 meses
├── reports/                      # MVP: reutiliza services de expenses/incomes
├── prisma/
│   ├── prisma.service.ts         # PrismaClient singleton + onModuleInit/destroy
│   └── prisma.module.ts          # @Global()
├── common/
│   ├── decorators/current-user.decorator.ts
│   ├── filters/all-exceptions.filter.ts   # formato de error uniforme
│   ├── enums/payment-method.enum.ts
│   └── pagination/dto.ts         # page, limit con límites
├── app.module.ts                 # ValidationPipe + Guard globales, Helmet, CORS
└── main.ts                       # prefijo /api, versionado, bootstrap
```

Reglas de dependencia: los módulos de dominio importan `PrismaModule` y `common`; nunca entre dominios salvo composición explícita vía services (ej. dashboard usa expenses/incomes/categories).

## 3. Capas y responsabilidades

```
Controller   → recibe HTTP, delega, NUNCA contiene lógica de negocio
Service      → lógica de negocio, ownership, transacciones Prisma si aplica
Prisma       → acceso a datos (queries tipadas, parametrizadas)
DTO          → contrato de entrada validado; nunca exponer entidades crudas sensibles
```

## 4. Autenticación y autorización

- **Guard global**: `JwtAuthGuard` registrado vía `APP_GUARD`. Endpoints públicos marcados con `@Public()` (register, login, health).
- **Ownership**: cada service extrae `userId` del token (decorador `@CurrentUser()`) y filtra todas las queries por él. Acceso a recurso ajeno → 404 (no revela existencia).
- Detalle completo: `09-autenticacion-y-seguridad.md`.

## 5. Validación

```ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,             // elimina propiedades no declaradas
  forbidNonWhitelisted: true,  // rechaza propiedades desconocidas (400)
  transform: true,             // transforma payloads a DTOs
}));
```

- Query params paginación: `page >= 1`, `1 <= limit <= 100`.
- Montos: número decimal positivo; se serializan como string desde Prisma Decimal.

## 6. Manejo de errores — formato uniforme

```json
{
  "statusCode": 400,
  "message": ["amount must be a positive number"],
  "error": "Bad Request"
}
```

- `AllExceptionsFilter` captura todo y normaliza la respuesta.
- `NotFoundException` para recursos inexistentes o ajenos.
- `ConflictException` para violaciones de unicidad (email, nombre de categoría) y borrado con dependencias.
- Logger central; sin stack traces al cliente en producción.

## 7. Configuración y arranque

Variables requeridas (validadas al boot, falla rápido si falta alguna):

```
DATABASE_URL     # cadena Neon con sslmode=require
JWT_SECRET       # >= 32 caracteres aleatorios
JWT_EXPIRES_IN   # ej. 7d
PORT             # Render inyecta su propio puerto
CORS_ORIGIN      # URL del frontend (Cloudflare Workers)
```

`main.ts`: prefijo global `/api`, CORS con origen único permitido, Helmet, listening en `process.env.PORT`.

Health check: `GET /api/health` → `{ "status": "ok" }` (público, sin DB check pesado).

## 8. Pruebas

| Nivel | Alcance prioritario |
|-------|---------------------|
| Unit (Jest, default NestJS) | AuthService (hash/verify/JWT), reglas de categorías, cálculos de dashboard |
| Integración ligera | Ownership: usuario B no accede recursos de usuario A |
| Manual E2E MVP | Flujos completos registro→gasto→dashboard (checklist en `11-roadmap.md`) |

Se prioriza cobertura donde hay riesgo real (auth y autorización); no se persigue % de cobertura arbitrario.

## 9. Scripts npm (convención)

```
npm run start:dev      # desarrollo con watch
npm run build          # compilación producción
npm run start:prod     # node dist/main.js
npx prisma migrate dev # migraciones (solo desarrollo)
npx prisma migrate deploy  # migraciones (producción, lo ejecuta Render)
```
