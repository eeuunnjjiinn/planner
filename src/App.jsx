import React, { useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage.jsx";
import MainPage from "./pages/MainPage.jsx";

import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  // 로그인 상태 확인 전(새로고침 직후) 깜빡임 방지
  if (!authReady) return null;

  // ✅ 로그아웃 처리(세션 종료)
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // user는 onAuthStateChanged가 자동으로 null로 바꿔서 LoginPage로 전환됨
    } catch (e) {
      alert("로그아웃에 실패했어요. 다시 시도해 주세요.");
      console.error(e);
    }
  };

  return user ? (
    <MainPage user={user} onLogout={handleLogout} />
  ) : (
    <LoginPage />
  );
}
