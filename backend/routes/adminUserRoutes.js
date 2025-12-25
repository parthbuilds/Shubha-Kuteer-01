import express from "express";
import bcrypt from "bcrypt";
import pool from "../utils/db.js";

const router = express.Router();


// GET /api/admin/users/:id → return logged in admin details
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            "SELECT id, name, email, role, permissions, phone FROM admins WHERE id = ?",
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: "Admin not found ❌" });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ message: "Database error ❌" });
    }
});

// Middleware to parse ID from URL
router.use("/:id", (req, res, next) => {
    req.params.id = req.params.id || null;
    next();
});

// 🔹 GET all admins
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT id, name, email, role, permissions, phone FROM admins ORDER BY id DESC");
        res.json(rows);
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ message: "Database error ❌" });
    }
});

// 🔹 POST /admin/users → Add new admin
router.post("/", async (req, res) => {
    const { name, email, password, role, permissions, phone } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    try {
        const [rows] = await pool.query("SELECT * FROM admins WHERE email = ?", [email]);
        if (rows.length > 0) {
            return res.status(400).json({ message: "Admin already exists" });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        await pool.query(
            "INSERT INTO admins (name, email, password_hash, role, permissions, phone) VALUES (?, ?, ?, ?, ?, ?)",
            [name || null, email, passwordHash, role || "admin", JSON.stringify(permissions) || "[]", phone || null]
        );
        res.json({ message: "Admin added successfully ✅" });
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ message: "Database error ❌" });
    }
});

// 🔹 GET /admin/users/:id → Get single admin
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query("SELECT id, name, email, role, permissions, phone FROM admins WHERE id = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ message: "Admin not found ❌" });
        res.json(rows[0]);
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ message: "Database error ❌" });
    }
});

// 🔹 PUT /admin/users/:id → Update admin
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { name, email, role, permissions, phone } = req.body;
    try {
        await pool.query(
            "UPDATE admins SET name = ?, email = ?, role = ?, permissions = ?, phone = ? WHERE id = ?",
            [name || null, email, role || "admin", JSON.stringify(permissions) || "[]", phone || null, id]
        );
        res.json({ message: "Admin updated successfully ✅" });
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ message: "Database error ❌" });
    }
});

// 🔹 DELETE /admin/users/:id → Delete admin + user
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM admins WHERE id = ?", [id]);
        await pool.query("DELETE FROM users WHERE id = ?", [id]);
        res.json({ message: "Admin and linked user deleted successfully ✅" });
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ message: "Database error ❌" });
    }
});

export default router;
