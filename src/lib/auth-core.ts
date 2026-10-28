import {randomBytes, randomUUID, scrypt as derive, timingSafeEqual, createHash} from 'node:crypto';
import {promisify} from 'node:util';
import type {DatabaseSync} from 'node:sqlite';
const scrypt=promisify(derive);
export const sessionAge=7*24*60*60;
export type Account={id:string;name:string;email:string};
export function tokenHash(value:string){return createHash('sha256').update(value).digest('hex');}
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64) as Buffer;return salt+':'+key.toString('hex');}
export async function checkPassword(password:string,encoded:string){const [salt,hex]=encoded.split(':');const expected=Buffer.from(hex,'hex');const key=await scrypt(password,salt,64) as Buffer;return expected.length===key.length&&timingSafeEqual(expected,key);}
export function credentials(body:Record<string,unknown>,register:boolean){
 const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
 const password=typeof body.password==='string'?body.password:'';
 const name=typeof body.name==='string'?body.name.trim():'';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new Error('Укажите корректный email.');
 if(password.length>128||password.length<(register?10:1))throw new Error('Пароль должен содержать от 10 до 128 символов.');
 if(register&&(name.length<2||name.length>80))throw new Error('Укажите имя от 2 до 80 символов.');
 return {email,password,name};
}
export function newSession(db:DatabaseSync,userId:string,now=Date.now()){
 db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);
 const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(tokenHash(token),userId,now+sessionAge*1000);return token;
}
export function sessionAccount(db:DatabaseSync,token:string|undefined,now=Date.now()):Account|null{
 if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 const row=db.prepare('SELECT u.id,u.name,u.email FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?').get(tokenHash(token),now);return row?{id:String(row.id),name:String(row.name),email:String(row.email)}:null;
}
export function allowAttempt(db:DatabaseSync,key:string,now=Date.now(),limit=10){
 db.prepare('DELETE FROM auth_attempts WHERE expires_at<=?').run(now);
 const row=db.prepare('SELECT count FROM auth_attempts WHERE key=?').get(key);
 if(row&&Number(row.count)>=limit)return false;
 db.prepare('INSERT INTO auth_attempts VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now+15*60*1000);return true;
}
export {randomUUID};
