 'use client';
import Link from 'next/link';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="recovery-layout"><section className="auth-card"><h1>Не удалось открыть страницу</h1><p>Повторите попытку. Сохранённые расчёты остаются в аккаунте.</p><button className="button primary" onClick={reset}>Попробовать ещё раз</button><p><Link href="/workspace">В рабочее пространство</Link></p></section></main>;}
