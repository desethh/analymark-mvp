import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database} from '../src/lib/storage.ts';
import {defaults} from '../src/lib/economics.ts';
import {tokenHash} from '../src/lib/auth-core.ts';
const base='http://127.0.0.1:3000',tag=randomUUID(),emails=[`qa-a-${tag}@example.invalid`,`qa-b-${tag}@example.invalid`],password=randomUUID();
const db=database();
async function call(path:string,method='GET',body?:unknown,cookie='',origin=base){return fetch(base+path,{method,redirect:'manual',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});}
try{
 let r=await call('/workspace');assert.equal(r.status,307);assert.equal(r.headers.get('location'),'/login');
 for(const path of ['/api/calculations','/api/kaspi/product','/api/kaspi/prices'])assert.equal((await call(path,path==='/api/calculations'?'GET':'POST',path==='/api/calculations'?undefined:{})).status,401);
 assert.equal((await call('/api/auth/register','POST',{email:emails[0],password,name:'QA'},'','https://foreign.invalid')).status,403);
 const cookies:string[]=[];
 for(const email of emails){r=await call('/api/auth/register','POST',{email,password,name:'QA Test'});assert.equal(r.status,200,await r.text());const set=r.headers.get('set-cookie')!;assert.match(set,/HttpOnly/i);assert.match(set,/SameSite=lax/i);cookies.push(set.split(';')[0]);}
 assert.equal((await call('/api/auth/login','POST',{email:emails[0],password:'wrong'})).status,401);
 assert.equal((await call('/api/auth/register','POST',{email:emails[0],password,name:'QA'})).status,409);
 const payload={name:'QA isolated calculation',inputs:defaults,offers:[],product:null,url:'',city:'Алматы',demo:false,routes:[{name:'one',cost:0},{name:'two',cost:0},{name:'three',cost:0}]};
 r=await call('/api/calculations','POST',payload,cookies[0]);assert.equal(r.status,201,await r.clone().text());const {id}=await r.json();
 assert.ok((await (await call('/api/calculations','GET',undefined,cookies[0])).json()).some((x:{id:string})=>x.id===id));
 assert.deepEqual(await (await call('/api/calculations','GET',undefined,cookies[1])).json(),[]);
 assert.equal((await call('/api/calculations?id='+id,'DELETE',undefined,cookies[1])).status,200);
 assert.ok((await (await call('/api/calculations','GET',undefined,cookies[0])).json()).some((x:{id:string})=>x.id===id));
 r=await call('/workspace','GET',undefined,cookies[0]);assert.equal(r.status,200);const html=await r.text();assert.ok(!html.includes('От рыночной цены'));assert.ok(html.includes('Выйти'));
 r=await call('/api/auth/logout','POST',undefined,cookies[0]);assert.equal(r.status,200);assert.equal((await call('/api/calculations','GET',undefined,cookies[0])).status,401);
 r=await call('/api/auth/login','POST',{email:emails[0],password});assert.equal(r.status,200);assert.notEqual(r.headers.get('set-cookie')!.split(';')[0],cookies[0]);
 console.log('PASS: guest redirect, API guards, CSRF, registration, login, HttpOnly cookie, account isolation, ownership on delete, logout revocation, fresh login.');
}finally{for(const email of emails){const u=db.prepare('SELECT id FROM users WHERE email=?').get(email);if(u){db.prepare('DELETE FROM calculations WHERE user_id=?').run(u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);db.prepare('DELETE FROM users WHERE id=?').run(u.id);}db.prepare('DELETE FROM auth_attempts WHERE key=?').run('email:'+tokenHash(email));}db.close();}
