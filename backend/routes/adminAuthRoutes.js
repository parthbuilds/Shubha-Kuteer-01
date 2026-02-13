import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../utils/db.js";

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}
const JWT_SECRET = process.env.JWT_SECRET;
const router = express.Router();

// Admin Login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await pool.query("SELECT * FROM admins WHERE email = ?", [email]);
        if (rows.length === 0) return res.status(401).json({ message: "Invalid credentials " });

        const admin = rows[0];
        const isMatch = await bcrypt.compare(password, admin.password_hash);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials " });

        const token = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: "2h" });

        //  Path set to "/" so it's accessible on all pages
        res.cookie("adminToken", token, {
            httpOnly: true,
            path: "/",
            maxAge: 2 * 60 * 60 * 1000,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        });

        res.json({ message: "Login successful ", redirect: "/admin/index.html" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database error " });
    }
});

// Admin Logout
router.post("/logout", (req, res) => {
    res.cookie("adminToken", "", { httpOnly: true, path: "/admin", maxAge: 0, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    res.json({ message: "Logged out ", redirect: "/admin/login.html" });
});

// Auth check for frontend
router.get("/check", (req, res) => {
    const token = req.cookies?.adminToken;
    if (!token) return res.status(401).json({ message: "Unauthorized " });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ message: "Authorized ", admin: decoded });
    } catch {
        res.status(401).json({ message: "Unauthorized " });
    }
});

export default router;
