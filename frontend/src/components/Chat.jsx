import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import socket, { connectSocket } from "../socket";
import { formatLastActive } from "../utils/formatTime";

/**
 * Instagram-style Chat Component with Cursor Pagination & Real-time Sockets
 * @param {string} roomId - Chat room identifier (group id or userA_userB)
 * @param {string} username - Current authenticated user's username
 * @param {object} recipientUser - Recipient profile info (for 1-on-1 chats)
 * @param {function} onBack - Callback for mobile back button to conversation list
 */
const Chat = ({ roomId, username, recipientUser, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [hasMore, setHasMore] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [recipientLastSeen, setRecipientLastSeen] = useState(recipientUser?.lastSeen || null);

  // Edit, Unsend & Reaction states
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [activeReactionPickerId, setActiveReactionPickerId] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const loadingOlderRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);

  // 5-minute edit limit timer ticker (updates every 30s to automatically hide edit option after 5 mins)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Sync recipient last seen
  useEffect(() => {
    setRecipientLastSeen(recipientUser?.lastSeen || null);
  }, [recipientUser]);

  // Track real-time online users & last seen updates
  useEffect(() => {
    const handleOnlineUsers = (users) => {
      setOnlineUsers(Array.isArray(users) ? users : []);
    };

    const handleLastSeen = ({ userId, lastSeen }) => {
      if (recipientUser?._id && recipientUser._id.toString() === userId) {
        setRecipientLastSeen(lastSeen);
      }
    };

    socket.on("get_online_users", handleOnlineUsers);
    socket.on("user_last_seen", handleLastSeen);
    socket.emit("request_online_users");

    return () => {
      socket.off("get_online_users", handleOnlineUsers);
      socket.off("user_last_seen", handleLastSeen);
    };
  }, [recipientUser]);

  // Auto-scroll to bottom
  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  // Track socket connection state
  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  // Fetch initial 30 messages on room open
  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;
    setMessages([]);
    setErrorMessage("");
    setHasMore(true);
    setLoadingHistory(true);
    shouldAutoScrollRef.current = true;

    // Fetch latest 30 messages from MongoDB
    const fetchInitialHistory = async () => {
      try {
        const res = await axios.get(`/api/messages/${encodeURIComponent(roomId)}?limit=30`);
        if (isMounted && Array.isArray(res.data)) {
          setMessages(res.data);
          if (res.data.length < 30) {
            setHasMore(false);
          }
          setTimeout(() => scrollToBottom("auto"), 50);
        }
      } catch (err) {
        console.error("Error fetching message history:", err);
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    };

    fetchInitialHistory();

    // Mark messages in this room as read
    const markRoomAsRead = async () => {
      try {
        await axios.put(`/api/messages/${encodeURIComponent(roomId)}/read`);
        socket.emit("mark_messages_read", { roomId });
        window.dispatchEvent(new Event("messageCountUpdated"));
      } catch {
        // silent
      }
    };
    markRoomAsRead();

    // Connect socket and join room
    connectSocket();
    socket.emit("join_room", roomId);

    const handleConnect = () => {
      socket.emit("join_room", roomId);
    };

    // Receive real-time message
    const handleReceiveMessage = (savedMessage) => {
      if (savedMessage && savedMessage.roomId === roomId) {
        shouldAutoScrollRef.current = true;
        setMessages((prev) => {
          if (prev.some((m) => m._id === savedMessage._id)) {
            return prev;
          }
          return [...prev, savedMessage];
        });

        // Since user is currently inside this active room, mark as read immediately
        if (savedMessage.sender !== username) {
          socket.emit("mark_messages_read", { roomId });
          window.dispatchEvent(new Event("messageCountUpdated"));
        }
      }
    };

    // Receive message error
    const handleMessageError = (err) => {
      const errorText = typeof err === "object" ? err.error || JSON.stringify(err) : String(err);
      setErrorMessage(errorText || "Message failed to send");
    };

    // Real-time unsend (delete from state when removed from DB)
    const handleMessageUnsent = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    };

    // Real-time edit update
    const handleMessageEdited = (updatedMsg) => {
      if (!updatedMsg) return;
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
      );
    };

    // Real-time reaction update
    const handleMessageReactionUpdated = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    };

    socket.on("connect", handleConnect);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("message_error", handleMessageError);
    socket.on("message_unsent", handleMessageUnsent);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_reaction_updated", handleMessageReactionUpdated);

    return () => {
      isMounted = false;
      socket.off("connect", handleConnect);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_error", handleMessageError);
      socket.off("message_unsent", handleMessageUnsent);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_reaction_updated", handleMessageReactionUpdated);
    };
  }, [roomId]);

  // Load older 30 messages on upward scroll (Cursor-based pagination)
  const loadOlder = async () => {
    if (!hasMore || loadingOlderRef.current || messages.length === 0 || !scrollContainerRef.current) {
      return;
    }

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    shouldAutoScrollRef.current = false;

    const container = scrollContainerRef.current;
    const prevScrollHeight = container.scrollHeight;
    const oldestMessage = messages[0];
    const beforeCursor = oldestMessage.createdAt;

    try {
      const res = await axios.get(
        `/api/messages/${encodeURIComponent(roomId)}?before=${encodeURIComponent(beforeCursor)}&limit=30`
      );

      if (Array.isArray(res.data)) {
        if (res.data.length < 30) {
          setHasMore(false);
        }

        if (res.data.length > 0) {
          // Prepend older messages and filter duplicates
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m._id));
            const uniqueOlder = res.data.filter((m) => !existingIds.has(m._id));
            return [...uniqueOlder, ...prev];
          });

          // Preserve exact scroll position so view doesn't jump
          requestAnimationFrame(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight;
              container.scrollTop = newScrollHeight - prevScrollHeight;
            }
          });
        }
      }
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  };

  // Scroll listener to trigger upward infinite scroll
  const handleScroll = (e) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop <= 10 && hasMore && !loadingOlderRef.current && messages.length > 0) {
      loadOlder();
    }
  };

  // Send message
  const handleSendMessage = (textToSend = inputText) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    if (!socket.connected) {
      connectSocket();
      socket.emit("join_room", roomId);
    }

    shouldAutoScrollRef.current = true;
    socket.emit("send_message", {
      roomId,
      text: trimmed,
    });

    setInputText("");
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const sendQuickEmoji = (emoji) => {
    handleSendMessage(emoji);
  };

  const formatMessageTime = (dateString) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Group reactions by emoji
  const getGroupedReactions = (reactions = []) => {
    if (!Array.isArray(reactions)) return [];
    const map = {};
    reactions.forEach((r) => {
      if (!r || !r.emoji) return;
      if (!map[r.emoji]) {
        map[r.emoji] = { emoji: r.emoji, count: 0, users: [], hasReacted: false };
      }
      map[r.emoji].count += 1;
      map[r.emoji].users.push(r.user);
      if (r.user === username) {
        map[r.emoji].hasReacted = true;
      }
    });
    return Object.values(map);
  };

  // Toggle emoji reaction
  const handleToggleReaction = (messageId, emoji) => {
    socket.emit("react_message", { messageId, roomId, emoji });
    setActiveReactionPickerId(null);
  };

  // Unsend message (deletes permanently from DB)
  const handleUnsend = (messageId) => {
    if (window.confirm("Unsend this message? It will be permanently deleted for everyone.")) {
      socket.emit("unsend_message", { messageId, roomId });
      // Optimistic delete
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    }
  };

  // Start edit (only allowed within 5 minutes)
  const handleStartEdit = (msg) => {
    const messageAge = msg.createdAt ? Date.now() - new Date(msg.createdAt).getTime() : 0;
    if (messageAge > 5 * 60 * 1000) {
      setErrorMessage("Messages can only be edited within 5 minutes of sending.");
      return;
    }
    setEditingMessageId(msg._id);
    setEditingText(msg.text);
    setActiveReactionPickerId(null);
  };

  // Save edit (enforces 5-minute limit)
  const handleSaveEdit = (messageId) => {
    const trimmed = editingText.trim();
    if (!trimmed) return;
    const targetMsg = messages.find((m) => m._id === messageId);
    if (targetMsg && targetMsg.createdAt) {
      const messageAge = Date.now() - new Date(targetMsg.createdAt).getTime();
      if (messageAge > 5 * 60 * 1000) {
        setErrorMessage("Edit window expired. Messages can only be edited within 5 minutes of sending.");
        setEditingMessageId(null);
        setEditingText("");
        return;
      }
    }
    socket.emit("edit_message", { messageId, roomId, text: trimmed });
    setEditingMessageId(null);
    setEditingText("");
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const isGroup = !roomId?.includes("_");
  const isRecipientOnline =
    !isGroup &&
    Boolean(
      recipientUser?._id &&
      onlineUsers.some((id) => id?.toString() === recipientUser._id.toString())
    );
  const lastActiveText = formatLastActive(recipientLastSeen || recipientUser?.lastSeen);
  const displayName = isGroup
    ? `#${roomId}`
    : recipientUser?.fullname || recipientUser?.username || "Direct Message";
  const displayHandle = isGroup ? "Group Lounge" : `@${recipientUser?.username || ""}`;
  const displayAvatar = recipientUser?.profileImg;

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-[#000000] text-slate-900 dark:text-white select-text">
      {/* Instagram Chat Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-[#262626] bg-white/95 dark:bg-[#000000]/95 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white cursor-pointer"
              title="Back to messages"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          {/* User / Group Avatar */}
          <div className="relative shrink-0">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/10"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                {isGroup ? "#" : displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
            {/* Green Online Dot ONLY when recipient is currently logged in & active on the site */}
            {isRecipientOnline && (
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-black bg-emerald-500 animate-pulse"
                title="Active now"
              />
            )}
          </div>

          {/* User Info */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                {displayName}
              </span>
              {!isGroup && recipientUser?.username && (
                <Link
                  to={`/profile/${recipientUser.username}`}
                  className="text-xs text-slate-400 hover:text-emerald-500"
                  title="View Profile"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </Link>
              )}
            </div>
            {isGroup ? (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Public Multiverse Lounge
              </span>
            ) : isRecipientOnline ? (
              <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active now</span>
              </span>
            ) : lastActiveText ? (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                {lastActiveText}
              </span>
            ) : null}
          </div>
        </div>

        {/* Instagram Header Icons */}
        <div className="flex items-center gap-4 text-slate-800 dark:text-slate-200">

          {!isGroup && recipientUser?.username && (
            <Link
              to={`/profile/${recipientUser.username}`}
              className="p-1.5 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              title="View profile info"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </Link>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between px-4 py-2 bg-rose-500/15 border-b border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="text-xs hover:underline cursor-pointer font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages Scroll Area with Infinite Scroll */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5"
      >
        {/* Loading Spinner when fetching older messages */}
        {loadingOlder && (
          <div className="flex items-center justify-center py-2 text-xs text-slate-400 gap-2">
            <span className="w-4 h-4 border-2 border-slate-300 dark:border-white/20 border-t-[#0095f6] rounded-full animate-spin" />
            <span>Loading older messages...</span>
          </div>
        )}

        {/* Profile Hero Header inside Chat */}
        {!isGroup && (
          <div className="flex flex-col items-center justify-center pt-6 pb-8 text-center border-b border-slate-100 dark:border-white/5 mb-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-3 border border-slate-200 dark:border-white/10 shadow-sm">
              {displayAvatar ? (
                <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-amber-500 flex items-center justify-center text-white text-2xl font-bold">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
              {displayName}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {displayHandle} · Multiverse Alliance
            </p>
            {recipientUser?.username && (
              <Link
                to={`/profile/${recipientUser.username}`}
                className="mt-3.5 px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#262626] dark:hover:bg-[#333] text-slate-800 dark:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                View Profile
              </Link>
            )}
          </div>
        )}

        {/* Initial Loading State */}
        {loadingHistory && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
            <span className="w-6 h-6 border-2 border-slate-300 dark:border-white/20 border-t-[#0095f6] rounded-full animate-spin" />
            <span className="text-xs">Loading message timeline...</span>
          </div>
        ) : null}

        {/* Message Bubbles */}
        {messages.map((msg, index) => {
          const isMe = msg.sender === username;
          const showAvatar =
            !isMe &&
            (index === messages.length - 1 || messages[index + 1]?.sender !== msg.sender);
          const isEditingThis = editingMessageId === msg._id;
          const isPickerOpen = activeReactionPickerId === msg._id;
          const groupedReactions = getGroupedReactions(msg.reactions);
          const messageAge = msg.createdAt ? currentTime - new Date(msg.createdAt).getTime() : 0;
          const isWithin5Min = messageAge <= 5 * 60 * 1000;
          const canEdit = isMe && !isEditingThis && isWithin5Min;

          return (
            <div
              key={msg._id}
              className={`flex items-end gap-2 group relative ${
                isMe ? "justify-end" : "justify-start"
              }`}
            >
              {!isMe && (
                <div className="w-7 h-7 rounded-full shrink-0 overflow-hidden mb-0.5">
                  {showAvatar ? (
                    displayAvatar ? (
                      <img
                        src={displayAvatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {msg.sender?.slice(0, 2).toUpperCase()}
                      </div>
                    )
                  ) : (
                    <div className="w-7 h-7" />
                  )}
                </div>
              )}

              {/* Action buttons (Appear on hover or tap) */}
              <div
                className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mb-2 shrink-0 ${
                  isMe ? "order-first" : "order-last"
                }`}
              >
                {/* Emoji Reaction Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveReactionPickerId(isPickerOpen ? null : msg._id)
                    }
                    className="p-1 rounded-full text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Add reaction"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="15"
                      height="15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" />
                      <line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                  </button>

                  {/* Floating 6-Emoji Reaction Bar */}
                  {isPickerOpen && (
                    <div
                      className={`absolute bottom-full mb-1 z-30 flex items-center gap-1 p-1 bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-white/15 rounded-full shadow-xl animate-in fade-in zoom-in-95 duration-150 ${
                        isMe ? "right-0" : "left-0"
                      }`}
                    >
                      {["❤️", "😂", "😮", "😢", "🔥", "👍"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleReaction(msg._id, emoji)}
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:scale-130 transition-transform cursor-pointer text-sm hover:bg-slate-100 dark:hover:bg-white/10"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit Message Button (Sender Only, only within 5 minutes) */}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleStartEdit(msg)}
                    className="p-1 rounded-full text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Edit message (within 5 minutes)"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                )}

                {/* Unsend Message Button (Sender Only: Deletes from DB) */}
                {isMe && !isEditingThis && (
                  <button
                    type="button"
                    onClick={() => handleUnsend(msg._id)}
                    className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Unsend (Delete from DB)"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Message Bubble + Reactions Container */}
              <div className="flex flex-col max-w-[75%] sm:max-w-[65%]">
                {isGroup && !isMe && (
                  <span className="text-[10px] font-semibold text-slate-400 ml-3 mb-0.5">
                    @{msg.sender}
                  </span>
                )}

                {/* Inline Edit Input OR Regular Message Bubble */}
                {isEditingThis ? (
                  <div className="flex flex-col gap-1.5 p-2 rounded-2xl bg-slate-100 dark:bg-[#1a1a1a] border border-emerald-500/50 shadow-md min-w-[220px]">
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveEdit(msg._id);
                        } else if (e.key === "Escape") {
                          handleCancelEdit();
                        }
                      }}
                      rows={2}
                      className="w-full bg-white dark:bg-black/60 p-2 text-xs rounded-lg border border-slate-300 dark:border-white/10 outline-none text-slate-900 dark:text-white resize-none"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-2.5 py-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(msg._id)}
                        className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-colors shadow-xs"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`px-4 py-2.5 text-sm leading-relaxed break-words transition-all shadow-xs relative ${
                      isMe
                        ? "bg-[#3797f0] text-white rounded-[20px] rounded-br-[4px]"
                        : "bg-[#efefef] dark:bg-[#262626] text-slate-900 dark:text-white rounded-[20px] rounded-bl-[4px]"
                    }`}
                  >
                    {msg.text}
                  </div>
                )}

                {/* Grouped Reaction Badges under Bubble */}
                {groupedReactions.length > 0 && !isEditingThis && (
                  <div
                    className={`flex flex-wrap gap-1 mt-1 ${
                      isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    {groupedReactions.map(
                      ({ emoji, count, users, hasReacted }) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleReaction(msg._id, emoji)}
                          title={`Reacted by: ${users.join(", ")}`}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-transform hover:scale-110 cursor-pointer shadow-xs ${
                            hasReacted
                              ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold"
                              : "bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span className="text-xs">{emoji}</span>
                          {count > 1 && (
                            <span className="text-[10px] font-bold">
                              {count}
                            </span>
                          )}
                        </button>
                      )
                    )}
                  </div>
                )}

                {/* Timestamp & Edited Tag */}
                <div
                  className={`flex items-center gap-1 text-[9px] text-slate-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isMe ? "justify-end mr-1" : "justify-start ml-1"
                  }`}
                >
                  <span>{formatMessageTime(msg.createdAt)}</span>
                  {msg.isEdited && (
                    <span className="italic opacity-80 font-medium">· Edited</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emoji Bar */}
      {showEmojiPicker && (
        <div className="px-5 py-2 flex items-center gap-3 border-t border-slate-100 dark:border-[#262626] bg-slate-50 dark:bg-[#121212] text-xl">
          {["❤️", "🙌", "🔥", "👏", "😢", "😍", "⚡", "😂"].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => sendQuickEmoji(emoji)}
              className="hover:scale-125 transition-transform cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Instagram Message Input Bar */}
      <div className="p-3 sm:p-4 bg-white dark:bg-[#000000] border-t border-slate-200 dark:border-[#262626]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="w-full flex items-center border border-slate-300 dark:border-[#363636] focus-within:border-slate-400 dark:focus-within:border-[#666] rounded-full px-3.5 py-1.5 transition-colors bg-white dark:bg-black"
        >
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            title="Choose an emoji"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            className="flex-1 px-3 py-1.5 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400"
          />

          {inputText.trim() ? (
            <button
              type="submit"
              className="text-[#0095f6] hover:text-[#1877f2] font-semibold text-sm px-2.5 py-1 cursor-pointer transition-colors"
            >
              Send
            </button>
          ) : (
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <button
                type="button"
                onClick={() => sendQuickEmoji("❤️")}
                className="p-1.5 hover:text-rose-500 hover:scale-110 transition-all cursor-pointer"
                title="Send heart"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Chat;
