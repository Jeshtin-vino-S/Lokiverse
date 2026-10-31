import jwt from 'jsonwebtoken';

const generateToken = (userId, res) => {
    const secret = process.env.JWT_SECRET || "lokiverse_jwt_secret_key_default_2026";
    const token = jwt.sign({ userId }, secret, {
        expiresIn: "15d"
    });

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("jwt", token, {
        maxAge: 15 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction, // HTTPS required when sameSite is 'none' on Render
    });

    return token;
};

export default generateToken;
