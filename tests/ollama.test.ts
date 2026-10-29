import test from 'node:test';
import assert from 'node:assert/strict';
import {readAiConfiguration,ollamaOrigin} from '../src/lib/ai-settings.ts';
import {AiError,validateAiInput,resultSchema} from '../src/lib/ai-core.ts';
import {generateAi} from '../src/lib/ai-service.ts';

const input=validateAiInput({tool:'seo',title:'USB-C адаптер',description:'Мощность 20 Вт. В комплект входит адаптер без кабеля.'});
const config={provider:'ollama' as const,model:'qwen3:14b',baseUrl:'http://127.0.0.1:11434',timeoutMs:180000};
const result={summary:'Черновик на основе указанных фактов.',items:[],draft:'USB-C адаптер 20 Вт. Кабель не входит в комплект.',warnings:[]};
const success=()=>Response.json({done:true,done_reason:'stop',message:{role:'assistant',content:JSON.stringify(result),thinking:'never show this'}});

test('Qwen3 14B is local by default; OpenAI requires explicit selection, key and opt-in',()=>{
 assert.deepEqual(readAiConfiguration({}),config);
 assert.deepEqual(readAiConfiguration({AI_PROVIDER:'ollama'}),config);
 assert.equal(readAiConfiguration({AI_ENABLED:'false'}),null);
 assert.equal(readAiConfiguration({AI_PROVIDER:'openai',OPENAI_API_KEY:'secret'}),null);
 assert.equal(readAiConfiguration({AI_PROVIDER:'openai',OPENAI_ENABLED:'true'}),null);
 assert.deepEqual(readAiConfiguration({OPENAI_ENABLED:'true',OPENAI_API_KEY:'test-only'}),config);
 assert.equal(readAiConfiguration({AI_ENABLED:'false',OPENAI_ENABLED:'true',OPENAI_API_KEY:'test-only'}),null);
 assert.equal(readAiConfiguration({AI_PROVIDER:'openai',OPENAI_ENABLED:'true',OPENAI_API_KEY:'test-only'})?.provider,'openai');
 assert.throws(()=>readAiConfiguration({AI_PROVIDER:'unknown'}),AiError);
 assert.throws(()=>readAiConfiguration({AI_PROVIDER:'ollama',OLLAMA_MODEL:'qwen:cloud'}),AiError);
 assert.throws(()=>readAiConfiguration({AI_PROVIDER:'ollama',OLLAMA_MODEL:'qwen3:14b-cloud'}),AiError);
 assert.throws(()=>readAiConfiguration({AI_PROVIDER:'ollama',OLLAMA_TIMEOUT_MS:'0'}),AiError);
});

test('Ollama endpoint cannot point to a remote site, credential, alternate path or redirect',()=>{
 for(const url of ['https://api.example.com','http://192.168.1.2:11434','http://127.0.0.1:11434/api/chat','http://u:p@localhost:11434','http://localhost:11434/?x=1','file:///tmp/model'])assert.throws(()=>ollamaOrigin(url),AiError);
 assert.equal(ollamaOrigin('http://[::1]:11434'),'http://[::1]:11434');
 assert.equal(ollamaOrigin('http://host.docker.internal:11434'),'http://host.docker.internal:11434');
});

test('Ollama uses the exact model and schema locally, with thinking disabled and no cloud fallback',async()=>{
 let calls=0;
 const mock:typeof fetch=async(url,options)=>{
  calls++;assert.equal(url,'http://127.0.0.1:11434/api/chat');assert.equal(options?.redirect,'error');
  assert.equal(new Headers(options?.headers).has('Authorization'),false);
  const body=JSON.parse(String(options?.body));assert.equal(body.model,'qwen3:14b');assert.equal(body.stream,false);assert.equal(body.think,false);assert.deepEqual(body.format,resultSchema);assert.equal(body.options.num_ctx,16384);
  const source=JSON.parse(body.messages[1].content);assert.equal(source.tool,'seo');assert.equal(Object.hasOwn(source,'review'),false);assert.equal(Object.hasOwn(source,'tone'),false);assert.ok(body.messages[0].content.includes('недоверенный'));
  return success();
 };
 assert.deepEqual(await generateAi(input,config,mock),result);assert.equal(calls,1);
});

test('model and provider errors are actionable without exposing response bodies',async()=>{
 for(const status of [404,429,500,503])await assert.rejects(()=>generateAi(input,config,async()=>new Response('private provider details',{status})),e=>e instanceof AiError&&!e.message.includes('private provider details')&&e.status===(status===429?429:503));
 await assert.rejects(()=>generateAi(input,config,async()=>{throw new Error('internal paths');}),e=>e instanceof AiError&&e.status===503&&!e.message.includes('internal paths'));
});

test('partial, truncated, empty, malformed and oversized local responses are not published',async()=>{
 for(const body of [{done:false},{done:true,done_reason:'length',message:{role:'assistant',content:JSON.stringify(result)}},{done:true,done_reason:'stop',message:{role:'assistant',content:''}},{done:true,done_reason:'stop',message:{role:'assistant',content:'invalid json'}}])await assert.rejects(()=>generateAi(input,config,async()=>Response.json(body)),AiError);
 await assert.rejects(()=>generateAi(input,config,async()=>new Response('x'.repeat(150001))),AiError);
 assert.deepEqual(await generateAi(input,config,async()=>success()),result);
});

test('local generation handles timeout and caller cancellation and releases its slot',async()=>{
 const waiting:typeof fetch=async(_url,options)=>new Promise((_resolve,reject)=>options?.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
 await assert.rejects(()=>generateAi(input,{...config,timeoutMs:5},waiting),e=>e instanceof AiError&&e.status===504);
 const controller=new AbortController();const job=generateAi(input,config,waiting,controller.signal);controller.abort();
 await assert.rejects(()=>job,e=>e instanceof AiError&&e.status===499);
 assert.deepEqual(await generateAi(input,config,async()=>success()),result);
});

test('a second local generation is rejected instead of competing for model memory',async()=>{
 let complete!:(value:Response)=>void;
 const first=generateAi(input,config,async()=>new Promise<Response>(resolve=>{complete=resolve;}));
 try{await assert.rejects(()=>generateAi(input,config,async()=>success()),e=>e instanceof AiError&&e.status===429);}
 finally{complete(success());await first;}
 assert.deepEqual(await generateAi(input,config,async()=>success()),result);
});
