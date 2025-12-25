// routes/categoryRoutes.js
import express from "express";
import pool from "../utils/db.js";
import upload from "../utils/multer.js";
import cloudinary from "../utils/cloudinary.js";
import fs from "fs";
import path from "path";

const router = express.Router();

// POST → Add new category
router.post("/", upload.single("icon"), async (req, res) => {
    try {
        const { name, sale, data_item } = req.body;
        if (!name) return res.status(400).json({ message: "Category name required" });

        const finalDataItem = data_item?.trim() ? data_item : name.toLowerCase().replace(/\s+/g, "-");

        let iconPath = "/images/products/default-cat.png";
        let cloudinaryId = null;

        if (req.file) {
            if (process.env.NODE_ENV === "production") {
                iconPath = req.file.path;
                cloudinaryId = req.file.filename; // Cloudinary public_id
            } else {
                iconPath = `/uploads/categories/${req.file.filename}`;
            }
        }

        const [result] = await pool.query(
            "INSERT INTO categories (name, data_item, icon, cloudinary_id, sale) VALUES (?, ?, ?, ?, ?)",
            [name, finalDataItem, iconPath, cloudinaryId, sale || 0]
        );

        res.status(200).json({ message: "Category added!", data: { id: result.insertId, name, icon: iconPath } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error adding category", error: err.message });
    }
});

// DELETE → Delete category
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query("SELECT icon, cloudinary_id FROM categories WHERE id = ?", [id]);
        if (!rows.length) return res.status(404).json({ message: "Category not found" });

        const { icon, cloudinary_id } = rows[0];

        if (cloudinary_id && process.env.NODE_ENV === "production") {
            // Delete from Cloudinary
            await cloudinary.uploader.destroy(cloudinary_id);
        } else if (icon && icon.includes("/uploads/categories/")) {
            // Delete local file
            const filePath = path.join(process.cwd(), "public", icon);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await pool.query("DELETE FROM categories WHERE id = ?", [id]);
        res.status(200).json({ message: "Category deleted!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error deleting category", error: err.message });
    }
});

// PUT → Update category image
router.put("/:id/icon", upload.single("icon"), async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query("SELECT icon, cloudinary_id FROM categories WHERE id = ?", [id]);
        if (!rows.length) return res.status(404).json({ message: "Category not found" });

        const { icon: oldIcon, cloudinary_id: oldCloudId } = rows[0];

        let iconPath = oldIcon;
        let cloudinaryId = oldCloudId;

        if (req.file) {
            // Delete old
            if (oldCloudId && process.env.NODE_ENV === "production") await cloudinary.uploader.destroy(oldCloudId);
            else if (oldIcon && oldIcon.includes("/uploads/categories/")) {
                const filePath = path.join(process.cwd(), "public", oldIcon);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }

            // Set new
            if (process.env.NODE_ENV === "production") {
                iconPath = req.file.path;
                cloudinaryId = req.file.filename;
            } else {
                iconPath = `/uploads/categories/${req.file.filename}`;
            }
        }

        await pool.query("UPDATE categories SET icon = ?, cloudinary_id = ? WHERE id = ?", [iconPath, cloudinaryId, id]);
        res.status(200).json({ message: "Category image updated", icon: iconPath });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error updating image", error: err.message });
    }
});

export default router;
