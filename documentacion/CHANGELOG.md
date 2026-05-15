# Changelog de documentación

Todas las modificaciones notables en la documentación se registran aquí. Formato basado en [Keep a Changelog](https://keepachangelog.com/).

## [2026-05-11]
### Añadido
- **Frontend de pedidos** en React Native (Expo):
  - Pantalla de lista de pedidos (`explore.tsx`) con estados, roles y botón flotante para crear nuevo pedido.
  - Pantalla de creación de pedido (`new-order.tsx`) con mapa interactivo (GPS + toque), formulario completo y validación de destinatario por email.
  - Pantalla de selección de mensajero (`select-courier.tsx`) con mapa de puntos de recogida/entrega, mensajeros cercanos en tiempo real y precio estimado por cada uno.
  - Pantalla de detalle y seguimiento del pedido (`order-detail.tsx`) con suscripción a cambios en tiempo real, acciones según rol (aceptar, recoger, entregar, devolver, cancelar) y visualización de código de verificación y foto de entrega.
- **Funciones SQL adicionales**:
  - `nearby_couriers` ampliada para devolver coordenadas de los mensajeros (`courier_lat`, `courier_lng`).
  - `get_user_id_by_email` (SECURITY DEFINER) para buscar destinatarios por email de forma segura.
- **Edge Functions completadas** con notificaciones push integradas:
  - `select-courier`, `accept-order`, `reject-order`, `confirm-pickup`, `confirm-delivery`, `initiate-return`, `complete-return`, `cancel-order`.
  - `send-push` genérica para pruebas.
  - `expire-assignments` verificada con cron-job.org.
- **Perfil de usuario unificado**:
  - Edición inline en la misma pantalla.
  - Subida de avatar y fotos del carnet mediante cámara.
  - Interruptor de disponibilidad para mensajeros.
  - Cambio de rol Cliente ↔ Mensajero con validaciones básicas.
- **Navegación**: ajuste de la barra de pestañas (tab bar) con correcto padding en iOS/Android y eliminación de pantallas obsoletas.
- **Manejo de errores**:
  - Tolerancia a fallos de geocodificación en mapas (API key de Google Maps no obligatoria).
  - Extracción segura de coordenadas para evitar `Cannot convert undefined value to object`.
  - Registro simplificado sin necesidad de escritura directa en `profiles` (usa metadatos y trigger `on_auth_user_created`).
- **Script SQL** para crear usuarios de prueba con roles y ubicaciones simuladas.

### Modificado
- Hook `useAuth` limpio, eliminados logs de depuración.
- Pantalla de registro (`register.tsx`) ahora envía todos los metadatos al trigger y no intenta un update manual sobre `profiles`.
- Layout de autenticación y tabs optimizado, eliminada la ruta obsoleta `edit-profile`.
- `expire-assignments` configurada con cron-job externo (probado endpoint).
- Documentación de Edge Functions actualizada con notificaciones push integradas en todo el ciclo.

## [2026-05-09]
### Añadido
- Documentación inicial completa: README, base de datos, seguridad, flujos de negocio, Edge Functions, guía de desarrollo, estilo visual y convenciones de código.
- CHANGELOG para seguimiento de cambios.