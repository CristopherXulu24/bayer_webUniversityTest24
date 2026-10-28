-- ============================================================
-- 02. VISTAS Y REPORTES  (ejecutar despues de 01_esquema.sql)
-- ============================================================

-- VISTA 1: Catalogo de productos
CREATE OR REPLACE VIEW vw_productos AS
SELECT
    id_producto,
    cod_producto,
    nombre,
    linea,
    cadena_frio,
    estado,
    precio_unitario
FROM producto;

-- VISTA 2: Clientes B2B
CREATE OR REPLACE VIEW vw_clientes_b2b AS
SELECT
    id_clienteb2b,
    cod_clienteb2b,
    nombre,
    nit,
    tipo_cliente
FROM cliente_b2b;

-- VISTA 3: Lotes y productos
CREATE OR REPLACE VIEW vw_lotes_productos AS
SELECT
    l.id_lote,
    l.numero_lote,
    p.cod_producto,
    p.nombre AS producto,
    l.fecha_fabricacion,
    l.fecha_caducidad,
    l.estado_lote
FROM lote l
INNER JOIN producto p
    ON l.id_producto = p.id_producto;

-- VISTA 4: Inventario por bodega
CREATE OR REPLACE VIEW vw_inventario_bodega AS
SELECT
    i.id_inventario,
    b.nombre AS bodega,
    b.ubicacion,
    l.numero_lote,
    l.estado_lote,
    l.fecha_caducidad,
    p.nombre AS producto,
    i.stock,
    i.reservas,
    i.stock - i.reservas AS disponible
FROM inventario i
INNER JOIN bodega b
    ON i.id_bodega = b.id_bodega
INNER JOIN lote l
    ON i.id_lote = l.id_lote
INNER JOIN producto p
    ON l.id_producto = p.id_producto;

-- VISTA 5: Resultados de control de calidad
CREATE OR REPLACE VIEW vw_control_calidad AS
SELECT
    cc.id_control_calidad,
    l.numero_lote,
    p.nombre AS producto,
    cc.fecha_inspeccion,
    cc.resultado,
    cc.representante,
    cc.observaciones
FROM control_calidad cc
INNER JOIN lote l
    ON cc.id_lote = l.id_lote
INNER JOIN producto p
    ON l.id_producto = p.id_producto;

-- VISTA 6: Pedidos con informacion del cliente
CREATE OR REPLACE VIEW vw_ordenes_clientes AS
SELECT
    o.id_orden,
    o.numero_orden,
    o.fecha_orden,
    o.estado,
    c.cod_clienteb2b,
    c.nombre AS cliente,
    o.descuento,
    o.impuesto,
    o.comision_pct
FROM ordenb2b o
INNER JOIN cliente_b2b c
    ON o.id_clienteb2b = c.id_clienteb2b;

-- VISTA 7: Detalle de los pedidos
CREATE OR REPLACE VIEW vw_detalle_ordenes AS
SELECT
    o.numero_orden,
    c.nombre AS cliente,
    p.nombre AS producto,
    l.numero_lote,
    d.cantidad_solicitada,
    d.precio_unitario,
    d.subtotal
FROM det_orden d
INNER JOIN ordenb2b o
    ON d.id_orden = o.id_orden
INNER JOIN cliente_b2b c
    ON o.id_clienteb2b = c.id_clienteb2b
INNER JOIN lote l
    ON d.id_lote = l.id_lote
INNER JOIN producto p
    ON l.id_producto = p.id_producto;

-- VISTA 8: Despachos y guias
CREATE OR REPLACE VIEW vw_despachos AS
SELECT
    de.id_despacho,
    de.numero_guia,
    de.fecha_despacho,
    de.estado AS estado_despacho,
    b.nombre AS bodega_origen,
    o.numero_orden,
    c.nombre AS cliente
FROM despacho de
INNER JOIN bodega b
    ON de.id_bodega = b.id_bodega
INNER JOIN ordenb2b o
    ON de.id_orden = o.id_orden
INNER JOIN cliente_b2b c
    ON o.id_clienteb2b = c.id_clienteb2b;

-- VISTA 9: Credito y saldo disponible
CREATE OR REPLACE VIEW vw_credito_clientes AS
SELECT
    c.cod_clienteb2b,
    c.nombre AS cliente,
    cr.limite_credito,
    cr.saldo_utilizado,
    cr.limite_credito - cr.saldo_utilizado
        AS credito_disponible
FROM credito_cliente cr
INNER JOIN cliente_b2b c
    ON cr.id_clienteb2b = c.id_clienteb2b;

-- VISTA 10: Historial de movimientos
CREATE OR REPLACE VIEW vw_trazabilidad_lotes AS
SELECT
    t.id_trazabilidad,
    l.numero_lote,
    p.nombre AS producto,
    t.tipo_movimiento,
    t.fecha_movimiento,
    t.cantidad,
    t.referencia,
    bo.nombre AS bodega_origen,
    bd.nombre AS bodega_destino
FROM trazabilidad t
INNER JOIN lote l
    ON t.id_lote = l.id_lote
INNER JOIN producto p
    ON l.id_producto = p.id_producto
LEFT JOIN bodega bo
    ON t.id_bodega_origen = bo.id_bodega
LEFT JOIN bodega bd
    ON t.id_bodega_destino = bd.id_bodega;

-- VISTA 11: Resumen de pedidos por estado
CREATE OR REPLACE VIEW vw_resumen_ordenes AS
SELECT
    estado,
    COUNT(*) AS total_ordenes
FROM ordenb2b
GROUP BY estado;

-- VISTA 12: Productos con mayor cantidad solicitada
CREATE OR REPLACE VIEW vw_productos_mas_solicitados AS
SELECT
    p.id_producto,
    p.cod_producto,
    p.nombre AS producto,
    SUM(d.cantidad_solicitada) AS unidades_solicitadas
FROM det_orden d
INNER JOIN lote l
    ON d.id_lote = l.id_lote
INNER JOIN producto p
    ON l.id_producto = p.id_producto
GROUP BY
    p.id_producto,
    p.cod_producto,
    p.nombre;

-- VISTA 13: Lotes proximos a caducar (90 dias)
CREATE OR REPLACE VIEW vw_lotes_por_caducar AS
SELECT
    l.numero_lote,
    p.nombre AS producto,
    l.fecha_caducidad,
    l.estado_lote
FROM lote l
INNER JOIN producto p
    ON l.id_producto = p.id_producto
WHERE l.fecha_caducidad BETWEEN TRUNC(SYSDATE)
                            AND TRUNC(SYSDATE) + 90;

-- VISTA 14: Pedidos y estado de despacho
CREATE OR REPLACE VIEW vw_estado_despacho_orden AS
SELECT
    o.numero_orden,
    c.nombre AS cliente,
    o.estado AS estado_orden,
    de.numero_guia,
    de.estado AS estado_despacho,
    de.fecha_despacho
FROM ordenb2b o
INNER JOIN cliente_b2b c
    ON o.id_clienteb2b = c.id_clienteb2b
LEFT JOIN despacho de
    ON o.id_orden = de.id_orden;


-- ============================================================
-- VISTA 15 (RF-04): ALERTA TEMPRANA DE VENCIMIENTOS POR CENTRO
-- Ventanas: 30 / 60 / 90 / 180 dias.  Corrige la version original,
-- que dejaba ventana NULL en lotes ya vencidos.
-- ============================================================

CREATE OR REPLACE VIEW vw_alerta_vencimientos_fefo AS
SELECT
    b.nombre AS centro_distribucion,
    p.nombre AS producto,
    l.numero_lote,
    l.estado_lote,
    l.fecha_caducidad,
    TRUNC(l.fecha_caducidad) - TRUNC(SYSDATE) AS dias_para_vencer,
    i.stock AS stock_fisico,
    (i.stock - i.reservas) AS stock_disponible,
    CASE
        WHEN TRUNC(l.fecha_caducidad) < TRUNC(SYSDATE)
            THEN 'VENCIDO'
        WHEN TRUNC(l.fecha_caducidad) <= TRUNC(SYSDATE) + 30
            THEN '30 DIAS (CRITICO)'
        WHEN TRUNC(l.fecha_caducidad) <= TRUNC(SYSDATE) + 60
            THEN '60 DIAS (ALTO)'
        WHEN TRUNC(l.fecha_caducidad) <= TRUNC(SYSDATE) + 90
            THEN '90 DIAS (MEDIO)'
        ELSE '180 DIAS (BAJO)'
    END AS ventana_vencimiento
FROM inventario i
INNER JOIN lote l ON i.id_lote = l.id_lote
INNER JOIN producto p ON l.id_producto = p.id_producto
INNER JOIN bodega b ON i.id_bodega = b.id_bodega
WHERE TRUNC(l.fecha_caducidad) <= TRUNC(SYSDATE) + 180
  AND l.estado_lote IN ('APROBADO', 'VENCIDO')
  AND i.stock > 0;

-- VISTA 16 (RF-04): VOLUMEN POR VENCER, CONSOLIDADO POR CENTRO Y VENTANA
CREATE OR REPLACE VIEW vw_resumen_vencimientos AS
SELECT
    centro_distribucion,
    ventana_vencimiento,
    COUNT(*) AS lotes,
    SUM(stock_fisico) AS unidades_fisicas,
    SUM(stock_disponible) AS unidades_disponibles
FROM vw_alerta_vencimientos_fefo
GROUP BY centro_distribucion, ventana_vencimiento;

-- VISTA 17 (RF-05): CONCILIACION FINANCIERA POR ORDEN
-- valor bruto - descuento por volumen = valor neto
-- + impuesto + comision de distribucion = total que afecta el credito
CREATE OR REPLACE VIEW vw_conciliacion_financiera AS
SELECT
    x.numero_orden,
    x.fecha_orden,
    x.estado,
    x.cliente,
    x.valor_bruto,
    x.descuento,
    x.valor_bruto - x.descuento AS valor_neto,
    ROUND((x.valor_bruto - x.descuento) * x.impuesto / 100, 2)
        AS monto_impuesto,
    ROUND((x.valor_bruto - x.descuento) * x.comision_pct / 100, 2)
        AS comision_distribucion,
    ROUND((x.valor_bruto - x.descuento)
          * (1 + (x.impuesto + x.comision_pct) / 100), 2)
        AS total_orden,
    x.limite_credito,
    x.saldo_utilizado,
    x.limite_credito - x.saldo_utilizado AS credito_disponible
FROM (
    SELECT
        o.numero_orden,
        o.fecha_orden,
        o.estado,
        c.nombre AS cliente,
        SUM(d.subtotal) AS valor_bruto,
        o.descuento,
        o.impuesto,
        o.comision_pct,
        cr.limite_credito,
        cr.saldo_utilizado
    FROM ordenb2b o
    INNER JOIN cliente_b2b c
        ON o.id_clienteb2b = c.id_clienteb2b
    INNER JOIN credito_cliente cr
        ON cr.id_clienteb2b = c.id_clienteb2b
    INNER JOIN det_orden d
        ON d.id_orden = o.id_orden
    GROUP BY
        o.numero_orden, o.fecha_orden, o.estado, c.nombre,
        o.descuento, o.impuesto, o.comision_pct,
        cr.limite_credito, cr.saldo_utilizado
) x;

-- VISTA 18 (RF-03): LOTE -> CLIENTES A LOS QUE SE DISTRIBUYO
CREATE OR REPLACE VIEW vw_recall_lote AS
SELECT
    l.numero_lote,
    l.estado_lote,
    p.nombre AS producto,
    l.fecha_fabricacion,
    l.fecha_caducidad,
    c.nombre AS cliente_institucional,
    c.nit,
    o.numero_orden,
    o.fecha_orden,
    d.cantidad_solicitada AS cantidad,
    de.numero_guia,
    de.estado AS estado_despacho,
    de.fecha_despacho
FROM det_orden d
INNER JOIN lote l ON d.id_lote = l.id_lote
INNER JOIN producto p ON l.id_producto = p.id_producto
INNER JOIN ordenb2b o ON d.id_orden = o.id_orden
INNER JOIN cliente_b2b c ON o.id_clienteb2b = c.id_clienteb2b
LEFT JOIN despacho de ON de.id_orden = o.id_orden
WHERE o.estado <> 'CANCELADA';

-- VISTA 19: ANALITICA DE VENTAS MENSUALES POR PRODUCTO
CREATE OR REPLACE VIEW vw_ventas_mensuales AS
SELECT
    TRUNC(o.fecha_orden, 'MM') AS mes,
    p.nombre AS producto,
    p.linea,
    SUM(d.cantidad_solicitada) AS unidades,
    SUM(d.subtotal) AS venta_bruta
FROM det_orden d
INNER JOIN ordenb2b o ON d.id_orden = o.id_orden
INNER JOIN lote l ON d.id_lote = l.id_lote
INNER JOIN producto p ON l.id_producto = p.id_producto
WHERE o.estado <> 'CANCELADA'
GROUP BY TRUNC(o.fecha_orden, 'MM'), p.nombre, p.linea;
