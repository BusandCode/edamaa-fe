/**
 * Simple Basic Auth middleware for Express
 *
 * Protects the Bull Board dashboard with HTTP Basic Auth using environment
 * variables `QUEUES_UI_USER` and `QUEUES_UI_PASS`. Defaults are provided for
 * local development but must be overridden in production.
 */
import { Request, Response, NextFunction } from 'express';

export function basicAuth(req: Request, res: Response, next: NextFunction) {
  const user = process.env.QUEUES_UI_USER || 'admin';
  const pass = process.env.QUEUES_UI_PASS || 'password';

  const auth = req.headers.authorization;
  if (!auth) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Protected"');
    return res.status(401).send('Authentication required');
  }

  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Basic') {
    res.setHeader('WWW-Authenticate', 'Basic realm="Protected"');
    return res.status(401).send('Invalid authentication header');
  }

  const credentials = Buffer.from(parts[1], 'base64').toString();
  const idx = credentials.indexOf(':');
  if (idx < 0) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Protected"');
    return res.status(401).send('Invalid authentication header');
  }

  const reqUser = credentials.slice(0, idx);
  const reqPass = credentials.slice(idx + 1);

  if (reqUser === user && reqPass === pass) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Protected"');
  return res.status(401).send('Invalid credentials');
}
