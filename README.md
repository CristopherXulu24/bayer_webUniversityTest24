# Farmacia Bayer — Sistema de Gestión Farmacéutica y Base de Datos B2B

Plataforma web para la administración integral de **Farmacia Bayer**, diseñada para controlar el ciclo completo de medicamentos desde su ingreso por lote e inspección de calidad hasta el almacenamiento en bodegas, la distribución corporativa B2B bajo el estándar **FEFO** (*First Expired, First Out*) y la trazabilidad sanitaria en tiempo real sobre **Oracle Database**.

---

## 1. Propósito como Sistema de Farmacia

El objetivo principal de la plataforma es garantizar que la operación farmacéutica cumpla simultáneamente con las reglas sanitarias, logísticas y financieras del sector:

- **Control de catálogo farmacéutico**: administración de medicamentos de venta libre (**OTC**) y de prescripción (**Éticos**), identificando aquellos que requieren **cadena de frío (2 °C a 8 °C)** para su conservación en bodegas especializadas.
- **Despacho inteligente por caducidad (FEFO)**: al procesar un pedido corporativo, el sistema asigna automáticamente los lotes **APROBADOS** cuya fecha de vencimiento está más próxima, evitando mermas por caducidad y bloqueando cualquier lote vencido o retenido.
- **Seguridad sanitaria y Recall inmediato**: ante una alerta de calidad sobre un lote específico, permite rastrear en segundos a qué farmacias, hospitales o distribuidores fue enviado (con número de orden y guía de despacho) y bloquear el lote de forma inmediata para impedir nuevas reservas o despachos.
- **Gestión de crédito B2B y facturación**: control del límite de crédito autorizado, saldo utilizado y crédito disponible de cada cliente institucional, aplicando descuentos escalonados por volumen (`3%`, `5%`, `8%`), impuestos (`12%`) y comisión de distribución (`2%`).

---

## 2. Propósito y Composición de la Base de Datos (Oracle Database)

El núcleo de datos está modelado en **Tercera Forma Normal (3FN)** sobre Oracle Database y expuesto a la interfaz mediante servicios REST (**ORDS**), asegurando integridad referencial, consistencia transaccional (**ACID**) y control de concurrencia.

### Entidades principales (12 tablas)
| Grupo | Tablas | Función dentro del modelo |
|---|---|---|
| **Catálogos base** | `PRODUCTO`, `CLIENTE_B2B`, `BODEGA` | Registro de medicamentos (código, línea, cadena de frío, precio, estado), clientes institucionales (NIT, tipo) y centros de almacenamiento (`PRINCIPAL`, `DISTRIBUCION`, `FRIO`, `CUARENTENA`). |
| **Calidad e inventario** | `LOTE`, `CONTROL_CALIDAD`, `INVENTARIO`, `TRAZABILIDAD` | Fechas de fabricación y caducidad por lote, dictámenes de inspección (`PENDIENTE`, `APROBADO`, `RECHAZADO`, `BLOQUEADO`, `VENCIDO`), existencias físicas y reservadas por bodega, y bitácora de movimientos (`ENTRADA`, `SALIDA`, `TRANSFERENCIA`). |
| **Operación B2B y finanzas** | `CREDITO_CLIENTE`, `ORDENB2B`, `DET_ORDEN`, `DESPACHO`, `DESPACHO_DETALLE` | Líneas de crédito por cliente, encabezados de orden con descuento/impuesto/comisión, desglose de lotes asignados y control de guías de despacho. |

### Lógica transaccional y procedimientos almacenados
- **`SP_CHECKOUT_B2B_FEFO`**: ejecuta el pedido B2B en una sola transacción atómica. Bloquea la línea de crédito del cliente (`FOR UPDATE`), calcula montos y descuentos por volumen, reserva inventario en orden de caducidad (`FEFO`) con bloqueo pesimista para evitar sobreventa entre sesiones simultáneas, revalida que Calidad no haya bloqueado ningún lote durante la operación y ejecuta `COMMIT` (o `ROLLBACK` total ante cualquier falta de stock o crédito).
- **`SP_CONFIRMAR_DESPACHO`**: convierte las unidades reservadas en salida física de inventario, genera el movimiento en `TRAZABILIDAD` y asigna la guía de despacho, validando previamente que ningún lote haya sido retenido.
- **`SP_BLOQUEAR_LOTE`**: cambia el estado de un lote a `BLOQUEADO` y registra el dictamen en `CONTROL_CALIDAD`, dejándolo fuera de circulación de forma inmediata.
- **`SP_RASTREO_RECALL_LOTE`**: reconstruye toda la ruta de un lote desde su entrada en planta hasta los clientes institucionales que lo recibieron.

---

## 3. Módulos que Componen la Página Web

La interfaz es completamente adaptativa (escritorio, tablet y celular), cuenta con soporte para **Modo oscuro** desde el panel de **Configuraciones** y se organiza en los siguientes módulos:

1. **Resumen**: panel de indicadores clave (productos activos, unidades disponibles, pedidos pendientes, lotes por caducar a 90 días y crédito utilizado), acompañado del inventario por bodega, alertas de vencimiento, órdenes por estado, top 10 de medicamentos solicitados y ventas mensuales.
2. **Medicamentos**: catálogo completo con filtros rápidos (`Activos`, `OTC`, `Éticos`, `Cadena de frío`), registro de nuevos medicamentos y edición directa de precio o estado desde cada fila.
3. **Clientes y bodegas**: administración de clientes corporativos B2B (con visualización de su línea de crédito) y centros de distribución.
4. **Lotes y calidad**: seguimiento de lotes ordenados por fecha de caducidad, alta de nuevos lotes y registro de inspecciones de Control de Calidad con actualización automática del estado del lote.
5. **Inventario**: consulta de stock físico, unidades reservadas y unidades disponibles por bodega y lote, con validación preventiva al registrar existencias iniciales.
6. **Trazabilidad y recall**: bitácora histórica de movimientos de inventario y buscador de recall sanitario por lote con opción de bloqueo preventivo inmediato.
7. **Pedidos B2B**: procesador de órdenes conectado a `SP_CHECKOUT_B2B_FEFO` con simulador previo en vivo (verifica viabilidad de crédito, stock aprobado, descuentos y lotes FEFO a reservar), historial de órdenes, detalle por lote y guías de despacho.
8. **Vencimientos FEFO**: matriz consolidada de unidades próximas a vencer por centro de distribución y ventana de riesgo (`Vencido`, `30`, `60`, `90` y `180 días`).
9. **Finanzas y crédito**: conciliación financiera detallada por orden (valor bruto, descuento, valor neto, IVA, comisión y total cargado al crédito) y estado de cuenta por cliente.
10. **Laboratorio ACID**: entorno de pruebas interactivo para verificar en vivo el control de concurrencia (dos compras simultáneas sobre el mismo lote sin sobreventa) y la recuperación ante fallos (`ROLLBACK` automático dejando intactos inventario y crédito).

---

## 4. Estructura del Proyecto

| Carpeta / Archivo | Función |
|---|---|
| `index.html` | Estructura principal de la aplicación, barra lateral de navegación, panel de configuraciones y contenedor de vistas. |
| `css/styles.css` | Estilos visuales, diseño adaptativo para celular (tablas tipo tarjeta y menú táctil) y variables de tema claro/oscuro. |
| `js/app.js` | Enrutador principal de módulos, control de estado de conexión, actualización de datos y preferencia de tema. |
| `js/config.js` | Configuración del endpoint base REST (`API_BASE`) conectado a Oracle APEX / ORDS. |
| `js/models/` | Capa de acceso a datos (`api.js`) con caché inteligente y respaldo SQL (`respaldo_sql.js`). |
| `js/views/ui.js` | Componentes visuales reutilizables: tablas adaptativas, tarjetas KPI, paneles desplegables (`expander`), filtros, iconos SVG y notificaciones. |
| `js/controllers/` | Lógica de presentación e interacción de cada uno de los 10 módulos del sistema. |
| `sql/01…09` | Scripts SQL de creación de tablas (`01`), vistas (`02`), procedimientos almacenados (`03`), carga de datos (`04`, `05`), pruebas (`06`–`08`) y publicación de la API REST en ORDS (`09`). |
