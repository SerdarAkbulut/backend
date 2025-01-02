const express = require('express');
const axios = require('axios');
const https = require('https');
const cors = require('cors'); 
const pool = require('./db');

const app = express();
const port = 3000;
const createTables = async () => {
  try {
      const hesapkoduTableQuery = `
          CREATE TABLE IF NOT EXISTS hesapkodu (
              id SERIAL PRIMARY KEY,
              kod VARCHAR(50),
              description TEXT,
              borc DECIMAL
          );
      `;
      await pool.query(hesapkoduTableQuery);
  } catch (err) {
      console.error('Tablo oluşturulurken hata oluştu:', err.message);
  }
};

createTables();
app.use(cors()); 
const url = 'https://efatura.etrsoft.com/fmi/data/v1/databases/testdb/sessions';
const username = 'apitest';
const password = 'test123';
const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

const agent = new https.Agent({
  rejectUnauthorized: false 
});

const getToken = async () => {
  try {
    const response = await axios.post(url, {}, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      httpsAgent: agent,
    });
    return response.data.response.token;
  } catch (error) {
    console.error('Error fetching token:', error.message);
    throw new Error('Unable to fetch token');
  }
};

const fetchBody = {
  "fieldData": {},
  "script": "getData"
};

const fetchDataAndSync = async () => {
  try {
    const token = await getToken();
    const response = await axios.patch(
      'https://efatura.etrsoft.com/fmi/data/v1/databases/testdb/layouts/testdb/records/1',
      fetchBody,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        httpsAgent: agent,
      }
    );

    const result = response.data;

    if (!result.response || !result.response.scriptResult) {
      throw new Error('Invalid data received from API');
    }

    const scriptResult = JSON.parse(result.response.scriptResult);

    for (const item of scriptResult) {
      const { id: apiId, hesap_kodu, hesap_adi, borc } = item;

      const checkQuery = 'SELECT id FROM hesapkodu WHERE id = $1';
      const checkResult = await pool.query(checkQuery, [apiId]);

      if (checkResult.rows.length > 0) {

        const updateQuery = `
          UPDATE hesapkodu
          SET kod = $1, description = $2, borc = $3
          WHERE id = $4
        `;
        await pool.query(updateQuery, [hesap_kodu, hesap_adi, borc || 0, apiId]);
      } else {
        const insertQuery = `
          INSERT INTO hesapkodu (id, kod, description, borc)
          VALUES ($1, $2, $3, $4)
          RETURNING id;
        `;
        await pool.query(insertQuery, [apiId, hesap_kodu || null, hesap_adi || null, borc || 0]);
      }
    }
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
};
app.get('/api/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM hesapkodu');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.status(500).send('Internal Server Error');
  }
});
setInterval(fetchDataAndSync, 5000);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});