export const deliveryLabels={TO_DOOR:'Доставка',POSTOMAT:'Postomat',PICKUP:'Самовывоз',EXPRESS:'Express'} as const;
export interface PublicDelivery {type:keyof typeof deliveryLabels;days:number|null;cost:number|null;threshold:number|null;}
export interface PublicPrice {position:number;price:number;delivery:PublicDelivery[];}
export interface PublicPrices {
 productId:string;url:string;city:string;currency:'KZT';page:number;pageSize:number;
 total:number|null;prices:PublicPrice[];hasNext:boolean;complete:boolean;receivedCount:number;discardedCount:number;
 fetchedAt:string;source:'kaspi-public-offers';
}
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
function amount(v:unknown,allowZero=false):number|null{if(typeof v!=='number'&&typeof v!=='string')return null;if(v==='')return null;const n=Number(v);return Number.isFinite(n)&&n>=(allowZero?0:0.01)&&n<=1e9?n:null;}
/** Copy price and numeric delivery terms only. Merchant identity never crosses this boundary. */
export function parsePublicPrices(raw:unknown,context:{productId:string;url:string;city:string;page:number;pageSize:number},now=new Date().toISOString()):PublicPrices {
 const root=obj(raw);if(!Array.isArray(root.offers))throw new Error('Kaspi изменил формат публичного списка предложений.');
 if(root.offers.length>context.pageSize)throw new Error('Kaspi вернул больше строк, чем запрошено. Проверьте формат пагинации.');
 const totalValue=root.total??root.offersCount;
 const total=typeof totalValue==='number'&&Number.isInteger(totalValue)&&totalValue>=0&&totalValue<1e7?totalValue:null;
 const prices:PublicPrice[]=[];
 for(const [i,value] of root.offers.slice(0,context.pageSize).entries()){
  const x=obj(value);if(String(x.masterSku)!==context.productId)throw new Error('Список предложений относится к другому товару.');
  const price=amount(x.price);if(price===null)continue;
  const options=obj(x.deliveryOptions);const delivery:PublicDelivery[]=[];
  for(const type of Object.keys(deliveryLabels) as (keyof typeof deliveryLabels)[]){
   if(!options[type])continue;const option=obj(options[type]);const days=amount(option.deliveryDays,true);
   const threshold=amount(option.deliveryThreshold,true);
   delivery.push({type,days:days!==null&&Number.isInteger(days)&&days<=365?days:null,cost:amount(option.deliveryCost??option.cost,true),threshold:threshold!==null&&threshold<100_000_000?threshold:null});
  }
  prices.push({position:context.page*context.pageSize+i+1,price,delivery});
 }
 const end=(context.page+1)*context.pageSize;
 const hasNext=total!==null?end<total:root.offers.length>=context.pageSize;
 // Complete only if the entire response fits on the first page, with no discarded rows.
 const complete=context.page===0&&total!==null&&total===prices.length&&root.offers.length===prices.length;
 return {...context,currency:'KZT',total,prices,hasNext,complete,receivedCount:root.offers.length,discardedCount:root.offers.length-prices.length,fetchedAt:now,source:'kaspi-public-offers'};
}
