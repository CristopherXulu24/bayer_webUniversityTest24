-- ============================================================
-- 07. PRUEBA DE RECUPERACION TRANSACCIONAL / CRASH TEST (RNF-02)
-- Una sola sesion (APEX SQL Scripts o SQL Commands).
-- ============================================================

-- ------------------------------------------------------------
-- PARTE 1: FOTO "ANTES" (guardar captura de pantalla)
-- ------------------------------------------------------------
SELECT numero_lote, stock, reservas, disponible
  FROM vw_inventario_bodega
 WHERE producto LIKE 'Aspirina 500%'
   AND bodega = 'Bodega Central Guatemala'
 ORDER BY fecha_caducidad;

SELECT cod_clienteb2b, saldo_utilizado, credito_disponible
  FROM vw_credito_clientes WHERE cod_clienteb2b = 'CLI-003';

SELECT COUNT(*) AS total_ordenes FROM ordenb2b;


-- ------------------------------------------------------------
-- PARTE 2A: FALLA A MITAD DEL PROCESO (tras reservar inventario,
--           antes de afectar el credito)
-- La orden, el despacho, el detalle y las reservas ya se habian
-- escrito en la transaccion cuando ocurre el error.
-- ------------------------------------------------------------
DECLARE
    v_cli NUMBER; v_prod NUMBER; v_bod NUMBER;
    v_id  NUMBER; v_msg  VARCHAR2(500);
BEGIN
    SELECT id_clienteb2b INTO v_cli  FROM cliente_b2b WHERE cod_clienteb2b = 'CLI-003';
    SELECT id_producto   INTO v_prod FROM producto    WHERE cod_producto   = 'BAY-001';
    SELECT id_bodega     INTO v_bod  FROM bodega      WHERE nombre = 'Bodega Central Guatemala';

    sp_checkout_b2b_fefo(v_cli, v_prod, v_bod, 200, v_id, v_msg, 0, 1);  -- fallo tipo 1
    DBMS_OUTPUT.PUT_LINE('Orden: ' || v_id || ' | ' || v_msg);
END;
/

-- ------------------------------------------------------------
-- PARTE 2B: FALLA CON EL CREDITO YA DESCONTADO (caso del PDF:
--           "el credito se descuenta pero la orden queda a medias")
-- ------------------------------------------------------------
DECLARE
    v_cli NUMBER; v_prod NUMBER; v_bod NUMBER;
    v_id  NUMBER; v_msg  VARCHAR2(500);
BEGIN
    SELECT id_clienteb2b INTO v_cli  FROM cliente_b2b WHERE cod_clienteb2b = 'CLI-003';
    SELECT id_producto   INTO v_prod FROM producto    WHERE cod_producto   = 'BAY-001';
    SELECT id_bodega     INTO v_bod  FROM bodega      WHERE nombre = 'Bodega Central Guatemala';

    sp_checkout_b2b_fefo(v_cli, v_prod, v_bod, 200, v_id, v_msg, 0, 2);  -- fallo tipo 2
    DBMS_OUTPUT.PUT_LINE('Orden: ' || v_id || ' | ' || v_msg);
END;
/

-- ------------------------------------------------------------
-- PARTE 3: FOTO "DESPUES" -> DEBE SER IDENTICA A LA DE "ANTES"
-- (el contador de secuencias puede saltar numeros: es normal en Oracle)
-- ------------------------------------------------------------
SELECT numero_lote, stock, reservas, disponible
  FROM vw_inventario_bodega
 WHERE producto LIKE 'Aspirina 500%'
   AND bodega = 'Bodega Central Guatemala'
 ORDER BY fecha_caducidad;

SELECT cod_clienteb2b, saldo_utilizado, credito_disponible
  FROM vw_credito_clientes WHERE cod_clienteb2b = 'CLI-003';

SELECT COUNT(*) AS total_ordenes FROM ordenb2b;


-- ------------------------------------------------------------
-- PARTE 4: CREDITO INSUFICIENTE (cliente CLI-004, limite 10,000)
-- Debe rechazarse sin dejar rastro.
-- ------------------------------------------------------------
DECLARE
    v_cli NUMBER; v_prod NUMBER; v_bod NUMBER;
    v_id  NUMBER; v_msg  VARCHAR2(500);
BEGIN
    SELECT id_clienteb2b INTO v_cli  FROM cliente_b2b WHERE cod_clienteb2b = 'CLI-004';
    SELECT id_producto   INTO v_prod FROM producto    WHERE cod_producto   = 'BAY-018';
    SELECT id_bodega     INTO v_bod  FROM bodega      WHERE nombre = 'Bodega Central Guatemala';

    sp_checkout_b2b_fefo(v_cli, v_prod, v_bod, 50, v_id, v_msg);
    DBMS_OUTPUT.PUT_LINE('Orden: ' || v_id || ' | ' || v_msg);
END;
/

-- ------------------------------------------------------------
-- PARTE 5: STOCK INSUFICIENTE (pedir mas de lo que existe)
-- ------------------------------------------------------------
DECLARE
    v_cli NUMBER; v_prod NUMBER; v_bod NUMBER;
    v_id  NUMBER; v_msg  VARCHAR2(500);
BEGIN
    SELECT id_clienteb2b INTO v_cli  FROM cliente_b2b WHERE cod_clienteb2b = 'CLI-002';
    SELECT id_producto   INTO v_prod FROM producto    WHERE cod_producto   = 'BAY-003';
    SELECT id_bodega     INTO v_bod  FROM bodega      WHERE nombre = 'Bodega Central Guatemala';

    sp_checkout_b2b_fefo(v_cli, v_prod, v_bod, 20000, v_id, v_msg);
    DBMS_OUTPUT.PUT_LINE('Orden: ' || v_id || ' | ' || v_msg);
END;
/


-- ============================================================
-- PARTE 6 (OPCIONAL): CAIDA REAL DE LA SESION
-- Demuestra que lo no confirmado se pierde y lo confirmado persiste.
--
-- Sesion 1 (NO ejecutar COMMIT):
--     UPDATE credito_cliente SET saldo_utilizado = saldo_utilizado + 1
--      WHERE id_clienteb2b = (SELECT id_clienteb2b FROM cliente_b2b
--                              WHERE cod_clienteb2b = 'CLI-003');
--   -> cerrar la pestana del navegador sin confirmar.
-- Sesion nueva: consultar vw_credito_clientes -> el cambio NO esta.
--
-- NOTA: en la nube (APEX) no se puede hacer SHUTDOWN ABORT; esa
-- instancia es administrada por Oracle.  La recuperacion por Redo Log /
-- WAL se explica en el informe: Oracle registra cada cambio en el redo
-- log antes de confirmarlo; tras una caida aplica lo confirmado y deshace
-- lo no confirmado.  La evidencia practica son las Partes 1 a 5 y la
-- caida de sesion de esta Parte 6.
-- ============================================================
