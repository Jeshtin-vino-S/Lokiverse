import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import CookieParser from 'cookie-parser';

import authRoute from './routes/auth_routes.js';
import userRoute from './routes/user_routes.js';
import notificationRoute from './routes/notification_routes.js';
import postRoute from './routes/post_routes.js';
import messageRoute from './routes/message_routes.js';
import connecDB from './db/connectDB.js';
import User from './models/user_model.js';
import registerSocketHandlers from './socket/handlers.js';

const port = process.env.PORT || 5000;
const app = express();
const httpServer = http.createServer(app);
const __dirname = path.resolve();

// Configure CORS for Express (allows any requesting origin with credentials enabled)
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(CookieParser());

// REST Routes
app.use("/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/posts", postRoute);
app.use("/api/messages", messageRoute);

// Serve Frontend static assets in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "frontend/dist")));

  app.use((req, res, next) => {
    // Only handle GET requests for frontend SPA routing; let API routes pass through
    if (req.method === "GET" && !req.path.startsWith("/api") && !req.path.startsWith("/auth")) {
      return res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
    }
    next();
  });
}

// Configure Socket.IO with CORS (allow requesting origins with credentials)
const io = new Server(httpServer, {
  cors: {
    origin: true,
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
      return next(new Error("Authentication error: No token provided"));
    }

    const secret = process.env.JWT_SECRET || "lokiverse_jwt_secret_key_default_2026";
    const decoded = jwt.verify(token, secret);
    if (!decoded || !decoded.userId) {
      return next(new Error("Authentication error: Invalid token"));
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
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
