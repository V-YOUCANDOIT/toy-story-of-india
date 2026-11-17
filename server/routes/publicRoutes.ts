import { Router } from 'express';
import { getDb } from '../database/connection.ts';
import { contactSchema, newsletterSchema } from '../validators/schemas.ts';

const router = Router();

router.get('/health', (_req, res) => {
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

router.post('/newsletter', (req, res, next) => {
  try {
    const { email } = newsletterSchema.parse(req.body);
    const db = getDb();
    db.prepare(
      `INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)`
    ).run(email);
    res.status(201).json({ message: 'Thank you for joining the Petit Atelier letter.' });
  } catch (err) {
    next(err);
  }
});

router.post('/contact', (req, res, next) => {
  try {
    const data = contactSchema.parse(req.body);
    const db = getDb();
    db.prepare(
      `INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)`
    ).run(data.name, data.email, data.subject, data.message);
    res.status(201).json({
      message: 'Your inquiry has been received. Our concierge will respond within one business day.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
