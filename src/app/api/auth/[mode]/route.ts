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
  const raw=await request.text();if(raw.length>4096)throw new Error('Слишком длинный запрос.');
  const {email,password,name}=credentials(JSON.parse(raw),mode==='register');
  if(!allowAttempt(db,'email:'+tokenHash(email)))return Response.json({error:'Слишком много попыток для этого email. Повторите через 15 минут.'},{status:429,headers:{'Retry-After':'900'}});
  let user=db.prepare('SELECT id,password_hash FROM users WHERE email=?').get(email);
  if(mode==='register'){
   if(user)return Response.json({error:'Не удалось создать аккаунт. Попробуйте другой email или войдите.'},{status:409});
   const passwordHash=await hashPassword(password),id=randomUUID();
   try{db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run(id,email,name,passwordHash,Date.now());}catch{return Response.json({error:'Не удалось создать аккаунт. Попробуйте другой email или войдите.'},{status:409});}
   user={id,password_hash:passwordHash};
  }else{
   const encoded=user?String(user.password_hash):'00000000000000000000000000000000:'+ '00'.repeat(64);
   const valid=await checkPassword(password,encoded);
   if(!user||!valid)return Response.json({error:'Неверный email или пароль.'},{status:401});
  }
  const token=newSession(db,String(user.id));jar.set(sessionCookie,token,{...options,maxAge:sessionAge});
  return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof SyntaxError?'Проверьте данные формы.':e instanceof Error?e.message:'Не удалось войти.'},{status:400});}
}
