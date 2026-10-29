import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database} from '../src/lib/storage.ts';
import {qaMail,removeQaMail} from './qa-mail.mts';
const base='http://127.0.0.1:3000',email='qa-recovery-'+randomUUID()+'@example.invalid',password=randomUUID(),nextPassword=randomUUID(),db=database();
async function call(path:string,body?:unknown,cookie='',origin=base){return fetch(base+path,{method:body===undefined?'GET':'POST',redirect:'manual',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});}
const token=(url:URL)=>new URLSearchParams(url.hash.slice(1)).get('token');
try{
 assert.equal((await call('/api/auth/register',{email,password,name:'QA Recovery'})).status,400);
 let r=await call('/api/auth/register',{email,password,name:'QA Recovery',acceptPrivacy:true});assert.equal(r.status,200,await r.clone().text());const cookie=r.headers.get('set-cookie')!.split(';')[0];const confirmationEnabled=(await r.json()).next==='/verify-email';
 if(confirmationEnabled){
  r=await call('/workspace',undefined,cookie);assert.equal(r.status,307);assert.ok(r.headers.get('location')?.startsWith('/verify-email'));
  assert.equal((await call('/api/calculations',undefined,cookie)).status,401);
  const verify=token(await qaMail(email,'Подтвердите'));assert.equal((await call('/api/account/verify',{token:verify},cookie,'https://foreign.invalid')).status,403);assert.equal((await call('/api/account/verify',{token:verify},cookie)).status,200);assert.equal((await call('/api/account/verify',{token:verify},cookie)).status,400);
 }else{
  assert.equal((await call('/api/calculations',undefined,cookie)).status,200);
  r=await call('/verify-email',undefined,cookie);assert.equal(r.status,307);assert.equal(r.headers.get('location'),'/workspace');
  for(const action of ['verify','resend']){r=await call('/api/account/'+action,{},cookie);assert.equal(r.status,200);assert.ok((await r.json()).message.includes('временно отключено'));}
  const u=db.prepare('SELECT id,email_verified_at FROM users WHERE email=?').get(email)!;assert.equal(u.email_verified_at,null);assert.equal(db.prepare("SELECT count(*) AS n FROM account_tokens WHERE user_id=? AND purpose='verify'").get(u.id)?.n,0);
  assert.ok(!(await (await call('/workspace/account',undefined,cookie)).text()).includes('Email ещё не подтверждён'));
  r=await call('/api/auth/login',{email,password});assert.equal(r.status,200);assert.equal((await r.json()).next,undefined);
 }
 assert.equal((await call('/workspace',undefined,cookie)).status,200);
 const known=await (await call('/api/account/forgot',{email})).json(),unknown=await (await call('/api/account/forgot',{email:'qa-missing-'+randomUUID()+'@example.invalid'})).json();assert.deepEqual(known,unknown);
 const reset=token(await qaMail(email,'Восстановление'));assert.equal((await call('/api/account/reset',{token:reset,password:'short'})).status,400);assert.equal((await call('/api/account/reset',{token:reset,password:nextPassword})).status,200);assert.equal((await call('/api/calculations',undefined,cookie)).status,401);assert.equal((await call('/api/account/reset',{token:reset,password:nextPassword})).status,400);
 assert.equal((await call('/api/auth/login',{email,password})).status,401);r=await call('/api/auth/login',{email,password:nextPassword});assert.equal(r.status,200);const newCookie=r.headers.get('set-cookie')!.split(';')[0];assert.equal((await call('/api/account/delete',{password:'wrong'},newCookie)).status,400);assert.equal((await call('/api/account/delete',{password:nextPassword},newCookie)).status,200);assert.equal((await call('/api/calculations',undefined,newCookie)).status,401);assert.equal((await call('/api/auth/login',{email,password:nextPassword})).status,401);
 console.log('PASS: privacy acknowledgement, '+(confirmationEnabled?'unverified isolation and verify once':'immediate access for unverified accounts, hidden verification screen, no confirmation tokens')+', generic recovery, reset once, revoke sessions, old password rejected, deletion password check and logout.');
}finally{const u=db.prepare('SELECT id FROM users WHERE email=?').get(email);if(u){db.prepare('DELETE FROM calculations WHERE user_id=?').run(u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);db.prepare('DELETE FROM account_tokens WHERE user_id=?').run(u.id);db.prepare('DELETE FROM users WHERE id=?').run(u.id);}await removeQaMail(email);db.close();}
