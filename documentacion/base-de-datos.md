# Base de datos – Esquema completo

**Última actualización:** 2026-05-11

Este documento describe todas las tablas, tipos ENUM, vistas, funciones y triggers de la base de datos PostgreSQL de RUNpii, respaldada por Supabase.

## Contenido
1. [Tablas](#tablas)
   - [profiles](#1-profiles)
   - [orders](#2-orders)
   - [order_status_history](#3-order_status_history)
   - [courier_locations](#4-courier_locations)
   - [push_subscriptions](#5-push_subscriptions)
   - [ratings](#6-ratings)
   - [messages](#7-messages)
   - [returns](#8-returns)
2. [ENUMs definidos](#enums-definidos)
3. [Vistas](#vistas)
4. [Funciones auxiliares](#funciones-auxiliares)
5. [Triggers](#triggers)

---

## Tablas

### 1. `profiles`

Perfil de cada usuario (extiende `auth.users`). Las columnas sensibles están protegidas por RLS; para consultas públicas usa la vista `public_profiles`.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | `uuid` | `PK REFERENCES auth.users(id) ON DELETE CASCADE` | UUID del usuario |
| `role` | `user_role` | `NOT NULL DEFAULT 'customer'` | Rol en la plataforma |
| `full_name` | `text` | | Nombre completo |
| `avatar_url` | `text` | | URL de foto de perfil |
| `address` | `text` | | Dirección física (sensible) |
| `id_card_number` | `text` | | Núm. documento de identidad (sensible) |
| `id_card_front_url` | `text` | | Foto frontal del carnet (sensible) |
| `id_card_back_url` | `text` | | Foto trasera del carnet (sensible) |
| `verification_status` | `verification_status` | `DEFAULT 'pending'` | Estado de verificación del mensajero |
| `verified_by` | `uuid` | `REFERENCES auth.users(id)` | Admin que validó la identidad |
| `verified_at` | `timestamptz` | | Momento de la validación |
| `is_active` | `boolean` | `DEFAULT false` | Solo mensajeros: ¿puede recibir pedidos? |
| `vehicle_type` | `vehicle_type` | | Tipo de vehículo |
| `max_package_size` | `package_size_enum` | | Tamaño máximo que transporta |
| `max_weight_kg` | `numeric(5,2)` | | Peso máximo |
| `service_zone` | `geometry(Polygon,4326)` | | Zona de cobertura (PostGIS) |
| `price_per_km` | `numeric(8,2)` | | Tarifa por km |
| `availability_status` | `availability_status` | `DEFAULT 'offline'` | Disponibilidad actual |
| `rating_average` | `numeric(3,2)` | `DEFAULT 0` | Promedio de valoraciones (actualizado por trigger) |
| `total_ratings` | `integer` | `DEFAULT 0` | Cantidad de valoraciones recibidas |
| `preferred_language` | `text` | `DEFAULT 'es'` | Idioma para notificaciones |
| `stripe_customer_id` | `text` | | ID en Stripe (futuro) |
| `created_at` | `timestamptz` | `DEFAULT now()` | |
| `updated_at` | `timestamptz` | `DEFAULT now()` | Actualizado por trigger |

**Índices:** `idx_profiles_role`, `idx_profiles_verification_status`

**Triggers:** `update_profiles_modtime` (before update).

**RLS:** solo el dueño o admin pueden leer/escribir. Para listados públicos se usa `public_profiles`.

---

### 2. `orders`

Pedido de envío. Centraliza la información de recogida, entrega, paquete, pagos y estado.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | `uuid` | `PK DEFAULT gen_random_uuid()` | ID único |
| `customer_id` | `uuid` | `NOT NULL REFERENCES profiles(id)` | Remitente |
| `recipient_id` | `uuid` | `NOT NULL REFERENCES profiles(id)` | Destinatario |
| `courier_id` | `uuid` | `REFERENCES profiles(id)` | Mensajero asignado (nullable) |
| `pickup_location` | `geography(Point,4326)` | `NOT NULL` | Punto de recogida |
| `delivery_location` | `geography(Point,4326)` | `NOT NULL` | Punto de entrega |
| `pickup_address` | `text` | `NOT NULL` | Dirección textual de recogida |
| `delivery_address` | `text` | `NOT NULL` | Dirección textual de entrega |
| `package_size` | `package_size_enum` | `NOT NULL` | Tamaño del paquete |
| `package_weight_kg` | `numeric(5,2)` | | Peso |
| `is_fragile` | `boolean` | `DEFAULT false` | ¿Frágil? |
| `package_description` | `text` | | Contenido |
| `special_instructions` | `text` | | Instrucciones extra |
| `contactless_delivery` | `boolean` | `DEFAULT true` | Entrega sin contacto |
| `signature_required` | `boolean` | `DEFAULT false` | Requiere firma (futuro) |
| `estimated_price` | `numeric(10,2)` | | Precio calculado antes de confirmar |
| `final_price` | `numeric(10,2)` | | Precio final tras entrega |
| `currency` | `text` | `DEFAULT 'USD'` | Moneda |
| `payment_method` | `payment_method` | | Método de pago |
| `payment_status` | `payment_status` | `DEFAULT 'unpaid'` | Estado del pago |
| `platform_fee_percent` | `numeric(4,2)` | `DEFAULT 10.00` | Comisión de la plataforma |
| `status` | `order_status` | `DEFAULT 'pending'` | Estado actual |
| `assignment_expires_at` | `timestamptz` | | Límite para aceptación del mensajero (5 min) |
| `verification_code` | `text` | | Código de 6 dígitos generado al recoger |
| `verification_attempts` | `integer` | `DEFAULT 0` | Intentos fallidos de verificación |
| `delivery_photo_url` | `text` | | Foto de comprobante de entrega |
| `picked_up_at` | `timestamptz` | | Momento de recogida (rellenado por trigger) |
| `delivered_at` | `timestamptz` | | Momento de entrega exitosa (trigger) |
| `cancelled_at` | `timestamptz` | | Momento de cancelación (trigger) |
| `cancel_reason` | `text` | | Motivo de cancelación |
| `cancelled_by` | `uuid` | `REFERENCES auth.users(id)` | Quién canceló |
| `created_at` | `timestamptz` | `DEFAULT now()` | |
| `updated_at` | `timestamptz` | `DEFAULT now()` | Actualizado por trigger |

**Índices:** `idx_orders_customer`, `idx_orders_courier`, `idx_orders_recipient`, `idx_orders_status`

**Triggers:** `update_orders_modtime`, `on_order_status_change`, `trg_generate_verification_code`

**RLS:** solo participantes (remitente, mensajero, destinatario) y admin pueden ver/actualizar.

---

### 3. `order_status_history`

Registro inmutable de cada cambio de estado de un pedido.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | `uuid` | `PK DEFAULT gen_random_uuid()` | |
| `order_id` | `uuid` | `NOT NULL REFERENCES orders(id) ON DELETE CASCADE` | Pedido asociado |
| `status` | `order_status` | `NOT NULL` | Estado registrado |
| `changed_by` | `uuid` | `REFERENCES auth.users(id)` | Usuario que provocó el cambio |
| `changed_at` | `timestamptz` | `DEFAULT now()` | Momento del cambio |
| `notes` | `text` | | Notas adicionales |

**Índices:** `idx_order_status_history_order`

**RLS:** Visible si el usuario tiene acceso al pedido.

---

### 4. `courier_locations`

Coordenadas GPS en tiempo real de los mensajeros.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | `uuid` | `PK DEFAULT gen_random_uuid()` | |
| `courier_id` | `uuid` | `NOT NULL REFERENCES profiles(id)` | Mensajero |
| `location` | `geography(Point,4326)` | `NOT NULL` | Ubicación actual |
| `accuracy_meters` | `real` | | Precisión del GPS |
| `speed_kmh` | `real` | | Velocidad |
| `heading` | `real` | | Dirección (0-360) |
| `battery_level` | `real` | | Batería |
| `timestamp` | `timestamptz` | `DEFAULT now()` | |

**Índices:** `idx_courier_locations_courier`, `idx_courier_locations_timestamp`

**RLS:** Lectura pública (autenticados), inserción solo por el propio mensajero.

---

### 5. `push_subscriptions`

Suscripciones para notificaciones Web Push.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | `uuid` | `PK DEFAULT gen_random_uuid()` | |
| `user_id` | `uuid` | `NOT NULL REFERENCES profiles(id) ON DELETE CASCADE` | |
| `endpoint` | `text` | `NOT NULL` | URL del navegador |
| `p256dh_key` | `text` | `NOT NULL` | Clave pública |
| `auth_key` | `text` | `NOT NULL` | Clave de autenticación |
| `device_type` | `text` | | Tipo de dispositivo |
| `created_at` | `timestamptz` | `DEFAULT now()` | |
| `updated_at` | `timestamptz` | `DEFAULT now()` | |

**RLS:** Solo el dueño gestiona sus suscripciones.

---

### 6. `ratings`

Evaluaciones entre usuarios tras un pedido.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | `uuid` | `PK DEFAULT gen_random_uuid()` | |
| `order_id` | `uuid` | `NOT NULL REFERENCES orders(id) ON DELETE CASCADE` | Pedido evaluado |
| `from_user_id` | `uuid` | `NOT NULL REFERENCES profiles(id)` | Quién evalúa |
| `to_user_id` | `uuid` | `NOT NULL REFERENCES profiles(id)` | Evaluado |
| `rating` | `smallint` | `CHECK (rating >= 1 AND rating <= 5)` | Puntuación |
| `tags` | `text[]` | | Etiquetas |
| `comment` | `text` | | Comentario |
| `created_at` | `timestamptz` | `DEFAULT now()` | |

**Restricción UNIQUE:** `(order_id, from_user_id)`

**Triggers:** `on_rating_created` actualiza reputación en `profiles`; `trg_check_rating_participants` verifica participantes.

**RLS:** Lectura pública, inserción solo por participantes del pedido entregado/devuelto.

---

### 7. `messages`

Chat interno por pedido entre los tres participantes.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | `uuid` | `PK DEFAULT gen_random_uuid()` | |
| `order_id` | `uuid` | `NOT NULL REFERENCES orders(id) ON DELETE CASCADE` | |
| `sender_id` | `uuid` | `NOT NULL REFERENCES profiles(id)` | Remitente del mensaje |
| `content` | `text` | `NOT NULL` | Texto |
| `attachment_url` | `text` | | Imagen adjunta (opcional) |
| `sent_at` | `timestamptz` | `DEFAULT now()` | |

**RLS:** Solo participantes pueden leer o escribir.

---

### 8. `returns`

Registro de devoluciones de pedidos no entregados.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | `uuid` | `PK DEFAULT gen_random_uuid()` | |
| `original_order_id` | `uuid` | `NOT NULL REFERENCES orders(id)` | Pedido original fallido |
| `return_status` | `return_status` | `DEFAULT 'initiated'` | Estado |
| `reason` | `text` | | Motivo de la devolución |
| `courier_id` | `uuid` | `REFERENCES profiles(id)` | Mensajero que la realiza |
| `created_at` | `timestamptz` | `DEFAULT now()` | |
| `completed_at` | `timestamptz` | | |

**RLS:** Acceso para participantes del pedido original, mensajero asignado y admin.

---

## ENUMs definidos

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

## Vistas

### `public_profiles`
Expone todas las columnas de `profiles` excepto las sensibles (`address`, `id_card_*`, `stripe_customer_id`). Se ejecuta con los privilegios del propietario, evitando RLS, pero solo se concede `SELECT` al rol `authenticated`.  
**Siempre debe usarse para listados de usuarios públicos** (búsqueda de mensajeros, etc.).

---

## Funciones auxiliares

- `update_modified_column()`: retorna un trigger que asigna `new.updated_at = now()`.

- **`nearby_couriers(pickup_lat, pickup_lng, max_distance_km, limit_count)`** (añadida 2026-05-11):  
  Devuelve los mensajeros disponibles más cercanos a un punto de recogida, usando PostGIS y la tabla `courier_locations`. Retorna `courier_id`, `full_name`, `avatar_url`, `rating_average`, `total_ratings`, `vehicle_type`, `max_package_size`, `max_weight_kg`, `price_per_km`, `distance_km`, `courier_lat` y `courier_lng`.  
  **Seguridad:** `SECURITY INVOKER` ejecuta con los permisos del usuario autenticado; usa la vista `public_profiles` para evitar exponer datos sensibles.

- **`get_user_id_by_email(user_email)`** (añadida 2026-05-11):  
  Devuelve el UUID de un usuario a partir de su email (solo usuarios confirmados).  
  **Seguridad:** `SECURITY DEFINER` con `search_path = ''` para acceder a `auth.users` de forma controlada. Permiso de ejecución concedido a `authenticated`.

---

## Triggers

1. `on_auth_user_created` (sobre `auth.users`): inserta automáticamente un perfil usando los metadatos del registro (`full_name`, `role`, `id_card_number`, `vehicle_type`, etc.).
2. `update_profiles_modtime` (profiles): actualiza `updated_at`.
3. `update_orders_modtime` (orders): actualiza `updated_at`.
4. `on_order_status_change` (orders): inserta historial y marca fechas de recogida/entrega/cancelación.
5. `trg_generate_verification_code` (orders): al pasar a `picked_up`, genera código de 6 dígitos.
6. `on_rating_created` (ratings): recalcula reputación.
7. `trg_check_rating_participants` (ratings): solo participantes del pedido.
8. `update_push_subs_modtime` (push_subscriptions): actualiza `updated_at`.