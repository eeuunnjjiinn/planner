import React, { useMemo, useState } from "react";
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

export default function WeeklyGrid({
  weekDays,
  events = [],
  assessments = [],
  onSelectAssessmentDate,
  onAddEvent,
  onDeleteEvent,
  onPrevWeek,
  onNextWeek,
}) {
  const hours = useMemo(() => Array.from({ length: 15 }, (_, i) => 6 + i), []); // 6~20
  const weekLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const rangeText = useMemo(() => {
    if (!weekDays?.length) return "";
    return `${format(weekDays[0], "MM-dd")} ~ ${format(weekDays[6], "MM-dd")}`;
  }, [weekDays]);

  const CELL_H = 60;
  const EVENT_TOP_GAP = 6;
  const EVENT_BOTTOM_GAP = 6;

  const getCellEvents = (dateKey, hour) =>
    events.filter((e) => e.dateKey === dateKey && e.startHour === hour);

  const getDayAssessments = (dateKey) =>
    assessments.filter((a) => String(a.dateKey) === String(dateKey));

  // 모달(기존 일정 추가)
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(null); // { dateKey, startHour }
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(1);
  const [color, setColor] = useState("#2563eb");

  const openModal = ({ dateKey, startHour }) => {
    setTarget({ dateKey, startHour });
    setTitle("");
    setDuration(1);
    setColor("#2563eb");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setTarget(null);
  };

  const submit = () => {
    if (!target) return;
    const t = title.trim();
    if (!t) return alert("제목을 입력해 주세요.");

    const dur = Math.min(12, Math.max(1, Number(duration || 1)));

    if (typeof onAddEvent === "function") {
      onAddEvent({
        dateKey: target.dateKey,
        startHour: target.startHour,
        title: t,
        duration: dur,
        color,
      });
    }
    closeModal();
  };

  const onModalKeyDown = (e) => {
    if (e.key === "Escape") closeModal();
    if (e.key === "Enter") submit();
  };

  return (
    <div className="weekly">
      <div className="weekly-header">
        <div className="weekly-range">{rangeText}</div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn" type="button" onClick={onPrevWeek}>
            ← 이전 주
          </button>
          <button className="btn" type="button" onClick={onNextWeek}>
            다음 주 →
          </button>
        </div>
      </div>

      <div className="weekly-grid">
        {/* 헤더 */}
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

                {/* ✅ 시험/과제 배지 */}
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
                          if (typeof onSelectAssessmentDate === "function") {
                            onSelectAssessmentDate(dateKey);
                          }
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
                          if (typeof onSelectAssessmentDate === "function") {
                            onSelectAssessmentDate(dateKey);
                          }
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

        {/* 시간 행 */}
        {hours.map((h) => (
          <React.Fragment key={h}>
            <div className="time-col">{formatHour(h)}</div>

            {weekDays.map((d, dayIndex) => {
              const dateKey = format(d, "yyyy-MM-dd");
              const cellEvents = getCellEvents(dateKey, h);

              return (
                <div
                  className={`day-col cell ${cellEvents.length ? "has-event" : ""}`}
                  key={`${dayIndex}-${h}`}
                  onClick={() => openModal({ dateKey, startHour: h })}
                  style={{ cursor: "pointer" }}
                >
                  {cellEvents.map((ev) => {
                    const dur = Math.max(1, Number(ev.duration || 1));
                    const endHour = ev.startHour + dur;

                    const heightPx = dur * CELL_H - (EVENT_TOP_GAP + EVENT_BOTTOM_GAP);

                    return (
                      <div
                        key={ev.id}
                        className="event-pill"
                        style={{
                          background: ev.color || "#2563eb",
                          height: `${heightPx}px`,
                        }}
                        title="클릭하면 삭제"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof onDeleteEvent === "function") onDeleteEvent(ev.id);
                        }}
                      >
                        <div className="event-pill-title">{ev.title}</div>
                        <div className="event-pill-time">
                          {formatHour(ev.startHour)} – {formatHour(endHour)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* 일정 추가 모달 */}
      {open && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onModalKeyDown}
            tabIndex={-1}
          >
            <div className="modal-title">일정 추가</div>

            <div className="modal-sub">
              {target?.dateKey} · {target?.startHour}시 시작
            </div>

            <label className="modal-label">제목</label>
            <input
              className="modal-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 팀 회의"
              autoFocus
            />

            <div className="modal-row">
              <div style={{ flex: 1 }}>
                <label className="modal-label">시간(지속)</label>
                <input
                  className="modal-input"
                  type="number"
                  min={1}
                  max={12}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>

              <div style={{ width: 160 }}>
                <label className="modal-label">색상</label>
                <input
                  className="modal-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  aria-label="color"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn" type="button" onClick={closeModal}>
                취소
              </button>
              <button className="btn primary" type="button" onClick={submit}>
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
