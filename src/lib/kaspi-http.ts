// One small process-wide queue for both card and offer requests, including HMR.
const state=globalThis as typeof globalThis & {kaspiNextRequestAt?:number};
export class KaspiRateError extends Error {}
export async function acquireKaspiSlot(){
 const now=Date.now();const start=Math.max(now,state.kaspiNextRequestAt??0);
 if(start-now>10500)throw new KaspiRateError('Запросы уже выполняются. Повторите через 10 секунд.');
 state.kaspiNextRequestAt=start+10000;
 if(start>now)await new Promise(resolve=>setTimeout(resolve,start-now));
}
export async function readLimited(response:Response,maxBytes=4_000_000):Promise<string>{
 if(!response.body)throw new Error('Получен пустой ответ Kaspi.');
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();throw new Error('Ответ Kaspi превышает допустимый размер.');}chunks.push(value);}
 return Buffer.concat(chunks).toString('utf8');
}
