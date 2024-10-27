const express = require('express');
const dotenv = require('dotenv');
const https = require('https');
const fs = require('fs');
const { auth } = require('express-openid-connect');
const tickets = require('./routes/tickets');
const pool = require('./db');
const { requiresAuth } = require('express-openid-connect');
const { getM2MToken } = require('./auth');

dotenv.config();

const app = express();
const externalUrl = process.env.RENDER_EXTERNAL_URL;
const port = externalUrl && process.env.PORT ? parseInt(process.env.PORT) : 3000;

const sslOptions = {
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.cert')
};

if (externalUrl) {
  const hostname = '0.0.0.0';
  app.listen(port, hostname, () => {
    console.log(`Server locally running at http://${hostname}:${port}/ and from outside on ${externalUrl}`);    
    });
} else {
  https.createServer(sslOptions, app)
    .listen(port, () => {
      console.log(`Server running at https://localhost:${port}/`);
    });
}

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SECRET,
  baseURL: externalUrl || `https://localhost:${port}`,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: process.env.ISSUER_BASE_URL,
};

app.use(auth(config));

app.get('/', (req, res) => {
  console.log("Ruta je pogođena za index");
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/login', (req, res) => {
  console.log('Login ruta pogođena');
  res.oidc.login();
});

app.get('/logout', (req, res) => {
  console.log('Logout ruta pogođena');
  res.oidc.logout();
});

app.get('/profile', requiresAuth(), (req, res) => {
  res.send(JSON.stringify(req.oidc.user));
});

app.get('/tickets/:ticketId', requiresAuth(), async (req, res) => {
  console.log("Ruta je pogođena s ticketId:", req.params.ticketId);

  res.sendFile(__dirname + '/public/ticket.html', (err) => {
    if (err) {
      console.log('Greška prilikom slanja filea:', err);
      res.status(500).json({ status: 500, message: 'Greška prilikom učitavanja stranice', error: err.message });
    }
  });
});

app.get('/api/ticket-count', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM tickets');
    const count = parseInt(result.rows[0].count, 10);
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 500, message: 'Greška u bazi podataka', error: err.message });
  }
});

app.get('/api/tickets/:ticketId', requiresAuth(), async (req, res) => {
  const ticketId = req.params.ticketId;

  try {
      const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
      console.log(result.rows[0]);

      if (result.rows.length === 0) {
        return res.status(404).json({ status: 404, message: 'Ulaznica nije pronađena' });
      }
      const ticket = result.rows[0];
      const userEmail = req.oidc.user.email;

      let token;
      try {
        token = await getM2MToken();
        console.log('M2M token:', token);
      } catch (error) {
        console.error('Greška prilikom dobijanja M2M tokena:', error);
        return res.status(500).json({ status: 500, message: 'Greška prilikom dobijanja M2M tokena', error: error.message });
      }

      res.json({
          vatin: ticket.vatin,
          firstName: ticket.firstname,
          lastName: ticket.lastname,
          created_at: ticket.created_at,
          email: userEmail
      });
  } catch (err) {
      console.error(err);
      res.status(500).json({ status: 500, message: 'Greška na serveru', error: err.message });
  }
});
  
app.use(express.json());
app.use((req, res, next) => {
  console.log(`Zahtev za: ${req.url}`);
  next();
});
app.use('/tickets', tickets);
app.use(express.static('public'));