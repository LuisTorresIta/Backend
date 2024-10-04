const md5 = require('md5');
const connectDB = require('../config/db');

exports.login = async (req, res) => {
    const {
        usuario,
        clave
    } = req.body;

    if (!usuario || !clave) {
        return res.status(400).json({
            message: 'Usuario y clave son requeridos'
        });
    }

    const hashedClave = md5(clave);

    try {
        const conn = await connectDB();
        const sql = 'SELECT usuario, nombre_empresa FROM DB2ADMIN.AMB_EMPRESAS WHERE usuario = ? AND clave = ?';
        const data = await conn.query(sql, [usuario, hashedClave]);

        conn.close();

        if (data.length > 0) {
            return res.status(200).json({
                message: 'Login successful',
                usuario: data[0].USUARIO,
                empresa: data[0].NOMBRE_EMPRESA
            });
        } else {
            return res.status(401).json({
                message: 'Credenciales inválidas'
            });
        }
    } catch (err) {
        console.error('Error en login:', err);
        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
};

exports.changePassword = async (req, res) => {
    const {
        usuario,
        currentPassword,
        newPassword
    } = req.body;

    if (!usuario || !currentPassword || !newPassword) {
        return res.status(400).json({
            message: 'Usuario, contraseña actual y nueva contraseña son requeridos'
        });
    }

    const hashedCurrentPassword = md5(currentPassword);
    const hashedNewPassword = md5(newPassword);

    try {
        const conn = await connectDB();
        const sqlVerify = 'SELECT usuario FROM DB2ADMIN.AMB_EMPRESAS WHERE usuario = ? AND clave = ?';
        const result = await conn.query(sqlVerify, [usuario, hashedCurrentPassword]);

        if (result.length === 0) {
            conn.close();
            return res.status(401).json({
                message: 'La contraseña actual es incorrecta'
            });
        }

        const sqlUpdate = 'UPDATE DB2ADMIN.AMB_EMPRESAS SET clave = ? WHERE usuario = ?';
        await conn.query(sqlUpdate, [hashedNewPassword, usuario]);

        conn.close();

        return res.status(200).json({
            message: 'Contraseña cambiada exitosamente'
        });
    } catch (err) {
        console.error('Error cambiando la contraseña:', err);
        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
};