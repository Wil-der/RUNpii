// utils/humanizeError.ts

/**
 * Traduce mensajes de error técnicos de Supabase a un lenguaje amigable.
 */
export function humanizeError(error: any): string {
  const rawMessage: string = error?.message ?? error?.toString() ?? 'Error desconocido';

  const patterns: [RegExp, string][] = [
    [/duplicate key value violates unique constraint/i, 'Ya existe un registro con esos datos.'],
    [/new row violates row-level security policy/i, 'No tienes permiso para realizar esta acción.'],
    [/permission denied for table/i, 'No tienes acceso a esa información.'],
    [/auth session missing/i, 'Tu sesión ha expirado. Inicia sesión nuevamente.'],
    [/Email not confirmed/i, 'Debes verificar tu email antes de continuar.'],
    [/invalid login credentials/i, 'Email o contraseña incorrectos.'],
    [/JWT expired/i, 'Tu sesión ha expirado. Vuelve a iniciar sesión.'],
    [/network request failed/i, 'Error de conexión. Verifica tu internet.'],
    [/timeout of \d+ms exceeded/i, 'El servidor tardó demasiado en responder. Inténtalo de nuevo.'],
    [/could not find the function/i, 'Servicio no disponible en este momento.'],
    [/edge function returned a non-2xx status code/i, 'El servicio no pudo procesar tu solicitud.'],
    [/Could not find the function/i, 'Servicio no disponible en este momento.'],
    [/cancelled/i, 'La operación fue cancelada.'],
    [/aborted/i, 'La operación fue cancelada.'],
    [/body/i, 'El formato de los datos enviados no es válido.'],
  ];

  for (const [regex, friendly] of patterns) {
    if (regex.test(rawMessage)) {
      return friendly;
    }
  }

  if (rawMessage.length < 100 && !rawMessage.includes('{') && !rawMessage.includes('[')) {
    return rawMessage;
  }

  return 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.';
}