import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./LoginPage.jsx";
import HomePage from "./HomePage.jsx";
import PlannerPage from "./PlannerPage.jsx";
import SubjectsPage from "./SubjectsPage.jsx";

// ✅ SharePage는 pages 폴더에 있으니 경로 수정
import SharePage from "./pages/SharePage.jsx";

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
      <Route
        path="/login"
        element={user ? <Navigate to="/home" replace /> : <LoginPage />}
      />

      <Route
        path="/"
        element={<Navigate to={user ? "/home" : "/login"} replace />}
      />

      <Route
        path="/home"
        element={
          <ProtectedRoute user={user}>
            <HomePage user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/planner"
        element={
          <ProtectedRoute user={user}>
            <PlannerPage user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/subjects"
        element={
          <ProtectedRoute user={user}>
            <SubjectsPage user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* ✅ 공유 시간표: 로그인 없이도 접근 가능 */}
      <Route path="/share/:shareId" element={<SharePage user={user} />} />

      <Route
        path="*"
        element={<Navigate to={user ? "/home" : "/login"} replace />}
      />
    </Routes>
  );
}