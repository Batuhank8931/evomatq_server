const mysql = require("mysql2/promise");
require("dotenv").config();


const dbconn = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    dateStrings: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
});


module.exports = dbconn;
