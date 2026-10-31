import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import SignUpPage from './pages/SignUpPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import NotificationPage from './pages/NotificationPage';
import FollowersFollowingPage from './pages/FollowersFollowingPage';
import ChatPage from './pages/ChatPage';
import socket, { connectSocket } from './socket';

function App() {
  const [authUser, setAuthUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if session cookie is valid on mount & refresh
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await axios.get('/auth/me');
        if (response.data && !response.data.error) {
          setAuthUser(response.data);
          if (response.data.token) {
            localStorage.setItem("token", response.data.token);
            connectSocket(response.data.token);
          } else {
            connectSocket();
          }
        } else {
          setAuthUser(null);
        }
      } catch (err) {
        setAuthUser(null);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleLoginSuccess = (user, token) => {
    setAuthUser(user);
    if (token) {
      connectSocket(token);
    } else {
      connectSocket();
    }
  };

  const handleLogoutSuccess = () => {
    localStorage.removeItem("token");
    socket.disconnect();
    setAuthUser(null);
  };

  // Sleek Avengers loader while verifying auth
  if (checkingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#070912] text-[#e7e9ea] avengers-bg-ambient">
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="fx-reactor mb-1" />
          <span className="text-sm font-bold text-cyan-300 tracking-wider animate-pulse">
            VERIFYING AVENGERS CLEARANCE...
          </span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Route: /login */}
      <Route
        path="/login"
        element={
          !authUser ? (
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          ) : (
            <Navigate to="/profile" replace />
          )
        }
      />

      {/* Route: /signup */}
      <Route
        path="/signup"
        element={
          !authUser ? (
            <SignUpPage />
          ) : (
            <Navigate to="/profile" replace />
          )
        }
      />

      {/* Route: / (HQ Home feed if logged in, otherwise /login) */}
      <Route
        path="/"
        element={
          authUser ? (
            <HomePage onLogoutSuccess={handleLogoutSuccess} authUser={authUser} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Route: /home */}
      <Route
        path="/home"
        element={
          authUser ? (
            <HomePage onLogoutSuccess={handleLogoutSuccess} authUser={authUser} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Route: /chat (Live Chat Room) */}
      <Route
        path="/chat"
        element={
          authUser ? (
            <ChatPage authUser={authUser} onLogoutSuccess={handleLogoutSuccess} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Route: /chat/:roomId (Direct Room) */}
      <Route
        path="/chat/:roomId"
        element={
          authUser ? (
            <ChatPage authUser={authUser} onLogoutSuccess={handleLogoutSuccess} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Route: /profile (Own profile dossier) */}
      <Route
        path="/profile"
        element={
          authUser ? (
            <ProfilePage onLogoutSuccess={handleLogoutSuccess} authUser={authUser} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Route: /profile/followers (Own followers) */}
      <Route
        path="/profile/followers"
        element={
          authUser ? (
            <FollowersFollowingPage onLogoutSuccess={handleLogoutSuccess} authUser={authUser} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Route: /profile/following (Own following) */}
      <Route
        path="/profile/following"
        element={
          authUser ? (
            <FollowersFollowingPage onLogoutSuccess={handleLogoutSuccess} authUser={authUser} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Route: /profile/:username/followers (Target user's followers) */}
      <Route
        path="/profile/:username/followers"
        element={
          authUser ? (
            <FollowersFollowingPage onLogoutSuccess={handleLogoutSuccess} authUser={authUser} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Route: /profile/:username/following (Target user's following) */}
      <Route
        path="/profile/:username/following"
        element={
          authUser ? (
            <FollowersFollowingPage onLogoutSuccess={handleLogoutSuccess} authUser={authUser} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Route: /profile/:username (Any agent dossier) */}
      <Route
        path="/profile/:username"
        element={
          authUser ? (
            <ProfilePage onLogoutSuccess={handleLogoutSuccess} authUser={authUser} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Route: /notifications (Transmissions & Intel) */}
      <Route
        path="/notifications"
        element={
          authUser ? (
            <NotificationPage onLogoutSuccess={handleLogoutSuccess} authUser={authUser} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Aliases for /followers and /following */}
      <Route
        path="/followers"
        element={<Navigate to="/profile/followers" replace />}
      />
      <Route
        path="/following"
        element={<Navigate to="/profile/following" replace />}
      />

      {/* Fallback wildcard route */}
      <Route
        path="*"
        element={<Navigate to={authUser ? "/profile" : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;
