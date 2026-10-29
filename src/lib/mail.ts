import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import type {TokenPurpose} from './account-tokens.ts';
export function localMail(){return process.env.NODE_ENV!=='production'&&(process.env.MAIL_DELIVERY??'local')==='local';}
export function mailReady(){return localMail()||((process.env.MAIL_DELIVERY==='resend')&&!!process.env.RESEND_API_KEY?.trim()&&!!process.env.MAIL_FROM?.trim());}
export function appOrigin(){const origin=new URL(process.env.APP_ORIGIN||'http://127.0.0.1:3000');if(origin.username||origin.password||origin.search||origin.hash||origin.pathname!=='/'||!['http:','https:'].includes(origin.protocol)||process.env.NODE_ENV==='production'&&origin.protocol!=='https:')throw new Error('APP_ORIGIN is invalid');return origin.origin;}
export async function sendAccountMail(email:string,token:string,purpose:TokenPurpose,request:typeof fetch=fetch){
 if(!mailReady())throw new Error('Почтовый сервис не настроен. Обратитесь к администратору.');
 const url=appOrigin()+(purpose==='verify'?'/verify-email':'/reset-password')+'#token='+token;
 const subject=purpose==='verify'?'Подтвердите email в AnalyMark':'Восстановление пароля AnalyMark';
 const text=(purpose==='verify'?'Подтвердите ваш email. Ссылка действует 60 минут.':'Для смены пароля откройте ссылку. Она действует 30 минут.')+'\n\n'+url+'\n\nЕсли вы не запрашивали это письмо, проигнорируйте его.';
 if(localMail()){const dir=join(process.env.DATA_DIR||join(process.cwd(),'data'),'mail-outbox');await mkdir(dir,{recursive:true,mode:0o700});await writeFile(join(dir,randomUUID()+'.json'),JSON.stringify({to:email,subject,text,createdAt:new Date().toISOString()}),{mode:0o600});return;}
 const response=await request('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'account-'+token},body:JSON.stringify({from:process.env.MAIL_FROM,to:[email],subject,text})});
 if(!response.ok)throw new Error('Не удалось отправить письмо. Повторите позднее.');
}
