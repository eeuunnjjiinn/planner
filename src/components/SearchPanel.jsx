import React, { useMemo, useState } from "react";

function norm(v) {
  return (v ?? "").toString().trim().toLowerCase();
}

export default function SearchPanel({
  events = [],
  todos = [],
  onPickEvent,
  onPickTodo,
}) {
  const [q, setQ] = useState("");

  const { eventHits, todoHits } = useMemo(() => {
    const nq = norm(q);
    if (!nq) return { eventHits: [], todoHits: [] };

    const eventHits = events.filter((e) => {
      return norm(e.title).includes(nq) || norm(e.dateKey).includes(nq);
    });

    const todoHits = todos.filter((t) => {
      return norm(t.text).includes(nq) || norm(t.dateKey).includes(nq);
    });

    eventHits.sort((a, b) => String(b.dateKey || "").localeCompare(String(a.dateKey || "")));
    todoHits.sort((a, b) => String(b.dateKey || "").localeCompare(String(a.dateKey || "")));

    return { eventHits, todoHits };
  }, [q, events, todos]);

  return (
    <div className="card sp-search" style={{ padding: 14 }}>
      <div className="sp-search-head">
        <div>
          <div className="sp-search-title">검색</div>
          <div className="sp-search-sub">이번 주 일정/투두를 빠르게 찾아요</div>
        </div>
        <div className="sp-search-count">
          {q ? `일정 ${eventHits.length} · 투두 ${todoHits.length}` : ""}
        </div>
      </div>

      <input
        className="input"
        style={{ marginTop: 10 }}
        placeholder="예) 발표, 시험, 과제, 캡스톤…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {!q ? (
        <div className="sp-search-empty">검색어를 입력하면 결과가 보여요.</div>
      ) : (
        <div className="sp-search-results">
          <div className="sp-search-section">
            <div className="sp-search-section-title">일정</div>
            {eventHits.length === 0 ? (
              <div className="sp-search-none">일정 결과가 없어요.</div>
            ) : (
              <div className="sp-search-list">
                {eventHits.slice(0, 10).map((e) => (
                  <button
                    key={e.id}
                    className="sp-search-item"
                    type="button"
                    onClick={() => onPickEvent?.(e)}
                  >
                    <div className="sp-search-item-main">
                      <div className="sp-search-item-title">{e.title}</div>
                      <div className="sp-search-item-sub">
                        {e.dateKey} · {Number.isFinite(e.startHour) ? `${e.startHour}:00` : ""}
                      </div>
                    </div>
                    <div className="sp-search-item-tag">일정</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="sp-search-section">
            <div className="sp-search-section-title">투두</div>
            {todoHits.length === 0 ? (
              <div className="sp-search-none">투두 결과가 없어요.</div>
            ) : (
              <div className="sp-search-list">
                {todoHits.slice(0, 10).map((t) => (
                  <button
                    key={t.id}
                    className="sp-search-item"
                    type="button"
                    onClick={() => onPickTodo?.(t)}
                  >
                    <div className="sp-search-item-main">
                      <div className={`sp-search-item-title ${t.done ? "is-done" : ""}`}>
                        {t.text}
                      </div>
                      <div className="sp-search-item-sub">{t.dateKey}</div>
                    </div>
                    <div className="sp-search-item-tag">투두</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}