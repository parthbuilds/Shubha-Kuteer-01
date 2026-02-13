import mysql from "mysql2/promise";
import "dotenv/config";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Correctly resolve __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    throw new Error(
        `Missing required environment variables: ${missingEnvVars.join(', ')}\n` +
        `Please set these variables in your .env file. See .env.example for reference.`
    );
}

// Create the connection pool with Hostinger-compatible SSL settings
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: {
      // Hostinger requires this to be false
      // In production, consider implementing proper SSL certificates
      // For more information: https://nodejs.org/api/tls.html#tls_class_tls_sslmethod
      rejectUnauthorized: false,
  },
  waitForConnections: true,
  connectionLimit: 5, // Reduced for serverless
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
});

// Connection pool monitoring
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

// Health check utility
export const healthCheck = async () => {
    try {
        const [rows] = await pool.query('SELECT 1 as test');
        return { status: 'healthy', database: 'connected', test: rows[0] };
    } catch (error) {
        console.error('Database health check failed:', error);
        return { status: 'unhealthy', database: 'disconnected', error: error.message };
    }
};

// Export the pool using the ES Module default export syntax
export default pool;