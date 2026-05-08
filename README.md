# 📦 RUNpii – Plataforma de Mensajería Colaborativa

**Versión actual:** Base de datos lista, capa de aplicación en desarrollo.

RUNpii es una plataforma de envíos peer-to-peer que conecta remitentes, mensajeros verificados y destinatarios. Incluye selección manual de mensajero, verificación de identidad, chat interno, doble verificación de entrega, gestión de devoluciones y un sistema de reputación avanzado.

## Tech Stack

- **Backend-as-a-Service:** [Supabase](https://supabase.com)
  - PostgreSQL 15 con extensión PostGIS (datos geoespaciales)
  - Autenticación integrada (JWT)
  - API REST autogenerada (PostgREST) + Realtime (WebSockets)
  - Edge Functions (Deno/TypeScript) para lógica de negocio
- **Frontend:** Next.js (React) + `@supabase/supabase-js`
- **Pagos:** Stripe (integración futura)
- **Notificaciones:** Web Push (campos en BD listos)

## Estado actual del proyecto

✅ Base de datos creada y asegurada  
✅ Esquema de tablas, tipos ENUM y relaciones  
✅ Políticas RLS (Row Level Security) implementadas  
✅ Triggers SQL para historial de estados y reputación  
✅ Vistas públicas seguras  
✅ Extensiones (PostGIS) instaladas y permisos de sistema revocados  
⬜ Edge Functions (lógica de negocio) – por implementar  
⬜ Frontend – por implementar

## Estructura de la base de datos

### Tablas principales

| Tabla | Descripción | Columnas clave |
|-------|-------------|----------------|
| `profiles` | Datos de usuario, roles, verificación y perfil de mensajero | `id` (PK UUID, FK a `auth.users`), `role` (customer/courier/admin), `verification_status`, `is_active`, `availability_status`, `price_per_km`, `service_zone` (polygon), `rating_average`, `total_ratings` |
| `orders` | Pedidos de envío | `id` (PK UUID), `customer_id`, `courier_id`, `recipient_id`, `status` (10 estados), `assignment_expires_at`, `verification_code`, `delivery_photo_url`, `pickup_location`/`delivery_location` (geography Point), `estimated_price`, `final_price`, `payment_status` |
| `order_status_history` | Auditoría de cambios de estado | `order_id`, `status`, `changed_by`, `changed_at`, `notes` |
| `courier_locations` | Posición GPS de mensajeros en tiempo real | `courier_id`, `location` (geography Point), `timestamp` |
| `push_subscriptions` | Suscripciones para notificaciones web push | `user_id`, `endpoint`, `p256dh_key`, `auth_key` |
| `ratings` | Evaluaciones entre usuarios (1-5 estrellas + etiquetas) | `order_id`, `from_user_id`, `to_user_id`, `rating`, `tags`, `comment` |
| `messages` | Chat interno por pedido | `order_id`, `sender_id`, `content`, `attachment_url`, `sent_at` |
| `returns` | Devoluciones de pedidos fallidos | `original_order_id`, `return_status`, `courier_id` |

### ENUMs definidos

- `user_role`: customer, courier, admin
- `verification_status`: pending, approved, rejected
- `vehicle_type`: bicycle, motorcycle, car, van, truck
- `package_size_enum`: small, medium, large, extra_large
- `availability_status`: available, pending_acceptance, busy, offline
- `order_status`: pending, awaiting_courier, assigned, picked_up, in_transit, delivered, delivery_failed, returning, returned, cancelled
- `return_status`: initiated, assigned, in_transit, completed
- `payment_method`: cash, card, wallet
- `payment_status`: unpaid, paid, refunded

### Vistas

- `public_profiles`: expone campos no sensibles de `profiles` para todos los usuarios autenticados (sin `address`, `id_card_number`, etc.). Debe usarse para consultas de listados.

### Triggers automáticos

- `update_modified_column`: actualiza `updated_at` en varias tablas.
- `trg_order_status_history`: inserta automáticamente en `order_status_history` cada vez que cambia `orders.status`.
- `trg_update_rating`: recalcula `rating_average` y `total_ratings` en `profiles` al insertar una nueva valoración.
- `on_auth_user_created`: crea automáticamente una fila en `profiles` al registrarse un usuario en `auth.users`.

## Seguridad (RLS)

Todas las tablas tienen Row Level Security activado. Las políticas son:

- **profiles**: solo el propio usuario o admin pueden leer/escribir la tabla real. La vista `public_profiles` permite leer datos básicos de cualquier autenticado.
- **orders**: lectura/actualización por parte del remitente (`customer_id`), destinatario (`recipient_id`), mensajero asignado (`courier_id`) o admin. Inserción solo por el remitente (él mismo como `customer_id`).
- **order_status_history**: misma visibilidad que el pedido asociado (EXISTS en `orders` con participante/admin).
- **courier_locations**: lectura para cualquier autenticado, inserción solo por el propio mensajero.
- **push_subscriptions**: solo el dueño puede leer/modificar.
- **ratings**: lectura pública para autenticados; inserción solo si el usuario fue participante del pedido y no existe otra valoración del mismo `order_id` y `from_user_id`.
- **messages**: lectura/escritura solo para los tres participantes del pedido (cliente, mensajero, destinatario).
- **returns**: lectura/actualización para el mensajero asignado a la devolución, cualquiera de los participantes del pedido original y admins. Inserción solo para participantes del pedido original.

Además, se ha revocado el acceso a tablas del sistema PostGIS (`spatial_ref_sys`, `geometry_columns`, `geography_columns`) y a funciones `SECURITY DEFINER` inseguras (`rls_auto_enable`, `st_estimatedextent`) para los roles `anon` y `authenticated`.

## 📚 Detalle completo de la base de datos

A continuación se describen **todas las tablas, columnas, tipos, índices, políticas RLS, triggers y funciones** que ya están implementadas en Supabase. Este es el estado real del esquema después de todos los ajustes de seguridad y negocio.

### Tablas

#### 1. `profiles`

Almacena los datos de cada usuario (extiende `auth.users`). **Nota importante:** Para listar perfiles desde el frontend se debe usar la vista `public_profiles` (ver abajo), nunca la tabla directamente (por restricciones de seguridad a nivel de columna).

| Columna | Tipo | Restricciones | Descripción |
|---------|------|------------|-------------|
| `id` | `uuid` | `PRIMARY KEY`, `REFERENCES auth.users(id) ON DELETE CASCADE` | UUID del usuario (FK a la tabla de autenticación) |
| `role` | `user_role` | `NOT NULL DEFAULT 'customer'` | `customer`, `courier`, `admin` |
| `full_name` | `text` | | Nombre real completo |
| `avatar_url` | `text` | | URL de la foto de perfil |
| `address` | `text` | | Dirección (visible solo para el propio usuario o admin) |
| `id_card_number` | `text` | | Documento de identidad (solo mensajeros) |
| `id_card_front_url` | `text` | | Foto frontal del carnet (bucket privado) |
| `id_card_back_url` | `text` | | Foto trasera del carnet |
| `verification_status` | `verification_status` | `DEFAULT 'pending'` | `pending`, `approved`, `rejected` |
| `verified_by` | `uuid` | `REFERENCES auth.users(id)` | Admin que validó la identidad |
| `verified_at` | `timestamptz` | | Momento de la validación |
| `is_active` | `boolean` | `DEFAULT false` | Solo mensajeros: indica si puede recibir pedidos |
| `vehicle_type` | `vehicle_type` | | `bicycle`, `motorcycle`, `car`, `van`, `truck` |
| `max_package_size` | `package_size_enum` | | Tamaño máximo que transporta |
| `max_weight_kg` | `numeric(5,2)` | | Peso máximo que transporta |
| `service_zone` | `geometry(Polygon, 4326)` | | Polígono de cobertura (PostGIS) |
| `price_per_km` | `numeric(8,2)` | | Tarifa por kilómetro |
| `availability_status` | `availability_status` | `DEFAULT 'offline'` | `available`, `pending_acceptance`, `busy`, `offline` |
| `rating_average` | `numeric(3,2)` | `DEFAULT 0` | Promedio de valoraciones recibidas |
| `total_ratings` | `integer` | `DEFAULT 0` | Cantidad de valoraciones recibidas |
| `preferred_language` | `text` | `DEFAULT 'es'` | Idioma para notificaciones |
| `stripe_customer_id` | `text` | | ID de cliente en Stripe |
| `created_at` | `timestamptz` | `DEFAULT now()` | Fecha de creación |
| `updated_at` | `timestamptz` | `DEFAULT now()` | Última modificación (actualizado por trigger) |

**Índices:**  
- `idx_profiles_role` en `role`  
- `idx_profiles_verification_status` en `verification_status`

**Triggers:**  
- `update_profiles_modtime`: antes de `UPDATE` actualiza `updated_at` mediante la función `update_modified_column()`.

**Políticas RLS:**

- `Acceso a perfil propio o admin` (`SELECT`): Solo el propio usuario o un admin pueden ver todos los campos de su perfil.
- `Insertar mi propio perfil` (`INSERT`): Solo el propio `id` puede insertar.
- `Actualizar mi perfil o admin` (`UPDATE`): El propio usuario o un admin pueden modificar.

Adicionalmente se ha configurado un **permiso de columna** para el rol `authenticated` que solo permite leer las columnas no sensibles: `id`, `role`, `full_name`, `avatar_url`, `vehicle_type`, `max_package_size`, `max_weight_kg`, `service_zone`, `price_per_km`, `availability_status`, `rating_average`, `total_ratings`, `preferred_language`, `created_at`, `updated_at`. Esto hace que la vista `public_profiles` sea suficiente para la mayoría de consultas.

---

#### 2. `orders`

Pedido de envío creado por un remitente.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|------------|-------------|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | ID único del pedido |
| `customer_id` | `uuid` | `NOT NULL REFERENCES profiles(id)` | Remitente |
| `recipient_id` | `uuid` | `NOT NULL REFERENCES profiles(id)` | Destinatario |
| `courier_id` | `uuid` | `REFERENCES profiles(id)` | Mensajero asignado (nullable) |
| `pickup_location` | `geography(Point, 4326)` | | Punto de recogida |
| `delivery_location` | `geography(Point, 4326)` | | Punto de entrega |
| `pickup_address` | `text` | `NOT NULL` | Dirección textual de recogida |
| `delivery_address` | `text` | `NOT NULL` | Dirección textual de entrega |
| `package_size` | `package_size_enum` | `NOT NULL` | Tamaño del paquete |
| `package_weight_kg` | `numeric(5,2)` | | Peso en kg |
| `is_fragile` | `boolean` | `DEFAULT false` | ¿Es frágil? |
| `package_description` | `text` | | Descripción del contenido |
| `special_instructions` | `text` | | Instrucciones adicionales |
| `contactless_delivery` | `boolean` | `DEFAULT true` | Entrega sin contacto |
| `signature_required` | `boolean` | `DEFAULT false` | Requiere firma (futuro) |
| `estimated_price` | `numeric(10,2)` | | Precio estimado mostrado antes de confirmar |
| `final_price` | `numeric(10,2)` | | Precio final tras completar |
| `currency` | `text` | `DEFAULT 'USD'` | Moneda (`CUP`, `USD`) |
| `payment_method` | `payment_method` | | `cash`, `card`, `wallet` |
| `payment_status` | `payment_status` | `DEFAULT 'unpaid'` | `unpaid`, `paid`, `refunded` |
| `platform_fee_percent` | `numeric(4,2)` | `DEFAULT 10.00` | Comisión de la plataforma |
| `status` | `order_status` | `DEFAULT 'pending'` | Estado actual (ver ENUM) |
| `assignment_expires_at` | `timestamptz` | | Límite para que el mensajero acepte |
| `verification_code` | `text` | | Código de 6 dígitos para entrega |
| `verification_attempts` | `integer` | `DEFAULT 0` | Intentos fallidos de verificación |
| `delivery_photo_url` | `text` | | Foto de comprobante de entrega |
| `picked_up_at` | `timestamptz` | | Momento de recogida |
| `delivered_at` | `timestamptz` | | Momento de entrega exitosa |
| `cancelled_at` | `timestamptz` | | Momento de cancelación |
| `cancel_reason` | `text` | | Motivo de la cancelación |
| `cancelled_by` | `uuid` | `REFERENCES auth.users(id)` | Quién canceló |
| `created_at` | `timestamptz` | `DEFAULT now()` | |
| `updated_at` | `timestamptz` | `DEFAULT now()` | |

**Índices:**  
- `idx_orders_customer` (customer_id)  
- `idx_orders_courier` (courier_id)  
- `idx_orders_recipient` (recipient_id)  
- `idx_orders_status` (status)

**Triggers:**  
- `update_orders_modtime`: actualiza `updated_at`.  
- `trg_order_status_history`: después de cada cambio en `status` inserta un registro en `order_status_history` (función `fn_order_status_history`).

**Políticas RLS:**

- `Ver pedidos como participante o admin` (`SELECT`): Cliente, mensajero, destinatario o admin.
- `Insertar mi pedido` (`INSERT`): Solo el remitente (`customer_id = auth.uid()`).
- `Actualizar pedido como participante o admin` (`UPDATE`): Igual visibilidad que lectura.

---

#### 3. `order_status_history`

Registro de auditoría de cambios de estado de los pedidos.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|------------|-------------|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | |
| `order_id` | `uuid` | `NOT NULL REFERENCES orders(id) ON DELETE CASCADE` | Pedido asociado |
| `status` | `order_status` | `NOT NULL` | Estado registrado |
| `changed_by` | `uuid` | `REFERENCES auth.users(id)` | Usuario que provocó el cambio |
| `changed_at` | `timestamptz` | `DEFAULT now()` | Momento del cambio |
| `notes` | `text` | | Notas adicionales |

**Índices:** `idx_order_status_history_order` (order_id)

**Políticas RLS:**  
- `Ver historial si ves el pedido` (`SELECT`): mismo criterio que pedido (`EXISTS` en `orders` con participante/admin).  
- `Insertar historial como participante` (`INSERT`): solo participantes del pedido (o admin). El trigger automático inserta con el usuario que ejecutó la acción.

---

#### 4. `courier_locations`

Posiciones GPS en tiempo real de los mensajeros.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|------------|-------------|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | |
| `courier_id` | `uuid` | `NOT NULL REFERENCES profiles(id)` | Mensajero |
| `location` | `geography(Point, 4326)` | `NOT NULL` | Punto geográfico actual |
| `accuracy_meters` | `real` | | Precisión del GPS |
| `speed_kmh` | `real` | | Velocidad |
| `heading` | `real` | | Dirección en grados |
| `battery_level` | `real` | | Batería del dispositivo |
| `timestamp` | `timestamptz` | `DEFAULT now()` | Momento del registro |

**Índices:** `idx_courier_locations_courier` (courier_id), `idx_courier_locations_timestamp` (timestamp)

**Políticas RLS:**  
- `Cualquier usuario ve ubicaciones` (`SELECT`): `USING (true)` para autenticados.  
- `Solo el mensajero inserta su ubicación` (`INSERT`): `WITH CHECK (courier_id = auth.uid())`.

---

#### 5. `push_subscriptions`

Suscripciones para notificaciones web push.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|------------|-------------|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | |
| `user_id` | `uuid` | `NOT NULL REFERENCES profiles(id) ON DELETE CASCADE` | Usuario |
| `endpoint` | `text` | `NOT NULL` | URL del navegador |
| `p256dh_key` | `text` | `NOT NULL` | Clave pública |
| `auth_key` | `text` | `NOT NULL` | Clave de autenticación |
| `device_type` | `text` | | Tipo de dispositivo |
| `created_at` | `timestamptz` | `DEFAULT now()` | |
| `updated_at` | `timestamptz` | `DEFAULT now()` | |

**Triggers:** `update_push_subs_modtime` actualiza `updated_at`.

**Políticas RLS:** `Gestionar solo mis suscripciones` (`ALL`): `USING (user_id = auth.uid())`.

---

#### 6. `ratings`

Evaluaciones entre usuarios después de un pedido.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|------------|-------------|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | |
| `order_id` | `uuid` | `NOT NULL REFERENCES orders(id) ON DELETE CASCADE` | Pedido evaluado |
| `from_user_id` | `uuid` | `NOT NULL REFERENCES profiles(id)` | Quién evalúa |
| `to_user_id` | `uuid` | `NOT NULL REFERENCES profiles(id)` | Quién recibe la evaluación |
| `rating` | `smallint` | `CHECK (rating >= 1 AND rating <= 5)` | Puntuación |
| `tags` | `text[]` | | Etiquetas (array) |
| `comment` | `text` | | Comentario libre |
| `created_at` | `timestamptz` | `DEFAULT now()` | |

**Restricción UNIQUE:** `UNIQUE (order_id, from_user_id)` (una evaluación por usuario y pedido).

**Triggers:** `trg_update_rating` actualiza `rating_average` y `total_ratings` en `profiles` al insertar.

**Políticas RLS:**  
- `Cualquiera puede ver evaluaciones` (`SELECT`): `USING (true)` para autenticados.  
- `Insertar evaluación solo si participé en el pedido` (`INSERT`): `from_user_id = auth.uid()` y debe existir el pedido donde el usuario sea cliente o mensajero (ampliable a destinatario).

---

#### 7. `messages`

Mensajes del chat interno del pedido.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|------------|-------------|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | |
| `order_id` | `uuid` | `NOT NULL REFERENCES orders(id) ON DELETE CASCADE` | Pedido |
| `sender_id` | `uuid` | `NOT NULL REFERENCES profiles(id)` | Remitente del mensaje |
| `content` | `text` | `NOT NULL` | Texto del mensaje |
| `attachment_url` | `text` | | Imagen adjunta (opcional) |
| `sent_at` | `timestamptz` | `DEFAULT now()` | Momento de envío |

**Índices:** `idx_messages_order` (order_id)

**Políticas RLS:**  
- `Leer mensajes del pedido como participante` (`SELECT`): usando `EXISTS` en `orders` con los tres roles.  
- `Enviar mensaje si eres participante` (`INSERT`): `sender_id = auth.uid()` y existe el pedido con participación.

---

#### 8. `returns`

Devoluciones de pedidos que fallaron la entrega.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|------------|-------------|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | |
| `original_order_id` | `uuid` | `NOT NULL REFERENCES orders(id)` | Pedido original que falló |
| `return_status` | `return_status` | `DEFAULT 'initiated'` | `initiated`, `assigned`, `in_transit`, `completed` |
| `reason` | `text` | | Motivo de la devolución |
| `courier_id` | `uuid` | `REFERENCES profiles(id)` | Mensajero que realiza la devolución |
| `created_at` | `timestamptz` | `DEFAULT now()` | |
| `completed_at` | `timestamptz` | | Momento de finalización |

**Índices:** `idx_returns_original_order` (original_order_id)

**Políticas RLS:**  
- `Leer devoluciones (courier asignado, participantes o admin)` (`SELECT`): si eres el mensajero de la devolución o participante del pedido original.  
- `Insertar devolución (participante original o admin)` (`INSERT`).  
- `Actualizar devolución (courier asignado, participantes o admin)` (`UPDATE`).

---

### ENUMs definidos

| Nombre | Valores |
|--------|---------|
| `user_role` | `customer`, `courier`, `admin` |
| `verification_status` | `pending`, `approved`, `rejected` |
| `vehicle_type` | `bicycle`, `motorcycle`, `car`, `van`, `truck` |
| `package_size_enum` | `small`, `medium`, `large`, `extra_large` |
| `availability_status` | `available`, `pending_acceptance`, `busy`, `offline` |
| `order_status` | `pending`, `awaiting_courier`, `assigned`, `picked_up`, `in_transit`, `delivered`, `delivery_failed`, `returning`, `returned`, `cancelled` |
| `return_status` | `initiated`, `assigned`, `in_transit`, `completed` |
| `payment_method` | `cash`, `card`, `wallet` |
| `payment_status` | `unpaid`, `paid`, `refunded` |

---

### Vistas y funciones auxiliares

- **`public_profiles`** (vista): expone todas las columnas de `profiles` excepto las sensibles (`address`, `id_card_number`, `id_card_front_url`, `id_card_back_url`, `stripe_customer_id`). Es `SECURITY INVOKER`, por lo que respeta los permisos de columna del usuario. Debe usarse para cualquier listado de usuarios en la app.
- **`update_modified_column()`** (función trigger): actualiza `updated_at` al valor `now()`. Se usa en varios triggers.

---

### Triggers de negocio implementados

1. `on_auth_user_created` (sobre `auth.users`): al registrarse un usuario nuevo, crea automáticamente su fila en `profiles` con el rol por defecto `customer`.
2. `trg_order_status_history` (sobre `orders`): al cambiar `status`, inserta automáticamente una fila en `order_status_history` con el nuevo estado y el usuario (`auth.uid()`) que realizó el cambio.
3. `trg_update_rating` (sobre `ratings`): tras insertar una valoración, recalcula el `rating_average` y `total_ratings` en el perfil del evaluado (`to_user_id`).

---

### Notas de seguridad adicionales

- Se ha revocado el acceso a las tablas del sistema PostGIS (`spatial_ref_sys`, `geometry_columns`, `geography_columns`) para los roles `anon` y `authenticated` a través de la API.
- Las funciones `SECURITY DEFINER` peligrosas (`rls_auto_enable`, `st_estimatedextent`) han sido revocadas para esos mismos roles, evitando su exposición pública.

## Flujos de negocio principales

### 1. Verificación de mensajero
1. Usuario se registra con rol `courier`.
2. Completa `full_name`, `address`, `id_card_number`, sube fotos del carnet (`id_card_front_url`, `id_card_back_url`).
3. `verification_status` = `pending`.
4. Un admin revisa y aprueba/rechaza (`approved`/`rejected`).
5. Solo tras `approved` podrá activarse (`is_active = true`) y recibir pedidos.

### 2. Ciclo de vida de un pedido (estados en `orders.status`)

| Paso | Estado | Acción |
|------|--------|--------|
| Remitente crea el pedido | `pending` | Se muestran mensajeros disponibles |
| Remitente selecciona mensajero | `awaiting_courier` | `assignment_expires_at = now() + 5 min`. Mensajero pasa a `pending_acceptance` |
| Mensajero acepta | `assigned` | Mensajero pasa a `busy` |
| Mensajero recoge paquete | `picked_up` | Se genera código de 6 dígitos y se notifica al destinatario |
| Mensajero en camino | `in_transit` | Ubicación en vivo visible para remitente y destinatario |
| Entrega exitosa | `delivered` | Código validado + foto de comprobante |
| No se pudo entregar | `delivery_failed` | Se inicia devolución automática |
| Paquete en devolución | `returning` | El mensajero regresa el paquete al remitente |
| Devolución completada | `returned` | Remitente recibe el paquete |
| Cancelado | `cancelled` | Según política de cancelación |

### 3. Selección de mensajero
El remitente ve una lista filtrada por:
- `verification_status = approved`
- `is_active = true`
- `availability_status = available`
- Proximidad (radio configurable, usando `pickup_location` y `service_zone` con funciones PostGIS)
- Capacidad (`vehicle_type`, `max_package_size`, `max_weight_kg`) compatible con el paquete.

El precio estimado se calcula como `distancia_total * price_per_km`.

### 4. Entrega con verificación
- El código de 6 dígitos se genera automáticamente al pasar a `picked_up`.
- Solo el destinatario lo ve en su app.
- El mensajero debe introducirlo en su app durante la entrega.
- Máximo de intentos configurables; si falla repetidamente, se marca `delivery_failed` y se activa devolución.

### 5. Chat interno
- Accesible desde que el pedido está `assigned` hasta que finaliza.
- Participan remitente, mensajero y destinatario.
- Mensajes y archivos adjuntos (fotos) permitidos.
- Se usa la tabla `messages` con políticas RLS (escritura/lectura según participación).

### 6. Sistema de reputación
- Al completar un pedido (`delivered` o `returned`), los participantes pueden valorarse mutuamente.
- Escala 1-5 estrellas + etiquetas predefinidas + comentario libre.
- Un usuario solo puede evaluar una vez por pedido (restricción UNIQUE en `ratings`).
- Los triggers mantienen actualizados los promedios y contadores en `profiles`.

### 7. Política de cancelación
- Cancelación sin mensajero (`pending`): sin costo.
- Cancelación con mensajero implicado (`awaiting_courier` o `assigned`): se cobra el 50% del precio estimado al remitente, se transfiere al mensajero como compensación.
- Cancelación del mensajero: penalización reputacional y pedido vuelve a `pending`.

### 8. Devolución (logística inversa)
- Al registrarse `delivery_failed`, el sistema crea un registro en `returns` con `return_status = initiated`.
- Se asigna un mensajero (puede ser el mismo u otro) y se notifica al remitente.
- El pedido original pasa a `returning` y luego a `returned` al completarse la devolución.

## Edge Functions a implementar

Todas deben desplegarse en Supabase con `supabase functions deploy`. La lógica se implementa en TypeScript/Deno.

| Función (endpoint) | Método | Descripción | Lógica principal |
|---------------------|--------|-------------|------------------|
| `select-courier` | POST | Remitente elige mensajero disponible | Valida `order_id` y `courier_id`. Transición: `pending` → `awaiting_courier`. Establece `assignment_expires_at` y cambia disponibilidad del mensajero a `pending_acceptance`. |
| `accept-order` | POST | Mensajero acepta pedido | Verifica estado `awaiting_courier` y expiración. Transición: `awaiting_courier` → `assigned`. Mensajero a `busy`. |
| `reject-order` | POST | Mensajero rechaza pedido o expira | Revierte a `pending`, libera mensajero a `available`. |
| `confirm-pickup` | POST | Mensajero confirma recogida del paquete | Transición: `assigned` → `picked_up`. Genera código de 6 dígitos (`verification_code`) y lo envía al destinatario. |
| `confirm-delivery` | POST | Mensajero completa la entrega | Valida código, incrementa intentos, gestiona fallo o éxito. Puede generar `delivered` o `delivery_failed`. Requiere foto de comprobante. |
| `initiate-return` | (llamada interna o trigger) | Inicia devolución tras `delivery_failed` | Crea registro en `returns`, cambia pedido a `returning`. |
| `complete-return` | POST | Mensajero completa la devolución | Actualiza `return_status` a `completed` y pedido original a `returned`. |
| `cancel-order` | POST | Remitente o sistema cancela un pedido | Aplica penalizaciones si corresponde (50%), gestiona pagos vía Stripe, libera mensajero. |

**Patrón común:**
- Autenticar al usuario con `supabase.auth.getUser()`.
- Validar entradas (JSON).
- Usar `service_role` key para actualizar la BD saltando RLS cuando sea necesario (o respetar RLS si se usa el token del usuario).
- Mantener transacciones atómicas con múltiples operaciones usando `supabase.rpc()` o llamadas SQL personalizadas.

## Cómo trabajar en el proyecto

### Configuración inicial

1. Clona el repositorio.
2. Instala Supabase CLI: `npm i -g supabase`
3. Inicia sesión: `supabase login`
4. Vincula el proyecto: `supabase link --project-ref <tu-ref>`
5. Variables de entorno necesarias en `.env.local`:
