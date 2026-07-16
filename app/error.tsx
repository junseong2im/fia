"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("FIA rendering error", error);
  }, [error]);

  return (
    <main className="system-message">
      <span>FIA RECOVERY</span>
      <h1>화면을 불러오지 못했습니다</h1>
      <p>금융 실행은 발생하지 않았습니다. 잠시 후 다시 시도하면 현재 서버 상태에서 안전하게 복구합니다.</p>
      <button onClick={reset}>다시 시도</button>
    </main>
  );
}
