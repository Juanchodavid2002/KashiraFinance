# 05 — Arquitectura Frontend (Angular)

---

## 1. Decisiones base

| Aspecto | Decisión |
|---------|----------|
| Framework | Angular 18+ (standalone components, sin NgModules) |
| Lenguaje | TypeScript modo estricto (`strict: true`) |
| Formularios | Reactive Forms con validaciones sincrónicas y asíncronas |
| HTTP | `HttpClient` + interceptores funcionales (`HttpInterceptorFn`) |
| Ruteo | Angular Router con lazy loading por feature (`loadComponent` / `loadChildren`) |
| Estado | Services con signals; sin librerías externas de estado (NgRx prohibido para MVP) |
| Gráficos | Chart.js usado directamente (sin wrapper ng2-charts) |
| Estilos | CSS propio con design tokens (variables CSS); sin frameworks UI (Tailwind/Bootstrap fuera del MVP) |
| Idioma UI | Español |

## 2. Estructura

```
frontend/src/app/
├── core/
│   ├── guards/
│   │   └── auth.guard.ts            # protege rutas privadas
│   ├── interceptors/
│   │   ├── auth.interceptor.ts      # inyecta Bearer token
│   │   └── error.interceptor.ts     # maneja 401 → logout + redirect
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── expense.service.ts
│   │   ├── income.service.ts
│   │   ├── category.service.ts
│   │   └── dashboard.service.ts
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── expense.model.ts
│   │   ├── income.model.ts
│   │   ├── category.model.ts
│   │   └── dashboard.model.ts
│   └── config/
│       └── app.config.ts            # API_BASE_URL, constantes
├── layout/
│   ├── shell/                       # shell autenticado: sidebar/topbar + router-outlet
│   └── nav/
├── auth/
│   ├── login/
│   └── register/
├── dashboard/
├── expenses/
│   ├── expense-list/
│   ├── expense-form/                # creación y edición (reutilizado)
│   └── expense-filters/
├── incomes/
│   ├── income-list/
│   └── income-form/
├── categories/
│   ├── category-list/
│   └── category-form/
├── reports/                         # MVP: historial filtrable
└── shared/
    ├── components/                  # confirm-dialog, empty-state, page-header, amount-display
    ├── pipes/                       # currency-format pipe (COP visual)
    └── validators/                  # monto > 0, etc.
```

Regla de dependencia: las features solo importan desde `core` y `shared`. Nunca entre features directamente.

## 3. Rutas

| Ruta | Componente | Protección |
|------|------------|------------|
| `/login` | LoginComponent | pública |
| `/register` | RegisterComponent | pública |
| `/dashboard` | DashboardComponent | authGuard |
| `/expenses` | ExpenseListComponent | authGuard |
| `/expenses/new` | ExpenseFormComponent | authGuard |
| `/expenses/:id/edit` | ExpenseFormComponent | authGuard |
| `/incomes` | IncomeListComponent | authGuard |
| `/incomes/new` · `/incomes/:id/edit` | IncomeFormComponent | authGuard |
| `/categories` | CategoryListComponent | authGuard |
| `/reports` | ReportsComponent | authGuard |
| `**` | Redirect a `/dashboard` | — |

- Lazy loading en todas las features privadas.
- Fallback: usuario autenticado que visita `/login` se redirige a `/dashboard`.

## 4. Autenticación en el cliente

- `AuthService`: login/register/logout, guarda el JWT en `localStorage` (clave `kashira_token`) y expone el usuario actual vía signals.
- `authInterceptor`: agrega `Authorization: Bearer <token>` a toda petición hacia la API.
- `errorInterceptor`: ante 401 limpia sesión y redirige a `/login?expired=1`.
- `authGuard`: sin token válido → redirige a `/login`.

## 5. Gestión de datos

Patrón estándar por feature:

```
Componente (UI + Reactive Form)
   → Service (HttpClient + tipado con models/)
      → API REST
```

- Sin caché global compleja: los listados se recargan tras mutaciones (crear/editar/borrar).
- El Dashboard es un único GET que devuelve todo el resumen del mes; el componente solo renderiza.

## 6. Experiencia de registro rápido (prioridad del producto)

- Botón flotante "+" visible en todo el shell autenticado → abre formulario de gasto.
- Formulario de gasto: descripción (opcional), monto (obligatorio, input numérico), categoría (chips preseleccionables), fecha (default hoy), método de pago (segmented control), notas (colapsado).
- Al guardar: toast de confirmación y retorno a la vista anterior.
- Mobile-first: targets táctiles >= 44px, teclado correcto por campo (`inputmode="decimal"`, `inputmode="numeric"`).

## 7. Chart.js

- Instalación directa `npm i chart.js`; integración manual con `ViewChild` sobre `<canvas>`.
- Wrappers de componente propios: `<kf-doughnut-chart>` y `<kf-bar-chart>` en `shared/components`.
- Destruir instancias al desmontar componentes (evitar memory leaks).
- Gráficos requeridos: dona (gastos por categoría) y barras/línea (evolución 6 meses).

## 8. Design tokens (base)

```css
:root {
  --color-primary: ...;
  --color-danger: ...;     /* gastos */
  --color-success: ...;    /* ingresos */
  --color-bg / --color-surface / --color-text / --color-muted;
  --radius-md: 12px;
  --shadow-sm / --spacing-*;
}
```

Tema claro inicial; dark mode como mejora futura (los tokens lo habilitan).

## 9. Variables de entorno frontend

| Variable | Uso |
|----------|-----|
| `environment.apiUrl` | Base de la API (`http://localhost:3000/api` en dev; URL de Render en prod) |

Configuración con archivos `environment.development.ts` / `environment.ts` (fileReplacements de Angular).

## 10. Calidad

- `ng build` sin errores ni warnings bloqueantes.
- Templates con `strictTemplates` activado.
- Nombres en inglés para código, textos visibles en español.
