import React from "react";

export default function TodoList({ items = [], onToggle, onDelete }) {
  if (!items.length) {
    return <div className="todo-empty">아직 할 일이 없어요 🙂</div>;
  }

  return (
    <div className="todo-list">
      {items.map((t) => (
        <div className={`todo-item ${t.done ? "done" : ""}`} key={t.id}>
          <label className="todo-left">
            <input
              type="checkbox"
              checked={!!t.done}
              onChange={() => onToggle(t.id)}
            />
            {/* text 필드를 보여줘야 함 */}
            <span className="todo-text">{t.text}</span>
          </label>

          <button className="todo-del-btn" onClick={() => onDelete(t.id)}>
            삭제
          </button>
        </div>
      ))}
    </div>
  );
}
