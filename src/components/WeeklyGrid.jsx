import React, { useMemo, useState } from "react";
import { format } from "date-fns";

function formatHour(h) {
  if (h === 0) return "12AM";
  if (h < 12) return `${h}AM`;
  if (h === 12) return "12PM";
  return `${h - 12}PM`;
}

export default function WeeklyGrid({
  weekDays,
  events = [],
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

  // ✅ CSS의 .cell height(60px)와 반드시 맞춰야 함
  const CELL_H = 60;
  const EVENT_TOP_GAP = 6;
  const EVENT_BOTTOM_GAP = 6;

  // 특정 (dateKey, hour)에 들어갈 이벤트만 뽑기
  const getCellEvents = (dateKey, hour) =>
    events.filter((e) => e.dateKey === dateKey && e.startHour === hour);

  // ✅ 모달 상태
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

        {/* ✅ 주간 이동 버튼 */}
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
        {/* ===== 헤더 1행 ===== */}
        <div className="time-col header-time" />
        {weekDays.map((d, idx) => (
          <div className="day-col header-cell" key={d.toISOString()}>
            <div className="header-inner">
              <div className="dow">{weekLabels[idx]}</div>
              <div className="date">{format(d, "d")}</div>
            </div>
          </div>
        ))}

        {/* ===== 시간 행들 ===== */}
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

                    // ✅ 칸(60px) 기준으로 정확히 맞춤
                    const heightPx =
                      dur * CELL_H - (EVENT_TOP_GAP + EVENT_BOTTOM_GAP);

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
                          if (typeof onDeleteEvent === "function") {
                            onDeleteEvent(ev.id);
                          }
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

      {/* ✅ 중앙 모달 */}
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
