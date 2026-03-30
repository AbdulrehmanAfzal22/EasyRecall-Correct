"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, FileCode, FileJson, BarChart3, Table } from "lucide-react";
import { auth } from "../../../../lib/firebase";
import { saveDocument, loadDocuments } from "../../../../lib/service";
import { saveFlashcards } from "../../../../lib/flashcardStore";
import { saveQuiz } from "../../../../lib/quizStore";
import { saveSegments } from "../../../../lib/segmentStore";
import { checkAndIncrement, getRemaining } from "../../../../lib/usageService";
import "./content-intake.css";

// ── File type icons and utilities ──────────────────────────────────────────
const FILE_ICONS = {
  pdf: FileText, txt: FileCode, md: FileCode, doc: FileText, docx: FileText,
  ppt: BarChart3, pptx: BarChart3, xls: Table, xlsx: Table,
};

const getFileType = (name) => {
  const ext = name.split(".").pop().toLowerCase();
  return {
    ext,
    icon: FILE_ICONS[ext] || Upload,
    label: ext.toUpperCase(),
    color: ({
      pdf: "#e74c3c", txt: "#3498db", md: "#3498db",
      doc: "#27ae60", docx: "#27ae60",
      ppt: "#e67e22", pptx: "#e67e22",
    })[ext] || "#95a5a6",
  };
};

const formatSize = (bytes) => {
  if (bytes < 1024)       return bytes + " B";
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 ** 2)).toFixed(1) + " MB";
};

// ── Usage Progress Bar Component ────────────────────────────────────────────
function UsageBar({ usageInfo, onReset }) {
  if (!usageInfo) return null;

  const uploadUsed = usageInfo.uploadLimit === Infinity ? 0
    : usageInfo.uploadLimit - usageInfo.uploads;
  const chatUsed   = usageInfo.chatLimit   === Infinity ? 0
    : usageInfo.chatLimit   - usageInfo.chats;

  const uploadPct  = usageInfo.uploadLimit === Infinity ? 0
    : Math.min(100, Math.round((uploadUsed / usageInfo.uploadLimit) * 100));
  const chatPct    = usageInfo.chatLimit   === Infinity ? 0
    : Math.min(100, Math.round((chatUsed   / usageInfo.chatLimit)   * 100));

  const getColor = (pct) =>
    pct >= 90 ? "#ef4444" : pct >= 70 ? "#f97316" : "#6366f1";

  return (
    <div className="ci-usage-bar">
      <div className="ci-usage-header">
        <span className="ci-usage-plan">{usageInfo.label} Plan</span>
        <span className="ci-usage-cycle">🔄 Resets monthly</span>
      </div>

      <div className="ci-usage-meters">
        {/* ── Uploads meter ── */}
        <div className="ci-usage-meter">
          <div className="ci-usage-meter-label">
            <span>📁 Uploads</span>
            <span className="ci-usage-meter-count">
              {usageInfo.uploads === Infinity
                ? "∞ remaining"
                : `${usageInfo.uploads} of ${usageInfo.uploadLimit} remaining`}
            </span>
          </div>
          {usageInfo.uploads !== Infinity && (
            <>
              <div className="ci-usage-track">
                <div
                  className="ci-usage-fill"
                  style={{ width: `${uploadPct}%`, background: getColor(uploadPct) }}
                />
              </div>
              <div className="ci-usage-track-labels">
                <span>{uploadPct}% used</span>
                {uploadPct >= 80 && (
                  <span className="ci-usage-warn">
                    {usageInfo.uploads === 0 ? "⚠ Limit reached" : `⚠ ${usageInfo.uploads} left`}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Chats meter ── */}
        <div className="ci-usage-meter">
          <div className="ci-usage-meter-label">
            <span>💬 Chats</span>
            <span className="ci-usage-meter-count">
              {usageInfo.chats === Infinity
                ? "∞ remaining"
                : `${usageInfo.chats} of ${usageInfo.chatLimit} remaining`}
            </span>
          </div>
          {usageInfo.chats !== Infinity && (
            <>
              <div className="ci-usage-track">
                <div
                  className="ci-usage-fill"
                  style={{ width: `${chatPct}%`, background: getColor(chatPct) }}
                />
              </div>
              <div className="ci-usage-track-labels">
                <span>{chatPct}% used</span>
                {chatPct >= 80 && (
                  <span className="ci-usage-warn">
                    {usageInfo.chats === 0 ? "⚠ Limit reached" : `⚠ ${usageInfo.chats} left`}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        {(usageInfo.uploads === 0 || usageInfo.chats === 0) && usageInfo.uploads !== Infinity && (
          <button
            className="ci-usage-upgrade-btn"
            onClick={() => window.location.href = "/page/pricing"}
            style={{ flex: 1 }}
          >
            ✦ Upgrade Plan →
          </button>
        )}
        <button
          onClick={onReset}
          style={{
            padding: '10px 15px',
            background: '#666',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            whiteSpace: 'nowrap',
          }}
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  );
}

export default function ContentIntake() {
  const router = useRouter();
  const inputRef = useRef();

  const [inputMode,    setInputMode]    = useState("file");
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
    // Fetch uploaded documents on mount and when user changes
    useEffect(() => {
      const fetchDocs = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        setLoadingDocs(true);
        try {
          const docs = await loadDocuments(uid);
          setDocuments(docs);
        } catch (e) {
          console.error("Failed to load documents:", e);
        } finally {
          setLoadingDocs(false);
        }
      };
      fetchDocs();
    }, []);
  const [pastedText,   setPastedText]   = useState("");
  const [files,        setFiles]        = useState([]);
  const [rawFiles,     setRawFiles]     = useState([]);
  const [numCards,     setNumCards]     = useState(10);
  const [drag,         setDrag]         = useState(false);
  const [dragCount,    setDragCount]    = useState(0);
  const [generating,   setGenerating]   = useState(false);
  const [genProgress,  setGenProgress]  = useState(0);
  const [done,         setDone]         = useState(false);
  const [cardCount,    setCardCount]    = useState(0);
  const [segmentCount, setSegmentCount] = useState(0);
  const [error,        setError]        = useState("");
  const [saving,       setSaving]       = useState(false);

  // ── Usage state ──────────────────────────────────────────────────────────
  const [usageInfo, setUsageInfo] = useState(null);

  // Function to refresh usage
  const refreshUsage = useCallback(() => {
    const uid   = auth.currentUser?.uid;
    const email = auth.currentUser?.email;
    if (!uid) return;
    getRemaining(uid, email).then(setUsageInfo).catch(console.error);
  }, []);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  // Detect payment return and refresh usage
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('skipcash_status');
      if (status === 'success') {
        console.log('📁 Content intake: Payment success detected, refreshing usage in 3s');
        // Wait for webhook to process, then refresh
        const timer = setTimeout(() => {
          console.log('🔄 Content intake: Refreshing usage now');
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
        console.log('👀 Content intake: Page became visible, refreshing usage');
        refreshUsage();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshUsage]);

  // ── Drag / drop ────────────────────────────────────────────────────────
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    setDragCount((c) => { if (c === 0) setDrag(true); return c + 1; });
  }, []);
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragCount((c) => { const n = c - 1; if (n === 0) setDrag(false); return n; });
  }, []);
  const handleDragOver  = useCallback((e) => e.preventDefault(), []);
  const handleDrop      = useCallback((e) => {
    e.preventDefault(); setDrag(false); setDragCount(0);
    addFiles(e.dataTransfer.files);
  }, []);

  // Only allow one file at a time
  const addFiles = (incoming) => {
    const arr  = Array.from(incoming);
    if (arr.length === 0) return;
    const f = arr[0];
    const meta = [{
      id:   Math.random().toString(36).slice(2),
      name: f.name, size: formatSize(f.size), ...getFileType(f.name),
    }];
    setFiles(meta);
    setRawFiles([f]);
    setDone(false); setError("");
  };

  const removeFile = (id) => {
    const idx = files.findIndex((f) => f.id === id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setRawFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearAll = () => {
    setFiles([]); setRawFiles([]);
    setPastedText("");
    setDone(false); setError("");
  };

  const openPicker = () => inputRef.current?.click();

  // ── Generate: flashcards + segments in parallel ─────────────────────
  const handleGenerate = async () => {
    setError(""); setGenerating(true); setGenProgress(0); setSaving(false);

    // ── Check upload limit BEFORE processing ──────────────────────────
    const uid   = auth.currentUser?.uid;
    const email = auth.currentUser?.email;

    if (uid) {
      const check = await checkAndIncrement(uid, email, "uploads");
      if (!check.allowed) {
        setError(
          `You've reached your ${check.label} plan upload limit (${check.limit} uploads/month). ` +
          `Upgrade your plan to continue.`
        );
        setGenerating(false);
        // Refresh usage display
        getRemaining(uid, email).then(setUsageInfo).catch(console.error);
        // Redirect to pricing page
        setTimeout(() => router.push("/page/pricing"), 1500);
        return;
      }
      // Refresh displayed usage after incrementing
      getRemaining(uid, email).then(setUsageInfo).catch(console.error);
    }

    let p = 0;
    const ticker = setInterval(() => {
      p += Math.random() * 8 + 3;
      setGenProgress(Math.min(p, 85));
    }, 280);

    try {
      // ── Read content ──
      let combined = "", fileNames = "";
      if (inputMode === "text") {
        combined  = pastedText.trim();
        fileNames = "Pasted text";
        if (!combined) throw new Error("Please paste some text content first.");
      } else {
        for (const file of rawFiles) {
          combined  += (combined ? "\n\n" : "") + await file.text();
          fileNames += (fileNames ? ", " : "") + file.name;
        }
        if (!combined.trim()) throw new Error("Files appear to be empty or unreadable.");
      }

      // ── Fire both APIs in parallel ──
      const [flashRes, segRes] = await Promise.allSettled([
        fetch("/api/generate-flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: combined, fileNames, numCards }),
          signal: AbortSignal.timeout(60000),
        }),
        fetch("/api/extract-segments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: combined, fileName: fileNames }),
          signal: AbortSignal.timeout(90000),
        }),
      ]);

      // ── Handle flashcards ──
      if (flashRes.status === "rejected") {
        throw new Error(`Flashcard generation failed: ${flashRes.reason?.message}`);
      }
      const flashResponse = flashRes.value;
      let flashData;
      try { flashData = await flashResponse.json(); }
      catch { throw new Error(`Server error (${flashResponse.status}) — try again.`); }
      if (!flashResponse.ok) {
        throw new Error(flashData.error || "Flashcard generation failed.");
      }

      // ── Handle segments (non-blocking — failure is OK) ──
      let segmentData = null;
      if (segRes.status === "fulfilled") {
        try {
          const segResponse = segRes.value;
          if (segResponse.ok) {
            segmentData = await segResponse.json();
          }
        } catch (_) { /* silently skip */ }
      }

      // ── Save flashcards & quiz ──
      saveFlashcards(flashData.flashcards, { fileNames, numCards, topic: fileNames });
      if (flashData.quiz) saveQuiz(flashData.quiz, { fileNames, topic: fileNames });

      // ── Save segments ──
      if (segmentData?.groups) {
        saveSegments(segmentData, { fileNames, topic: fileNames });
        setSegmentCount(segmentData.stats?.totalSegments ?? segmentData.groups.flatMap(g => g.segments).length);
      }

      // ── Firebase save ──
      if (uid) {
        setSaving(true);
        try {
          await saveDocument(uid, {
            file: null,
            extractedText: combined,
            flashcards: flashData.flashcards,
            quiz: flashData.quiz ?? null,
            topic: fileNames,
            segments: segmentData?.groups ?? null,
            segmentStats: segmentData?.stats ?? null,
          });
          // Refresh document list after upload
          const docs = await loadDocuments(uid);
          setDocuments(docs);
        } catch (e) {
          console.error("❌ Firebase save error:", e);
        } finally {
          setSaving(false);
        }
      }

      clearInterval(ticker);
      setGenProgress(100);
      await new Promise((r) => setTimeout(r, 450));
      setDone(true);
      setCardCount(flashData.count);

    } catch (e) {
      clearInterval(ticker);
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  // Only allow generate if exactly one file or pasted text
  const canGenerate = inputMode === "text"
    ? pastedText.trim().length > 0
    : files.length === 1;

  const uploadLimitReached = usageInfo && usageInfo.uploads === 0 && usageInfo.uploads !== Infinity;

  const wordCount = pastedText.trim() ? pastedText.trim().split(/\s+/).length : 0;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Content Intake</h1>
          <p>Input once · recall repeatedly · master anything</p>
        </div>
      </div>

      <div className="page ci-page">
        <div className="ci-hero">
          <div className="ci-hero-eyebrow">Powered by EASYRECALL</div>
          <h2 className="ci-hero-title">
            Drop your study material.<br />
            <span className="ci-hero-accent">Get flashcards, quiz &amp; insights.</span>
          </h2>
          <p className="ci-hero-sub">
            Upload files or paste text. We extract topics, key concepts, flashcards and a full quiz automatically.
          </p>
        </div>

        {/* ── Usage Bar ────────────────────────────────────────────────── */}
        <UsageBar usageInfo={usageInfo} />

        {!done ? (
          <>
            {/* Removed 'Your Uploaded Document' and meta info. Uploaded file will remain visible in uploader below until user clicks 'Upload new content'. */}
            <div className="ci-mode-tabs">
              <button
                className={`ci-mode-tab ${inputMode === "file" ? "ci-mode-tab--active" : ""}`}
                onClick={() => setInputMode("file")}
              >
                <span>📁</span> Upload Files
              </button>
              <button
                className={`ci-mode-tab ${inputMode === "text" ? "ci-mode-tab--active" : ""}`}
                onClick={() => setInputMode("text")}
              >
                <span>✏️</span> Paste Text
              </button>
            </div>

            {/* ── File upload mode ── */}
            {inputMode === "file" && (
              <>
                <div
                  className={`ci-dropzone ${drag ? "ci-dropzone--active" : ""} ${files.length ? "ci-dropzone--has-files" : ""}`}
                  onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}   onDrop={handleDrop}
                  onClick={files.length === 0 ? openPicker : undefined}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && openPicker()}
                >
                  <input ref={inputRef} type="file" multiple
                    accept=".txt,.md,.pdf,.doc,.docx,.ppt,.pptx"
                    style={{ display: "none" }}
                    onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                  />

                  <div className="ci-orbs">
                    {[1,2,3,4,5,6].map(n => <div key={n} className={`ci-orb ci-orb--${n}`} />)}
                  </div>

                  {files.length === 0 ? (
                    <div className="ci-drop-empty">
                      <div className="ci-drop-icon-ring">
                        <svg className="ci-drop-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 4v12M6 10l6-6 6 6"/><path d="M4 20h16"/>
                        </svg>
                      </div>
                      <div className="ci-drop-title">
                        {drag ? "Release to upload" : "Drag & drop your files here"}
                      </div>
                      <div className="ci-drop-subtitle">
                        or{" "}
                        <button className="ci-drop-browse-link"
                          onClick={(e) => { e.stopPropagation(); openPicker(); }}>
                          browse file
                        </button>{" "}
                        from your computer
                      </div>
                      <div className="ci-drop-formats">
                        {["PDF","DOCX","PPTX","TXT","MD"].map((f) => (
                          <span key={f} className="ci-format-chip">{f}</span>
                        ))}
                      </div>
                      <div className="ci-drop-generates">
                        <span className="ci-generates-chip">🃏 Flashcards</span>
                        <span className="ci-generates-chip">📝 MCQ</span>
                        <span className="ci-generates-chip">✓✗ True / False</span>
                        <span className="ci-generates-chip">📌 Segments</span>
                      </div>
                    </div>
                  ) : (
                    <div className="ci-files-grid">
                      {files.map((f) => (
                        <div key={f.id} className="ci-file-card" style={{ "--fc": f.color }}>
                          <div className="ci-file-card-top">
                            <span className="ci-file-ext-badge">{f.label}</span>
                            <button className="ci-file-remove"
                              onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}>✕</button>
                          </div>
                          <div className="ci-file-icon">
                            {f.icon ? <f.icon size={32} /> : <Upload size={32} />}
                          </div>
                          <div className="ci-file-name" title={f.name}>{f.name}</div>
                          <div className="ci-file-size">{f.size}</div>
                        </div>
                      ))}
                      {/* Only allow one file, so no add more button */}
                    </div>
                  )}
                  {drag && <div className="ci-drag-overlay" />}
                </div>

                {files.length > 0 && (
                  <div className="ci-config-row">
                    <div className="ci-config-left">
                      <div className="ci-config-item">
                        <span className="ci-config-label">File selected</span>
                        <span className="ci-config-value">{files[0]?.name}</span>
                      </div>
                      <button className="ci-clear-btn" onClick={clearAll}>Clear</button>
                    </div>
                    <div className="ci-config-right">
                      <span className="ci-config-label">Flashcards</span>
                      <div className="ci-stepper">
                        <button className="ci-stepper-btn" onClick={() => setNumCards((n) => Math.max(3, n - 1))}>−</button>
                        <span className="ci-stepper-val">{numCards}</span>
                        <button className="ci-stepper-btn" onClick={() => setNumCards((n) => Math.min(30, n + 1))}>+</button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Text paste mode ── */}
            {inputMode === "text" && (
              <div className="ci-text-panel">
                <textarea
                  className="ci-text-area"
                  placeholder="Paste your notes, textbook content, lecture slides text, or anything you want to study…"
                  value={pastedText}
                  onChange={(e) => { setPastedText(e.target.value); setDone(false); setError(""); }}
                  rows={14}
                />
                <div className="ci-text-footer">
                  <span className="ci-text-meta">
                    {wordCount > 0
                      ? `${wordCount} words · ${pastedText.length} characters`
                      : "Start typing or paste your content above"}
                  </span>
                  <div className="ci-config-right">
                    <span className="ci-config-label">Flashcards</span>
                    <div className="ci-stepper">
                      <button className="ci-stepper-btn" onClick={() => setNumCards((n) => Math.max(3, n - 1))}>−</button>
                      <span className="ci-stepper-val">{numCards}</span>
                      <button className="ci-stepper-btn" onClick={() => setNumCards((n) => Math.min(30, n + 1))}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Generate button ── */}
            {canGenerate && !generating && (
              <button
                className={`ci-generate-btn${uploadLimitReached ? " ci-generate-btn--disabled" : ""}`}
                onClick={uploadLimitReached ? () => router.push("/page/pricing") : handleGenerate}
                disabled={!!uploadLimitReached}
                title={uploadLimitReached ? "Upload limit reached — upgrade your plan" : undefined}
              >
                <span className="ci-generate-btn-icon">⚡</span>
                {uploadLimitReached
                  ? "Upload limit reached — Upgrade to continue"
                  : "Generate Flashcards + Quiz + Segments"}
                <span className="ci-generate-btn-arrow">→</span>
              </button>
            )}

            {/* ── Progress ── */}
            {generating && (
              <div className="ci-loading-block">
                <div className="ci-loading-header">
                  <div className="ci-loading-dots"><span /><span /><span /></div>
                  <span className="ci-loading-label">
                    {saving
                      ? "Saving to your account…"
                      : "Generating flashcards · quiz · content segments…"}
                  </span>
                </div>
                <div className="ci-progress-track">
                  <div className="ci-progress-fill" style={{ width: `${genProgress}%` }}>
                    <div className="ci-progress-glow" />
                  </div>
                </div>
                <div className="ci-progress-pct">{Math.round(genProgress)}%</div>
              </div>
            )}

            {/* ── Error ── */}
            {error && (
              <div className="ci-error-box">
                <span className="ci-error-icon">⚠</span>
                <span>{error}</span>
                {error.includes("limit") && (
                  <button
                    className="ci-error-upgrade-btn"
                    onClick={() => window.location.href = "/page/pricing"}
                  >
                    Upgrade →
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          /* ── Success state ──────────────────────────────────────────── */
          <div className="ci-success-state">
            <div className="ci-success-burst">
              <div className="ci-success-ring ci-success-ring--1" />
              <div className="ci-success-ring ci-success-ring--2" />
              <div className="ci-success-ring ci-success-ring--3" />
              <div className="ci-success-checkmark">✓</div>
            </div>
            <h3 className="ci-success-title">Study material ready!</h3>
            <p className="ci-success-sub">
              {cardCount} flashcards · 15 quiz questions
              {segmentCount > 0 ? ` · ${segmentCount} segments` : ""}
            </p>

            <div className="ci-success-cards-row">
              <div className="ci-success-type-card"
                onClick={() => router.push("/page/dashboard/flashcard")}>
                <span className="ci-stc-icon">🃏</span>
                <span className="ci-stc-label">Flashcards</span>
                <span className="ci-stc-count">{cardCount} cards</span>
              </div>
              <div className="ci-success-type-card"
                onClick={() => router.push("/page/dashboard/quiz")}>
                <span className="ci-stc-icon">📝</span>
                <span className="ci-stc-label">Quiz</span>
                <span className="ci-stc-count">15 questions</span>
              </div>
              {segmentCount > 0 && (
                <div className="ci-success-type-card"
                  onClick={() => router.push("/page/dashboard/segments")}>
                  <span className="ci-stc-icon">📌</span>
                  <span className="ci-stc-label">Segments</span>
                  <span className="ci-stc-count">{segmentCount} units</span>
                </div>
              )}
            </div>

            <div className="ci-success-actions">
              {segmentCount > 0 && (
                <button className="ci-generate-btn"
                  onClick={() => router.push("/page/dashboard/segments")}>
                  <span className="ci-generate-btn-icon">📌</span>
                  Explore Content Segments
                  <span className="ci-generate-btn-arrow">→</span>
                </button>
              )}
              <button className="ci-outline-btn"
                onClick={() => router.push("/page/dashboard/quiz")}>
                🧠 Take the Quiz
              </button>
              <button className="ci-outline-btn"
                onClick={() => router.push("/page/dashboard/flashcard")}>
                🃏 Study Flashcards
              </button>
              <button className="ci-text-btn" onClick={clearAll}>Upload new content</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}