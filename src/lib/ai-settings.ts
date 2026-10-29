import {AiError} from './ai-core.ts';

export type AiConfiguration=
 | {provider:'ollama';model:string;baseUrl:string;timeoutMs:number}
 | {provider:'openai';model:string;key:string};

export function ollamaOrigin(value:string){
 let url:URL;try{url=new URL(value);}catch{throw new AiError('Проверьте адрес локальной Ollama в настройках сервера.',503);}
 if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]','host.docker.internal'].includes(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new AiError('Ollama должна использовать локальный HTTP-адрес без пути, пароля и параметров.',503);
 return url.origin;
}

export function readAiConfiguration(env:Record<string,string|undefined>=process.env):AiConfiguration|null{
 if(env.AI_ENABLED==='false')return null;
 const provider=env.AI_PROVIDER?.trim()||'ollama';
 if(provider==='openai'){
  if(env.OPENAI_ENABLED!=='true'||!env.OPENAI_API_KEY?.trim())return null;
  return {provider,model:env.OPENAI_MODEL?.trim()||'gpt-4.1-mini',key:env.OPENAI_API_KEY.trim()};
 }
 if(provider!=='ollama')throw new AiError('Неизвестный провайдер ИИ в настройках сервера.',503);
 const model=env.OLLAMA_MODEL?.trim()||'qwen3:14b';
 if(!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,99}$/.test(model)||/(?:[:\-])cloud$/i.test(model))throw new AiError('Укажите имя локальной модели Ollama, например qwen3:14b.',503);
 const timeoutMs=Number(env.OLLAMA_TIMEOUT_MS??180000);
 if(!Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>300000)throw new AiError('Таймаут Ollama должен быть от 1000 до 300000 мс.',503);
 return {provider,model,baseUrl:ollamaOrigin(env.OLLAMA_BASE_URL?.trim()||'http://127.0.0.1:11434'),timeoutMs};
}
