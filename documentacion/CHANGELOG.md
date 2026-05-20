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

## [2026-05-19]
### Añadido
- **Chat interno por pedido**:
  - Pantalla de chat (`chat.tsx`) con mensajes en tiempo real (Realtime de Supabase).
  - Envío de imágenes desde galería con compresión (`expo-image-manipulator`).
  - Visor de imagen a pantalla completa.
  - Nombres de remitentes visibles en cada mensaje.
  - Lista de chats activos (`active-chats.tsx`) accesible desde una cuarta pestaña en la barra de navegación.
- **Sistema de reputación**:
  - Pantalla de valoración (`rate.tsx`) con estrellas, etiquetas predefinidas y comentario.
  - Acceso desde el detalle del pedido cuando el estado es `delivered` o `returned`.
  - Chip "Valorar" solo visible si el usuario no ha valorado ya ese pedido.
- **Recuperación de contraseña**:
  - Pantalla "Olvidé mi contraseña" (`forgot-password.tsx`) que envía enlace de reseteo vía Supabase Auth.
  - Pantalla para nueva contraseña (`update-password.tsx`) que captura el token del deep link.
- **Historial de pedidos**:
  - Toggle "Activos" / "Historial" en la pantalla de pedidos (`explore.tsx`).
  - Consulta optimizada para mostrar solo los pedidos finalizados.
- **"Recuérdame" en login**:
  - Checkbox que guarda/recupera las credenciales usando `AsyncStorage`.
  - Ajuste del `KeyboardAvoidingView` para que el teclado no tape los inputs.
- **Compresión de imágenes**:
  - Documentos de identidad redimensionados a 2048 px y calidad 0.8 antes de subir.
  - Imágenes del chat redimensionadas a 1024 px y calidad 0.7 antes de subir.
  - Preparación para foto de entrega (1280 px, calidad 0.75).
- **Políticas de Storage**:
  - Buckets `id_docs`, `delivery_photos`, `chat_attachments` creados con políticas RLS.
  - Solo el dueño sube/ve sus documentos; el admin puede leer `id_docs` para verificación.
  - Participantes del pedido pueden subir/ver adjuntos del chat y fotos de entrega.
- **Protección de documentos verificados**:
  - Trigger SQL `prevent_verified_document_changes` bloquea modificaciones a `id_card_*` tras `approved`.
  - Frontend deshabilita los campos de documentos y muestra un mensaje cuando `verification_status = 'approved'`.
- **Modularización del código**:
  - Chat refactorizado en `hooks/useChat.ts`, `components/ChatMessage.tsx`, `components/ImagePickerButton.tsx`.
  - Perfil refactorizado en `hooks/useProfileImage.ts`, `components/ProfileHeader.tsx`, `components/PersonalInfoCard.tsx`, `components/CourierInfoCard.tsx`.
- **Correcciones**:
  - Función `nearby_couriers` cambiada a `SECURITY DEFINER` para resolver ambigüedad de permisos.
  - Función `get_order_for_map` creada para evitar problemas de formato WKB de coordenadas.
  - Duplicados en chat solucionados al eliminar la inserción manual en `sendMessage`.

### Modificado
- Edge Functions actualizadas con dependencias modernas (`std@0.224.0`, `supabase-js@2.49.4`) y autenticación vía `supabaseAdmin.auth.getUser(token)`.
- Navegación: nueva pestaña "Chats" en el tab bar.
- `login.tsx` y `register.tsx` ajustados para que el teclado no tape los campos.
- `chat.tsx` ahora envía el mensaje y deja que Realtime lo añada (evita claves duplicadas).
- `order-detail.tsx` integra chips de "Chat" y "Valorar", y redirige a la pantalla de chat.
- `explore.tsx` muestra chip de "Chat" en pedidos activos y chip de "Valorar" en historial.
- `base-de-datos.md` ya fue actualizado el 11 de mayo con las nuevas funciones SQL.