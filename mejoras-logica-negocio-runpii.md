# Mejoras de Lógica de Negocio — RUNpii
**Documento complementario a la auditoría técnica**  
**Fecha:** 2026-05-20

---

## Índice

1. [Sistema de precios dinámico](#1-sistema-de-precios-dinámico)
2. [Sistema de asignación automática de mensajeros](#2-sistema-de-asignación-automática-de-mensajeros)
3. [Niveles de reputación y beneficios](#3-niveles-de-reputación-y-beneficios)
4. [Seguro de envío opcional](#4-seguro-de-envío-opcional)
5. [Pedidos programados](#5-pedidos-programados)
6. [Sistema de disputas y mediación](#6-sistema-de-disputas-y-mediación)
7. [Wallet interno y modelo de comisiones](#7-wallet-interno-y-modelo-de-comisiones)
8. [Grupos de pedido y rutas compartidas](#8-grupos-de-pedido-y-rutas-compartidas)
9. [Verificación continua del mensajero](#9-verificación-continua-del-mensajero)
10. [Sistema de notificaciones inteligentes](#10-sistema-de-notificaciones-inteligentes)
11. [Política de cancelación mejorada](#11-política-de-cancelación-mejorada)
12. [Destinatario sin cuenta en RUNpii](#12-destinatario-sin-cuenta-en-runpii)

---

## 1. Sistema de precios dinámico

### Situación actual
El precio se calcula como `distancia_km × price_per_km` del mensajero. Es un modelo plano que no refleja la realidad operativa.

### Problema
- No considera el tamaño ni el peso del paquete en el precio final.
- No hay variación por hora del día (demanda alta en horas pico).
- Un paquete frágil cuesta lo mismo que uno normal.
- El mensajero puede poner cualquier `price_per_km` sin criterio.

### Mejora propuesta: precio por componentes

El precio final se calcularía así:

```
precio_base = distancia_total × tarifa_base_por_km
recargo_tamaño = { small: 0%, medium: 15%, large: 30%, extra_large: 50% }
recargo_peso = max(0, (peso_kg - 5) × 0.50)  ← sin recargo hasta 5 kg
recargo_fragilidad = 10% si is_fragile = true
recargo_demanda = 0–30% según hora del día y mensajeros disponibles
precio_total = precio_base × (1 + recargo_tamaño + recargo_fragilidad) + recargo_peso × recargo_demanda
```

**Recargo de demanda:** Si hay menos de 3 mensajeros disponibles en un radio de 10 km, se aplica un recargo automático del 10–30%. Si hay más de 10, se puede ofrecer un descuento del 5% para incentivar al cliente a elegir más rápido.

**Beneficio:** El cliente ve un precio transparente desglosado. El mensajero recibe más por trabajos más exigentes. La plataforma tiene mayor margen en horas pico.

**Cambios necesarios:**
- Nueva función SQL `calculate_order_price(params)` que devuelve el precio y el desglose.
- Mostrar desglose en la pantalla de selección de mensajero.
- Nueva tabla `pricing_config` editable por admins sin desplegar código.

---

## 2. Sistema de asignación automática de mensajeros

### Situación actual
El cliente debe revisar la lista de mensajeros manualmente y seleccionar uno. Si el mensajero rechaza, el cliente vuelve a empezar.

### Problema
- Genera fricción innecesaria para el cliente.
- Si los mensajeros cercanos están ocupados o no responden, el pedido puede quedar bloqueado durante mucho tiempo.
- El cliente no siempre sabe qué criterios usar para elegir.

### Mejora propuesta: modo "asignación rápida" opcional

Añadir un toggle en la creación del pedido: **"Asignación manual"** (actual) o **"Asignación rápida"** (nuevo).

En modo asignación rápida:
1. El sistema selecciona automáticamente al mensajero óptimo según un score:
   ```
   score = (0.4 × normalizar(1/distancia)) + (0.4 × normalizar(rating)) + (0.2 × normalizar(1/precio))
   ```
2. Lo notifica con 3 minutos para aceptar.
3. Si rechaza o expira, pasa automáticamente al segundo candidato, y así hasta 5 candidatos.
4. Si ninguno acepta, notifica al cliente y le ofrece cambiar a modo manual.

**Beneficio:** El cliente sin tiempo no necesita revisar listas. El tiempo medio hasta asignación baja de minutos a segundos en zonas con densidad de mensajeros.

**Cambios necesarios:**
- Campo `assignment_mode` en `orders` (`manual` / `auto`).
- Nueva Edge Function `auto-assign-courier` que implementa el algoritmo.
- Lógica de cascada en `expire-assignments` para pasar al siguiente candidato en modo auto.

---

## 3. Niveles de reputación y beneficios

### Situación actual
La reputación es un número (promedio de estrellas) y un contador. Todos los mensajeros son iguales para el sistema independientemente de su historial.

### Problema
- No hay incentivo para que los mensajeros mejoren su servicio más allá de las estrellas.
- Los clientes no distinguen entre un mensajero con 5 entregas y uno con 500.
- No hay fidelización de ningún tipo.

### Mejora propuesta: sistema de niveles para mensajeros

| Nivel | Nombre | Requisitos | Beneficios |
|-------|--------|------------|------------|
| 1 | Nuevo | 0–9 entregas | Sin beneficios adicionales |
| 2 | Fiable | 10+ entregas, rating ≥ 4.0 | Aparece primero en búsquedas iguales en precio |
| 3 | Experto | 50+ entregas, rating ≥ 4.5, < 5% cancelaciones | Badge visible, acceso a pedidos urgentes premium |
| 4 | Élite | 200+ entregas, rating ≥ 4.8, < 2% cancelaciones | Comisión de plataforma reducida (8% en vez de 10%), acceso prioritario en asignación automática |

**Para clientes:**
- Sistema de puntos: 1 punto por cada $1 gastado.
- 100 puntos = $5 de descuento en el siguiente pedido.
- Los puntos caducan a los 6 meses para incentivar uso frecuente.

**Cambios necesarios:**
- Campo `courier_level` en `profiles` (recalculado por trigger tras cada entrega).
- Campo `loyalty_points` en `profiles` para clientes.
- Tabla `loyalty_transactions` para auditoría de puntos.
- Mostrar nivel con badge en tarjetas de mensajero y en el perfil.

---

## 4. Seguro de envío opcional

### Situación actual
Si el paquete se pierde o daña, no existe ningún mecanismo de compensación en la plataforma. El cliente y el mensajero deben resolver el conflicto por fuera.

### Problema
- Para envíos de valor, el cliente no tiene garantías.
- Los mensajeros pueden verse en situaciones complicadas legalmente.
- La plataforma no tiene herramienta para gestionar estos casos.

### Mejora propuesta: seguro básico de envío

Al crear el pedido, el cliente puede declarar el valor del contenido y contratar un seguro:

| Tier | Cobertura | Coste adicional |
|------|-----------|-----------------|
| Sin seguro | $0 | $0 |
| Básico | Hasta $50 | +$1.00 |
| Estándar | Hasta $200 | +$2.50 |
| Premium | Hasta $500 | +$5.00 |

**Flujo en caso de incidencia:**
1. El cliente reporta el daño/pérdida desde la pantalla del pedido (con foto).
2. Se crea automáticamente una disputa en estado `under_review`.
3. El admin revisa la evidencia y aprueba o rechaza la compensación.
4. Si se aprueba, se descuenta del depósito de garantía del mensajero (ver sección 7).

**Cambios necesarios:**
- Campos `declared_value` e `insurance_tier` en `orders`.
- Tabla `insurance_claims` con evidencia fotográfica y estado de resolución.
- Integración futura con Stripe para cobrar la prima y gestionar reembolsos.

---

## 5. Pedidos programados

### Situación actual
Solo existen pedidos inmediatos. El cliente crea el pedido y espera que un mensajero lo acepte en ese momento.

### Problema
- El cliente no puede planificar envíos con antelación.
- Los mensajeros no pueden organizar su jornada laboral.
- En horas de baja demanda no hay mensajeros disponibles aunque el cliente sepa que los necesitará más tarde.

### Mejora propuesta: pedidos con fecha/hora programada

El cliente puede elegir entre **"Ahora"** o **"Programar"** al crear el pedido.

Si elige programar:
- Selecciona fecha y hora de recogida (mínimo 2 horas en el futuro, máximo 7 días).
- El pedido entra en estado `scheduled` (nuevo estado).
- 30 minutos antes de la hora programada, el sistema lanza automáticamente la búsqueda de mensajero (pasa a `pending`).
- El cliente recibe notificación de confirmación y otra 30 minutos antes.

**Beneficio para mensajeros:** Pueden ver pedidos programados cercanos en un calendario y "reservarlos" con antelación, garantizando trabajo.

**Cambios necesarios:**
- Nuevo estado `scheduled` en el ENUM `order_status`.
- Campo `scheduled_pickup_at` en `orders`.
- Edge Function `activate-scheduled-orders` ejecutada por cron cada 5 minutos.
- Vista de calendario en la app del mensajero.

---

## 6. Sistema de disputas y mediación

### Situación actual
No existe ningún mecanismo formal de disputas. Si hay un conflicto entre cliente y mensajero, no hay forma de resolverlo dentro de la plataforma.

### Problema
- Los conflictos se resuelven fuera de la app, sin trazabilidad.
- El admin no tiene herramientas para mediar.
- Los usuarios maliciosos pueden actuar sin consecuencias registradas.

### Mejora propuesta: flujo de disputas estructurado

**Motivos de disputa posibles:**
- Paquete dañado
- Paquete no entregado (el mensajero marcó como entregado pero el destinatario no lo recibió)
- Código de verificación aceptado pero paquete incorrecto
- Comportamiento inapropiado del mensajero o del cliente

**Flujo:**
1. Cualquier participante puede abrir una disputa desde el detalle del pedido (solo en estados finales o `delivery_failed`).
2. La disputa entra en estado `open`. Ambas partes tienen 48 horas para aportar evidencia (texto + fotos).
3. Pasadas las 48 horas (o antes si ambas partes acuerdan), el admin resuelve con una de estas opciones:
   - `resolved_for_client`: penalización al mensajero.
   - `resolved_for_courier`: disputa cerrada sin acción.
   - `resolved_partial`: compensación parcial.
4. La resolución afecta la reputación del responsable.

**Cambios necesarios:**
- Nueva tabla `disputes` con campos: `order_id`, `opened_by`, `reason`, `status`, `evidence_urls[]`, `resolution`, `resolved_by`, `resolved_at`.
- Nuevo panel en el admin para gestionar disputas abiertas.
- Notificaciones a ambas partes en cada cambio de estado.

---

## 7. Wallet interno y modelo de comisiones

### Situación actual
No hay sistema de pagos implementado. Todo queda para "integración futura con Stripe". Los mensajeros cobran en efectivo o fuera de la app.

### Problema
- La plataforma no puede cobrar su comisión del 10% si el pago es en efectivo.
- No hay garantía de pago para el mensajero.
- No existe mecanismo de depósito de garantía para cubrir disputas.

### Mejora propuesta: wallet por etapas

**Etapa 1 (sin Stripe) — Wallet de créditos:**
- Los clientes pueden recargar créditos mediante transferencia bancaria verificada manualmente por el admin.
- Los pagos de pedidos se descuentan del wallet del cliente.
- El mensajero acumula ganancias en su wallet.
- El admin puede aprobar retiros manualmente.

**Etapa 2 (con Stripe) — Automatizado:**
- Stripe Connect para pagos directos a mensajeros.
- El cliente paga al crear el pedido (o al confirmar la entrega).
- La comisión del 10% se retiene automáticamente.
- Los retiros del mensajero se procesan en D+1.

**Depósito de garantía del mensajero:**
- Al verificarse, el mensajero deposita una garantía de $20–$50 según el nivel.
- Esta garantía cubre compensaciones por disputas perdidas.
- Se devuelve si el mensajero da de baja su cuenta sin disputas pendientes.

**Cambios necesarios:**
- Tabla `wallets` con `user_id`, `balance`, `currency`.
- Tabla `wallet_transactions` para auditoría completa.
- Panel admin para aprobar recargas y retiros en Etapa 1.
- Integración Stripe Connect en Etapa 2.

---

## 8. Grupos de pedido y rutas compartidas

### Situación actual
Cada pedido es independiente. Un mensajero que va de la zona A a la zona B solo puede llevar un pedido a la vez.

### Problema
- Ineficiencia logística: el mensajero hace el mismo recorrido múltiples veces.
- Precios más altos para el cliente porque el costo del trayecto no se comparte.
- Mayor huella de carbono.

### Mejora propuesta: rutas compartidas (carpooling de paquetes)

Un mensajero puede indicar que su ruta admite hasta N paquetes simultáneos (según el vehículo).

**Para el cliente:**
- Al crear el pedido, puede optar por **"Envío exclusivo"** (actual) o **"Envío compartido"** (nuevo, precio -20%).
- En envío compartido, su paquete puede ir junto a otros en la misma ruta.

**Para el mensajero:**
- Ve en el mapa pedidos compatibles con su ruta actual (origen y destino dentro de un margen de desvío configurable, p.ej. +15% de distancia).
- Puede agrupar hasta 3 pedidos pequeños o 2 medianos en una sola salida.
- Cobra por cada pedido pero con un multiplicador de eficiencia: si lleva 3 pedidos, cobra 90% del precio de cada uno (gana más que con uno solo).

**Cambios necesarios:**
- Campo `allow_shared_delivery` en `orders`.
- Campo `max_simultaneous_orders` en `profiles` del mensajero.
- Tabla `order_groups` para agrupar pedidos en una misma ruta.
- Lógica de compatibilidad geográfica para sugerir agrupaciones.

---

## 9. Verificación continua del mensajero

### Situación actual
La verificación es un proceso puntual: el mensajero sube los documentos una vez y el admin los aprueba. No hay revisiones posteriores.

### Problema
- Un mensajero aprobado puede cambiar de comportamiento sin consecuencias hasta que alguien lo reporte.
- Los documentos de identidad tienen fecha de caducidad.
- No hay detección de patrones de mal comportamiento.

### Mejora propuesta: verificación continua por indicadores

**Revisión automática de indicadores cada semana:**

| Indicador | Umbral de alerta | Acción automática |
|-----------|-----------------|-------------------|
| Rating promedio (últimas 10 entregas) | < 3.5 | Notificación al mensajero + revisión admin |
| Tasa de cancelación | > 15% en 30 días | Suspensión temporal 48h |
| Disputas perdidas | 2 en 30 días | Revisión obligatoria |
| Sin actividad | > 90 días | Estado cambia a `inactive`, notificación |
| Código verificación fallido | > 10% de entregas | Alerta admin |

**Renovación de documentos:**
- Campo `id_card_expiry_date` en `profiles`.
- 30 días antes del vencimiento, notificación al mensajero para renovar.
- Al vencer, el mensajero pasa a `verification_status = 'pending'` automáticamente hasta renovar.

**Cambios necesarios:**
- Campo `id_card_expiry_date` en `profiles`.
- Edge Function `monitor-courier-metrics` ejecutada semanalmente.
- Tabla `courier_warnings` para registro de alertas y acciones tomadas.
- Panel admin con lista de mensajeros en estado de alerta.

---

## 10. Sistema de notificaciones inteligentes

### Situación actual
Las notificaciones push están estructuradas pero son básicas: se envían en puntos fijos del ciclo de vida del pedido.

### Problema
- El cliente no sabe dónde está el mensajero durante el trayecto.
- Las notificaciones son genéricas y no contextuales.
- No hay forma de silenciar notificaciones ni configurar preferencias.

### Mejora propuesta: notificaciones contextuales y configurables

**Nuevos eventos de notificación:**
- "El mensajero está a 10 minutos de tu ubicación de recogida" (basado en GPS).
- "El mensajero está a 5 minutos de entregar tu paquete" (para el destinatario).
- "Han pasado 2 horas desde que se creó tu pedido y no tienes mensajero aún — ¿quieres buscar de nuevo?"
- "Tu nivel ha subido a Experto 🎉" (para mensajeros).
- "Tienes 3 pedidos disponibles en tu zona ahora mismo" (para mensajeros disponibles).

**Preferencias de notificación por usuario:**
- Tabla `notification_preferences` con flags por tipo de evento.
- Opción de recibir resumen diario en lugar de notificaciones individuales.
- Horario de no molestar configurable.

**Cambios necesarios:**
- Tabla `notification_preferences` con `user_id`, `event_type`, `enabled`, `channel` (push/email).
- Lógica de distancia en tiempo real en la Edge Function de ubicación del mensajero.
- Templates de notificación por idioma (ya hay `preferred_language` en `profiles`).

---

## 11. Política de cancelación mejorada

### Situación actual
La política de cancelación tiene penalización del 50% si hay mensajero implicado, pero no está implementada técnicamente (solo documentada como "cuando Stripe esté integrado").

### Problema
- Sin penalización real, los clientes pueden cancelar libremente incluso con el mensajero en camino.
- Los mensajeros no tienen protección económica por cancelaciones tardías.
- No hay distinción entre cancelación "razonable" e "irresponsable".

### Mejora propuesta: política de cancelación por ventanas de tiempo

| Momento de cancelación | Penalización al cliente | Compensación al mensajero |
|----------------------|------------------------|--------------------------|
| Estado `pending` (sin mensajero) | Sin penalización | N/A |
| Estado `awaiting_courier` (mensajero notificado, no aceptó aún) | Sin penalización | N/A |
| Estado `assigned` (mensajero aceptó, aún no recogió) | 25% del precio estimado | 15% al mensajero, 10% a la plataforma |
| Estado `picked_up` (mensajero tiene el paquete) | No se puede cancelar unilateralmente — requiere apertura de disputa | — |

**Cancelación por parte del mensajero:**
- Antes de recoger: permitida sin penalización (el pedido vuelve a `pending`).
- Después de recoger: solo permitida por causa mayor (requiere evidencia). Penalización de reputación automática.

**Cambios necesarios:**
- Implementar el cálculo y registro de penalización en `cancel-order` Edge Function.
- Deducir penalización del wallet del cliente (cuando exista) o registrarla como deuda.
- Mostrar al cliente el importe de la penalización antes de confirmar la cancelación.

---

## 12. Destinatario sin cuenta en RUNpii

### Situación actual
El destinatario debe tener una cuenta en RUNpii para poder recibir un pedido. Esto limita enormemente el caso de uso real de la plataforma.

### Problema
- El cliente no puede enviar a alguien que no esté registrado.
- El proceso de registro solo para recibir un paquete tiene mucha fricción.
- Reduce drásticamente el universo de envíos posibles.

### Mejora propuesta: destinatario por número de teléfono o email sin registro

**Flujo para destinatario sin cuenta:**
1. El cliente introduce el número de teléfono (o email) del destinatario al crear el pedido.
2. El sistema busca si existe cuenta. Si no existe, crea un perfil temporal (`guest_recipient`).
3. El destinatario recibe un SMS/email con:
   - Descripción del paquete que va a recibir.
   - Un código de verificación de 6 dígitos para entregar al mensajero.
   - Un link para ver el estado del pedido sin necesidad de registrarse (token de acceso temporal).
4. Opcionalmente, el link invita a crear una cuenta para futuros envíos.

**Código de verificación para destinatarios sin cuenta:**
- Se genera en el momento de crear el pedido (no al recoger).
- Se envía por SMS usando Twilio o similar.
- El destinatario no necesita abrir la app para obtenerlo.

**Cambios necesarios:**
- Campo `recipient_type` en `orders`: `registered` / `guest`.
- Campo `recipient_phone` en `orders` para destinatarios guest.
- Tabla `guest_access_tokens` para acceso temporal sin cuenta.
- Integración con servicio de SMS (Twilio, AWS SNS).
- Página web pública (sin autenticación) para ver el estado del pedido con token.

---

## Resumen de impacto estimado

| Mejora | Impacto en usuario | Impacto en negocio | Complejidad |
|--------|-------------------|-------------------|-------------|
| Precios dinámicos | 🟡 Medio | 🟢 Alto | Media |
| Asignación automática | 🟢 Alto | 🟢 Alto | Alta |
| Niveles de reputación | 🟡 Medio | 🟢 Alto | Media |
| Seguro de envío | 🟢 Alto | 🟢 Alto | Media |
| Pedidos programados | 🟢 Alto | 🟡 Medio | Media |
| Sistema de disputas | 🟢 Alto | 🟢 Alto | Media |
| Wallet interno | 🟡 Medio | 🔴 Crítico | Alta |
| Rutas compartidas | 🟡 Medio | 🟡 Medio | Muy alta |
| Verificación continua | 🟡 Medio | 🟢 Alto | Baja |
| Notificaciones inteligentes | 🟢 Alto | 🟡 Medio | Media |
| Política cancelación | 🟡 Medio | 🟢 Alto | Baja |
| Destinatario sin cuenta | 🔴 Crítico | 🔴 Crítico | Media |

---

*La mejora con mayor retorno inmediato es el **destinatario sin cuenta**: elimina la barrera de entrada más grande del producto. La segunda prioridad es el **sistema de disputas**, porque protege la confianza en la plataforma. El **wallet interno** es el prerequisito para que el modelo de negocio sea sostenible.*
