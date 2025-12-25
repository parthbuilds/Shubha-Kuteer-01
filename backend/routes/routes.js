import express from "express";
import bcrypt from "bcrypt";
import pool from "../utils/db.js";

const router = express.Router();

const BCRYPT_SALT_ROUNDS = 10;

// Corrected route path: changed from "/auth/register" to "/register"
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }
    try {
        const [existingMember] = await pool.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );
        if (existingMember.length > 0) {
            return res.status(409).json({ message: "Email already registered" });
        }
        const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
        await pool.query(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            [name, email, password_hash]
        );
        res.status(201).json({ message: "Registration successful! 🎉" });
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ message: "An error occurred during registration." });
    }
});

// Corrected route path: changed from "/auth/login" to "/login"
router.post("/login", async (req, res) => {
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
        const member = rows[0];
        const isMatch = await bcrypt.compare(password, member.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        res.status(200).json({ message: "Login successful! Welcome back." });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "An error occurred during login." });
    }
});

export default router;
