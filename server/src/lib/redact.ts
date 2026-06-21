const SENSITIVE_PATTERNS = [
  { regex: /(Authorization:\s*|Bearer\s+)(\S+)/gi, replacement: '$1[REDACTED]' },
  { regex: /(X-Nova-User-Id:\s*)(\S+)/gi, replacement: '$1[REDACTED]' },
  { regex: /(api[_-]?key|apikey|token|secret|password|private_key|access_token|refresh_token)(["'\s:=]+)(\S{4})(\S+)/gi, replacement: '$1$2$3[REDACTED]' },
  { regex: /(accessToken|refreshToken|tokenType|expiryDate)(["'\s:=]+)(\S{4})(\S+)/g, replacement: '$1$2$3[REDACTED]' },
];

export function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    let result = value;
    for (const { regex, replacement } of SENSITIVE_PATTERNS) {
      result = result.replace(regex, replacement);
    }
    return result;
  }
  if (value && typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(redact);
    }
    const obj = value as Record<string, unknown>;
    const redacted: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('password') ||
        lower.includes('key') ||
        lower === 'authorization'
      ) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redact(obj[key]);
      }
    }
    return redacted;
  }
  return value;
}

export function safeStringify(value: unknown, space?: number): string {
  return JSON.stringify(redact(value), null, space);
}
