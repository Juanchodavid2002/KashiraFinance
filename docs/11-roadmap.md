# 11 — Roadmap

Construcción incremental. Cada fase se verifica antes de avanzar (errores, pruebas, revisión de arquitectura, actualización de docs).

---

## FASE 1 — Análisis y documentación ✅

- [x] Requerimientos funcionales y no funcionales
- [x] Arquitectura general, frontend y backend
- [x] Modelo de datos + ER
- [x] Contrato de API
- [x] Seguridad
- [x] Infraestructura y despliegue
- [x] Decisiones técnicas (ADRs)
- [x] **Aprobación del usuario**

**Salida:** docs aprobados sin cambios pendientes.

## FASE 2 — Inicialización técnica ✅

- [x] Crear proyecto Angular (`frontend/`) con CSS y TS estricto
- [x] Crear proyecto NestJS (`backend/`)
- [x] Configurar Prisma + PostgreSQL 18 local para desarrollo (ADR-015; producción: Neon)
- [x] `schema.prisma` inicial + migración + seed de categorías
- [x] `.env` locales + `.env.example` versionados
- [x] Health check `/api/health` respondiendo

**Salida:** ambos proyectos corren en local contra `kashira_dev`; migración aplicada.

## FASE 3 — Autenticación ✅

- [x] Registro y login (DTOs validados)
- [x] bcrypt + JWT (estrategia passport)
- [x] Guard global + @Public()
- [x] Frontend: login, registro, AuthService, authGuard, interceptores
- [x] Logout y manejo de sesión expirada
- [x] Fix seguridad: login ya no expone `passwordHash` (verificado E2E)

**Salida:** usuario real creado en BD; rutas privadas protegidas extremo a extremo.

## FASE 4 — Gastos ✅

- [x] CRUD backend con ownership + filtros + paginación + totales
- [x] Categorías: listado híbrido, crear/eliminar propias, reglas de borrado
- [x] Frontend: listado, formulario rápido, filtros, confirmación de borrado
- [x] Verificación E2E: aislamiento multiusuario (usuario B → 404), filtros, validaciones y reglas de categorías contra BD real

**Salida:** flujo completo registrar→listar→editar→eliminar gasto operativo.

## FASE 5 — Ingresos ✅

- [x] CRUD backend + totales
- [x] Frontend listado/formulario reutilizando patrones de gastos
- [x] Verificación E2E: filtros (source insensible, rango fechas), default fecha=hoy, aislamiento multiusuario 404, validaciones

**Salida:** ingresos operativos con totales.

## FASE 6 — Dashboard ✅

- [x] Endpoint agregado del mes (+ evolución 6 meses + comparación)
- [x] Pantalla dashboard: tarjetas resumen, dona por categoría (Chart.js), evolución mensual, gastos recientes
- [x] Verificación E2E: totales/disponible exactos con datos conocidos en 3 meses, dona con porcentajes y colores, evolución mar→ago con meses vacíos en ceros, comparación vs mes anterior (+150%), variación `null` sin gasto previo, defaults al mes actual, 401 sin token, 400 (`month=13`, `month=abc`), aislamiento multiusuario (usuario B → todo en ceros)

**Salida:** el dashboard responde "¿cómo están mis finanzas este mes?" de un vistazo.

## FASE 7 — Producción

- [ ] Repo GitHub + push
- [ ] Neon prod + Render + Vercel configurados
- [ ] CORS y variables de entorno de producción
- [ ] Migraciones ejecutadas vía deploy
- [ ] Pruebas E2E desde celular, tablet y computador

**Salida:** Kashira Finance accesible públicamente desde cualquier dispositivo.

## FASE 8 — Seguridad y mantenimiento

- [ ] Rate limiting (@nestjs/throttler), especialmente /auth/*
- [ ] Estrategia de backups independiente + prueba de restauración
- [ ] Monitoreo de errores externo (decisión: Sentry u similar)
- [ ] Logs estructurados básicos
- [ ] Recuperación de contraseña
- [ ] Refresh tokens (si la expiración de 7d resulta incómoda)

---

## Orden de construcción interno (Fase 2 → 6)

1. Inicialización → 2. BD/Prisma → 3. Backend base → 4. Auth → 5. Frontend base → 6. Login/Registro UI → 7. Gastos → 8. Ingresos → 9. Categorías → 10. Dashboard → 11. Reportes → 12. Endurecimiento seguridad → 13. Pruebas → 14. Producción.

## Checklist E2E manual del MVP (al cierre)

- Registro → login → logout → login.
- Crear/editar/eliminar gasto con cada método de pago.
- Filtrar por fecha/categoría/búsqueda; verificar totales y paginación.
- Crear ingreso; verificar disponible en dashboard = ingresos − gastos.
- Dashboard: dona, evolución y comparación correctas con datos conocidos.
- **Seguridad:** usuario B recibe 404 al intentar acceder a cualquier recurso de usuario A.
- Responsive verificado en móvil real.
