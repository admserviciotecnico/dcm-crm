function sanitizeValue(value) {
  if (typeof value === 'string') {
    // NOTE: This global sanitizer strips angle brackets as a baseline XSS hardening.
    // It is intentionally schema-agnostic, so URL-like fields (e.g. foto_trabajo_url)
    // may be altered if they include '<' or '>' characters.
    return value.replace(/[<>]/g, '').trim();
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    const out = {};
    Object.entries(value).forEach(([k, v]) => {
      out[k] = sanitizeValue(v);
    });
    return out;
  }
  return value;
}

export function sanitizeBody(req, _res, next) {
  req.body = sanitizeValue(req.body ?? {});
  next();
}
