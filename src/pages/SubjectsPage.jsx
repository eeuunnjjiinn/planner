import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const DAYS = ["월", "화", "수", "목", "금"];
const DAY_VALUE = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5 };
const DAY_LABEL = { 1: "월", 2: "화", 3: "수", 4: "목", 5: "금" };

const START_HOUR = 8;
const END_HOUR = 20;

function timeToMin(t) {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function SubjectsPage({ user, onLogout }) {
  const nav = useNavigate();
  const uid = user?.uid;

  const [subjects, setSubjects] = useState([]);

  // add modal
  const [isAddOpen, setIsAddOpen] = useState(false);

  // edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // add form
  const [name, setName] = useState("");
  const [professor, setProfessor] = useState("");
  const [place, setPlace] = useState("");
  const [dayKorean, setDayKorean] = useState("월");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:15");

  // edit form
  const [eName, setEName] = useState("");
  const [eProfessor, setEProfessor] = useState("");
  const [ePlace, setEPlace] = useState("");
  const [eDayKorean, setEDayKorean] = useState("월");
  const [eStartTime, setEStartTime] = useState("09:00");
  const [eEndTime, setEEndTime] = useState("10:15");

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "users", uid, "subjects"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSubjects(list);
    });

    return () => unsub();
  }, [uid]);

  const timeRows = useMemo(() => {
    const rows = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) rows.push(h);
    return rows;
  }, []);

  const blocks = useMemo(() => {
    return subjects
      .filter((s) => s.day && s.startTime && s.endTime)
      .map((s) => {
        const start = timeToMin(s.startTime);
        const end = timeToMin(s.endTime);
        const gridStart = START_HOUR * 60;
        const gridEnd = END_HOUR * 60;

        const top = ((start - gridStart) / (gridEnd - gridStart)) * 100;
        const height = ((end - start) / (gridEnd - gridStart)) * 100;

        return {
          ...s,
          top: clamp(top, 0, 100),
          height: clamp(height, 2, 100),
        };
      });
  }, [subjects]);

  function openEdit(subject) {
    setEditing(subject);
    setEName(subject?.name ?? "");
    setEProfessor(subject?.professor ?? "");
    setEPlace(subject?.place ?? "");
    setEDayKorean(DAY_LABEL[subject?.day] ?? "월");
    setEStartTime(subject?.startTime ?? "09:00");
    setEEndTime(subject?.endTime ?? "10:15");
    setIsEditOpen(true);
  }

  async function addSubject(e) {
    e.preventDefault();
    if (!uid) return;
    if (!name.trim()) return;

    const day = DAY_VALUE[dayKorean];
    if (!day) return;

    if (timeToMin(endTime) <= timeToMin(startTime)) {
      alert("끝나는 시간이 시작 시간보다 늦어야 해요.");
      return;
    }

    await addDoc(collection(db, "users", uid, "subjects"), {
      name: name.trim(),
      professor: professor.trim(),
      place: place.trim(),
      day,
      startTime,
      endTime,
      createdAt: serverTimestamp(),
    });

    setName("");
    setProfessor("");
    setPlace("");
    setDayKorean("월");
    setStartTime("09:00");
    setEndTime("10:15");
    setIsAddOpen(false);
  }

  async function updateSubject(e) {
    e.preventDefault();
    if (!uid || !editing?.id) return;

    const day = DAY_VALUE[eDayKorean];
    if (!day) return;

    if (!eName.trim()) {
      alert("과목명을 입력해 주세요.");
      return;
    }

    if (timeToMin(eEndTime) <= timeToMin(eStartTime)) {
      alert("끝나는 시간이 시작 시간보다 늦어야 해요.");
      return;
    }

    await updateDoc(doc(db, "users", uid, "subjects", editing.id), {
      name: eName.trim(),
      professor: eProfessor.trim(),
      place: ePlace.trim(),
      day,
      startTime: eStartTime,
      endTime: eEndTime,
    });

    setIsEditOpen(false);
    setEditing(null);
  }

  async function removeSubject() {
    if (!uid || !editing?.id) return;

    const ok = confirm(`"${editing.name}" 과목을 삭제할까요?`);
    if (!ok) return;

    await deleteDoc(doc(db, "users", uid, "subjects", editing.id));
    setIsEditOpen(false);
    setEditing(null);
  }

  if (!user) {
    return (
      <div className="page main-page" style={{ padding: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          로그인 후 이용해 주세요.
          <div style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={() => nav("/")}>
              홈으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page main-page">
      <header className="topbar">
        <div
          className="brand"
          style={{ cursor: "pointer" }}
          onClick={() => nav("/home")}
        >
          Todo Planner
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{user?.email}</div>
          <button className="btn" onClick={() => nav("/planner")}>
            플래너
          </button>
          <button className="btn" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <div className="subjects-wrap">
        <div className="subjects-header">
          <div>
            <div className="subjects-title">시간표</div>
            <div className="subjects-sub">
              과목 블록을 클릭하면 수정/삭제할 수 있어요.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn primary" onClick={() => setIsAddOpen(true)}>
              + 과목 추가
            </button>
          </div>
        </div>

        <div className="timetable card">
          <div className="timetable-grid">
            <div className="tt-time-col">
              <div className="tt-head tt-cell" />
              {timeRows.map((h) => (
                <div key={h} className="tt-time tt-cell">
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            <div className="tt-days">
              <div className="tt-head-row">
                {DAYS.map((d) => (
                  <div key={d} className="tt-head tt-cell">
                    {d}
                  </div>
                ))}
              </div>

              <div className="tt-body">
                {DAYS.map((d, idx) => (
                  <div key={d} className="tt-day-col">
                    {timeRows.map((h) => (
                      <div key={`${d}-${h}`} className="tt-slot" />
                    ))}

                    {blocks
                      .filter((b) => b.day === idx + 1)
                      .map((b) => (
                        <div
                          key={b.id}
                          className="tt-block"
                          style={{ top: `${b.top}%`, height: `${b.height}%` }}
                          title="클릭해서 수정/삭제"
                          role="button"
                          tabIndex={0}
                          onClick={() => openEdit(b)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") openEdit(b);
                          }}
                        >
                          <div className="tt-block-title">{b.name}</div>
                          <div className="tt-block-sub">
                            {b.place ? `${b.place} · ` : ""}
                            {b.startTime}~{b.endTime}
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 과목 추가 모달 */}
      {isAddOpen && (
        <div className="modal-overlay" onClick={() => setIsAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">과목 추가</div>
            <div className="modal-sub">요일/시간을 입력하면 시간표에 표시돼요.</div>

            <form onSubmit={addSubject}>
              <label className="modal-label">과목명</label>
              <input
                className="modal-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예) 데이터베이스"
              />

              <label className="modal-label">교수</label>
              <input
                className="modal-input"
                value={professor}
                onChange={(e) => setProfessor(e.target.value)}
                placeholder="예) 김수현"
              />

              <label className="modal-label">강의실</label>
              <input
                className="modal-input"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="예) M503"
              />

              <div className="modal-row" style={{ marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <label className="modal-label">요일</label>
                  <select
                    className="modal-input"
                    value={dayKorean}
                    onChange={(e) => setDayKorean(e.target.value)}
                  >
                    {DAYS.map((dd) => (
                      <option key={dd} value={dd}>
                        {dd}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label className="modal-label">시작</label>
                  <input
                    className="modal-input"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label className="modal-label">끝</label>
                  <input
                    className="modal-input"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setIsAddOpen(false)}>
                  취소
                </button>
                <button type="submit" className="btn primary">
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 수정/삭제 모달 */}
      {isEditOpen && (
        <div className="modal-overlay" onClick={() => setIsEditOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">과목 수정</div>
            <div className="modal-sub">수정하거나 삭제를 선택할 수 있어요.</div>

            <form onSubmit={updateSubject}>
              <label className="modal-label">과목명</label>
              <input
                className="modal-input"
                value={eName}
                onChange={(e) => setEName(e.target.value)}
              />

              <label className="modal-label">교수</label>
              <input
                className="modal-input"
                value={eProfessor}
                onChange={(e) => setEProfessor(e.target.value)}
              />

              <label className="modal-label">강의실</label>
              <input
                className="modal-input"
                value={ePlace}
                onChange={(e) => setEPlace(e.target.value)}
              />

              <div className="modal-row" style={{ marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <label className="modal-label">요일</label>
                  <select
                    className="modal-input"
                    value={eDayKorean}
                    onChange={(e) => setEDayKorean(e.target.value)}
                  >
                    {DAYS.map((dd) => (
                      <option key={dd} value={dd}>
                        {dd}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label className="modal-label">시작</label>
                  <input
                    className="modal-input"
                    type="time"
                    value={eStartTime}
                    onChange={(e) => setEStartTime(e.target.value)}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label className="modal-label">끝</label>
                  <input
                    className="modal-input"
                    type="time"
                    value={eEndTime}
                    onChange={(e) => setEEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ justifyContent: "space-between" }}>
                <button
                  type="button"
                  className="btn"
                  onClick={removeSubject}
                >
                  삭제
                </button>

                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" className="btn" onClick={() => setIsEditOpen(false)}>
                    닫기
                  </button>
                  <button type="submit" className="btn primary">
                    저장
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
