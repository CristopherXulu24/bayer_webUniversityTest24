# Bayer, Inc. · Gestión B2B (GitHub Pages + Oracle APEX)

Front estático (HTML/CSS/JS, módulos ES) que consume una API REST (ORDS) sobre la base Oracle del proyecto.

## Arquitectura (MVC)
| Capa | Carpeta | Responsabilidad |
|------|---------|-----------------|
| Modelo | `js/models/api.js` | Único acceso a la API REST (GET paginado, POST) |
| Vista | `js/views/ui.js`, `css/` | HTML puro: tablas, formularios, tarjetas |
| Controlador | `js/controllers/*.js`, `js/app.js` | Un controlador por módulo y enrutador por `#hash` |
| Datos | `sql/01…09` | Esquema, vistas, procedimientos, datos y API REST |

## Puesta en marcha
1. En APEX (SQL Scripts) corre `sql/01` a `sql/05` y luego `sql/09_rest_ords.sql`.
2. Copia la Base URL del módulo `bayer` (SQL Workshop > RESTful Services) en `js/config.js`.
3. `python tools/probar_api.py <BASE_URL>` para verificar los endpoints.
4. Vista previa local: `python -m http.server 8000` y abre http://localhost:8000 (los módulos ES no cargan con `file://`).
5. Publica: sube el contenido de esta carpeta a un repositorio y activa Settings > Pages.
6. Cuando funcione, cambia `v_origen` en `09_rest_ords.sql` a `https://USUARIO.github.io` y vuelve a ejecutarlo.

## Notas
- Los scripts `06` y `07` (concurrencia y crash) se corren en SQL Commands; la pestaña **Laboratorio** hace lo mismo desde la web (requiere el PASO 0 de `06`).
- API pública sin autenticación: válida para la demo académica, no para producción.
