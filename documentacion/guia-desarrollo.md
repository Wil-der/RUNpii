## 📄 `documentacion/guia-desarrollo.md`

```markdown
# Guía de desarrollo

**Última actualización:** 2026-05-19

Este documento te permite levantar el proyecto RUNpii en local y empezar a desarrollar.

## Prerrequisitos

- Node.js 18+
- Git
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm i -g supabase` o `npx supabase`)
- (Para Edge Functions) Deno instalado o confiar en el runtime local de Supabase.
- **Dispositivo móvil o emulador** (Android/iOS) con [Expo Go](https://expo.dev/client) instalado.

## Configuración inicial

1. Clona el repositorio y accede a la carpeta.
2. Instala las dependencias del proyecto Expo:
   ```bash
   npm install
   ```
3. Instala las dependencias nativas requeridas:
   ```bash
   npx expo install expo-location react-native-maps expo-image-picker @expo/vector-icons @expo-google-fonts/inter react-native-safe-area-context expo-image-manipulator @react-native-async-storage/async-storage
   ```
4. Vincula el proyecto remoto de Supabase (necesitas el `project-ref`):
   ```bash
   supabase login
   supabase link --project-ref <tu-project-ref>
   ```
5. Crea un archivo `.env` local con las variables necesarias (no se sube al repo):
   ```env
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=ey...
   ```

## Estructura del proyecto

```
/
├── supabase/
│   ├── functions/      # Edge Functions (cada una en su carpeta)
│   └── migrations/     # Migraciones de base de datos (si se usan)
├── app/                # Rutas y pantallas (Expo Router)
│   ├── (tabs)/         # Pantallas principales con navegación por pestañas
│   └── auth/           # Autenticación (login, registro, verificación)
├── components/         # Componentes reutilizables
├── hooks/              # Hooks personalizados (useAuth, etc.)
├── lib/                # Cliente de Supabase y operaciones
├── documentacion/      # Documentación del proyecto
└── app.json            # Configuración de Expo
```

## Iniciar la aplicación móvil

```bash
npx expo start
```

Esto abrirá Metro Bundler. Escanea el código QR con **Expo Go** en tu dispositivo Android/iOS, o presiona `a` para emulador Android / `i` para simulador iOS.

Para limpiar la caché:
```bash
npx expo start -c
```

## Desarrollo de Edge Functions

- Las funciones se encuentran en `supabase/functions/<nombre>/index.ts`.
- Para servir localmente:
  ```bash
  supabase functions serve
  ```
- Para probar una función, usa `curl` o herramientas como Postman apuntando a `http://localhost:54321/functions/v1/<nombre>`.
- Las funciones usan `Deno.env.get('SUPABASE_URL')` y `SUPABASE_SERVICE_ROLE_KEY`. En local, se toman del archivo `.env`.

## Despliegue

- Desplegar una función:
  ```bash
  supabase functions deploy <nombre>
  ```
- También puedes desplegar directamente desde el Dashboard de Supabase (Edge Functions > Create).
- Para producción, asegúrate de configurar las variables de entorno en el dashboard de Supabase (Settings > Edge Functions).

## Migraciones de base de datos

Actualmente la base de datos se ha creado manualmente a través del SQL. Para cambios futuros se recomienda usar migraciones de Supabase CLI:
```bash
supabase db diff -f <nombre_migracion>
supabase db push
```

Esto mantendrá un historial reproducible.

## Datos de prueba

Para probar el flujo completo necesitas al menos dos usuarios (cliente y mensajero). Ejecuta el siguiente script SQL en el Editor SQL de Supabase:

1. Convierte un usuario existente en mensajero aprobado y activo:
   ```sql
   UPDATE public.profiles
   SET role = 'courier', verification_status = 'approved', is_active = true,
       availability_status = 'available', vehicle_type = 'motorcycle',
       max_package_size = 'large', max_weight_kg = 50, price_per_km = 5.5
   WHERE id = '<UUID_DEL_USUARIO>';
   ```

2. Añade una ubicación simulada para el mensajero:
   ```sql
   INSERT INTO public.courier_locations (courier_id, location)
   VALUES ('<UUID_DEL_MENSAJERO>', ST_SetSRID(ST_MakePoint(-82.3885, 23.0645), 4326)::geography);
   ```

3. Crea otro usuario como destinatario (desde Authentication > Add User, marcando "Auto Confirm"). Luego inserta su perfil:
   ```sql
   INSERT INTO public.profiles (id, full_name, role)
   VALUES ('<UUID_DEL_DESTINATARIO>', 'Destinatario Test', 'customer')
   ON CONFLICT (id) DO UPDATE SET full_name = 'Destinatario Test', role = 'customer';
   ```

## Modularización del código

Para mantener el código mantenible, cada funcionalidad se divide en:

- **hooks/** → lógica de negocio y estado (ej. `useChat.ts`, `useSelectCourier.ts`).
- **components/** → componentes visuales reutilizables (ej. `ChatMessage.tsx`, `CourierCard.tsx`).
- **app/** → pantallas que orquestan hooks y componentes.

Las notificaciones y confirmaciones usan `useAppModal` en lugar de `Alert.alert` para mantener un estilo visual coherente.

## Compresión de imágenes

Antes de subir a Supabase Storage, se usa `expo-image-manipulator` con los siguientes parámetros:

| Uso | Ancho máximo | Calidad | Formato |
|-----|-------------|---------|---------|
| Avatar | 512 px | 0.7 | JPEG |
| Documentos | 2048 px | 0.8 | JPEG |
| Chat | 1024 px | 0.7 | JPEG |
| Entrega (futuro) | 1280 px | 0.75 | JPEG |

## Variables de entorno

- `SUPABASE_URL`: URL del proyecto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio para operaciones elevadas.
- `CRON_SECRET`: (opcional) Secreto para proteger el endpoint `expire-assignments` en cron-job.org.

## Flujo de trabajo recomendado

1. Crear una rama por feature/fix.
2. Desarrollar y probar localmente las Edge Functions y la app móvil.
3. Ejecutar migraciones si hay cambios en la BD.
4. Desplegar funciones a staging (recomendable un proyecto de desarrollo separado).
5. Hacer PR y revisar.
6. Tras merge, desplegar a producción.

Para más detalles sobre convenciones de código, consulta [convenciones-codigo.md](convenciones-codigo.md).
