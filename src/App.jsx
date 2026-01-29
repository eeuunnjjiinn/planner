import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import PlannerPage from "./pages/PlannerPage.jsx";
import SubjectsPage from "./pages/SubjectsPage.jsx";

import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  if (!authReady) return null;

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      alert("로그아웃에 실패했어요. 다시 시도해 주세요.");
      console.error(e);
    }
  };

  return (
    <Routes>
      {/* 로그인 페이지: 로그인 돼있으면 홈으로 보내기 */}
      <Route
        path="/login"
        element={user ? <Navigate to="/home" replace /> : <LoginPage />}
      />

      {/* 기본 진입 */}
      <Route path="/" element={<Navigate to={user ? "/home" : "/login"} replace />} />

      {/* 홈(선택 화면) */}
      <Route
        path="/home"
        element={
          <ProtectedRoute user={user}>
            <HomePage user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* 기존 캘린더/투두 플래너 */}
      <Route
        path="/planner"
        element={
          <ProtectedRoute user={user}>
            <PlannerPage user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* 과목 관리 */}
      <Route
        path="/subjects"
        element={
          <ProtectedRoute user={user}>
            <SubjectsPage user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* 없는 경로는 홈으로 */}
      <Route path="*" element={<Navigate to={user ? "/home" : "/login"} replace />} />
    </Routes>
  );
}
