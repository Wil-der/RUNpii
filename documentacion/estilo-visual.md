# Estilo visual de RUNpii

**Última actualización:** 2026-05-09 

La interfaz de RUNpii sigue una estética **minimalista** que transmite confianza, rapidez y modernidad. Esta guía garantiza que cualquier desarrollador mantenga la coherencia visual.

## Paleta de colores

| Uso | Color | Código |
|-----|-------|--------|
| **Primario** | Amarillo vibrante | `#F7C925` |
| **Fondo principal** | Blanco | `#FFFFFF` |
| **Texto principal** | Negro suave | `#1A1A1A` |
| **Texto secundario** | Gris medio | `#6B7280` |
| **Superficies** | Gris muy claro | `#F9FAFB` |
| **Bordes** | Gris claro | `#E5E7EB` |
| **Éxito** | Verde | `#10B981` |
| **Error** | Rojo | `#EF4444` |
| **Advertencia** | Naranja | `#F59E0B` |

El amarillo (`#F7C925`) se usa para botones principales, iconos destacados y elementos interactivos. El blanco domina los fondos para dar limpieza.

## Tipografía

- **Fuente principal:** [Inter](https://fonts.google.com/specimen/Inter) (sans-serif). Cargar pesos 400, 500 y 700.
- **Tamaños:**
  - Títulos de página: 2rem (32px)
  - Subtítulos: 1.25rem (20px)
  - Texto base: 1rem (16px)
  - Texto pequeño: 0.875rem (14px)
- Altura de línea: 1.5 para párrafos.

## Iconografía

Utilizar [Lucide Icons](https://lucide.dev/) (trazo fino, minimalista). Tamaño estándar 24px. Para iconos más pequeños, 20px.

## Componentes clave

- **Botones primarios:** fondo `#F7C925`, texto `#1A1A1A`, bordes redondeados (8px), sombra suave en hover.
- **Tarjetas:** fondo blanco, borde `#E5E7EB`, borderRadius 12px, sombra 0 1px 3px rgba(0,0,0,0.1).
- **Inputs:** borde `#E5E7EB`, foco con borde `#F7C925`.
- **Estados vacíos:** ilustraciones lineales sencillas (usar `undraw.co` con color `#F7C925`).

## Principios UX

1. **Simplicidad:** Cada pantalla tiene una sola acción principal.
2. **Feedback inmediato:** Microinteracciones y loaders en cada acción asíncrona.
3. **Accesibilidad:** Contraste mínimo AA (texto sobre fondo blanco nunca baja de 4.5:1). Todos los elementos interactivos tienen estados focus visibles.
4. **Mobile first:** Diseñar primero para pantallas pequeñas (375px) y luego escalar.
5. **Consistencia:** Reutilizar componentes en lugar de duplicar estilos.

## Diseño de referencia

Aún no hay prototipo en Figma, pero se puede arrancar con una estructura limpia tipo dashboard/lista. La pantalla principal del remitente sería una lista de pedidos, y la del mensajero un mapa con pedidos cercanos.

Cualquier nuevo componente debe respetar esta guía. Si necesitas modificar algo, abre un debate para mantener la coherencia.
