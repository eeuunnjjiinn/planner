import React from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage({ user, onLogout }) {
  const nav = useNavigate();

  return (
    <div className="page main-page">
      <header className="topbar">
        <div className="brand">Todo Planner</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{user?.email}</div>
          <button className="btn" onClick={onLogout}>로그아웃</button>
        </div>
      </header>

      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ margin: "12px 0 8px 0" }}>어디로 들어갈까요?</h2>
        <p style={{ marginTop: 0, color: "#6b7280" }}>
          플래너(캘린더/투두) 또는 과목관리(수업/시험/과제) 중 선택하세요.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: "0 0 8px 0" }}>📅 플래너</h3>
            <p style={{ margin: "0 0 14px 0", color: "#6b7280" }}>
              주간 일정 + 날짜별 투두
            </p>
            <button className="btn primary" onClick={() => nav("/planner")}>
              플래너로 이동
            </button>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: "0 0 8px 0" }}>📚 과목 관리</h3>
            <p style={{ margin: "0 0 14px 0", color: "#6b7280" }}>
              과목/강의실/교수 + 시험/과제 정리
            </p>
            <button className="btn primary" onClick={() => nav("/subjects")}>
              과목 관리로 이동
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
