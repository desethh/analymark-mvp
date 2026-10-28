import {redirect} from 'next/navigation';
import {currentAccount} from '@/lib/auth';
import Workspace from '@/components/workspace';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export default async function WorkspacePage(){const account=await currentAccount();if(!account)redirect('/login');return <Workspace accountName={account.name}/>;}
