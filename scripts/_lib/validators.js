// Pure field-shape validators. Extracted from validate-content.js so they
// can be unit-tested in isolation. Each returns null on valid, or a string
// describing the problem.

const ISBN_RE = /^[0-9X-]{10,17}$/i;
function validateIsbn(value) {
  if (value == null || value === '') return null;
  const raw = String(value);
  if (!ISBN_RE.test(raw)) return `malformed ISBN "${raw}"`;
  const digits = raw.replace(/[-\s]/g, '');
  if (digits.length !== 10 && digits.length !== 13) {
    return `ISBN "${raw}" should be 10 or 13 digits (got ${digits.length})`;
  }
  return null;
}

const URL_RE = /^(https?:\/\/|\/\/|\/|images\/|data\/|\.\.?\/)/i;
function validateUrl(value, fieldName) {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (raw === '#') return null;
  if (!URL_RE.test(raw)) return `${fieldName} "${raw}" doesn't look like a URL or path`;
  return null;
}

function validateYear(value, fieldName = 'year') {
  if (value == null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return `${fieldName} "${value}" is not numeric`;
  if (num < 1000 || num > 2200) return `${fieldName} ${num} out of range (1000–2200)`;
  return null;
}

function validateDate(value, fieldName, { warnFuture = false } = {}) {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { error: `${fieldName} "${raw}" is not a parseable date` };
  if (warnFuture && parsed.getTime() > Date.now() + 86400000) {
    return { warning: `${fieldName} "${raw}" is in the future` };
  }
  return null;
}

module.exports = { validateIsbn, validateUrl, validateYear, validateDate };
