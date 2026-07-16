import Link from "next/link";

export default function NotFound() {
  return (
    <main className="system-message">
      <span>404 · FIA</span>
      <h1>요청한 화면을 찾지 못했습니다</h1>
      <p>주소를 확인하거나 금융 운영 콘솔로 돌아가세요.</p>
      <Link href="/">FIA 홈으로</Link>
    </main>
  );
}
