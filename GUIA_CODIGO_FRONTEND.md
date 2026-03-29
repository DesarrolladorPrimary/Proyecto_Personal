# Guia de codigo frontend

Este documento resume que hace cada archivo principal del frontend para que puedas ubicarte rapido entre pantallas, controladores y utilidades.

## Como esta organizado
- `public/...`: paginas HTML de entrada.
- `src/scripts/pages/...`: logica de cada pantalla.
- `src/scripts/utils/...`: helpers compartidos entre pantallas.
- `src/styles/...`: estilos; normalmente siguen el mismo nombre base de la pagina o script asociado.

## Paginas HTML
### Admin
- `public/admin/dashboard-admin.html`: dashboard principal del administrador.
- `public/admin/login-admin.html`: login del panel admin.
- `public/admin/moderation/log-moderation.html`: vista del historial de moderacion.
- `public/admin/plans/gest-plans.html`: gestion de planes desde admin.
- `public/admin/plans/historial-plans.html`: historial/resumen de movimientos de planes.
- `public/admin/settings/generals-admin.html`: configuraciones generales del admin.
- `public/admin/settings/modelsAI-admin.html`: catalogo/modelos IA visibles en admin.
- `public/admin/settings/settings-admin.html`: shell principal de configuracion admin.
- `public/admin/stadistics/stadistic.html`: estadisticas del sistema.
- `public/admin/users/gest-user.html`: gestion de usuarios.

### Auth
- `public/auth/login.html`: inicio de sesion del usuario.
- `public/auth/recovery_passwd.html`: solicitud de recuperacion.
- `public/auth/recovery_passwd_change.html`: cambio de contraseña con token.
- `public/auth/recovery_passwd_messaje.html`: confirmacion visual del correo de recuperacion.
- `public/auth/regist.html`: registro de usuario.
- `public/auth/verificar.html`: verificacion de cuenta desde enlace.

### Feed de usuario
- `public/feed/feed-main.html`: menu principal del usuario autenticado.
- `public/feed/biblioteca/library.html`: biblioteca de relatos y documentos exportados.
- `public/feed/biblioteca/shelves.html`: listado/gestion de estanterias.
- `public/feed/creative/seccion_creativa.html`: portada de la seccion creativa.
- `public/feed/creative/canvas_creative.html`: canvas de escritura creativa.
- `public/feed/poly/seccion_poly.html`: pantalla principal de Poly.
- `public/feed/settings/settings-generals.html`: configuracion general del usuario.
- `public/feed/settings/settings-instruccionesAI.html`: instrucciones permanentes para Poly.
- `public/feed/settings/settings-planes.html`: catalogo de planes del usuario.
- `public/feed/settings/settings-user.html`: perfil y datos del usuario.
- `public/index.html`: landing inicial/publica.

## Scripts por pagina
### Admin
- `src/scripts/pages/admin/dashboard-admin.js`: carga perfil admin, estadisticas y distribucion de planes.
- `src/scripts/pages/admin/generals-admin.js`: logica de ajustes generales del panel admin.
- `src/scripts/pages/admin/gest-plans.js`: crear, editar, eliminar y validar planes desde modal admin.
- `src/scripts/pages/admin/gest-user.js`: ver detalle del usuario, rol, suscripcion y acciones administrativas.
- `src/scripts/pages/admin/historial-plans.js`: consume y pinta historial o resumen de planes.
- `src/scripts/pages/admin/log-moderation.js`: tabla y filtros del historial de moderacion.
- `src/scripts/pages/admin/login-admin.js`: validacion y envio del login admin.
- `src/scripts/pages/admin/modelsAI-admin.js`: carga y presenta modelos IA en el panel.
- `src/scripts/pages/admin/stadistic.js`: consume estadisticas y las presenta en la vista dedicada.

### Biblioteca / feed / creativo / Poly
- `src/scripts/pages/biblioteca/library.js`: biblioteca principal; mezcla borradores editables con documentos exportados.
- `src/scripts/pages/biblioteca/shelves.js`: CRUD de estanterias desde la vista dedicada.
- `src/scripts/pages/creative/canvas-creativo.js`: editor creativo, historial local, ayudas IA y exportacion.
- `src/scripts/pages/creative/creative-user-menu.js`: menu de usuario reutilizado en creativo.
- `src/scripts/pages/creative/seccion-creativa.js`: portada/listado rapido para entrar o retomar relatos creativos.
- `src/scripts/pages/feed.js`: interacciones basicas del menu principal del feed.
- `src/scripts/pages/poly/seccion_poly.js`: controlador grande de Poly; chat, archivos, parametros IA, canvas y guardado.

### Auth y settings
- `src/scripts/pages/login.js`: validacion y envio de login usuario.
- `src/scripts/pages/nueva-password.js`: cambio de contraseña con reglas de validacion.
- `src/scripts/pages/recuperar.js`: solicitud de correo de recuperacion.
- `src/scripts/pages/regist.js`: registro y validacion guiada del formulario.
- `src/scripts/pages/settings/cambiar-password.js`: cambio de contraseña desde settings.
- `src/scripts/pages/settings/data_user.js`: helpers de carga/actualizacion de datos de usuario en settings.
- `src/scripts/pages/settings/setting-user.js`: pantalla de perfil del usuario.
- `src/scripts/pages/settings/settings-general.js`: ajustes generales del usuario.
- `src/scripts/pages/settings/settings-instruccionesAI.js`: instrucciones permanentes para Poly.
- `src/scripts/pages/settings/settings-planes.js`: vista de planes y cambio de suscripcion.

## Utilidades compartidas
- `src/scripts/utils/accesoAuth.js`: guardas simples de acceso para paginas autenticadas.
- `src/scripts/utils/api-client.js`: wrapper de `fetch`; base URL, auth y parseo uniforme.
- `src/scripts/utils/api-config.js`: calcula/recuerda la URL activa del backend.
- `src/scripts/utils/auth-session.js`: lee el token, resuelve usuario/rol y redirige al expirar la sesion.
- `src/scripts/utils/dataToken.js`: helpers puntuales para datos del token.
- `src/scripts/utils/dialog-service.js`: capa comun para alerts, confirms y prompts.
- `src/scripts/utils/form-feedback.js`: validacion visual reutilizable para formularios.
- `src/scripts/utils/language-manager.js`: traducciones e idioma activo del frontend.
- `src/scripts/utils/subscription-plan.js`: snapshot ligero del plan para Poly, Creative y Settings.
- `src/scripts/utils/theme-manager.js`: persistencia y aplicacion del tema visual.

## Lectura rapida recomendada
Si quieres entender el proyecto sin perderte, este es un buen orden:
1. `src/scripts/utils/api-client.js`
2. `src/scripts/utils/auth-session.js`
3. `src/scripts/pages/feed.js`
4. `src/scripts/pages/poly/seccion_poly.js`
5. `src/scripts/pages/creative/canvas-creativo.js`
6. `src/scripts/pages/biblioteca/library.js`
7. `src/scripts/pages/admin/dashboard-admin.js`
8. `src/scripts/pages/admin/gest-user.js`
9. `src/scripts/pages/admin/gest-plans.js`
