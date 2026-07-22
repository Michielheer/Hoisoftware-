// Beveiligingsmiddleware: security-headers, rate limiting, veilige
// bestandsnamen en foutafhandeling zonder interne details naar buiten.

// CSP afgestemd op wat de app echt gebruikt: eigen bundels, Google Fonts en
// inline style-attributen (React); verder niets.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export function securityHeaders(req, res, next) {
  res.set({
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  next();
}

// Eenvoudige rate limiter per IP (vast venster, in het geheugen). Bewust
// zonder externe dependency; bij horizontale schaling vervang je dit door een
// gedeelde limiter.
export function maakLimiter({ vensterMs, max }) {
  const emmers = new Map();
  const opschonen = setInterval(() => {
    const nu = Date.now();
    for (const [ip, emmer] of emmers) {
      if (nu - emmer.start > vensterMs) emmers.delete(ip);
    }
  }, vensterMs);
  opschonen.unref?.();

  return (req, res, next) => {
    const nu = Date.now();
    let emmer = emmers.get(req.ip);
    if (!emmer || nu - emmer.start > vensterMs) {
      emmer = { start: nu, aantal: 0 };
      emmers.set(req.ip, emmer);
    }
    emmer.aantal += 1;
    if (emmer.aantal > max) {
      res.set('Retry-After', String(Math.ceil((emmer.start + vensterMs - nu) / 1000)));
      return res.status(429).json({ error: 'Te veel verzoeken; probeer het over een minuut opnieuw.' });
    }
    next();
  };
}

// Waarden uit geüploade data mogen nooit rauw een Content-Disposition-header in.
export function veiligeBestandsnaam(s) {
  return String(s).replace(/[^\w.-]/g, '_').slice(0, 64) || 'bestand';
}

// Async routes netjes naar de centrale foutafhandeling leiden.
export const veilig = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

// Centrale foutafhandeling: client-fouten krijgen een nette melding,
// serverfouten worden gelogd maar lekken geen details naar buiten.
export function foutafhandeling(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Bestand te groot; maximaal 25 MB.' });
  }
  if (err?.status && err.status < 500) {
    return res.status(err.status).json({ error: 'Ongeldig verzoek.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Er ging iets mis op de server.' });
}
