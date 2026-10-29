import 'server-only';
import {redirect} from 'next/navigation';
import {verificationRequired} from './account-tokens';
import {authDestination} from './auth-navigation';
import {cookies} from 'next/headers';
import {database} from './storage';
import {sessionAccount} from './auth-core';
export const sessionCookie='analymark_session';
export async function currentAccount(allowUnverified=false){const user=sessionAccount(database(),(await cookies()).get(sessionCookie)?.value);return user&&(!verificationRequired()||user.emailVerified||allowUnverified)?user:null;}
export async function requireAccount(destination='/workspace'){const user=await currentAccount(true);if(!user)redirect('/login?next='+encodeURIComponent(authDestination(destination)));if(verificationRequired()&&!user.emailVerified)redirect('/verify-email?next='+encodeURIComponent(authDestination(destination)));return user;}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');try{return !!origin&&new URL(origin).host===request.headers.get('host')&&['http:','https:'].includes(new URL(origin).protocol);}catch{return false;}}
export function unauthorized(){return Response.json({error:'Войдите в аккаунт.'},{status:401,headers:{'Cache-Control':'no-store'}});}
