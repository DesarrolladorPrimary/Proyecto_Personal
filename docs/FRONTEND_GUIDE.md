# Frontend Guide

## Propósito

Esta guía resume cómo está organizado el frontend actual y qué archivos concentran la lógica de cada módulo.

## Estructura general

### `public/`

- Contiene las vistas HTML reales.
- Cada pantalla carga su script principal desde `src/scripts/...`.

### `src/scripts/`

- Contiene la lógica de interacción por página.
- Se divide por dominios:
  - `pages/auth`
  - `pages/feed`
  - `pages/admin`
  - `utils`

### `src/styles/`

- Agrupa estilos por página y por componentes compartidos.

## Utilitarios clave

### `src/scripts/utils/api-client.js`

- Cliente HTTP común.
- Resuelve base URL activa.
- Maneja expiración de token y redirección por `401`.

### `src/scripts/utils/auth-session.js`

- Lee y limpia el token JWT.
- Obtiene `id`, `rol` y estado de sesión.
- Define la redirección por rol.

### `src/scripts/utils/subscription-plan.js`

- Traduce la suscripción del backend a un snapshot simple para UI.
- Se usa para mostrar plan, cuota y modelos disponibles.

## Módulos principales

### Feed

- `pages/feed.js`
- `public/feed/feed-main.html`

Responsabilidad:
- entrada principal del usuario autenticado
- navegación a Poly, Creativo, Biblioteca y Settings

### Poly

- `src/scripts/pages/poly/seccion_poly.js`
- `public/feed/poly/seccion_poly.html`

Responsabilidad:
- chat con Poly
- canvas del borrador artificial
- subida de archivos
- guardado a biblioteca
- visualización del plan y modelos activos

### Creativo

- `src/scripts/pages/creative/seccion-creativa.js`
- `src/scripts/pages/creative/canvas-creativo.js`
- `src/scripts/pages/creative/creative-user-menu.js`

Responsabilidad:
- gestión de lienzos manuales
- edición, autosave, historial y herramientas IA
- exportación del borrador hacia Biblioteca

### Biblioteca

- `src/scripts/pages/biblioteca/library.js`
- `src/scripts/pages/biblioteca/shelves.js`

Responsabilidad:
- organización por estanterías
- conversión y exportación final
- visualización de cuota de almacenamiento

### Settings

- `src/scripts/pages/settings/...`

Responsabilidad:
- perfil
- contraseña
- suscripción simulada
- instrucciones IA
- visibilidad del modelo disponible por plan

### Admin

- `src/scripts/pages/admin/dashboard-admin.js`
- `src/scripts/pages/admin/gest-user.js`
- `src/scripts/pages/admin/gest-plans.js`
- `src/scripts/pages/admin/historial-plans.js`
- `src/scripts/pages/admin/modelsAI-admin.js`
- `src/scripts/pages/admin/generals-admin.js`

Responsabilidad:
- métricas
- gestión de usuarios y roles
- suscripción simulada
- historial de pagos simulados
- modelos IA y configuración del administrador

## Archivos más complejos

- `src/scripts/pages/poly/seccion_poly.js`
- `src/scripts/pages/creative/canvas-creativo.js`
- `src/scripts/pages/biblioteca/library.js`

Estos archivos concentran mucha interacción de UI y orquestación de estado. Si se refactorizan, conviene hacerlo por bloques funcionales y no en un único cambio masivo.

## Criterios de mantenimiento

- Mantener contratos de API en `api-client.js`.
- Reutilizar `auth-session.js` para cualquier flujo protegido.
- Mover lógica repetida a `utils/` antes de duplicarla en páginas.
- En archivos grandes, preferir extraer helpers pequeños antes que reescribir el módulo completo.
