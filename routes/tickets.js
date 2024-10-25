const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const router = express.Router();
const pool = require('../db');
const { requiresAuth } = require('express-openid-connect');


router.post('/generate', async (req, res) => {
  const { vatin, firstName, lastName } = req.body;

  if (!vatin || !firstName || !lastName) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const result = await pool.query('SELECT COUNT(*) FROM tickets WHERE vatin = $1', [vatin]);
    const ticketCount = parseInt(result.rows[0].count, 10);
    
    if (ticketCount >= 3) {
      return res.status(400).json({ message: 'Maximum number of tickets reached for this OIB' });
    }

    const ticketId = uuidv4();
    const createdAt = new Date();

    await pool.query(
      'INSERT INTO tickets (id, vatin, firstName, lastName, created_at) VALUES ($1, $2, $3, $4, $5)',
      [ticketId, vatin, firstName, lastName, createdAt]
    );

    const ticketUrl = `https://localhost:3000/tickets/${ticketId}`;
    
    const qrCode = await QRCode.toDataURL(ticketUrl);
    
    res.json({ qrCode, ticketId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  const ticketId = req.params.id;

  try {
    const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    const ticket = result.rows[0];

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', error: err.message });
  }
});
  

module.exports = router;
