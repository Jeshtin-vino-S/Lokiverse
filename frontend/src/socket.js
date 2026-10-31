import { io } from "socket.io-client";

export const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token") || "";
  }
  return "";
};

// Target backend URL:
// In local dev (localhost / 127.0.0.1): connect to local backend on port 5000
// In production (Render or any cloud host): connect to current deployed website origin
const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const SOCKET_URL = isLocal
  ? "http://localhost:5000"
  : (typeof window !== "undefined" ? window.location.origin : "");

// Shared socket instance with credentials and dynamic auth
export const socket = io(SOCKET_URL, {
  autoConnect: false, // Wait until auth token is ready to prevent immediate rejection
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ["websocket", "polling"],
  auth: (cb) => {
    cb({ token: getAuthToken() });
  },
});

export const connectSocket = (token) => {
  if (token) {
    localStorage.setItem("token", token);
  }
  const activeToken = token || getAuthToken();
  socket.auth = { token: activeToken };
  if (!socket.connected) {
    socket.connect();
  }
};

export const updateSocketAuth = (token) => {
  connectSocket(token);
};

export default socket;
