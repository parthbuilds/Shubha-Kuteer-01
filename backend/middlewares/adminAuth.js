import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

const adminAuth = (req, res, next) => {
    const token = req.cookies?.adminToken;
    if (!token) {
        console.log("⛔ No token, redirecting to login");
        return res.redirect("/admin/login.html");
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        console.log("✅ Token valid for:", decoded.email);
        next();
    } catch (err) {
        console.log("❌ Invalid token, redirecting to login");
        return res.redirect("/admin/login.html");
    }
};

export default adminAuth;
