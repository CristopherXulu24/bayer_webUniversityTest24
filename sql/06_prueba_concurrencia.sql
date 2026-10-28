-- ============================================================
-- 06. PRUEBA DE CONCURRENCIA (RNF-01, RF-02)
-- Requiere DOS SESIONES SEPARADAS. En APEX:
--   NO corras este archivo completo desde SQL Scripts.
--   Abre SQL Workshop > SQL Commands en DOS pestanas del navegador
--   (Hoja 1 y Hoja 2) y pega/ejecuta cada bloque por separado.
--   El PASO 0 y las verificaciones (SELECT) se ejecutan en cualquiera.
-- Los bloques que dicen "Hoja 1" van en la pestana 1 y los de "Hoja 2"
-- en la pestana 2. Ejecuta el de la Hoja 2 mientras la Hoja 1 sigue
-- "pensando" (pausa de 30 o 40 s).
-- ============================================================


-- ------------------------------------------------------------
-- PASO 0 (una sola vez, en Hoja 1): crear lotes criticos de prueba
-- Cada producto tiene UN solo lote APROBADO con 100 unidades
-- ------------------------------------------------------------
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario)
VALUES ('TEST-CRIT-A', 'Producto critico A (prueba de concurrencia)', 'ETICO', 'N', 500);

INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario)
VALUES ('TEST-CRIT-B', 'Producto critico B (prueba de bloqueo por Calidad)', 'ETICO', 'N', 500);

INSERT INTO lote (numero_lote, fecha_fabricacion, fecha_caducidad, estado_lote, id_producto)
SELECT 'LT-CRIT-A', TRUNC(SYSDATE) - 30, TRUNC(SYSDATE) + 300, 'APROBADO', id_producto
  FROM producto WHERE cod_producto = 'TEST-CRIT-A';

INSERT INTO lote (numero_lote, fecha_fabricacion, fecha_caducidad, estado_lote, id_producto)
SELECT 'LT-CRIT-B', TRUNC(SYSDATE) - 30, TRUNC(SYSDATE) + 300, 'APROBADO', id_producto
  FROM producto WHERE cod_producto = 'TEST-CRIT-B';

INSERT INTO inventario (stock, reservas, id_lote, id_bodega)
SELECT 100, 0, l.id_lote, b.id_bodega
  FROM lote l, bodega b
 WHERE l.numero_lote IN ('LT-CRIT-A', 'LT-CRIT-B')
   AND b.nombre = 'Bodega Central Guatemala';

COMMIT;

-- Estado inicial (debe mostrar stock 100, reservas 0)
SELECT numero_lote, stock, reservas, disponible
  FROM vw_inventario_bodega
 WHERE numero_lote IN ('LT-CRIT-A', 'LT-CRIT-B');


-- ============================================================
-- PRUEBA A: dos distribuidores quieren el MISMO lote critico
--           (las 100 unidades que quedan) al mismo tiempo.
--
-- 1) Ejecuta el BLOQUE SESION 1 en la Hoja 1. Tarda ~30 s porque
--    mantiene su transaccion abierta con el lote bloqueado.
-- 2) INMEDIATAMENTE ejecuta el BLOQUE SESION 2 en la Hoja 2.
--    Se quedara "esperando" (el reloj sigue corriendo): esta
--    bloqueada por el FOR UPDATE de la Sesion 1.
-- 3) Cuando la Sesion 1 hace COMMIT, la Sesion 2 despierta, ve que ya
--    no queda stock y se REVIERTE: no hay sobreventa.
--
-- RESULTADO ESPERADO
--   Sesion 1: "Orden confirmada exitosamente bajo estandar FEFO..."
--   Sesion 2: "Transaccion Revertida (ROLLBACK): ... Stock insuficiente..."
--   Inventario LT-CRIT-A: stock 100, reservas 100 (NO 200)
-- ============================================================

-- ===== BLOQUE SESION 1  (Hoja 1) =====
DECLARE
    v_cli NUMBER; v_prod NUMBER; v_bod NUMBER;
    v_id  NUMBER; v_msg  VARCHAR2(500);
BEGIN
    SELECT id_clienteb2b INTO v_cli  FROM cliente_b2b WHERE cod_clienteb2b = 'CLI-001';
    SELECT id_producto   INTO v_prod FROM producto    WHERE cod_producto   = 'TEST-CRIT-A';
    SELECT id_bodega     INTO v_bod  FROM bodega      WHERE nombre = 'Bodega Central Guatemala';

    DBMS_OUTPUT.PUT_LINE('SESION 1 inicia: ' || TO_CHAR(SYSTIMESTAMP, 'HH24:MI:SS'));
    sp_checkout_b2b_fefo(v_cli, v_prod, v_bod, 100, v_id, v_msg, 30);   -- pausa 30 s
    DBMS_OUTPUT.PUT_LINE('SESION 1 termina: ' || TO_CHAR(SYSTIMESTAMP, 'HH24:MI:SS'));
    DBMS_OUTPUT.PUT_LINE('SESION 1 -> orden ' || v_id || ' | ' || v_msg);
END;
/

-- ===== BLOQUE SESION 2  (Hoja 2, ejecutar justo despues de iniciar la 1) =====
DECLARE
    v_cli NUMBER; v_prod NUMBER; v_bod NUMBER;
    v_id  NUMBER; v_msg  VARCHAR2(500);
BEGIN
    SELECT id_clienteb2b INTO v_cli  FROM cliente_b2b WHERE cod_clienteb2b = 'CLI-002';
    SELECT id_producto   INTO v_prod FROM producto    WHERE cod_producto   = 'TEST-CRIT-A';
    SELECT id_bodega     INTO v_bod  FROM bodega      WHERE nombre = 'Bodega Central Guatemala';

    DBMS_OUTPUT.PUT_LINE('SESION 2 inicia: ' || TO_CHAR(SYSTIMESTAMP, 'HH24:MI:SS'));
    sp_checkout_b2b_fefo(v_cli, v_prod, v_bod, 100, v_id, v_msg);
    DBMS_OUTPUT.PUT_LINE('SESION 2 termina: ' || TO_CHAR(SYSTIMESTAMP, 'HH24:MI:SS'));
    DBMS_OUTPUT.PUT_LINE('SESION 2 -> orden ' || v_id || ' | ' || v_msg);
END;
/

-- ===== VERIFICACION (cualquier hoja, al terminar ambas) =====
-- Debe haber stock 100, reservas 100 (no 200) y UNA sola orden confirmada.
SELECT numero_lote, stock, reservas, disponible
  FROM vw_inventario_bodega WHERE numero_lote = 'LT-CRIT-A';

SELECT numero_orden, cliente, producto, numero_lote, cantidad_solicitada
  FROM vw_detalle_ordenes WHERE numero_lote = 'LT-CRIT-A';

-- La Sesion 2 NO debe haber consumido credito: comparar con CLI-001
SELECT cod_clienteb2b, saldo_utilizado FROM vw_credito_clientes
 WHERE cod_clienteb2b IN ('CLI-001', 'CLI-002');


-- ============================================================
-- PRUEBA B: Calidad bloquea el lote MIENTRAS el cliente compra (RF-02)
--
-- 1) Ejecuta el BLOQUE SESION 1B en la Hoja 1 (pausa de 40 s).
-- 2) Durante esos 40 s, ejecuta el BLOQUE SESION CALIDAD en la Hoja 2.
-- 3) Al despertar, la Sesion 1B revalida los lotes, detecta el bloqueo
--    y revierte toda la transaccion.
--
-- RESULTADO ESPERADO
--   Sesion 1B: "Transaccion Revertida (ROLLBACK): El lote LT-CRIT-B fue
--               bloqueado por Control de Calidad durante la transaccion."
--   LT-CRIT-B: reservas 0, credito de CLI-003 sin cambio.
-- ============================================================

-- ===== BLOQUE SESION 1B  (Hoja 1) =====
DECLARE
    v_cli NUMBER; v_prod NUMBER; v_bod NUMBER;
    v_id  NUMBER; v_msg  VARCHAR2(500);
BEGIN
    SELECT id_clienteb2b INTO v_cli  FROM cliente_b2b WHERE cod_clienteb2b = 'CLI-003';
    SELECT id_producto   INTO v_prod FROM producto    WHERE cod_producto   = 'TEST-CRIT-B';
    SELECT id_bodega     INTO v_bod  FROM bodega      WHERE nombre = 'Bodega Central Guatemala';

    sp_checkout_b2b_fefo(v_cli, v_prod, v_bod, 50, v_id, v_msg, 40);   -- pausa 40 s
    DBMS_OUTPUT.PUT_LINE('SESION 1B -> orden ' || v_id || ' | ' || v_msg);
END;
/

-- ===== BLOQUE SESION CALIDAD  (Hoja 2, durante los 40 s) =====
DECLARE
    v_msg VARCHAR2(500);
BEGIN
    sp_bloquear_lote('LT-CRIT-B', 'Alerta sanitaria: retencion preventiva del lote', v_msg);
    DBMS_OUTPUT.PUT_LINE(v_msg);
END;
/

-- ===== VERIFICACION =====
SELECT numero_lote, estado_lote, stock, reservas
  FROM vw_inventario_bodega WHERE numero_lote = 'LT-CRIT-B';

SELECT cod_clienteb2b, saldo_utilizado FROM vw_credito_clientes
 WHERE cod_clienteb2b = 'CLI-003';

SELECT numero_lote, resultado, observaciones FROM vw_control_calidad
 WHERE numero_lote = 'LT-CRIT-B';
