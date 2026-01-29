import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

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

export default function DailyTodoPanel({ uid, selectedDate, onBack }) {
  const dateKey = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);

  const [input, setInput] = useState("");
  const [todos, setTodos] = useState([]);

  // ✅ (1) 해당 유저 + 해당 날짜 투두 실시간 불러오기
  useEffect(() => {
    if (!uid) {
      setTodos([]);
      return;
    }

    const colRef = collection(db, "users", uid, "todos");
    const q = query(colRef, where("dateKey", "==", dateKey));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // 최신순 정렬(서버타임스탬프 null 이슈 회피용으로 프론트에서 정렬)
        list.sort((a, b) => {
          const at = a.createdAt?.seconds ?? 0;
          const bt = b.createdAt?.seconds ?? 0;
          return bt - at;
        });
        setTodos(list);
      },
      (err) => {
        console.error("SNAPSHOT ERROR =", err);
      }
    );

    return () => unsubscribe();
  }, [uid, dateKey]);

  // ✅ (2) 추가
  const addTodo = async () => {
    const text = input.trim();
    if (!uid) return alert("로그인이 필요합니다.");
    if (!text) return;

    try {
      const colRef = collection(db, "users", uid, "todos");
      await addDoc(colRef, {
        dateKey,
        text,
        done: false,
        createdAt: serverTimestamp(),
      });
      setInput("");
    } catch (e) {
      console.error("ADD TODO ERROR =", e);
      alert(`추가 실패: ${e?.code || ""} ${e?.message || e}`);
    }
  };

  // ✅ (3) 완료 토글
  const toggleTodo = async (todo) => {
    if (!uid) return alert("로그인이 필요합니다.");
    try {
      const ref = doc(db, "users", uid, "todos", todo.id);
      await updateDoc(ref, { done: !todo.done });
    } catch (e) {
      console.error("TOGGLE ERROR =", e);
      alert(`변경 실패: ${e?.code || ""} ${e?.message || e}`);
    }
  };

  // ✅ (4) 삭제
  const removeTodo = async (todoId) => {
    if (!uid) return alert("로그인이 필요합니다.");
    try {
      const ref = doc(db, "users", uid, "todos", todoId);
      await deleteDoc(ref);
    } catch (e) {
      console.error("DELETE ERROR =", e);
      alert(`삭제 실패: ${e?.code || ""} ${e?.message || e}`);
    }
  };

  const onEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTodo();
    }
  };

  return (
    <div className="todo-panel">
      <div className="todo-header">
        <button className="btn" onClick={onBack}>
          ← 주간 보기
        </button>
        <div className="todo-title">
          {format(selectedDate, "yyyy년 M월 d일")} 투두리스트
        </div>
      </div>

      <div className="todo-input">
        <input
          className="todo-text-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onEnter}
          placeholder="할 일을 입력하세요"
        />
        <button className="todo-add-btn" onClick={addTodo}>
          추가
        </button>
      </div>

      <div className="todo-list">
        {todos.length === 0 ? (
          <div className="todo-empty">할 일이 없습니다.</div>
        ) : (
          todos.map((todo) => (
            <div key={todo.id} className={`todo-item ${todo.done ? "done" : ""}`}>
              <div className="todo-left">
                <input
                  type="checkbox"
                  checked={!!todo.done}
                  onChange={() => toggleTodo(todo)}
                />
                <span className="todo-text">{todo.text}</span>
              </div>
              <button className="todo-del-btn" onClick={() => removeTodo(todo.id)}>
                삭제
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
