import mysql from "mysql2/promise";
import "dotenv/config";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Correctly resolve __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create the connection pool with Hostinger-compatible SSL settings
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: {
      rejectUnauthorized: false, // Hostinger requires this to be false
  },
  waitForConnections: true,
  connectionLimit: 5, // Reduced for serverless
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
});

// Export the pool using the ES Module default export syntax
export default pool;