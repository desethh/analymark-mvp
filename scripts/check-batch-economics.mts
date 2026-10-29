import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database} from '../src/lib/storage.ts';
import {defaults,batchDefaults,calculate,normalizeInputs} from '../src/lib/economics.ts';

const base='http://127.0.0.1:3000',email='qa-batch-'+randomUUID()+'@example.invalid',password=randomUUID();
let cookie='';
async function call(path:string,body?:unknown){return fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});}
const inputs={...defaults,purchase:400,quantity:10,inbound:100,packaging:20,price:1000,advertising:10,useKaspiTariff:false,manualDelivery:100,batch:{...batchDefaults,defective:2,saleQuantity:5,warehouseEnabled:true,warehouse:300,expenses:[{id:'inspection',name:'Проверка',amount:50}]}};
const payload={name:'QA batch economics',inputs,offers:[],product:null,url:'',city:'Алматы',demo:false,routes:[{name:'Город',cost:0},{name:'Другой город',cost:300},{name:'Импорт',cost:1500}]};
try{
 let r=await call('/api/auth/register',{email,password,name:'Batch QA',acceptPrivacy:true});assert.equal(r.status,200,await r.clone().text());cookie=r.headers.get('set-cookie')!.split(';')[0];
 r=await call('/api/calculations',payload);assert.equal(r.status,201,await r.clone().text());const {id}=await r.json();
 let saved=(await (await call('/api/calculations')).json()).find((row:{id:string})=>row.id===id);
 assert.deepEqual(saved.payload.inputs,normalizeInputs(inputs));assert.equal(calculate(saved.payload.inputs).batch.total,4650);assert.equal(calculate(saved.payload.inputs).totalProfit,718.75);
 for(const batch of [{...inputs.batch,defective:10},{...inputs.batch,saleQuantity:9},{...inputs.batch,expenses:[{id:'x',name:'',amount:100}]}])assert.equal((await call('/api/calculations',{...payload,inputs:{...inputs,batch}})).status,400);
 const db=database(),user=db.prepare('SELECT id FROM users WHERE email=?').get(email)!;
 const old={...defaults,reserve:20,other:30};delete old.batch;
 const legacyId=randomUUID();db.prepare('INSERT INTO calculations (id,name,payload,created_at,user_id) VALUES (?,?,?,?,?)').run(legacyId,'QA legacy',JSON.stringify({...payload,inputs:old}),new Date().toISOString(),user.id);
 saved=(await (await call('/api/calculations')).json()).find((row:{id:string})=>row.id===legacyId);
 assert.equal(saved.payload.inputs.batch.version,2);assert.equal(saved.payload.inputs.batch.expenses.length,2);assert.equal(calculate(saved.payload.inputs).profit,calculate(old).profit);
 console.log('PASS: batch save/reopen, named expenses, warehouse, defects, selected sales, invalid-input rejection, and legacy compatibility.');
}finally{if(cookie){const r=await call('/api/account/delete',{password});assert.equal(r.status,200);}}
