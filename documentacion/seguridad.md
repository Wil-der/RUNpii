# Seguridad – RLS, JWT y manejo de roles

**Última actualización:** 2026-05-09 

## Filosofía general

RUNpii descansa sobre **Row Level Security (RLS)** de PostgreSQL y la autenticación de Supabase. El objetivo es que ningún dato confidencial se filtre, incluso si el frontend omite filtros. Para ello:

- Todas las tablas tienen RLS habilitado.
- Las políticas se basan en el `id` del usuario autenticado (`auth.uid()`) y, para admin, en el JWT.
- Las columnas especialmente sensibles se protegen con vistas y permisos de columna.
- Las Edge Functions usan `service_role` solo para operaciones que requieren saltar RLS; la identidad del usuario se pasa en el token de autenticación.

## Roles y JWT

Los usuarios de Supabase Auth tienen un token JWT que incluye `sub` (el `id`) y `user_metadata`. Al registrarse, el frontend debe enviar el `role` en los metadatos:

```js
supabase.auth.signUp({
  email,
  password,
  options: {
    data: { role: 'customer' } // o 'courier', 'admin'
  }
})
```

Las políticas comprueban si es admin así:
```sql
(auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
```

**Nunca** se consulta la tabla `profiles` para determinar el rol, evitando recursión y riesgos de seguridad.

## Políticas RLS detalladas

| Tabla | Operación | Condición |
|-------|-----------|-----------|
| `profiles` | SELECT | `id = auth.uid() OR (auth.jwt() ...) = 'admin'` |
| `profiles` | INSERT | `id = auth.uid()` |
| `profiles` | UPDATE | `id = auth.uid() OR admin` |
| `orders` | SELECT/UPDATE | `customer_id = auth.uid() OR courier_id = auth.uid() OR recipient_id = auth.uid() OR admin` |
| `orders` | INSERT | `customer_id = auth.uid()` |
| `order_status_history` | SELECT | EXISTS (pedido visible para el usuario) |
| `order_status_history` | INSERT | EXISTS (pedido visible) |
| `courier_locations` | SELECT | Cualquier autenticado |
| `courier_locations` | INSERT | `courier_id = auth.uid()` |
| `push_subscriptions` | ALL | `user_id = auth.uid()` |
| `ratings` | SELECT | Cualquier autenticado |
| `ratings` | INSERT | `from_user_id = auth.uid()` y participó en el pedido entregado/devuelto |
| `messages` | SELECT/INSERT | El usuario es remitente, mensajero o destinatario del pedido |
| `returns` | SELECT/INSERT/UPDATE | `courier_id = auth.uid()` o participante del pedido original o admin |

## Protección de columnas sensibles

- La tabla `profiles` contiene columnas como `address`, `id_card_*`. Las políticas RLS no son suficientes porque un SELECT devuelve todas las columnas si el usuario es dueño. Para listados públicos se usa la vista `public_profiles` que las excluye y se concede `SELECT` al rol `authenticated`.  
- Por diseño, **siempre** que se necesite mostrar perfiles en la interfaz (ej. listado de mensajeros) se debe consultar `public_profiles`. Solo el dueño consulta su propia fila en `profiles`.

## Manejo del código de verificación

El código de 6 dígitos (`orders.verification_code`) es extremadamente sensible. Las reglas:

1. Se genera automáticamente al pasar a `picked_up` (trigger).
2. **Solo el destinatario** puede verlo desde su app (la RLS de `orders` se lo permite porque es participante). El mensajero **no puede** leerlo directamente.
3. La validación la realiza una Edge Function (`confirm-delivery`) que usa `service_role`. Recibe el código ingresado por el mensajero, lee el código real de la BD, compara y devuelve éxito/fracaso.
4. Así evitamos que un mensajero malintencionado pueda extraer el código y falsear entregas.

## Uso de `service_role` en Edge Functions

Las Edge Functions se ejecutan con permisos de `service_role` cuando realizan operaciones que requieren saltar RLS. Pero siempre deben:
- Autenticar al usuario llamador mediante `supabase.auth.getUser(token)`.
- Verificar que el usuario tiene permiso lógico para la acción (según el negocio).
- Realizar la operación con los privilegios elevados, pero únicamente después de las comprobaciones anteriores.

**Nunca** se debe exponer la `service_role key` en el frontend.

## Configuración de Storage

Los buckets privados (fotos de carnet, comprobantes de entrega) deben tener políticas que solo permitan acceso al dueño o bajo condiciones muy controladas. La documentación detallada de Storage se creará cuando se implemente, pero los nombres y reglas básicas son:
- Bucket `id-cards`: solo el usuario autenticado puede subir sus propios archivos; un admin puede leer.
- Bucket `delivery-photos`: solo el mensajero asignado puede subir, y los participantes del pedido pueden leer.

## Buenas prácticas

- Nunca escribir lógica de autorización en el frontend más allá de la UX. La seguridad real reside en RLS y Edge Functions.
- Mantener las migraciones de RLS versionadas.
- Auditar periódicamente las políticas para detectar permisos excesivos.
