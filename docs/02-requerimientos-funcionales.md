# 02 — Requerimientos Funcionales

**Kashira Finance** — MVP Etapa 1: Finanzas personales

Convención: `RF-XX-MÓDULO`. Prioridades: **Alta** (indispensable para el MVP), **Media** (deseable si el tiempo lo permite), **Baja** (futura).

---

## 1. Módulo de Autenticación

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-01-AUTH | Registrarse con nombre, email y contraseña (contraseña mínimo 8 caracteres, hasheada con bcrypt). | Alta |
| RF-02-AUTH | Iniciar sesión con email y contraseña; recibir token JWT válido. | Alta |
| RF-03-AUTH | Cerrar sesión (el cliente elimina el token; JWT es stateless). | Alta |
| RF-04-AUTH | Acceder a `GET /api/auth/me` para obtener el perfil del usuario autenticado. | Alta |
| RF-05-AUTH | Rutas privadas del frontend protegidas con Route Guard; redirección a login si no hay sesión. | Alta |
| RF-06-AUTH | Recuperación/restablecimiento de contraseña. | Baja (futuro) |

**Criterios de aceptación**

- No puede registrarse un email duplicado (409).
- Credenciales inválidas devuelven 401 con mensaje genérico (sin revelar si falló email o contraseña).
- Sin token o con token expirado, todo endpoint privado responde 401.

---

## 2. Módulo de Gastos

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-01-EXP | Crear gasto con: descripción, monto (> 0), categoría (obligatoria), fecha (por defecto hoy), método de pago (enum fijo), notas (opcional). | Alta |
| RF-02-EXP | Listar gastos propios con paginación (default 20 por página) ordenados por fecha descendente. | Alta |
| RF-03-EXP | Filtrar por rango de fechas (`from`, `to`). | Alta |
| RF-04-EXP | Filtrar por categoría y/o método de pago. | Alta |
| RF-05-EXP | Buscar por texto dentro de la descripción (búsqueda case-insensitive parcial). | Media |
| RF-06-EXP | Ver detalle de un gasto propio. | Alta |
| RF-07-EXP | Editar cualquier campo de un gasto propio. | Alta |
| RF-08-EXP | Eliminar un gasto propio (borrado físico, con confirmación previa en la UI). | Alta |
| RF-09-EXP | Consultar total de gastos aplicando los mismos filtros. | Alta |

**Criterios de aceptación**

- Un usuario jamás ve, edita ni elimina gastos de otro usuario (verificado en backend).
- Monto negativo o cero rechazado con 400.
- Categoría inexistente o ajena rechazada con 400/404.

---

## 3. Módulo de Ingresos

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-01-INC | Crear ingreso con: descripción, monto (> 0), fecha (por defecto hoy), fuente/origen (texto opcional), notas (opcional). | Alta |
| RF-02-INC | Listar ingresos propios con paginación, ordenados por fecha descendente. | Alta |
| RF-03-INC | Filtrar por rango de fechas. | Alta |
| RF-04-INC | Ver, editar y eliminar ingresos propios. | Alta |
| RF-05-INC | Consultar total de ingresos aplicando filtros. | Alta |

---

## 4. Módulo de Categorías

Modelo **híbrido** (decisión aprobada — ver `12-decisiones-tecnicas.md`): categorías predeterminadas globales + categorías personalizadas por usuario.

Categorías predeterminadas iniciales:

1. Alimentación
2. Transporte
3. Vivienda
4. Servicios
5. Salud
6. Educación
7. Entretenimiento
8. Compras
9. Suscripciones
10. Deudas
11. Otros

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-01-CAT | Listar todas las categorías disponibles para el usuario (predeterminadas + propias) en una sola llamada. | Alta |
| RF-02-CAT | Crear categorías personalizadas (nombre obligatorio, único por usuario; color e icono opcionales). | Alta |
| RF-03-CAT | Editar solo categorías propias. | Media |
| RF-04-CAT | Eliminar solo categorías propias; rechazado si tiene gastos asociados (409). | Media |
| RF-05-CAT | Las predeterminadas nunca pueden editarse ni eliminarse por usuarios. | Alta |

---

## 5. Módulo Dashboard

Pantalla principal tras el login. Fórmula base: `Disponible = Ingresos − Gastos`.

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-01-DASH | Ingresos del mes seleccionado (default: mes actual). | Alta |
| RF-02-DASH | Gastos del mes seleccionado y número de gastos. | Alta |
| RF-03-DASH | Dinero disponible del mes. | Alta |
| RF-04-DASH | Gastos agrupados por categoría (monto + % del total). | Alta |
| RF-05-DASH | Últimos 5–10 gastos registrados. | Alta |
| RF-06-DASH | Evolución mensual de gastos e ingresos (últimos 6 meses). | Alta |
| RF-07-DASH | Comparación con el mes anterior (% variación de gastos). | Media |
| RF-08-DASH | Visualizaciones con Chart.js (torta/dona por categoría, barras/línea para evolución). | Alta |

---

## 6. Módulo Reportes (básico MVP)

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-01-REP | Historial financiero filtrable (gastos + totales; ingresos + totales) reutilizando endpoints de listado. | Alta |
| RF-02-REP | Resumen por período arbitrario (rango de fechas personalizado). | Media |

Nota: en el MVP, "Reportes" reutiliza los endpoints de gastos/ingresos con filtros; no requiere endpoints adicionales salvo necesidad demostrada.

---

## 7. Requisitos transversales

| ID | Requerimiento |
|----|---------------|
| RF-T01 | Aislamiento total multiusuario validado en backend en todos los endpoints privados. |
| RF-T02 | UI responsive: cómoda desde celular y computador. |
| RF-T03 | Registro de un gasto completable en menos de 30 segundos desde el móvil (botón de acceso rápido global "+ Nuevo gasto"). |
| RF-T04 | Formateo de montos con separador de miles estilo COP (`$150.000`) — solo presentación; no hay conversión de divisas. |
| RF-T05 | Fechas mostradas en formato local (`dd/mm/yyyy`); almacenamiento UTC. |
| RF-T06 | Idioma de la interfaz: español. i18n queda como funcionalidad futura. |

---

## 8. Fuera de alcance del MVP

- Presupuestos y metas de ahorro.
- Cuentas bancarias / conciliación.
- Multi-moneda y conversiones.
- Exportación CSV/PDF.
- Recuperación de contraseña.
- App móvil nativa (se cubre con diseño responsive web).
- Funcionalidades de etapa 2 (ventas, inventario, etc.) — ver `01-vision-del-proyecto.md`.
