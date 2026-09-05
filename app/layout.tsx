import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '听见 · TOEFL 精听',
  description: '导入听力，逐句听写，把每一次没听懂都变成进步。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
