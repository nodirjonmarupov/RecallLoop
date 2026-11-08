import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000/api/v1";

async function request(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem("token")));
  const [page, setPage] = useState("overview");
  const [topics, setTopics] = useState([]);
  const [todayReviews, setTodayReviews] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData(activeToken = token) {
    if (!activeToken) return;
    setLoading(true); setError("");
    try {
      const [topicData, reviewData, historyData] = await Promise.all([
        request("/topics/", activeToken),
        request("/reviews/today", activeToken),
        request("/reviews/history", activeToken),
      ]);
      setTopics(topicData); setTodayReviews(reviewData); setHistory(historyData);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (token) loadData(token); }, [token]);

  async function login(e) {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Login failed");
      localStorage.setItem("token", data.access_token);
      setToken(data.access_token);
      setIsLoggedIn(true);
    } catch (err) {
      setError(err.message);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setToken("");
    setIsLoggedIn(false);
    setTopics([]);
    setTodayReviews([]);
    setHistory([]);
    setSelectedTopic(null);
    setMessage("Logged out successfully");
  }

  async function addTopic(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await request("/topics/", token, { method: "POST", body: JSON.stringify({ title: newTitle.trim() }) });
      setNewTitle(""); setMessage("Topic added successfully"); await loadData();
    } catch (err) { setError(err.message); }
  }

  async function updateTopic(id) {
    if (!editingTitle.trim()) return;
    try {
      await request(`/topics/${id}`, token, { method: "PATCH", body: JSON.stringify({ title: editingTitle.trim() }) });
      setEditingId(null); setEditingTitle(""); setMessage("Topic updated"); await loadData();
    } catch (err) { setError(err.message); }
  }

  async function deleteTopic(id) {
    if (!window.confirm("Delete this topic?")) return;
    try {
      await request(`/topics/${id}`, token, { method: "DELETE" });
      if (selectedTopic?.id === id) setSelectedTopic(null);
      setMessage("Topic deleted"); await loadData();
    } catch (err) { setError(err.message); }
  }

  async function showTopic(id) {
    try { const data = await request(`/topics/${id}`, token); setSelectedTopic(data); }
    catch (err) { setError(err.message); }
  }

  async function completeReview(id) {
    try {
      await request(`/reviews/${id}/complete`, token, { method: "PATCH" });
      setMessage("Review completed!"); await loadData();
    } catch (err) { setError(err.message); }
  }

  const completedCount = history.length;
  const pendingCount = todayReviews.filter(r => r.status === "pending").length;

  const NAV = ["overview", "topics", "today", "history"];
  const NAV_LABELS = { overview: "Overview", topics: "Topics", today: "Today", history: "History" };

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --linen: #EAE6DC;
          --linen-mid: #DDD8CE;
          --linen-dark: #C8C2B6;
          --ink: #1A1706;
          --ink-mid: #3A3620;
          --ink-pale: #7A7560;
          --paper: #F5F2EB;
          --white: #FDFCF9;
          --accent: #1A1706;
          --red: #C0392B;
          --green: #2D6A4F;
        }

        html, body {
          background: var(--linen);
          color: var(--ink);
          font-family: 'Space Grotesk', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
        }

        button, input { font: inherit; }
        button { cursor: pointer; border: none; background: none; }

        /* ─── OUTER WRAP ─── */
        .app {
          min-height: 100vh;
          background: var(--linen);
        }

        /* ─── HEADER ─── */
        .site-header {
          border-bottom: 2px solid var(--ink);
          padding: 0 36px;
          display: flex;
          align-items: stretch;
          gap: 0;
          background: var(--paper);
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 0;
          border-right: 2px solid var(--ink);
          padding-right: 28px;
          margin-right: 28px;
        }

        .brand-stamp {
          width: 44px;
          height: 44px;
          border: 2px solid var(--ink);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 20px;
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 900;
          line-height: 1;
          flex-shrink: 0;
        }

        .brand-text {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.5px;
          line-height: 1.1;
        }

        .brand-sub {
          font-size: 10px;
          font-weight: 500;
          color: var(--ink-pale);
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .header-nav {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1;
        }

        .nav-btn {
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-pale);
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          transition: color .15s, border-color .15s;
        }

        .nav-btn:hover { color: var(--ink); }
        .nav-btn.active { color: var(--ink); border-bottom-color: var(--ink); }

        .header-conn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 18px 0;
          border-left: 2px solid var(--ink);
          padding-left: 28px;
          margin-left: auto;
        }

        .conn-indicator {
          width: 8px; height: 8px;
          border-radius: 50%;
          border: 2px solid var(--ink);
          flex-shrink: 0;
        }
        .conn-indicator.live {
          background: var(--ink);
          box-shadow: 0 0 0 3px var(--linen-dark);
        }

        .conn-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--ink-pale);
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        /* ─── BODY ─── */
        .body-wrap {
          max-width: 1180px;
          margin: 0 auto;
          padding: 40px 36px 80px;
        }

        /* ─── TOKEN PANEL ─── */
        .token-strip {
          border: 2px solid var(--ink);
          background: var(--white);
          border-radius: 0;
          padding: 20px 24px;
          margin-bottom: 32px;
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .token-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--ink-pale);
          white-space: nowrap;
        }

        .token-field {
          flex: 1;
          min-width: 200px;
          background: var(--linen);
          border: 2px solid var(--ink);
          border-radius: 0;
          padding: 10px 14px;
          font-size: 13px;
          color: var(--ink);
          outline: none;
        }
        .token-field:focus { background: var(--white); }
        .token-field::placeholder { color: var(--ink-pale); }

        .btn-ink {
          background: var(--ink);
          color: var(--linen);
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 0;
          transition: opacity .15s;
          letter-spacing: 0.3px;
          white-space: nowrap;
        }
        .btn-ink:hover { opacity: .82; }
        .btn-ink:disabled { opacity: .38; cursor: not-allowed; }

        /* ─── FLASH ─── */
        .flash {
          border: 2px solid var(--ink);
          padding: 11px 16px;
          margin-bottom: 20px;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--white);
        }
        .flash.ok { border-color: var(--green); color: var(--green); background: #eaf4ee; }
        .flash.err { border-color: var(--red); color: var(--red); background: #faeaea; }

        /* ─── OVERVIEW ─── */
        .overview-hero {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0;
          border: 2px solid var(--ink);
          margin-bottom: 32px;
          background: var(--white);
        }

        .hero-stat {
          padding: 28px 32px;
          border-right: 2px solid var(--ink);
          position: relative;
        }
        .hero-stat:last-child { border-right: none; }

        .hero-stat-num {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 64px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -3px;
          color: var(--ink);
        }

        .hero-stat-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: var(--ink-pale);
          margin-top: 8px;
        }

        .stat-deco {
          position: absolute;
          top: 20px;
          right: 24px;
          font-size: 22px;
          color: var(--linen-dark);
          font-family: 'Playfair Display', Georgia, serif;
        }

        /* ─── SECTION HEADING ─── */
        .section-head {
          display: flex;
          align-items: baseline;
          gap: 14px;
          margin-bottom: 20px;
        }

        .section-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .section-count {
          font-size: 12px;
          font-weight: 700;
          color: var(--ink-pale);
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        /* ─── PANEL ─── */
        .panel {
          background: var(--white);
          border: 2px solid var(--ink);
          margin-bottom: 20px;
        }

        .panel-head {
          border-bottom: 2px solid var(--ink);
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .panel-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 18px;
          font-weight: 700;
        }

        .panel-body { padding: 0 24px; }

        /* ─── FORM ─── */
        .add-row {
          display: flex;
          gap: 0;
          border-bottom: 2px solid var(--ink);
        }

        .add-field {
          flex: 1;
          background: transparent;
          border: none;
          border-right: 2px solid var(--ink);
          padding: 14px 18px;
          font-size: 14px;
          color: var(--ink);
          outline: none;
        }
        .add-field::placeholder { color: var(--ink-pale); }
        .add-field:focus { background: var(--linen); }

        .btn-add {
          background: var(--ink);
          color: var(--linen);
          padding: 14px 22px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.3px;
          transition: opacity .15s;
          white-space: nowrap;
        }
        .btn-add:hover { opacity: .8; }
        .btn-add:disabled { opacity: .4; }

        /* ─── TOPIC ROWS ─── */
        .item-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          border-bottom: 1px solid var(--linen-mid);
        }
        .item-row:last-child { border-bottom: none; }

        .item-marker {
          font-size: 18px;
          color: var(--linen-dark);
          flex-shrink: 0;
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 700;
        }

        .item-name {
          flex: 1;
          font-size: 14px;
          font-weight: 600;
          color: var(--ink);
          line-height: 1.4;
        }

        .item-meta {
          font-size: 11px;
          color: var(--ink-pale);
          margin-top: 3px;
          font-weight: 400;
        }

        .item-actions {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 700;
          border: 2px solid var(--ink);
          color: var(--ink);
          background: transparent;
          letter-spacing: 0.3px;
          transition: background .12s, color .12s;
        }
        .btn-sm:hover { background: var(--ink); color: var(--linen); }

        .btn-sm.danger { border-color: var(--red); color: var(--red); }
        .btn-sm.danger:hover { background: var(--red); color: white; }

        .btn-sm.success { border-color: var(--green); color: var(--green); }
        .btn-sm.success:hover { background: var(--green); color: white; }
        .btn-sm:disabled { opacity: .4; cursor: default; }
        .btn-sm.done-btn { opacity: .4; cursor: default; border-style: dashed; }

        /* ─── REVIEW ITEM ─── */
        .review-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          border-bottom: 1px solid var(--linen-mid);
        }
        .review-row:last-child { border-bottom: none; }
        .review-row.done-row { opacity: .5; }

        .review-tick {
          width: 18px; height: 18px;
          border: 2px solid var(--ink);
          border-radius: 50%;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          font-size: 10px;
        }
        .review-tick.checked { background: var(--ink); color: var(--linen); }

        /* ─── STATUS BADGE ─── */
        .badge {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 3px 8px;
          border: 1.5px solid var(--ink);
          color: var(--ink-pale);
        }

        /* ─── PROGRESS ─── */
        .progress-wrap {
          padding: 14px 24px 0;
        }
        .progress-info {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--ink-pale);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 7px;
        }
        .progress-track {
          height: 3px;
          background: var(--linen-mid);
        }
        .progress-fill {
          height: 100%;
          background: var(--ink);
          transition: width .4s ease;
        }

        /* ─── DETAIL BOX ─── */
        .detail-box {
          margin: 0 24px 20px;
          border: 2px solid var(--ink);
          padding: 18px 20px;
          background: var(--linen);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        /* ─── EDIT ROW ─── */
        .edit-row {
          display: flex;
          gap: 8px;
          align-items: center;
          flex: 1;
        }
        .edit-field {
          flex: 1;
          background: var(--linen);
          border: 2px solid var(--ink);
          padding: 8px 12px;
          font-size: 13px;
          color: var(--ink);
          outline: none;
        }
        .edit-field:focus { background: var(--white); }

        /* ─── EMPTY ─── */
        .empty-state {
          padding: 48px 24px;
          text-align: center;
          color: var(--ink-pale);
        }
        .empty-glyph {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 52px;
          color: var(--linen-dark);
          line-height: 1;
          margin-bottom: 12px;
        }
        .empty-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--ink-mid);
          margin-bottom: 6px;
        }
        .empty-body { font-size: 13px; }

        /* ─── HISTORY ─── */
        .history-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 24px;
          border-bottom: 1px solid var(--linen-mid);
        }
        .history-row:last-child { border-bottom: none; }

        /* ─── NOT CONNECTED ─── */
        .gate {
          border: 2px solid var(--ink);
          background: var(--white);
          padding: 60px 40px;
          text-align: center;
          margin-top: 32px;
        }
        .gate-mark {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 56px;
          font-weight: 900;
          margin-bottom: 16px;
        }
        .gate-text { font-size: 15px; color: var(--ink-pale); max-width: 320px; margin: 0 auto; }

        /* ─── FOOTER ─── */
        .site-foot {
          border-top: 2px solid var(--ink);
          padding: 16px 36px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--paper);
        }
        .foot-brand {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 14px;
          font-weight: 700;
        }
        .foot-note { font-size: 11px; color: var(--ink-pale); }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 800px) {
          .site-header { flex-wrap: wrap; padding: 0 20px; }
          .header-brand { border-right: none; padding-right: 0; margin-right: 0; border-bottom: 2px solid var(--ink); width: 100%; padding-bottom: 14px; margin-bottom: 0; }
          .header-nav { overflow-x: auto; border-top: 1px solid var(--linen-mid); }
          .header-conn { border-left: none; padding-left: 0; margin-left: 0; border-top: 2px solid var(--ink); width: 100%; padding: 10px 0; }
          .body-wrap { padding: 24px 20px 60px; }
          .overview-hero { grid-template-columns: 1fr; }
          .hero-stat { border-right: none; border-bottom: 2px solid var(--ink); }
          .hero-stat:last-child { border-bottom: none; }
          .token-strip { gap: 10px; }
          .item-row, .review-row { flex-wrap: wrap; }
          .item-actions { width: 100%; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <header className="site-header">
        <div className="header-brand">
          <div className="brand-stamp">R</div>
          <div>
            <div className="brand-text">RecallLoop</div>
            <div className="brand-sub">Spaced repetition</div>
          </div>
        </div>

        <nav className="header-nav">
          {NAV.map(item => (
            <button
              key={item}
              className={`nav-btn ${page === item ? "active" : ""}`}
              onClick={() => { setPage(item); setMessage(""); setError(""); }}
            >
              {NAV_LABELS[item]}
            </button>
          ))}
        </nav>

        <div className="header-conn">
          <div className={`conn-indicator ${isLoggedIn ? "live" : ""}`} />
          <span className="conn-label">{isLoggedIn ? "Connected" : "Offline"}</span>
          {isLoggedIn && (
            <button className="btn-ink" style={{ marginLeft: 12, padding: "7px 14px", fontSize: 12 }} onClick={logout}>
              Logout
            </button>
          )}
        </div>
      </header>

      <div className="body-wrap">

        {message && <div className="flash ok">✓ {message}</div>}
        {error && <div className="flash err">✕ {error}</div>}

        {!isLoggedIn ? (
          <div className="gate">
            <div className="gate-mark">*</div>
            <p className="gate-text" style={{ marginBottom: 28 }}>
              Davom etish uchun email va parolingizni kiriting.
            </p>
            <form onSubmit={login} style={{ maxWidth: 380, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                className="token-field"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: "100%" }}
              />
              <input
                className="token-field"
                type="password"
                placeholder="Parol"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: "100%" }}
              />
              <button className="btn-ink" type="submit" disabled={loading} style={{ width: "100%", padding: "13px" }}>
                {loading ? "Kirilmoqda…" : "Kirish"}
              </button>
            </form>
          </div>
        ) : (

          <>
            {/* ── OVERVIEW ── */}
            {page === "overview" && (
              <>
                <div className="overview-hero">
                  <div className="hero-stat">
                    <div className="stat-deco">*</div>
                    <div className="hero-stat-num">{topics.length}</div>
                    <div className="hero-stat-label">Topics saved</div>
                  </div>
                  <div className="hero-stat">
                    <div className="stat-deco">◎</div>
                    <div className="hero-stat-num">{pendingCount}</div>
                    <div className="hero-stat-label">Due today</div>
                  </div>
                  <div className="hero-stat">
                    <div className="stat-deco">✓</div>
                    <div className="hero-stat-num">{completedCount}</div>
                    <div className="hero-stat-label">Total completed</div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <span className="panel-title">Today's focus</span>
                    <span className="badge">{new Date().toLocaleDateString()}</span>
                  </div>

                  {todayReviews.length > 0 && (
                    <div className="progress-wrap">
                      <div className="progress-info">
                        <span>Progress</span>
                        <span>{todayReviews.filter(r => r.status === "completed").length} / {todayReviews.length}</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${todayReviews.length ? (todayReviews.filter(r => r.status === "completed").length / todayReviews.length * 100) : 0}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="panel-body">
                    {todayReviews.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-glyph">☀</div>
                        <div className="empty-title">All clear</div>
                        <div className="empty-body">No reviews due today.</div>
                      </div>
                    ) : (
                      todayReviews.slice(0, 5).map(review => (
                        <div className={`review-row ${review.status === "completed" ? "done-row" : ""}`} key={review.id}>
                          <div className={`review-tick ${review.status === "completed" ? "checked" : ""}`}>
                            {review.status === "completed" ? "✓" : ""}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="item-name">{review.topic_title || review.topic?.title || "Review"}</div>
                            <div className="item-meta">Due {formatDate(review.review_date)}</div>
                          </div>
                          <button
                            className={`btn-sm ${review.status === "completed" ? "done-btn" : "success"}`}
                            disabled={review.status === "completed"}
                            onClick={() => completeReview(review.id)}
                          >
                            {review.status === "completed" ? "Done" : "Complete"}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── TOPICS ── */}
            {page === "topics" && (
              <div className="panel">
                <div className="panel-head">
                  <span className="panel-title">Knowledge library</span>
                  <span className="section-count">{topics.length} topics</span>
                </div>

                <form onSubmit={addTopic}>
                  <div className="add-row">
                    <input
                      className="add-field"
                      placeholder="What did you learn today?"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                    />
                    <button className="btn-add" type="submit" disabled={loading}>+ Add topic</button>
                  </div>
                </form>

                <div className="panel-body">
                  {loading ? (
                    <div className="empty-state"><div className="empty-body">Loading…</div></div>
                  ) : topics.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-glyph">§</div>
                      <div className="empty-title">Library is empty</div>
                      <div className="empty-body">Add your first topic above.</div>
                    </div>
                  ) : (
                    topics.map((topic, i) => (
                      <div className="item-row" key={topic.id}>
                        <span className="item-marker">*</span>
                        <div style={{ flex: 1 }}>
                          {editingId === topic.id ? (
                            <div className="edit-row">
                              <input className="edit-field" value={editingTitle} onChange={e => setEditingTitle(e.target.value)} />
                              <button className="btn-sm success" onClick={() => updateTopic(topic.id)}>Save</button>
                              <button className="btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                            </div>
                          ) : (
                            <>
                              <div className="item-name">{topic.title}</div>
                              <div className="item-meta">Learned {formatDate(topic.learned_at)}</div>
                            </>
                          )}
                        </div>
                        {editingId !== topic.id && (
                          <div className="item-actions">
                            <button className="btn-sm" onClick={() => showTopic(topic.id)}>Details</button>
                            <button className="btn-sm" onClick={() => { setEditingId(topic.id); setEditingTitle(topic.title); }}>Edit</button>
                            <button className="btn-sm danger" onClick={() => deleteTopic(topic.id)}>Delete</button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {selectedTopic && (
                  <div className="detail-box">
                    <div>
                      <div className="item-name">{selectedTopic.title}</div>
                      <div className="item-meta" style={{ marginTop: 6 }}>ID: {selectedTopic.id}</div>
                      <div className="item-meta">Learned: {formatDate(selectedTopic.learned_at)}</div>
                    </div>
                    <button className="btn-sm" onClick={() => setSelectedTopic(null)}>✕</button>
                  </div>
                )}
              </div>
            )}

            {/* ── TODAY ── */}
            {page === "today" && (
              <div className="panel">
                <div className="panel-head">
                  <span className="panel-title">Today's reviews</span>
                  <span className="badge">{pendingCount} pending</span>
                </div>

                {todayReviews.length > 0 && (
                  <div className="progress-wrap">
                    <div className="progress-info">
                      <span>Progress</span>
                      <span>{todayReviews.filter(r => r.status === "completed").length} / {todayReviews.length}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${todayReviews.length ? (todayReviews.filter(r => r.status === "completed").length / todayReviews.length * 100) : 0}%` }} />
                    </div>
                  </div>
                )}

                <div className="panel-body">
                  {todayReviews.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-glyph">◎</div>
                      <div className="empty-title">Nothing to review</div>
                      <div className="empty-body">You're all caught up for today.</div>
                    </div>
                  ) : (
                    todayReviews.map(review => (
                      <div className={`review-row ${review.status === "completed" ? "done-row" : ""}`} key={review.id}>
                        <div className={`review-tick ${review.status === "completed" ? "checked" : ""}`}>
                          {review.status === "completed" ? "✓" : ""}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="item-name">{review.topic_title || review.topic?.title || "Review"}</div>
                          <div className="item-meta">Due {formatDate(review.review_date)}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span className="badge">{review.status}</span>
                          <button
                            className={`btn-sm ${review.status === "completed" ? "done-btn" : "success"}`}
                            disabled={review.status === "completed"}
                            onClick={() => completeReview(review.id)}
                          >
                            {review.status === "completed" ? "Done" : "Complete"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── HISTORY ── */}
            {page === "history" && (
              <div className="panel">
                <div className="panel-head">
                  <span className="panel-title">Review history</span>
                  <span className="section-count">{history.length} completed</span>
                </div>

                <div className="panel-body">
                  {history.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-glyph">◷</div>
                      <div className="empty-title">No history yet</div>
                      <div className="empty-body">Completed reviews will appear here.</div>
                    </div>
                  ) : (
                    history.map(item => (
                      <div className="history-row" key={item.id}>
                        <span className="item-marker">*</span>
                        <div style={{ flex: 1 }}>
                          <div className="item-name">{item.topic_title}</div>
                          <div className="item-meta">Scheduled {formatDate(item.review_date)}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span className="badge">Completed</span>
                          <div className="item-meta" style={{ marginTop: 4 }}>{formatDate(item.completed_at)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div style={{ textAlign: "center", fontSize: 12, color: "var(--ink-pale)", marginTop: 10, fontWeight: 600, letterSpacing: "0.5px" }}>
              {loading ? "Syncing…" : "Connected to RecallLoop API"}
            </div>
          </>
        )}
      </div>

      <footer className="site-foot">
        <span className="foot-brand">RecallLoop</span>
        <span className="foot-note">Small steps. Long memory.</span>
      </footer>
    </div>
  );
}