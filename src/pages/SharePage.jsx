import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const DAYS = ["월", "화", "수", "목", "금"];
const START_HOUR = 8;
const END_HOUR = 20;
const DEFAULT_SUBJECT_COLOR = "#2563eb";

function pad2(n) {
  return String(n).padStart(2, "0");
}
function timeToMin(t) {
  if (!t) return NaN;
  const [hh, mm] = String(t).split(":").map(Number);
  return hh * 60 + mm;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function SharePage({ user }) {
  const nav = useNavigate();
  const { shareId } = useParams();

  const [loading, setLoading] = useState(true);
  const [share, setShare] = useState(null);
  const [error, setError] = useState("");

  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        setLoading(true);
        setError("");
        setShare(null);

        const ref = doc(db, "publicShares", shareId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          throw new Error("공유 링크가 유효하지 않거나 삭제된 시간표예요.");
        }

        const data = snap.data();
        if (!alive) return;
        setShare({ id: snap.id, ...data });
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "공유 시간표를 불러오지 못했어요.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }
    if (shareId) run();
    return () => {
      alive = false;
    };
  }, [shareId]);

  const timeRows = useMemo(() => {
    const rows = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) rows.push(h);
    return rows;
  }, []);

  const blocks = useMemo(() => {
    const subjects = Array.isArray(share?.subjects) ? share.subjects : [];
    return subjects
      .filter((s) => s.day && s.startTime && s.endTime)
      .map((s, idx) => {
        const start = timeToMin(s.startTime);
        const end = timeToMin(s.endTime);
        const gridStart = START_HOUR * 60;
        const gridEnd = END_HOUR * 60;

        const top = ((start - gridStart) / (gridEnd - gridStart)) * 100;
        const height = ((end - start) / (gridEnd - gridStart)) * 100;

        return {
          key: `${idx}-${s.name}-${s.day}-${s.startTime}`,
          ...s,
          top: clamp(top, 0, 100),
          height: clamp(height, 2, 100),
        };
      });
  }, [share]);

  const handleImportToMySubjects = async () => {
    if (!user?.uid) {
      alert("내 시간표로 가져오려면 로그인해 주세요.");
      nav("/login");
      return;
    }

    const subjects = Array.isArray(share?.subjects) ? share.subjects : [];
    if (subjects.length === 0) {
      alert("가져올 과목이 없어요.");
      return;
    }

    const ok = confirm(
      `친구 시간표의 과목 ${subjects.length}개를 내 시간표에 추가할까요?\n(중복/겹침 검사는 하지 않아요)`
    );
    if (!ok) return;

    try {
      setImporting(true);
      const col = collection(db, "users", user.uid, "subjects");
      for (const s of subjects) {
        await addDoc(col, {
          name: String(s.name || "").trim(),
          professor: String(s.professor || "").trim(),
          place: String(s.place || "").trim(),
          day: Number(s.day),
          startTime: String(s.startTime || ""),
          endTime: String(s.endTime || ""),
          color: s.color || DEFAULT_SUBJECT_COLOR,
          createdAt: serverTimestamp(),
          importedFrom: shareId,
        });
      }
      alert("내 시간표로 가져오기 완료!");
      nav("/subjects");
    } catch (e) {
      console.error(e);
      alert("가져오기에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setImporting(false);
    }
  };

  const title = share?.title || "공유된 시간표";

  return (
    <div className="page main-page">
      <header className="topbar">
        <div className="brand" style={{ cursor: "pointer" }} onClick={() => nav("/")}>
          Todo Planner
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {user?.email ? (
            <div style={{ fontSize: 13, color: "#6b7280" }}>{user.email}</div>
          ) : (
            <div style={{ fontSize: 13, color: "#6b7280" }}>게스트 보기</div>
          )}
          <button className="btn" onClick={() => nav("/subjects")}>
            내 시간표
          </button>
        </div>
      </header>

      <div className="subjects-wrap">
        <div className="subjects-header">
          <div>
            <div className="subjects-title">{title}</div>
            <div className="subjects-sub" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span>읽기 전용</span>
              {share?.ownerEmail ? <span>· 공유자: {share.ownerEmail}</span> : null}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn primary"
              onClick={handleImportToMySubjects}
              disabled={loading || !!error || importing}
              title={!user ? "로그인 후 가져오기 가능" : ""}
            >
              {importing ? "가져오는 중..." : "내 시간표로 가져오기"}
            </button>
          </div>
        </div>

        <div className="timetable card">
          {loading ? (
            <div style={{ padding: 16, color: "#6b7280" }}>불러오는 중…</div>
          ) : error ? (
            <div style={{ padding: 16, color: "#ef4444" }}>{error}</div>
          ) : (
            <div className="timetable-grid">
              <div className="tt-time-col">
                <div className="tt-head tt-cell" />
                {timeRows.map((h) => (
                  <div key={h} className="tt-time tt-cell">
                    {pad2(h)}:00
                  </div>
                ))}
              </div>

              <div className="tt-days">
                <div className="tt-head-row">
                  {DAYS.map((d) => (
                    <div key={d} className="tt-head tt-cell">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="tt-body">
                  {DAYS.map((d, idx) => (
                    <div key={d} className="tt-day-col">
                      {timeRows.map((h) => (
                        <div key={`${d}-${h}`} className="tt-slot" />
                      ))}

                      {blocks
                        .filter((b) => b.day === idx + 1)
                        .map((b) => (
                          <div
                            key={b.key}
                            className="tt-block"
                            style={{
                              top: `${b.top}%`,
                              height: `${b.height}%`,
                              background: b.color || DEFAULT_SUBJECT_COLOR,
                              cursor: "default",
                            }}
                            title={`${b.name}\n${b.place ? b.place + " · " : ""}${b.startTime}~${b.endTime}`}
                          >
                            <div className="tt-block-title">{b.name}</div>
                            <div className="tt-block-sub">
                              {b.place ? `${b.place} · ` : ""}
                              {b.startTime}~{b.endTime}
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {!loading && !error && (
          <div className="card" style={{ marginTop: 12, padding: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>공유 링크</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <code style={{ padding: "6px 8px", background: "#f3f4f6", borderRadius: 8 }}>
                {window.location.href}
              </code>
              <button
                className="btn"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    alert("링크를 복사했어요!");
                  } catch {
                    alert("복사에 실패했어요. 직접 복사해 주세요.");
                  }
                }}
              >
                링크 복사
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}