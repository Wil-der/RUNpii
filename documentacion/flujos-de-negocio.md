
---

## 📄 `flujos-de-negocio.md` actualizado

```markdown
# Flujos de negocio

**Última actualización:** 2026-05-11

## 1. Verificación de mensajero

1. Usuario se registra con rol `courier`. Sus metadatos (`full_name`, `role`, `id_card_number`, `vehicle_type`) son insertados en `profiles` automáticamente por el trigger `on_auth_user_created`.
2. Desde la pantalla de perfil, el mensajero puede subir fotos del carnet (anverso y reverso) mediante la cámara. Las imágenes se almacenan en el bucket `id_docs`.
3. Su `verification_status` es `pending`. No puede activarse.
4. Un admin (rol `admin`) revisa los documentos desde un panel de administración (futuro).
   - Si aprueba, cambia a `approved`, fija `verified_by` y `verified_at`.
   - Si rechaza, `rejected`.
5. Con `approved`, el mensajero puede poner `is_active = true` (switch en su perfil) y su `availability_status` pasa a `available`.

## 2. Ciclo de vida de un pedido

```mermaid
stateDiagram-v2
    [*] --> pending : Cliente crea pedido
    pending --> awaiting_courier : Cliente selecciona mensajero
    awaiting_courier --> assigned : Mensajero acepta (en 5 min)
    awaiting_courier --> pending : Expira tiempo / rechazo
    assigned --> picked_up : Mensajero recoge paquete
    picked_up --> in_transit : En camino
    in_transit --> delivered : Código correcto + foto
    in_transit --> delivery_failed : Error código o ausencia
    delivery_failed --> returning : Inicia devolución
    returning --> returned : Devuelto a remitente
    pending --> cancelled : Cancelación (sin mensajero)
    awaiting_courier --> cancelled : Cancelación con penalización
    assigned --> cancelled : Cancelación con penalización