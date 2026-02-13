import express from "express";
import pool from "../utils/db.js";
import bcrypt from "bcrypt";

const router = express.Router();

// DEPRECATED: This route is no longer supported
// User management has been moved to database-backed authentication
// Please use /api/admin/users routes for admin management
router.get("/", (req, res) => {
    return res.status(410).json({
        message: "This endpoint has been deprecated",
        note: "User management is now handled through the database. Use /api/admin/users routes."
    });
});

router.post("/", (req, res) => {
    return res.status(410).json({
        message: "This endpoint has been deprecated",
        note: "User creation is now handled through the database. Use /api/admin/users routes."
    });
});

export default router;
