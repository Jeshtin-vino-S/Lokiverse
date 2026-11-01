import User from "../models/user_model.js";
import Posts from "../models/post_schema.js";
import Notification from "../models/notification_model.js";
import { fileToDataUrl } from "../middleware/multer.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

export const createPost = async (req, res) => {
    try {
        const { text } = req.body;
        const userId = req.user._id.toString();

        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ error: "Avenger not found" });
        }

        let img = "";

        // 1. Check for file uploaded via Multer (multipart/form-data)
        const uploadedFile = req.file || (req.files?.img && req.files.img[0]) || (req.files?.image && req.files.image[0]);
        if (uploadedFile) {
            const dataUri = fileToDataUrl(uploadedFile);
            img = await uploadToCloudinary(dataUri, "lokiverse/posts");
        }
        // 2. Check for base64 or URL passed in req.body
        else if (req.body.img || req.body.image) {
            const rawImg = req.body.img || req.body.image;
            if (typeof rawImg === "string" && rawImg.trim() !== "") {
                if (rawImg.startsWith("data:image/")) {
                    img = await uploadToCloudinary(rawImg.trim(), "lokiverse/posts");
                } else {
                    img = rawImg.trim();
                }
            }
        }

        if (!text && !img) {
            return res.status(400).json({ error: "Post must have text or image" });
        }

        const newPost = new Posts({
            user: userId,
            text: text || "",
            img: img || ""
        });

        await newPost.save();

        await newPost.populate({
            path: "user",
            select: "-password"
        });

        return res.status(201).json(newPost);
    } catch (error) {
        console.error("error in create post :", error?.message || error);
        return res.status(500).json({ error: error?.message || "Internal server error" });
    }
};

export const likeUnlikePost = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id: postId } = req.params;

        const post = await Posts.findById(postId);

        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }

        const userLikePost = post.likes.some(
            (likeId) => likeId.toString() === userId.toString()
        );

        if (userLikePost) {
            // Unlike post
            await Posts.updateOne({ _id: postId }, { $pull: { likes: userId } });
            const updatedLikes = post.likes.filter(
                (likeId) => likeId.toString() !== userId.toString()
            );
            return res.status(200).json({ message: "Post unliked successfully", likes: updatedLikes });
        } else {
            // Like post
            post.likes.push(userId);
            await post.save();

            // Create notification if liking someone else's post
            if (post.user.toString() !== userId.toString()) {
                const notification = new Notification({
                    from: userId,
                    to: post.user,
                    type: "like"
                });
                await notification.save();
            }

            return res.status(200).json({ message: "Post liked successfully", likes: post.likes });
        }
    } catch (error) {
        console.log(`error in like and unlike post : ${error}`);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const createComment = async (req, res) => {
    try {
        const { text } = req.body;
        const { id: postId } = req.params;
        const userId = req.user._id;

        if (!text || text.trim() === "") {
            return res.status(400).json({ error: "Comment text is required" });
        }

        const post = await Posts.findById(postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }

        const comment = {
            user: userId,
            text: text.trim()
        };

        post.comments.push(comment);
        await post.save();

        await post.populate({
            path: "comments.user",
            select: "username fullname profileImg"
        });

        return res.status(200).json(post);
    } catch (error) {
        console.log(`error in create comment : ${error}`);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const deletePost = async (req, res) => {
    try {
        const { id } = req.params;

        const post = await Posts.findById(id);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }

        if (post.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ error: "You are not authorized to delete this post" });
        }

        // Delete post image from Cloudinary if it exists
        if (post.img) {
            await deleteFromCloudinary(post.img);
        }

        await Posts.findByIdAndDelete(id);

        return res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.log(`error in delete post : ${error}`);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getAllPosts = async (req, res) => {
    try {
        const posts = await Posts.find()
            .sort({ createdAt: -1 })
            .populate({
                path: "user",
                select: "username fullname profileImg bio followers following"
            })
            .populate({
                path: "comments.user",
                select: "username fullname profileImg bio followers following"
            })
            .populate({
                path: "likes",
                select: "username fullname profileImg bio followers following"
            });

        return res.status(200).json(posts || []);
    } catch (error) {
        console.log(`error in get all posts : ${error}`);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getFollowingPosts = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const following = user.following || [];
        const feedPosts = await Posts.find({ user: { $in: [...following, userId] } })
            .sort({ createdAt: -1 })
            .populate({
                path: "user",
                select: "username fullname profileImg bio followers following"
            })
            .populate({
                path: "comments.user",
                select: "username fullname profileImg bio followers following"
            })
            .populate({
                path: "likes",
                select: "username fullname profileImg bio followers following"
            });

        return res.status(200).json(feedPosts || []);
    } catch (error) {
        console.log(`error in get following posts : ${error}`);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getUserPosts = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: "User not found" });

        const posts = await Posts.find({ user: user._id })
            .sort({ createdAt: -1 })
            .populate({
                path: "user",
                select: "username fullname profileImg bio followers following"
            })
            .populate({
                path: "comments.user",
                select: "username fullname profileImg bio followers following"
            })
            .populate({
                path: "likes",
                select: "username fullname profileImg bio followers following"
            });

        return res.status(200).json(posts || []);
    } catch (error) {
        console.log(`error in get user posts : ${error}`);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getLikedPosts = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const posts = await Posts.find({ likes: userId })
            .sort({ createdAt: -1 })
            .populate({
                path: "user",
                select: "username fullname profileImg bio followers following"
            })
            .populate({
                path: "comments.user",
                select: "username fullname profileImg bio followers following"
            })
            .populate({
                path: "likes",
                select: "username fullname profileImg bio followers following"
            });

        return res.status(200).json(posts || []);
    } catch (error) {
        console.log(`error in get liked posts : ${error}`);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getUserReplies = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Posts authored by user that received comments, or posts where user replied
        const posts = await Posts.find({
            $or: [
                { user: user._id, "comments.0": { $exists: true } },
                { "comments.user": user._id }
            ]
        })
            .sort({ createdAt: -1 })
            .populate({
                path: "user",
                select: "username fullname profileImg bio followers following"
            })
            .populate({
                path: "comments.user",
                select: "username fullname profileImg bio followers following"
            })
            .populate({
                path: "likes",
                select: "username fullname profileImg bio followers following"
            });

        return res.status(200).json(posts || []);
    } catch (error) {
        console.log(`error in get user replies : ${error}`);
        return res.status(500).json({ error: "Internal server error" });
    }
};
