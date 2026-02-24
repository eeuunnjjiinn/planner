import React, { useState } from "react";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  // 로그인
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !pw) {
      alert("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, pw);
      // ✅ 성공 시 App.jsx의 onAuthStateChanged가 자동으로 화면 전환
    } catch (error) {
      alert("로그인 실패! 이메일 또는 비밀번호를 확인하세요.");
    }
  };

  // 회원가입
  const handleSignup = async () => {
    if (!email || !pw) {
      alert("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, pw);
      alert("회원가입 완료! 이제 로그인하세요.");
    } catch (error) {
      alert("회원가입 실패! 다시 시도하세요.");
    }
  };

  // ✅ 비밀번호 재설정(이메일로 링크 보내기)
  const handleResetPassword = async () => {
    const trimmedEmail = (email || "").trim();

    if (!trimmedEmail) {
      alert("비밀번호 재설정 링크를 받을 이메일을 먼저 입력해 주세요.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      alert(
        "비밀번호 재설정 메일을 보냈어요.\n메일함(스팸함 포함)을 확인해 주세요!"
      );
    } catch (error) {
      // Firebase Auth 에러코드들 일부 대응
      const code = error?.code || "";
      if (code === "auth/invalid-email") {
        alert("이메일 형식이 올바르지 않아요.");
      } else if (code === "auth/user-not-found") {
        alert("해당 이메일로 가입된 계정을 찾을 수 없어요.");
      } else if (code === "auth/too-many-requests") {
        alert("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.");
      } else {
        alert("비밀번호 재설정 메일 전송에 실패했어요. 다시 시도해 주세요.");
      }
    }
  };

  return (
    <div className="page login-page">
      <div className="card">
        <h1 className="title">Todo Planner</h1>
        <p className="subtitle">캘린더 기반 일정 및 투두 관리</p>

        <form onSubmit={handleLogin} className="form">
          <label className="label">이메일</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            autoComplete="email"
          />

          <label className="label">비밀번호</label>
          <input
            className="input"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <div className="row">
            <button className="btn primary" type="submit">
              로그인
            </button>
            <button className="btn" type="button" onClick={handleSignup}>
              회원가입
            </button>
          </div>

          <button className="link" type="button" onClick={handleResetPassword}>
            비밀번호를 잊으셨나요?
          </button>
        </form>
      </div>
    </div>
  );
}