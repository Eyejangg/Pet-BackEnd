const jwt = require("jsonwebtoken");
require("dotenv").config();
const secret = process.env.JWT_SECRET;

const verifyToken = (req, res, next) => {
    const token = req.headers["x-access-token"];
    console.log("x-access-token:", token); // แสดง Log เพื่อตรวจสอบค่า Token

    if (!token) {
        return res.status(401).send({ message: "Token is missing" });
    }
    jwt.verify(token, secret, (err, decoded) => {
        if (err) return res.status(403).send({ message: "Access Forbidden" });
        req.username = decoded.username;
        req.authorId = decoded.id;
        req.role = decoded.role; // เพิ่ม Role เพื่อใช้ตรวจสอบสิทธิ์ในภายหลัง (เช่น Admin/Owner)
        next();
    });
};

const authJwt = {
    verifyToken,
};
module.exports = authJwt;
