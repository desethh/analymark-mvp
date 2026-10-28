import {median,calculate,minimumPrice,type Inputs} from './economics.ts';
import type {PublicPrice,PublicPrices} from './public-prices.ts';

export interface MarketStatistics {count:number;minimum:number;median:number;maximum:number;}
export interface MarketPriceBook {
 productId:string;url:string;city:string;currency:'KZT';prices:PublicPrice[];
 total:number|null;receivedCount:number;complete:boolean;statistics:MarketStatistics|null;
 fetchedFrom:string;fetchedTo:string;issue:string|null;
}
export interface PriceProgress {received:number;total:number|null;pages:number;}
export type PriceContext={productId:string;url:string;city:string};

/** Walk upstream pages before publishing any market statistics. Never deduplicate equal prices. */
export async function collectMarketPrices(
 context:PriceContext,
 fetchPage:(page:number)=>Promise<PublicPrices>,
 options:{pageSize:number;maxPages?:number;onProgress?:(progress:PriceProgress)=>void;signal?:AbortSignal}
):Promise<MarketPriceBook>{
 const prices:PublicPrice[]=[];let total:number|null=null,receivedCount=0,discarded=0,complete=false;
 let issue:string|null=null;const times:string[]=[];const maxPages=options.maxPages??250;
 for(let page=0;page<maxPages;page++){
  options.signal?.throwIfAborted();
  let next:PublicPrices;
  try{next=await fetchPage(page);}catch(e){
   options.signal?.throwIfAborted();
   if(!prices.length)throw e;
   issue=e instanceof Error?e.message:'Не удалось загрузить следующую страницу.';break;
  }
  options.signal?.throwIfAborted();
  if(next.productId!==context.productId||next.city!==context.city||next.url!==context.url||next.page!==page||next.pageSize!==options.pageSize){issue='Контекст страниц не совпал. Обновите список предложений.';break;}
  if(page===0)total=next.total;
  else if(next.total!==total){issue='Число предложений изменилось во время загрузки. Обновите список.';break;}
  times.push(next.fetchedAt);
  receivedCount+=next.receivedCount;discarded+=next.discardedCount;
  prices.push(...next.prices);
  options.onProgress?.({received:receivedCount,total,pages:page+1});
  if(total!==null&&receivedCount>total){issue='Kaspi вернул противоречивое количество предложений.';break;}
  if(!next.hasNext){
   complete=total!==null&&receivedCount===total&&discarded===0&&prices.length===total;
   if(!complete)issue=total===null?'Kaspi не указал общее число предложений. Полнота списка не подтверждена.':'Часть предложений отсутствует или содержит некорректную цену.';
   break;
  }
  if(next.receivedCount!==options.pageSize){issue='Страница Kaspi обрывается до конца списка. Полнота данных не подтверждена.';break;}
  if(page===maxPages-1)issue='Достигнут предел загрузки списка. Рыночная статистика недоступна: получены не все предложения.';
 }
 const values=prices.map(p=>p.price).sort((a,b)=>a-b);
 const statistics=complete&&values.length?{count:values.length,minimum:values[0],median:median(values)!,maximum:values[values.length-1]}:null;
 const fallback=new Date().toISOString();times.sort();
 return {...context,currency:'KZT',prices,total,receivedCount,complete,statistics,fetchedFrom:times[0]??fallback,fetchedTo:times[times.length-1]??fallback,issue};
}

/** Median is a market anchor, not a demand forecast. Solve each shipping interval above it. */
export function marketRecommendation(inputs:Inputs,book:MarketPriceBook|null){
 if(!book?.complete||!book.statistics)return null;
 const {minimum,median:anchor}=book.statistics;
 const candidate=minimumPrice(inputs,inputs.target,anchor);
 const price=candidate!==null&&candidate<=1e9?candidate:null;
 const scenarios=[{id:'minimum',label:'Минимум рынка',price:minimum},{id:'median',label:'Медиана рынка',price:anchor}].map(s=>({...s,...calculate(inputs,s.price),purchaseCap:Math.floor(calculate(inputs,s.price).maxPurchase)}));
 return {scenarios,price,aboveMedian:price!==null&&price>Math.ceil(anchor),purchaseCap:price===null?null:Math.floor(calculate(inputs,price).maxPurchase)};
}
