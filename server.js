const express = require('express');
const dotenv = require('dotenv');
const https = require('https');
const fs = require('fs');
const { auth } = require('express-openid-connect');
const tickets = require('./routes/tickets');
const pool = require('./db');
const { requiresAuth } = require('express-openid-connect');

dotenv.config();

const app = express();
const port = 3000;

const sslOptions = {
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.cert')
};

https.createServer(sslOptions, app)
  .listen(port, () => {
      console.log(`Server running at https://localhost:${port}/`);
  });

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SECRET,
  baseURL: process.env.BASE_URL,
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
      res.status(500).send('Greška prilikom učitavanja stranice');
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
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/tickets/:ticketId', async (req, res) => {
  const ticketId = req.params.ticketId;

  try {
      const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
      console.log(result.rows[0]);

      if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Ulaznica nije pronađena' });
      }
      const ticket = result.rows[0];
      res.json({
          vatin: ticket.vatin,
          firstName: ticket.firstname,
          lastName: ticket.lastname,
          created_at: ticket.created_at
      });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Greška na serveru' });
  }
});
  
app.use(express.json());

app.use((req, res, next) => {
  console.log(`Zahtev za: ${req.url}`);
  next();
});


app.use('/tickets', tickets);
app.use(express.static('public'));