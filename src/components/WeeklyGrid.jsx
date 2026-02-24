import React, { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";

function formatHour(h) {
  if (h === 0) return "12AM";
  if (h < 12) return `${h}AM`;
  if (h === 12) return "12PM";
  return `${h - 12}PM`;
}

function typeBadge(type) {
  return type === "exam" ? "EXAM" : "ASG";
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function WeeklyGrid({
  weekDays,
  events = [],
  assessments = [],
  onSelectAssessmentDate,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onCopyWeek,
  onPrevWeek,
  onNextWeek,
}) {
  const hours = useMemo(() => Array.from({ length: 15 }, (_, i) => 6 + i), []); // 6~20
  const weekLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const rangeText = useMemo(() => {
    if (!weekDays?.length) return "";
    return `${format(weekDays[0], "MM-dd")} ~ ${format(weekDays[6], "MM-dd")}`;
  }, [weekDays]);

  // ===== 레이아웃/드래그 상수 =====
  const CELL_H = 60;
  const MAX_DUR = 12;

  const getCellEvents = (dateKey, hour) =>
    events.filter((e) => e.dateKey === dateKey && e.startHour === hour);

  const getDayAssessments = (dateKey) =>
    assessments.filter((a) => String(a.dateKey) === String(dateKey));

  // ===== 일정 추가/수정 모달 (공용) =====
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("add"); // add | edit
  const [editingId, setEditingId] = useState(null);

  const [target, setTarget] = useState(null); // { dateKey, startHour, duration }
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(1);
  const [color, setColor] = useState("#2563eb");

  // ✅ 반복(추가 모드에서만 사용)
  const [repeat, setRepeat] = useState("none"); // none | weekly | monthly | yearly
  const [repeatUntil, setRepeatUntil] = useState(""); // yyyy-MM-dd

  const openAddModal = ({ dateKey, startHour, duration: dur = 1 }) => {
    setMode("add");
    setEditingId(null);
    setTarget({ dateKey, startHour, duration: dur });
    setTitle("");
    setDuration(clamp(Number(dur || 1), 1, MAX_DUR));
    setColor("#2563eb");
    setRepeat("none");
    setRepeatUntil("");
    setOpen(true);
  };

  const openEditModal = (ev) => {
    setMode("edit");
    setEditingId(ev.id);
    setTarget({
      dateKey: ev.dateKey,
      startHour: ev.startHour,
      duration: clamp(Number(ev.duration || 1), 1, MAX_DUR),
    });
    setTitle(ev.title || "");
    setDuration(clamp(Number(ev.duration || 1), 1, MAX_DUR));
    setColor(ev.color || "#2563eb");

    // 수정 모드에서는 “반복” 수정은 복잡(시리즈 전체/일부 처리)해서 UI를 숨김.
    setRepeat("none");
    setRepeatUntil("");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setTarget(null);
    setEditingId(null);
    setMode("add");
  };

  const submit = () => {
    if (!target) return;
    const t = title.trim();
    if (!t) return alert("제목을 입력해 주세요.");

    const dur = clamp(Number(duration || 1), 1, MAX_DUR);

    if (mode === "add") {
      const rep = String(repeat || "none");
      const until = (repeatUntil || "").trim();

      if (typeof onAddEvent === "function") {
        onAddEvent({
          dateKey: target.dateKey,
          startHour: target.startHour,
          title: t,
          duration: dur,
          color,
          // ✅ 반복 설정 전달
          repeat: rep,
          repeatUntil: rep === "none" ? "" : until,
        });
      }
    } else {
      if (!editingId) return;
      if (typeof onUpdateEvent === "function") {
        onUpdateEvent(editingId, {
          title: t,
          duration: dur,
          color,
        });
      }
    }

    closeModal();
  };

  const onModalKeyDown = (e) => {
    if (e.key === "Escape") closeModal();
    if (e.key === "Enter") submit();
  };

  // ===== 주간 복사 =====
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyOffset, setCopyOffset] = useState(1);

  const submitCopy = () => {
    if (typeof onCopyWeek === "function") {
      onCopyWeek({ offsetWeeks: Number(copyOffset || 1) });
    }
    setCopyOpen(false);
  };

  // ===== 드래그로 일정 추가(셀 드래그 선택) =====
  const [selecting, setSelecting] = useState(null); // { dateKey, startHour, endHour }

  useEffect(() => {
    const up = () => {
      if (!selecting) return;
      const { dateKey, startHour, endHour } = selecting;
      const s = Math.min(startHour, endHour);
      const e = Math.max(startHour, endHour);
      const dur = clamp(e - s + 1, 1, MAX_DUR);
      setSelecting(null);
      openAddModal({ dateKey, startHour: s, duration: dur });
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [selecting]);

  // ===== 드래그로 이동/리사이즈 =====
  const dragRef = useRef({ mode: null });
  const [dragGhost, setDragGhost] = useState(null); // { dateKey, startHour, duration }

  useEffect(() => {
    const onMove = (e) => {
      const st = dragRef.current;
      if (!st?.mode) return;

      if (st.mode === "move") {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const cell = el?.closest?.(".cell[data-datekey][data-hour]");
        if (!cell) return;
        const dateKey = cell.getAttribute("data-datekey");
        const hour = Number(cell.getAttribute("data-hour"));
        if (!dateKey || Number.isNaN(hour)) return;
        setDragGhost({ dateKey, startHour: hour, duration: st.duration });
      }

      if (st.mode === "resize") {
        const dy = e.clientY - st.startY;
        const delta = Math.round(dy / CELL_H);
        const newDur = clamp(st.startDuration + delta, 1, MAX_DUR);
        setDragGhost({ dateKey: st.dateKey, startHour: st.startHour, duration: newDur });
      }
    };

    const onUp = () => {
      const st = dragRef.current;
      if (!st?.mode) return;

      if (st.mode === "move") {
        if (dragGhost && typeof onUpdateEvent === "function") {
          onUpdateEvent(st.eventId, {
            dateKey: dragGhost.dateKey,
            startHour: dragGhost.startHour,
          });
        }
      }

      if (st.mode === "resize") {
        if (dragGhost && typeof onUpdateEvent === "function") {
          onUpdateEvent(st.eventId, { duration: dragGhost.duration });
        }
      }

      dragRef.current = { mode: null };
      setDragGhost(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragGhost, onUpdateEvent]);

  const startMove = (ev) => {
    dragRef.current = {
      mode: "move",
      eventId: ev.id,
      duration: clamp(Number(ev.duration || 1), 1, MAX_DUR),
    };
    setDragGhost({
      dateKey: ev.dateKey,
      startHour: ev.startHour,
      duration: clamp(Number(ev.duration || 1), 1, MAX_DUR),
    });
  };

  const startResize = (ev, clientY) => {
    dragRef.current = {
      mode: "resize",
      eventId: ev.id,
      dateKey: ev.dateKey,
      startHour: ev.startHour,
      startY: clientY,
      startDuration: clamp(Number(ev.duration || 1), 1, MAX_DUR),
    };
    setDragGhost({
      dateKey: ev.dateKey,
      startHour: ev.startHour,
      duration: clamp(Number(ev.duration || 1), 1, MAX_DUR),
    });
  };

  // ✅ 1시간 일정 잘림 방지 + 클릭 시 수정(전파 차단)
  const renderEventPill = (ev, isGhost = false) => {
    const dur = clamp(Number(ev.duration || 1), 1, MAX_DUR);
    const endHour = Number(ev.startHour || 0) + dur;

    return (
      <div
        key={isGhost ? `ghost-${ev.id}` : ev.id}
        className={`event-pill ${dur === 1 ? "is-compact" : ""} ${isGhost ? "is-ghost" : ""}`}
        style={{
          background: ev.color || "#2563eb",
          height: `${dur * CELL_H}px`,
          top: 0,
        }}
        // ✅ 블록 누르면 "추가"가 아니라 "수정"으로
        onClick={(e) => {
          e.stopPropagation();
          if (isGhost) return;
          openEditModal(ev);
        }}
        // ✅ 드래그 이동 (삭제버튼/리사이즈 핸들 클릭은 제외)
        onMouseDown={(e) => {
          if (isGhost) return;
          const inBtn = e.target.closest?.("button");
          const inHandle = e.target.closest?.(".event-resize-handle");
          if (inBtn || inHandle) return;
          e.preventDefault();
          e.stopPropagation();
          startMove(ev);
        }}
        title={`${ev.title} · ${formatHour(Number(ev.startHour || 0))} – ${formatHour(endHour)}`}
      >
        <div className="event-pill-head">
          <div className="event-pill-title" title={ev.title}>
            {ev.title}
          </div>

          {!isGhost && (
            <button
              className="event-del"
              type="button"
              title="삭제"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onDeleteEvent === "function") onDeleteEvent(ev.id);
              }}
            >
              ×
            </button>
          )}
        </div>

        {dur >= 2 && (
          <div className="event-pill-time">
            {formatHour(Number(ev.startHour || 0))} – {formatHour(endHour)}
          </div>
        )}

        {!isGhost && (
          <div
            className="event-resize-handle"
            title="아래로 드래그해서 시간 늘리기/줄이기"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              startResize(ev, e.clientY);
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="weekly">
      <div className="weekly-header">
        <div>
          <div className="weekly-range">{rangeText}</div>
          <div className="weekly-sub">
            셀 클릭/드래그로 일정 추가 · 일정 드래그로 이동 · 아래 핸들로 시간 조절 · 블록 클릭=수정
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={() => setCopyOpen(true)}>
            이번 주 복사
          </button>
          <button className="btn" type="button" onClick={onPrevWeek}>
            ← 이전 주
          </button>
          <button className="btn" type="button" onClick={onNextWeek}>
            다음 주 →
          </button>
        </div>
      </div>

      <div className="weekly-grid">
        <div className="time-col header-time" />

        {weekDays.map((d, idx) => {
          const dateKey = format(d, "yyyy-MM-dd");
          const dayItems = getDayAssessments(dateKey);
          const visible = dayItems.slice(0, 3);
          const more = Math.max(0, dayItems.length - visible.length);

          return (
            <div className="day-col header-cell" key={d.toISOString()}>
              <div className="header-inner">
                <div className="dow">{weekLabels[idx]}</div>
                <div className="date">{format(d, "d")}</div>

                {dayItems.length > 0 && (
                  <div className="wk-badges">
                    {visible.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="wk-badge"
                        style={{ background: a.color || "#111827" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof onSelectAssessmentDate === "function") onSelectAssessmentDate(dateKey);
                        }}
                        title={`${typeBadge(a.type)} · ${a.title}`}
                      >
                        {typeBadge(a.type)}
                      </button>
                    ))}
                    {more > 0 && (
                      <button
                        type="button"
                        className="wk-badge more"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof onSelectAssessmentDate === "function") onSelectAssessmentDate(dateKey);
                        }}
                        title="더 보기"
                      >
                        +{more}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {hours.map((h) => (
          <React.Fragment key={h}>
            <div className="time-col">{formatHour(h)}</div>

            {weekDays.map((d, dayIndex) => {
              const dateKey = format(d, "yyyy-MM-dd");
              const cellEvents = getCellEvents(dateKey, h);

              const isSelectingHere =
                selecting &&
                selecting.dateKey === dateKey &&
                h >= Math.min(selecting.startHour, selecting.endHour) &&
                h <= Math.max(selecting.startHour, selecting.endHour);

              const ghostHere = dragGhost && dragGhost.dateKey === dateKey && dragGhost.startHour === h;

              return (
                <div
                  className={`day-col cell ${cellEvents.length ? "has-event" : ""} ${isSelectingHere ? "is-selecting" : ""}`}
                  key={`${dayIndex}-${h}`}
                  data-datekey={dateKey}
                  data-hour={h}
                  onClick={(e) => {
                    // ✅ 이벤트 위 클릭이면 "추가" 금지
                    if (e.target.closest?.(".event-pill")) return;
                    if (selecting) return;
                    openAddModal({ dateKey, startHour: h, duration: 1 });
                  }}
                  onMouseDown={(e) => {
                    if (e.button !== 0) return;
                    if (e.target.closest?.(".event-pill")) return;
                    setSelecting({ dateKey, startHour: h, endHour: h });
                  }}
                  onMouseEnter={() => {
                    if (!selecting) return;
                    if (selecting.dateKey !== dateKey) return;
                    setSelecting((prev) => (prev ? { ...prev, endHour: h } : prev));
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {ghostHere &&
                    renderEventPill(
                      {
                        id: "ghost",
                        title: "이동 중…",
                        color: "#111827",
                        startHour: dragGhost.startHour,
                        duration: dragGhost.duration,
                      },
                      true
                    )}

                  {cellEvents.map((ev) => renderEventPill(ev, false))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* 일정 추가/수정 모달 */}
      {open && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} onKeyDown={onModalKeyDown} tabIndex={-1}>
            <div className="modal-title">{mode === "add" ? "일정 추가" : "일정 수정"}</div>

            <div className="modal-sub">
              {target?.dateKey} · {target?.startHour}시 시작 · {duration}시간
            </div>

            <label className="modal-label">제목</label>
            <input className="modal-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 팀 회의" autoFocus />

            <div className="modal-row">
              <div style={{ flex: 1 }}>
                <label className="modal-label">시간(지속)</label>
                <input
                  className="modal-input"
                  type="number"
                  min={1}
                  max={MAX_DUR}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>

              <div style={{ width: 160 }}>
                <label className="modal-label">색상</label>
                <input className="modal-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="color" />
              </div>
            </div>

            {/* ✅ 반복은 "추가 모드"에서만 표시 */}
            {mode === "add" && (
              <div className="modal-row" style={{ marginTop: 10 }}>
                <div style={{ flex: 1 }}>
                  <label className="modal-label">반복</label>
                  <select className="modal-input" value={repeat} onChange={(e) => setRepeat(e.target.value)}>
                    <option value="none">반복 없음</option>
                    <option value="weekly">매주</option>
                    <option value="monthly">매달</option>
                    <option value="yearly">매년</option>
                  </select>
                </div>

                <div style={{ width: 220 }}>
                  <label className="modal-label">반복 종료(선택)</label>
                  <input
                    className="modal-input"
                    type="date"
                    value={repeatUntil}
                    onChange={(e) => setRepeatUntil(e.target.value)}
                    disabled={repeat === "none"}
                  />
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn" type="button" onClick={closeModal}>
                취소
              </button>
              <button className="btn primary" type="button" onClick={submit}>
                {mode === "add" ? "추가" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 주간 복사 모달 */}
      {copyOpen && (
        <div className="modal-overlay" onClick={() => setCopyOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">이번 주 일정 복사</div>
            <div className="modal-sub">이번 주 일정을 선택한 주 뒤로 복사해요.</div>

            <label className="modal-label">몇 주 뒤로 복사할까요?</label>
            <select className="modal-input" value={copyOffset} onChange={(e) => setCopyOffset(e.target.value)}>
              <option value={1}>다음 주(1주 뒤)</option>
              <option value={2}>2주 뒤</option>
              <option value={3}>3주 뒤</option>
              <option value={4}>4주 뒤</option>
            </select>

            <div className="modal-actions">
              <button className="btn" type="button" onClick={() => setCopyOpen(false)}>
                취소
              </button>
              <button className="btn primary" type="button" onClick={submitCopy}>
                복사
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}