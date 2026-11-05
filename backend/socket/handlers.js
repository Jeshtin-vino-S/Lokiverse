import Message from "../models/Message.js";
import User from "../models/user_model.js";

// In-memory mapping of active users: userId -> Set of socket.id
const onlineUsersMap = new Map();

export const registerSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    const userId = socket.user?._id?.toString();

    // Track online user
    if (userId) {
      if (!onlineUsersMap.has(userId)) {
        onlineUsersMap.set(userId, new Set());
      }
      onlineUsersMap.get(userId).add(socket.id);

      // Join the user's personal private room for direct notification alerts
      socket.join(userId);
      if (socket.user?.username) {
        socket.join(socket.user.username);
      }

      // Broadcast list of active user IDs across the website
      io.emit("get_online_users", Array.from(onlineUsersMap.keys()));
    }

    // Client can request current online users at any time
    socket.on("request_online_users", () => {
      socket.emit("get_online_users", Array.from(onlineUsersMap.keys()));
    });

    // join_room event: joins the socket to the specified room
    socket.on("join_room", (roomId) => {
      if (!roomId || typeof roomId !== "string") {
        return socket.emit("message_error", { error: "Invalid roomId" });
      }
      const cleanRoomId = roomId.trim();
      if (!cleanRoomId) {
        return socket.emit("message_error", { error: "Room ID cannot be empty" });
      }
      socket.join(cleanRoomId);
    });

    // send_message event: validates input, saves to MongoDB first, then broadcasts to room
    socket.on("send_message", async (data) => {
      try {
        if (!data || typeof data !== "object") {
          return socket.emit("message_error", { error: "Invalid message payload" });
        }

        const { roomId, text, postId, post } = data;

        // Input validation: roomId present
        if (!roomId || typeof roomId !== "string" || !roomId.trim()) {
          return socket.emit("message_error", { error: "roomId is required" });
        }

        const cleanRoomId = roomId.trim();

        // Input validation: non-empty text, reasonable max length (5000 chars)
        if (!text || typeof text !== "string") {
          return socket.emit("message_error", { error: "Message text is required" });
        }

        const trimmedText = text.trim();
        if (trimmedText.length === 0) {
          return socket.emit("message_error", { error: "Message text cannot be empty" });
        }

        const MAX_TEXT_LENGTH = 5000;
        if (trimmedText.length > MAX_TEXT_LENGTH) {
          return socket.emit("message_error", {
            error: `Message exceeds maximum length of ${MAX_TEXT_LENGTH} characters`,
          });
        }

        // Sender is strictly taken from socket.user, NEVER from client payload
        const sender = socket.user?.username || socket.user?._id?.toString();
        if (!sender) {
          return socket.emit("message_error", { error: "Sender identity missing from session" });
        }

        // Ensure the sender socket is also joined in this room
        socket.join(cleanRoomId);

        // 1. Save to MongoDB first
        const newMessage = new Message({
          roomId: cleanRoomId,
          sender,
          text: trimmedText,
          post: postId || post || null,
        });

        const savedMessage = await newMessage.save();

        if (newMessage.post) {
          await savedMessage.populate({
            path: "post",
            populate: { path: "user", select: "username fullname profileImg bio" },
          });
        }

        // 2. Emit to clients in the room second
        io.to(cleanRoomId).emit("receive_message", savedMessage);

        // 3. If 1-to-1 chat, notify recipient socket directly for live unread badge updates
        if (cleanRoomId.includes("_")) {
          const parts = cleanRoomId.split("_");
          const recipientId = parts.find((id) => id !== userId);
          if (recipientId) {
            io.to(recipientId).emit("new_message_notification", {
              message: savedMessage,
              roomId: cleanRoomId,
            });
          }
        }
      } catch (error) {
        console.error("Socket send_message error:", error);
        // On a save failure, emit message_error to sender only
        socket.emit("message_error", {
          error: "Failed to send message: " + (error.message || "Database error"),
        });
      }
    });

    // mark_messages_read event: marks messages in a room as read for the current user
    socket.on("mark_messages_read", async (data) => {
      try {
        const roomId = data?.roomId;
        if (!roomId || !socket.user?.username) return;

        await Message.updateMany(
          {
            roomId: roomId.trim(),
            sender: { $ne: socket.user.username },
            read: { $ne: true },
          },
          { $set: { read: true } }
        );

        if (userId) {
          socket.emit("messages_read_confirmed", { roomId: roomId.trim() });
        }
      } catch (err) {
        console.error("Error in socket mark_messages_read:", err);
      }
    });

    // unsend_message event: deletes message from MongoDB and emits to room
    socket.on("unsend_message", async (data) => {
      try {
        const { messageId, roomId } = data || {};
        if (!messageId || !socket.user?.username) return;

        const message = await Message.findById(messageId);
        if (!message) return;

        if (message.sender !== socket.user.username) {
          return socket.emit("message_error", { error: "You can only unsend your own messages" });
        }

        // Delete from DB
        await Message.findByIdAndDelete(messageId);

        const targetRoom = (roomId || message.roomId)?.trim();
        io.to(targetRoom).emit("message_unsent", { messageId, roomId: targetRoom });
      } catch (err) {
        console.error("Error in socket unsend_message:", err);
      }
    });

    // edit_message event: updates text in DB and emits to room
    socket.on("edit_message", async (data) => {
      try {
        const { messageId, roomId, text } = data || {};
        if (!messageId || !text || typeof text !== "string" || !text.trim() || !socket.user?.username) return;

        const message = await Message.findById(messageId);
        if (!message) return;

        if (message.sender !== socket.user.username) {
          return socket.emit("message_error", { error: "You can only edit your own messages" });
        }

        // 5-minute limit check: Messages can only be edited within 5 minutes of sending
        const EDIT_WINDOW_MS = 5 * 60 * 1000;
        const messageAge = Date.now() - new Date(message.createdAt).getTime();
        if (messageAge > EDIT_WINDOW_MS) {
          return socket.emit("message_error", {
            error: "Messages can only be edited within 5 minutes of sending",
          });
        }

        message.text = text.trim();
        message.isEdited = true;
        const updated = await message.save();

        const targetRoom = (roomId || message.roomId)?.trim();
        io.to(targetRoom).emit("message_edited", updated);
      } catch (err) {
        console.error("Error in socket edit_message:", err);
      }
    });

    // react_message event: toggles reaction in DB and emits to room
    socket.on("react_message", async (data) => {
      try {
        const { messageId, roomId, emoji } = data || {};
        if (!messageId || !emoji || !socket.user?.username) return;

        const message = await Message.findById(messageId);
        if (!message) return;

        if (!Array.isArray(message.reactions)) {
          message.reactions = [];
        }

        const username = socket.user.username;
        const existingIndex = message.reactions.findIndex((r) => r.user === username);

        if (existingIndex > -1) {
          if (message.reactions[existingIndex].emoji === emoji) {
            // Toggle off
            message.reactions.splice(existingIndex, 1);
          } else {
            // Update to new emoji
            message.reactions[existingIndex].emoji = emoji;
          }
        } else {
          message.reactions.push({ user: username, emoji });
        }

        await message.save();

        const targetRoom = (roomId || message.roomId)?.trim();
        io.to(targetRoom).emit("message_reaction_updated", {
          messageId: message._id,
          roomId: targetRoom,
          reactions: message.reactions,
        });
      } catch (err) {
        console.error("Error in socket react_message:", err);
      }
    });

    // On disconnect, remove socket from active user's sockets and update list
    socket.on("disconnect", () => {
      if (userId && onlineUsersMap.has(userId)) {
        const userSockets = onlineUsersMap.get(userId);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsersMap.delete(userId);
          const now = new Date();
          User.findByIdAndUpdate(userId, { lastSeen: now }).catch(console.error);
          io.emit("user_last_seen", { userId, lastSeen: now.toISOString() });
        }
        io.emit("get_online_users", Array.from(onlineUsersMap.keys()));
      }
    });
  });
};

export default registerSocketHandlers;
