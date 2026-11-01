import User from "../models/user_model.js";
import Notification from "../models/notification_model.js";
import bcrypt from "bcryptjs";
import { fileToDataUrl } from "../middleware/multer.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

export const getProfile = async (req, res) => {
    try {
        const { username } = req.params;

        const user = await User.findOne({ username })
            .select("-password")
            .populate({ path: "followers", select: "username fullname profileImg bio lastSeen" })
            .populate({ path: "following", select: "username fullname profileImg bio lastSeen" });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        console.log(`error in get profile : ${error}`);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const followUnFollowUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userToModify = await User.findById(id);
        const currentUser = await User.findById(req.user._id);

        if (id === req.user._id.toString()) {
            return res.status(400).json({ error: "You cannot follow or unfollow yourself!" });
        }

        if (!userToModify || !currentUser) {
            return res.status(404).json({ error: "Avenger not found" });
        }

        const isFollowing = currentUser.following.includes(id);

        if (isFollowing) {
            // unfollow
            await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
            await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });

            res.status(200).json({ message: "User unfollowed successfully" });
        } else {
            // follow
            await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
            await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });

            // Create notification in database
            const newNotification = new Notification({
                type: "follow",
                from: req.user._id,
                to: userToModify._id,
            });
            await newNotification.save();

            res.status(200).json({ message: "User followed successfully" });
        }
    } catch (error) {
        console.log(`error in follow and un follow : ${error}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getSuggestedUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const userFollowedByMe = await User.findById(userId).select("-password");

        const users = await User.aggregate([
            {
                $match: {
                    _id: { $ne: userId }
                }
            },
            {
                $sample: {
                    size: 10
                }
            }
        ]);

        const followingIds = (userFollowedByMe.following || []).map((id) => id.toString());
        const filteredUser = users.filter((user) => !followingIds.includes(user._id.toString()));
        const suggestedUsers = filteredUser.slice(0, 4);

        suggestedUsers.forEach((user) => (user.password = null));
        res.status(200).json(suggestedUsers);
    } catch (error) {
        console.log(`error in get suggest user : ${error}`);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const updateUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const { username, fullname, email, currentPassword, newPassword, bio, link } = req.body;
        let { profileImg, coverImg } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Password change logic (only if password change is requested)
        if ((!newPassword && currentPassword) || (!currentPassword && newPassword)) {
            return res.status(400).json({ error: "Please provide both current and new password" });
        }

        if (newPassword && currentPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: "Current password is incorrect" });
            }
            if (newPassword.length < 8) {
                return res.status(400).json({ error: "Password must be at least 8 characters" });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        // --- PROFILE IMAGE: UPLOAD OR REMOVE ---
        // 1. Uploaded via Multer file
        if (req.files && req.files.profileImg && req.files.profileImg[0]) {
            if (user.profileImg) {
                await deleteFromCloudinary(user.profileImg);
            }
            const dataUri = fileToDataUrl(req.files.profileImg[0]);
            user.profileImg = await uploadToCloudinary(dataUri, "lokiverse/avatars");
        }
        // 2. Remove profile image (empty string, null, or removeProfileImg: true)
        else if (
            profileImg === "" ||
            profileImg === "null" ||
            profileImg === null ||
            req.body.removeProfileImg === "true" ||
            req.body.removeProfileImg === true
        ) {
            if (user.profileImg) {
                await deleteFromCloudinary(user.profileImg);
            }
            user.profileImg = "";
        }
        // 3. String URL or Base64 provided in body
        else if (profileImg && typeof profileImg === "string") {
            if (profileImg.startsWith("data:image/")) {
                if (user.profileImg) await deleteFromCloudinary(user.profileImg);
                user.profileImg = await uploadToCloudinary(profileImg, "lokiverse/avatars");
            } else {
                user.profileImg = profileImg;
            }
        }

        // --- COVER IMAGE: UPLOAD OR REMOVE ---
        // 1. Uploaded via Multer file
        if (req.files && req.files.coverImg && req.files.coverImg[0]) {
            if (user.coverImg) {
                await deleteFromCloudinary(user.coverImg);
            }
            const dataUri = fileToDataUrl(req.files.coverImg[0]);
            user.coverImg = await uploadToCloudinary(dataUri, "lokiverse/covers");
        }
        // 2. Remove cover image (empty string, null, or removeCoverImg: true)
        else if (
            coverImg === "" ||
            coverImg === "null" ||
            coverImg === null ||
            req.body.removeCoverImg === "true" ||
            req.body.removeCoverImg === true
        ) {
            if (user.coverImg) {
                await deleteFromCloudinary(user.coverImg);
            }
            user.coverImg = "";
        }
        // 3. String URL or Base64 provided in body
        else if (coverImg && typeof coverImg === "string") {
            if (coverImg.startsWith("data:image/")) {
                if (user.coverImg) await deleteFromCloudinary(user.coverImg);
                user.coverImg = await uploadToCloudinary(coverImg, "lokiverse/covers");
            } else {
                user.coverImg = coverImg;
            }
        }

        // Update other text fields
        user.fullname = fullname || user.fullname;
        user.email = email || user.email;
        user.username = username || user.username;
        user.bio = bio !== undefined ? bio : user.bio;
        user.link = link !== undefined ? link : user.link;

        await user.save();

        user.password = null;
        return res.status(200).json(user);
    } catch (error) {
        console.error("error in update user :", error?.message || error);
        res.status(500).json({ error: error?.message || "Internal server error" });
    }
};

export const searchUsers = async (req, res) => {
    try {
        const query = req.query.q || "";
        const currentUserId = req.user._id;

        const filter = {
            _id: { $ne: currentUserId },
        };

        if (query.trim()) {
            filter.$or = [
                { username: { $regex: query.trim(), $options: "i" } },
                { fullname: { $regex: query.trim(), $options: "i" } },
            ];
        }

        const users = await User.find(filter)
            .select("username fullname profileImg bio lastSeen")
            .limit(20);

        res.status(200).json(users);
    } catch (error) {
        console.log(`error in searchUsers : ${error}`);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select("username fullname profileImg bio lastSeen");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        console.log(`error in getUserById : ${error}`);
        res.status(500).json({ error: "Internal server error" });
    }
};
