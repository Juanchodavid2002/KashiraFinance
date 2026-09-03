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
│   │   ├── dashboard.service.ts
│   │   └── toast.service.ts            # wrapper de ngx-toastr
│   ├── utils/
│   │   └── confirm.ts                  # confirmAction() con SweetAlert2
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

## 10. Diseño responsive (obligatorio)

> Regla de proyecto: **todo diseño, tanto el existente como el nuevo, debe verse y funcionar correctamente en tablet, celular y portátil**. Esta regla es mandatoria y debe revisarse en cada cambio de UI o refactor de estilos.

### Breakpoints oficiales

| Breakpoint | Aplica a | Notas |
|------------|----------|-------|
| `max-width: 1200px` | Portátil grande / escritorio compacto | Rejillas de varias columnas pasan a menos columnas |
| `max-width: 900px` | Tablet (horizontal) y portátil pequeño | Ajustes intermedios de grids, gaps y tarjetas |
| `max-width: 640px` | Tablet vertical y celular grande | Layouts colapsan a 1 columna, sidebar se vuelve off-canvas |
| `max-width: 480px` | Celular | Tipografías y paddings más compactos |
| `max-width: 400px` | Celular pequeño | Casos extremos (flechas de mes, controles) |

### Pautas obligatorias

- **Unidades fluidas en tipografía**: usar `rem`/`em`; preferir `clamp()` para títulos de gran tamaño.
- **Layouts con `grid`/`flexbox`**: usar `repeat(auto-fit, minmax(...))` o breakpoints para colapsar columnas. Nunca columnas fijas sin adaptación.
- **Nunca ocultar datos críticos**: p. ej. el **monto** en listados de gastos/ingresos debe permanecer visible en móvil (se reorganiza la tarjeta, no se elimina).
- **Targets táctiles ≥ 44px** en botones, enlaces y campos (ya aplicado globalmente en `styles.css`).
- **Contenedores con `max-width`**: usar `min(max-width, 100%)` / `max-width: min(...)` para evitar desbordes horizontales.
- **Sidebar**: en pantallas < 900px colapsa a off-canvas con overlay (`shell.css`).
- **Spacing/dimensiones**: mantener las CSS variables (`--spacing-*`, `--radius-*`) y ajustar por breakpoint; no reemplazar por px sueltos.
- **Cada componente** debe incluir al menos un `@media (max-width: 640px)` (o menor) que verifique el colapso a una columna y la visibilidad de la información clave.

### Responsive específico por área (estado actual)

- **Shell/layout**: sidebar off-canvas a ≤900px, menú hamburguesa. ✅
- **Landing, Login y Register**: multi-breakpoint incluidos de altura de pantalla; uso extenso de `clamp()`. ✅
- **Listados (gastos/ingresos)**: en móvil cada registro se apila en tarjeta y el **monto queda siempre visible**. ✅
- **Detalles (deuda/servicio)**: summary, formularios y filas de pago colapsan a 1 columna en móvil. ✅
- **Dashboard**: breakpoints de 1200px/900px/640px/400px. ✅
- **Settings / servicios (lista y form)**: breakpoints añadidos a ≤640px y ≤480px. ✅

### Responsive de las alertas (toasts y confirmaciones)

- **Toasts (`ngx-toastr`)**: en pantallas ≤640px los toasts se anclan a los bordes laterales con margen de 8px y ancho fluido; en ≤480px la tipografía se compacta y el botón de cierre cumple target táctil ≥44px. Estilos en `styles.css`.
- **Confirmaciones (`SweetAlert2`)**: diálogos auto-adaptables por defecto; en móvil se anclan al ancho del viewport con `confirmAction()` como único helper (sustituye a `window.confirm`/`confirm`).

## 11. Sistema de alertas y confirmaciones

- **Toasts**: `ngx-toastr` expuesto a través del wrapper `ToastService` (`core/services/toast.service.ts`), con `provideToastr()` en `app.config.ts` (modo standalone, sin `ToastrModule`).
  - Config global: posición `toast-top-right`, `timeOut: 3500`, `closeButton`, `progressBar`, `newestOnTop`, `preventDuplicates`, `tapToDismiss: false`.
  - Métodos: `success/error/info/warning/fromHttpError`.
  - `error.interceptor.ts` muestra toasts globales: 401 (sesión expirada, solo si el usuario estaba autenticado) y errores no gestionados inline (excluye 400/409/422 que maneja cada formulario).
- **Confirmaciones**: SweetAlert2 vía `confirmAction()` (`core/utils/confirm.ts`), devuelve `Promise<boolean>`; se usa en todas las acciones destructivas (eliminar gasto, ingreso, categoría, deuda, servicio, pago, etc.).

## 12. Calidad

- `ng build` sin errores ni warnings bloqueantes.
- Templates con `strictTemplates` activado.
- Nombres en inglés para código, textos visibles en español.
- **Responsive**: cada cambio de UI se valida en mínimo 3 viewports (portátil ~1280px, tablet ~768px, celular ~360px).
