import React, { useMemo, useEffect, useState } from "react";
import { startOfWeek, addDays, format } from "date-fns";

import CalendarPanel from "../components/CalendarPanel.jsx";
import WeeklyGrid from "../components/WeeklyGrid.jsx";
import DailyTodoPanel from "../components/DailyTodoPanel.jsx";

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

export default function MainPage({ user, onLogout }) {
  const uid = user?.uid;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [rightMode, setRightMode] = useState("week"); // "week" | "todo"

  // ✅ 일요일부터 시작하는 주간 7일
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const weekStartKey = useMemo(
    () => format(weekDays[0], "yyyy-MM-dd"),
    [weekDays]
  );
  const weekEndKey = useMemo(
    () => format(weekDays[6], "yyyy-MM-dd"),
    [weekDays]
  );

  // ====== ✅ 주간 events (Firestore) ======
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!uid) return;

    const colRef = collection(db, "users", uid, "events");

    // ✅ yyyy-MM-dd 문자열은 사전순이 날짜순이라 범위 조회 가능
    const q = query(
      colRef,
      where("dateKey", ">=", weekStartKey),
      where("dateKey", "<=", weekEndKey)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // 보기 좋게 정렬(프론트 정렬)
        list.sort((a, b) => {
          if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
          return (a.startHour ?? 0) - (b.startHour ?? 0);
        });

        setEvents(list);
      },
      (err) => {
        console.error("EVENTS SNAPSHOT ERROR =", err);
      }
    );

    return () => unsub();
  }, [uid, weekStartKey, weekEndKey]);

  // 캘린더 날짜 클릭 → 투두 모드로 전환
  const handleChangeDate = (date) => {
    setSelectedDate(date);
    setRightMode("todo");
  };

  // ✅ 주간 이동(이전/다음)
  const goPrevWeek = () => {
    setSelectedDate((prev) => addDays(prev, -7));
    setRightMode("week");
  };

  const goNextWeek = () => {
    setSelectedDate((prev) => addDays(prev, 7));
    setRightMode("week");
  };

  // ✅ 일정 추가 (WeeklyGrid 모달에서 받은 값 그대로 저장)
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

  // ✅ 일정 삭제
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
        <div className="brand">Todo Planner</div>
        <button className="btn" onClick={onLogout}>
          로그아웃
        </button>
      </header>

      <div className="main-layout">
        <aside className="left-panel">
          <CalendarPanel selectedDate={selectedDate} onChangeDate={handleChangeDate} />
          <p className="hint">날짜를 클릭하면 오른쪽이 투두리스트로 전환돼요.</p>
        </aside>

        <section className="right-panel">
          {rightMode === "week" ? (
            <WeeklyGrid
              weekDays={weekDays}
              events={events}
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
