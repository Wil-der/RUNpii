# 📦 RUNpii – Plataforma de Mensajería Colaborativa

RUNpii conecta remitentes, mensajeros verificados y destinatarios en una red de envíos peer‑to‑peer con verificación de identidad, selección manual de mensajero, chat interno, doble verificación de entrega, gestión de devoluciones y un sistema de reputación avanzado. Todo ello sobre una base de datos PostgreSQL con seguridad a nivel de fila (RLS) y sin un solo servidor que administrar.

## Tech Stack

- **Backend‑as‑a‑Service:** Supabase (PostgreSQL 15 + PostGIS, Autenticación JWT, API REST autogenerada, Realtime, Edge Functions con Deno/TypeScript)
- **Frontend (previsto):** Next.js (React) + `@supabase/supabase-js`
- **Pagos (futuro):** Stripe
- **Notificaciones:** Web Push (estructura preparada en BD)

## Estado actual

✅ Base de datos completa y asegurada  
✅ Políticas RLS, triggers y vistas implementadas  
⬜ Edge Functions – próximo paso  
⬜ Frontend – por implementar  

## Documentación

Toda la documentación del proyecto está en /documentacion. Cada documento cubre un área específica para que puedas consultar solo lo que necesitas:

| Documento | Descripción |
|-----------|-------------|
| [base-de-datos.md](documentacion/base-de-datos.md) | Esquema detallado de todas las tablas, ENUMs, vistas, funciones y triggers de la base de datos. La referencia técnica del modelo de datos. |
| [seguridad.md](documentacion/seguridad.md) | Explicación de la seguridad implementada con Row Level Security, roles de usuario, protección de datos sensibles y pautas para usar service_role. |
| [flujos-de-negocio.md](documentacion/flujos-de-negocio.md) | Todos los procesos de la plataforma: verificación, ciclo de vida del pedido, entrega, chat, reputación, cancelaciones y devoluciones. Con diagramas. |
| [edge-functions.md](documentacion/edge-functions.md) | Especificación de cada Edge Function: endpoints, lógica, parámetros, uso de service_role y manejo de errores. La hoja de ruta para implementarlas. |
| [guia-desarrollo.md](documentacion/guia-desarrollo.md) | Cómo preparar el entorno, variables necesarias, CLI de Supabase, y flujo de trabajo básico. Para empezar a desarrollar. |
| [estilo-visual.md](documentacion/estilo-visual.md) | Identidad visual minimalista: paleta de colores, tipografías, iconos, principios de UX. Mantiene la interfaz coherente. |
| [convenciones-codigo.md](documentacion/convenciones-codigo.md) | Estándares de código, linter, estructura de carpetas y pautas para contribuir. |
| [CHANGELOG.md](documentacion/CHANGELOG.md) | Registro de cambios importantes en la documentación. |
