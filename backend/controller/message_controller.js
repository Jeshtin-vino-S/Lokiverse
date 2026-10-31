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

/**
 * Get total unread message count and room breakdown for current user
 * GET /api/messages/unread-count
 */
export const getUnreadMessageCount = async (req, res) => {
  try {
    const currentUserId = req.user._id.toString();
    const currentUsername = req.user.username;

    // Find all unread messages in 1-to-1 rooms that involve this user where sender is not this user
    const unreadMessages = await Message.find({
      roomId: { $regex: currentUserId },
      sender: { $ne: currentUsername },
      read: { $ne: true },
    })
      .select("roomId")
      .lean();

    const unreadByRoom = {};
    unreadMessages.forEach((msg) => {
      unreadByRoom[msg.roomId] = (unreadByRoom[msg.roomId] || 0) + 1;
    });

    // Number of distinct users/allies with unread messages (for Sidebar badge)
    const unreadUserCount = Object.keys(unreadByRoom).length;

    res.status(200).json({
      unreadUserCount,
      unreadCount: unreadUserCount, // Sidebar shows how many users messaged
      totalMessagesCount: unreadMessages.length,
      unreadByRoom, // Inbox inside shows exact message count per user
    });
  } catch (error) {
    console.error("Error in getUnreadMessageCount:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Mark all messages in a room as read for the current user
 * PUT /api/messages/:roomId/read
 */
export const markMessagesAsRead = async (req, res) => {
  try {
    const { roomId } = req.params;
    const currentUsername = req.user.username;

    if (!roomId) {
      return res.status(400).json({ error: "roomId is required" });
    }

    await Message.updateMany(
      {
        roomId: roomId.trim(),
        sender: { $ne: currentUsername },
        read: { $ne: true },
      },
      {
        $set: { read: true },
      }
    );

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Unsend (Delete) a message from DB
 * DELETE /api/messages/:messageId
 */
export const unsendMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUsername = req.user.username;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.sender !== currentUsername) {
      return res.status(403).json({ error: "You can only unsend your own messages" });
    }

    await Message.findByIdAndDelete(messageId);

    res.status(200).json({
      message: "Message unsent successfully",
      messageId,
      roomId: message.roomId,
    });
  } catch (error) {
    console.error("Error in unsendMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Edit a message
 * PUT /api/messages/:messageId
 */
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const currentUsername = req.user.username;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Message text cannot be empty" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.sender !== currentUsername) {
      return res.status(403).json({ error: "You can only edit your own messages" });
    }

    // 5-minute limit check: Messages can only be edited within 5 minutes of sending
    const EDIT_WINDOW_MS = 5 * 60 * 1000;
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    if (messageAge > EDIT_WINDOW_MS) {
      return res.status(400).json({ error: "Messages can only be edited within 5 minutes of sending" });
    }

    message.text = text.trim();
    message.isEdited = true;
    const updated = await message.save();

    res.status(200).json(updated);
  } catch (error) {
    console.error("Error in editMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * React to a message with an emoji (toggle reaction)
 * POST /api/messages/:messageId/react
 */
export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const currentUsername = req.user.username;

    if (!emoji || typeof emoji !== "string") {
      return res.status(400).json({ error: "Emoji is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (!Array.isArray(message.reactions)) {
      message.reactions = [];
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.user === currentUsername
    );

    if (existingIndex > -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        // Toggle off if same emoji clicked again
        message.reactions.splice(existingIndex, 1);
      } else {
        // Update to new emoji
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      // Add new reaction
      message.reactions.push({ user: currentUsername, emoji });
    }

    await message.save();

    res.status(200).json({
      messageId: message._id,
      roomId: message.roomId,
      reactions: message.reactions,
    });
  } catch (error) {
    console.error("Error in reactToMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

