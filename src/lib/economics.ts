export type Market = 'kaspi' | 'ozon';
export type Direction = 'city' | 'country' | 'express';
export interface BatchExpense {id:string;name:string;amount:number;}
export interface BatchInputs {
 version:2; defective:number; saleQuantity:number|null;
 warehouseEnabled:boolean; warehouse:number;
 vatEnabled:boolean; vatRate:number; vatBase:number|null;
 expenses:BatchExpense[];
}
export const batchDefaults:BatchInputs={version:2,defective:0,saleQuantity:null,warehouseEnabled:false,warehouse:0,vatEnabled:false,vatRate:16,vatBase:null,expenses:[]};
export interface Inputs {
  market: Market; price: number; purchase: number; quantity: number;
  weight: number; length: number; width: number; height: number;
  commission: number; tax: number; packaging: number; advertising: number;
  reserve: number; other: number; inbound: number; target: number;
  direction: Direction; manualDelivery: number; useKaspiTariff: boolean;
  batch?:BatchInputs;
}
export const defaults: Inputs = {market:'kaspi',price:24990,purchase:12000,quantity:20,weight:1.2,length:30,width:20,height:15,commission:12.5,tax:4,packaging:200,advertising:400,reserve:0,other:0,inbound:6000,target:5000,direction:'country',manualDelivery:1500,useKaspiTariff:true,batch:{...batchDefaults,expenses:[]}};
export const sources = {
 delivery:'https://guide.kaspi.kz/cdn/content/pay/product/documents/Magazin/stoimost-servisa-kaspi-dostavka-s-1-1-2026.pdf',
 commission:'https://guide.kaspi.kz/cdn/content/pay/product/documents/Magazin/Tarify_Magazina_na_Kaspi_kz_2026.pdf',
 tax:'https://www.gov.kz/org/kgd/press/article/details/221941?lang=en',
 serviceVat:'https://guide.kaspi.kz/partner/ru/shop/conditions/q4521',
 importCosts:'https://www.gov.kz/memleket/entities/kgd/press/news/details/1305668?lang=ru',
 packaging:'https://guide.kaspi.kz/cdn/content/pay/product/documents/Magazin/Kak-upakovat-tovar-dlya-kaspi-dostavki_.pdf',
 ozon:'https://seller.ozon.kz/media/beginners/novye-usloviya-raboty-na-ozon-v-kazahstane/'
};
export function validateInputs(value: unknown): asserts value is Inputs {
 if(!value || typeof value !== 'object') throw new Error('Заполните параметры расчёта');
 const v=value as Record<string, unknown>;
 for(const key of Object.keys(defaults)) {
  if(typeof defaults[key as keyof Inputs]==='number' && (typeof v[key]!=='number'||!Number.isFinite(v[key])||(v[key] as number)<0||(v[key] as number)>1e9)) throw new Error(`Некорректное значение: ${key}`);
 }
 if(!['kaspi','ozon'].includes(String(v.market))||!['city','country','express'].includes(String(v.direction))||typeof v.useKaspiTariff!=='boolean') throw new Error('Некорректные настройки площадки');
 if((v.quantity as number)<1||(v.quantity as number)>1e6||!Number.isInteger(v.quantity)||(v.price as number)<1||(v.weight as number)<=0) throw new Error('Укажите цену, положительный вес и целое количество от 1 до 1 000 000');
 if((v.commission as number)+(v.tax as number)>=100) throw new Error('Сумма комиссии и налога должна быть меньше 100%');
 if(v.batch!==undefined){
  if(!v.batch||typeof v.batch!=='object'||Array.isArray(v.batch))throw new Error('Некорректные параметры партии');
  const b=v.batch as Record<string,unknown>,amount=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1e9;
  if(b.version!==2||typeof b.warehouseEnabled!=='boolean'||typeof b.vatEnabled!=='boolean'||!amount(b.warehouse)||!amount(b.vatRate)||b.vatRate>100||b.vatBase!==null&&!amount(b.vatBase))throw new Error('Проверьте склад и НДС закупки');
  if(!amount(b.defective)||!Number.isInteger(b.defective)||b.defective>=(v.quantity as number))throw new Error('Брак: укажите целое число меньше количества закупки. Должен остаться хотя бы один годный товар.');
  if(b.saleQuantity!==null&&(!amount(b.saleQuantity)||!Number.isInteger(b.saleQuantity)||b.saleQuantity>(v.quantity as number)-b.defective))throw new Error('Количество продаж не должно превышать остаток годных товаров');
  if(!Array.isArray(b.expenses)||b.expenses.length>30)throw new Error('Допускается не более 30 дополнительных расходов');
  const ids=new Set<string>();
  for(const row of b.expenses){
   if(!row||typeof row!=='object'||typeof row.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(row.id)||ids.has(row.id)||typeof row.name!=='string'||row.name.length>120||typeof row.amount!=='number'||!Number.isFinite(row.amount)||row.amount<0||row.amount>1e12)throw new Error('Проверьте дополнительные расходы');
   if(row.amount>0&&!row.name.trim())throw new Error('Укажите название каждого расхода с ненулевой суммой');ids.add(row.id);
  }
 }
 if(acquisitionCosts(value as Inputs).total>1e12)throw new Error('Общая стоимость партии не должна превышать 1 трлн ₸');
}

export function batchSettings(x:Inputs):BatchInputs{return x.batch??{...batchDefaults,expenses:[]};}

/** Cash costs allocated to this batch. Do not add purchase VAT twice. */
export function acquisitionCosts(x:Inputs){
 const b=batchSettings(x),purchase=x.purchase*x.quantity,packaging=x.packaging*x.quantity;
 const warehouse=b.warehouseEnabled?b.warehouse:0,vatBase=b.vatBase??purchase;
 const vat=b.vatEnabled?vatBase*b.vatRate/100:0;
 const extras=b.expenses.reduce((sum,row)=>sum+row.amount,0);
 const legacy=(x.reserve+x.other)*x.quantity;
 const total=purchase+x.inbound+packaging+warehouse+vat+extras+legacy;
 const goodQuantity=x.quantity-b.defective;
 return {purchase,packaging,warehouse,vat,vatBase,extras,legacy,total,goodQuantity,
  unitPurchased:total/Math.max(1,x.quantity),unitSaleable:total/Math.max(1,goodQuantity),
  saleQuantity:b.saleQuantity??goodQuantity};
}

/** Preserve old saved scenarios, including legacy reserves, and allowlist nested fields. */
export function normalizeInputs(value:unknown):Inputs{
 validateInputs(value);
 const x=Object.fromEntries(Object.keys(defaults).filter(key=>key!=='batch').map(key=>[key,value[key as keyof Inputs]])) as unknown as Inputs;
 const b=batchSettings(value);
 const expenses=b.expenses.map(row=>({id:row.id,name:row.name.trim(),amount:row.amount}));
 if(!value.batch){
  if(x.reserve)expenses.push({id:'legacy-reserve',name:'Резерв потерь из прежнего расчёта',amount:x.reserve*x.quantity});
  if(x.other)expenses.push({id:'legacy-other',name:'Прочие расходы из прежнего расчёта',amount:x.other*x.quantity});
  x.reserve=0;x.other=0;
 }
 return {...x,batch:{version:2,defective:b.defective,saleQuantity:b.saleQuantity,warehouseEnabled:b.warehouseEnabled,warehouse:b.warehouse,vatEnabled:b.vatEnabled,vatRate:b.vatRate,vatBase:b.vatBase,expenses}};
}
// Standard goods, one item per order; gross cash expense for a non-VAT payer.
// Exact published amounts excluding VAT, version effective 2026-01-01.
export function kaspiDelivery(price:number,weight:number,direction:Direction):number {
 const column={city:0,country:1,express:2}[direction];
 const small=price<1000?49.14:price<3000?149.14:price<5000?199.14:null;
 let base:number;
 if(small!==null) base=small;
 else if(price<10000) base=[699.14,799.14,799.14][column];
 else {
  const rows=[[1099.14,1299.14,1699.14],[1349.14,1699.14,1849.14],[2299.14,3599.14,3149.14],[2899.14,5649.14,3599.14],[4149.14,8549.14,5599.14],[6449.14,11999.14,8449.14]];
  const i=weight<=5?0:weight<=15?1:weight<=30?2:weight<=60?3:weight<=100?4:5;
  base=rows[i][column];
 }
 return Math.round(base*1.16*100)/100;
}
export function calculate(x:Inputs,price=x.price) {
 const batch=acquisitionCosts(x);
 const delivery=x.market==='kaspi'&&x.useKaspiTariff?kaspiDelivery(price,x.weight,x.direction):x.manualDelivery;
 const commission=price*x.commission/100, tax=price*x.tax/100;
 const inbound=x.inbound/Math.max(1,batch.goodQuantity);
 const saleCosts=delivery+x.advertising+commission+tax;
 const profit=price-saleCosts-batch.unitSaleable;
 const b=batchSettings(x),purchaseCostFactor=b.vatEnabled&&b.vatBase===null?1+b.vatRate/100:1;
 const nonPurchase=batch.total-batch.purchase*purchaseCostFactor;
 const maxPurchase=((price-saleCosts-x.target)*batch.goodQuantity-nonPurchase)/(Math.max(1,x.quantity)*purchaseCostFactor);
 return {price,delivery,commission,tax,inbound,profit,margin:price>0?profit/price*100:0,totalCosts:price-profit,maxPurchase,
  batch,unitCost:batch.unitSaleable,grossProfit:price-batch.unitSaleable,saleCosts,purchaseCostFactor,
  totalProfit:profit*batch.saleQuantity,allStockProfit:profit*batch.goodQuantity,
  revenue:price*batch.saleQuantity,soldCost:batch.unitSaleable*batch.saleQuantity,
  remainingQuantity:batch.goodQuantity-batch.saleQuantity,remainingCost:batch.unitSaleable*(batch.goodQuantity-batch.saleQuantity)};
}
// Shipping jumps make global binary search invalid. Solve each tariff interval.
export function minimumPrice(x:Inputs,target=0,lowerBound=1):number|null {
 try{validateInputs(x);}catch{return null;}
 const cuts=x.market==='kaspi'&&x.useKaspiTariff?[1,1000,3000,5000,10000,Infinity]:[1,Infinity];
 const rate=1-(x.commission+x.tax)/100;
 if(rate<=0) return null;
 for(let i=0;i<cuts.length-1;i++) {
  const lo=cuts[i],hi=cuts[i+1];
  const c=calculate(x,lo);
  const fixed=lo-c.commission-c.tax-c.profit;
  const candidate=Math.max(lo,Math.ceil(lowerBound),Math.ceil((fixed+target)/rate));
  if(candidate<hi&&calculate(x,candidate).profit>=target-0.001) return candidate;
 }
 return null;
}
export function median(values:number[]):number|null {if(!values.length)return null;const a=[...values].sort((a,b)=>a-b);const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
