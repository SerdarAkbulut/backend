const express = require('express');
const axios = require('axios');
const https = require('https');
const cors = require('cors'); 
const supabase = require('./db');

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
      await supabase.rpc('execute_sql', { sql: hesapkoduTableQuery });
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

      const { data: checkResult, error: checkError } = await supabase
        .from('hesapkodu')
        .select('id')
        .eq('id', apiId);

      if (checkError) {
        throw new Error(checkError.message);
      }

      if (checkResult.length > 0) {
        const { error: updateError } = await supabase
          .from('hesapkodu')
          .update({ kod: hesap_kodu, description: hesap_adi, borc: borc || 0 })
          .eq('id', apiId);

        if (updateError) {
          throw new Error(updateError.message);
        }
      } else {
        const { error: insertError } = await supabase
          .from('hesapkodu')
          .insert([{ id: apiId, kod: hesap_kodu || null, description: hesap_adi || null, borc: borc || 0 }]);

        if (insertError) {
          throw new Error(insertError.message);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
};

app.get('/api/data', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hesapkodu')
      .select('*');

    if (error) {
      throw new Error(error.message);
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

setInterval(fetchDataAndSync, 5000);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});