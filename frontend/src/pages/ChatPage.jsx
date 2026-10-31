import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AvengersBackground from "../components/AvengersBackground";
import Chat from "../components/Chat";
import socket, { connectSocket } from "../socket";
import { formatLastActive } from "../utils/formatTime";
import axios from "axios";

const ChatPage = ({ authUser: initialAuthUser, onLogoutSuccess }) => {
  const { roomId: paramRoomId } = useParams();
  const navigate = useNavigate();

  const [authUser, setAuthUser] = useState(initialAuthUser || null);
  const [conversations, setConversations] = useState([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [activeRoomId, setActiveRoomId] = useState(paramRoomId || "");
  const [recipientUser, setRecipientUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // New Message Modal state
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalResults, setModalResults] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [unreadByRoom, setUnreadByRoom] = useState({});

  // Fetch unread messages per room breakdown
  const fetchUnreadCounts = async () => {
    try {
      const res = await axios.get("/api/messages/unread-count");
      if (res.data?.unreadByRoom) {
        setUnreadByRoom(res.data.unreadByRoom);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchUnreadCounts();

    const handleNewMessageAlert = (data) => {
      if (data?.roomId) {
        setUnreadByRoom((prev) => ({
          ...prev,
          [data.roomId]: (prev[data.roomId] || 0) + 1,
        }));
      }
    };

    const handleMessagesRead = (data) => {
      if (data?.roomId) {
        setUnreadByRoom((prev) => {
          const next = { ...prev };
          delete next[data.roomId];
          return next;
        });
      } else {
        fetchUnreadCounts();
      }
    };

    socket.on("connect", fetchUnreadCounts);
    socket.on("new_message_notification", handleNewMessageAlert);
    socket.on("receive_message", (savedMessage) => {
      if (savedMessage?.roomId && savedMessage.sender !== authUser?.username) {
        if (savedMessage.roomId !== activeRoomId) {
          setUnreadByRoom((prev) => ({
            ...prev,
            [savedMessage.roomId]: (prev[savedMessage.roomId] || 0) + 1,
          }));
        }
      }
    });
    socket.on("messages_read_confirmed", handleMessagesRead);
    window.addEventListener("messageCountUpdated", fetchUnreadCounts);

    return () => {
      socket.off("connect", fetchUnreadCounts);
      socket.off("new_message_notification", handleNewMessageAlert);
      socket.off("receive_message");
      socket.off("messages_read_confirmed", handleMessagesRead);
      window.removeEventListener("messageCountUpdated", fetchUnreadCounts);
    };
  }, [authUser, activeRoomId]);

  // Track online users list and real-time last seen updates
  useEffect(() => {
    const handleOnlineUsers = (users) => {
      setOnlineUsers(Array.isArray(users) ? users : []);
    };

    const handleLastSeen = ({ userId, lastSeen }) => {
      setConversations((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, lastSeen } : u))
      );
    };

    socket.on("get_online_users", handleOnlineUsers);
    socket.on("user_last_seen", handleLastSeen);
    socket.emit("request_online_users");

    return () => {
      socket.off("get_online_users", handleOnlineUsers);
      socket.off("user_last_seen", handleLastSeen);
    };
  }, []);

  // Fetch auth user if not present
  useEffect(() => {
    if (initialAuthUser) {
      setAuthUser(initialAuthUser);
      connectSocket();
      return;
    }
    const fetchMe = async () => {
      try {
        const res = await axios.get("/auth/me");
        if (res.data && !res.data.error) {
          setAuthUser(res.data);
          if (res.data.token) {
            localStorage.setItem("token", res.data.token);
            connectSocket(res.data.token);
          } else {
            connectSocket();
          }
        }
      } catch {
        // silent
      }
    };
    fetchMe();
  }, [initialAuthUser]);

  // Sync paramRoomId from URL
  useEffect(() => {
    setActiveRoomId(paramRoomId || "");
  }, [paramRoomId]);

  // Load allies/conversations from following + followers
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await axios.get("/auth/me");
        if (res.data && !res.data.error) {
          const combined = [
            ...(res.data.following || []),
            ...(res.data.followers || []),
          ];
          const map = new Map();
          combined.forEach((u) => {
            if (u && u._id) {
              map.set(u._id.toString(), u);
            }
          });
          setConversations(Array.from(map.values()));
        }
      } catch {
        // silent
      }
    };
    fetchConversations();
  }, []);

  // When activeRoomId changes, determine recipientUser info
  useEffect(() => {
    if (!activeRoomId || !authUser?._id) {
      setRecipientUser(null);
      return;
    }

    // Check if 1-to-1 chat (format: userA_userB)
    if (activeRoomId.includes("_")) {
      const parts = activeRoomId.split("_");
      const otherId = parts.find((id) => id !== authUser._id.toString());

      if (otherId) {
        // First check locally in conversations
        const localUser = conversations.find((u) => u._id === otherId);
        if (localUser) {
          setRecipientUser(localUser);
        } else {
          // Fetch from backend
          axios
            .get(`/api/users/user-by-id/${otherId}`)
            .then((res) => {
              if (res.data && !res.data.error) {
                setRecipientUser(res.data);
              }
            })
            .catch(() => {
              setRecipientUser(null);
            });
        }
      }
    } else {
      setRecipientUser(null);
    }
  }, [activeRoomId, authUser, conversations]);

  // Select a user to chat with (Instagram 1-to-1 sorted roomId)
  const handleSelectUser = (targetUser) => {
    if (!authUser?._id || !targetUser?._id) return;
    const ids = [authUser._id.toString(), targetUser._id.toString()].sort();
    const dmRoomId = `${ids[0]}_${ids[1]}`;
    setRecipientUser(targetUser);
    setActiveRoomId(dmRoomId);
    navigate(`/chat/${dmRoomId}`);
    setShowNewMessageModal(false);
  };

  // Search users inside "New Message" modal
  useEffect(() => {
    if (!showNewMessageModal) return;

    const timer = setTimeout(async () => {
      setModalLoading(true);
      try {
        const res = await axios.get(`/api/users/search?q=${encodeURIComponent(modalSearch)}`);
        if (Array.isArray(res.data)) {
          setModalResults(res.data);
        } else {
          setModalResults([]);
        }
      } catch {
        setModalResults([]);
      } finally {
        setModalLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [modalSearch, showNewMessageModal]);

  // Filter conversations in left pane
  const filteredConversations = conversations.filter((c) => {
    if (!searchFilter.trim()) return true;
    const query = searchFilter.toLowerCase();
    return (
      c.fullname?.toLowerCase().includes(query) ||
      c.username?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen w-full relative text-slate-900 dark:text-[#e7e9ea] flex justify-center selection:bg-emerald-600 selection:text-white transition-colors duration-200">
      <AvengersBackground />

      <div className="w-full max-w-7xl flex relative z-10">
        {/* Main App Left Navigation Sidebar */}
        <Sidebar
          activeTab="chat"
          authUser={authUser}
          onLogoutSuccess={onLogoutSuccess}
        />

        {/* Instagram Direct Messages Container */}
        <main className="flex-1 flex h-screen overflow-hidden border-r border-slate-200 dark:border-[#262626] bg-white dark:bg-[#000000]">
          {/* Left Column: Inbox / Conversations List */}
          <div
            className={`w-full md:w-88 xl:w-96 shrink-0 border-r border-slate-200 dark:border-[#262626] flex flex-col h-full bg-white dark:bg-[#000000] pt-14 md:pt-0 pb-16 md:pb-0 ${
              activeRoomId ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Header: Username & New Message Compose Icon */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#262626]">
              <div className="flex items-center gap-1.5 cursor-pointer">
                <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                  {authUser?.username}
                </span>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700 dark:text-slate-300">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {/* Compose New Message Button */}
              <button
                type="button"
                onClick={() => {
                  setModalSearch("");
                  setShowNewMessageModal(true);
                }}
                className="p-1.5 text-slate-700 dark:text-slate-200 hover:text-black dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                title="New message"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>

            {/* Instagram Search Input */}
            <div className="px-4 py-2.5">
              <div className="flex items-center gap-2.5 px-3 py-2 bg-[#efefef] dark:bg-[#1f1f1f] rounded-xl text-slate-500 dark:text-slate-400">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white w-full placeholder-slate-400"
                />
                {searchFilter && (
                  <button
                    type="button"
                    onClick={() => setSearchFilter("")}
                    className="text-slate-400 hover:text-black dark:hover:text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto divide-y divide-transparent">
              {/* Global HQ Lounge Item */}
              <button
                type="button"
                onClick={() => {
                  setActiveRoomId("general_hq");
                  setRecipientUser(null);
                  navigate("/chat/general_hq");
                }}
                className={`w-full px-4 py-3 flex items-center gap-3.5 transition-colors cursor-pointer text-left ${
                  activeRoomId === "general_hq"
                    ? "bg-slate-100 dark:bg-[#1a1a1a]"
                    : "hover:bg-slate-50 dark:hover:bg-[#121212]"
                }`}
              >
                <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-xs">
                  #
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    Lokiverse Global HQ
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Public Multiverse Lounge · Live
                  </span>
                </div>
              </button>

              {/* Direct Messages with Allies */}
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-xs">No conversations found.</p>
                  <button
                    type="button"
                    onClick={() => setShowNewMessageModal(true)}
                    className="mt-3 text-xs font-semibold text-[#0095f6] hover:underline cursor-pointer"
                  >
                    Start a new chat
                  </button>
                </div>
              ) : (
                filteredConversations.map((ally) => {
                  const dmId = authUser?._id
                    ? [authUser._id.toString(), ally._id.toString()].sort().join("_")
                    : "";
                  const isSelected = activeRoomId === dmId;
                  const isOnline = Boolean(
                    ally?._id &&
                    onlineUsers.some((id) => id?.toString() === ally._id.toString())
                  );
                  const lastActiveText = formatLastActive(ally.lastSeen);

                  return (
                    <button
                      key={ally._id}
                      type="button"
                      onClick={() => handleSelectUser(ally)}
                      className={`w-full px-4 py-3 flex items-center gap-3.5 transition-colors cursor-pointer text-left ${
                        isSelected
                          ? "bg-slate-100 dark:bg-[#1a1a1a]"
                          : "hover:bg-slate-50 dark:hover:bg-[#121212]"
                      }`}
                    >
                      {/* Avatar with Story Border & Green Status Dot ONLY when online */}
                      <div className="relative shrink-0">
                        {ally.profileImg ? (
                          <img
                            src={ally.profileImg}
                            alt=""
                            className="w-13 h-13 rounded-full object-cover border border-slate-200 dark:border-white/10"
                          />
                        ) : (
                          <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-amber-500 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                            {ally.username?.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {isOnline && (
                          <span
                            className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black animate-pulse"
                            title="Active now"
                          />
                        )}
                      </div>

                      {/* Text info */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {ally.fullname || ally.username}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                          <span>@{ally.username}</span>
                          {isOnline ? (
                            <>
                              <span>·</span>
                              <span className="text-emerald-500 font-medium">Active now</span>
                            </>
                          ) : lastActiveText ? (
                            <>
                              <span>·</span>
                              <span className="text-slate-400 dark:text-slate-500">{lastActiveText}</span>
                            </>
                          ) : null}
                        </span>
                      </div>

                      {/* Unread Message Count Badge for this Ally */}
                      {unreadByRoom[dmId] > 0 && !isSelected && (
                        <div className="shrink-0 flex items-center justify-center">
                          <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] font-black flex items-center justify-center shadow-sm shadow-emerald-500/30 animate-pulse">
                            {unreadByRoom[dmId] > 99 ? "99+" : unreadByRoom[dmId]}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Window OR Instagram Empty State */}
          <div
            className={`flex-1 flex flex-col h-full bg-white dark:bg-[#000000] ${
              !activeRoomId ? "hidden md:flex" : "flex"
            }`}
          >
            {activeRoomId && authUser ? (
              <Chat
                roomId={activeRoomId}
                username={authUser.username}
                recipientUser={recipientUser}
                onBack={() => {
                  setActiveRoomId("");
                  navigate("/chat");
                }}
              />
            ) : (
              /* Instagram Web Empty State */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
                <div className="w-24 h-24 rounded-full border-2 border-slate-800 dark:border-white/80 flex items-center justify-center mb-4 text-slate-800 dark:text-white">
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Your Messages</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs leading-relaxed">
                  Send private messages and direct transmissions to an ally in the Multiverse.
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewMessageModal(true)}
                  className="mt-5 px-4 py-2 bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold text-sm rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Send message
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Instagram "New Message" Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#262626] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-slate-200 dark:border-white/10">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10">
              <span className="font-bold text-base text-slate-900 dark:text-white">New message</span>
              <button
                type="button"
                onClick={() => setShowNewMessageModal(false)}
                className="p-1 text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* "To:" Search Bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-white/10">
              <span className="font-bold text-sm text-slate-900 dark:text-white">To:</span>
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>

            {/* Results / Suggestions List */}
            <div className="flex-1 overflow-y-auto p-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5 block">
                {modalSearch.trim() ? "Search Results" : "Suggested Contacts"}
              </span>

              {modalLoading ? (
                <div className="p-6 text-center text-xs text-slate-400">Searching agents...</div>
              ) : (
                (modalSearch.trim() ? modalResults : conversations).map((user) => (
                  <button
                    key={user._id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="w-full p-2.5 flex items-center gap-3 rounded-xl hover:bg-slate-100 dark:hover:bg-[#333] transition-colors cursor-pointer text-left"
                  >
                    <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-white/10">
                      {user.profileImg ? (
                        <img src={user.profileImg} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                          {user.username?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {user.fullname}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        @{user.username}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
