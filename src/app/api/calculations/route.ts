import { randomUUID } from 'node:crypto';
import { database } from '@/lib/storage';
import { validateInputs } from '@/lib/economics';
import {sanitizeProduct} from '@/lib/public-product';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function sameOrigin(request:Request){
 const origin=request.headers.get('origin');
 if(!origin)return true;
 try{return new URL(origin).host===request.headers.get('host');}catch{return false;}
}
export async function GET(){return Response.json(database().prepare('SELECT id,name,payload,created_at FROM calculations ORDER BY created_at DESC LIMIT 100').all().map(r=>{const old=JSON.parse(String(r.payload));const offers=(Array.isArray(old.offers)?old.offers:[]).flatMap((o:unknown)=>{try{return [sanitizeProduct(o)];}catch{return [];}});let product=null;try{if(old.product)product=sanitizeProduct(old.product);}catch{}return {...r,payload:{name:old.name,inputs:old.inputs,url:old.url,city:old.city,demo:old.demo,routes:old.routes,offers,product}};}));}
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:'Недопустимый источник запроса'},{status:403});
 try {
  const raw=await request.text();if(raw.length>128000)throw new Error('Расчёт слишком большой');
  const body=JSON.parse(raw);validateInputs(body.inputs);
  if(typeof body.name!=='string'||!body.name.trim()||body.name.length>200)throw new Error('Укажите название до 200 символов');
  if(!Array.isArray(body.offers)||body.offers.length>100)throw new Error('Не более 100 предложений');
  if(!Array.isArray(body.routes)||body.routes.length!==3||body.routes.some((r: {name:unknown;cost:unknown})=>typeof r.name!=='string'||r.name.length>200||typeof r.cost!=='number'||!Number.isFinite(r.cost)||r.cost<0||r.cost>1e9))throw new Error('Некорректные сценарии поставок');
  const offers=body.offers.map(sanitizeProduct);
  const product=body.product?sanitizeProduct(body.product):null;
  if(typeof body.demo!=='boolean'||typeof body.city!=='string'||body.city.length>100||typeof body.url!=='string'||body.url.length>2000)throw new Error('Некорректные данные товара');
  const payload={name:body.name.trim(),inputs:body.inputs,offers,product,url:body.url,city:body.city,demo:body.demo,routes:body.routes};
  const id=randomUUID();database().prepare('INSERT INTO calculations VALUES (?,?,?,?)').run(id,body.name.trim(),JSON.stringify(payload),new Date().toISOString());return Response.json({id},{status:201});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Не удалось сохранить'},{status:400});}
}
export async function DELETE(request:Request){
 if(!sameOrigin(request))return Response.json({error:'Недопустимый источник запроса'},{status:403});
 const id=new URL(request.url).searchParams.get('id');if(!id)return Response.json({error:'Нет ID'},{status:400});
 database().prepare('DELETE FROM calculations WHERE id=?').run(id);return Response.json({ok:true});
}
