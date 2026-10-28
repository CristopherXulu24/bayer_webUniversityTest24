-- ============================================================
-- 09. API REST (ORDS) PARA LA PAGINA WEB  (ejecutar en SQL Scripts, despues de 01-05)
-- Solo expone VISTAS (lectura) y 2 procedimientos (checkout y bloqueo de lote).
-- Las tablas NO quedan expuestas.
-- Cambia v_origen por 'https://TU_USUARIO.github.io' cuando publiques la pagina.
-- ============================================================
DECLARE
    v_origen CONSTANT VARCHAR2(200) := '*';
    v_n NUMBER := 0;

    PROCEDURE feed(p_pat VARCHAR2, p_sql VARCHAR2) IS
    BEGIN
        ORDS.DEFINE_TEMPLATE(p_module_name => 'bayer', p_pattern => p_pat);
        ORDS.DEFINE_HANDLER(p_module_name => 'bayer', p_pattern => p_pat,
            p_method => 'GET', p_source_type => ORDS.source_type_collection_feed,
            p_items_per_page => 500, p_source => p_sql);
    END;
    -- Alta/edicion: ejecuta el bloque, COMMIT si sale bien, ROLLBACK + mensaje si falla
    PROCEDURE accion(p_pat VARCHAR2, p_cuerpo VARCHAR2) IS
    BEGIN
        ORDS.DEFINE_TEMPLATE(p_module_name => 'bayer', p_pattern => p_pat);
        ORDS.DEFINE_HANDLER(p_module_name => 'bayer', p_pattern => p_pat, p_method => 'POST',
            p_source_type => ORDS.source_type_plsql,
            p_source => 'DECLARE j JSON_OBJECT_T := JSON_OBJECT_T.parse(:body_text); '
              || 'v_msg VARCHAR2(500) := ''Guardado correctamente.''; v_ok NUMBER := 1; v_out VARCHAR2(1000); '
              || 'BEGIN BEGIN ' || p_cuerpo || ' COMMIT; EXCEPTION WHEN OTHERS THEN ROLLBACK; v_ok := 0; v_msg := SUBSTR(SQLERRM, 1, 400); END; '
              || 'SELECT JSON_OBJECT(''ok'' VALUE v_ok, ''mensaje'' VALUE v_msg) INTO v_out FROM dual; '
              || 'owa_util.mime_header(''application/json'', FALSE); owa_util.http_header_close; htp.p(v_out); END;');
    END;
BEGIN
    BEGIN
        EXECUTE IMMEDIATE 'SELECT COUNT(*) FROM user_ords_schemas' INTO v_n;
        IF v_n = 0 THEN ORDS.ENABLE_SCHEMA(p_enabled => TRUE); END IF;
    EXCEPTION WHEN OTHERS THEN DBMS_OUTPUT.PUT_LINE('Aviso schema: ' || SQLERRM);
    END;
    BEGIN ORDS.DELETE_MODULE(p_module_name => 'bayer'); EXCEPTION WHEN OTHERS THEN NULL; END;

    ORDS.DEFINE_MODULE(p_module_name => 'bayer', p_base_path => '/bayer/',
        p_items_per_page => 500, p_status => 'PUBLISHED', p_comments => 'API Bayer, Inc.');

    feed('productos',  q'[SELECT * FROM vw_productos ORDER BY nombre]');
    feed('clientes',   q'[SELECT c.id_clienteb2b, c.cod_clienteb2b, c.nombre, c.nit, c.tipo_cliente,
                                 cr.limite_credito, cr.saldo_utilizado,
                                 cr.limite_credito - cr.saldo_utilizado AS credito_disponible
                            FROM cliente_b2b c JOIN credito_cliente cr ON cr.id_clienteb2b = c.id_clienteb2b
                           ORDER BY c.cod_clienteb2b]');
    feed('bodegas',    q'[SELECT id_bodega, nombre, ubicacion, tipo FROM bodega ORDER BY id_bodega]');
    feed('lotes',      q'[SELECT * FROM vw_lotes_productos ORDER BY numero_lote]');
    feed('inventario', q'[SELECT * FROM vw_inventario_bodega ORDER BY producto, fecha_caducidad]');
    feed('vencimientos',   q'[SELECT * FROM vw_alerta_vencimientos_fefo ORDER BY dias_para_vencer]');
    feed('recall/:lote',   q'[SELECT * FROM vw_recall_lote WHERE numero_lote = :lote ORDER BY fecha_orden]');
    feed('conciliacion',   q'[SELECT * FROM vw_conciliacion_financiera ORDER BY fecha_orden DESC]');
    feed('resumen_ordenes',q'[SELECT * FROM vw_resumen_ordenes ORDER BY estado]');
    feed('ventas',         q'[SELECT * FROM vw_ventas_mensuales ORDER BY mes]');
    feed('top_productos',  q'[SELECT * FROM vw_productos_mas_solicitados ORDER BY unidades_solicitadas DESC FETCH FIRST 10 ROWS ONLY]');

    feed('calidad',        q'[SELECT * FROM vw_control_calidad ORDER BY fecha_inspeccion DESC]');
    feed('trazabilidad',   q'[SELECT * FROM vw_trazabilidad_lotes ORDER BY fecha_movimiento DESC]');
    feed('ordenes',        q'[SELECT * FROM vw_ordenes_clientes ORDER BY fecha_orden DESC]');
    feed('detalle_ordenes',q'[SELECT * FROM vw_detalle_ordenes ORDER BY numero_orden DESC]');
    feed('despachos',      q'[SELECT * FROM vw_despachos ORDER BY fecha_despacho DESC]');

    accion('producto_nuevo', q'[DECLARE v_cod VARCHAR2(30) := j.get_String('cod'); v_nom VARCHAR2(150) := j.get_String('nombre');
        v_lin VARCHAR2(10) := NVL(j.get_String('linea'), 'OTC'); v_fr CHAR(1) := NVL(j.get_String('cadena_frio'), 'N'); v_pre NUMBER := j.get_Number('precio');
        BEGIN INSERT INTO producto(cod_producto, nombre, linea, cadena_frio, estado, precio_unitario) VALUES (v_cod, v_nom, v_lin, v_fr, 'ACTIVO', v_pre); END;]');
    accion('producto_editar', q'[DECLARE v_id NUMBER := j.get_Number('id_producto'); v_est VARCHAR2(15) := j.get_String('estado'); v_pre NUMBER := j.get_Number('precio');
        BEGIN UPDATE producto SET estado = v_est, precio_unitario = v_pre WHERE id_producto = v_id;
        IF SQL%ROWCOUNT = 0 THEN RAISE_APPLICATION_ERROR(-20010, 'Producto no encontrado.'); END IF; END;]');
    accion('cliente_nuevo', q'[DECLARE v_cod VARCHAR2(30) := j.get_String('cod'); v_nom VARCHAR2(150) := j.get_String('nombre'); v_nit VARCHAR2(20) := j.get_String('nit');
        v_tipo VARCHAR2(30) := j.get_String('tipo'); v_lim NUMBER := NVL(j.get_Number('limite'), 0); v_id NUMBER;
        BEGIN INSERT INTO cliente_b2b(cod_clienteb2b, nombre, nit, tipo_cliente) VALUES (v_cod, v_nom, v_nit, v_tipo) RETURNING id_clienteb2b INTO v_id;
        INSERT INTO credito_cliente(limite_credito, saldo_utilizado, id_clienteb2b) VALUES (v_lim, 0, v_id); END;]');
    accion('bodega_nueva', q'[DECLARE v_nom VARCHAR2(100) := j.get_String('nombre'); v_ub VARCHAR2(200) := j.get_String('ubicacion'); v_tipo VARCHAR2(30) := j.get_String('tipo');
        BEGIN INSERT INTO bodega(nombre, ubicacion, tipo) VALUES (v_nom, v_ub, v_tipo); END;]');
    accion('lote_nuevo', q'[DECLARE v_num VARCHAR2(50) := j.get_String('numero'); v_prod NUMBER := j.get_Number('id_producto');
        v_fab DATE := TO_DATE(j.get_String('fab'), 'YYYY-MM-DD'); v_cad DATE := TO_DATE(j.get_String('cad'), 'YYYY-MM-DD'); v_est VARCHAR2(20) := j.get_String('estado');
        BEGIN INSERT INTO lote(numero_lote, fecha_fabricacion, fecha_caducidad, estado_lote, id_producto) VALUES (v_num, v_fab, v_cad, v_est, v_prod); END;]');
    accion('inspeccion_nueva', q'[DECLARE v_lote NUMBER := j.get_Number('id_lote'); v_res VARCHAR2(20) := j.get_String('resultado');
        v_rep VARCHAR2(120) := NVL(j.get_String('representante'), 'Control de Calidad Bayer'); v_obs VARCHAR2(400) := j.get_String('observaciones');
        BEGIN INSERT INTO control_calidad(resultado, representante, observaciones, id_lote) VALUES (v_res, v_rep, v_obs, v_lote);
        IF v_res IN ('APROBADO', 'RECHAZADO') THEN UPDATE lote SET estado_lote = v_res WHERE id_lote = v_lote; END IF; END;]');
    accion('inventario_nuevo', q'[DECLARE v_lote NUMBER := j.get_Number('id_lote'); v_bod NUMBER := j.get_Number('id_bodega'); v_stock NUMBER := j.get_Number('stock');
        BEGIN INSERT INTO inventario(stock, reservas, id_lote, id_bodega) VALUES (v_stock, 0, v_lote, v_bod); END;]');

    -- POST checkout atomico FEFO (pausa y simular_fallo son SOLO para el laboratorio)
    ORDS.DEFINE_TEMPLATE(p_module_name => 'bayer', p_pattern => 'checkout');
    ORDS.DEFINE_HANDLER(p_module_name => 'bayer', p_pattern => 'checkout', p_method => 'POST',
        p_source_type => ORDS.source_type_plsql, p_source => q'[
DECLARE
    j JSON_OBJECT_T := JSON_OBJECT_T.parse(:body_text);
    v_id NUMBER; v_msg VARCHAR2(500); v_out VARCHAR2(1000);
BEGIN
    sp_checkout_b2b_fefo(j.get_Number('id_cliente'), j.get_Number('id_producto'),
        j.get_Number('id_bodega'), j.get_Number('cantidad'), v_id, v_msg,
        NVL(j.get_Number('pausa'), 0), NVL(j.get_Number('simular_fallo'), 0));
    SELECT JSON_OBJECT('id_orden' VALUE v_id, 'mensaje' VALUE v_msg) INTO v_out FROM dual;
    owa_util.mime_header('application/json', FALSE);
    owa_util.http_header_close;
    htp.p(v_out);
END;]');

    -- POST bloqueo de lote por Control de Calidad
    ORDS.DEFINE_TEMPLATE(p_module_name => 'bayer', p_pattern => 'bloquear_lote');
    ORDS.DEFINE_HANDLER(p_module_name => 'bayer', p_pattern => 'bloquear_lote', p_method => 'POST',
        p_source_type => ORDS.source_type_plsql, p_source => q'[
DECLARE
    j JSON_OBJECT_T := JSON_OBJECT_T.parse(:body_text);
    v_msg VARCHAR2(500); v_out VARCHAR2(1000);
BEGIN
    sp_bloquear_lote(j.get_String('lote'),
        NVL(j.get_String('motivo'), 'Bloqueo manual desde la web'), v_msg);
    SELECT JSON_OBJECT('mensaje' VALUE v_msg) INTO v_out FROM dual;
    owa_util.mime_header('application/json', FALSE);
    owa_util.http_header_close;
    htp.p(v_out);
END;]');

    -- CORS: origenes permitidos (si falla, ponlo a mano en RESTful Services > modulo bayer)
    BEGIN
        EXECUTE IMMEDIATE 'BEGIN ORDS.SET_MODULE_ORIGINS_ALLOWED(p_module_name => ''bayer'', p_origins_allowed => :o); END'
            USING v_origen;
    EXCEPTION WHEN OTHERS THEN DBMS_OUTPUT.PUT_LINE('Aviso CORS: ' || SQLERRM);
    END;
    COMMIT;
END;
/
