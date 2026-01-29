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
} from "firebase/firestore";
import { db } from "../firebase";

const DAYS = ["월", "화", "수", "목", "금"];
const DAY_VALUE = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5 };

// 시간표 범위 (원하면 조절)
const START_HOUR = 8;
const END_HOUR = 20;

function timeToMin(t) {
  // "09:30" -> 570
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
  const [isAddOpen, setIsAddOpen] = useState(false);

  // add form
  const [name, setName] = useState("");
  const [professor, setProfessor] = useState("");
  const [place, setPlace] = useState("");
  const [dayKorean, setDayKorean] = useState("월");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:15");

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
    // day(1~5), startTime, endTime 있는 것만 시간표에 표시
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

  async function addSubject(e) {
    e.preventDefault();
    if (!uid) return;
    if (!name.trim()) return;

    const day = DAY_VALUE[dayKorean];
    if (!day) return;

    // 간단한 검증: endTime > startTime
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

  async function removeSubject(subjectId) {
    if (!uid) return;
    await deleteDoc(doc(db, "users", uid, "subjects", subjectId));
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
        <div className="brand" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>
          Todo Planner
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{user?.email}</div>
          <button className="btn" onClick={() => nav("/planner")}>
            캘린더
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
              에타처럼 주간 시간표에 과목을 배치해요. (시험/과제 표시는 다음 단계)
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn primary" onClick={() => setIsAddOpen(true)}>
              + 과목 추가
            </button>
          </div>
        </div>

        {/* 시간표 */}
        <div className="timetable card">
          <div className="timetable-grid">
            {/* 좌측 시간 라벨 */}
            <div className="tt-time-col">
              <div className="tt-head tt-cell" />
              {timeRows.map((h) => (
                <div key={h} className="tt-time tt-cell">
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* 요일 컬럼 */}
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
                    {/* 배경 라인(시간줄) */}
                    {timeRows.map((h) => (
                      <div key={`${d}-${h}`} className="tt-slot" />
                    ))}

                    {/* 과목 블록 */}
                    {blocks
                      .filter((b) => b.day === idx + 1) // 월=1
                      .map((b) => (
                        <div
                          key={b.id}
                          className="tt-block"
                          style={{ top: `${b.top}%`, height: `${b.height}%` }}
                          title={`${b.name} / ${b.place || ""}`}
                        >
                          <div className="tt-block-title">{b.name}</div>
                          <div className="tt-block-sub">
                            {b.place ? `${b.place} · ` : ""}
                            {b.startTime}~{b.endTime}
                          </div>

                          <button
                            className="tt-block-del"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("이 과목을 삭제할까요?")) removeSubject(b.id);
                            }}
                          >
                            삭제
                          </button>
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
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
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
    </div>
  );
}
