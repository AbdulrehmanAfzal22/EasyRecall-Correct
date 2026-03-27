"use client";


import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRouter } from "next/navigation";
import { Send, Sparkles, Bot, User, Loader2, RotateCcw, Plus, X, FileText, ImageIcon, Menu, History, MessageSquare, Trash2 } from "lucide-react";
import { useAuth } from "../../AuthProvider";
import { saveChatToFirestore, getUserChats, getChatById, deleteChatFromFirestore, subscribeToUserChats } from "@/lib/firebaseStore";
import { checkAndIncrement, getRemaining } from "@/lib/usageService";
import { checkAndIncrement, getRemaining } from "@/lib/usageService";
import "./ai-chat.css";

// Helper: Bold topic headings like "1. Matter:" or "2. Energy:"
function formatTopicHeadings(text) {
  // Replace lines starting with number, period, and space, then a word and colon
  return text.replace(/^(\d+\.)\s*([A-Za-z0-9 \-]+):/gm, (match, num, topic) => {
    return `<b>${num} ${topic}:</b>`;
  });
}

// ── Usage Progress Bar Component  ─────────────────────────────────────────────
function ChatUsageBar({ usageInfo }) {
  if (!usageInfo) return null;

  const uploadUsed = usageInfo.uploadLimit === Infinity ? 0
    : usageInfo.uploadLimit - usageInfo.uploads;
  const chatUsed = usageInfo.chatLimit === Infinity ? 0
    : usageInfo.chatLimit - usageInfo.chats;

  const uploadPct = usageInfo.uploadLimit === Infinity ? 0
    : Math.min(100, Math.round((uploadUsed / usageInfo.uploadLimit) * 100));
  const chatPct = usageInfo.chatLimit === Infinity ? 0
    : Math.min(100, Math.round((chatUsed / usageInfo.chatLimit) * 100));

  const getColor = (pct) =>
    pct >= 90 ? "#ef4444" : pct >= 70 ? "#f97316" : "#6366f1";

  return (
    <div className="chat-usage-bar">
      <div className="chat-usage-header">
        <span className="chat-usage-plan">{usageInfo.label} Plan</span>
        <span className="chat-usage-cycle">🔄 Resets monthly</span>
      </div>

      <div className="chat-usage-meters">
        {/* ── Chat messages meter ── */}
        <div className="chat-usage-meter">
          <div className="chat-usage-meter-label">
            <span>💬 Messages</span>
            <span className="chat-usage-meter-count">
              {usageInfo.chats === Infinity
                ? "∞ remaining"
                : `${usageInfo.chats} of ${usageInfo.chatLimit} remaining`}
            </span>
          </div>
          {usageInfo.chats !== Infinity && (
            <>
              <div className="chat-usage-track">
                <div
                  className="chat-usage-fill"
                  style={{ width: `${chatPct}%`, background: getColor(chatPct) }}
                />
              </div>
              <div className="chat-usage-track-labels">
                <span>{chatPct}% used</span>
                {chatPct >= 80 && (
                  <span className="chat-usage-warn">
                    {usageInfo.chats === 0 ? "⚠ Limit reached" : `⚠ ${usageInfo.chats} left`}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Uploads meter ── */}
        <div className="chat-usage-meter">
          <div className="chat-usage-meter-label">
            <span>📁 Uploads</span>
            <span className="chat-usage-meter-count">
              {usageInfo.uploads === Infinity
                ? "∞ remaining"
                : `${usageInfo.uploads} of ${usageInfo.uploadLimit} remaining`}
            </span>
          </div>
          {usageInfo.uploads !== Infinity && (
            <>
              <div className="chat-usage-track">
                <div
                  className="chat-usage-fill"
                  style={{ width: `${uploadPct}%`, background: getColor(uploadPct) }}
                />
              </div>
              <div className="chat-usage-track-labels">
                <span>{uploadPct}% used</span>
                {uploadPct >= 80 && (
                  <span className="chat-usage-warn">
                    {usageInfo.uploads === 0 ? "⚠ Limit reached" : `⚠ ${usageInfo.uploads} left`}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {(usageInfo.chats === 0 || usageInfo.uploads === 0) && usageInfo.chats !== Infinity && (
        <button
          className="chat-usage-upgrade-btn"
          onClick={() => window.location.href = "/page/pricing"}
        >
          ✦ Upgrade Plan →
        </button>
      )}
    </div>
  );
}

export default function AIChat() {
  const sendingRef = useRef(false);
  const sendingRef = useRef(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const router = useRouter();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="chat-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="chat-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Show login message if not authenticated
  if (!user) {
    return (
      <div className="chat-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="chat-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>Please log in to use the AI chat.</div>
      </div>
    );
  }

  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your AI study assistant. I can help you understand concepts, answer questions, create study plans, or quiz you on any topic. What would you like to learn today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // History & UI state
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: "", message: "", onConfirm: null });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ── Usage state ──────────────────────────────────────────────────────────
  const [usageInfo, setUsageInfo] = useState(null);
  const [limitError, setLimitError] = useState("");

  // ── Usage state ──────────────────────────────────────────────────────────
  const [usageInfo, setUsageInfo] = useState(null);
  const [limitError, setLimitError] = useState("");

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Function to refresh usage
  const refreshUsage = useCallback(() => {
    if (!user) return;
    getRemaining(user.uid, user.email).then(setUsageInfo).catch(console.error);
  }, [user]);

  // Load usage when user is ready
  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  // Detect payment return and refresh usage
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('skipcash_status');
      if (status === 'success') {
        console.log('💬 Chat: Payment success detected, refreshing usage in 3s');
        // Wait for webhook to process, then refresh
        const timer = setTimeout(() => {
          console.log('🔄 Chat: Refreshing usage now');
          refreshUsage();
        }, 3000);
        return () => clearTimeout(timer);
      }
    } catch (err) {
      console.error('Error detecting payment:', err);
    }
  }, [refreshUsage]);

  // Also refresh when page becomes visible (tab focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👀 Chat: Page became visible, refreshing usage');
        refreshUsage();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshUsage]);

  // Function to refresh usage
  const refreshUsage = useCallback(() => {
    if (!user) return;
    getRemaining(user.uid, user.email).then(setUsageInfo).catch(console.error);
  }, [user]);

  // Load usage when user is ready
  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  // Detect payment return and refresh usage
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('skipcash_status');
      if (status === 'success') {
        console.log('💬 Chat: Payment success detected, refreshing usage in 3s');
        // Wait for webhook to process, then refresh
        const timer = setTimeout(() => {
          console.log('🔄 Chat: Refreshing usage now');
          refreshUsage();
        }, 3000);
        return () => clearTimeout(timer);
      }
    } catch (err) {
      console.error('Error detecting payment:', err);
    }
  }, [refreshUsage]);

  // Also refresh when page becomes visible (tab focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👀 Chat: Page became visible, refreshing usage');
        refreshUsage();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshUsage]);

  // Load chat history from Firebase when user is available
  useEffect(() => {
    if (!user) return;

    setLoadingHistory(true);
    const unsubscribe = subscribeToUserChats(user.uid, (result) => {
      if (result.success) {
        setChatHistory(result.data);
      } else {
        console.error("Failed to load chat history:", result.error);
      }
      setLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Auto-save current chat to Firebase
  useEffect(() => {
    if (!user || !currentChatId || messages.length <= 1) return;

    const saveChat = async () => {
      try {
        await saveChatToFirestore(user.uid, currentChatId, messages);
      } catch (error) {
        console.error("Failed to save chat:", error);
      }
    };

    const timeoutId = setTimeout(saveChat, 1000);
    return () => clearTimeout(timeoutId);
  }, [messages, currentChatId, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  // ── Custom Modal ────────────────────────────────────────────────────
  const openModal = (title, message, onConfirm) => {
    setModalConfig({ title, message, onConfirm });
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);
  const closeModal = () => setShowModal(false);

  const handleModalConfirm = () => {
    if (modalConfig.onConfirm) modalConfig.onConfirm();
    if (modalConfig.onConfirm) modalConfig.onConfirm();
    closeModal();
  };

  // ── Chat History Functions ──────────────────────────────────────────
  const saveCurrentChat = async () => {
    if (!user || messages.length <= 1) return;
    if (!user || messages.length <= 1) return;
    try {
      const chatId = currentChatId || Date.now().toString();
      await saveChatToFirestore(user.uid, chatId, messages);
      setCurrentChatId(chatId);
    } catch (error) {
      console.error("Failed to save chat:", error);
    }
  };

  const loadChat = async (chatId) => {
    if (!user) return;
    try {
      const chat = await getChatById(user.uid, chatId);
      if (chat) {
        setMessages(chat.messages);
        setCurrentChatId(chat.id);
        setShowHistory(false);
      }
    } catch (error) {
      console.error("Failed to load chat:", error);
    }
  };

  const deleteChat = async (chatId, e) => {
    e.stopPropagation();
    if (!user) return;
    openModal(
      "Delete Chat",
      "Are you sure you want to delete this chat? This action cannot be undone.",
      async () => {
        try {
          await deleteChatFromFirestore(user.uid, chatId);
          if (currentChatId === chatId) startNewChat();
          if (currentChatId === chatId) startNewChat();
        } catch (error) {
          console.error("Failed to delete chat:", error);
        }
      }
    );
  };

  const startNewChat = () => {
    saveCurrentChat();
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Hi! I'm your AI study assistant. I can help you understand concepts, answer questions, create study plans, or quiz you on any topic. What would you like to learn today?",
        timestamp: new Date(),
      },
    ]);
    setCurrentChatId(null);
    setAttachments([]);
    setShowHistory(false);
    setLimitError("");
    setLimitError("");
  };

  // ── Attach helpers ──────────────────────────────────────────────────
  const addFiles = (files) => {
    const newAttachments = Array.from(files).map((file) => {
      const isImage = file.type.startsWith("image/");
      return {
        id: `${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        type: isImage ? "image" : "file",
        preview: isImage ? URL.createObjectURL(file) : null,
        size: file.size,
      };
    });
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.preview) URL.revokeObjectURL(att.preview);
      return prev.filter((a) => a.id !== id);
    });
  };

  // ── Paste (Ctrl+V) ──────────────────────────────────────────────────
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItems = Array.from(items).filter((item) => item.type.startsWith("image/"));
    if (imageItems.length === 0) return;
    e.preventDefault();
    const files = imageItems.map((item) => item.getAsFile()).filter(Boolean);
    addFiles(files);
  }, []);

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  // ── Drag & drop ─────────────────────────────────────────────────────
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  // ── Send ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading || sendingRef.current) return;
    sendingRef.current = true;

    // ── Check chat limit BEFORE sending ──────────────────────────────
    setLimitError("");
    const check = await checkAndIncrement(user.uid, user.email, "chats");
    if (!check.allowed) {
      setLimitError(
        `You've reached your ${check.label} plan limit of ${check.limit} messages/month. Upgrade to keep chatting.`
      );
      // Refresh usage display
      getRemaining(user.uid, user.email).then(setUsageInfo).catch(console.error);
      // Redirect to pricing page
      setTimeout(() => router.push("/page/pricing"), 1500);
      return;
    }
    // Refresh displayed usage after incrementing
    getRemaining(user.uid, user.email).then(setUsageInfo).catch(console.error);
    if ((!input.trim() && attachments.length === 0) || isLoading || sendingRef.current) return;
    sendingRef.current = true;

    // ── Check chat limit BEFORE sending ──────────────────────────────
    setLimitError("");
    const check = await checkAndIncrement(user.uid, user.email, "chats");
    if (!check.allowed) {
      setLimitError(
        `You've reached your ${check.label} plan limit of ${check.limit} messages/month. Upgrade to keep chatting.`
      );
      // Refresh usage display
      getRemaining(user.uid, user.email).then(setUsageInfo).catch(console.error);
      // Redirect to pricing page
      setTimeout(() => router.push("/page/pricing"), 1500);
      return;
    }
    // Refresh displayed usage after incrementing
    getRemaining(user.uid, user.email).then(setUsageInfo).catch(console.error);

    // Create new chat ID if this is the first message
    if (!currentChatId && messages.length === 1) {
      setCurrentChatId(Date.now().toString());
    }

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      attachments: attachments.map(({ id, name, type, preview }) => ({ id, name, type, preview })),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachments([]);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append(
        "messages",
        JSON.stringify(
          [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
            hasAttachments: m.attachments ? m.attachments.length > 0 : false,
            hasAttachments: m.attachments ? m.attachments.length > 0 : false,
          }))
        )
      );
      attachments.forEach((att) => formData.append("files", att.file));

      const response = await fetch("/api/chat", { method: "POST", body: formData });
      const response = await fetch("/api/chat", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Failed to get response");
      const data = await response.json();

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || data.content || "I apologize, but I couldn't generate a response.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setTimeout(() => saveCurrentChat(), 500);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      sendingRef.current = false;
      sendingRef.current = false;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    openModal(
      "Reset Chat",
      "Clear all messages in the current chat? This action cannot be undone.",
      () => startNewChat()
      () => startNewChat()
    );
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDate = (dateInput) => {
    const date = dateInput?.toDate ? dateInput.toDate() : new Date(dateInput);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const SUGGESTIONS = [
    { icon: "📚", text: "Explain quantum mechanics simply" },
    { icon: "✏️", text: "Quiz me on World War II" },
    { icon: "🎯", text: "Create a study plan for finals" },
    { icon: "💡", text: "Help me understand calculus" },
  ];

  const chatLimitReached = usageInfo && usageInfo.chats === 0 && usageInfo.chats !== Infinity;
  const canSend = (input.trim() || attachments.length > 0) && !isLoading && !chatLimitReached;
  const chatLimitReached = usageInfo && usageInfo.chats === 0 && usageInfo.chats !== Infinity;
  const canSend = (input.trim() || attachments.length > 0) && !isLoading && !chatLimitReached;

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.txt,.md,.csv"
        style={{ display: "none" }}
        onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
      />

      {/* Custom Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{modalConfig.title}</h3>
              <button className="modal-close" onClick={closeModal}><X size={18} /></button>
              <button className="modal-close" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="modal-message">{modalConfig.message}</p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-cancel" onClick={closeModal}>Cancel</button>
              <button className="modal-btn modal-btn-confirm" onClick={handleModalConfirm}>Confirm</button>
              <button className="modal-btn modal-btn-cancel" onClick={closeModal}>Cancel</button>
              <button className="modal-btn modal-btn-confirm" onClick={handleModalConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      <div className="chat-page">
        {/* History Sidebar */}
        <div className={`chat-history-sidebar ${showHistory ? "chat-history-sidebar--open" : ""}`}>
          <div className="chat-history-header">
            <div className="chat-history-title">
              <History size={18} />
              <span>Chat History</span>
            </div>
            <button className="chat-history-close" onClick={() => setShowHistory(false)}>
              <X size={18} />
            </button>
          </div>

          <button className="chat-new-btn" onClick={startNewChat}>
            <Plus size={16} />
            New Chat
          </button>

          <div className="chat-history-list">
            {loadingHistory ? (
              <div className="chat-history-loading"><p>Loading chats...</p></div>
              <div className="chat-history-loading"><p>Loading chats...</p></div>
            ) : chatHistory.length === 0 ? (
              <div className="chat-history-empty">
                <MessageSquare size={32} opacity={0.3} />
                <p>No chat history yet</p>
              </div>
            ) : (
              chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className={`chat-history-item ${currentChatId === chat.id ? "chat-history-item--active" : ""}`}
                  onClick={() => loadChat(chat.id)}
                >
                  <div className="chat-history-item-content">
                    <div className="chat-history-item-title">{chat.title || "Untitled Chat"}</div>
                    <div className="chat-history-item-time">
                      {formatDate(chat.updatedAt?.toDate?.() || chat.updatedAt || chat.timestamp)}
                    </div>
                  </div>
                  <button
                    className="chat-history-item-delete"
                    onClick={(e) => deleteChat(chat.id, e)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* History Overlay (for mobile) */}
        {showHistory && (
          <div className="chat-history-overlay" onClick={() => setShowHistory(false)} />
        )}

        {/* Main Chat */}
        <div className="chat-main">
          {/* Topbar */}
          <div className="topbar">
            <div className="topbar-left">
              <button className="chat-hamburger" onClick={() => setShowHistory(!showHistory)}>
                <Menu size={20} />
              </button>
              <h1>EasyRecall</h1>
              <p>Your personal learning companion</p>
            </div>
            <div className="topbar-right">
              <button className="chat-reset-btn" onClick={handleReset}>
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </div>

          {/* Chat container */}
          <div
            className={`chat-container${isDragging ? " chat-container--dragging" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag overlay */}
            {isDragging && (
              <div className="chat-drop-overlay">
                <div className="chat-drop-overlay-inner">
                  <ImageIcon size={40} />
                  <span>Drop files here</span>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`chat-message chat-message--${msg.role}`}>
                  <div className="chat-message-avatar">
                    {msg.role === "user" ? <User size={18} /> : <Bot size={18} />}
                  </div>
                  <div className="chat-message-content">
                    {msg.attachments?.length > 0 && (
                      <div className="chat-message-attachments">
                        {msg.attachments.map((att) =>
                          att.type === "image" ? (
                            <img key={att.id} src={att.preview} alt={att.name} className="chat-msg-img" />
                          ) : (
                            <div key={att.id} className="chat-msg-file">
                              <FileText size={14} />
                              <span>{att.name}</span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                    {msg.content && (
                      <div
                        className="chat-message-text"
                        dangerouslySetInnerHTML={{ __html: formatTopicHeadings(msg.content) }}
                      />
                    )}
                    <div className="chat-message-time">{formatTime(msg.timestamp)}</div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="chat-message chat-message--assistant">
                  <div className="chat-message-avatar"><Bot size={18} /></div>
                  <div className="chat-typing">
                    <div className="chat-typing-dot" />
                    <div className="chat-typing-dot" />
                    <div className="chat-typing-dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {messages.length === 1 && (
              <div className="chat-suggestions">
                <div className="chat-suggestions-title">
                  <Sparkles size={13} /> Try asking...
                </div>
                <div className="chat-suggestions-grid">
                  {SUGGESTIONS.map((s, idx) => (
                    <button key={idx} className="chat-suggestion-card" onClick={() => setInput(s.text)}>
                      <span className="chat-suggestion-icon">{s.icon}</span>
                      <span className="chat-suggestion-text">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Usage Bar ── */}
            <ChatUsageBar usageInfo={usageInfo} />

            {/* ── Usage Bar ── */}
            <ChatUsageBar usageInfo={usageInfo} />

            {/* Input area */}
            <div className="chat-input-container">
              {attachments.length > 0 && (
                <div className="chat-attachments-preview">
                  {attachments.map((att) => (
                    <div key={att.id} className="chat-attachment-chip">
                      {att.type === "image" ? (
                        <img src={att.preview} alt={att.name} className="chat-attachment-thumb" />
                      ) : (
                        <div className="chat-attachment-file-icon"><FileText size={16} /></div>
                        <div className="chat-attachment-file-icon"><FileText size={16} /></div>
                      )}
                      <div className="chat-attachment-info">
                        <span className="chat-attachment-name">{att.name}</span>
                        <span className="chat-attachment-size">{formatSize(att.size)}</span>
                      </div>
                      <button className="chat-attachment-remove" onClick={() => removeAttachment(att.id)}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Limit error ── */}
              {limitError && (
                <div className="chat-limit-error">
                  <span>⚠ {limitError}</span>
                  <button onClick={() => window.location.href = "/page/pricing"}>
                    Upgrade →
                  </button>
                </div>
              )}

              {/* ── Limit error ── */}
              {limitError && (
                <div className="chat-limit-error">
                  <span>⚠ {limitError}</span>
                  <button onClick={() => window.location.href = "/page/pricing"}>
                    Upgrade →
                  </button>
                </div>
              )}

              <div className="chat-input-wrapper">
                <button
                  className="chat-attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file or image"
                  type="button"
                >
                  <Plus size={20} />
                </button>

                <textarea
                  ref={textareaRef}
                  className="chat-input"
                  placeholder={chatLimitReached ? "Message limit reached — upgrade to continue…" : "Ask anything..."}
                  placeholder={chatLimitReached ? "Message limit reached — upgrade to continue…" : "Ask anything..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (isLoading || chatLimitReached) return;
                    handleKeyDown(e);
                  }}
                  onKeyDown={e => {
                    if (isLoading || chatLimitReached) return;
                    handleKeyDown(e);
                  }}
                  rows={1}
                  disabled={isLoading || chatLimitReached}
                  disabled={isLoading || chatLimitReached}
                />

                <button 
                  className="chat-send-btn" 
                  onClick={chatLimitReached ? () => router.push("/page/pricing") : (!isLoading && !chatLimitReached ? handleSend : undefined)} 
                  disabled={!canSend || isLoading || chatLimitReached}
                  title={chatLimitReached ? "Message limit reached — click to upgrade" : ""}
                >
                <button 
                  className="chat-send-btn" 
                  onClick={chatLimitReached ? () => router.push("/page/pricing") : (!isLoading && !chatLimitReached ? handleSend : undefined)} 
                  disabled={!canSend || isLoading || chatLimitReached}
                  title={chatLimitReached ? "Message limit reached — click to upgrade" : ""}
                >
                  {isLoading ? <Loader2 size={20} className="chat-loading-icon" /> : <Send size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}