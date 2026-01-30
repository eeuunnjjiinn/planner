import React, { useMemo, useEffect, useState } from "react";
import { startOfWeek, addDays, format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";

import CalendarPanel from "../components/CalendarPanel.jsx";
import WeeklyGrid from "../components/WeeklyGrid.jsx";
import DailyTodoPanel from "../components/DailyTodoPanel.jsx";
import AssessmentsPanel from "../components/AssessmentsPanel.jsx";

import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

export default function PlannerPage({ user, onLogout }) {
  const nav = useNavigate();
  const uid = user?.uid;

  const [selectedDate, setSelectedDate] = useState(new Date());

  // 오른쪽: 주간 보기 / 일일 투두
  const [rightMode, setRightMode] = useState("week"); // "week" | "todo"

  // 왼쪽: 탭
  const [leftTab, setLeftTab] = useState("todo"); // "todo" | "assess"

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const weekStartKey = useMemo(() => format(weekDays[0], "yyyy-MM-dd"), [weekDays]);
  const weekEndKey = useMemo(() => format(weekDays[6], "yyyy-MM-dd"), [weekDays]);

  // ===== 주간 일정 =====
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!uid) {
      setEvents([]);
      return;
    }

    const colRef = collection(db, "users", uid, "events");
    const q = query(
      colRef,
      where("dateKey", ">=", weekStartKey),
      where("dateKey", "<=", weekEndKey)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          if (a.dateKey !== b.dateKey) return String(a.dateKey).localeCompare(String(b.dateKey));
          return (a.startHour ?? 0) - (b.startHour ?? 0);
        });
        setEvents(list);
      },
      (err) => console.error("EVENTS SNAPSHOT ERROR =", err)
    );

    return () => unsub();
  }, [uid, weekStartKey, weekEndKey]);

  // ===== 과목 목록(시험/과제에서 과목 연결 + 색상 자동 적용) =====
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    if (!uid) {
      setSubjects([]);
      return;
    }

    const colRef = collection(db, "users", uid, "subjects");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const at = a.createdAt?.seconds ?? 0;
          const bt = b.createdAt?.seconds ?? 0;
          if (bt !== at) return bt - at;
          return String(a.name || "").localeCompare(String(b.name || ""));
        });
        setSubjects(list);
      },
      (err) => console.error("SUBJECTS SNAPSHOT ERROR =", err)
    );

    return () => unsub();
  }, [uid]);

  // ===== 주간 범위 내 시험/과제(WeeklyGrid 헤더 배지 표시용) =====
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    if (!uid) {
      setAssessments([]);
      return;
    }

    const colRef = collection(db, "users", uid, "assessments");
    const q = query(
      colRef,
      where("dateKey", ">=", weekStartKey),
      where("dateKey", "<=", weekEndKey)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          if (a.dateKey !== b.dateKey) return String(a.dateKey).localeCompare(String(b.dateKey));
          return String(a.time || "").localeCompare(String(b.time || ""));
        });
        setAssessments(list);
      },
      (err) => console.error("ASSESSMENTS SNAPSHOT ERROR =", err)
    );

    return () => unsub();
  }, [uid, weekStartKey, weekEndKey]);

  // ===== 핸들러 =====
  const handleChangeDate = (date) => {
    setSelectedDate(date);
    setRightMode("todo");
    setLeftTab("todo");
  };

  const goPrevWeek = () => {
    setSelectedDate((prev) => addDays(prev, -7));
    setRightMode("week");
  };

  const goNextWeek = () => {
    setSelectedDate((prev) => addDays(prev, 7));
    setRightMode("week");
  };

  const handleSelectAssessmentDate = (dateKey) => {
    if (!dateKey) return;
    try {
      const d = parseISO(String(dateKey));
      if (!isNaN(d.getTime())) {
        setSelectedDate(d);
        setLeftTab("assess");
      }
    } catch {
      // ignore
    }
  };

  const handleAddEvent = async ({ dateKey, startHour, title, duration, color }) => {
    if (!uid) return alert("로그인이 필요합니다.");

    try {
      await addDoc(collection(db, "users", uid, "events"), {
        title,
        dateKey,
        startHour,
        duration,
        color,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("ADD EVENT ERROR =", e);
      alert(`일정 추가 실패: ${e?.code || ""} ${e?.message || e}`);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!uid) return;

    const ok = confirm("이 일정을 삭제할까요?");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "users", uid, "events", eventId));
    } catch (e) {
      console.error("DELETE EVENT ERROR =", e);
      alert(`일정 삭제 실패: ${e?.code || ""} ${e?.message || e}`);
    }
  };

  return (
    <div className="page main-page">
      <header className="topbar">
        <div className="brand" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>
          Todo Planner
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => nav("/subjects")}>과목 관리</button>
          <button className="btn" onClick={onLogout}>로그아웃</button>
        </div>
      </header>

      <div className="main-layout">
        <aside className="left-panel">
          <CalendarPanel selectedDate={selectedDate} onChangeDate={handleChangeDate} />

          <div className="lp-tabs" style={{ marginTop: 14 }}>
            <button
              className={`lp-tab ${leftTab === "todo" ? "is-active" : ""}`}
              type="button"
              onClick={() => setLeftTab("todo")}
            >
              할 일
            </button>
            <button
              className={`lp-tab ${leftTab === "assess" ? "is-active" : ""}`}
              type="button"
              onClick={() => setLeftTab("assess")}
            >
              시험/과제
            </button>
          </div>

          {leftTab === "todo" ? (
            <p className="hint" style={{ marginTop: 12 }}>
              날짜를 클릭하면 오른쪽이 투두리스트로 전환돼요.
            </p>
          ) : (
            <AssessmentsPanel uid={uid} selectedDate={selectedDate} subjects={subjects} />
          )}
        </aside>

        <section className="right-panel">
          {rightMode === "week" ? (
            <WeeklyGrid
              weekDays={weekDays}
              events={events}
              assessments={assessments}
              onSelectAssessmentDate={handleSelectAssessmentDate}
              onAddEvent={handleAddEvent}
              onDeleteEvent={handleDeleteEvent}
              onPrevWeek={goPrevWeek}
              onNextWeek={goNextWeek}
            />
          ) : (
            <DailyTodoPanel
              uid={uid}
              selectedDate={selectedDate}
              onBack={() => setRightMode("week")}
            />
          )}
        </section>
      </div>
    </div>
  );
}