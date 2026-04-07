import bcrypt from "bcryptjs";
import pool from "../utils/db.js";
import jwt from "jsonwebtoken";

const BCRYPT_SALT_ROUNDS = 10;

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}
const JWT_SECRET = process.env.JWT_SECRET;

export const registerUser = async (req, res) => {
    // Destructure phone from req.body
    const { name, email, phone, password } = req.body;

    // Validate all required fields, including phone
    if (!name || !email || !phone || !password) {
        return res.status(400).json({ message: "Name, email, phone, and password are required" });
    }

    // Type validation
    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ message: "Invalid data types" });
    }

    try {
        // Check database connection first
        await pool.query('SELECT 1');

        // Check for existing user by email or phone
        const [existingUserByEmail] = await pool.query(
            "SELECT * FROM users WHERE email = ?",
            [email.trim().toLowerCase()]
        );
        if (existingUserByEmail.length > 0) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const [existingUserByPhone] = await pool.query(
            "SELECT * FROM users WHERE phone = ?",
            [phone.trim()]
        );
        if (existingUserByPhone.length > 0) {
            return res.status(409).json({ message: "Phone number already registered" });
        }

        const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

        // Insert new user with phone number
        await pool.query(
            "INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)",
            [name.trim(), email.trim().toLowerCase(), phone.trim(), password_hash]
        );
        return res.status(201).json({ message: "Registration successful!" });
    } catch (error) {
        console.error("Registration error:", error);
        
        // Provide more specific error messages
        if (error.message.includes('Database connection not available')) {
            return res.status(503).json({ message: "Service temporarily unavailable. Please try again later." });
        }
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({ message: "Database setup incomplete. Please contact support." });
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return res.status(503).json({ message: "Unable to connect to database. Please try again later." });
        }
        
        return res.status(500).json({ message: "Registration failed", error: error.message });
    }
};

export const loginUser = async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    // Type validation
    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ message: "Invalid data types" });
    }

    try {
        // Check database connection first
        await pool.query('SELECT 1');

        const [rows] = await pool.query(
            "SELECT id, name, email, phone, password_hash FROM users WHERE email = ?",
            [email.trim().toLowerCase()]
        );
        if (rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
        const [firstName, lastName] = user.name ? user.name.split(' ') : ['', ''];
        return res.status(200).json({
            message: "Login successful! Welcome back.",
            token,
            user: {
                id: user.id,
                first_name: firstName,
                last_name: lastName || '',
                email: user.email,
                phone_number: user.phone,
                dob: '',
                full_name: user.name
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        
        // Provide more specific error messages
        if (error.message.includes('Database connection not available')) {
            return res.status(503).json({ message: "Service temporarily unavailable. Please try again later." });
        }
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({ message: "Database setup incomplete. Please contact support." });
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return res.status(503).json({ message: "Unable to connect to database. Please try again later." });
        }
        
        return res.status(500).json({ message: "Login failed", error: error.message });
    }
};

export const checkAuth = async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: No token provided " });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const [rows] = await pool.query(
            "SELECT id, name, email, phone FROM users WHERE id = ?", // Select phone here too
            [decoded.id]
        );
        if (rows.length === 0) {
            return res.status(401).json({ message: "Unauthorized: User not found " });
        }
        const user = rows[0];
        const [firstName, lastName] = user.name ? user.name.split(' ') : ['', ''];
        return res.status(200).json({
            message: "Authorized ✅",
            user: {
                id: user.id,
                first_name: firstName,
                last_name: lastName || '',
                email: user.email,
                phone_number: user.phone, 
                dob: ''
            }
        });
    } catch (error) {
        console.error("Auth check error:", error);
        return res.status(401).json({ message: "Unauthorized: Invalid token ", error: error.message });
    }
};