const connectDB = require('../config/db');

exports.checkConnection = async (req, res) => {
    try {
        const conn = await connectDB();
        res.send('Conexión a DB2 realizada con éxito');
        conn.close();
    } catch (err) {
        console.error('Error al conectar a DB2:', err);
        res.status(500).send('Error al conectar a DB2');
    }
};

exports.getEmpresas = async (req, res) => {
    try {
        const conn = await connectDB();
        const query = 'SELECT * FROM DB2ADMIN.AMB_EMPRESAS';
        const data = await conn.query(query);
        res.json(data);
        conn.close();
    } catch (err) {
        console.error('Error en la consulta de empresas:', err);
        res.status(500).send('Error en la consulta');
    }
};

exports.getParametros = async (req, res) => {
    try {
        const conn = await connectDB();
        const query = 'SELECT PARAMETRO, VALOR FROM AMB_PARAMETROS';
        const data = await conn.query(query);
        const params = {};

        data.forEach(row => {
            params[row.PARAMETRO] = parseFloat(row.VALOR);
        });

        res.json(params);
        conn.close();
    } catch (err) {
        console.error('Error en la consulta de parámetros:', err);
        res.status(500).send('Error en la consulta');
    }
};

exports.getPeriodos = async (req, res) => {
    try {
        const conn = await connectDB();
        const sql = 'SELECT ID, PERIODO, FECHA_INICIO, FECHA_FINAL FROM DB2ADMIN.AMB_PERIODOS WHERE ESTADO = 1';
        const result = await conn.query(sql);
        res.status(200).json(result);
        conn.close();
    } catch (err) {
        console.error('Error en la consulta de periodos:', err);
        res.status(500).send('Error en la consulta');
    }
};

exports.getEstadoCuenta = async (req, res) => {
    const {
        fechaInicio,
        fechaFin,
        idTercero
    } = req.body;

    if (!fechaInicio || !fechaFin || !idTercero) {
        return res.status(400).json({
            message: 'Fecha de inicio, fecha de fin y ID de tercero son requeridos'
        });
    }

    try {
        const conn = await connectDB();
        const sql = `
            SELECT dc.NUMERO_OBLIGACION, dc.VALOR_TOTAL, dc.FECHA_VIGENCIA, b.PERIODO, d.NOMBRE
            FROM CRT_DETALLE_CARTERA dc
            INNER JOIN CRT_DETALLES_CONCEPTOS_AMB b ON dc.ID = b.ID_DETALLE_CARTERA
            INNER JOIN CRT_CARTERA c ON dc.ID_CARTERA = c.ID
            INNER JOIN GES_CONCEPTOS d ON c.ID_CONCEPTO_COBRANZA = d.ID
            WHERE dc.FECHA_VIGENCIA BETWEEN ? AND ? AND dc.ID_TERCERO = ?`;

        const data = await conn.query(sql, [fechaInicio, fechaFin, idTercero]);

        conn.close();

        if (data.length > 0) {
            return res.status(200).json({
                message: 'Detalles de conceptos obtenidos con éxito',
                detalles: data
            });
        } else {
            return res.status(404).json({
                message: 'No se encontraron detalles de conceptos'
            });
        }
    } catch (err) {
        console.error('Error en obtener detalles de conceptos:', err);
        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
};