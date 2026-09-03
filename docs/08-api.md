# 08 — API REST

Base URL desarrollo: `http://localhost:3000/api`
Autenticación: header `Authorization: Bearer <token JWT>` en todos los endpoints salvo los marcados **Público**.

Formato de error uniforme:

```json
{ "statusCode": 400, "message": "...", "error": "Bad Request" }
```

Convención de montos: se envían/reciben como número decimal positivo; la API los retorna como string (Prisma Decimal).

---

## 1. Auth

### POST /api/auth/register — Público

Crea cuenta y retorna token (login automático).

| Body | Tipo | Reglas |
|------|------|--------|
| `name` | string | obligatorio, 2–80 chars |
| `email` | string | obligatorio, formato email, se normaliza a minúsculas |
| `password` | string | obligatorio, mínimo 8 chars |
| `currency` | enum? | `COP|USD|MXN|EUR|ARS|CLP`, default `COP` |

**201** → `{ "user": { "id", "name", "email", "currency", "createdAt" }, "accessToken": "eyJ..." }`

**Errores:** 400 validación · 409 email ya registrado.

### POST /api/auth/login — Público

| Body | Tipo |
|------|------|
| `email` | string |
| `password` | string |

**200** → igual que register. Mensaje 401 genérico (`Credenciales inválidas`) sin revelar cuál campo falló.

**Errores:** 400 · 401.

### GET /api/auth/me

**200** → usuario actual (sin datos sensibles). **Errores:** 401.

> Nota: no existe `POST /logout` en servidor; el JWT es stateless y el cliente descarta el token.

---

## 2. Expenses

### GET /api/expenses

Query params (todos opcionales):

| Param | Tipo | Descripción |
|-------|------|-------------|
| `from` / `to` | date `YYYY-MM-DD` | rango de `expense_date` (inclusivo) |
| `categoryId` | uuid | filtro por categoría |
| `paymentMethod` | enum | CASH, DEBIT_CARD, CREDIT_CARD, TRANSFER, OTHER |
| `search` | string | coincidencia parcial case-insensitive en descripción |
| `page` | int >= 1 (default 1) | página |
| `limit` | int 1–100 (default 20) | registros por página |

**200** →

```json
{
  "data": [
    {
      "id": "uuid", "description": "Mercado", "amount": "150000.00",
      "expenseDate": "2026-08-22", "paymentMethod": "DEBIT_CARD",
      "notes": null,
      "category": { "id": "uuid", "name": "Alimentación" },
      "createdAt": "...", "updatedAt": "..."
    }
  ],
  "meta": { "total": 128, "page": 1, "limit": 20, "totalPages": 7 }
}
```

### POST /api/expenses

| Body | Tipo | Reglas |
|------|------|--------|
| `description` | string? | máx 200 |
| `amount` | number | > 0 |
| `categoryId` | uuid | debe existir y ser predeterminada o propia |
| `expenseDate` | date? | default hoy |
| `paymentMethod` | enum? | default CASH |
| `notes` | string? | máx 1000 |

**201** → gasto creado. **Errores:** 400 (validación o categoría inválida).

### GET /api/expenses/:id
**200** → gasto propio con categoría. **Errores:** 404 (inexistente o ajeno — misma respuesta por seguridad).

### PATCH /api/expenses/:id
Body = campos parciales del POST. **200** → actualizado. **Errores:** 400 · 404.

### DELETE /api/expenses/:id
**200** → `{ "success": true }`. **Errores:** 404.

---

## 3. Incomes

Mismo patrón que expenses:

- `GET /api/incomes` — filtros: `from`, `to`, `source` (parcial), `page`, `limit`.
- `POST /api/incomes` — body: `description?`, `amount` (> 0), `incomeDate?` (default hoy), `source?` (máx 100), `notes?`.
- `GET /api/incomes/:id`, `PATCH /api/incomes/:id`, `DELETE /api/incomes/:id`.

Respuestas y errores idénticos al módulo de gastos (sin categoría ni método de pago).

---

## 4. Categories

### GET /api/categories

**200** → predeterminadas + propias:

```json
{
  "data": [
    { "id": "uuid", "name": "Alimentación", "isDefault": true,  "userId": null },
    { "id": "uuid", "name": "Mi categoría", "isDefault": false, "userId": "uuid" }
  ]
}
```

### POST /api/categories

| Body | Reglas |
|------|--------|
| `name` | obligatorio, 2–60, único entre las propias del usuario |
| `color`? | hex `#RRGGBB` |
| `icon`? | string corto |

**201** → categoría creada con `isDefault: false`. **Errores:** 400 · 409 nombre duplicado.

### PATCH /api/categories/:id
Solo propias (las predeterminadas → 403). Campos: `name`, `color`, `icon`. **200** · 404 · 409.

### DELETE /api/categories/:id
Solo propias. **200** si se eliminó. **Errores:** 404 (ajena/inexistente) · **409** si tiene gastos asociados.

---

## 5. Dashboard

### GET /api/dashboard?month=8&year=2026

Params: `month` 1–12 (default mes actual), `year` (default año actual).

**200** →

```json
{
  "period": { "month": 8, "year": 2026 },
  "totalIncome": "4000000.00",
  "totalExpense": "2750000.00",
  "available": "1250000.00",
  "expenseCount": 42,
  "expensesByCategory": [
    { "categoryId": "uuid", "categoryName": "Alimentación", "total": "880000.00", "percentage": 32.0 }
  ],
  "recentExpenses": [ /* últimos 5 gastos */ ],
  "monthlyEvolution": [
    { "month": 3, "year": 2026, "income": "...", "expense": "..." }
  ],
  "comparison": {
    "previousMonthExpense": "2600000.00",
    "variationPercentage": 5.77
  }
}
```

Notas:
- `monthlyEvolution`: últimos 6 meses hasta el período solicitado.
- `percentage` de categoría sobre el total de gastos del mes (0–100, un decimal).
- Si no hay movimientos: totales `"0.00"` y arrays vacíos (no error).

La respuesta incluye además:

```json
"debtSummary": {
  "totalDebt": "1200000.00",
  "pendingCount": 3,
  "paidThisMonth": "350000.00"
}
```

`totalDebt`: monto pendiente agregado de deudas; `pendingCount`: número de deudas sin pagar (status `PAID` = restante 0); `paidThisMonth`: abonos pagados a deudas durante el mes del período.

---

## 6. Users (Configuración)

### GET /api/users/me
**200** → `{ "id", "name", "email", "currency", "createdAt" }`. **Errores:** 401.

### PATCH /api/users/settings
Actualiza la moneda de visualización del usuario conectado.

| Body | Tipo | Reglas |
|------|------|--------|
| `currency` | enum | obligatorio, `COP\|USD\|MXN\|EUR\|ARS\|CLP` |

**200** → `{ "id", "name", "email", "currency" }`. **Errores:** 400 · 401.

---

## 7. Debts

### GET /api/debts
**200** → `{ "data": [ { "id", "kind", "name", "lender", "totalAmount", "totalInstallments", "paidInstallments", "installmentAmount", "startDate", "dueDate", "notes", "status", "paidAmount", "remainingAmount" } ] }`

### GET /api/debts/:id
**200** → deuda con `payments[]` (`{ id, amount, paidDate, notes, createdAt }`). **Errores:** 404.

### POST /api/debts
| Body | Reglas |
|------|--------|
| `kind` | `ENTITY\|PERSONAL`, default `ENTITY` |
| `name` | obligatorio, máx 200 |
| `lender`? | máx 200 |
| `totalAmount` | obligatorio, > 0 |
| `totalInstallments`? / `paidInstallments`? | int >= 1 / >= 0 |
| `installmentAmount`? | > 0 |
| `startDate`? | date, default hoy |
| `dueDate`? | date |
| `notes`? | máx 1000 |

**201** → deuda creada. **Errores:** 400.

### PATCH /api/debts/:id / DELETE /api/debts/:id
Campos parciales del POST · **200** / `{ "success": true }`. **Errores:** 400 · 404.

### POST /api/debts/:id/payments
Registra un abono y crea el `Expense` asociado (categoría "Deudas").

| Body | Reglas |
|------|--------|
| `amount` | obligatorio, > 0 |
| `paidDate`? | date, default hoy |
| `notes`? | máx 1000 |
| `categoryId`? | uuid (categoría para el gasto asociado) |
| `paymentMethod`? | enum, default CASH |

**201** → `{ id, amount, paidDate, notes, createdAt }`. **Errores:** 400 · 404.

### DELETE /api/debts/:id/payments/:paymentId
Elimina el abono y su gasto asociado. **200** → `{ "success": true }`. **Errores:** 404.

---

## 8. Services

### GET /api/services
**200** → `{ "data": [ { "id", "name", "color", "icon", "notes", "totalPaid", "paymentCount", "lastPayment" } ] }`

### GET /api/services/:id
**200** → servicio con `payments[]` (`{ id, amount, paidDate, notes, createdAt }`). **Errores:** 404.

### POST /api/services
| Body | Reglas |
|------|--------|
| `name` | obligatorio, máx 200 |
| `color`? | hex (random si se omite) |
| `icon`? / `notes`? | string corto / máx 1000 |

**201** → servicio creado. **Errores:** 400.

### PATCH /api/services/:id / DELETE /api/services/:id
Campos parciales del POST · **200** / `{ "success": true }`. **Errores:** 400 · 404.

### POST /api/services/:id/payments
Registra un pago y crea el `Expense` asociado (categoría "Servicios").

| Body | Reglas |
|------|--------|
| `amount` | obligatorio, > 0 |
| `paidDate`? | date, default hoy |
| `notes`? | máx 1000 |
| `categoryId`? | uuid (categoría para el gasto asociado) |
| `paymentMethod`? | enum, default CASH |

**201** → `{ id, amount, paidDate, notes, createdAt }`. **Errores:** 400 · 404.

### DELETE /api/services/:id/payments/:paymentId
Elimina el pago y su gasto asociado. **200** → `{ "success": true }`. **Errores:** 404.

---

## 9. Utilidades

### GET /api/health — Público
**200** → `{ "status": "ok" }`

---

## 10. Matriz de códigos HTTP

| Código | Uso |
|--------|-----|
| 200 | consulta/actualización exitosa |
| 201 | recurso creado |
| 400 | DTO inválido, regla de negocio violada |
| 401 | sin token, token inválido o expirado; credenciales incorrectas |
| 403 | operación prohibida (ej. editar categoría predeterminada) |
| 404 | recurso inexistente **o ajeno** (indistinguible a propósito) |
| 409 | conflicto: duplicado o borrado con dependencias |
| 500 | error interno (sin stack trace al cliente) |

## 11. Autorización — resumen

Todos los endpoints privados filtran por `userId` extraído del JWT. Ninguna query confía en `userId` enviado desde el cliente. Acceder a un recurso de otro usuario responde 404.
