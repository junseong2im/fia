import type { Metadata } from "next";
import "./globals.css";

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
);

export const metadata: Metadata = {
  metadataBase,
  title: "FIA — AI 금융 운영체제",
  description:
    "17개 금융 AI 전문가가 자산을 이해하고 계획하고 실행하는 Full-scope 금융 운영체제",
  openGraph: {
    title: "FIA — Financial Intelligence Agent",
    description: "17개 전문가와 155개 기능을 하나로 연결한 Full-scope AI 금융 운영체제",
    type: "website",
    locale: "ko_KR",
    images: [
      {
        url: "/fia-social-preview.png",
        width: 1659,
        height: 948,
        alt: "FIA 금융 디지털 트윈과 17개 AI 전문가 네트워크",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FIA — Financial Intelligence Agent",
    description: "17개 전문가와 155개 기능을 하나로 연결한 AI 금융 운영체제",
    images: ["/fia-social-preview.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
