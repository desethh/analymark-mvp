import {currentAccount,unauthorized} from '@/lib/auth';
import {database} from '@/lib/storage';
import {cities,normalizeKaspiUrl,type PublicProduct} from '@/lib/public-product';
import {parseKaspiProduct} from '@/lib/kaspi-parser';
import {acquireKaspiSlot,readLimited} from '@/lib/kaspi-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const cacheMs=15*60*1000;
export async function POST(request:Request){
 if(!await currentAccount())return unauthorized();
 const origin=request.headers.get('origin');if(origin){try{if(new URL(origin).host!==request.headers.get('host'))return Response.json({error:'Недопустимый источник запроса'},{status:403});}catch{return Response.json({error:'Недопустимый источник запроса'},{status:403});}}
 let canonical:{url:string;productId:string},city:string;
 try{const raw=await request.text();if(raw.length>4096)throw new Error('Слишком длинный запрос');const body=JSON.parse(raw);if(typeof body.url!=='string'||body.url.length>2000||typeof body.city!=='string'||!Object.hasOwn(cities,body.city))throw new Error('Укажите ссылку и поддерживаемый город.');canonical=normalizeKaspiUrl(body.url);city=body.city;}catch(e){return Response.json({error:e instanceof Error?e.message:'Проверьте ссылку'},{status:400});}
 const db=database();db.exec('CREATE TABLE IF NOT EXISTS public_products (cache_key TEXT PRIMARY KEY, payload TEXT NOT NULL, fetched_at INTEGER NOT NULL)');
 const key=canonical.productId+':'+cities[city]+':v2';const cached=db.prepare('SELECT payload,fetched_at FROM public_products WHERE cache_key=?').get(key);
 if(cached&&Date.now()-Number(cached.fetched_at)<cacheMs)return Response.json({product:JSON.parse(String(cached.payload)) as PublicProduct,cached:true});
 try{await acquireKaspiSlot();}catch(e){return Response.json({error:(e as Error).message},{status:429,headers:{'Retry-After':'10'}});}
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
 try{
  const fetchUrl=new URL(canonical.url);fetchUrl.searchParams.set('c',cities[city]);
  const response=await fetch(fetchUrl,{redirect:'manual',signal:controller.signal,cache:'no-store',headers:{'User-Agent':'AnalyMarkMVP/0.1 (public product metadata)','Accept':'text/html','Accept-Language':'ru-KZ,ru;q=0.9'}});
  if(!response.ok)throw new Error(response.status===404?'Товар не найден. Проверьте ссылку.':`Kaspi не отдал публичную карточку (HTTP ${response.status}). Попробуйте позднее.`);
  if(!response.headers.get('content-type')?.includes('text/html')||!response.body)throw new Error('Kaspi вернул неожиданный формат страницы.');
  const html=await readLimited(response);const product=parseKaspiProduct(html,canonical.url,city);
  db.prepare('INSERT OR REPLACE INTO public_products VALUES (?,?,?)').run(key,JSON.stringify(product),Date.now());
  return Response.json({product,cached:false});
 }catch(e){const error=e instanceof Error?e.message:'Не удалось загрузить товар';return Response.json({error:controller.signal.aborted?'Kaspi не ответил за 20 секунд. Попробуйте позднее.':error==='fetch failed'?'Нет соединения с Kaspi. Проверьте доступ сервера к сети.':error},{status:502});}
 finally{clearTimeout(timeout);}
}
