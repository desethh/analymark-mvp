import 'server-only';
import {cookies} from 'next/headers';
import {database} from './storage';
import {sessionAccount} from './auth-core';
export const sessionCookie='analymark_session';
export async function currentAccount(){return sessionAccount(database(),(await cookies()).get(sessionCookie)?.value);}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');try{return !!origin&&new URL(origin).host===request.headers.get('host')&&['http:','https:'].includes(new URL(origin).protocol);}catch{return false;}}
export function unauthorized(){return Response.json({error:'Войдите в аккаунт.'},{status:401,headers:{'Cache-Control':'no-store'}});}
