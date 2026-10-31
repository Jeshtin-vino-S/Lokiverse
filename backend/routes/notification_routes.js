import express from "express";
import protectRoute from "../middleware/protectRoute.js";
import {
    getNotifications,
    deleteNotifications,
    deleteNotificationById,
    getUnreadNotificationCount
} from "../controller/notification_controller.js";

const router = express.Router();

router.get("/unread", protectRoute, getUnreadNotificationCount);
router.get("/", protectRoute, getNotifications);
router.delete("/", protectRoute, deleteNotifications);
router.delete("/:id", protectRoute, deleteNotificationById);

export default router;

