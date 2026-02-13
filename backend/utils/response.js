/**
 * Standardized Response Utilities
 * Provides consistent success/error response format across all API endpoints
 * All responses are emoji-free as per user requirements
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {Object} data - Data to send
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    });
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {Object} details - Additional error details (only in development)
 */
export const errorResponse = (res, message = 'An error occurred', statusCode = 500, details = null) => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString()
    };

    // Include stack trace and details only in development
    if (isDevelopment && details) {
        response.details = details;
        if (details instanceof Error) {
            response.stack = details.stack;
            response.message = details.message;
        }
    }

    return res.status(statusCode).json(response);
};

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {Array|string} errors - Validation errors
 */
export const validationErrorResponse = (res, errors) => {
    return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Array.isArray(errors) ? errors : [errors],
        timestamp: new Date().toISOString()
    });
};

/**
 * Send unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
export const unauthorizedResponse = (res, message = 'Unauthorized') => {
    return res.status(401).json({
        success: false,
        message,
        timestamp: new Date().toISOString()
    });
};

/**
 * Send forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
export const forbiddenResponse = (res, message = 'Forbidden') => {
    return res.status(403).json({
        success: false,
        message,
        timestamp: new Date().toISOString()
    });
};

/**
 * Send not found response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
export const notFoundResponse = (res, message = 'Resource not found') => {
    return res.status(404).json({
        success: false,
        message,
        timestamp: new Date().toISOString()
    });
};

/**
 * Send conflict response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
export const conflictResponse = (res, message = 'Resource already exists') => {
    return res.status(409).json({
        success: false,
        message,
        timestamp: new Date().toISOString()
    });
};

/**
 * Send rate limit exceeded response
 * @param {Object} res - Express response object
 * @param {number} retryAfter - Seconds to wait before retrying
 */
export const rateLimitResponse = (res, retryAfter) => {
    return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
        retryAfter,
        timestamp: new Date().toISOString()
    });
};

/**
 * Send server error response
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 */
export const serverErrorResponse = (res, error) => {
    const response = {
        success: false,
        message: 'Internal server error',
        timestamp: new Date().toISOString()
    };

    if (isDevelopment) {
        response.message = error.message || 'Internal server error';
        response.stack = error.stack;
    }

    return res.status(500).json(response);
};

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors automatically
 * @param {Function} fn - Async route handler
 * @returns {Function} - Wrapped route handler
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            console.error('Async handler error:', error);
            serverErrorResponse(res, error);
        });
    };
};

/**
 * Paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Data array
 * @param {Object} pagination - Pagination info
 * @param {string} message - Success message
 */
export const paginatedResponse = (res, data, pagination, message = 'Success') => {
    return res.status(200).json({
        success: true,
        message,
        data,
        pagination: {
            page: pagination.page || 1,
            limit: pagination.limit || 10,
            total: pagination.total || 0,
            totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10))
        },
        timestamp: new Date().toISOString()
    });
};

export default {
    successResponse,
    errorResponse,
    validationErrorResponse,
    unauthorizedResponse,
    forbiddenResponse,
    notFoundResponse,
    conflictResponse,
    rateLimitResponse,
    serverErrorResponse,
    asyncHandler,
    paginatedResponse
};
