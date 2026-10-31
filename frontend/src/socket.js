import { io } from "socket.io-client";

export const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token") || "";
  }
  return "";
};

// Target backend URL: Configurable via environment variable (VITE_BACKEND_URL or VITE_SOCKET_URL)
// Defaults to current window origin in production, or localhost:5000 during local dev
const envBackendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_SOCKET_URL;
const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const defaultUrl = isLocal
  ? "http://localhost:5000"
  : typeof window !== "undefined"
  ? window.location.origin
  : "";

const SOCKET_URL = envBackendUrl || defaultUrl;

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
