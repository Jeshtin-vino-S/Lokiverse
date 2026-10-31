import express from "express";
import protectRoute from "../middleware/protectRoute.js";
import {
  getMessageHistory,
  getUnreadMessageCount,
  markMessagesAsRead,
  unsendMessage,
  editMessage,
  reactToMessage,
} from "../controller/message_controller.js";

const router = express.Router();

// GET /api/messages/unread-count
router.get("/unread-count", protectRoute, getUnreadMessageCount);

// PUT /api/messages/:roomId/read
router.put("/:roomId/read", protectRoute, markMessagesAsRead);

// DELETE /api/messages/:messageId (Unsend from DB)
router.delete("/:messageId", protectRoute, unsendMessage);

// PUT /api/messages/:messageId (Edit message text)
router.put("/:messageId", protectRoute, editMessage);

// POST /api/messages/:messageId/react (Add or toggle emoji reaction)
router.post("/:messageId/react", protectRoute, reactToMessage);

// GET /api/messages/:roomId?before=<createdAt>&limit=30
router.get("/:roomId", protectRoute, getMessageHistory);

export default router;

