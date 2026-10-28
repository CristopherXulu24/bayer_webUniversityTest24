-- ============================================================
-- 08. REPORTES SANITARIOS Y ANALITICA (RF-03, RF-04, RF-05)
-- ============================================================

-- ------------------------------------------------------------
-- RF-04: ALERTA TEMPRANA DE VENCIMIENTOS (30 / 60 / 90 / 180 dias)
-- ------------------------------------------------------------
-- Consolidado por centro de distribucion y ventana
SELECT centro_distribucion, ventana_vencimiento, lotes,
       unidades_fisicas, unidades_disponibles
  FROM vw_resumen_vencimientos
 ORDER BY centro_distribucion, ventana_vencimiento;

-- Detalle: lotes que vencen en menos de 90 dias, mas urgentes primero
SELECT centro_distribucion, producto, numero_lote, fecha_caducidad,
       dias_para_vencer, stock_disponible, ventana_vencimiento
  FROM vw_alerta_vencimientos_fefo
 WHERE dias_para_vencer <= 90
 ORDER BY dias_para_vencer, centro_distribucion;

-- Mermas ya ocurridas: lotes vencidos con stock en bodega
SELECT centro_distribucion, producto, numero_lote, stock_fisico
  FROM vw_alerta_vencimientos_fefo
 WHERE ventana_vencimiento = 'VENCIDO';


-- ------------------------------------------------------------
-- RF-03: TRAZABILIDAD SANITARIA Y RECALL
-- ------------------------------------------------------------
-- Informe completo de un lote bloqueado (ver panel "Salida de DBMS")
BEGIN
    sp_rastreo_recall_lote('LT-09-A');
    sp_rastreo_recall_lote('LT-21-A');
END;
/

-- Misma informacion en forma de tabla (util para exportar)
SELECT numero_lote, estado_lote, producto, cliente_institucional, nit,
       numero_orden, cantidad, estado_despacho, numero_guia
  FROM vw_recall_lote
 WHERE numero_lote = 'LT-09-A'
 ORDER BY fecha_orden;

-- Historial completo de movimientos de un lote (planta -> bodegas -> clientes)
SELECT fecha_movimiento, tipo_movimiento, cantidad, referencia,
       bodega_origen, bodega_destino
  FROM vw_trazabilidad_lotes
 WHERE numero_lote = 'LT-09-A'
 ORDER BY fecha_movimiento;

-- Pedidos pendientes que contienen un lote bloqueado (deben detenerse)
SELECT o.numero_orden, c.nombre AS cliente, l.numero_lote, l.estado_lote
  FROM det_orden d
  JOIN ordenb2b o ON o.id_orden = d.id_orden
  JOIN cliente_b2b c ON c.id_clienteb2b = o.id_clienteb2b
  JOIN lote l ON l.id_lote = d.id_lote
 WHERE l.estado_lote IN ('BLOQUEADO', 'RECHAZADO')
   AND o.estado = 'CONFIRMADA';


-- ------------------------------------------------------------
-- DEMOSTRACION DE FEFO: lotes de un producto en el orden en que se despachan
-- ------------------------------------------------------------
SELECT numero_lote, estado_lote, fecha_caducidad, stock, reservas, disponible
  FROM vw_inventario_bodega
 WHERE producto LIKE 'Aspirina 500%'
   AND bodega = 'Bodega Central Guatemala'
 ORDER BY fecha_caducidad;


-- ------------------------------------------------------------
-- RF-05: CONCILIACION FINANCIERA
-- ------------------------------------------------------------
SELECT numero_orden, cliente, valor_bruto, descuento, valor_neto,
       monto_impuesto, comision_distribucion, total_orden
  FROM vw_conciliacion_financiera
 ORDER BY fecha_orden DESC
 FETCH FIRST 15 ROWS ONLY;

-- Totales por cliente: lo facturado debe coincidir con el saldo de credito
SELECT c.cliente,
       SUM(c.total_orden) AS total_facturado,
       MAX(c.saldo_utilizado) AS saldo_utilizado_credito
  FROM vw_conciliacion_financiera c
 WHERE c.estado <> 'CANCELADA'
 GROUP BY c.cliente;


-- ------------------------------------------------------------
-- ANALITICA DE VENTAS Y CONTROL DE LOTES
-- ------------------------------------------------------------
SELECT producto, unidades_solicitadas
  FROM vw_productos_mas_solicitados
 ORDER BY unidades_solicitadas DESC
 FETCH FIRST 10 ROWS ONLY;

SELECT TO_CHAR(mes, 'YYYY-MM') AS mes, linea,
       SUM(unidades) AS unidades, SUM(venta_bruta) AS venta_bruta
  FROM vw_ventas_mensuales
 GROUP BY TO_CHAR(mes, 'YYYY-MM'), linea
 ORDER BY 1, 2;

SELECT estado_lote, COUNT(*) AS lotes FROM lote GROUP BY estado_lote ORDER BY 1;
