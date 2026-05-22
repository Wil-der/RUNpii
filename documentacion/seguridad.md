# Seguridad – RLS, JWT y manejo de roles

**Última actualización:** 2026-05-22

## Filosofía general

RUNpii descansa sobre **Row Level Security (RLS)** de PostgreSQL y la autenticación de Supabase. El objetivo es que ningún dato confidencial se filtre, incluso si el frontend omite filtros. Para ello:

- Todas las tablas tienen RLS habilitado.
- Las políticas se basan en el `id` del usuario autenticado (`auth.uid()`) y, para admin, en una función auxiliar `get_my_role()` que consulta la tabla `profiles` con `SECURITY DEFINER`, evitando el uso de `user_metadata`.
- Las columnas especialmente sensibles se protegen con vistas y permisos de columna.
- Las Edge Functions usan `service_role` solo para operaciones que requieren saltar RLS; la identidad del usuario se pasa en el token de autenticación.

## Roles y JWT

Los usuarios de Supabase Auth tienen un token JWT que incluye `sub` (el `id`). Al registrarse, el trigger `on_auth_user_created` inserta el perfil con el rol correspondiente. **Ya no se utiliza `user_metadata` para determinar el rol de administrador.** En su lugar, la función `get_my_role()` (SECURITY DEFINER) lee directamente de la tabla `profiles` sin pasar por RLS, eliminando el riesgo de escalación de privilegios.

## Políticas RLS detalladas

| Tabla | Operación | Condición |
|-------|-----------|-----------|
| `profiles` | SELECT / UPDATE | `id = auth.uid() OR get_my_role() = 'admin'` |
| `profiles` | INSERT | `id = auth.uid()` |
| `orders` | SELECT / UPDATE | `customer_id = auth.uid() OR courier_id = auth.uid() OR recipient_id = auth.uid() OR get_my_role() = 'admin'` |
| `orders` | INSERT | `customer_id = auth.uid()` |
| `order_status_history` | SELECT / INSERT | EXISTS (pedido visible para el usuario) |
| `courier_locations` | SELECT | Cualquier autenticado |
| `courier_locations` | INSERT | `courier_id = auth.uid()` |
| `push_subscriptions` | ALL | `user_id = auth.uid()` |
| `ratings` | SELECT | Cualquier autenticado |
| `ratings` | INSERT | `from_user_id = auth.uid()` y participó en el pedido entregado/devuelto |
| `messages` | SELECT / INSERT | El usuario es remitente, mensajero o destinatario del pedido |
| `returns` | SELECT / INSERT / UPDATE | `courier_id = auth.uid()` o participante del pedido original o admin |

## Protección de columnas sensibles

- La tabla `profiles` contiene columnas como `address`, `id_card_*`. Las políticas RLS no son suficientes porque un SELECT devuelve todas las columnas si el usuario es dueño. Para listados públicos se usa la vista `public_profiles` que las excluye y se concede `SELECT` al rol `authenticated`.
- Por diseño, **siempre** que se necesite mostrar perfiles en la interfaz (ej. listado de mensajeros) se debe consultar `public_profiles`. Solo el dueño consulta su propia fila en `profiles`.

## Manejo del código de verificación

El código de 6 dígitos (`orders.verification_code`) es extremadamente sensible. Las reglas:

1. Se genera automáticamente al pasar a `picked_up` (trigger).
2. **Solo el destinatario y el cliente (remitente)** pueden verlo desde su app. El mensajero **no puede** leerlo directamente.
3. La validación la realiza una Edge Function (`confirm-delivery`) que usa `service_role`. Recibe el código ingresado por el mensajero, lee el código real de la BD, compara y devuelve éxito/fracaso.
4. Así evitamos que un mensajero malintencionado pueda extraer el código y falsear entregas.

## Uso de `service_role` en Edge Functions

Las Edge Functions se ejecutan con permisos de `service_role` cuando realizan operaciones que requieren saltar RLS. Pero siempre deben:
- Autenticar al usuario llamador mediante `supabase.auth.getUser(token)`.
- Verificar que el usuario tiene permiso lógico para la acción (según el negocio).
- Realizar la operación con los privilegios elevados, pero únicamente después de las comprobaciones anteriores.

**Nunca** se debe exponer la `service_role key` en el frontend.

## Configuración de Storage

Todos los buckets tienen políticas RLS que controlan el acceso.

| Bucket | SELECT | INSERT |
|--------|--------|--------|
| `avatars` | Cualquier autenticado | Solo el dueño |
| `id_docs` | Dueño + Admin | Solo el dueño |
| `delivery_photos` | Participantes del pedido + Admin | Solo el mensajero del pedido |
| `chat_attachments` | Participantes del pedido | Participantes del pedido |

## Protección de documentos verificados

Un trigger `prevent_verified_document_changes` en la tabla `profiles` rechaza cualquier `UPDATE` que intente modificar `id_card_number`, `id_card_front_url` o `id_card_back_url` cuando el campo `verification_status` es `'approved'`. Esto impide que un mensajero cambie sus documentos después de ser validado por un administrador.

## Rate limiting en autenticación

Se implementó un mecanismo de rate limiting en el cliente (login y registro) mediante el hook `useRateLimit`. Tras 5 intentos fallidos, el usuario es bloqueado durante 30 segundos. Los campos se deshabilitan y se muestra un contador visual.

## Protección del endpoint de expiración

El endpoint `expire-assignments` está protegido con una clave secreta (`CRON_SECRET`) que debe enviarse en el header `X-Cron-Secret`. Solo el servicio de cron autorizado (cron-job.org) puede invocarlo. (Planificado para la siguiente iteración).

## Buenas prácticas

- Nunca escribir lógica de autorización en el frontend más allá de la UX. La seguridad real reside en RLS y Edge Functions.
- Mantener las migraciones de RLS versionadas.
- Auditar periódicamente las políticas para detectar permisos excesivos.
