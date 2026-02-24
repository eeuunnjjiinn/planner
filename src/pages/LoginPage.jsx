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

  // 비밀번호 찾기 모달 상태
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);

  // 로그인
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !pw) {
      alert("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, pw);
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

  // 비밀번호 찾기 열기
  const openResetModal = () => {
    // 로그인 입력창에 이메일이 이미 있으면 그걸 기본값으로 넣어줌
    setResetEmail((email || "").trim());
    setIsResetOpen(true);
  };

  const closeResetModal = () => {
    if (resetSending) return; // 전송 중엔 닫기 방지(원하면 빼도 됨)
    setIsResetOpen(false);
  };

  // 비밀번호 재설정 메일 전송
  const handleSendReset = async () => {
    const targetEmail = (resetEmail || "").trim();

    if (!targetEmail) {
      alert("이메일을 입력해 주세요.");
      return;
    }

    try {
      setResetSending(true);
      await sendPasswordResetEmail(auth, targetEmail);
      alert("비밀번호 재설정 메일을 보냈어요! (스팸함도 확인해 주세요)");
      setIsResetOpen(false);
    } catch (error) {
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
    } finally {
      setResetSending(false);
    }
  };

  // 모달에서 Enter 누르면 전송
  const onResetKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendReset();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeResetModal();
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

          <button className="link" type="button" onClick={openResetModal}>
            비밀번호를 잊으셨나요?
          </button>
        </form>
      </div>

      {/* ✅ 비밀번호 찾기 모달 */}
      {isResetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeResetModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(420px, 100%)" }}
          >
            <h2 style={{ marginBottom: 8 }}>비밀번호 재설정</h2>
            <p style={{ marginTop: 0, marginBottom: 14, opacity: 0.8 }}>
              재설정 링크를 받을 이메일을 입력해 주세요.
            </p>

            <label className="label">이메일</label>
            <input
              className="input"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="example@email.com"
              autoComplete="email"
              onKeyDown={onResetKeyDown}
              disabled={resetSending}
              autoFocus
            />

            <div className="row" style={{ marginTop: 14 }}>
              <button
                className="btn primary"
                type="button"
                onClick={handleSendReset}
                disabled={resetSending}
              >
                {resetSending ? "전송 중..." : "재설정 메일 보내기"}
              </button>
              <button
                className="btn"
                type="button"
                onClick={closeResetModal}
                disabled={resetSending}
              >
                취소
              </button>
            </div>

            <p style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Esc로 닫기 / Enter로 전송
            </p>
          </div>
        </div>
      )}
    </div>
  );
}