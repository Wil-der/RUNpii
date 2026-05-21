# Auditoría Técnica — RUNpii
**Equipo auditor:** Arquitecto de Software · Especialista en Seguridad · Ingeniero de Performance · Tech Lead · QA Lead  
**Fecha:** 2026-05-20  
**Versión analizada:** 1.0.0 (rama principal, último commit documentado: 2026-05-19)

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Seguridad](#2-seguridad)
3. [Arquitectura y diseño](#3-arquitectura-y-diseño)
4. [Calidad de código y deuda técnica](#4-calidad-de-código-y-deuda-técnica)
5. [Performance y optimización](#5-performance-y-optimización)
6. [Fiabilidad y manejo de errores](#6-fiabilidad-y-manejo-de-errores)
7. [Testing y QA](#7-testing-y-qa)
8. [Base de datos y acceso a datos](#8-base-de-datos-y-acceso-a-datos)
9. [UX y accesibilidad](#9-ux-y-accesibilidad)
10. [Infraestructura y DevOps](#10-infraestructura-y-devops)
11. [Plan de acción priorizado](#11-plan-de-acción-priorizado)

---

## 1. Resumen ejecutivo

RUNpii es una aplicación móvil Expo/React Native con backend Supabase para mensajería peer-to-peer. El proyecto tiene una base sólida: esquema de datos bien pensado, modularización razonable en hooks/componentes y flujos de negocio documentados. Sin embargo, la auditoría identifica **6 vulnerabilidades de seguridad críticas o altas**, **ausencia total de cobertura de tests**, y un conjunto de patrones que generarán deuda técnica significativa a medida que el producto escale.

**Puntuación por dimensión (1–10, siendo 10 el máximo):**

| Dimensión | Puntuación | Estado |
|---|---|---|
| Seguridad | 4/10 | 🔴 Crítico |
| Arquitectura | 6/10 | 🟡 Mejorable |
| Calidad de código | 5/10 | 🟡 Mejorable |
| Performance | 5/10 | 🟡 Mejorable |
| Fiabilidad / Error handling | 4/10 | 🔴 Crítico |
| Testing | 1/10 | 🔴 Crítico |
| Base de datos | 7/10 | 🟢 Aceptable |
| UX / Accesibilidad | 5/10 | 🟡 Mejorable |
| DevOps / Infraestructura | 4/10 | 🔴 Crítico |

---

## 2. Seguridad

### 2.1 🔴 CRÍTICO — Credenciales expuestas en el repositorio

**Archivos:** `.env`, `app.json`

```
# .env
EXPO_PUBLIC_SUPABASE_URL=https://zudoikaztozmhhbvaipf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# app.json → "extra" block
"SUPABASE_URL": "https://zudoikaztozmhhbvaipf.supabase.co",
"SUPABASE_ANON_KEY": "eyJhbGci..."
```

El archivo `.env` **no está en `.gitignore`** (el `.gitignore` sí incluye `.env*.local`, pero no `.env` a secas). La `anon key` está además duplicada en `app.json` dentro de la sección `extra`, que sí se sube al repositorio. Aunque la `anon key` de Supabase es pública por diseño, su exposición directa en el repositorio combinada con políticas RLS débiles es un vector de ataque. Adicionalmente, si en algún momento se comete por error la `service_role key`, el daño es irreversible.

**Riesgo real:** Si las RLS no son perfectas (ver secciones posteriores), cualquier persona con acceso al repositorio puede explotar la `anon key` contra la API de producción.

**Corrección:**
- Añadir `.env` a `.gitignore` de inmediato.
- Eliminar las credenciales de `app.json`; usar exclusivamente `EXPO_PUBLIC_*` en `.env` (que Expo inyecta automáticamente en builds de producción mediante EAS).
- Rotar la `anon key` en el dashboard de Supabase tras sanear el repositorio.
- Nunca incluir ninguna key en archivos versionados.

---

### 2.2 🔴 CRÍTICO — Verificación de rol basada en JWT de usuario (bypasseable)

**Archivo:** `documentacion/seguridad.md` / `hooks/useAdminDashboard.ts`

La documentación indica que el rol de admin se verifica así:

```sql
(auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
```

`user_metadata` en Supabase Auth es **completamente modificable por el propio usuario** mediante `supabase.auth.updateUser({ data: { role: 'admin' } })`. Cualquier usuario registrado puede escalarse a admin sin ninguna validación adicional.

**Corrección:**
- Almacenar el rol autoritativo únicamente en `app_metadata` (que solo puede escribir `service_role`) o en una tabla `roles` controlada por RLS estricta.
- En las Edge Functions y políticas RLS, leer `auth.jwt() -> 'app_metadata' ->> 'role'` en lugar de `user_metadata`.
- Actualizar el trigger `on_auth_user_created` para escribir en `app_metadata` usando `service_role`.

---

### 2.3 🔴 CRÍTICO — Falta de validación de input en Edge Functions

**Archivo:** `documentacion/edge-functions.md`

Las Edge Functions reciben parámetros (`order_id`, `courier_id`, `verification_code`, `photo_base64`) pero la especificación no documenta ninguna sanitización ni validación de tipo/formato. En particular:

- `photo_base64` puede ser una cadena arbitrariamente grande (potencial DoS o memory exhaustion en Deno).
- `verification_code` debería validarse como exactamente 6 dígitos numéricos antes de la consulta a BD.
- `order_id` y `courier_id` deben validarse como UUIDs v4 antes de usarlos en queries.

**Corrección:**
- Implementar validación estricta de esquema (p. ej. con `zod` o validación manual) al inicio de cada Edge Function.
- Limitar el tamaño máximo de `photo_base64` (p. ej. 2 MB).
- Rechazar con `400 Bad Request` cualquier parámetro malformado antes de tocar la base de datos.

---

### 2.4 🔴 ALTO — Credenciales almacenadas en texto plano en AsyncStorage

**Archivo:** `app/auth/login.tsx` (líneas de "Recuérdame")

```typescript
await AsyncStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, password }));
```

Las contraseñas se almacenan en texto plano en `AsyncStorage`, que en Android (sin cifrado de dispositivo) es legible por cualquier app con acceso root, herramientas de backup ADB, o si el dispositivo está comprometido.

**Corrección:**
- **Nunca** almacenar contraseñas. En su lugar, guardar únicamente el `refresh_token` de Supabase (que ya se gestiona de forma segura por el cliente).
- El comportamiento de "Recuérdame" debería limitarse a pre-rellenar el email (no la contraseña) o a persistir la sesión JWT (que Supabase ya hace automáticamente con `persistSession: true`).
- La funcionalidad "Recuérdame" tal como está implementada es, en realidad, redundante con `persistSession: true` ya activo.

---

### 2.5 🟠 ALTO — Ausencia de rate limiting en autenticación

**Archivo:** `app/auth/login.tsx`, `app/auth/register.tsx`

No hay ningún mecanismo de rate limiting en el lado del cliente para los intentos de login/registro. Supabase tiene un rate limiting básico en el servidor, pero el cliente debería implementar:
- Bloqueo temporal tras N intentos fallidos (p. ej. 5 intentos → 30 segundos de bloqueo).
- Indicador visual del intento número N.

**Corrección:**
- Implementar un contador de intentos con timestamp en `AsyncStorage` (esta sí es una información de baja sensibilidad).
- Deshabilitar el botón de login tras 5 intentos fallidos durante 30 segundos con contador visual.

---

### 2.6 🟠 ALTO — Verificación de participación en pedido para ratings no validada en cliente

**Archivo:** `app/(tabs)/rate.tsx`

La pantalla de valoración acepta `to_user_id` como parámetro de URL:

```typescript
const { order_id, to_user_id } = useLocalSearchParams<{ order_id: string; to_user_id: string }>();
```

Aunque el trigger `trg_check_rating_participants` debería bloquear ratings inválidos en BD, el cliente no valida que `to_user_id` corresponda realmente a un participante del pedido antes de hacer la petición. Un usuario malintencionado podría manipular la URL para intentar valorar a cualquier usuario con cualquier `order_id`.

**Corrección:**
- Antes de mostrar la pantalla, verificar en BD que `to_user_id` es efectivamente el mensajero o cliente de `order_id` y que el estado del pedido es correcto.
- No confiar en los parámetros de navegación como datos de negocio válidos.

---

### 2.7 🟡 MEDIO — Deep link de recuperación de contraseña sin validación de estado

**Archivo:** `app/auth/update-password.tsx`

```typescript
useEffect(() => {
  supabase.auth.onAuthStateChange((event) => {
    if (event !== 'PASSWORD_RECOVERY') {
      router.replace('/auth/login');
    }
  });
}, []);
```

El `onAuthStateChange` devuelve una función de cleanup que no se invoca (memory leak). Además, la redirección se produce en el primer evento que no sea `PASSWORD_RECOVERY`, lo que puede causar redirecciones prematuras si el cliente emite otros eventos antes del de recuperación.

**Corrección:**
- Guardar el retorno de `onAuthStateChange` y llamar a `.unsubscribe()` en el cleanup del `useEffect`.
- Usar un flag de estado para evitar redirecciones prematuras.

---

## 3. Arquitectura y diseño

### 3.1 🟠 ALTO — Lógica de negocio mezclada con UI en pantallas

**Archivos:** `app/(tabs)/order-detail.tsx`, `app/(tabs)/new-order.tsx`

`order-detail.tsx` tiene 380+ líneas mezclando: lógica de permisos de cámara, conversión base64, lógica de estado de entrega, renderizado condicional por rol, y gestión de modales. `new-order.tsx` contiene llamadas directas a `supabase.rpc()` y geocodificación en el propio componente.

**Impacto:** Imposibilita el testing unitario de la lógica de negocio, hace el componente difícilmente mantenible, y viola SRP (Single Responsibility Principle).

**Corrección:**
- Extraer toda la lógica de `new-order.tsx` a un hook `useNewOrder.ts`.
- La lógica de foto de entrega en `order-detail.tsx` debería ir a un hook `useDeliveryPhoto.ts`.
- Las pantallas deberían ser exclusivamente responsables de renderizado.

---

### 3.2 🟡 MEDIO — Duplicación de la función `getOtherParticipant`

**Archivos:** `app/(tabs)/active-chats.tsx`

```typescript
const getOtherParticipant = (order: any) => { ... }
```

Esta función se define dentro del componente, fuera del hook de datos, y opera sobre lógica de roles que también existe en `useOrders.ts` y `OrderListItem.tsx`. La lógica de "¿cuál es mi rol en este pedido?" aparece al menos 4 veces en el código.

**Corrección:**
- Crear una utilidad `utils/orderRoles.ts` con funciones puras: `getMyRoleInOrder(order, userId)`, `getOtherParticipantLabel(order, userId)`.

---

### 3.3 🟡 MEDIO — Navegación con `router.replace` inconsistente

Algunos flujos usan `router.replace` (correcto para evitar volver a pantallas intermedias), pero hay casos donde se usa `router.push` cuando debería ser `router.replace`, y viceversa. Ejemplos:

- `order-detail.tsx`: `router.replace('/(tabs)/explore')` al pulsar "atrás" — rompe el stack de navegación de forma inesperada.
- `new-order.tsx`: `router.replace({ pathname: '/(tabs)/select-courier', ... })` — correcto.
- `select-courier.tsx`: usa `router.replace` al navegar al detalle pero `router.back()` podría ser más apropiado en rechazo.

**Corrección:**
- Documentar y estandarizar la política de navegación: `push` para flujos hacia adelante, `replace` solo al final de flujos destructivos (crear pedido, login), `back()` para cancelaciones.

---

### 3.4 🟡 MEDIO — Ausencia de estado global / gestión de caché

No existe ninguna capa de caché o estado global. Cada pantalla hace sus propias queries independientes a Supabase, sin compartir datos entre ellas. El perfil del usuario se re-fetcha en múltiples hooks de forma independiente.

**Corrección a mediano plazo:**
- Evaluar la adopción de React Query / TanStack Query para caché de queries, invalidación automática y deduplicación de peticiones.
- O al menos centralizar el estado del perfil en un Context dedicado (separado de `useAuth`).

---

### 3.5 🟡 MEDIO — Tipado `any` excesivo

**Archivos:** `hooks/useOrders.ts`, `app/(tabs)/active-chats.tsx`, `hooks/useChat.ts`, múltiples

```typescript
const [orders, setOrders] = useState<any[]>([]);
// ...
const getOtherParticipant = (order: any) => {
// ...
.map((order: any) => ({
```

Se detectan más de 30 usos de `any` en el código fuente. Con los tipos de `types/supabase.ts` ya disponibles, esto es deuda técnica evitable.

**Corrección:**
- Activar `"noImplicitAny": true` en `tsconfig.json` y reemplazar progresivamente los `any` por los tipos de `Database['public']['Tables']`.
- En `useOrders.ts`: tipar como `Order[]` (ya disponible en `supabase-operations.ts`).

---

## 4. Calidad de código y deuda técnica

### 4.1 🟠 ALTO — Funciones vacías / lógica sin implementar en producción

**Archivo:** `app/(tabs)/profile.tsx`

```typescript
const handleSaveProfile = async () => {
  /* lógica existente */
};

const handleSwitchRole = () => {
  /* lógica existente */
};
```

Estas funciones tienen comentarios de placeholder pero **no contienen código**. El botón "Guardar cambios" del perfil y el cambio de rol son funcionalidades de UX críticas que no están implementadas.

**Impacto:** El usuario puede entrar en modo edición, cambiar datos, pulsar "Guardar" y no ocurre nada. Es un bug silencioso que genera desconfianza.

**Corrección:** Implementar o eliminar. Si están en progreso, lanzar un `showModal` de "Funcionalidad en desarrollo".

---

### 4.2 🟡 MEDIO — `console.log` y `console.error` en código de producción

**Archivos:** `lib/supabase.ts`, `lib/supabase-operations.ts`, `hooks/use-auth.ts`

```typescript
console.log('[Supabase] URL:', supabaseUrl ? 'set' : 'MISSING');
console.log('getProfile: fetching from profiles for userId:', userId);
console.log('getProfile: result', { data, error });
```

Estos logs de depuración pueden exponer información sensible (IDs de usuario, estructuras de respuesta) en consolas de producción accesibles por herramientas de debugging de dispositivos.

**Corrección:**
- Usar un logger condicional: `if (__DEV__) console.log(...)`.
- O adoptar una librería de logging (p. ej. `react-native-logs`) con niveles configurables por entorno.
- Eliminar los logs de `supabase-operations.ts` que imprimen datos de usuario.

---

### 4.3 🟡 MEDIO — Importación circular potencial en ModalContext

**Archivo:** `contexts/ModalContext.tsx`

```typescript
// Al final del archivo:
import AppModal from '@/components/AppModal';
```

La importación se coloca **al final del fichero**, fuera del orden convencional. Aunque TypeScript/bundler lo resuelve, es una señal de que el diseño tiene una dependencia cíclica latente (`ModalContext` → `AppModal` → potencialmente `useAppModal`). Si `AppModal` llegara a usar `useAppModal`, se crearía un ciclo real.

**Corrección:**
- Mover la importación al inicio del archivo.
- Considerar pasar `AppModal` como prop al `ModalProvider` en lugar de importarlo directamente, para invertir la dependencia.

---

### 4.4 🟡 MEDIO — Componente `OrderMap` referencia `Text` sin importarlo

**Archivo:** `components/OrderMap.tsx`

```typescript
// Imports:
import { StyleSheet, View, TouchableOpacity } from 'react-native';

// Uso:
<Text style={styles.fallbackText}>Mapa no disponible</Text>
```

`Text` se usa en el componente pero no está importado de `react-native`. Esto causará un crash en runtime en el caso del fallback (cuando `pickupCoords` o `deliveryCoords` son null).

**Corrección:**
```typescript
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
```

---

### 4.5 🟡 MEDIO — `useEffect` de autenticación en `update-password.tsx` sin cleanup

**Archivo:** `app/auth/update-password.tsx`

```typescript
useEffect(() => {
  supabase.auth.onAuthStateChange((event) => { ... });
}, []);
```

`onAuthStateChange` devuelve `{ data: { subscription } }`. Al no llamar `subscription.unsubscribe()` en el cleanup, se producen memory leaks y potencialmente callbacks ejecutados sobre componentes desmontados.

Este patrón se repite de forma correcta en `use-auth.ts` pero incorrectamente en `update-password.tsx`.

---

### 4.6 🟡 MEDIO — Componente `hello-wave.tsx` y utilidades heredadas sin uso

**Archivos:** `components/hello-wave.tsx`, `components/parallax-scroll-view.tsx`, `app/modal.tsx`

Estos archivos son el scaffolding inicial de Expo que no se ha eliminado. `app/modal.tsx` usa `ThemedText` y `ThemedView` que no tienen uso en el resto de la aplicación real.

**Corrección:**
- Eliminar: `components/hello-wave.tsx`, `components/parallax-scroll-view.tsx`, `app/modal.tsx` (si no se usa), `components/external-link.tsx`, `components/haptic-tab.tsx`.
- Evaluar si `ThemedText` y `ThemedView` se usan realmente; si no, eliminarlos también.

---

### 4.7 🟡 BAJO — Código muerto en `app/auth/register.tsx`

```typescript
if (avatarUri) {
  try {
    const response = await fetch(avatarUri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    // ← No se hace nada con arrayBuffer. La subida del avatar no está implementada.
  } catch (error) {
    console.error('Error uploading avatar:', error);
  }
}
```

Se obtiene el `arrayBuffer` pero nunca se sube. El avatar del registro es silenciosamente ignorado.

---

## 5. Performance y optimización

### 5.1 🟠 ALTO — N+1 queries en carga de mensajes del chat

**Archivo:** `hooks/useChat.ts`

```typescript
const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
const { data: profiles } = await supabase
  .from('public_profiles')
  .select('id, full_name')
  .in('id', senderIds);
```

Aunque se usa `IN` para evitar N queries, la carga inicial hace dos roundtrips secuenciales (mensajes → perfiles). En una sala con muchos mensajes esto es aceptable, pero la suscripción en tiempo real ejecuta una query adicional a `public_profiles` por **cada mensaje nuevo recibido individualmente**:

```typescript
// Por cada nuevo mensaje:
const { data: pd } = await supabase
  .from('public_profiles')
  .select('full_name')
  .eq('id', newMsg.sender_id)
  .single();
```

En una conversación activa con múltiples participantes, esto genera una query a BD por cada mensaje entrante.

**Corrección:**
- Cachear los perfiles de los participantes en el hook (un `Map<string, string>` en `useRef`).
- Solo consultar perfiles desconocidos; los ya cargados se recuperan del caché local.

---

### 5.2 🟠 ALTO — Suscripciones Realtime sin filtro eficiente

**Archivo:** `hooks/useOrders.ts`

```typescript
supabase.channel('orders-list')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'orders' },
    () => { loadOrders(true); }
  )
```

Esta suscripción escucha **todos los cambios en la tabla `orders`** globalmente, no solo los del usuario actual. Cualquier actualización de cualquier pedido en la plataforma dispara una recarga en el cliente de todos los usuarios conectados.

Lo mismo ocurre en `active-chats.tsx` con `active-chats-list`.

**Corrección:**
- Usar filtros en la suscripción Realtime:
```typescript
{ filter: `customer_id=eq.${user.id}` }
```
- O usar múltiples filtros con `or` si el usuario puede ser mensajero o destinatario.

---

### 5.3 🟡 MEDIO — Re-renders innecesarios por objetos inline en JSX

**Archivo:** `app/(tabs)/order-detail.tsx`, `app/(tabs)/select-courier.tsx`

Múltiples casos de objetos y arrays creados inline en el JSX:

```typescript
// Se recrea en cada render:
.in('status', ['assigned', 'picked_up', 'in_transit'])

// Arrays de chips recreados en cada render sin useMemo:
const primaryChips: { ... }[] = [];
const destructiveActions: { ... }[] = [];
```

Los arrays `primaryChips` y `destructiveActions` se reconstruyen completamente en cada render aunque las dependencias no cambien.

**Corrección:**
- Envolver con `useMemo` con las dependencias correctas (`order`, `profile`, `hasRated`).

---

### 5.4 🟡 MEDIO — `FlatList` sin `getItemLayout` ni `keyboardShouldPersistTaps`

**Archivos:** `app/(tabs)/chat.tsx`, `app/(tabs)/explore.tsx`

Las `FlatList` de mensajes y pedidos no especifican `getItemLayout`, lo que obliga al componente a medir cada ítem al hacer scroll. Para listas largas (historial de pedidos, chats) esto impacta el rendimiento de scroll.

**Corrección:**
- Si los ítems tienen altura fija, añadir `getItemLayout`.
- Añadir `windowSize`, `maxToRenderPerBatch`, `initialNumToRender` apropiados.
- En la FlatList del chat: `inverted` prop puede simplificar el auto-scroll al último mensaje.

---

### 5.5 🟡 BAJO — Heartbeat de last_seen cada 60 segundos sin debounce

**Archivo:** `hooks/use-auth.ts`

```typescript
await supabase.from('profiles').update({ last_seen: ... }).eq('id', profile.id);
```

El heartbeat actualiza `profiles` cada 60 segundos para mensajeros activos. Si la columna `last_seen` no existe en el schema documentado (no aparece en `types/supabase.ts`), esta query fallará silenciosamente. Además, no tiene tratamiento de errores y usa `update` directo (podría acumularse con otros updates del perfil).

**Corrección:**
- Verificar que `last_seen` existe en el schema o eliminarlo.
- Usar `upsert` en `courier_locations` como heartbeat de presencia (más semántico).

---

## 6. Fiabilidad y manejo de errores

### 6.1 🔴 CRÍTICO — Race condition en creación de pedido

**Archivo:** `app/(tabs)/new-order.tsx`

```typescript
const rpcPromise = supabase.rpc('get_user_id_by_email', { ... });
const timeoutPromise = new Promise<null>(r => setTimeout(() => r(null), 10000));
const result = await Promise.race([rpcPromise, timeoutPromise]);

if (!result || !result.data) {
  // Error: "Email no encontrado"
  setIsLoading(false);
  return;
}
```

Si `Promise.race` retorna el timeout (`null`), el código muestra "Email no encontrado o no verificado", que es incorrecto (el servidor simplemente tardó). No se distingue entre timeout y ausencia real del usuario.

Adicionalmente, si el componente se desmonta durante la espera de 10 segundos (usuario navega hacia atrás), el `setIsLoading(false)` se ejecuta sobre un componente desmontado, generando el warning de React Native "Can't perform a React state update on an unmounted component".

**Corrección:**
- Usar `AbortController` para cancelar la petición al desmontar.
- Distinguir errores de timeout vs. not found con mensajes distintos.
- Usar `useRef` para trackear si el componente está montado.

---

### 6.2 🟠 ALTO — Errores de Supabase ignorados silenciosamente

Varios lugares capturan errores pero no los reportan al usuario ni los loggan:

```typescript
// hooks/use-auth.ts
} catch (err) {
  console.error('Auth initialization error:', err);
  // ← El usuario ve la app cargando indefinidamente si esto falla
}

// hooks/useOrders.ts
} catch (error: any) {
  console.error('Error al cargar pedidos:', error.message);
  // ← No se muestra nada al usuario
}

// lib/supabase-operations.ts – heartbeat
} catch (error) {
  // Silencioso: si falla, el siguiente intento lo arregla
}
```

El fallo silencioso en `loadOrders` deja al usuario con una lista vacía sin saber si no tiene pedidos o si hubo un error de red.

**Corrección:**
- Implementar un estado de error (`error: string | null`) en los hooks principales.
- Mostrar un componente de error con botón de reintento cuando falle la carga de datos críticos.
- Definir qué errores son "silenciosos aceptables" (heartbeat) y cuáles requieren feedback (carga de pedidos).

---

### 6.3 🟠 ALTO — Falta de manejo de estado offline

La app no tiene ningún manejo de conectividad más allá de la disponibilidad del mensajero. Si el usuario pierde conexión mientras crea un pedido o envía un mensaje, la operación falla sin feedback adecuado y sin posibilidad de reintento.

**Corrección:**
- Usar `@react-native-community/netinfo` (ya instalado) para mostrar un banner de "Sin conexión" global.
- Implementar una cola de operaciones pendientes para mensajes de chat (al menos un indicador de "enviando...").

---

### 6.4 🟡 MEDIO — `confirmDelivery` en `useOrderDetail.ts` mezcla validación y acción

```typescript
const confirmDelivery = (code: string, photoBase64?: string) => {
  if (!code.trim()) {
    showModal({ ... });
    return;
  }
  handleAction('confirm-delivery', { ... });
};
```

La función `confirmDelivery` ya valida el código, pero `order-detail.tsx` también valida antes de llamarla:

```typescript
const handleDelivery = () => {
  if (!verificationCode.trim()) { showModal(...); return; }
  if (!deliveryPhotoBase64) { showModal(...); return; }
  confirmDelivery(verificationCode, deliveryPhotoBase64);
};
```

Doble validación inconsistente: `order-detail.tsx` valida la foto pero `useOrderDetail.ts` no. Si se llama `confirmDelivery` desde otro lugar sin foto, la Edge Function recibirá `photo_base64: null` sin advertencia.

**Corrección:**
- Centralizar toda la validación pre-entrega en el hook o toda en el componente, no en ambos.

---

### 6.5 🟡 MEDIO — Timeout hardcodeado de 10 segundos sin configuración

```typescript
const timeoutPromise = new Promise<null>(r => setTimeout(() => r(null), 10000));
```

El timeout de 10 segundos para la búsqueda de destinatario es un magic number sin justificación ni posibilidad de configuración por entorno. En condiciones de red lenta es insuficiente; en condiciones normales es excesivo.

**Corrección:**
- Definir constantes de timeout en un archivo `constants/api.ts`.
- Considerar valores distintos para dev/staging/production.

---

## 7. Testing y QA

### 7.1 🔴 CRÍTICO — Cobertura de tests: 0%

El repositorio no contiene ningún archivo de test. No hay configuración de Jest, ni tests unitarios, de integración o E2E. Con la complejidad del flujo de negocio (ciclo de vida de pedidos con 10 estados, sistema de verificación, lógica de roles), la ausencia de tests es el riesgo técnico más alto a largo plazo.

**Plan de implementación por prioridad:**

**Fase 1 — Tests unitarios de lógica crítica (semana 1–2):**
- `utils/orderRoles.ts` (a crear): lógica de roles en pedidos.
- `hooks/useSelectCourier.ts`: función `haversineDistance` y filtros.
- Validaciones de formularios en `new-order`, `login`, `register`.

**Fase 2 — Tests de integración con Supabase mock (semana 3–4):**
- Flujo completo de creación de pedido.
- Lógica de autenticación y redirección.

**Fase 3 — Tests E2E con Detox o Maestro (mes 2):**
- Flujo crítico: registro → crear pedido → asignar mensajero → entregar.

**Configuración mínima inmediata:**
```json
// package.json
"jest": {
  "preset": "jest-expo",
  "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"]
}
```

---

### 7.2 🟠 ALTO — Ausencia de validación de tipos en runtime para params de navegación

Los parámetros de navegación se pasan como strings a través de `useLocalSearchParams` sin ninguna validación:

```typescript
const { order_id, to_user_id } = useLocalSearchParams<{ order_id: string; to_user_id: string }>();
```

Si `order_id` es `undefined` (URL malformada, deeplink externo), las queries a BD fallan de formas no predecibles (queries con `undefined` como filtro pueden retornar resultados incorrectos).

**Corrección:**
- Validar parámetros requeridos al inicio del componente y mostrar error/redirigir si no son válidos.
- Crear un helper `parseRouteParam(param: string | string[] | undefined): string | null`.

---

### 7.3 🟡 MEDIO — Estados de carga inconsistentes entre pantallas

Algunas pantallas muestran `ActivityIndicator` durante la carga inicial (correcto), pero otras muestran la UI vacía momentáneamente antes de que lleguen los datos. No existe un skeleton/placeholder UI consistente.

**Corrección:**
- Definir un componente `SkeletonLoader` reutilizable.
- Estandarizar el patrón de carga: `loading=true` → skeleton, `loading=false, data=[]` → empty state, `loading=false, error` → error state.

---

## 8. Base de datos y acceso a datos

### 8.1 🟠 ALTO — Función `create_order` referenciada pero no documentada en el schema

**Archivo:** `app/(tabs)/new-order.tsx`

```typescript
const { data: orderId, error: createError } = await supabase.rpc('create_order', {
  p_customer_id: profile.id,
  p_recipient_id: recipientId,
  ...
});
```

La función `create_order` se invoca pero no aparece en `documentacion/base-de-datos.md`. Si esta función no existe en producción, el flujo de creación de pedidos falla completamente. La discrepancia entre documentación y código real es un riesgo operativo.

**Corrección:**
- Verificar la existencia de `create_order` en Supabase.
- Si no existe, crear la función o reemplazar la llamada RPC por un insert directo con las validaciones apropiadas.
- Documentar todas las funciones RPC utilizadas.

---

### 8.2 🟠 ALTO — Función `get_courier_location` referenciada sin documentación

**Archivo:** `hooks/useOrderDetail.ts`

```typescript
const { data: locData } = await supabase
  .rpc('get_courier_location', { p_courier_id: data.courier_id });
```

Misma situación: `get_courier_location` no aparece documentada en el schema. Si retorna error, `setCourierLocation(null)` silencia el fallo, pero el mapa no mostrará al mensajero.

---

### 8.3 🟡 MEDIO — Ausencia de paginación en listas de pedidos y mensajes

**Archivos:** `hooks/useOrders.ts`, `hooks/useChat.ts`

Todas las queries recuperan todos los registros sin límite ni paginación:

```typescript
const { data, error } = await supabase.from('orders').select('...')...
// Sin .limit() ni .range()
```

Para un usuario con historial extenso o una conversación larga, esto puede traducirse en respuestas de varios MB y timeouts.

**Corrección:**
- En `useOrders.ts`: usar `.range(0, 19)` para la primera página, implementar carga infinita o paginación.
- En `useChat.ts`: cargar los últimos 50 mensajes inicialmente, con carga de más al hacer scroll hacia arriba.

---

### 8.4 🟡 MEDIO — `public_profiles` vista usada de forma inconsistente

En algunos lugares se consulta `profiles` directamente y en otros `public_profiles`. Esto puede exponer datos sensibles si las políticas RLS cambian o si se comete un error:

- `hooks/useChat.ts`: usa `public_profiles` ✅
- `hooks/useAdminDashboard.ts`: usa `profiles` directamente ✅ (admin necesita más datos)
- `hooks/useAdminCouriers.ts`: usa `profiles` pero intenta obtener emails via `get_users_by_ids` (RPC no documentada)

**Corrección:**
- Documentar explícitamente cuándo usar cada vista/tabla.
- Asegurarse de que los hooks no-admin nunca consulten `profiles` directamente para datos de terceros.

---

### 8.5 🟡 BAJO — Coordenadas geográficas almacenadas como WKB y parseadas con RPC auxiliar

La necesidad de crear `get_order_for_map` y `get_courier_location` como funciones auxiliares para extraer coordenadas del formato WKB de PostGIS indica una fricción en el acceso a datos geoespaciales.

**Corrección a futuro:**
- Evaluar usar `ST_AsGeoJSON` o `ST_X/ST_Y` directamente en las queries select.
- O almacenar `pickup_lat/pickup_lng` como columnas numéricas adicionales (desnormalización deliberada para el acceso desde el cliente móvil).

---

## 9. UX y accesibilidad

### 9.1 🟡 MEDIO — Ausencia total de accesibilidad (a11y)

Ningún componente incluye props de accesibilidad (`accessibilityLabel`, `accessibilityRole`, `accessibilityHint`). Los botones de acción críticos (Aceptar pedido, Confirmar entrega) son inaccesibles para usuarios con TalkBack/VoiceOver.

**Corrección mínima:**
```typescript
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Aceptar pedido"
  accessibilityHint="Confirma que aceptas este pedido de entrega"
  ...
>
```

---

### 9.2 🟡 MEDIO — Código de verificación de 6 dígitos sin máscara visual clara

El código de verificación se muestra con `letterSpacing: 8` pero sin separadores visuales ni agrupación (p. ej. `123 456`). Para un código crítico de seguridad, la legibilidad es esencial.

**Corrección:**
- Mostrar el código con separador central: formatearlo como `${code.slice(0,3)} ${code.slice(3)}`.
- Añadir un botón de "Copiar al portapapeles".

---

### 9.3 🟡 BAJO — Mensajes de error genéricos

Los modales de error muestran mensajes técnicos de Supabase directamente al usuario:

```typescript
showModal({ title: 'Error', message: error.message, type: 'info' });
```

Los mensajes como "new row violates row-level security policy" o "duplicate key value violates unique constraint" son incomprensibles para usuarios finales.

**Corrección:**
- Crear un helper `humanizeError(error: PostgrestError): string` que mapee códigos de error de Supabase a mensajes amigables.

---

### 9.4 🟡 BAJO — Pantalla de inicio sin estado de carga de fuentes

**Archivo:** `app/_layout.tsx`

La app bloquea el renderizado mientras carga la autenticación (`if (loading) return null`), pero no existe un `SplashScreen.preventAutoHideAsync()` coordinado con la carga de fuentes Inter. Si las fuentes tardan en cargar, habrá un flash de texto sin fuente antes de que se muestren correctamente.

---

## 10. Infraestructura y DevOps

### 10.1 🔴 CRÍTICO — Ausencia de pipeline CI/CD

No existe ningún archivo de configuración de CI (`.github/workflows/`, `bitrise.yml`, `eas.json` para automatización, etc.). No hay:
- Linting automático en PRs.
- Checks de TypeScript.
- Build de verificación.
- Tests automatizados (aunque actualmente no existan).

**Corrección mínima — GitHub Actions:**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
```

---

### 10.2 🔴 CRÍTICO — Sin gestión de entornos (dev/staging/production)

Solo existe un proyecto Supabase. No hay separación entre entorno de desarrollo y producción. Cualquier error en desarrollo afecta directamente a datos de producción. No existe `eas.json` con perfiles de build por entorno.

**Corrección:**
- Crear un proyecto Supabase separado para desarrollo.
- Configurar `eas.json` con perfiles `development`, `preview` y `production`.
- Usar variables de entorno distintas por perfil EAS.

---

### 10.3 🟠 ALTO — `expire-assignments` depende de un servicio externo de cron

La función crítica de expiración de asignaciones depende de `cron-job.org` (servicio externo gratuito). Si este servicio falla o cambia sus términos, las asignaciones de mensajeros nunca expiran, bloqueando pedidos indefinidamente.

**Corrección:**
- Usar `pg_cron` (disponible en Supabase Pro) para ejecutar el cron directamente en la BD.
- O usar Supabase Edge Functions con el scheduler nativo de Supabase (disponible desde 2025).

---

### 10.4 🟡 MEDIO — Ausencia de monitorización y alertas

No hay integración con ninguna herramienta de observabilidad: Sentry, Datadog, LogRocket, ni siquiera el sistema de analíticas básico de Expo. Los errores en producción son invisibles.

**Corrección:**
- Integrar Sentry (`@sentry/react-native`) con captura automática de errores no manejados.
- Configurar alertas para: tasa de errores de Edge Functions > 1%, latencia de BD > 2s, suscripciones Realtime caídas.

---

### 10.5 🟡 MEDIO — Estrategia de backup y disaster recovery no documentada

No existe documentación sobre backup de la base de datos Supabase, política de retención, o procedimiento de restauración. El plan Supabase gratuito tiene backups limitados.

**Corrección:**
- Documentar la política de backups del plan contratado.
- Implementar exports programáticos de datos críticos (pedidos, perfiles) como backup adicional.
- Documentar el procedimiento de restauración.

---

## 11. Plan de acción priorizado

### Sprint 1 — Semana 1–2 (Críticos de seguridad)

| # | Acción | Responsable | Esfuerzo |
|---|--------|-------------|---------|
| 1 | Rotar credenciales Supabase + sanear `.gitignore` | DevOps | 2h |
| 2 | Migrar roles de `user_metadata` a `app_metadata` | Backend | 4h |
| 3 | Eliminar contraseñas de AsyncStorage en login "Recuérdame" | Frontend | 2h |
| 4 | Corregir import `Text` en `OrderMap.tsx` | Frontend | 15min |
| 5 | Implementar `handleSaveProfile` y `handleSwitchRole` en `profile.tsx` | Frontend | 4h |
| 6 | Cleanup de suscripción en `update-password.tsx` | Frontend | 30min |

### Sprint 2 — Semana 3–4 (Fiabilidad y errores)

| # | Acción | Responsable | Esfuerzo |
|---|--------|-------------|---------|
| 7 | Añadir estados de error visibles en hooks principales | Frontend | 8h |
| 8 | Validar y documentar funciones RPC (`create_order`, `get_courier_location`) | Backend | 4h |
| 9 | Filtrar suscripciones Realtime por usuario | Frontend | 3h |
| 10 | Cachear perfiles en `useChat` | Frontend | 2h |
| 11 | Validar parámetros de navegación en pantallas críticas | Frontend | 3h |
| 12 | Añadir validación de input en Edge Functions | Backend | 6h |

### Sprint 3 — Mes 2 (Calidad y DevOps)

| # | Acción | Responsable | Esfuerzo |
|---|--------|-------------|---------|
| 13 | Configurar CI/CD básico (GitHub Actions) | DevOps | 4h |
| 14 | Crear proyecto Supabase de staging | DevOps | 3h |
| 15 | Integrar Sentry | Frontend/DevOps | 4h |
| 16 | Escribir tests unitarios para lógica crítica | QA/Frontend | 16h |
| 17 | Implementar paginación en listas de pedidos y chat | Frontend | 8h |
| 18 | Eliminar archivos heredados de Expo scaffold | Frontend | 1h |
| 19 | Reemplazar `any` por tipos TypeScript correctos | Frontend | 8h |

### Sprint 4 — Mes 3 (Mejoras de producto)

| # | Acción | Responsable | Esfuerzo |
|---|--------|-------------|---------|
| 20 | Añadir etiquetas de accesibilidad en componentes críticos | Frontend | 6h |
| 21 | Migrar cron de expiración a pg_cron/Supabase Scheduler | Backend | 3h |
| 22 | Implementar manejo de estado offline con banner | Frontend | 4h |
| 23 | Crear helper `humanizeError` para mensajes de usuario | Frontend | 3h |
| 24 | Evaluar adopción de React Query para gestión de estado servidor | Arquitectura | 8h |

---

## Apéndice — Resumen de hallazgos por severidad

| Severidad | Cantidad | Dimensiones afectadas |
|---|---|---|
| 🔴 Crítico | 6 | Seguridad (3), Fiabilidad (1), Testing (1), DevOps (2) |
| 🟠 Alto | 10 | Seguridad (2), Arquitectura (1), Código (1), Performance (2), Fiabilidad (2), BD (2), DevOps (1) |
| 🟡 Medio / Bajo | 22 | Distribuidos en todas las dimensiones |
| **Total** | **38** | |

---

*Documento generado por auditoría técnica estática del repositorio. Se recomienda complementar con una revisión dinámica (pruebas en dispositivo físico) y una auditoría de las políticas RLS directamente en el dashboard de Supabase.*
