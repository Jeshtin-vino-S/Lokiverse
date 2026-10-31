import jwt from 'jsonwebtoken';
import User from '../models/user_model.js';

const protectRoute = async (req, res, next) => {
    try {
        const token =
            req.cookies?.jwt ||
            (req.headers?.authorization?.startsWith("Bearer ")
                ? req.headers.authorization.split(" ")[1]
                : null);

        if (!token) {
            return res.status(401).json({ error: "Unauthorized: No token provided" });
        }

        const secret = process.env.JWT_SECRET || "lokiverse_jwt_secret_key_default_2026";
        const decoded = jwt.verify(token, secret);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ error: "Unauthorized: Invalid Token" });
        }

        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.log(`error in protectRoute : ${error}`);
        res.status(500).json({ error: "Internal server error" });
    }
};

export default protectRoute;
