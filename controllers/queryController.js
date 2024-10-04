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