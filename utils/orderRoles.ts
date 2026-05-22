// utils/orderRoles.ts

/**
 * Devuelve la etiqueta del rol que el usuario actual tiene en el pedido.
 */
export function getMyRoleLabel(
  order: { customer_id: string; courier_id: string | null; recipient_id: string },
  userId: string | undefined,
): string {
  if (!userId) return '';
  if (order.customer_id === userId) return 'Enviado';
  if (order.courier_id === userId) return 'Transportado';
  if (order.recipient_id === userId) return 'Recibido';
  return '';
}

/**
 * Devuelve una etiqueta descriptiva del otro participante (para usar en chats, etc.).
 */
export function getOtherParticipantLabel(
  order: { customer_id: string; courier_id: string | null; recipient_id: string },
  userId: string | undefined,
): string {
  if (!userId) return 'Desconocido';
  if (order.customer_id === userId) {
    return order.courier_id ? 'Mensajero' : 'Destinatario';
  }
  if (order.courier_id === userId) return 'Cliente';
  if (order.recipient_id === userId) return 'Cliente';
  return 'Desconocido';
}