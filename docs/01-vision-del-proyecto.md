# 01 — Visión del Proyecto

**Kashira Finance** — Plataforma de gestión y organización financiera.

---

## 1. Descripción

Kashira Finance es una aplicación web que permite a las personas registrar, visualizar y analizar su información financiera: ingresos, gastos y categorías. No se limita a almacenar movimientos; los transforma en información clara, visual y útil para la toma de decisiones.

```
REGISTROS → INFORMACIÓN → ANÁLISIS → CONOCIMIENTO → MEJORES DECISIONES
```

## 2. Propósito

Ayudar a las personas a entender, organizar y controlar mejor su vida financiera. El usuario debe poder:

- Registrar un gasto en segundos, justo después de realizar una compra.
- Saber cuánto gana, cuánto gasta y cuánto le queda disponible.
- Identificar en qué categorías concentra su dinero.
- Observar cómo evolucionan sus finanzas mes a mes.

## 3. Misión

> Proporcionar una herramienta sencilla, accesible y organizada que permita registrar, visualizar y analizar la información financiera de personas y organizaciones, facilitando el control de sus ingresos, gastos y recursos para promover una gestión financiera más consciente, organizada y eficiente.

## 4. Visión

> Convertir a Kashira Finance en una plataforma integral de gestión financiera que evolucione desde el control de las finanzas personales hasta la administración financiera de pequeños negocios y empresas, proporcionando información clara, organizada y visual que facilite la toma de decisiones y contribuya al crecimiento sostenible de sus usuarios.

## 5. Filosofía del producto

> "No se trata solamente de registrar dinero. Se trata de entender qué está pasando con él."

Prioridades del producto, en orden:

1. Simplicidad
2. Organización
3. Visibilidad
4. Control
5. Análisis
6. Seguridad
7. Escalabilidad
8. Información para la toma de decisiones

Registrar un gasto debe ser rápido. Consultar debe ser sencillo. Interpretar debe ser intuitivo. Todo debe funcionar igual de bien en computador y en celular.

## 6. Evolución del producto (3 etapas)

### Etapa 1 — Finanzas personales (MVP actual)

Gestión de finanzas personales: autenticación, gastos, ingresos, categorías, dashboard con resúmenes mensuales, gráficos e historial filtrable.

### Etapa 2 — Pequeños negocios y emprendimientos (futuro)

Ventas, compras, clientes, proveedores, productos, inventario, cuentas por cobrar/pagar, flujo de caja, rentabilidad y reportes financieros.

### Etapa 3 — Empresas (largo plazo)

Finanzas completas (presupuestos, flujo de caja), ventas (cotizaciones, facturación), compras (órdenes, cuentas por pagar), inventario avanzado, administración multiusuario con roles/permisos e indicadores financieros.

**Regla de alcance:** ninguna funcionalidad empresarial entra al MVP salvo preparación arquitectónica justificada. La pregunta que valida el MVP es: *¿puede una persona usar Kashira Finance diariamente para controlar sus finanzas personales?*

## 7. Diseño multiusuario desde el día uno

Aunque el primer usuario será el propio desarrollador, la plataforma se diseña multiusuario:

- Cada usuario tiene aislamiento completo de sus datos.
- La autorización se valida siempre en el backend, nunca solo en el frontend.

Esto habilita naturalmente la evolución hacia etapas 2 y 3 (organizaciones, roles) sin reconstruir el sistema.

## 8. Principio rector

> Primero entender → después documentar → después diseñar → después aprobar → finalmente programar.

La documentación en `docs/` es la fuente de verdad del proyecto. Toda decisión nueva o cambio de decisión pasa primero por la documentación.
