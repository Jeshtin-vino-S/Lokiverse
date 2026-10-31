import User from "../models/user_model.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";

export const signup = async (req, res) => {
    try {
        const { username, fullname, password, email } = req.body;

        if (!username || !fullname || !password || !email) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        // Password validation
        if (password.length < 8) {
            return res.status(400).json({ error: "Min 8 characters required" });
        }

        // Existing username and email validation
        const existingUsername = await User.findOne({ username });
        const existingEmail = await User.findOne({ email });

        if (existingEmail || existingUsername) {
            return res.status(400).json({ error: "username or email already exists" });
        }

        // Password hashing
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            fullname,
            email,
            password: hashedPassword
        });

        if (newUser) {
            const token = generateToken(newUser._id, res);
            await newUser.save();
            res.status(200).json({
                message: "Avenger created successfully,Welcome to Lokiverse!",
                username: newUser.username,
                token,
                user: newUser
            });
        } else {
            res.status(400).json({ error: "invalid Avenger data" });
        }
    } catch (error) {
        console.log(`error in signup : ${error}`);
        res.status(500).json({ error: "Interval server error" });
    }
};

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "username or password required" });
        }

        const user = await User.findOne({ username });
        const isPasswordCorrect = await bcrypt.compare(password, user?.password || "");

        if (!user || !isPasswordCorrect) {
            return res.status(200).json({ error: "invalid username or password" });
        }
        const token = generateToken(user._id, res);
        res.status(200).json({
            message: "Login successfully!",
            token,
            user
        });
    } catch (error) {
        console.log(`error in login :${error}`);
        res.status(400).json({ error: "internal server error" });
    }
};

export const logout = async (req, res) => {
    try {
        res.cookie("jwt", "", { maxAge: 0 });
        res.status(200).json({ message: "Logout from HQ" });
    } catch (error) {
        console.log(`error in logout : ${error}`);
        res.status(500).json({ error: "internal server error" });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.user._id })
            .select("-password")
            .populate({ path: "followers", select: "username fullname profileImg bio lastSeen" })
            .populate({ path: "following", select: "username fullname profileImg bio lastSeen" });
        const token = req.cookies.jwt;
        res.status(200).json({
            ...user.toObject(),
            token
        });
    } catch (error) {
        console.log(`error in getme : ${error}`);
        res.status(500).json({ error: "Internal server error" });
    }
};
