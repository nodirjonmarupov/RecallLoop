import { useEffect, useMemo, useState } from "react";

/* ─────────────────────────────────────────────
   RecallLoop — to'liq frontend, bitta fayl.
   O'z loyihangizga shundayligicha ko'chirsangiz ishlaydi.
   API bazasi: http://127.0.0.1:8000/api/v1

   GET    /topics/
   POST   /topics/            { title }
   GET    /topics/{id}
   PATCH  /topics/{id}        { title }
   DELETE /topics/{id}
   GET    /reviews/today
   GET    /reviews/history
   PATCH  /reviews/{id}/complete
   ───────────────────────────────────────────── */

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
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function shortDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function relativeDate(value) {
  if (!value) return "—";
  const diff = Math.round((new Date(value) - new Date()) / 86400000);
  if (Math.abs(diff) < 1) return "bugun";
  if (diff === 1) return "ertaga";
  if (diff === -1) return "kecha";
  if (diff < 0) return `${Math.abs(diff)} kun oldin`;
  return `${diff} kundan keyin`;
}

const NAV = [
  { id: "overview", label: "Umumiy" },
  { id: "topics", label: "Mavzular" },
  { id: "today", label: "Bugun" },
  { id: "history", label: "Tarix" },
];

export default function App() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [view, setView] = useState("overview");
  const [topics, setTopics] = useState([]);
  const [todayReviews, setTodayReviews] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  // localStorage faqat brauzerda mavjud — mount'dan keyin o'qiladi.
  useEffect(() => {
    const saved = window.localStorage.getItem("token") || "";
    setToken(saved);
    setTokenInput(saved);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  async function loadData(activeToken = token) {
    if (!activeToken) return;
    setLoading(true);
    setError("");
    try {
      const [topicData, reviewData, historyData] = await Promise.all([
        request("/topics/", activeToken),
        request("/reviews/today", activeToken),
        request("/reviews/history", activeToken),
      ]);
      setTopics(topicData || []);
      setTodayReviews(reviewData || []);
      setHistory(historyData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadData(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function connect() {
    const cleanToken = tokenInput.trim();
    if (!cleanToken) {
      setError("Token bo'sh — avval JWT tokenni joylashtiring.");
      return;
    }
    window.localStorage.setItem("token", cleanToken);
    setToken(cleanToken);
    setError("");
  }

  function disconnect() {
    window.localStorage.removeItem("token");
    setToken("");
    setTokenInput("");
    setTopics([]);
    setTodayReviews([]);
    setHistory([]);
    setSelectedTopic(null);
    setToast({ kind: "info", text: "Ulanish uzildi" });
  }

  async function addTopic(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      await request("/topics/", token, {
        method: "POST",
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      setNewTitle("");
      setToast({ kind: "ok", text: "Mavzu qo'shildi" });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateTopic(id) {
    if (!editingTitle.trim()) return;
    setBusyId(id);
    try {
      await request(`/topics/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ title: editingTitle.trim() }),
      });
      setEditingId(null);
      setEditingTitle("");
      setToast({ kind: "ok", text: "Mavzu yangilandi" });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteTopic(id) {
    if (!window.confirm("Bu mavzu o'chirilsinmi?")) return;
    setBusyId(id);
    try {
      await request(`/topics/${id}`, token, { method: "DELETE" });
      if (selectedTopic?.id === id) setSelectedTopic(null);
      setToast({ kind: "ok", text: "Mavzu o'chirildi" });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function showTopic(id) {
    if (selectedTopic?.id === id) {
      setSelectedTopic(null);
      return;
    }
    setBusyId(id);
    try {
      const data = await request(`/topics/${id}`, token);
      setSelectedTopic(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function completeReview(id) {
    setBusyId(id);
    try {
      await request(`/reviews/${id}/complete`, token, { method: "PATCH" });
      setToast({ kind: "ok", text: "Takrorlash bajarildi" });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const doneToday = todayReviews.filter((r) => r.status === "completed").length;
  const pendingCount = todayReviews.filter((r) => r.status === "pending").length;
  const progress = todayReviews.length ? Math.round((doneToday / todayReviews.length) * 100) : 0;

  /* oxirgi 7 kun — faqat mavjud tarixdan, qo'shimcha so'rovsiz */
  const weekBars = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toDateString();
      const count = history.filter((h) => h.completed_at && new Date(h.completed_at).toDateString() === key).length;
      days.push({ label: ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"][d.getDay()], count, today: i === 0 });
    }
    return days;
  }, [history]);

  const maxBar = Math.max(1, ...weekBars.map((b) => b.count));

  return (
    <div className="rl">
      <style>{STYLES}</style>

      <header className="rl-head">
        <button className="rl-brand" onClick={() => setView("overview")} aria-label="RecallLoop">
          <span className="rl-stamp">R</span>
          <span className="rl-brand-text">
            <span className="rl-brand-name">RecallLoop</span>
            <span className="rl-brand-sub">Intervalli takrorlash</span>
          </span>
        </button>

        {token && (
          <nav className="rl-nav" aria-label="Bo'limlar">
            {NAV.map((item) => (
              <button
                key={item.id}
                className={`rl-nav-btn ${view === item.id ? "is-active" : ""}`}
                onClick={() => {
                  setView(item.id);
                  setError("");
                  setSelectedTopic(null);
                }}
              >
                {item.label}
                {item.id === "today" && pendingCount > 0 && <span className="rl-nav-count">{pendingCount}</span>}
              </button>
            ))}
          </nav>
        )}

        <div className="rl-head-right">
          {token ? (
            <button className="rl-status is-live" onClick={disconnect} title="Ulanishni uzish">
              <span className="rl-dot" />
              Ulangan
            </button>
          ) : (
            <span className="rl-status">
              <span className="rl-dot" />
              Oflayn
            </span>
          )}
        </div>
      </header>

      <main className="rl-main">
        {!token ? (
          <section className="rl-gate">
            <div className="rl-gate-grid" />
            <div className="rl-gate-inner">
              <span className="rl-gate-kicker">Maxsus kirish</span>
              <h1 className="rl-gate-title">
                Bilim <em>takrorlash</em> bilan
                <br />
                xotiraga aylanadi.
              </h1>
              <p className="rl-gate-copy">
                Davom etish uchun backend’dan olingan JWT tokenni kiriting. Token faqat shu brauzerda saqlanadi.
              </p>

              <form
                className="rl-gate-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  connect();
                }}
              >
                <input
                  className="rl-gate-input"
                  type="password"
                  autoComplete="off"
                  placeholder="JWT tokenni shu yerga qo'ying…"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                />
                <button className="rl-btn-solid" type="submit" disabled={!tokenInput.trim()}>
                  Ulanish
                </button>
              </form>

              {error && <div className="rl-alert is-err">{error}</div>}

              <div className="rl-gate-meta">
                <span>API · 127.0.0.1:8000/api/v1</span>
                <span>Faol seans · RecallLoop</span>
              </div>
            </div>
          </section>
        ) : (
          <>
            {error && (
              <div className="rl-alert is-err">
                <span>{error}</span>
                <button onClick={() => loadData()}>Qayta urinish</button>
              </div>
            )}

            {view === "overview" && (
              <section className="rl-view">
                <div className="rl-stats">
                  <article className="rl-stat">
                    <span className="rl-stat-glyph">§</span>
                    <span className="rl-stat-num">{String(topics.length).padStart(2, "0")}</span>
                    <span className="rl-stat-label">Saqlangan mavzu</span>
                  </article>
                  <article className="rl-stat">
                    <span className="rl-stat-glyph">◎</span>
                    <span className="rl-stat-num">{String(pendingCount).padStart(2, "0")}</span>
                    <span className="rl-stat-label">Bugun takrorlash</span>
                  </article>
                  <article className="rl-stat">
                    <span className="rl-stat-glyph">✓</span>
                    <span className="rl-stat-num">{String(history.length).padStart(2, "0")}</span>
                    <span className="rl-stat-label">Jami bajarilgan</span>
                  </article>
                </div>

                <div className="rl-split">
                  <section className="rl-panel">
                    <div className="rl-panel-head">
                      <h2 className="rl-panel-title">Bugungi diqqat</h2>
                      <span className="rl-tag">{formatDate(new Date())}</span>
                    </div>

                    <div className="rl-focus-top">
                      <Ring percent={progress} />
                      <div className="rl-focus-copy">
                        <span className="rl-focus-count">
                          {doneToday} / {todayReviews.length}
                        </span>
                        <span className="rl-focus-note">
                          {todayReviews.length === 0
                            ? "Bugun takrorlash yo'q — xotira dam olmoqda."
                            : progress === 100
                              ? "Kunlik me'yor bajarildi. Zo'r."
                              : `${pendingCount} ta takrorlash qoldi.`}
                        </span>
                      </div>
                    </div>

                    <div className="rl-rows">
                      {todayReviews.length === 0 ? (
                        <Empty glyph="☀" title="Hammasi joyida" body="Bugun uchun rejalashtirilgan takrorlash yo'q." />
                      ) : (
                        todayReviews.slice(0, 4).map((review) => (
                          <ReviewRow
                            key={review.id}
                            review={review}
                            busy={busyId === review.id}
                            onComplete={() => completeReview(review.id)}
                          />
                        ))
                      )}
                    </div>

                    {todayReviews.length > 4 && (
                      <button className="rl-more" onClick={() => setView("today")}>
                        Barcha {todayReviews.length} takrorlash →
                      </button>
                    )}
                  </section>

                  <aside className="rl-side">
                    <section className="rl-panel is-flat">
                      <div className="rl-panel-head">
                        <h2 className="rl-panel-title">So'nggi 7 kun</h2>
                        <span className="rl-tag">{history.length} jami</span>
                      </div>
                      <div className="rl-bars">
                        {weekBars.map((bar, i) => (
                          <div className="rl-bar-col" key={i}>
                            <span className="rl-bar-count">{bar.count || ""}</span>
                            <div className={`rl-bar ${bar.today ? "is-today" : ""}`}>
                              <div
                                className="rl-bar-fill"
                                style={{ height: `${bar.count ? Math.max(12, (bar.count / maxBar) * 100) : 3}%` }}
                              />
                            </div>
                            <span className="rl-bar-label">{bar.label}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rl-panel is-flat">
                      <div className="rl-panel-head">
                        <h2 className="rl-panel-title">Oxirgi mavzu</h2>
                      </div>
                      {topics.length === 0 ? (
                        <div className="rl-side-empty">Hali mavzu qo'shilmagan.</div>
                      ) : (
                        <div className="rl-side-topic">
                          <span className="rl-side-num">{String(topics.length).padStart(2, "0")}</span>
                          <div>
                            <div className="rl-side-title">{topics[topics.length - 1].title}</div>
                            <div className="rl-side-meta">
                              O'rganilgan {shortDate(topics[topics.length - 1].learned_at)}
                            </div>
                          </div>
                        </div>
                      )}
                      <button className="rl-more" onClick={() => setView("topics")}>
                        Kutubxonaga o'tish →
                      </button>
                    </section>
                  </aside>
                </div>
              </section>
            )}

            {view === "topics" && (
              <section className="rl-view">
                <div className="rl-page-head">
                  <h1 className="rl-page-title">Bilim kutubxonasi</h1>
                  <span className="rl-page-meta">{topics.length} mavzu</span>
                </div>

                <section className="rl-panel">
                  <form className="rl-add" onSubmit={addTopic}>
                    <input
                      className="rl-add-input"
                      placeholder="Bugun nimani o'rgandingiz?"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                    <button className="rl-btn-solid" type="submit" disabled={loading || !newTitle.trim()}>
                      + Mavzu
                    </button>
                  </form>

                  <div className="rl-rows is-tight">
                    {loading && topics.length === 0 ? (
                      <div className="rl-loading">Yuklanmoqda…</div>
                    ) : topics.length === 0 ? (
                      <Empty glyph="§" title="Kutubxona bo'sh" body="Yuqoridagi maydondan birinchi mavzuni qo'shing." />
                    ) : (
                      topics.map((topic, i) => (
                        <div key={topic.id}>
                          <div className={`rl-row ${busyId === topic.id ? "is-busy" : ""}`}>
                            <span className="rl-row-num">{String(i + 1).padStart(2, "0")}</span>

                            {editingId === topic.id ? (
                              <div className="rl-edit">
                                <input
                                  className="rl-edit-input"
                                  value={editingTitle}
                                  autoFocus
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") updateTopic(topic.id);
                                    if (e.key === "Escape") setEditingId(null);
                                  }}
                                />
                                <button className="rl-btn-sm is-ok" onClick={() => updateTopic(topic.id)}>
                                  Saqlash
                                </button>
                                <button className="rl-btn-sm" onClick={() => setEditingId(null)}>
                                  Bekor
                                </button>
                              </div>
                            ) : (
                              <div className="rl-row-body">
                                <span className="rl-row-title">{topic.title}</span>
                                <span className="rl-row-meta">O'rganilgan {formatDate(topic.learned_at)}</span>
                              </div>
                            )}

                            {editingId !== topic.id && (
                              <div className="rl-row-actions">
                                <button
                                  className={`rl-btn-sm ${selectedTopic?.id === topic.id ? "is-on" : ""}`}
                                  onClick={() => showTopic(topic.id)}
                                >
                                  Tafsilot
                                </button>
                                <button
                                  className="rl-btn-sm"
                                  onClick={() => {
                                    setEditingId(topic.id);
                                    setEditingTitle(topic.title);
                                  }}
                                >
                                  Tahrir
                                </button>
                                <button className="rl-btn-sm is-danger" onClick={() => deleteTopic(topic.id)}>
                                  O'chirish
                                </button>
                              </div>
                            )}
                          </div>

                          {selectedTopic?.id === topic.id && (
                            <div className="rl-detail">
                              <div className="rl-detail-col">
                                <span className="rl-detail-label">Sarlavha</span>
                                <span className="rl-detail-value">{selectedTopic.title}</span>
                              </div>
                              {selectedTopic.notes && (
                                <div className="rl-detail-col">
                                  <span className="rl-detail-label">Izoh</span>
                                  <span className="rl-detail-value">{selectedTopic.notes}</span>
                                </div>
                              )}
                              <div className="rl-detail-col">
                                <span className="rl-detail-label">O'rganilgan</span>
                                <span className="rl-detail-value">{formatDate(selectedTopic.learned_at)}</span>
                              </div>
                              {selectedTopic.next_review_at && (
                                <div className="rl-detail-col">
                                  <span className="rl-detail-label">Keyingi takrorlash</span>
                                  <span className="rl-detail-value">
                                    {formatDate(selectedTopic.next_review_at)} · {relativeDate(selectedTopic.next_review_at)}
                                  </span>
                                </div>
                              )}
                              <div className="rl-detail-col">
                                <span className="rl-detail-label">ID</span>
                                <span className="rl-detail-value is-mono">{selectedTopic.id}</span>
                              </div>
                              <button className="rl-detail-close" onClick={() => setSelectedTopic(null)} aria-label="Yopish">
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </section>
            )}

            {view === "today" && (
              <section className="rl-view">
                <div className="rl-page-head">
                  <h1 className="rl-page-title">Bugungi takrorlash</h1>
                  <span className="rl-page-meta">{pendingCount} kutilmoqda</span>
                </div>

                <section className="rl-panel">
                  <div className="rl-progress">
                    <div className="rl-progress-info">
                      <span>Jarayon</span>
                      <span>
                        {doneToday} / {todayReviews.length}
                      </span>
                    </div>
                    <div className="rl-progress-track">
                      <div className="rl-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="rl-rows is-tight">
                    {todayReviews.length === 0 ? (
                      <Empty glyph="◎" title="Takrorlash yo'q" body="Bugun uchun hamma narsa bajarilgan." />
                    ) : (
                      todayReviews.map((review) => (
                        <ReviewRow
                          key={review.id}
                          review={review}
                          busy={busyId === review.id}
                          showBadge
                          onComplete={() => completeReview(review.id)}
                        />
                      ))
                    )}
                  </div>
                </section>
              </section>
            )}

            {view === "history" && (
              <section className="rl-view">
                <div className="rl-page-head">
                  <h1 className="rl-page-title">Takrorlash tarixi</h1>
                  <span className="rl-page-meta">{history.length} bajarilgan</span>
                </div>

                <section className="rl-panel">
                  <div className="rl-rows is-tight">
                    {history.length === 0 ? (
                      <Empty glyph="◷" title="Tarix bo'sh" body="Bajarilgan takrorlashlar shu yerda to'planadi." />
                    ) : (
                      history.map((item, i) => (
                        <div className="rl-row" key={item.id}>
                          <span className="rl-row-num">{String(i + 1).padStart(2, "0")}</span>
                          <div className="rl-row-body">
                            <span className="rl-row-title">{item.topic_title || "Takrorlash"}</span>
                            <span className="rl-row-meta">
                              Rejalashtirilgan {formatDate(item.review_date)} · {relativeDate(item.review_date)}
                            </span>
                          </div>
                          <div className="rl-row-right">
                            <span className="rl-badge">Bajarilgan</span>
                            <span className="rl-row-meta">{formatDate(item.completed_at)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </section>
            )}

            <p className="rl-sync">{loading ? "Sinxronlanmoqda…" : "RecallLoop API bilan ulangan"}</p>
          </>
        )}
      </main>

      <footer className="rl-foot">
        <span className="rl-foot-brand">RecallLoop</span>
        <span className="rl-foot-note">Kichik qadamlar. Uzoq xotira.</span>
      </footer>

      {toast && <div className={`rl-toast is-${toast.kind}`}>{toast.text}</div>}
    </div>
  );
}

function Ring({ percent }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="rl-ring">
      <svg viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} className="rl-ring-track" />
        <circle
          cx="32"
          cy="32"
          r={r}
          className="rl-ring-fill"
          style={{ strokeDasharray: c, strokeDashoffset: c - (c * percent) / 100 }}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <span className="rl-ring-label">{percent}%</span>
    </div>
  );
}

function ReviewRow({ review, busy, showBadge, onComplete }) {
  const done = review.status === "completed";
  return (
    <div className={`rl-row ${done ? "is-done" : ""} ${busy ? "is-busy" : ""}`}>
      <span className={`rl-tick ${done ? "is-checked" : ""}`}>{done ? "✓" : ""}</span>
      <div className="rl-row-body">
        <span className="rl-row-title">{review.topic_title || review.topic?.title || "Takrorlash"}</span>
        <span className="rl-row-meta">
          Muddat {formatDate(review.review_date)} · {relativeDate(review.review_date)}
        </span>
      </div>
      <div className="rl-row-right">
        {showBadge && <span className={`rl-badge ${done ? "is-ok" : ""}`}>{done ? "Bajarilgan" : "Kutilmoqda"}</span>}
        <button
          className={`rl-btn-sm ${done ? "is-disabled" : "is-ok"}`}
          disabled={done || busy}
          onClick={onComplete}
        >
          {done ? "Bajarildi" : busy ? "…" : "Bajardim"}
        </button>
      </div>
    </div>
  );
}

function Empty({ glyph, title, body }) {
  return (
    <div className="rl-empty">
      <span className="rl-empty-glyph">{glyph}</span>
      <span className="rl-empty-title">{title}</span>
      <span className="rl-empty-body">{body}</span>
    </div>
  );
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,700;1,900&family=Space+Grotesk:wght@400;500;600;700&display=swap');

.rl {
  --linen: #EAE6DC;
  --linen-mid: #DDD8CE;
  --linen-dark: #C8C2B6;
  --ink: #1A1706;
  --ink-mid: #3A3620;
  --ink-pale: #7A7560;
  --paper: #F5F2EB;
  --white: #FDFCF9;
  --red: #B03A2E;
  --green: #2D6A4F;

  min-height: 100vh;
  background: var(--linen);
  color: var(--ink);
  font-family: 'Space Grotesk', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  display: flex;
  flex-direction: column;
  position: relative;
}
.rl * { box-sizing: border-box; }
.rl button, .rl input { font: inherit; color: inherit; }
.rl button { cursor: pointer; background: none; border: none; }
.rl h1, .rl h2, .rl p { margin: 0; }

/* ── header ── */
.rl-head {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: stretch;
  background: rgba(245,242,235,.94);
  backdrop-filter: blur(8px);
  border-bottom: 2px solid var(--ink);
}
.rl-brand {
  display: flex; align-items: center; gap: 13px;
  padding: 15px 26px;
  border-right: 2px solid var(--ink);
  text-align: left;
}
.rl-stamp {
  width: 40px; height: 40px; flex-shrink: 0;
  border: 2px solid var(--ink); border-radius: 50%;
  display: grid; place-items: center;
  font-family: 'Playfair Display', serif; font-weight: 900; font-size: 19px;
  line-height: 1; padding-top: 2px;
}
.rl-brand-text { display: flex; flex-direction: column; gap: 2px; }
.rl-brand-name { font-family: 'Playfair Display', serif; font-weight: 900; font-size: 20px; letter-spacing: -.4px; line-height: 1; }
.rl-brand-sub { font-size: 9.5px; font-weight: 600; letter-spacing: 1.4px; text-transform: uppercase; color: var(--ink-pale); }

.rl-nav { display: flex; align-items: stretch; gap: 2px; flex: 1; overflow-x: auto; scrollbar-width: none; }
.rl-nav::-webkit-scrollbar { display: none; }
.rl-nav-btn {
  position: relative;
  display: inline-flex; align-items: center; gap: 7px;
  padding: 0 18px;
  font-size: 13px; font-weight: 600; color: var(--ink-pale);
  border-bottom: 3px solid transparent;
  white-space: nowrap;
  transition: color .16s ease, border-color .16s ease;
}
.rl-nav-btn:hover { color: var(--ink); }
.rl-nav-btn.is-active { color: var(--ink); border-bottom-color: var(--ink); }
.rl-nav-count {
  min-width: 17px; height: 17px; padding: 0 5px;
  display: grid; place-items: center;
  border-radius: 999px; background: var(--ink); color: var(--linen);
  font-size: 10px; font-weight: 700;
}

.rl-head-right { display: flex; align-items: center; padding: 0 26px; border-left: 2px solid var(--ink); }
.rl-status {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 1.1px; text-transform: uppercase;
  color: var(--ink-pale);
}
.rl-status.is-live { color: var(--ink); }
.rl-dot { width: 8px; height: 8px; border-radius: 50%; border: 2px solid currentColor; }
.rl-status.is-live .rl-dot { background: var(--ink); box-shadow: 0 0 0 3px var(--linen-dark); }
.rl-status:hover .rl-dot { background: var(--ink-pale); }

/* ── shell ── */
.rl-main { flex: 1; width: 100%; max-width: 1180px; margin: 0 auto; padding: 34px 26px 70px; }
.rl-view { animation: rlIn .4s cubic-bezier(.2,.7,.3,1) both; }
@keyframes rlIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

.rl-alert {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  border: 2px solid var(--red); background: #FAECEA; color: var(--red);
  padding: 11px 16px; margin-bottom: 18px; font-size: 13px; font-weight: 500;
}
.rl-alert button { font-size: 12px; font-weight: 700; text-decoration: underline; color: var(--red); }

/* ── gate ── */
.rl-gate {
  position: relative; overflow: hidden;
  border: 2px solid var(--ink); background: var(--white);
  padding: 64px 56px 52px;
}
.rl-gate-grid {
  position: absolute; inset: 0;
  background-image: linear-gradient(to right, rgba(26,23,6,.06) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(26,23,6,.06) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: radial-gradient(ellipse at 80% 0%, #000, transparent 72%);
  pointer-events: none;
}
.rl-gate-inner { position: relative; max-width: 620px; }
.rl-gate-kicker {
  display: inline-block; font-size: 10.5px; font-weight: 700; letter-spacing: 1.8px;
  text-transform: uppercase; color: var(--ink-pale); margin-bottom: 20px;
}
.rl-gate-title {
  font-family: 'Playfair Display', serif; font-weight: 900;
  font-size: clamp(34px, 5vw, 54px); line-height: 1.03; letter-spacing: -1.6px;
  margin-bottom: 18px;
}
.rl-gate-title em { font-style: italic; }
.rl-gate-copy { font-size: 14.5px; line-height: 1.65; color: var(--ink-pale); max-width: 470px; margin-bottom: 30px; }
.rl-gate-form { display: flex; gap: 0; border: 2px solid var(--ink); max-width: 560px; }
.rl-gate-input {
  flex: 1; min-width: 0; border: none; outline: none; background: var(--paper);
  padding: 14px 16px; font-size: 13.5px;
}
.rl-gate-input::placeholder { color: var(--ink-pale); }
.rl-gate-input:focus { background: var(--white); }
.rl-gate-form .rl-btn-solid { border-left: 2px solid var(--ink); padding: 14px 24px; }
.rl-gate-meta {
  display: flex; flex-wrap: wrap; gap: 20px; margin-top: 26px;
  font-size: 10.5px; font-weight: 600; letter-spacing: .9px; text-transform: uppercase; color: var(--ink-pale);
}

/* ── stats ── */
.rl-stats { display: grid; grid-template-columns: repeat(3, 1fr); border: 2px solid var(--ink); background: var(--white); margin-bottom: 26px; }
.rl-stat {
  position: relative; display: flex; flex-direction: column; gap: 6px;
  padding: 26px 28px 24px; border-right: 2px solid var(--ink);
  transition: background .18s ease;
}
.rl-stat:last-child { border-right: none; }
.rl-stat:hover { background: var(--paper); }
.rl-stat-glyph { position: absolute; top: 20px; right: 22px; font-family: 'Playfair Display', serif; font-size: 21px; color: var(--linen-dark); }
.rl-stat-num { font-family: 'Playfair Display', serif; font-weight: 900; font-size: clamp(46px, 6vw, 62px); line-height: .95; letter-spacing: -2.5px; font-variant-numeric: tabular-nums; }
.rl-stat-label { font-size: 10.5px; font-weight: 700; letter-spacing: 1.3px; text-transform: uppercase; color: var(--ink-pale); }

.rl-split { display: grid; grid-template-columns: 1.55fr 1fr; gap: 20px; align-items: start; }
.rl-side { display: flex; flex-direction: column; gap: 20px; }

/* ── panel ── */
.rl-panel { border: 2px solid var(--ink); background: var(--white); }
.rl-panel-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 15px 22px; border-bottom: 2px solid var(--ink);
}
.rl-panel.is-flat .rl-panel-head { padding: 14px 20px; }
.rl-panel-title { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 700; letter-spacing: -.3px; }
.rl-tag { font-size: 10px; font-weight: 700; letter-spacing: 1.1px; text-transform: uppercase; color: var(--ink-pale); border: 1.5px solid var(--linen-dark); padding: 3px 8px; }

/* focus */
.rl-focus-top { display: flex; align-items: center; gap: 18px; padding: 20px 22px; border-bottom: 1px solid var(--linen-mid); }
.rl-ring { position: relative; width: 68px; height: 68px; flex-shrink: 0; }
.rl-ring svg { width: 100%; height: 100%; }
.rl-ring-track { fill: none; stroke: var(--linen-mid); stroke-width: 4; }
.rl-ring-fill { fill: none; stroke: var(--ink); stroke-width: 4; stroke-linecap: butt; transition: stroke-dashoffset .6s cubic-bezier(.3,.8,.3,1); }
.rl-ring-label { position: absolute; inset: 0; display: grid; place-items: center; font-size: 12.5px; font-weight: 700; font-variant-numeric: tabular-nums; }
.rl-focus-copy { display: flex; flex-direction: column; gap: 3px; }
.rl-focus-count { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; letter-spacing: -.4px; }
.rl-focus-note { font-size: 12.5px; color: var(--ink-pale); line-height: 1.5; }

/* ── rows ── */
.rl-rows { padding: 0 22px; }
.rl-rows.is-tight { padding: 0; }
.rl-row {
  display: flex; align-items: center; gap: 14px;
  padding: 15px 0; border-bottom: 1px solid var(--linen-mid);
  transition: opacity .18s ease;
}
.rl-rows.is-tight .rl-row { padding: 15px 22px; }
.rl-row:last-child { border-bottom: none; }
.rl-row.is-busy { opacity: .55; }
.rl-row.is-done { opacity: .55; }
.rl-row.is-done .rl-row-title { text-decoration: line-through; text-decoration-thickness: 1.5px; }
.rl-row-num { font-family: 'Playfair Display', serif; font-size: 13px; font-weight: 700; color: var(--linen-dark); min-width: 22px; font-variant-numeric: tabular-nums; }
.rl-row-body { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
.rl-row-title { font-size: 14.5px; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; }
.rl-row-meta { font-size: 11.5px; color: var(--ink-pale); }
.rl-row-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
.rl-row-actions { display: flex; gap: 6px; flex-shrink: 0; }

.rl-tick {
  width: 20px; height: 20px; flex-shrink: 0;
  border: 2px solid var(--ink); border-radius: 50%;
  display: grid; place-items: center; font-size: 10px; font-weight: 700;
  transition: background .18s ease;
}
.rl-tick.is-checked { background: var(--ink); color: var(--linen); }

.rl-badge {
  font-size: 9.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
  border: 1.5px solid var(--linen-dark); color: var(--ink-pale); padding: 3px 7px;
}
.rl-badge.is-ok { border-color: var(--green); color: var(--green); }

/* buttons */
.rl-btn-solid {
  background: var(--ink); color: var(--linen);
  padding: 12px 20px; font-size: 13px; font-weight: 700; letter-spacing: .3px;
  transition: opacity .15s ease;
}
.rl-btn-solid:hover { opacity: .84; }
.rl-btn-solid:disabled { opacity: .35; cursor: not-allowed; }

.rl-btn-sm {
  border: 1.5px solid var(--ink); background: transparent; color: var(--ink);
  padding: 6px 11px; font-size: 11px; font-weight: 700; letter-spacing: .2px;
  transition: background .14s ease, color .14s ease;
  white-space: nowrap;
}
.rl-btn-sm:hover { background: var(--ink); color: var(--linen); }
.rl-btn-sm.is-on { background: var(--ink); color: var(--linen); }
.rl-btn-sm.is-ok { border-color: var(--green); color: var(--green); }
.rl-btn-sm.is-ok:hover { background: var(--green); color: #fff; }
.rl-btn-sm.is-danger { border-color: var(--red); color: var(--red); }
.rl-btn-sm.is-danger:hover { background: var(--red); color: #fff; }
.rl-btn-sm.is-disabled, .rl-btn-sm:disabled { opacity: .38; border-style: dashed; cursor: default; }
.rl-btn-sm:disabled:hover { background: transparent; color: var(--green); }

/* add form */
.rl-add { display: flex; border-bottom: 2px solid var(--ink); }
.rl-add-input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; padding: 15px 22px; font-size: 14px; }
.rl-add-input::placeholder { color: var(--ink-pale); }
.rl-add-input:focus { background: var(--linen); }
.rl-add .rl-btn-solid { padding: 15px 22px; }

/* edit inline */
.rl-edit { display: flex; gap: 7px; align-items: center; flex: 1; }
.rl-edit-input { flex: 1; min-width: 0; border: 2px solid var(--ink); background: var(--paper); padding: 8px 11px; font-size: 13.5px; outline: none; }
.rl-edit-input:focus { background: var(--white); }

/* detail */
.rl-detail {
  position: relative;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px 24px;
  border-top: 1px solid var(--linen-mid);
  background: var(--paper);
  padding: 18px 22px;
  animation: rlIn .3s ease both;
}
.rl-detail-col { display: flex; flex-direction: column; gap: 4px; }
.rl-detail-label { font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--ink-pale); }
.rl-detail-value { font-size: 13px; font-weight: 500; line-height: 1.45; overflow-wrap: anywhere; }
.rl-detail-value.is-mono { font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; color: var(--ink-mid); }
.rl-detail-close { position: absolute; top: 12px; right: 14px; font-size: 13px; color: var(--ink-pale); padding: 4px; }
.rl-detail-close:hover { color: var(--ink); }

/* page head */
.rl-page-head { display: flex; align-items: baseline; gap: 14px; margin-bottom: 18px; }
.rl-page-title { font-family: 'Playfair Display', serif; font-size: clamp(24px, 3.4vw, 30px); font-weight: 700; letter-spacing: -.9px; }
.rl-page-meta { font-size: 10.5px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--ink-pale); }

/* progress */
.rl-progress { padding: 18px 22px; border-bottom: 1px solid var(--linen-mid); }
.rl-progress-info { display: flex; justify-content: space-between; font-size: 10.5px; font-weight: 700; letter-spacing: 1.1px; text-transform: uppercase; color: var(--ink-pale); margin-bottom: 8px; }
.rl-progress-track { height: 3px; background: var(--linen-mid); }
.rl-progress-fill { height: 100%; background: var(--ink); transition: width .5s cubic-bezier(.3,.8,.3,1); }

/* bars */
.rl-bars { display: flex; align-items: flex-end; gap: 6px; padding: 24px 20px 18px; height: 150px; }
.rl-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; }
.rl-bar-count { font-size: 10px; font-weight: 700; color: var(--ink-pale); height: 12px; }
.rl-bar { flex: 1; width: 100%; display: flex; align-items: flex-end; background: var(--paper); border: 1.5px solid var(--linen-mid); }
.rl-bar.is-today { border-color: var(--ink); }
.rl-bar-fill { width: 100%; background: var(--ink-mid); transition: height .5s ease; }
.rl-bar.is-today .rl-bar-fill { background: var(--ink); }
.rl-bar-label { font-size: 9.5px; font-weight: 600; letter-spacing: .4px; color: var(--ink-pale); text-transform: uppercase; }

/* side topic */
.rl-side-topic { display: flex; gap: 12px; align-items: flex-start; padding: 16px 20px; }
.rl-side-num { font-family: 'Playfair Display', serif; font-size: 13px; font-weight: 700; color: var(--linen-dark); }
.rl-side-title { font-size: 14px; font-weight: 600; line-height: 1.4; margin-bottom: 3px; overflow-wrap: anywhere; }
.rl-side-meta { font-size: 11px; color: var(--ink-pale); }
.rl-side-empty { padding: 20px; font-size: 12.5px; color: var(--ink-pale); }

.rl-more {
  display: block; width: 100%; text-align: left;
  padding: 12px 22px; font-size: 12px; font-weight: 700; letter-spacing: .4px;
  border-top: 1px solid var(--linen-mid); color: var(--ink);
  transition: background .14s ease;
}
.rl-more:hover { background: var(--paper); }

/* empty + loading */
.rl-empty { padding: 46px 22px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 5px; }
.rl-empty-glyph { font-family: 'Playfair Display', serif; font-size: 44px; line-height: 1; color: var(--linen-dark); margin-bottom: 6px; }
.rl-empty-title { font-size: 14.5px; font-weight: 600; color: var(--ink-mid); }
.rl-empty-body { font-size: 12.5px; color: var(--ink-pale); max-width: 260px; line-height: 1.5; }
.rl-loading { padding: 40px 22px; text-align: center; font-size: 12.5px; color: var(--ink-pale); }

.rl-sync { text-align: center; font-size: 10.5px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--ink-pale); margin-top: 22px; }

/* toast */
.rl-toast {
  position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%);
  z-index: 60;
  border: 2px solid var(--ink); background: var(--ink); color: var(--linen);
  padding: 11px 20px; font-size: 12.5px; font-weight: 600;
  animation: rlToast .28s cubic-bezier(.2,.8,.3,1) both;
  box-shadow: 0 8px 24px rgba(26,23,6,.18);
}
.rl-toast.is-ok { background: var(--green); border-color: var(--green); }
.rl-toast.is-err { background: var(--red); border-color: var(--red); }
@keyframes rlToast { from { opacity: 0; transform: translate(-50%, 14px); } to { opacity: 1; transform: translate(-50%, 0); } }

/* footer */
.rl-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  border-top: 2px solid var(--ink); background: var(--paper);
  padding: 15px 26px;
}
.rl-foot-brand { font-family: 'Playfair Display', serif; font-size: 13.5px; font-weight: 700; }
.rl-foot-note { font-size: 10.5px; letter-spacing: .6px; color: var(--ink-pale); }

/* ── responsive ── */
@media (max-width: 900px) {
  .rl-split { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .rl-head { flex-wrap: wrap; }
  .rl-brand { border-right: none; width: 100%; padding: 13px 18px; border-bottom: 1px solid var(--linen-mid); }
  .rl-nav { order: 3; width: 100%; border-top: 1px solid var(--linen-mid); }
  .rl-nav-btn { padding: 12px 14px; }
  .rl-head-right { position: absolute; top: 14px; right: 16px; padding: 0; border-left: none; }
  .rl-main { padding: 22px 16px 60px; }
  .rl-gate { padding: 40px 22px 34px; }
  .rl-gate-form { flex-direction: column; }
  .rl-gate-form .rl-btn-solid { border-left: none; border-top: 2px solid var(--ink); }
  .rl-stats { grid-template-columns: 1fr; }
  .rl-stat { border-right: none; border-bottom: 2px solid var(--ink); padding: 20px 22px; }
  .rl-stat:last-child { border-bottom: none; }
  .rl-stat-num { font-size: 44px; }
  .rl-add { flex-direction: column; }
  .rl-add .rl-btn-solid { border-top: 2px solid var(--ink); }
  .rl-row { flex-wrap: wrap; }
  .rl-row-actions, .rl-row-right { width: 100%; justify-content: flex-start; }
  .rl-bars { height: 130px; }
  .rl-foot { flex-direction: column; align-items: flex-start; gap: 4px; }
}
@media (prefers-reduced-motion: reduce) {
  .rl-view, .rl-detail, .rl-toast { animation: none; }
  .rl-progress-fill, .rl-ring-fill, .rl-bar-fill { transition: none; }
}
`;