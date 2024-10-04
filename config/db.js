const ibmdb = require('ibm_db');
const dotenv = require('dotenv');

dotenv.config();

const connectionString = `DATABASE=${process.env.DB_NAME};HOSTNAME=${process.env.DB_HOST};UID=${process.env.DB_USER};PWD=${process.env.DB_PASSWORD};PORT=${process.env.DB_PORT};PROTOCOL=TCPIP;`;

const connectDB = () => {
    return new Promise((resolve, reject) => {
        ibmdb.open(connectionString, (err, conn) => {
            if (err) {
                return reject(err);
            }
            resolve(conn);
        });
    });
};

module.exports = connectDB;