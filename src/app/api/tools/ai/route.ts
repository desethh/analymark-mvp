import {isAiConfigured} from '@/lib/ai-config';
import {currentAccount,sameOrigin,unauthorized} from '@/lib/auth';
import {database} from '@/lib/storage';
import {allowAttempt} from '@/lib/auth-core';
import {AiError,validateAiInput} from '@/lib/ai-core';
import {generateAi} from '@/lib/ai-service';
export const runtime='nodejs';
export async function POST(request:Request){
 const user=await currentAccount();if(!user)return unauthorized();
 if(!sameOrigin(request))return Response.json({error:'Недопустимый источник запроса.'},{status:403});
 try{
  if(Number(request.headers.get('content-length')??0)>30000)throw new AiError('Слишком длинный запрос.',413);
  const reader=request.body?.getReader();if(!reader)throw new AiError('Нет данных формы.',400);let length=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>30000){await reader.cancel();throw new AiError('Слишком длинный запрос.',413);}chunks.push(value);}
  let raw;try{raw=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new AiError('Проверьте данные формы.',400);}
  const input=validateAiInput(raw),key=process.env.OPENAI_API_KEY?.trim()??'';
  if(!isAiConfigured())throw new AiError('ИИ ещё не подключён. Администратору нужно настроить OpenAI API.',503);
  const db=database();if(!allowAttempt(db,'ai-user:'+user.id,Date.now(),20)||!allowAttempt(db,'ai-global',Date.now(),100))throw new AiError('Лимит запросов ИИ достигнут. Повторите через 15 минут.',429);
  const result=await generateAi(input,{key,model:process.env.OPENAI_MODEL?.trim()||'gpt-4.1-mini'});
  return Response.json({result},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof AiError?e.message:'Не удалось выполнить запрос.'},{status:e instanceof AiError?e.status:500,headers:{'Cache-Control':'no-store',...(e instanceof AiError&&e.status===429?{'Retry-After':'900'}:{})}});}
}
