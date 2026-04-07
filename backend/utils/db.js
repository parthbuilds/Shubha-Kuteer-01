import mysql from "mysql2/promise";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Only import dotenv in development
if (process.env.NODE_ENV !== 'production') {
    const dotenv = await import('dotenv');
    dotenv.config();
}

// Correctly resolve __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error(
        `Missing required environment variables: ${missingEnvVars.join(', ')}\n` +
        `Please set these variables in your .env file or Vercel dashboard.`
    );
}

// Create the connection pool with Hostinger-compatible SSL settings
let pool;

try {
    pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        ssl: {
            rejectUnauthorized: false,
        },
        waitForConnections: true,
        connectionLimit: 2, // Reduced for serverless
        queueLimit: 0,
        acquireTimeout: 30000,
        timeout: 30000,
        idleTimeout: 30000, // Close idle connections after 30s
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
    });

    // Connection pool monitoring (only in development)
    if (process.env.NODE_ENV !== 'production') {
        pool.on('connection', (connection) => {
            console.log('New database connection established');
        });

        pool.on('acquire', (connection) => {
            console.log('Connection %d acquired', connection.threadId);
        });

        pool.on('release', (connection) => {
            console.log('Connection %d released', connection.threadId);
        });

        pool.on('enqueue', () => {
            console.log('Waiting for available connection slot');
        });
    }

    pool.on('error', (err) => {
        console.error('Database pool error:', err);
    });

} catch (error) {
    console.error('Failed to create database pool:', error);
    // Create a mock pool that will throw descriptive errors
    pool = {
        query: async () => {
            throw new Error('Database connection not available. Check environment variables.');
        },
        getConnection: async () => {
            throw new Error('Database connection not available. Check environment variables.');
        }
    };
}

// Health check utility
export const healthCheck = async () => {
    try {
        if (!pool || !pool.query) {
            return { status: 'unhealthy', database: 'disconnected', error: 'Pool not initialized' };
        }
        const [rows] = await pool.query('SELECT 1 as test');
        return { status: 'healthy', database: 'connected', test: rows[0] };
    } catch (error) {
        console.error('Database health check failed:', error);
        return { status: 'unhealthy', database: 'disconnected', error: error.message };
    }
};

// Export the pool using the ES Module default export syntax
export default pool;