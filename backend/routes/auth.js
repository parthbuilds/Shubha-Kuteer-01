import bcrypt from "bcrypt";
import pool from "../utils/db.js";
import jwt from "jsonwebtoken";

const BCRYPT_SALT_ROUNDS = 10;

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}
const JWT_SECRET = process.env.JWT_SECRET;

export const registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }
    try {
        const [existingUser] = await pool.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );
        if (existingUser.length > 0) {
            return res.status(409).json({ message: "Email already registered" });
        }
        const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
        await pool.query(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            [name, email, password_hash]
        );
        res.status(201).json({ message: "Registration successful! " });
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ message: "An error occurred during registration." });
    }
};

export const loginUser = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }
    try {
        const [rows] = await pool.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
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
        res.status(200).json({ message: "Login successful! Welcome back.", token });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "An error occurred during login." });
    }
};
