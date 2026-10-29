import {AiError,aiInstructions,resultSchema,validateAiResult,type AiInput,type AiResult} from './ai-core.ts';
import {generateOllama} from './ollama-service.ts';
import type {AiConfiguration} from './ai-settings.ts';
export async function generateAi(input:AiInput,config:AiConfiguration,request:typeof fetch=fetch,signal?:AbortSignal):Promise<AiResult>{
 if(config.provider==='ollama')return generateOllama(input,config,request,signal);
 if(!config.key.trim())throw new AiError('ИИ ещё не подключён. Администратору нужно настроить OpenAI API.',503);
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await request('https://api.openai.com/v1/responses',{method:'POST',redirect:'error',signal:signal?AbortSignal.any([controller.signal,signal]):controller.signal,headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json'},body:JSON.stringify({model:config.model,store:false,instructions:aiInstructions(input.tool),input:JSON.stringify(input),max_output_tokens:2400,text:{format:{type:'json_schema',name:'analymark_tool',strict:true,schema:resultSchema}}})});
  if(!response.ok)throw new AiError(response.status===429?'Лимит OpenAI исчерпан. Повторите позднее.':response.status===401||response.status===403?'OpenAI недоступен: администратору нужно проверить ключ и доступ к модели.':'Не удалось получить ответ OpenAI. Повторите позднее.',response.status===429?429:502);
  const reader=response.body?.getReader();if(!reader)throw new AiError('Пустой ответ OpenAI.');let total=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>150000){await reader.cancel();throw new AiError('Ответ ИИ слишком большой.');}chunks.push(value);}
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(body.status!=='completed')throw new AiError('ИИ не завершил ответ. Сократите исходный текст и повторите.');
  const content=(Array.isArray(body.output)?body.output:[]).flatMap((v:{content?:unknown[]})=>Array.isArray(v.content)?v.content:[]);
  if(content.some((x:{type:string})=>x.type==='refusal'))throw new AiError('ИИ не смог обработать этот текст. Измените исходные данные.',422);
  const text=content.filter((x:{type:string;text?:string})=>x.type==='output_text').map((x:{text:string})=>x.text).join('');
  return validateAiResult(JSON.parse(text));
 }catch(e){if(signal?.aborted)throw new AiError('Запрос остановлен.',499);if(e instanceof AiError)throw e;if(controller.signal.aborted)throw new AiError('ИИ не ответил за 30 секунд. Повторите запрос.',504);if(e instanceof SyntaxError)throw new AiError('ИИ вернул некорректный результат. Повторите запрос.');const code=(e as {cause?:{code?:string}})?.cause?.code;if(code==='SELF_SIGNED_CERT_IN_CHAIN'||code==='UNABLE_TO_VERIFY_LEAF_SIGNATURE')throw new AiError('Не удалось проверить сертификат соединения с OpenAI. Администратору нужно проверить доверенные сертификаты сервера.');throw new AiError('Нет соединения с OpenAI. Попробуйте позднее.');}finally{clearTimeout(timer);}
}
