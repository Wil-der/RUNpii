# Edge Functions – Especificación

**Última actualización:** 2026-05-09

Todas las Edge Functions se ejecutan en Deno/TypeScript y se invocan mediante peticiones HTTP. Deben usar la `service_role` key para operaciones que requieran permisos elevados, pero siempre autenticando al usuario llamador.

## Listado de funciones

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `select-courier` | POST | Cliente selecciona mensajero |
| `accept-order` | POST | Mensajero acepta pedido |
| `reject-order` | POST | Mensajero rechaza pedido |
| `confirm-pickup` | POST | Mensajero confirma recogida |
| `confirm-delivery` | POST | Mensajero completa entrega |
| `initiate-return` | POST (interno) | Inicia devolución tras fallo |
| `complete-return` | POST | Mensajero finaliza devolución |
| `cancel-order` | POST | Cancelación de pedido |
| `expire-assignments` | GET/POST | Tarea programada para liberar asignaciones expiradas |

---

## `select-courier`

**Descripción:** El remitente selecciona un mensajero para un pedido pendiente.

**Entrada:**
```json
{
  "order_id": "uuid",
  "courier_id": "uuid"
}
```

**Lógica:**
1. Autentica al usuario con `supabase.auth.getUser(token)`.
2. Verifica que el `order_id` existe, está en `pending` y `customer_id == usuario.id`.
3. Verifica que el `courier_id` es un mensajero válido, activo y disponible (`verification_status = approved`, `is_active = true`, `availability_status = 'available'`).
4. Si cumple compatibilidad (opcional, validación de negocio):
   - Actualiza el pedido: `status = 'awaiting_courier'`, `courier_id`, `assignment_expires_at = now() + 5 min`.
   - Actualiza el mensajero: `availability_status = 'pending_acceptance'`.
5. Devuelve éxito o error con detalles.

**Uso de service_role:** Necesita escribir en `orders` y `profiles` con condiciones que requieren RLS elevado, por lo que usa service_role.

---

## `accept-order`

**Descripción:** Un mensajero acepta un pedido que le ha sido asignado.

**Entrada:** `{ "order_id": "uuid" }`

**Lógica:**
1. Autentica como mensajero.
2. Verifica que `order_id` está en `awaiting_courier` y `courier_id == usuario.id`.
3. Comprueba que `assignment_expires_at > now()`.
4. Actualiza `status = 'assigned'`, `availability_status = 'busy'` en perfil.
5. Retorna confirmación.

**Service role:** Sí.

---

## `reject-order`

**Descripción:** Mensajero rechaza un pedido asignado.

**Entrada:** `{ "order_id": "uuid" }`

**Lógica:**
1. Autentica como mensajero.
2. Verifica que está en `awaiting_courier` y le pertenece.
3. Libera el pedido: `status = 'pending'`, `courier_id = NULL`, `assignment_expires_at = NULL`.
4. Devuelve mensajero a `available`.
5. (Opcional) Registrar rechazo para no volver a mostrarle el mismo inmediatamente.

---

## `confirm-pickup`

**Descripción:** Mensajero confirma que recogió el paquete.

**Entrada:** `{ "order_id": "uuid" }`

**Lógica:**
1. Autentica como mensajero.
2. Verifica que `order_id` está en `assigned` y `courier_id == usuario.id`.
3. Cambia estado a `picked_up`. El trigger generará el código automáticamente.
4. Envía notificación al destinatario (Web Push) con el código (o simplemente notifica que puede verlo en la app).
5. Responde con éxito.

---

## `confirm-delivery`

**Descripción:** Mensajero completa la entrega. Recibe el código de verificación y la foto.

**Entrada:**
```json
{
  "order_id": "uuid",
  "verification_code": "string",
  "photo_base64": "string (opcional)"
}
```

**Lógica:**
1. Autentica como mensajero del pedido.
2. Verifica que el pedido esté en `picked_up` o `in_transit`.
3. Usando service_role, lee `verification_code` de la BD y compara con el ingresado.
   - Si coincide: `status = 'delivered'`, guarda `delivery_photo_url` (sube imagen a bucket `delivery-photos`), responde éxito.
   - Si no: incrementa `verification_attempts`. Si supera un límite (ej. 3), cambia a `delivery_failed`.
4. Notifica a los participantes del resultado.

---

## `initiate-return`

**Descripción:** Se ejecuta cuando un pedido pasa a `delivery_failed` (puede dispararse desde `confirm-delivery` o manualmente). Crea la devolución.

**Lógica:**
1. Recibe `order_id`.
2. Crea un registro en `returns` con `original_order_id`, `return_status = 'initiated'`, `reason`.
3. Cambia estado del pedido a `returning`.
4. Notifica al remitente.
5. Retorna `return_id`.

---

## `complete-return`

**Descripción:** Mensajero finaliza la devolución entregando al remitente.

**Entrada:** `{ "return_id": "uuid" }`

**Lógica:**
1. Autentica al mensajero asignado.
2. Verifica que `return_status` es `in_transit` (o `assigned`).
3. Cambia `return_status = 'completed'`, `completed_at = now()`.
4. Cambia pedido original a `returned`.
5. Notifica.

---

## `cancel-order`

**Descripción:** Cancelación de un pedido (por remitente o sistema).

**Entrada:**
```json
{
  "order_id": "uuid",
  "cancel_reason": "string",
  "cancelled_by": "uuid (usuario)"
}
```

**Lógica:**
1. Si el pedido está en `pending`, permite cancelación sin costo.
2. Si está en `awaiting_courier` o `assigned`:
   - Aplica penalización del 50 % del `estimated_price` (cuando Stripe esté integrado; por ahora solo registra el hecho).
   - Libera al mensajero (si lo hay) poniéndolo en `available`.
3. Cambia estado a `cancelled`, actualiza `cancelled_at` y `cancel_reason`.
4. Notifica a los implicados.

---

## `expire-assignments`

**Descripción:** Función programada (cron) que se ejecuta cada minuto para liberar pedidos que no fueron aceptados a tiempo.

**Lógica:**
1. Consulta todos los pedidos en estado `awaiting_courier` donde `assignment_expires_at < now()`.
2. Para cada uno:
   - Pone el pedido en `pending`, limpia `courier_id` y `assignment_expires_at`.
   - Pone al mensajero en `availability_status = 'available'`.
   - Registra en `order_status_history` que expiró.
3. Responde con la cantidad de pedidos liberados.

**Nota:** Esta función se invoca externamente, por ejemplo con un servicio de cron (cron-job.org) que llame al endpoint. Debe usar `service_role` directamente ya que no hay usuario final.

# Edge Functions – Especificación

**Última actualización:** 2026-05-11

Todas las Edge Functions se ejecutan en Deno/TypeScript y se invocan mediante peticiones HTTP. Deben usar la `service_role` key para operaciones que requieran permisos elevados, pero siempre autenticando al usuario llamador.

## Listado de funciones

| Endpoint | Método | Propósito | Notificaciones push |
|----------|--------|-----------|---------------------|
| `select-courier` | POST | Cliente selecciona mensajero | ✅ Al mensajero elegido |
| `accept-order` | POST | Mensajero acepta pedido | ✅ Al cliente |
| `reject-order` | POST | Mensajero rechaza pedido | ✅ Al cliente |
| `confirm-pickup` | POST | Mensajero confirma recogida | ✅ Al destinatario y al cliente |
| `confirm-delivery` | POST | Mensajero completa entrega | ✅ Al cliente (éxito) o al cliente (fallo) |
| `initiate-return` | POST (interno) | Inicia devolución tras fallo | ✅ Al cliente |
| `complete-return` | POST | Mensajero finaliza devolución | ✅ Al cliente |
| `cancel-order` | POST | Cancelación de pedido | ✅ Al mensajero (si asignado) |
| `expire-assignments` | GET/POST | Tarea programada para liberar asignaciones expiradas | ❌ (sistema) |
| `send-push` | POST | Envío genérico de notificación (pruebas) | ✅ A cualquier usuario |

---

## `select-courier`

**Descripción:** El remitente selecciona un mensajero para un pedido pendiente.

**Entrada:**
```json
{
  "order_id": "uuid",
  "courier_id": "uuid"
}