import {PublicHeader} from '@/components/public-header';
import {AccountRecovery} from '@/components/account-recovery';
import {localMail} from '@/lib/mail';
import {currentAccount} from '@/lib/auth';
import {verificationRequired} from '@/lib/account-tokens';
import {redirect} from 'next/navigation';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export default async function Page(){if(!verificationRequired())redirect('/workspace');const user=await currentAccount(true);return <div className="public-shell"><PublicHeader/><main className="recovery-layout"><section className="auth-card"><span className="section-kicker">АККАУНТ ANALYMARK</span><h1>Подтвердите email</h1><p>Подтверждение адреса защищает доступ к вашим расчётам.</p><AccountRecovery mode="verify" local={localMail()} email={user?.email??''}/></section></main></div>;}
