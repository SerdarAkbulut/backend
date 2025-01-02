const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'homework',
    password: '6134',
    port: 5432, 
});

module.exports = pool;