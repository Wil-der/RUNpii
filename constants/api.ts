// constants/api.ts
// Tiempos de espera para peticiones de red (en milisegundos)
export const API_TIMEOUTS = {
  /** Tiempo máximo para buscar un destinatario por email */
  FIND_RECIPIENT: 10000,
  /** Tiempo máximo para geocodificación inversa (Nominatim) */
  REVERSE_GEOCODE: 5000,
} as const;