"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles, Bot, User, Loader2, RotateCcw, Plus, X, FileText, ImageIcon, Menu, History, MessageSquare, Trash2, ChevronDown } from "lucide-react";
import { useAuth } from "../../AuthProvider";
import { saveChatToFirestore, getUserChats, getChatById, deleteChatFromFirestore, subscribeToUserChats } from "@/lib/firebaseStore";
import { checkAndIncrement, getRemaining } from "@/lib/usageService";
import "./ai-chat.css";

// Helper: Bold topic headings like "1. Matter:" or "2. Energy:"
function formatTopicHeadings(text) {
  return text.replace(/^(\d+\.)\s*([A-Za-z0-9 \-]+):/gm, (match, num, topic) => {
    return `<b>${num} ${topic}:</b>`;
  });
}

// ── Usage Progress Bar (inside sidebar) ─────────────────────────────────────
function ChatUsageBar({ usageInfo }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!usageInfo) return null;

  const uploadUsed = usageInfo.uploadLimit === Infinity ? 0 : usageInfo.uploadLimit - usageInfo.uploads;
  const chatUsed = usageInfo.chatLimit === Infinity ? 0 : usageInfo.chatLimit - usageInfo.chats;

  const uploadPct = usageInfo.uploadLimit === Infinity ? 0 : Math.min(100, Math.round((uploadUsed / usageInfo.uploadLimit) * 100));
  const chatPct = usageInfo.chatLimit === Infinity ? 0 : Math.min(100, Math.round((chatUsed / usageInfo.chatLimit) * 100));

  const getColor = (pct) => (pct >= 90 ? "#ef4444" : pct >= 70 ? "#f97316" : "#6366f1");

  const getSummary = () => {
    if (usageInfo.chats === Infinity) return "Unlimited plan";
    const totalUsed = (usageInfo.chatLimit - usageInfo.chats) + (usageInfo.uploadLimit - usageInfo.uploads);
    const totalLimit = usageInfo.chatLimit + usageInfo.uploadLimit;
    return `${totalUsed}/${totalLimit} used`;
  };

  return (
    <div className={`chat-usage-bar ${isOpen ? 'chat-usage-bar--open' : ''}`}>
      <button className="chat-usage-toggle" onClick={() => setIsOpen(!isOpen)} type="button">
        <div className="chat-usage-header">
          <span className="chat-usage-plan">
            <span className="chat-usage-plan-icon">📊</span>
            {usageInfo.label} Plan
          </span>
          <div className="chat-usage-toggle-right">
            <span className="chat-usage-summary">{getSummary()}</span>
            <span className={`chat-usage-chevron ${isOpen ? 'chat-usage-chevron--open' : ''}`}>
              <ChevronDown size={18} />
            </span>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="chat-usage-content">
          <div className="chat-usage-cycle">🔄 Resets monthly</div>

          <div className="chat-usage-meters">
            <div className="chat-usage-meter">
              <div className="chat-usage-meter-label">
                <span>💬 Messages</span>
                <span className="chat-usage-meter-count">
                  {usageInfo.chats === Infinity ? "∞ remaining" : `${usageInfo.chats} of ${usageInfo.chatLimit} remaining`}
                </span>
              </div>
              {usageInfo.chats !== Infinity && (
                <>
                  <div className="chat-usage-track">
                    <div className="chat-usage-fill" style={{ width: `${chatPct}%`, background: getColor(chatPct) }} />
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

            <div className="chat-usage-meter">
              <div className="chat-usage-meter-label">
                <span>📁 Uploads</span>
                <span className="chat-usage-meter-count">
                  {usageInfo.uploads === Infinity ? "∞ remaining" : `${usageInfo.uploads} of ${usageInfo.uploadLimit} remaining`}
                </span>
              </div>
              {usageInfo.uploads !== Infinity && (
                <>
                  <div className="chat-usage-track">
                    <div className="chat-usage-fill" style={{ width: `${uploadPct}%`, background: getColor(uploadPct) }} />
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
            <button className="chat-usage-upgrade-btn" onClick={() => window.location.href = "/page/pricing"}>
              ✦ Upgrade Plan →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Chat History Dropdown ────────────────────────────────
function ChatHistoryDropdown({
  chatHistory,
  loadingHistory,
  currentChatId,
  onLoadChat,
  onDeleteChat,
  onStartNewChat,
  isOpen,
  onToggle
}) {
  return (
    <div className={`chat-history-dropdown ${isOpen ? 'chat-history-dropdown--open' : ''}`}>
      <button className="chat-history-toggle" onClick={onToggle} type="button">
        <div className="chat-history-toggle-content">
          <span className="chat-history-toggle-title">
            <History size={18} />
            Chat History
            {chatHistory.length > 0 && <span className="chat-history-badge">{chatHistory.length}</span>}
          </span>
          <span className={`chat-history-chevron ${isOpen ? 'chat-history-chevron--open' : ''}`}>
            <ChevronDown size={18} />
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="chat-history-dropdown-content">
          <button className="chat-new-btn" onClick={onStartNewChat}>
            <Plus size={16} />
            New Chat
          </button>

          <div className="chat-history-list">
            {loadingHistory ? (
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
                  onClick={() => onLoadChat(chat.id)}
                >
                  <div className="chat-history-item-content">
                    <div className="chat-history-item-title">{chat.title || "Untitled Chat"}</div>
                    <div className="chat-history-item-time">
                      {formatDate(chat.updatedAt?.toDate?.() || chat.updatedAt || chat.timestamp)}
                    </div>
                  </div>
                  <button className="chat-history-item-delete" onClick={(e) => onDeleteChat(chat.id, e)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateInput) {
  const date = dateInput?.toDate ? dateInput.toDate() : new Date(dateInput);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

export default function AIChat() {
  const sendingRef = useRef(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [showSidebar, setShowSidebar] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  if (loading) return <div className="chat-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>;
  if (!user) return <div className="chat-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>Please log in to use the AI chat.</div>;

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

  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: "", message: "", onConfirm: null });
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [usageInfo, setUsageInfo] = useState(null);
  const [limitError, setLimitError] = useState("");

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const closeSidebar = useCallback(() => setShowSidebar(false), []);

  const refreshUsage = useCallback(() => {
    if (!user) return;
    getRemaining(user.uid, user.email).then(setUsageInfo).catch(console.error);
  }, [user]);

  useEffect(() => { refreshUsage(); }, [refreshUsage]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('skipcash_status');
      if (status === 'success') {
        const timer = setTimeout(() => refreshUsage(), 3000);
        return () => clearTimeout(timer);
      }
    } catch (err) {
      console.error('Error detecting payment:', err);
    }
  }, [refreshUsage]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) refreshUsage();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshUsage]);

  useEffect(() => {
    if (!user) return;
    setLoadingHistory(true);
    const unsubscribe = subscribeToUserChats(user.uid, (result) => {
      if (result.success) setChatHistory(result.data);
      else console.error("Failed to load chat history:", result.error);
      setLoadingHistory(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !currentChatId || messages.length <= 1) return;
    const saveChat = async () => {
      try { await saveChatToFirestore(user.uid, currentChatId, messages); }
      catch (error) { console.error("Failed to save chat:", error); }
    };
    const timeoutId = setTimeout(saveChat, 1000);
    return () => clearTimeout(timeoutId);
  }, [messages, currentChatId, user]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  const openModal = (title, message, onConfirm) => {
    setModalConfig({ title, message, onConfirm });
    setShowModal(true);
  };
  const closeModal = () => setShowModal(false);
  const handleModalConfirm = () => {
    if (modalConfig.onConfirm) modalConfig.onConfirm();
    closeModal();
  };

  const saveCurrentChat = async () => {
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
      }
    } catch (error) {
      console.error("Failed to load chat:", error);
    }
    closeSidebar();
  };

  const deleteChat = async (chatId, e) => {
    e.stopPropagation();
    if (!user) return;
    openModal("Delete Chat", "Are you sure you want to delete this chat? This action cannot be undone.", async () => {
      try {
        await deleteChatFromFirestore(user.uid, chatId);
        if (currentChatId === chatId) startNewChat();
      } catch (error) {
        console.error("Failed to delete chat:", error);
      }
    });
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
    setLimitError("");
    closeSidebar();
  };

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

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading || sendingRef.current) return;
    sendingRef.current = true;
    closeSidebar();

    setLimitError("");
    const check = await checkAndIncrement(user.uid, user.email, "chats");
    if (!check.allowed) {
      setLimitError(`You've reached your ${check.label} plan limit of ${check.limit} messages/month. Upgrade to keep chatting.`);
      getRemaining(user.uid, user.email).then(setUsageInfo).catch(console.error);
      setTimeout(() => router.push("/page/pricing"), 1500);
      sendingRef.current = false;
      return;
    }
    getRemaining(user.uid, user.email).then(setUsageInfo).catch(console.error);

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
      formData.append("messages", JSON.stringify([...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
        hasAttachments: m.attachments ? m.attachments.length > 0 : false,
      }))));
      attachments.forEach((att) => formData.append("files", att.file));

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
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, I encountered an error. Please try again.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
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
    openModal("Reset Chat", "Clear all messages in the current chat? This action cannot be undone.", () => startNewChat());
  };

  const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

  return (
    <>
      <input ref={fileInputRef} type="file" multiple accept="image/*,.txt,.md,.csv" style={{ display: "none" }}
        onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }} />

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{modalConfig.title}</h3>
              <button className="modal-close" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="modal-message">{modalConfig.message}</p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-cancel" onClick={closeModal}>Cancel</button>
              <button className="modal-btn modal-btn-confirm" onClick={handleModalConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showSidebar && <div className="chat-sidebar-overlay" onClick={closeSidebar} />}

      <div className="chat-page">
        {/* SIDEBAR — slides from RIGHT */}
        <div className={`chat-sidebar ${showSidebar ? 'chat-sidebar--open' : ''}`}>
          <div className="chat-sidebar-header">
            <h2 className="chat-sidebar-title">EasyRecall</h2>
            <button className="chat-sidebar-close" onClick={closeSidebar}>
              <X size={20} />
            </button>
          </div>

          <div className="chat-sidebar-usage">
            <ChatUsageBar usageInfo={usageInfo} />
          </div>

          <ChatHistoryDropdown
            chatHistory={chatHistory}
            loadingHistory={loadingHistory}
            currentChatId={currentChatId}
            onLoadChat={loadChat}
            onDeleteChat={deleteChat}
            onStartNewChat={startNewChat}
            isOpen={showHistory}
            onToggle={() => setShowHistory(!showHistory)}
          />
        </div>

        {/* MAIN CHAT AREA */}
        <div className="chat-main">
          {/* Topbar with Hamburger on RIGHT */}
          <div className="topbar">
            <div className="topbar-left">
              <h1>EasyRecall</h1>
              <p>Your personal learning companion</p>
            </div>

            <div className="topbar-right">
              <button className="chat-reset-btn" onClick={handleReset}>
                <RotateCcw size={14} /> Reset
              </button>

              <button className="chat-hamburger" onClick={() => setShowSidebar((prev) => !prev)}>
                <Menu size={20} />
              </button>
            </div>
          </div>

          {/* Chat Container */}
          <div className={`chat-container${isDragging ? " chat-container--dragging" : ""}`}
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>

            {isDragging && (
              <div className="chat-drop-overlay">
                <div className="chat-drop-overlay-inner">
                  <ImageIcon size={40} />
                  <span>Drop files here</span>
                </div>
              </div>
            )}

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
                      <div className="chat-message-text" dangerouslySetInnerHTML={{ __html: formatTopicHeadings(msg.content) }} />
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

            <div className="chat-input-container">
              {attachments.length > 0 && (
                <div className="chat-attachments-preview">
                  {attachments.map((att) => (
                    <div key={att.id} className="chat-attachment-chip">
                      {att.type === "image" ? (
                        <img src={att.preview} alt={att.name} className="chat-attachment-thumb" />
                      ) : (
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

              {limitError && (
                <div className="chat-limit-error">
                  <span>⚠ {limitError}</span>
                  <button onClick={() => window.location.href = "/page/pricing"}>Upgrade →</button>
                </div>
              )}

              <div className="chat-input-wrapper">
                <button className="chat-attach-btn" onClick={() => fileInputRef.current?.click()} title="Attach file or image" type="button">
                  <Plus size={20} />
                </button>

                <textarea
                  ref={textareaRef}
                  className="chat-input"
                  placeholder={chatLimitReached ? "Message limit reached — upgrade to continue…" : "Ask anything..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={closeSidebar}
                  onKeyDown={(e) => { if (!isLoading && !chatLimitReached) handleKeyDown(e); }}
                  rows={1}
                  disabled={isLoading || chatLimitReached}
                />

                <button className="chat-send-btn"
                  onClick={chatLimitReached ? () => router.push("/page/pricing") : handleSend}
                  disabled={!canSend || isLoading || chatLimitReached}>
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