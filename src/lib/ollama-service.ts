import {AiError,aiInstructions,resultSchema,validateAiResult,type AiInput,type AiResult} from './ai-core.ts';
import {ollamaOrigin,type AiConfiguration} from './ai-settings.ts';

let busy=false;

export async function generateOllama(input:AiInput,config:Extract<AiConfiguration,{provider:'ollama'}>,request:typeof fetch=fetch,signal?:AbortSignal):Promise<AiResult>{
 const origin=ollamaOrigin(config.baseUrl);
 const source=input.tool==='reviews'?{tool:input.tool,title:input.title,description:input.description,review:input.review,tone:input.tone}:{tool:input.tool,title:input.title,description:input.description,attributes:input.attributes,...(input.tool==='seo'&&input.keywords?{keywords:input.keywords}:{})};
 if(JSON.stringify(source).length>14000)throw new AiError('Для локальной модели сократите исходные данные до 14 000 символов.',400);
 const task=input.tool==='audit'?'Аудит текста карточки: не оценивай тон ответа на отзыв или отсутствие SEO-ключей. Не придумывай ошибки, если описание согласовано с характеристиками.':input.tool==='seo'?'В draft напиши строго два раздела: «Название:» и «Описание:». Никаких приветствий или благодарностей за покупку.':'В draft напиши короткий ответ покупателю в 2–3 предложениях. Ожидания покупателя сами по себе не доказывают ошибку продавца.';
 if(busy)throw new AiError('Локальная модель уже готовит ответ. Дождитесь завершения или остановите текущий запрос.',429);
 busy=true;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),config.timeoutMs);
 const combined=signal?AbortSignal.any([controller.signal,signal]):controller.signal;
 try{
  if(combined.aborted)throw new AiError('Запрос остановлен.',499);
  const response=await request(origin+'/api/chat',{
   method:'POST',redirect:'error',signal:combined,headers:{'Content-Type':'application/json'},
   body:JSON.stringify({model:config.model,stream:false,think:false,keep_alive:'5m',format:resultSchema,
    options:{temperature:0,num_ctx:16384,num_predict:1800,presence_penalty:0},
    messages:[{role:'system',content:aiInstructions(input.tool)+' Верни только JSON по этой схеме: '+JSON.stringify(resultSchema)+' От 0 до 3 неповторяющихся items и от 0 до 2 warnings только по задаче. Черновик — до 120 слов. AnalyMark — приложение, не название магазина. Каждое утверждение в draft должно прямо следовать из title, description или attributes. Достаточно короткого нейтрального описания. Недостающие сведения вынеси в warnings как вопросы, а не как новые свойства товара в draft. Отсутствие сведений не означает противоречие. Не заполняй список выдуманными проблемами. '+task},{role:'user',content:JSON.stringify(source)}]})
  });
  if(!response.ok)throw new AiError(response.status===404?'Модель не найдена в Ollama. Выполните ollama pull '+config.model+'.':response.status===429||response.status===503?'Ollama занята или не хватает ресурсов. Остановите лишние задачи и повторите запрос.':'Ollama не смогла выполнить запрос. Проверьте работу модели.',response.status===429?429:503);
  const reader=response.body?.getReader();if(!reader)throw new AiError('Ollama вернула пустой ответ.');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>150000){await reader.cancel();throw new AiError('Ответ локальной модели слишком большой.');}chunks.push(value);}
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(body.done!==true||body.done_reason!=='stop')throw new AiError('Локальная модель не завершила ответ. Сократите текст и повторите запрос.');
  if(body.message?.role!=='assistant'||typeof body.message.content!=='string'||!body.message.content.trim())throw new AiError('Локальная модель не вернула итоговый текст.');
  return validateAiResult(JSON.parse(body.message.content));
 }catch(error){
  if(signal?.aborted)throw new AiError('Запрос остановлен.',499);
  if(controller.signal.aborted)throw new AiError('Локальная модель не ответила за отведённое время. Сократите текст и повторите запрос.',504);
  if(error instanceof AiError)throw error;
  if(error instanceof SyntaxError)throw new AiError('Локальная модель вернула некорректный результат. Повторите запрос.');
  throw new AiError('Нет соединения с Ollama. Запустите Ollama на компьютере с AnalyMark и повторите запрос.',503);
 }finally{clearTimeout(timer);busy=false;}
}
