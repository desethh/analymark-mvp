import {logEvent} from '@/lib/observability';
import {currentAccount,unauthorized} from '@/lib/auth';
import {database} from '@/lib/storage';
import {cities,normalizeKaspiUrl} from '@/lib/public-product';
import {parsePublicPrices,type PublicPrices} from '@/lib/public-prices';
import {acquireKaspiSlot,readLimited} from '@/lib/kaspi-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!await currentAccount())return unauthorized();
 const origin=request.headers.get('origin');if(origin){try{if(new URL(origin).host!==request.headers.get('host'))return Response.json({error:'Недопустимый источник запроса'},{status:403});}catch{return Response.json({error:'Недопустимый источник запроса'},{status:403});}}
 let canonical:{url:string;productId:string},city:string,page:number;
 try{const raw=await request.text();if(raw.length>4096)throw new Error('Слишком длинный запрос');const body=JSON.parse(raw);if(typeof body.url!=='string'||body.url.length>2000||typeof body.city!=='string'||!Object.hasOwn(cities,body.city))throw new Error('Укажите товар и поддерживаемый город.');canonical=normalizeKaspiUrl(body.url);city=body.city;page=body.page??0;if(!Number.isInteger(page)||page<0||page>249)throw new Error('Недопустимый номер страницы.');}catch(e){return Response.json({error:e instanceof Error?e.message:'Проверьте запрос'},{status:400});}
 const db=database();db.exec('CREATE TABLE IF NOT EXISTS public_price_pages (cache_key TEXT PRIMARY KEY, payload TEXT NOT NULL, fetched_at INTEGER NOT NULL)');
 const key=`${canonical.productId}:${cities[city]}:${page}:20:v3`,cached=db.prepare('SELECT payload,fetched_at FROM public_price_pages WHERE cache_key=?').get(key);
 if(cached&&Date.now()-Number(cached.fetched_at)<5*60*1000)return Response.json({snapshot:JSON.parse(String(cached.payload)) as PublicPrices,cached:true});
 try{await acquireKaspiSlot();}catch(e){return Response.json({error:(e as Error).message},{status:429,headers:{'Retry-After':'10'}});}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch(`https://kaspi.kz/yml/offer-view/offers/${canonical.productId}`,{method:'POST',redirect:'manual',signal:controller.signal,cache:'no-store',headers:{'User-Agent':'AnalyMarkMVP/0.1 (public product prices)','Content-Type':'application/json','Accept':'application/json','Referer':canonical.url},body:JSON.stringify({cityId:cities[city],id:canonical.productId,limit:20,page,sortOption:'PRICE'})});
  if(!response.ok)throw new Error(`Kaspi не отдал список цен (HTTP ${response.status}). Повторите позднее.`);
  if(!response.headers.get('content-type')?.includes('json'))throw new Error('Вместо списка цен получен другой ответ Kaspi.');
  const snapshot=parsePublicPrices(JSON.parse(await readLimited(response)),{...canonical,city,page,pageSize:20});
  db.prepare('INSERT OR REPLACE INTO public_price_pages VALUES (?,?,?)').run(key,JSON.stringify(snapshot),Date.now());
  return Response.json({snapshot,cached:false});
 }catch(e){logEvent('kaspi.prices.failed',502);return Response.json({error:controller.signal.aborted?'Kaspi не ответил за 20 секунд. Повторите позднее.':e instanceof Error&&e.message!=='fetch failed'?e.message:'Нет соединения с Kaspi.'},{status:502});}finally{clearTimeout(timer);}
}
