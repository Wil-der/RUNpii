# Convenciones de código

**Última actualización:** 2026-05-09 

Mantener un código limpio y consistente es clave. Estas son las reglas para RUNpii.

## General

- Todo el código está en **TypeScript** (strict mode recomendado).
- Indentación: 2 espacios.
- Comillas simples (`'`) para strings.
- Punto y coma al final de cada declaración.
- Nombres de archivos en kebab-case (`select-courier.ts`).

## Edge Functions (Deno)

- Cada función en su carpeta con `index.ts`.
- Usar `deno fmt` para formatear automáticamente.
- Importar desde `https://deno.land/x/...` o npm specifiers.
- Variables de entorno con `Deno.env.get()`.
- Manejar errores con respuestas HTTP adecuadas y mensajes descriptivos.

## Frontend (Next.js, futuro)

- Usar ESLint con la configuración de Next.js y Prettier para formateo.
- Componentes funcionales, hooks, y si es necesario estado global con React Context.
- Estilos con Tailwind CSS (si se decide) o CSS Modules siguiendo la guía visual.
- Nombres de componentes en PascalCase.

## Estructura de carpetas (frontend tentativo)

```
src/
  components/      # Componentes reutilizables
  pages/           # Rutas de Next.js
  hooks/           # Custom hooks
  utils/           # Funciones de ayuda
  styles/          # Estilos globales
```

## Nombrado de ramas

- `feature/nombre-corto` para nuevas funcionalidades.
- `fix/descripcion` para correcciones.
- `docs/lo-que-sea` para cambios en documentación.

## Commits

Seguir [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: añadida búsqueda de mensajeros`
- `fix: corregido cálculo de distancia`
- `docs: actualizada guía de desarrollo`

## Pruebas

(Agregar cuando se implementen tests)
