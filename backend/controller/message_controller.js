import Message from "../models/Message.js";

/**
 * Cursor-based history & pagination:
 * GET /api/messages/:roomId?before=<createdAt>&limit=30
 */
export const getMessageHistory = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { before } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);

    if (!roomId) {
      return res.status(400).json({ error: "roomId is required" });
    }

    const query = { roomId: roomId.trim() };

    // Cursor-based pagination on createdAt ($lt: before), NOT skip
    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) {
        query.createdAt = { $lt: beforeDate };
      }
    }

    // Sort by createdAt descending, limit 30, use .lean(), then reverse so results are oldest to newest
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const chronologicalMessages = messages.reverse();

    res.status(200).json(chronologicalMessages);
  } catch (error) {
    console.error("Error in getMessageHistory:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

