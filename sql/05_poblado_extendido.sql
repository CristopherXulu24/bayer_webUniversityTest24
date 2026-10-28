-- ============================================================
-- 05. POBLADO EXTENDIDO: 200 ORDENES CORPORATIVAS
-- (ejecutar despues de 04_datos_base.sql)
--
-- Las ordenes NO se insertan "a mano": se generan llamando 200 veces a
-- sp_checkout_b2b_fefo, asi inventario, reservas, credito, detalle y
-- despacho quedan coherentes con las reglas del sistema.
-- Luego:
--   * se reparten las fechas de las ordenes en los ultimos ~170 dias
--   * se despacha ~70% de las ordenes (sp_confirmar_despacho)
--   * parte de lo despachado pasa a ENTREGADO
--   * Calidad bloquea dos lotes que YA se habian vendido (para el recall)
--
-- Puede tardar unos segundos.
-- ============================================================

DECLARE
    TYPE t_num  IS TABLE OF NUMBER   INDEX BY PLS_INTEGER;
    TYPE t_chr  IS TABLE OF CHAR(1)  INDEX BY PLS_INTEGER;

    v_prod     t_num;
    v_precio   t_num;
    v_frio     t_chr;
    v_cli      t_num;
    v_n_prod   PLS_INTEGER;

    v_b1       bodega.id_bodega%TYPE;
    v_b2       bodega.id_bodega%TYPE;
    v_b3       bodega.id_bodega%TYPE;

    v_ok       PLS_INTEGER := 0;
    v_try      PLS_INTEGER := 0;
    v_fallos   PLS_INTEGER := 0;
    v_idx      PLS_INTEGER;
    v_qty      NUMBER;
    v_bod      NUMBER;
    v_id_orden NUMBER;
    v_msg      VARCHAR2(500);
BEGIN
    SELECT id_bodega INTO v_b1 FROM bodega WHERE nombre = 'Bodega Central Guatemala';
    SELECT id_bodega INTO v_b2 FROM bodega WHERE nombre = 'Centro Logistico Mexico';
    SELECT id_bodega INTO v_b3 FROM bodega WHERE nombre = 'Bodega de Frios';

    SELECT id_producto, precio_unitario, cadena_frio
      BULK COLLECT INTO v_prod, v_precio, v_frio
      FROM producto
     ORDER BY cod_producto;
    v_n_prod := v_prod.COUNT;

    -- Clientes que compran en volumen: CLI-001 a CLI-003 (CLI-004 queda
    -- con credito bajo para las pruebas)
    SELECT id_clienteb2b
      BULK COLLECT INTO v_cli
      FROM cliente_b2b
     WHERE cod_clienteb2b IN ('CLI-001', 'CLI-002', 'CLI-003')
     ORDER BY cod_clienteb2b;

    WHILE v_ok < 200 AND v_try < 3000 LOOP
        v_try := v_try + 1;

        v_idx := MOD(v_try * 7, v_n_prod) + 1;      -- recorre los 23 productos

        -- Bodega: frio siempre en Bodega de Frios; resto 75% Guatemala, 25% Mexico
        IF v_frio(v_idx) = 'S' THEN
            v_bod := v_b3;
        ELSIF MOD(v_try, 4) = 0 THEN
            v_bod := v_b2;
        ELSE
            v_bod := v_b1;
        END IF;

        -- Cantidad segun valor del producto
        IF v_precio(v_idx) >= 1500 THEN
            v_qty := 2 + MOD(v_try * 5, 18);
        ELSIF v_precio(v_idx) >= 500 THEN
            v_qty := 10 + MOD(v_try * 11, 90);
        ELSIF v_precio(v_idx) < 100 AND MOD(v_try, 8) = 0 THEN
            v_qty := 500 + MOD(v_try * 53, 700);   -- pedidos grandes: aplican descuento
        ELSE
            v_qty := 50 + MOD(v_try * 37, 450);
        END IF;

        sp_checkout_b2b_fefo(
            v_cli(MOD(v_try, 3) + 1), v_prod(v_idx), v_bod, v_qty,
            v_id_orden, v_msg);

        IF v_id_orden > 0 THEN
            v_ok := v_ok + 1;
        ELSE
            v_fallos := v_fallos + 1;
            IF v_fallos <= 5 THEN
                DBMS_OUTPUT.PUT_LINE('Intento ' || v_try || ' rechazado: ' || v_msg);
            END IF;
        END IF;
    END LOOP;

    DBMS_OUTPUT.PUT_LINE('Ordenes generadas: ' || v_ok
        || ' | intentos rechazados (stock/credito): ' || v_fallos);
END;
/

-- ------------------------------------------------------------
-- Despachar ~70% de las ordenes
-- ------------------------------------------------------------
DECLARE
    v_msg VARCHAR2(500);
BEGIN
    FOR o IN (SELECT id_orden FROM ordenb2b WHERE MOD(id_orden, 10) < 7 ORDER BY id_orden) LOOP
        sp_confirmar_despacho(o.id_orden, v_msg);
    END LOOP;
END;
/

-- ------------------------------------------------------------
-- Historial: repartir fechas en los ultimos ~170 dias y marcar entregas
-- ------------------------------------------------------------
UPDATE ordenb2b
   SET fecha_orden = CAST(TRUNC(SYSDATE) - 1 - MOD(id_orden * 17, 170) AS TIMESTAMP)
                     + NUMTODSINTERVAL(MOD(id_orden * 7919, 50000) + 21600, 'SECOND');

UPDATE despacho d
   SET fecha_despacho = (SELECT o.fecha_orden + INTERVAL '1' DAY
                           FROM ordenb2b o
                          WHERE o.id_orden = d.id_orden);

UPDATE trazabilidad t
   SET fecha_movimiento = (SELECT o.fecha_orden + INTERVAL '1' DAY
                             FROM ordenb2b o
                            WHERE o.numero_orden = t.referencia)
 WHERE t.tipo_movimiento = 'SALIDA';

-- Dos de cada tres despachos en transito ya fueron entregados
UPDATE despacho
   SET estado = 'ENTREGADO'
 WHERE estado = 'EN_TRANSITO'
   AND MOD(id_despacho, 3) <> 0;

UPDATE ordenb2b o
   SET estado = 'ENTREGADA'
 WHERE EXISTS (SELECT 1 FROM despacho d
                WHERE d.id_orden = o.id_orden
                  AND d.estado = 'ENTREGADO');

COMMIT;

-- ------------------------------------------------------------
-- Alertas de calidad sobre lotes que YA se vendieron (caso recall)
-- ------------------------------------------------------------
DECLARE
    v_msg VARCHAR2(500);
BEGIN
    sp_bloquear_lote('LT-09-A',
        'Desviacion tecnica detectada en inspeccion posterior (Xarelto 10 mg)', v_msg);
    DBMS_OUTPUT.PUT_LINE(v_msg);

    sp_bloquear_lote('LT-21-A',
        'Falla en la cadena de frio durante el transporte (Eylea)', v_msg);
    DBMS_OUTPUT.PUT_LINE(v_msg);
END;
/

-- ------------------------------------------------------------
-- Verificacion
-- ------------------------------------------------------------
SELECT 'ORDENES' AS concepto, COUNT(*) AS total FROM ordenb2b UNION ALL
SELECT 'DETALLES DE ORDEN', COUNT(*) FROM det_orden UNION ALL
SELECT 'DESPACHOS', COUNT(*) FROM despacho UNION ALL
SELECT 'MOVIMIENTOS DE SALIDA', COUNT(*) FROM trazabilidad WHERE tipo_movimiento = 'SALIDA';

SELECT estado, total_ordenes FROM vw_resumen_ordenes ORDER BY estado;
SELECT * FROM vw_credito_clientes ORDER BY cod_clienteb2b;
