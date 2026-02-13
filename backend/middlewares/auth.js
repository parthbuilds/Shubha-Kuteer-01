import jwt from "jsonwebtoken";
import pool from "../utils/db.js";

// Validate JWT_SECRET exists
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Extract JWT token from Authorization header or cookies
 * @param {Object} req - Request object
 * @returns {string|null} - JWT token or null
 */
export const extractToken = (req) => {
    // Try Authorization header first (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }

    // Try cookies
    if (req.cookies) {
        // Check for admin token
        if (req.cookies.adminToken) {
            return req.cookies.adminToken;
        }
        // Check for user token
        if (req.cookies.userToken) {
            return req.cookies.userToken;
        }
    }

    return null;
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded token or null
 */
export const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * User authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticateUser = async (req, res, next) => {
    try {
        const token = extractToken(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: No token provided"
            });
        }

        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Invalid token"
            });
        }

        // Fetch user from database
        const [users] = await pool.query(
            "SELECT id, name, email, phone FROM users WHERE id = ?",
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User not found"
            });
        }

        req.user = users[0];
        next();
    } catch (error) {
        console.error("User authentication error:", error);
        return res.status(500).json({
            success: false,
            message: "Authentication failed",
            error: error.message
        });
    }
};

/**
 * Admin authentication middleware
 * Verifies JWT token and attaches admin to request
 */
export const authenticateAdmin = async (req, res, next) => {
    try {
        const token = extractToken(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: No token provided"
            });
        }

        const decoded = verifyToken(token);

        if (!decoded || decoded.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Invalid admin token"
            });
        }

        // Fetch admin from database
        const [admins] = await pool.query(
            "SELECT id, name, email, role, permissions FROM admins WHERE id = ?",
            [decoded.id]
        );

        if (admins.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Admin not found"
            });
        }

        req.admin = admins[0];
        next();
    } catch (error) {
        console.error("Admin authentication error:", error);
        return res.status(500).json({
            success: false,
            message: "Authentication failed",
            error: error.message
        });
    }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't block if not
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const token = extractToken(req);

        if (token) {
            const decoded = verifyToken(token);
            if (decoded) {
                // Try to fetch user
                const [users] = await pool.query(
                    "SELECT id, name, email FROM users WHERE id = ?",
                    [decoded.id]
                );
                if (users.length > 0) {
                    req.user = users[0];
                }
            }
        }

        next();
    } catch (error) {
        // Don't block, just continue without user
        next();
    }
};

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} - JWT token
 */
export const generateUserToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "1h" }
    );
};

/**
 * Generate JWT token for admin
 * @param {Object} admin - Admin object
 * @returns {string} - JWT token
 */
export const generateAdminToken = (admin) => {
    return jwt.sign(
        { id: admin.id, email: admin.email, role: admin.role },
        JWT_SECRET,
        { expiresIn: "2h" }
    );
};

export default {
    extractToken,
    verifyToken,
    authenticateUser,
    authenticateAdmin,
    optionalAuth,
    generateUserToken,
    generateAdminToken
};
