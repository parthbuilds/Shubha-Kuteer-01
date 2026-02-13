/**
 * Security Middleware Utilities
 * Provides rate limiting, input validation, and sanitization helpers
 */

/**
 * Rate limiter configuration
 * Note: For Vercel serverless functions, rate limiting should be implemented
 * using a Redis-backed solution or Vercel's edge config. This is a basic in-memory
 * implementation suitable for development/small-scale deployments.
 */
export const rateLimitConfig = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        message: "Too many requests from this IP, please try again later."
    }
};

/**
 * In-memory rate limiter (for development only)
 * In production, use Redis or Vercel Edge Config
 */
const rateLimitStore = new Map();

/**
 * Simple rate limiter middleware
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} maxRequests - Maximum requests allowed in window
 * @returns {Function} - Middleware function
 */
export const createRateLimiter = (windowMs = rateLimitConfig.windowMs, maxRequests = rateLimitConfig.maxRequests) => {
    return (req, res, next) => {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const now = Date.now();

        // Clean old entries
        for (const [key, value] of rateLimitStore.entries()) {
            if (now - value.resetTime > windowMs) {
                rateLimitStore.delete(key);
            }
        }

        // Get or create rate limit info for this IP
        let rateLimitInfo = rateLimitStore.get(ip);

        if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
            // Create new rate limit window
            rateLimitInfo = {
                count: 1,
                resetTime: now + windowMs
            };
            rateLimitStore.set(ip, rateLimitInfo);
            next();
            return;
        }

        // Increment counter
        rateLimitInfo.count += 1;

        if (rateLimitInfo.count > maxRequests) {
            const resetTimeRemaining = Math.ceil((rateLimitInfo.resetTime - now) / 1000);
            return res.status(429).json({
                success: false,
                message: "Too many requests, please try again later.",
                retryAfter: resetTimeRemaining
            });
        }

        next();
    };
};

/**
 * Rate limiters for specific endpoints
 */
export const authRateLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 requests per 15 minutes
export const generalRateLimiter = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes

/**
 * Input validation helpers
 */
export const validators = {
    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} - Is valid email
     */
    isEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {Object} - Validation result
     */
    validatePassword: (password) => {
        const errors = [];

        if (password.length < 8) {
            errors.push("Password must be at least 8 characters long");
        }
        if (!/[A-Z]/.test(password)) {
            errors.push("Password must contain at least one uppercase letter");
        }
        if (!/[a-z]/.test(password)) {
            errors.push("Password must contain at least one lowercase letter");
        }
        if (!/[0-9]/.test(password)) {
            errors.push("Password must contain at least one number");
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    /**
     * Validate phone number (Indian format)
     * @param {string} phone - Phone number to validate
     * @returns {boolean} - Is valid phone
     */
    isPhone: (phone) => {
        const phoneRegex = /^[6-9]\d{9}$/;
        return phoneRegex.test(phone);
    },

    /**
     * Sanitize string input
     * @param {string} input - Input to sanitize
     * @returns {string} - Sanitized input
     */
    sanitizeString: (input) => {
        if (typeof input !== 'string') return '';
        return input
            .trim()
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .slice(0, 1000); // Limit length
    },

    /**
     * Validate numeric input
     * @param {*} value - Value to validate
     * @returns {boolean} - Is valid number
     */
    isNumber: (value) => {
        return !isNaN(value) && isFinite(value);
    },

    /**
     * Validate positive number
     * @param {*} value - Value to validate
     * @returns {boolean} - Is valid positive number
     */
    isPositiveNumber: (value) => {
        return validators.isNumber(value) && parseFloat(value) > 0;
    },

    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @returns {boolean} - Is valid URL
     */
    isURL: (url) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Validate MongoDB ObjectId
     * @param {string} id - ID to validate
     * @returns {boolean} - Is valid ObjectId
     */
    isValidId: (id) => {
        return typeof id === 'string' && id.length > 0 && /^[a-fA-F0-9]{24}$/.test(id);
    }
};

/**
 * Sanitize request body
 * Removes potentially dangerous content from request body
 * @param {Object} body - Request body
 * @returns {Object} - Sanitized body
 */
export const sanitizeBody = (body) => {
    const sanitized = {};

    for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string') {
            sanitized[key] = validators.sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeBody(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
};

/**
 * Validation middleware factory
 * @param {Object} schema - Validation schema
 * @returns {Function} - Middleware function
 */
export const validate = (schema) => {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];

            // Check required
            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} is required`);
                continue;
            }

            // Skip validation if field is optional and not provided
            if (!rules.required && (value === undefined || value === null || value === '')) {
                continue;
            }

            // Type validation
            if (rules.type && typeof value !== rules.type) {
                errors.push(`${field} must be of type ${rules.type}`);
            }

            // Custom validation
            if (rules.validate && !rules.validate(value)) {
                errors.push(rules.message || `${field} is invalid`);
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }

        next();
    };
};

/**
 * SQL injection prevention
 * Escapes special SQL characters
 * @param {string} input - Input to escape
 * @returns {string} - Escaped input
 */
export const escapeSQL = (input) => {
    if (typeof input !== 'string') return input;
    return input.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
        switch (char) {
            case '\0': return '\\0';
            case '\x08': return '\\b';
            case '\x09': return '\\t';
            case '\x1a': return '\\z';
            case '\n': return '\\n';
            case '\r': return '\\r';
            case '"':
            case "'":
            case '\\':
            case '%': return '\\' + char;
        }
    });
};

/**
 * XSS prevention
 * Converts dangerous characters to HTML entities
 * @param {string} input - Input to escape
 * @returns {string} - Escaped input
 */
export const escapeHTML = (input) => {
    if (typeof input !== 'string') return input;
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };
    return input.replace(/[&<>"'/]/g, (char) => map[char]);
};

export default {
    rateLimitConfig,
    createRateLimiter,
    authRateLimiter,
    generalRateLimiter,
    validators,
    sanitizeBody,
    validate,
    escapeSQL,
    escapeHTML
};
