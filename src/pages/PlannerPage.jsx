import React, { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { startOfWeek, addDays, addMonths, addYears, format, parseISO, isAfter } from "date-fns";

import CalendarPanel from "../components/CalendarPanel.jsx";
import WeeklyGrid from "../components/WeeklyGrid.jsx";
import DailyTodoPanel from "../components/DailyTodoPanel.jsx";
import AssessmentsPanel from "../components/AssessmentsPanel.jsx";
import SearchPanel from "../components/SearchPanel.jsx";

import { useTheme } from "../ThemeContext.jsx";

import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

export default function PlannerPage({ user, onLogout }) {
  const nav = useNavigate();
  const uid = user?.uid;

  const { isDark, toggleTheme } = useTheme();

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

  // ===== 주간 투두(검색용) =====
  const [weekTodos, setWeekTodos] = useState([]);

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

  // ✅ 이번 주 범위 투두(검색용)
  useEffect(() => {
    if (!uid) {
      setWeekTodos([]);
      return;
    }

    const colRef = collection(db, "users", uid, "todos");
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
          const at = a.createdAt?.seconds ?? 0;
          const bt = b.createdAt?.seconds ?? 0;
          return bt - at;
        });
        setWeekTodos(list);
      },
      (err) => console.error("TODOS SNAPSHOT ERROR =", err)
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

  // ✅ 검색 결과 클릭 시 해당 날짜로 이동
  const handlePickEventFromSearch = (ev) => {
    if (!ev?.dateKey) return;
    try {
      const d = parseISO(String(ev.dateKey));
      if (!isNaN(d.getTime())) {
        setSelectedDate(d);
        setRightMode("week");
      }
    } catch {}
  };

  const handlePickTodoFromSearch = (td) => {
    if (!td?.dateKey) return;
    try {
      const d = parseISO(String(td.dateKey));
      if (!isNaN(d.getTime())) {
        setSelectedDate(d);
        setRightMode("todo");
        setLeftTab("todo");
      }
    } catch {}
  };

  // ✅ 일정 추가 + 반복(미리 생성)
  const handleAddEvent = async ({
    dateKey,
    startHour,
    title,
    duration,
    color,
    repeat = "none",
    repeatUntil = "",
  }) => {
    if (!uid) return alert("로그인이 필요합니다.");

    try {
      const colRef = collection(db, "users", uid, "events");
      const seriesId =
        repeat === "none" ? null : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const buildRepeatDates = (baseKey, rule, untilKey) => {
        if (!rule || rule === "none") return [baseKey];
        const base = parseISO(String(baseKey));
        if (isNaN(base.getTime())) return [baseKey];

        let untilDate = null;
        if (untilKey) {
          const u = parseISO(String(untilKey));
          if (!isNaN(u.getTime())) untilDate = u;
        }

        if (!untilDate) {
          if (rule === "weekly") untilDate = addMonths(base, 3);
          else if (rule === "monthly") untilDate = addMonths(base, 6);
          else if (rule === "yearly") untilDate = addYears(base, 2);
        }

        const keys = [];
        let cur = base;
        while (!isAfter(cur, untilDate)) {
          keys.push(format(cur, "yyyy-MM-dd"));
          if (rule === "weekly") cur = addDays(cur, 7);
          else if (rule === "monthly") cur = addMonths(cur, 1);
          else if (rule === "yearly") cur = addYears(cur, 1);
          else break;
          if (keys.length > 120) break;
        }
        return keys.length ? keys : [baseKey];
      };

      const dateKeys = buildRepeatDates(dateKey, repeat, repeatUntil);

      for (let i = 0; i < dateKeys.length; i++) {
        await addDoc(colRef, {
          title,
          dateKey: dateKeys[i],
          startHour,
          duration,
          color,
          seriesId,
          repeat,
          repeatIndex: i,
          repeatUntil: repeatUntil || "",
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error("ADD EVENT ERROR =", e);
      alert(`일정 추가 실패: ${e?.code || ""} ${e?.message || e}`);
    }
  };

  // ✅ 이동/시간조절(업데이트)
  const handleUpdateEvent = async (eventId, patch) => {
    if (!uid) return;
    if (!eventId) return;

    try {
      await updateDoc(doc(db, "users", uid, "events", eventId), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("UPDATE EVENT ERROR =", e);
      alert(`일정 수정 실패: ${e?.code || ""} ${e?.message || e}`);
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

  // ✅ 이번 주 일정 복사
  const handleCopyWeek = async ({ offsetWeeks = 1 } = {}) => {
    if (!uid) return alert("로그인이 필요합니다.");
    const offset = Math.max(1, Math.min(8, Number(offsetWeeks || 1)));
    const ok = confirm(`이번 주 일정을 ${offset}주 뒤로 복사할까요?`);
    if (!ok) return;

    try {
      const colRef = collection(db, "users", uid, "events");

      for (const ev of events) {
        const base = parseISO(String(ev.dateKey));
        const copied = addDays(base, 7 * offset);

        await addDoc(colRef, {
          title: ev.title,
          dateKey: format(copied, "yyyy-MM-dd"),
          startHour: Number(ev.startHour || 0),
          duration: Number(ev.duration || 1),
          color: ev.color || "#2563eb",
          copiedFrom: ev.id,
          createdAt: serverTimestamp(),
        });
      }

      alert("복사 완료!");
    } catch (e) {
      console.error("COPY WEEK ERROR =", e);
      alert(`복사 실패: ${e?.code || ""} ${e?.message || e}`);
    }
  };

  return (
    <div className="page main-page">
      <header className="topbar">
        <div className="brand" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>
          Todo Planner
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={toggleTheme} title="다크/라이트 전환">
            {isDark ? "라이트" : "다크"}
          </button>
          <button className="btn" onClick={() => nav("/subjects")}>
            과목 관리
          </button>
          <button className="btn" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <div className="main-layout">
        <aside className="left-panel">
          <SearchPanel
            events={events}
            todos={weekTodos}
            onPickEvent={handlePickEventFromSearch}
            onPickTodo={handlePickTodoFromSearch}
          />

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
              onUpdateEvent={handleUpdateEvent}
              onDeleteEvent={handleDeleteEvent}
              onCopyWeek={handleCopyWeek}
              onPrevWeek={goPrevWeek}
              onNextWeek={goNextWeek}
            />
          ) : (
            <DailyTodoPanel uid={uid} selectedDate={selectedDate} onBack={() => setRightMode("week")} />
          )}
        </section>
      </div>
    </div>
  );
}