import {redirect} from 'next/navigation';
import {currentAccount} from '@/lib/auth';
import {PublicHeader} from '@/components/public-header';
import AuthForm from '@/components/auth-form';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export default async function Page(){if(await currentAccount())redirect('/workspace');return <div className="public-shell"><PublicHeader/><main className="auth-layout"><section className="auth-intro"><span className="eyebrow">ВАШЕ РАБОЧЕЕ МЕСТО ПРОДАВЦА</span><h1>Понятный рынок.<br/>Продуманные решения.</h1><p>Цены предложений, экономика товара и ориентир закупки — в одном пространстве.</p><ol><li>Изучите цены на Kaspi</li><li>Учтите расходы и прибыль</li><li>Определите бюджет закупки</li></ol><p className="hint">Расчёты сохраняются в вашем аккаунте.</p></section><section className="auth-card" aria-labelledby="auth-title"><span className="section-kicker">AnalyMark</span><h2 id="auth-title">Создать аккаунт</h2><p>Начните с одного товара и одного расчёта.</p><AuthForm register={true}/></section></main></div>;}
