import express from 'express';
import protectRoute from '../middleware/protectRoute.js';
import { upload } from '../middleware/multer.js';
import { followUnFollowUser, getProfile, getSuggestedUser, updateUser, searchUsers, getUserById } from '../controller/user_controller.js';

const router = express.Router();

router.get("/search", protectRoute, searchUsers);
router.get("/user-by-id/:id", protectRoute, getUserById);
router.get("/profile/:username", protectRoute, getProfile);
router.post("/follow/:id", protectRoute, followUnFollowUser);
router.get("/suggested", protectRoute, getSuggestedUser);
router.post(
    "/update",
    protectRoute,
    upload.fields([
        { name: "profileImg", maxCount: 1 },
        { name: "coverImg", maxCount: 1 }
    ]),
    updateUser
);

export default router;
