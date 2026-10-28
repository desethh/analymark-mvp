import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title: 'AnalyMark — решения о цене', description: 'Анализ предложений и экономика товара для продавцов маркетплейсов'};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {return <html lang="ru"><body>{children}</body></html>;}
