import React from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage({ user, onLogout }) {
  const nav = useNavigate();

  const goPlanner = () => nav("/planner");
  const goSubjects = () => nav("/subjects");

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

            <button className="btn" onClick={onLogout}>
                로그아웃
            </button>
        </div>
        </header>

      <div className="home-wrap">
        <div className="home-square">
          <div className="home-inner">
            <h2 className="home-title">원하는 페이지를 선택하세요.</h2>
            <p className="home-sub">
              플래너(캘린더/투두) 또는 과목관리(수업/시험/과제) 중 선택하세요.
            </p>

            <div className="home-cards">
              <button
                type="button"
                className="home-card card"
                onClick={goPlanner}
              >
                <div className="home-card-head">
                  <h3 className="home-card-title">🗓️ 플래너</h3>
                </div>

                <p className="home-card-desc">주간 일정과 날짜별 투두 관리</p>

                <div className="home-card-cta" aria-hidden="true">
                  들어가기
                </div>
              </button>

              {/* 과목관리 카드 전체 클릭 */}
              <button
                type="button"
                className="home-card card"
                onClick={goSubjects}
              >
                <div className="home-card-head">
                  <h3 className="home-card-title">📚 과목 관리</h3>
                </div>

                <p className="home-card-desc">
                  과목/시험/과제 정리
                </p>

                <div className="home-card-cta" aria-hidden="true">
                  들어가기
                </div>
              </button>
            </div>
            {/* home-cards */}
          </div>
          {/* home-inner */}
        </div>
        {/* home-square */}
      </div>
      {/* home-wrap */}
    </div>
  );
}

