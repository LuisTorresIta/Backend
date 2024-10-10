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

// exports.getEstadoCuenta = async (req, res) => {
//     try {
//         const { fechaInicio, fechaFinal } = req.body; // Extraemos las fechas del cuerpo de la solicitud

//         // Asegúrate de que las fechas no sean nulas
//         if (!fechaInicio || !fechaFinal) {
//             return res.status(400).send('Las fechas de inicio y final son requeridas.');
//         }

//         const conn = await connectDB();
//         const query = `
//             SELECT * 
//             FROM DB2ADMIN.REC_PRO_FACTURA
//             WHERE FECHA_EMI_FACTURA BETWEEN ? AND ?`;
        
//         // Ejecutamos la consulta, pasando las fechas como parámetros
//         const data = await conn.query(query, [fechaInicio, fechaFinal]);
//         res.status(200).json(data);
//         conn.close();
//     } catch (err) {
//         console.error('Error en la consulta de estado de cuenta:', err);
//         res.status(500).send('Error en la consulta');
//     }
// };


exports.getEstadoCuenta = async (req, res) => {
    try {
        const { usuario, fechaInicio, fechaFinal } = req.body;

        if (!usuario || !fechaInicio || !fechaFinal) {
            return res.status(400).send('El usuario, la fecha de inicio y la fecha final son requeridos.');
        }

        const conn = await connectDB();

        const query = `
            SELECT e.nombre AS empresa, r.concepto, r.numeroRecibo, r.total, r.fechaPagado, r.valorPagado
            FROM AMB_EMPRESAS e
            JOIN registros r ON e.id = r.empresaId
            WHERE e.usuarioId = ? AND r.fechaPagado BETWEEN ? AND ?`;
        
        const data = await conn.query(query, [usuario, fechaInicio, fechaFinal]);
        res.status(200).json(data);
        
        conn.close(); 
    } catch (err) {
        console.error('Error en la consulta de estado de cuenta:', err);
        res.status(500).send('Error en la consulta');
    }
};
