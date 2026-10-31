import express from "express";
import protectRoute from "../middleware/protectRoute.js";
import { getMessageHistory } from "../controller/message_controller.js";

const router = express.Router();

// GET /api/messages/:roomId?before=<createdAt>&limit=30
router.get("/:roomId", protectRoute, getMessageHistory);

export default router;

