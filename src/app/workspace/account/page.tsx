import Link from 'next/link';
import {requireAccount} from '@/lib/auth';
import {PublicHeader} from '@/components/public-header';
import {AccountSettings} from '@/components/account-settings';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export default async function Page(){const user=await requireAccount();return <div className="public-shell"><PublicHeader signedIn/><main className="recovery-layout"><section className="auth-card"><Link href="/workspace">← В рабочее пространство</Link><h1>Ваш аккаунт</h1><p>{user.name} · {user.email}</p><p>{user.emailVerified?'Email подтверждён':'Email ещё не подтверждён'}</p><Link href="/privacy">Обработка данных</Link><AccountSettings/></section></main></div>;}
