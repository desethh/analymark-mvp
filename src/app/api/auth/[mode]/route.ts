import {issueAccountToken,verificationRequired} from '@/lib/account-tokens';
import {sendAccountMail,mailReady} from '@/lib/mail';
import {logEvent} from '@/lib/observability';
import {readJson} from '@/lib/request-json';
import {cookies} from 'next/headers';
import {database} from '@/lib/storage';
import {allowAttempt,checkPassword,credentials,hashPassword,newSession,randomUUID,sessionAge,tokenHash} from '@/lib/auth-core';
import {sameOrigin,sessionCookie} from '@/lib/auth';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{mode:string}>}){
 if(!sameOrigin(request))return Response.json({error:'Недопустимый источник запроса.'},{status:403});
 const {mode}=await params;if(!['login','register','logout'].includes(mode))return new Response(null,{status:404});
 const db=database(),jar=await cookies();
 const options={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'};
 if(mode==='logout'){const token=jar.get(sessionCookie)?.value;if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(token));jar.set(sessionCookie,'',{...options,maxAge:0});return Response.json({ok:true});}
 try{
  // Global budget also applies when the deployment has no trusted client-IP header.
  if(!allowAttempt(db,'global',Date.now(),100))return Response.json({error:'Слишком много попыток. Повторите через 15 минут.'},{status:429,headers:{'Retry-After':'900'}});
  const body=await readJson(request);const {email,password,name}=credentials(body,mode==='register');
  if(!allowAttempt(db,'email:'+tokenHash(email)))return Response.json({error:'Слишком много попыток для этого email. Повторите через 15 минут.'},{status:429,headers:{'Retry-After':'900'}});
  let user=db.prepare('SELECT id,password_hash,email_verified_at FROM users WHERE email=?').get(email);
  if(mode==='register'){
   if(verificationRequired()&&!mailReady())return Response.json({error:'Почтовый сервис не настроен. Регистрация пока недоступна.'},{status:503});
   if(body.acceptPrivacy!==true)return Response.json({error:'Подтвердите ознакомление с обработкой данных.'},{status:400});
   if(user)return Response.json({error:'Не удалось создать аккаунт. Попробуйте другой email или войдите.'},{status:409});
   const passwordHash=await hashPassword(password),id=randomUUID();
   try{db.prepare('INSERT INTO users (id,email,name,password_hash,created_at,privacy_accepted_at,onboarding_pending) VALUES (?,?,?,?,?,?,1)').run(id,email,name,passwordHash,Date.now(),Date.now());}catch{return Response.json({error:'Не удалось создать аккаунт. Попробуйте другой email или войдите.'},{status:409});}
   user={id,password_hash:passwordHash,email_verified_at:null};
  }else{
   const encoded=user?String(user.password_hash):'00000000000000000000000000000000:'+ '00'.repeat(64);
   const valid=await checkPassword(password,encoded);
   if(!user||!valid)return Response.json({error:'Неверный email или пароль.'},{status:401});
  }
  let emailNotice='';if(verificationRequired()&&user.email_verified_at===null){try{const mailToken=issueAccountToken(db,String(user.id),'verify');await sendAccountMail(email,mailToken,'verify');}catch{logEvent('mail.verify.failed',503);emailNotice='Не удалось отправить письмо. Попробуйте отправить его повторно на странице подтверждения.';}}
  const token=newSession(db,String(user.id));jar.set(sessionCookie,token,{...options,maxAge:sessionAge});
  return Response.json({ok:true,...(verificationRequired()&&user.email_verified_at===null?{next:'/verify-email',notice:emailNotice}: {})},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof SyntaxError?'Проверьте данные формы.':e instanceof Error?e.message:'Не удалось войти.'},{status:400});}
}
