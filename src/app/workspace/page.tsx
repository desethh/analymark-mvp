import {redirect} from 'next/navigation';
import {requireAccount} from '@/lib/auth';
import Workspace from '@/components/workspace';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export default async function WorkspacePage({searchParams}:{searchParams:Promise<{step?:string}>}){const {step}=await searchParams;const account=await requireAccount(step==='economics'||step==='market'||step==='suppliers'?'/workspace?step='+step:'/workspace');return <Workspace accountName={account.name} initialTab={step==='economics'?'economics':step==='suppliers'?'suppliers':'market'}/>;}
