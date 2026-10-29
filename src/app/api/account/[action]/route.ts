import {after} from 'next/server';
import {cookies} from 'next/headers';
import {database} from '@/lib/storage';
import {currentAccount,sameOrigin,sessionCookie} from '@/lib/auth';
import {allowAttempt,credentials,hashPassword,tokenHash,checkPassword} from '@/lib/auth-core';
import {issueAccountToken,completeAccountToken,verificationRequired} from '@/lib/account-tokens';
import {sendAccountMail,mailReady} from '@/lib/mail';
import {readJson} from '@/lib/request-json';
import {logEvent} from '@/lib/observability';
import {dismissOnboarding} from '@/lib/onboarding';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
 if(!sameOrigin(request))return Response.json({error:'Недопустимый источник запроса.'},{status:403});
 const {action}=await params;if(!['forgot','reset','verify','resend','delete','onboarding'].includes(action))return new Response(null,{status:404});
 const db=database();try{
 if(!allowAttempt(db,'account-global',Date.now(),60))return Response.json({error:'Слишком много попыток. Повторите через 15 минут.'},{status:429,headers:{'Retry-After':'900'}});
 const body=await readJson(request);const generic={message:'Если такой аккаунт существует, письмо с инструкцией подготовлено. Проверьте почту.'};
 if((action==='verify'||action==='resend')&&!verificationRequired())return Response.json({message:'Подтверждение почты временно отключено. Можно продолжить работу.'},{headers:{'Cache-Control':'no-store'}});
 if(action==='onboarding'){
  const user=await currentAccount();if(!user)return Response.json({error:'Войдите в аккаунт.'},{status:401});
  dismissOnboarding(db,user.id);return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }
 if(action==='delete'){
 const user=await currentAccount();if(!user)return Response.json({error:'Войдите в аккаунт.'},{status:401});if(!allowAttempt(db,'delete:'+user.id,Date.now(),5))return Response.json({error:'Повторите через 15 минут.'},{status:429});const row=db.prepare('SELECT password_hash FROM users WHERE id=?').get(user.id);if(typeof body.password!=='string'||body.password.length>128||!row||!await checkPassword(body.password,String(row.password_hash)))return Response.json({error:'Неверный пароль.'},{status:400});db.exec('BEGIN IMMEDIATE');try{db.prepare('DELETE FROM calculations WHERE user_id=?').run(user.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);db.prepare('DELETE FROM account_tokens WHERE user_id=?').run(user.id);db.prepare('DELETE FROM users WHERE id=?').run(user.id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}(await cookies()).set(sessionCookie,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});return Response.json({message:'Аккаунт удалён.'});
 }
 if(action==='forgot'){
  const {email}=credentials({email:body.email,password:'placeholder'},false);if(!mailReady())return Response.json({error:'Восстановление пока недоступно: почта не настроена.'},{status:503});
  if(!allowAttempt(db,'mail:'+tokenHash(email),Date.now(),3))return Response.json(generic);
  after(async()=>{const user=db.prepare('SELECT id FROM users WHERE email=?').get(email);if(user){try{await sendAccountMail(email,issueAccountToken(db,String(user.id),'reset'),'reset');}catch{logEvent('mail.reset.failed',503);}}});
  return Response.json(generic,{headers:{'Cache-Control':'no-store'}});
 }
 if(action==='resend'){
  const user=await currentAccount(true);if(!user)return Response.json({error:'Войдите в аккаунт.'},{status:401});
  if(user.emailVerified)return Response.json({message:'Email уже подтверждён.'});
  if(!allowAttempt(db,'resend:'+user.id,Date.now(),3))return Response.json({error:'Повторите отправку через 15 минут.'},{status:429});
  await sendAccountMail(user.email,issueAccountToken(db,user.id,'verify'),'verify');return Response.json({message:'Письмо подтверждения подготовлено. Проверьте почту.'});
 }
 let passwordHash:string|undefined;if(action==='reset'){const {password}=credentials({email:'reset@example.invalid',password:body.password,name:'reset'},true);passwordHash=await hashPassword(password);}
 if(!completeAccountToken(db,body.token,action==='verify'?'verify':'reset',passwordHash))return Response.json({error:'Ссылка недействительна или срок её действия истёк. Запросите новую.'},{status:400});
 if(action==='reset')(await cookies()).set(sessionCookie,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
 return Response.json({message:action==='verify'?'Email подтверждён. Можно продолжить работу.':'Пароль изменён. Войдите с новым паролем.'},{headers:{'Cache-Control':'no-store'}});
 }catch(e){logEvent('account.'+action+'.failed',400);return Response.json({error:action==='resend'?'Не удалось отправить письмо. Повторите позднее.':e instanceof Error?e.message:'Не удалось выполнить запрос.'},{status:400});}
}
