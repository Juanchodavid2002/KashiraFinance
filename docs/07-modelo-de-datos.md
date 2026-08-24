# 07 — Modelo de Datos

**Kashira Finance** — MVP Etapa 1. Entidades: `User`, `Category`, `Expense`, `Income`.

---

## 1. Diagrama Entidad-Relación

```mermaid
erDiagram
    USER ||--o{ EXPENSE : "registra"
    USER ||--o{ INCOME : "registra"
    USER ||--o{ CATEGORY : "crea (propias)"
    CATEGORY ||--o{ EXPENSE : "clasifica"

    USER {
        uuid id PK "uuid v4"
        varchar email UK "único, lowercase"
        varchar name "1-80 chars"
        varchar password_hash "bcrypt"
        timestamptz created_at
        timestamptz updated_at
    }

    CATEGORY {
        uuid id PK
        varchar name "obligatorio"
        varchar color "opcional, hex"
        varchar icon "opcional"
        boolean is_default "true = global predeterminada"
        uuid user_id FK "NULL para predeterminadas globales"
        timestamptz created_at
        timestamptz updated_at
    }

    EXPENSE {
        uuid id PK
        uuid user_id FK "NOT NULL"
        uuid category_id FK "NOT NULL"
        varchar description "max 200, opcional"
        decimal amount "decimal(14,2), > 0"
        date expense_date "fecha del gasto, sin hora"
        enum payment_method "CASH | DEBIT_CARD | CREDIT_CARD | TRANSFER | OTHER"
        text notes "opcional"
        timestamptz created_at
        timestamptz updated_at
    }

    INCOME {
        uuid id PK
        uuid user_id FK "NOT NULL"
        varchar description "max 200, opcional"
        decimal amount "decimal(14,2), > 0"
        date income_date "fecha del ingreso"
        varchar source "origen, max 100, opcional"
        text notes "opcional"
        timestamptz created_at
        timestamptz updated_at
    }
```

## 2. Decisiones de diseño

### 2.1 Claves primarias — UUID

- UUID v4 (`@default(uuid())` en Prisma): no enumeran volumen ni orden, seguros de exponer en URLs, preparados para futuro multi-entorno.
- Alternativa descartada: `serial`/`int` (fuga de información, colisiones al migrar datos).

### 2.2 Montos — `Decimal(14,2)`

- Los montos financieros no pueden ser float (errores de redondeo).
- Prisma mapea `Decimal` y se serializa como **string** en JSON; el frontend formatea visualmente.
- Precisión suficiente para etapa 2 (negocios). Rango máximo: 999,999,999,999.99.

### 2.3 Fechas

| Campo | Tipo | Motivo |
|-------|------|--------|
| `expense_date` / `income_date` | `DATE` (solo fecha) | El día importa para reportes mensuales; la hora del gasto no aporta valor analítico y evita bugs de timezone en agregaciones. |
| `created_at` / `updated_at` | `TIMESTAMPTZ` UTC | Auditoría con precisión; `@updatedAt` automático en Prisma. |

Regla: el backend calcula rangos mensuales sobre `DATE` directamente (sin conversiones TZ); el frontend muestra en formato local `dd/mm/yyyy`.

### 2.4 Categorías — modelo híbrido (aprobado)

Una sola tabla con flag:

- `is_default = true`, `user_id = NULL` → predeterminada global (11 categorías semilla vía migración/seed).
- `is_default = false`, `user_id = NOT NULL` → personalizada del usuario.
- Unicidad de nombre por usuario: índice único `(user_id, name)` — en PostgreSQL los NULL no chocan, así las globales no se afectan; adicionalmente se valida en el service.
- Las predeterminadas **no** son editables ni eliminables por usuarios (`is_default` ignorado en DTOs de update/delete).
- El listado `GET /api/categories` retorna defaults + propias en una sola respuesta.

### 2.5 Reglas de eliminación

| Relación | Regla | Comportamiento |
|----------|-------|----------------|
| User → Expense / Income / Category( propias) | `ON DELETE CASCADE` | Borrar cuenta elimina sus datos (MVP: hard delete). |
| Category → Expense | `ON DELETE RESTRICT` (comportamiento Prisma default con verificación previa) | Rechazado con 409 si la categoría tiene gastos. El usuario debe reasignar o eliminar primero. Reasignación automática a "Otros": mejora futura documentada. |
| Gasto / Ingreso | Hard delete físico en MVP | Soft delete queda como decisión pendiente (ver `12-decisiones-tecnicas.md`). |

### 2.6 Integridad referencial

- Todas las FK obligatorias declaradas en Prisma (`@relation`).
- `categoryId` debe pertenecer al mismo usuario o ser predeterminada → validado en service antes de crear/editar gasto.

## 3. Índices

| Tabla | Índice | Motivo |
|-------|--------|--------|
| `users` | UNIQUE(`email`) | Login y unicidad. |
| `expenses` | (`user_id`, `expense_date` DESC) | Listados y agregaciones mensuales del dashboard. |
| `expenses` | (`user_id`, `category_id`) | Agrupación por categoría. |
| `incomes` | (`user_id`, `income_date` DESC) | Listados y totales mensuales. |
| `categories` | (`user_id`, `name`) UNIQUE parcial | Unicidad de nombre propio. |

Con volúmenes personales (< 100k filas) esto es más que suficiente; se revisará con etapa 2.

## 4. Restricciones de negocio (validadas en backend)

| Regla |
|-------|
| `amount > 0` en gastos e ingresos. |
| Fecha de movimiento: cualquier fecha válida (default hoy); no se restringen fechas futuras (pagos programados manualmente). |
| `description` máx. 200 caracteres; `notes` máx. 1000. |
| Email normalizado a minúsculas antes de crear/buscar. |
| Contraseña mínimo 8 caracteres (política MVP; complejidad forzosa no obligatoria). |

## 5. Schema Prisma preliminar (borrador para revisión)

> No se ejecutan migraciones hasta aprobar este modelo.

```prisma
enum PaymentMethod {
  CASH
  DEBIT_CARD
  CREDIT_CARD
  TRANSFER
  OTHER
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  expenses      Expense[]
  incomes       Income[]
  categories    Category[]

  @@map("users")
}

model Category {
  id        String   @id @default(uuid())
  name      String
  color     String?
  icon      String?
  isDefault Boolean  @default(false)
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  expenses  Expense[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, name])
  @@map("categories")
}

model Expense {
  id            String        @id @default(uuid())
  userId        String
  categoryId    String
  description   String?
  amount        Decimal       @db.Decimal(14, 2)
  expenseDate   DateTime      @db.Date
  paymentMethod PaymentMethod @default(CASH)
  notes         String?
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  category      Category      @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([userId, expenseDate(sort: Desc)])
  @@index([userId, categoryId])
  @@map("expenses")
}

model Income {
  id          String   @id @default(uuid())
  userId      String
  description String?
  amount      Decimal  @db.Decimal(14, 2)
  incomeDate  DateTime @db.Date
  source      String?
  notes       String?
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, incomeDate(sort: Desc)])
  @@map("incomes")
}
```

## 6. Datos semilla (seed)

11 categorías predeterminadas con `isDefault: true, userId: null`. Idempotente (upsert por nombre).

## 7. Futuras entidades (NO implementar en MVP)

Documentadas para referencia de evolución: `Account` (cuentas/billeteras), `Budget`, `Organization` + `Membership` + `Role` (etapas 2–3). La estructura actual no impide agregarlas.
