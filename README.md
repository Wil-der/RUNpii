# 📦 RUNpii: Mensajería Colaborativa con Supabase y Web Push Nativo

Plataforma progresiva (PWA) que conecta remitentes con mensajeros cercanos en tiempo real, asignando automáticamente el repartidor más próximo y notificándole al instante mediante **notificaciones push nativas** del navegador, sin servicios de terceros como Firebase.

> **Objetivo:** Desarrollar un MVP completamente *serverless* y gratuito usando Supabase como backend, con notificaciones web push estándar enviadas directamente desde Edge Functions.

## ✨ Características principales

- **Asignación automática por proximidad**: el mensajero activo más cercano al punto de recogida recibe el pedido.
- **Notificaciones push nativas (Web Push)**: sin dependencia de FCM ni servicios externos. Las Edge Functions envían la notificación directamente al navegador del mensajero.
- **Experiencia multiplataforma como PWA**: instalable en escritorio y móvil (Android + iOS), con acceso a geolocalización y notificaciones.
- **Tiempo real**: seguimiento del estado del envío y ubicación del mensajero con las suscripciones en tiempo real de Supabase.
- **Seguro y escalable desde el inicio**: Row Level Security (RLS) en PostgreSQL, perfiles de usuario, y lógica de negocio desacoplada en funciones serverless.
- **Cero costes de infraestructura** en etapa de demostración: Supabase Spark, Vercel/Netlify, OpenStreetMap y Web Push API son completamente gratuitos dentro de sus generosos límites.

## 🏗️ Stack tecnológico

| Componente          | Tecnología                           | Función                                                                 |
| ------------------- | ------------------------------------ | ----------------------------------------------------------------------- |
| **Backend**         | [Supabase](https://supabase.com)     | Autenticación, base de datos PostgreSQL + PostGIS, Edge Functions, Realtime, Storage |
| **Base de datos**   | PostgreSQL + PostGIS                 | Almacenamiento de datos, índices geoespaciales, consultas de proximidad |
| **Notificaciones**  | Web Push API + `web-push` (Edge Fn)  | Envío de notificaciones sin terceros                                    |
| **Frontend**        | React + Vite + Leaflet               | PWA con mapas interactivos y actualizaciones en tiempo real             |
| **Mapas**           | OpenStreetMap (teselas gratuitas)    | Visualización y selección de ubicaciones                                |
| **Despliegue**      | Vercel / Netlify                     | Hosting estático del frontend                                           |

## 🧠 Arquitectura resumida

1. Un **remitente** crea una solicitud de envío indicando origen y destino en el mapa.
2. La solicitud se guarda en `solicitudes` y dispara una **Edge Function** (`asignar-mensajero`).
3. La función consulta PostgreSQL con PostGIS para encontrar al **mensajero activo más cercano** y actualiza la solicitud.
4. La misma Edge Function recupera la **suscripción push** del mensajero y envía una notificación usando la librería `web-push` (protocolo estándar, claves VAPID).
5. El **Service Worker** del mensajero recibe la notificación y la muestra. Al hacer clic, la PWA se abre en los detalles del pedido.
6. Durante la entrega, el estado se actualiza y se comparte en **tiempo real** con el remitente mediante los canales de Supabase Realtime.

## 📁 Estructura del proyecto (prevista)

```text
/
├── public/                 # Iconos PWA, manifiesto
├── src/
│   ├── components/         # Componentes reutilizables
│   ├── pages/              # Vistas principales (login, panel remitente, panel mensajero)
│   ├── services/           # Cliente Supabase y funciones auxiliares
│   ├── hooks/              # Hooks personalizados (ubicación, notificaciones, auth)
│   └── sw.ts               # Service Worker para notificaciones push
├── supabase/
│   ├── migrations/         # Migraciones SQL (tablas, políticas, índices)
│   └── functions/          # Edge Functions (asignar-mensajero, gestionar-suscripcion)
├── .env.example            # Variables de entorno de ejemplo
└── README.md
