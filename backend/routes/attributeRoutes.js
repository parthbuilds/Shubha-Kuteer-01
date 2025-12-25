import express from "express";
import pool from "../utils/db.js";

const router = express.Router();


router.post("/", async (req, res) => {
    const { category_id, attribute_name, attribute_values } = req.body;

    // Validate that all required fields are present
    if (!category_id || !attribute_name || !attribute_values) {
        return res.status(400).json({
            error: "Missing required fields: category_id, attribute_name, and attribute_values",
        });
    }

    // Validate that attribute_values is a non-empty array
    if (!Array.isArray(attribute_values) || attribute_values.length === 0) {
        return res.status(400).json({
            error: "attribute_values must be a non-empty array of objects.",
        });
    }

    try {
        const [result] = await pool.query(
            // Use the new SQL query that supports the JSON data type
            `INSERT INTO attributes (category_id, attribute_name, attribute_values) 
            VALUES (?, ?, ?)`,
            [category_id, attribute_name, JSON.stringify(attribute_values)]
        );

        res.status(201).json({
            success: true,
            id: result.insertId,
            message: "Attribute added successfully",
        });
    } catch (err) {
        console.error("DB Insert Error:", err);
        res.status(500).json({ error: "Server error. Could not add attribute." });
    }
});

router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT a.id, a.attribute_name, a.attribute_values, a.created_at,
                   c.name AS category_name
            FROM attributes a
            LEFT JOIN categories c ON a.category_id = c.id
            ORDER BY a.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error("DB Fetch Error:", err);
        res.status(500).json({ error: "Server error. Could not fetch attributes." });
    }
});

router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM attributes WHERE id = ?", [id]);
        res.json({ success: true, message: "Attribute deleted successfully" });
    } catch (err) {
        console.error("DB Delete Error:", err);
        res.status(500).json({ error: "Server error. Could not delete attribute." });
    }
});

export default router;
