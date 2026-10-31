import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import CookieParser from 'cookie-parser';

import authRoute from './routes/auth_routes.js';
import userRoute from './routes/user_routes.js';
import notificationRoute from './routes/notification_routes.js';
import postRoute from './routes/post_routes.js';
import messageRoute from './routes/message_routes.js';
import connecDB from './db/connectDB.js';
import User from './models/user_model.js';
import registerSocketHandlers from './socket/handlers.js';

dotenv.config();

const port = process.env.PORT || 5000;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const app = express();
const httpServer = http.createServer(app);

const allowedOrigins = [
  clientOrigin,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://lokiverse.onrender.com",
];

// Configure CORS for Express
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(CookieParser());
app.use("/uploads", express.static("uploads"));

// REST Routes
app.use("/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/posts", postRoute);
app.use("/api/messages", messageRoute);

// Configure Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Helper to reliably parse cookies from header
const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce((acc, cookie) => {
    const parts = cookie.trim().split("=");
    if (parts[0]) {
      acc[parts[0]] = decodeURIComponent(parts.slice(1).join("="));
    }
    return acc;
  }, {});
};

// io.use middleware: verify JWT from handshake auth, authorization header, or cookie
io.use(async (socket, next) => {
  try {
    const cookies = parseCookies(socket.handshake.headers?.cookie);
    const authHeader = socket.handshake.headers?.authorization;

    const token =
      socket.handshake.auth?.token ||
      (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null) ||
      cookies.jwt;

    if (!token) {
      console.warn("Socket connection rejected: No token provided");
      return next(new Error("Authentication error: No token provided"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.userId) {
      console.warn("Socket connection rejected: Invalid token payload");
      return next(new Error("Authentication error: Invalid token"));
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      console.warn("Socket connection rejected: User not found in database");
      return next(new Error("Authentication error: User not found"));
    }

    socket.user = user;
    next();
  } catch (err) {
    console.error("Socket authentication error:", err.message);
    return next(new Error("Authentication error: " + err.message));
  }
});

// Register socket handlers for join_room, send_message, etc.
registerSocketHandlers(io);

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
  connecDB();
});

export { app, io, httpServer };
