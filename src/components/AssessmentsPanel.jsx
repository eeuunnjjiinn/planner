import React, { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO, differenceInCalendarDays } from "date-fns";
import { db } from "../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

const TYPE_OPTIONS = [
  { value: "assignment", label: "과제", badge: "ASG" },
  { value: "exam", label: "시험", badge: "EXAM" },
];

const STATUS_OPTIONS = {
  assignment: [
    { value: "in_progress", label: "진행중" },
    { value: "submitted", label: "제출완료" },
  ],
  exam: [
    { value: "preparing", label: "준비중" },
    { value: "done", label: "응시완료" },
  ],
};

function clampText(s, n = 40) {
  const t = String(s || "");
  return t.length > n ? t.slice(0, n) + "…" : t;
}

export default function AssessmentsPanel({ uid, selectedDate, subjects = [] }) {
  const baseDateKey = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);
  const rangeEndKey = useMemo(() => format(addDays(selectedDate, 7), "yyyy-MM-dd"), [selectedDate]);

  const [filter, setFilter] = useState("all"); // all | exam | assignment | pending
  const [items, setItems] = useState([]);

  // 모달
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [type, setType] = useState("assignment");
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [dateKey, setDateKey] = useState(baseDateKey);
  const [time, setTime] = useState("22:00");
  const [location, setLocation] = useState("");
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState("in_progress");

  useEffect(() => {
    setDateKey(baseDateKey);
  }, [baseDateKey]);

  // 다가오는 7일 구독
  useEffect(() => {
    if (!uid) {
      setItems([]);
      return;
    }

    const colRef = collection(db, "users", uid, "assessments");
    const q = query(
      colRef,
      where("dateKey", ">=", baseDateKey),
      where("dateKey", "<=", rangeEndKey)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          if (a.dateKey !== b.dateKey) return String(a.dateKey).localeCompare(String(b.dateKey));
          return String(a.time || "").localeCompare(String(b.time || ""));
        });
        setItems(list);
      },
      (err) => console.error("ASSESSMENTS PANEL SNAPSHOT ERROR =", err)
    );

    return () => unsub();
  }, [uid, baseDateKey, rangeEndKey]);

  const subjectMap = useMemo(() => {
    const m = new Map();
    subjects.forEach((s) => m.set(s.id, s));
    return m;
  }, [subjects]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "exam") return items.filter((i) => i.type === "exam");
    if (filter === "assignment") return items.filter((i) => i.type === "assignment");
    if (filter === "pending") {
      return items.filter((i) => {
        if (i.type === "exam") return i.status !== "done";
        return i.status !== "submitted";
      });
    }
    return items;
  }, [items, filter]);

  const openNew = (t) => {
    setEditing(null);
    setType(t);
    setTitle("");
    setSubjectId("");
    setDateKey(baseDateKey);
    setTime(t === "exam" ? "13:30" : "22:00");
    setLocation("");
    setMemo("");
    setStatus(t === "exam" ? "preparing" : "in_progress");
    setOpen(true);
  };

  const openEdit = (it) => {
    setEditing(it);
    setType(it.type || "assignment");
    setTitle(it.title || "");
    setSubjectId(it.subjectId || "");
    setDateKey(it.dateKey || baseDateKey);
    setTime(it.time || (it.type === "exam" ? "13:30" : "22:00"));
    setLocation(it.location || "");
    setMemo(it.memo || "");
    setStatus(
      it.status ||
        (it.type === "exam" ? "preparing" : "in_progress")
    );
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditing(null);
  };

  const save = async () => {
    if (!uid) return alert("로그인이 필요합니다.");
    const t = title.trim();
    if (!t) return alert("제목을 입력해 주세요.");
    if (!dateKey) return alert("날짜를 선택해 주세요.");

    const subj = subjectId ? subjectMap.get(subjectId) : null;
    const payload = {
      type,
      title: t,
      subjectId: subjectId || "",
      subjectName: subj?.name || "",
      color: subj?.color || "#2563eb",
      dateKey,
      time: time || "",
      location: type === "exam" ? location.trim() : "",
      memo: memo.trim(),
      status,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editing?.id) {
        await updateDoc(doc(db, "users", uid, "assessments", editing.id), payload);
      } else {
        await addDoc(collection(db, "users", uid, "assessments"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      close();
    } catch (e) {
      console.error("SAVE ASSESSMENT ERROR =", e);
      alert(`저장 실패: ${e?.code || ""} ${e?.message || e}`);
    }
  };

  const remove = async () => {
    if (!uid || !editing?.id) return;
    const ok = confirm("삭제할까요?");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "users", uid, "assessments", editing.id));
      close();
    } catch (e) {
      console.error("DELETE ASSESSMENT ERROR =", e);
      alert(`삭제 실패: ${e?.code || ""} ${e?.message || e}`);
    }
  };

  return (
    <div className="assess-panel">
      <div className="assess-head">
        <div className="assess-title">다가오는 시험·과제</div>
        <div className="assess-sub">{baseDateKey} ~ {rangeEndKey}</div>
      </div>

      <div className="assess-actions">
        <button className="btn" type="button" onClick={() => openNew("assignment")}>
          + 과제
        </button>
        <button className="btn" type="button" onClick={() => openNew("exam")}>
          + 시험
        </button>
      </div>

      <div className="assess-filters">
        <button className={`chip ${filter === "all" ? "is-active" : ""}`} onClick={() => setFilter("all")}>
          전체
        </button>
        <button className={`chip ${filter === "assignment" ? "is-active" : ""}`} onClick={() => setFilter("assignment")}>
          과제
        </button>
        <button className={`chip ${filter === "exam" ? "is-active" : ""}`} onClick={() => setFilter("exam")}>
          시험
        </button>
        <button className={`chip ${filter === "pending" ? "is-active" : ""}`} onClick={() => setFilter("pending")}>
          미완료
        </button>
      </div>

      <div className="assess-list">
        {filtered.length === 0 ? (
          <div className="assess-empty">다가오는 항목이 없어요.</div>
        ) : (
          filtered.map((it) => {
            const d = it.dateKey ? parseISO(it.dateKey) : null;
            const dd = d && !isNaN(d.getTime()) ? differenceInCalendarDays(d, new Date(parseISO(baseDateKey))) : null;
            const dLabel = dd === 0 ? "D-day" : dd != null ? `D-${dd}` : "";

            const badge = it.type === "exam" ? "EXAM" : "ASG";
            const subjName = it.subjectName || (it.subjectId ? subjectMap.get(it.subjectId)?.name : "") || "";

            return (
              <button
                key={it.id}
                type="button"
                className="assess-item"
                onClick={() => openEdit(it)}
              >
                <span className="assess-strip" style={{ background: it.color || "#2563eb" }} />
                <div className="assess-main">
                  <div className="assess-row1">
                    <span className="assess-dday">{dLabel}</span>
                    <span className={`assess-badge ${badge === "EXAM" ? "is-exam" : "is-asg"}`}>
                      {badge}
                    </span>
                    <span className="assess-name">{clampText(it.title, 34)}</span>
                  </div>
                  <div className="assess-row2">
                    <span className="assess-meta">{it.dateKey}{it.time ? ` · ${it.time}` : ""}</span>
                    {subjName ? <span className="assess-meta"> · {subjName}</span> : null}
                    {it.location ? <span className="assess-meta"> · {clampText(it.location, 18)}</span> : null}
                  </div>
                </div>
                <span className="assess-arrow">›</span>
              </button>
            );
          })
        )}
      </div>

      {/* 모달 */}
      {open && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{editing ? "수정" : "추가"} · {type === "exam" ? "시험" : "과제"}</div>

            <label className="modal-label">제목</label>
            <input
              className="modal-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === "exam" ? "예: 네트워크 중간고사" : "예: DB 과제 1"}
              autoFocus
            />

            <label className="modal-label">과목</label>
            <select
              className="modal-input"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">(선택 안함)</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <div className="modal-row">
              <div style={{ flex: 1 }}>
                <label className="modal-label">{type === "exam" ? "시험일" : "마감일"}</label>
                <input
                  className="modal-input"
                  type="date"
                  value={dateKey}
                  onChange={(e) => setDateKey(e.target.value)}
                />
              </div>

              <div style={{ width: 160 }}>
                <label className="modal-label">시간(선택)</label>
                <input
                  className="modal-input"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            {type === "exam" && (
              <>
                <label className="modal-label">장소(선택)</label>
                <input
                  className="modal-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="예: M503"
                />
              </>
            )}

            <label className="modal-label">상태</label>
            <select
              className="modal-input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {(STATUS_OPTIONS[type] || []).map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>

            <label className="modal-label">메모(선택)</label>
            <input
              className="modal-input"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 1~6장 / ERD 포함"
            />

            <div className="modal-actions" style={{ justifyContent: "space-between" }}>
              <button className="btn" type="button" onClick={editing ? remove : close}>
                {editing ? "삭제" : "취소"}
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" type="button" onClick={close}>
                  닫기
                </button>
                <button className="btn primary" type="button" onClick={save}>
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
