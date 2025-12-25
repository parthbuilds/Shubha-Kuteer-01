// backend/routes/categoryRoutes.js
import express from "express";
import pool from "../utils/db.js";

const router = express.Router();

// 🔹 POST → Add new category
router.post("/", async (req, res) => {
    try {
        const { name, sale, data_item } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Category name is required!" });
        }

        // Always generate a slug if missing
        const finalDataItem = data_item?.trim() || name.toLowerCase().replace(/\s+/g, "");

        const [result] = await pool.query(
            "INSERT INTO categories (name, data_item, sale) VALUES (?, ?, ?)",
            [name, finalDataItem, sale || 0]
        );

        return res.status(200).json({
            message: "Category added successfully!",
            data: { id: result.insertId, name, data_item: finalDataItem, sale: sale || 0 }
        });
    } catch (err) {
        console.error("❌ Failed to add category:", err);
        return res.status(500).json({ message: "Failed to add category", error: err.message });
    }
});

// 🔹 GET → Fetch all categories (simple list for admin form)
router.get("/public", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT id, name, data_item, sale, created_at
            FROM categories
            ORDER BY created_at DESC
        `);

        res.json(rows);
    } catch (err) {
        console.error("Error fetching categories:", err);
        res.status(500).json({ message: "Error fetching categories", error: err.message });
    }
});

// 🔹 DELETE → Delete category
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM categories WHERE id = ?", [id]);
        return res.status(200).json({ message: "Category deleted successfully!" });
    } catch (err) {
        console.error("❌ Failed to delete category:", err);
        return res.status(500).json({ message: "Failed to delete category", error: err.message });
    }
});

export default router;
