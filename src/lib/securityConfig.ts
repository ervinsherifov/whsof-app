// Security Configuration for Production
export const SECURITY_CONFIG = {
  // HTTPS Requirements
  forceHTTPS: import.meta.env.PROD,
  
  // Content Security Policy
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "blob:", "https:"],
    connectSrc: [
      "'self'", 
      "https://fqiwvhzdnozxgabguogq.supabase.co",
      "wss://fqiwvhzdnozxgabguogq.supabase.co",
      "https://api.sentry.io"
    ],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    upgradeInsecureRequests: import.meta.env.PROD
  },

  // Session Security
  session: {
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    inactivityTimeout: 30 * 60 * 1000, // 30 minutes
    refreshThreshold: 15 * 60 * 1000, // 15 minutes before expiry
  },

  // API Security
  api: {
    rateLimit: {
      requests: 100,
      windowMs: 15 * 60 * 1000, // 15 minutes
    },
    timeout: 30000, // 30 seconds
  },

  // File Upload Security
  fileUpload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    scanForMalware: import.meta.env.PROD,
  }
};

// Security Headers to implement on server
export const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

// Runtime security checks
export const checkSecurityRequirements = () => {
  const issues: string[] = [];

  // Check HTTPS in production
  if (import.meta.env.PROD && location.protocol !== 'https:') {
    issues.push('HTTPS is required in production');
  }

  // Check for secure context features
  if (!window.isSecureContext) {
    issues.push('Application requires secure context (HTTPS)');
  }

  // Check for required browser features
  if (!window.crypto || !window.crypto.subtle) {
    issues.push('Browser does not support Web Crypto API');
  }

  return {
    isSecure: issues.length === 0,
    issues
  };
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>&"']/g, (match) => {
      const escapeMap: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return escapeMap[match];
    })
    .trim();
};

// File validation
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (file.size > SECURITY_CONFIG.fileUpload.maxSize) {
    return { valid: false, error: 'File too large' };
  }

  if (!SECURITY_CONFIG.fileUpload.allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }

  return { valid: true };
};