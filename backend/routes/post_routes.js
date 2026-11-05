import express from 'express';
import protectRoute from '../middleware/protectRoute.js';
import { upload } from '../middleware/multer.js';
import { 
    createPost, 
    likeUnlikePost, 
    createComment, 
    deletePost,
    getAllPosts,
    getFollowingPosts,
    getUserPosts,
    getLikedPosts,
    getUserReplies,
    saveUnsavePost,
    getSavedPosts,
    getSavedPostIds
} from '../controller/post_controller.js';

const router = express.Router();

// GET routes
router.get("/all", protectRoute, getAllPosts);
router.get("/following", protectRoute, getFollowingPosts);
router.get("/saved/ids", protectRoute, getSavedPostIds);
router.get("/saved", protectRoute, getSavedPosts);
router.get("/likes/:id", protectRoute, getLikedPosts);
router.get("/user/:username", protectRoute, getUserPosts);
router.get("/replies/:username", protectRoute, getUserReplies);

// POST & DELETE routes
router.post(
    "/create",
    protectRoute,
    upload.fields([
        { name: "img", maxCount: 1 },
        { name: "image", maxCount: 1 },
        { name: "video", maxCount: 1 }
    ]),
    createPost
);
router.post("/like/:id", protectRoute, likeUnlikePost);
router.post("/save/:id", protectRoute, saveUnsavePost);
router.post("/comment/:id", protectRoute, createComment);
router.delete("/delete/:id", protectRoute, deletePost);
router.delete("/:id", protectRoute, deletePost);

export default router;
