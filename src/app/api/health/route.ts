import {database} from '@/lib/storage';
import {deploymentProblems} from '@/lib/deployment';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){let ok=false;try{database().prepare('SELECT 1').get();ok=deploymentProblems().length===0;}catch{}return Response.json({ok},{status:ok?200:503,headers:{'Cache-Control':'no-store'}});}
