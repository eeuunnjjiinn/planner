// TodoInput.jsx (수정)
import React, { useState } from "react";

export default function TodoInput({ onAdd }) {
  const [text, setText] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const v = text.trim();

    //입력 예외 처리
    if (!v) return;
    if (v.length < 2) return; // 너무 짧은 투두 방지 (선택)

    onAdd(v);
    setText("");
  };

  return (
    <form className="todo-input" onSubmit={submit}>
      <input
        className="todo-text-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="할 일을 입력하세요"
      />
      <button className="todo-add-btn" type="submit">
        추가
      </button>
    </form>
  );
}
