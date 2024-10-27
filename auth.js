const axios = require('axios');

async function getM2MToken() {
  const options = {
    method: 'POST',
    url: `${process.env.M2M_TOKEN_URL}/oauth/token`,
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      client_id: process.env.M2M_CLIENT_ID,
      client_secret: process.env.M2M_CLIENT_SECRET,
      audience: process.env.M2M_AUDIENCE,
      grant_type: 'client_credentials'
    }
  };

  const response = await axios(options);
  return response.data.access_token;
}

module.exports = { getM2MToken };
  