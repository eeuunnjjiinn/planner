import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

import { db } from "../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

export default function SubjectsPage({ user, onLogout }) {
  const nav = useNavigate();
  const uid = user?.uid;

  // ===== 과목 목록 =====
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    if (!uid) return;

    const colRef = collection(db, "users", uid, "subjects");
    const q = query(colRef, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSubjects(list);
    });

    return () => unsub();
  }, [uid]);

  // ===== 과목 추가 폼 =====
  const [subName, setSubName] = useState("");
  const [professor, setProfessor] = useState("");
  const [place, setPlace] = useState("");
  const [timeLocal, setTimeLocal] = useState(""); // datetime-local

  const addSubject = async () => {
    if (!uid) return alert("로그인이 필요합니다.");
    const name = subName.trim();
    if (!name) return alert("과목명을 입력해 주세요.");

    try {
      const colRef = collection(db, "users", uid, "subjects");
      await addDoc(colRef, {
        name,
        professor: professor.trim(),
        place: place.trim(),
        time: timeLocal ? new Date(timeLocal) : null, // Firestore가 Timestamp로 저장
        createdAt: serverTimestamp(),
      });

      setSubName("");
      setProfessor("");
      setPlace("");
      setTimeLocal("");
    } catch (e) {
      console.error(e);
      alert(`과목 추가 실패: ${e?.message || e}`);
    }
  };

  const deleteSubject = async (id) => {
    if (!uid) return;
    const ok = confirm("이 과목을 삭제할까요?");
    if (!ok) return;
    await deleteDoc(doc(db, "users", uid, "subjects", id));
  };

  // ===== 시험/과제 =====
  const [items, setItems] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  useEffect(() => {
    if (!uid) return;

    const colRef = collection(db, "users", uid, "assessments");
    const q = query(colRef, orderBy("date", "asc"));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(list);
    });

    return () => unsub();
  }, [uid]);

  const filteredItems = useMemo(() => {
    if (!selectedSubjectId) return items;
    return items.filter((x) => x.subjectId === selectedSubjectId);
  }, [items, selectedSubjectId]);

  const [type, setType] = useState("시험");
  const [title, setTitle] = useState("");
  const [dateLocal, setDateLocal] = useState("");
  const [memo, setMemo] = useState("");

  const addItem = async () => {
    if (!uid) return alert("로그인이 필요합니다.");
    if (!selectedSubjectId) return alert("과목을 선택해 주세요.");
    const t = title.trim();
    if (!t) return alert("제목을 입력해 주세요.");
    if (!dateLocal) return alert("날짜/시간을 선택해 주세요.");

    try {
      await addDoc(collection(db, "users", uid, "assessments"), {
        subjectId: selectedSubjectId,
        type: type.trim(), // "시험" | "과제" 등
        title: t,
        date: new Date(dateLocal),
        memo: memo.trim(),
        createdAt: serverTimestamp(),
      });

      setTitle("");
      setDateLocal("");
      setMemo("");
    } catch (e) {
      console.error(e);
      alert(`추가 실패: ${e?.message || e}`);
    }
  };

  const deleteItem = async (id) => {
    if (!uid) return;
    const ok = confirm("삭제할까요?");
    if (!ok) return;
    await deleteDoc(doc(db, "users", uid, "assessments", id));
  };

  const subjectNameById = useMemo(() => {
    const map = new Map(subjects.map((s) => [s.id, s.name]));
    return (id) => map.get(id) || "(삭제된 과목)";
  }, [subjects]);

  return (
    <div className="page main-page">
      <header className="topbar">
        <div className="brand" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>
          Todo Planner
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => nav("/planner")}>플래너</button>
          <button className="btn" onClick={onLogout}>로그아웃</button>
        </div>
      </header>

      <div style={{ padding: 24, display: "grid", gap: 20, maxWidth: 1100, margin: "0 auto" }}>
        {/* 과목 */}
        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>📚 과목</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div className="label">과목명</div>
              <input className="input" value={subName} onChange={(e) => setSubName(e.target.value)} />
            </div>
            <div>
              <div className="label">교수</div>
              <input className="input" value={professor} onChange={(e) => setProfessor(e.target.value)} />
            </div>
            <div>
              <div className="label">강의실</div>
              <input className="input" value={place} onChange={(e) => setPlace(e.target.value)} />
            </div>
            <div>
              <div className="label">시간(선택)</div>
              <input className="input" type="datetime-local" value={timeLocal} onChange={(e) => setTimeLocal(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={addSubject}>과목 추가</button>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {subjects.length === 0 ? (
              <div style={{ color: "#6b7280" }}>아직 과목이 없어요.</div>
            ) : (
              subjects.map((s) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{s.name}</div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      {s.professor ? `교수: ${s.professor} · ` : ""}
                      {s.place ? `장소: ${s.place} · ` : ""}
                      {s.time?.toDate
                        ? `시간: ${format(s.time.toDate(), "yyyy-MM-dd HH:mm")}`
                        : ""}
                    </div>
                  </div>
                  <button className="btn" onClick={() => deleteSubject(s.id)}>삭제</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 시험/과제 */}
        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>📝 시험/과제</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <div className="label">과목 선택</div>
              <select className="input" value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}>
                <option value="">(선택)</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="label">유형</div>
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="시험">시험</option>
                <option value="과제">과제</option>
                <option value="퀴즈">퀴즈</option>
                <option value="발표">발표</option>
              </select>
            </div>

            <div>
              <div className="label">날짜/시간</div>
              <input className="input" type="datetime-local" value={dateLocal} onChange={(e) => setDateLocal(e.target.value)} />
            </div>

            <div style={{ gridColumn: "1 / span 2" }}>
              <div className="label">제목</div>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 데이터베이스 중간고사" />
            </div>

            <div>
              <div className="label">메모</div>
              <input className="input" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="특이사항" />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={addItem}>추가</button>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {filteredItems.length === 0 ? (
              <div style={{ color: "#6b7280" }}>등록된 시험/과제가 없어요.</div>
            ) : (
              filteredItems.map((it) => (
                <div key={it.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>
                      [{it.type}] {it.title}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      과목: {subjectNameById(it.subjectId)} ·{" "}
                      {it.date?.toDate ? format(it.date.toDate(), "yyyy-MM-dd HH:mm") : ""}
                      {it.memo ? ` · 메모: ${it.memo}` : ""}
                    </div>
                  </div>
                  <button className="btn" onClick={() => deleteItem(it.id)}>삭제</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
