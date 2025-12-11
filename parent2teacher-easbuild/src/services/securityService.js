/**
 * Security Service - Turvallisuuspalvelut
 * 
 * Sisältää:
 * - Input validation ja sanitization
 * - XSS prevention
 * - Rate limiting
 * - Content filtering
 * - Security headers
 */
 
export class SecurityService {
  
  // Rate limiting - estää liian nopeat pyynnöt
  static rateLimits = new Map();
  
  /**
   * Sanitoi käyttäjän syöte XSS-hyökkäyksiltä
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validoi ja sanitoi objektin kaikki string-kentät
   */
  static sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Validoi käyttäjänimen
   */
  static validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { isValid: false, message: 'Käyttäjänimi on pakollinen' };
    }
    
    const trimmed = username.trim();
    
    if (trimmed.length < 2) {
      return { isValid: false, message: 'Käyttäjänimen tulee olla vähintään 2 merkkiä' };
    }
    
    if (trimmed.length > 50) {
      return { isValid: false, message: 'Käyttäjänimi on liian pitkä (max 50 merkkiä)' };
    }
    
    // Sallitaan vain kirjaimet, numerot, välilyönnit ja perus välimerkit
    const validPattern = /^[a-zA-ZäöåÄÖÅ0-9\s\-_.]+$/;
    if (!validPattern.test(trimmed)) {
      return { isValid: false, message: 'Käyttäjänimi sisältää kiellettyjä merkkejä' };
    }
    
    // Tarkista sopimattomia sanoja
    const inappropriateWords = [
      'admin', 'administrator', 'moderator', 'system', 'null', 'undefined',
      'test', 'demo', 'example', 'sample', 'root', 'support'
    ];
    
    if (inappropriateWords.some(word => trimmed.toLowerCase().includes(word))) {
      return { isValid: false, message: 'Käyttäjänimi sisältää varattuja sanoja' };
    }
    
    return { isValid: true, sanitized: this.sanitizeInput(trimmed) };
  }

  /**
   * Validoi puhelinnumero
   */
  static validatePhoneNumber(phone) {
    if (!phone) {
      return { isValid: false, message: 'Puhelinnumero on pakollinen' };
    }
    
    // Poista kaikki muut merkit paitsi numerot ja +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Suomalaiset puhelinnumerot
    const finnishMobile = /^(\+358|0)[1-9][0-9]{7,8}$/;
    
    if (!finnishMobile.test(cleaned)) {
      return { isValid: false, message: 'Virheellinen puhelinnumero (käytä suomalaista numeroa)' };
    }
    
    // Normalisoi muotoon +358...
    let normalized = cleaned;
    if (normalized.startsWith('0')) {
      normalized = '+358' + normalized.substring(1);
    }
    
    return { isValid: true, sanitized: normalized };
  }

  /**
   * Validoi kuvaus/bio
   */
  static validateDescription(description) {
    if (!description) {
      return { isValid: true, sanitized: '' }; // Ei pakollinen
    }
    
    if (typeof description !== 'string') {
      return { isValid: false, message: 'Kuvaus tulee olla tekstiä' };
    }
    
    const trimmed = description.trim();
    
    if (trimmed.length > 1000) {
      return { isValid: false, message: 'Kuvaus on liian pitkä (max 1000 merkkiä)' };
    }
    
    // Tarkista sopimattomia sisältöjä
    const inappropriatePatterns = [
      /https?:\/\/[^\s]+/gi, // URL:t
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, // Email-osoitteet
      /\b\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,8}\b/g // Puhelinnumerot
    ];
    
    for (const pattern of inappropriatePatterns) {
      if (pattern.test(trimmed)) {
        return { isValid: false, message: 'Kuvauksessa ei saa olla yhteystietoja tai URL-osoitteita' };
      }
    }
    
    return { isValid: true, sanitized: this.sanitizeInput(trimmed) };
  }

  /**
   * Rate limiting - tarkista onko käyttäjä lähettänyt liian monta pyyntöä
   */
  static checkRateLimit(identifier, maxRequests = 5, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.rateLimits.has(identifier)) {
      this.rateLimits.set(identifier, []);
    }
    
    const requests = this.rateLimits.get(identifier);
    
    // Poista vanhat pyynnöt
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    
    if (recentRequests.length >= maxRequests) {
      return {
        allowed: false,
        message: `Liian monta pyyntöä. Yritä uudelleen ${Math.ceil(windowMs / 1000)} sekunnin kuluttua.`,
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      };
    }
    
    // Lisää uusi pyyntö
    recentRequests.push(now);
    this.rateLimits.set(identifier, recentRequests);
    
    return {
      allowed: true,
      remaining: maxRequests - recentRequests.length
    };
  }

  /**
   * Validoi profiikuvan tiedot
   */
  static validateProfileImage(file) {
    if (!file) {
      return { isValid: true }; // Ei pakollinen
    }
    
    // Tarkista tiedostotyyppi
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, message: 'Sallitut kuvatiedostot: JPEG, PNG, WebP' };
    }
    
    // Tarkista tiedostokoko (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { isValid: false, message: 'Kuvatiedosto on liian suuri (max 5MB)' };
    }
    
    return { isValid: true };
  }

  /**
   * Generoi turvallinen file name
   */
  static generateSafeFileName(originalName, userId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop().toLowerCase();
    
    // Sanitoi alkuperäinen nimi
    const safeName = originalName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 20);
    
    return `${userId}_${timestamp}_${random}_${safeName}.${extension}`;
  }

  /**
   * Validoi tag-lista
   */
  static validateTags(tags) {
    if (!Array.isArray(tags)) {
      return { isValid: false, message: 'Tagit tulee olla lista' };
    }
    
    if (tags.length === 0) {
      return { isValid: false, message: 'Valitse vähintään yksi oppiaine' };
    }
    
    if (tags.length > 10) {
      return { isValid: false, message: 'Liian monta oppiainetta (max 10)' };
    }
    
    // Validoi jokainen tag
    const validTags = [];
    for (const tag of tags) {
      if (typeof tag !== 'string') {
        return { isValid: false, message: 'Virheellinen tag-tyyppi' };
      }
      
      const trimmed = tag.trim();
      if (trimmed.length === 0) {
        continue; // Ohita tyhjät
      }
      
      if (trimmed.length > 50) {
        return { isValid: false, message: 'Tag on liian pitkä (max 50 merkkiä)' };
      }
      
      validTags.push(this.sanitizeInput(trimmed));
    }
    
    return { isValid: true, sanitized: validTags };
  }

  /**
   * Tarkista onko IP-osoite estetty
   */
  static isIPBlocked(ip) {
    // Tämä olisi normaalisti tietokannassa
    const blockedIPs = new Set([
      // Esimerkkejä haitallisista IP:istä
    ]);
    
    return blockedIPs.has(ip);
  }

  /**
   * Generoi CSRF token
   */
  static generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validoi CSRF token
   */
  static validateCSRFToken(token, expectedToken) {
    if (!token || !expectedToken) {
      return false;
    }
    
    return token === expectedToken;
  }

  /**
   * Logi security-tapahtuma
   */
  static logSecurityEvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };
    
    // Tuotannossa lähetettäisiin security-monitorointiin
    // await sendToSecurityMonitoring(logEntry);
  }

  /**
   * Tarkista onko syöte safe injection-hyökkäyksiltä
   */
  static isSafeFromInjection(input) {
    if (typeof input !== 'string') {
      return true;
    }
    
    // SQL injection patterns
    const sqlPatterns = [
      /('|(\\')|(;)|(\|)|(\*)|(%27)|(%22)|(%3B)|(%7C)|(%2A))/i,
      /(union|select|insert|delete|update|drop|create|alter|exec|execute)/i
    ];
    
    // Script injection patterns
    const scriptPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi
    ];
    
    const allPatterns = [...sqlPatterns, ...scriptPatterns];
    
    return !allPatterns.some(pattern => pattern.test(input));
  }
}

export default SecurityService;