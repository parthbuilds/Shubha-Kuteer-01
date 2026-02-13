import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}
const JWT_SECRET = process.env.JWT_SECRET;

const adminAuth = (req, res, next) => {
    const token = req.cookies?.adminToken;
    if (!token) {
        console.log("No token, redirecting to login");
        return res.redirect("/admin/login.html");
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        console.log("Token valid for:", decoded.email);
        next();
    } catch (err) {
        console.log("Invalid token, redirecting to login");
        return res.redirect("/admin/login.html");
    }
};

export default adminAuth;
