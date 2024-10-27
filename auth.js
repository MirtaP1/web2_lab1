const https = require('https');
const { URLSearchParams } = require('url');

async function getM2MToken() {
    const tokenUrl = `https://dev-t1sxq37bujxh2ecq.us.auth0.com/oauth/token`;
  
    const params = new URLSearchParams();
    params.append('client_id', process.env.M2M_CLIENT_ID);
    params.append('client_secret', process.env.M2M_CLIENT_SECRET);
    params.append('audience', process.env.M2M_AUDIENCE);
    params.append('grant_type', 'client_credentials');
  
    return new Promise((resolve, reject) => {
      const req = https.request(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(params.toString())
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
  
        res.on('end', () => {
          try {
            const jsonResponse = JSON.parse(data);
            resolve(jsonResponse.access_token);
          } catch (error) {
            reject(new Error('Greška u parsiranju odgovora: ' + error.message));
          }
        });
      });
  
      req.on('error', (error) => {
        reject(new Error('Greška prilikom slanja zahteva: ' + error.message));
      });
  
      req.write(params.toString());
      req.end();
    });
}

module.exports = { getM2MToken };
  