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

      // Broadcast list of active user IDs across the website
      io.emit("get_online_users", Array.from(onlineUsersMap.keys()));
      console.log(`User online: @${socket.user?.username} (${userId}). Total online: ${onlineUsersMap.size}`);
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
      console.log(`Socket ${socket.id} (@${socket.user?.username}) joined room: ${cleanRoomId}`);
    });

    // send_message event: validates input, saves to MongoDB first, then broadcasts to room
    socket.on("send_message", async (data) => {
      try {
        if (!data || typeof data !== "object") {
          return socket.emit("message_error", { error: "Invalid message payload" });
        }

        const { roomId, text } = data;

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
        });

        const savedMessage = await newMessage.save();

        // 2. Emit to clients in the room second
        io.to(cleanRoomId).emit("receive_message", savedMessage);
        console.log(`Message saved & sent to room [${cleanRoomId}] by @${sender}: ${trimmedText}`);
      } catch (error) {
        console.error("Socket send_message error:", error);
        // On a save failure, emit message_error to sender only
        socket.emit("message_error", {
          error: "Failed to send message: " + (error.message || "Database error"),
        });
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
        console.log(`Socket disconnected: ${socket.id} (@${socket.user?.username}). Total online: ${onlineUsersMap.size}`);
      }
    });
  });
};

export default registerSocketHandlers;
