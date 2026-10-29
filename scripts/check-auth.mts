import {qaMail,removeQaMail} from './qa-mail.mts';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database} from '../src/lib/storage.ts';
import {defaults} from '../src/lib/economics.ts';
import {tokenHash} from '../src/lib/auth-core.ts';
const base='http://127.0.0.1:3000',tag=randomUUID(),emails=[`qa-a-${tag}@example.invalid`,`qa-b-${tag}@example.invalid`],password=randomUUID();
const db=database();
async function call(path:string,method='GET',body?:unknown,cookie='',origin=base){return fetch(base+path,{method,redirect:'manual',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});}
try{
 let r=await call('/workspace');assert.equal(r.status,307);assert.ok(r.headers.get('location')?.startsWith('/login'));
 for(const path of ['/api/calculations','/api/kaspi/product','/api/kaspi/prices','/api/tools/ai'])assert.equal((await call(path,path==='/api/calculations'?'GET':'POST',path==='/api/calculations'?undefined:{})).status,401);
 assert.equal((await call('/api/auth/register','POST',{email:emails[0],password,name:'QA',acceptPrivacy:true},'','https://foreign.invalid')).status,403);
 const cookies:string[]=[];
 for(const email of emails){r=await call('/api/auth/register','POST',{email,password,name:'QA Test',acceptPrivacy:true});assert.equal(r.status,200,await r.clone().text());const set=r.headers.get('set-cookie')!;assert.match(set,/HttpOnly/i);assert.match(set,/SameSite=lax/i);cookies.push(set.split(';')[0]);if((await r.json()).next==='/verify-email'){const url=await qaMail(email,'Подтвердите');const verified=await call('/api/account/verify','POST',{token:new URLSearchParams(url.hash.slice(1)).get('token')});assert.equal(verified.status,200);}}
 assert.equal((await call('/api/account/onboarding','POST',{})).status,401);
 assert.equal((await call('/api/account/onboarding','POST',{},cookies[0],'https://foreign.invalid')).status,403);
 for(const email of emails)assert.equal(db.prepare('SELECT onboarding_pending FROM users WHERE email=?').get(email)?.onboarding_pending,1);
 const otherUser=db.prepare('SELECT id FROM users WHERE email=?').get(emails[1])!;
 assert.equal((await call('/api/account/onboarding','POST',{userId:otherUser.id},cookies[0])).status,200);
 assert.equal((await call('/api/account/onboarding','POST',{},cookies[0])).status,200);
 assert.equal(db.prepare('SELECT onboarding_pending FROM users WHERE email=?').get(emails[0])?.onboarding_pending,0);
 assert.equal(db.prepare('SELECT onboarding_pending FROM users WHERE email=?').get(emails[1])?.onboarding_pending,1);
 assert.equal((await call('/api/auth/login','POST',{email:emails[0],password:'wrong'})).status,401);
 for(const path of ['/workspace/tools','/workspace/tools/audit','/workspace/tools/seo','/workspace/tools/reviews']){r=await call(path);assert.equal(r.status,307);assert.ok(r.headers.get('location')?.startsWith('/login?next='));r=await call(path,'GET',undefined,cookies[0]);assert.equal(r.status,200);}
 assert.equal((await call('/api/tools/ai','POST',{tool:'audit'},cookies[0],'https://foreign.invalid')).status,403);
 assert.equal((await call('/api/tools/ai','POST',{tool:'bidder'},cookies[0])).status,400);
 if(process.env.OPENAI_ENABLED!=='true'||!process.env.OPENAI_API_KEY)assert.equal((await call('/api/tools/ai','POST',{tool:'audit',title:'QA Item',description:'USB-C power adapter, 20 watts, cable is not included.'},cookies[0])).status,503);

 assert.equal((await call('/api/auth/register','POST',{email:emails[0],password,name:'QA',acceptPrivacy:true})).status,409);
 const payload={name:'QA isolated calculation',inputs:defaults,offers:[],product:null,url:'',city:'Алматы',demo:false,routes:[{name:'one',cost:0},{name:'two',cost:0},{name:'three',cost:0}]};
 r=await call('/api/calculations','POST',payload,cookies[0]);assert.equal(r.status,201,await r.clone().text());const {id}=await r.json();
 assert.ok((await (await call('/api/calculations','GET',undefined,cookies[0])).json()).some((x:{id:string})=>x.id===id));
 assert.deepEqual(await (await call('/api/calculations','GET',undefined,cookies[1])).json(),[]);
 assert.equal((await call('/api/calculations?id='+id,'DELETE',undefined,cookies[1])).status,200);
 assert.ok((await (await call('/api/calculations','GET',undefined,cookies[0])).json()).some((x:{id:string})=>x.id===id));
 r=await call('/workspace','GET',undefined,cookies[0]);assert.equal(r.status,200);const html=await r.text();assert.ok(!html.includes('От рыночной цены'));assert.ok(html.includes('Выйти'));assert.ok(!html.includes('<dialog'));
 assert.ok((await (await call('/workspace','GET',undefined,cookies[1])).text()).includes('<dialog'));
 r=await call('/api/auth/logout','POST',undefined,cookies[0]);assert.equal(r.status,200);assert.equal((await call('/api/calculations','GET',undefined,cookies[0])).status,401);
 r=await call('/api/auth/login','POST',{email:emails[0],password});assert.equal(r.status,200);assert.notEqual(r.headers.get('set-cookie')!.split(';')[0],cookies[0]);
 console.log('PASS: guest redirect, API guards, CSRF, registration, login, HttpOnly cookie, account isolation, per-account onboarding persistence, ownership on delete, logout revocation, fresh login.');
}finally{for(const email of emails){const u=db.prepare('SELECT id FROM users WHERE email=?').get(email);if(u){db.prepare('DELETE FROM calculations WHERE user_id=?').run(u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);db.prepare('DELETE FROM account_tokens WHERE user_id=?').run(u.id);db.prepare('DELETE FROM users WHERE id=?').run(u.id);}db.prepare('DELETE FROM auth_attempts WHERE key=?').run('email:'+tokenHash(email));await removeQaMail(email);}db.close();}
