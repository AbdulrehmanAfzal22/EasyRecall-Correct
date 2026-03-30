"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Zap, HelpCircle, Trash2, Search, Upload,
  Grid3x3, List, Clock, ChevronRight, BookOpen, X, 
} from "lucide-react";
import { auth } from "../../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { loadDocuments, deleteDocument, formatDate } from "../../../../lib/service";
import { saveFlashcards } from "../../../../lib/flashcardStore";
import { saveQuiz } from "../../../../lib/quizStore";
import { saveSegments } from "../../../../lib/segmentStore";
import "./document.css";

const ICONS = {
  file: FileText, flash: Zap, quiz: HelpCircle, trash: Trash2,
  search: Search, upload: Upload, grid: Grid3x3, list: List,
  clock: Clock, chevron: ChevronRight, book: BookOpen, x: X,
};

const FILE_COLORS = {
  pdf: "#ef4444", docx: "#3b82f6", doc: "#3b82f6",
  pptx: "#f97316", ppt: "#f97316", txt: "#8b5cf6", md: "#8b5cf6",
};
const fileColor = (t) => FILE_COLORS[t?.toLowerCase()] ?? "#6b7280";

// ── Delete Modal ──────────────────────────────────────────────────────────
function DeleteModal({ doc, onConfirm, onCancel, deleting }) {
  return (
    <div className="dc-modal-backdrop" onClick={onCancel}>
      <div className="dc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dc-modal-icon"><ICONS.trash size={22} /></div>
        <h3 className="dc-modal-title">Delete document?</h3>
        <p className="dc-modal-body">
          <strong>{doc.topic}</strong> and all its flashcards and quiz data will be permanently removed.
        </p>
        <div className="dc-modal-actions">
          <button className="dc-btn dc-btn-ghost" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className="dc-btn dc-btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NoteDropdown({ doc, onClose }) {
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div className="dc-note-dropdown" ref={ref}>
      <div className="dc-note-dropdown-header">
        <span>🗒️ File Explanation</span>
        <button className="dc-note-close" onClick={onClose}><ICONS.x size={14} /></button>
      </div>
      <div className="dc-note-dropdown-body">
        {doc.explanation
          ? doc.explanation
          : `This file ("${doc.fileName || doc.topic}") contains study material. Use the flashcards, quiz, and segments to learn and review its content.`
        }
      </div>
    </div>
  );
}

// ── Concept Card ──────────────────────────────────────────────────────────
function ConceptCard({ doc, onStudy, onQuiz, onSegments, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const fc = fileColor(doc.fileType);

  const concepts  = doc.flashcards?.slice(0, expanded ? doc.flashcards.length : 3) ?? [];
  const hasMore   = (doc.flashcards?.length ?? 0) > 3;
  const mcqCount  = doc.quiz?.mcq?.length ?? 0;
  const tfCount   = doc.quiz?.trueFalse?.length ?? 0;
  const saCount   = doc.quiz?.shortAnswer?.length ?? 0;
  const progressDone  = doc.flashcardProgress ? Object.keys(doc.flashcardProgress).length : 0;
  const progressTotal = doc.flashcardCount || 0;
  const progressPct   = progressTotal > 0 ? Math.round((progressDone / progressTotal) * 100) : 0;

  return (
    <div className={`dc-concept-card ${expanded ? "dc-concept-card--expanded" : ""}`}>
      <div className="dc-concept-accent" style={{ background: `linear-gradient(90deg, ${fc}, ${fc}88)` }} />

      <div className="dc-concept-header" onClick={() => setExpanded((v) => !v)}>
        <div className="dc-concept-header-left">
          <div className="dc-file-badge" style={{ background: `${fc}18`, borderColor: `${fc}35`, color: fc }}>
            <ICONS.file size={12} />
            {(doc.fileType || "TXT").toUpperCase()}
          </div>
          <div>
            <h3 className="dc-concept-title">{doc.topic}</h3>
            <div className="dc-concept-meta">
              <span><ICONS.clock size={11} />{formatDate(doc.createdAt)}</span>
              <span>·</span>
              <span>{doc.flashcardCount ?? 0} flashcards</span>
              <span>·</span>
              <span>{mcqCount + tfCount + saCount} quiz Qs</span>
            </div>
          </div>
        </div>
        <div className="dc-concept-header-right">
          <button className="dc-card-delete" onClick={(e) => { e.stopPropagation(); onDelete(doc); }} title="Delete">
            <ICONS.trash size={14} />
          </button>
          <div className={`dc-chevron ${expanded ? "dc-chevron--open" : ""}`}>
            <ICONS.chevron size={16} />
          </div>
        </div>
      </div>

      {progressTotal > 0 && (
        <div className="dc-mini-progress">
          <div className="dc-mini-progress-track">
            <div className="dc-mini-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="dc-mini-progress-label">{progressPct}% studied</span>
        </div>
      )}

      {expanded && (
        <div className="dc-concept-body">
          {concepts.length > 0 && (
            <div className="dc-concept-section">
              <div className="dc-concept-section-title"><ICONS.flash size={13} /> Key Concepts</div>
              <div className="dc-keypoints">
                {concepts.map((card, i) => (
                  <div key={i} className="dc-keypoint">
                    <div className="dc-keypoint-q">{card.question}</div>
                    <div className="dc-keypoint-a">{card.answer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(mcqCount + tfCount + saCount) > 0 && (
            <div className="dc-concept-section">
              <div className="dc-concept-section-title"><ICONS.quiz size={13} /> Quiz Breakdown</div>
              <div className="dc-quiz-chips">
                {mcqCount > 0 && <div className="dc-quiz-chip dc-quiz-chip--mcq">📝 {mcqCount} Multiple Choice</div>}
                {tfCount  > 0 && <div className="dc-quiz-chip dc-quiz-chip--tf">✓✗ {tfCount} True / False</div>}
                {saCount  > 0 && <div className="dc-quiz-chip dc-quiz-chip--sa">💬 {saCount} Short Answer</div>}
              </div>
            </div>
          )}

          <div className="dc-concept-actions">
            <button className="dc-btn dc-btn-primary"   onClick={() => onStudy(doc)}>🃏 Study Flashcards</button>
            <button className="dc-btn dc-btn-secondary" onClick={() => onQuiz(doc)}>📝 Take Quiz</button>
            {doc.segmentCount > 0 && (
              <button className="dc-btn" onClick={() => onSegments(doc)}>📌 Segments</button>
            )}
            <button 
               className="button-note"
            onClick={() => setExpanded((v) => !v)}>
              <FileText size={24} />Key Concepts</button>

           
          </div>
        </div>
      )}

      {!expanded && (
        <div className="dc-concept-quick-actions">
          <button className="dc-btn dc-btn-sm dc-btn-primary"   onClick={(e) => { e.stopPropagation(); onStudy(doc); }}>🃏 Study</button>
          <button className="dc-btn dc-btn-sm dc-btn-secondary" onClick={(e) => { e.stopPropagation(); onQuiz(doc);  }}>📝 Quiz</button>
          {doc.segmentCount > 0 && (
            <button className="dc-btn dc-btn-sm" onClick={(e) => { e.stopPropagation(); onSegments(doc); }}>📌 Segments</button>
          )}
          <button
          className="button-note"
          onClick={() => setExpanded((v) => !v)}> 
          <FileText size={24} />Key Concepts</button>
        </div>
        
      )}
    </div>
  );
}

// ── Doc Grid Card ─────────────────────────────────────────────────────────
function DocCard({ doc, onStudy, onQuiz, onSegments, onDelete }) {
  const [showNote, setShowNote] = useState(false);
  const fc = fileColor(doc.fileType);
  const mcqCount = doc.quiz?.mcq?.length ?? 0;
  const tfCount  = doc.quiz?.trueFalse?.length ?? 0;
  const saCount  = doc.quiz?.shortAnswer?.length ?? 0;
  const progressDone  = doc.flashcardProgress ? Object.keys(doc.flashcardProgress).length : 0;
  const progressTotal = doc.flashcardCount || 0;
  const progressPct   = progressTotal > 0 ? Math.round((progressDone / progressTotal) * 100) : 0;

  return (
    <div className="dc-card">
      <div className="dc-card-top">
        <div className="dc-file-badge" style={{ background: `${fc}18`, borderColor: `${fc}35`, color: fc }}>
          <ICONS.file size={12} />
          {(doc.fileType || "TXT").toUpperCase()}
        </div>
        <button className="dc-card-delete" onClick={() => onDelete(doc)} title="Delete">
          <ICONS.trash size={14} />
        </button>
      </div>

      <h3 className="dc-card-title" title={doc.topic}>{doc.topic}</h3>
      <p className="dc-card-filename">{doc.fileName}</p>

      {doc.flashcards?.[0] && (
        <div className="dc-card-preview">
          <span className="dc-card-preview-label">First concept</span>
          <p className="dc-card-preview-text">{doc.flashcards[0].question}</p>
        </div>
      )}

      <div className="dc-card-stats">
        <span className="dc-stat"><ICONS.flash size={12} />{doc.flashcardCount ?? 0} cards</span>
        <span className="dc-stat"><ICONS.quiz  size={12} />{mcqCount + tfCount + saCount} Qs</span>
        {doc.segmentCount > 0 && <span className="dc-stat"><ICONS.book size={12} />{doc.segmentCount} segs</span>}
        <span className="dc-stat dc-stat-muted"><ICONS.clock size={12} />{formatDate(doc.createdAt)}</span>
      </div>

      {progressTotal > 0 && (
        <div className="dc-card-progress">
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-label)", marginBottom: 4 }}>
            <span>Progress</span><span>{progressPct}%</span>
          </div>
          <div className="dc-progress-track">
            <div className="dc-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      <div className="dc-card-actions">
        <button className="dc-btn dc-btn-primary"   onClick={() => onStudy(doc)}>🃏 Study</button>
        <button className="dc-btn dc-btn-secondary" onClick={() => onQuiz(doc)}>📝 Quiz</button>
        {doc.segmentCount > 0 && <button className="dc-btn" onClick={() => onSegments(doc)}>📌 Segments</button>}

      
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const router = useRouter();
  const [uid,       setUid]       = useState(null);
  const [docs,      setDocs]      = useState([]);
  const [filtered,  setFiltered]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [sortBy,    setSortBy]    = useState("newest");
  const [viewMode,  setViewMode]  = useState("concepts");
  const [delTarget, setDelTarget] = useState(null);
  const [deleting,  setDeleting]  = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { setUid(user.uid); fetchDocs(user.uid); }
      else      { router.push("/"); }
    });
    return () => unsub();
  }, []);

  const fetchDocs = async (id) => {
    setLoading(true);
    try {
      const data = await loadDocuments(id);
      setDocs(data);
      setFiltered(data);
    } catch (e) {
      console.error("Failed to load documents:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const docsWithExplanation = docs.map(d => ({
      ...d,
      explanation: d.explanation || `This file ("${d.fileName || d.topic}") contains study material.`,
    }));
    let result = [...docsWithExplanation];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((d) =>
        d.topic?.toLowerCase().includes(q) ||
        d.fileName?.toLowerCase().includes(q) ||
        d.flashcards?.some((f) => f.question?.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => {
      if (sortBy === "newest") return (b.createdAt - a.createdAt) || 0;
      if (sortBy === "oldest") return (a.createdAt - b.createdAt) || 0;
      if (sortBy === "name")   return (a.topic || "").localeCompare(b.topic || "");
      if (sortBy === "cards")  return (b.flashcardCount || 0) - (a.flashcardCount || 0);
      return 0;
    });
    setFiltered(result);
  }, [docs, search, sortBy]);

  const handleStudy    = (doc) => { if (doc.flashcards?.length) saveFlashcards(doc.flashcards, { topic: doc.topic, docId: doc.id, fileName: doc.fileName }); router.push("/page/dashboard/flashcard"); };
  const handleQuiz     = (doc) => { if (doc.quiz) saveQuiz(doc.quiz, { topic: doc.topic, docId: doc.id, fileName: doc.fileName }); router.push("/page/dashboard/quiz"); };
  const handleSegments = (doc) => {
    if (doc.segments?.length) {
      const stats = doc.segmentStats || { totalSegments: doc.segments.reduce((acc, g) => acc + (g.segments?.length || 0), 0), fileName: doc.fileName, topic: doc.topic };
      saveSegments({ groups: doc.segments, stats }, { fileNames: doc.fileName, topic: doc.topic });
      router.push("/page/dashboard/segments");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!delTarget || !uid) return;
    setDeleting(true);
    try {
      await deleteDocument(uid, delTarget.id, delTarget.storagePath);
      setDocs((p) => p.filter((d) => d.id !== delTarget.id));
    } catch (e) { console.error("Delete failed:", e); }
    finally { setDeleting(false); setDelTarget(null); }
  };

  const totalCards    = docs.reduce((a, d) => a + (d.flashcardCount || 0), 0);
  const totalQuiz     = docs.reduce((a, d) => a + (d.quizCount || 0), 0);
  const totalConcepts = docs.reduce((a, d) => a + (d.flashcards?.length || 0), 0);

  return (
    <>
      {delTarget && (
        <DeleteModal doc={delTarget} onConfirm={handleDeleteConfirm} onCancel={() => setDelTarget(null)} deleting={deleting} />
      )}

      <div className="topbar">
        <div className="topbar-left">
          <h1>My Library</h1>
          <p>{docs.length} topics · {totalCards} flashcards · {totalQuiz} quiz questions</p>
        </div>
        <button className="dc-btn dc-btn-primary" style={{ gap: 8, display: "flex", alignItems: "center" }} onClick={() => router.push("/page/dashboard/content-intake")}>
          <ICONS.upload size={15} /> Upload New
        </button>
      </div>

      <div className="page">
        <div className="dc-summary">
          {[
            { label: "Topics",         value: docs.length,   color: "var(--primary)" },
            { label: "Concepts",       value: totalConcepts, color: "#8b5cf6"        },
            { label: "Flashcards",     value: totalCards,    color: "var(--green)"   },
            { label: "Quiz Questions", value: totalQuiz,     color: "#f97316"        },
          ].map((s) => (
            <div key={s.label} className="dc-summary-card">
              <div className="dc-summary-num" style={{ color: s.color }}>{s.value}</div>
              <div className="dc-summary-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="dc-controls">
          <div className="dc-search-wrap">
            <ICONS.search size={15} />
            <input className="dc-search" placeholder="Search topics or concepts…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button className="dc-search-clear" onClick={() => setSearch("")}>✕</button>}
          </div>
          <div className="dc-controls-right">
            <select className="dc-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
              <option value="cards">Most cards</option>
            </select>
            <div className="dc-view-toggle">
              <button className={`dc-view-btn ${viewMode === "concepts" ? "active" : ""}`} onClick={() => setViewMode("concepts")} title="Concepts view"><ICONS.book size={15} /></button>
              <button className={`dc-view-btn ${viewMode === "grid"     ? "active" : ""}`} onClick={() => setViewMode("grid")}     title="Grid view"><ICONS.grid size={15} /></button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="dc-loading"><div className="dc-loading-spinner" /><p>Loading your library…</p></div>
        ) : filtered.length === 0 ? (
          <div className="dc-empty">
            <div className="dc-empty-icon">{search ? <ICONS.search size={32} /> : <ICONS.book size={32} />}</div>
            <h3 className="dc-empty-title">{search ? `No results for "${search}"` : "Your library is empty"}</h3>
            <p className="dc-empty-sub">{search ? "Try a different search term." : "Upload study material and AI will extract all key concepts."}</p>
            {!search && (
              <button className="dc-btn dc-btn-primary" style={{ marginTop: 16, gap: 8, display: "inline-flex", alignItems: "center" }} onClick={() => router.push("/page/dashboard/content-intake")}>
                <ICONS.upload size={15} /> Upload Your First Topic
              </button>
            )}
          </div>
        ) : viewMode === "concepts" ? (
          <div className="dc-concepts-list">
            {filtered.map((d) => <ConceptCard key={d.id} doc={d} onStudy={handleStudy} onQuiz={handleQuiz} onSegments={handleSegments} onDelete={setDelTarget} />)}
          </div>
        ) : (
          <div className="dc-grid">
            {filtered.map((d) => <DocCard key={d.id} doc={d} onStudy={handleStudy} onQuiz={handleQuiz} onSegments={handleSegments} onDelete={setDelTarget} />)}
          </div>
        )}
      </div>
    </>
  );
}