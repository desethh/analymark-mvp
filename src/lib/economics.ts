export type Market = 'kaspi' | 'ozon';
export type Direction = 'city' | 'country' | 'express';
export interface Inputs {
  market: Market; price: number; purchase: number; quantity: number;
  weight: number; length: number; width: number; height: number;
  commission: number; tax: number; packaging: number; advertising: number;
  reserve: number; other: number; inbound: number; target: number;
  direction: Direction; manualDelivery: number; useKaspiTariff: boolean;
}
export const defaults: Inputs = {market:'kaspi',price:24990,purchase:12000,quantity:20,weight:1.2,length:30,width:20,height:15,commission:12.5,tax:4,packaging:200,advertising:400,reserve:0,other:0,inbound:6000,target:5000,direction:'country',manualDelivery:1500,useKaspiTariff:true};
export const sources = {
 delivery:'https://guide.kaspi.kz/cdn/content/pay/product/documents/Magazin/stoimost-servisa-kaspi-dostavka-s-1-1-2026.pdf',
 commission:'https://guide.kaspi.kz/cdn/content/pay/product/documents/Magazin/Tarify_Magazina_na_Kaspi_kz_2026.pdf',
 tax:'https://www.gov.kz/memleket/entities/kgd-vko/press/article/details/219504',
 ozon:'https://seller.ozon.kz/media/beginners/novye-usloviya-raboty-na-ozon-v-kazahstane/'
};
export function validateInputs(value: unknown): asserts value is Inputs {
 if(!value || typeof value !== 'object') throw new Error('Заполните параметры расчёта');
 const v=value as Record<string, unknown>;
 for(const key of Object.keys(defaults)) {
  if(typeof defaults[key as keyof Inputs]==='number' && (typeof v[key]!=='number'||!Number.isFinite(v[key])||(v[key] as number)<0||(v[key] as number)>1e9)) throw new Error(`Некорректное значение: ${key}`);
 }
 if(!['kaspi','ozon'].includes(String(v.market))||!['city','country','express'].includes(String(v.direction))||typeof v.useKaspiTariff!=='boolean') throw new Error('Некорректные настройки площадки');
 if((v.quantity as number)<1||!Number.isInteger(v.quantity)||(v.price as number)<1||(v.weight as number)<=0) throw new Error('Укажите цену, положительный вес и целое количество от 1');
 if((v.commission as number)+(v.tax as number)>=100) throw new Error('Сумма комиссии и налога должна быть меньше 100%');
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
 const delivery=x.market==='kaspi'&&x.useKaspiTariff?kaspiDelivery(price,x.weight,x.direction):x.manualDelivery;
 const commission=price*x.commission/100, tax=price*x.tax/100;
 const inbound=x.inbound/x.quantity;
 const fixed=delivery+x.packaging+x.advertising+x.reserve+x.other+inbound;
 const profit=price-commission-tax-fixed-x.purchase;
 return {price,delivery,commission,tax,inbound,profit,margin:price>0?profit/price*100:0,totalCosts:price-profit,maxPurchase:price-commission-tax-fixed-x.target};
}
// Shipping jumps make global binary search invalid. Solve each tariff interval.
export function minimumPrice(x:Inputs,target=0,lowerBound=1):number|null {
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
