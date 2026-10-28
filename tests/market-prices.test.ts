import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectMarketPrices,marketRecommendation,type PriceProgress} from '../src/lib/market-prices.ts';
import {parsePublicPrices} from '../src/lib/public-prices.ts';
import {calculate,defaults,minimumPrice} from '../src/lib/economics.ts';
const context={productId:'149595086',url:'https://kaspi.kz/shop/p/test-149595086/',city:'Алматы'};
function page(values:number[],total:number|null,index=0,pageSize=2){
 return parsePublicPrices({...(total===null?{}:{total}),offers:values.map(price=>({masterSku:context.productId,price,merchantName:'DO_NOT_KEEP'}))},{...context,page:index,pageSize},`2026-10-29T00:00:${String(index).padStart(2,'0')}.000Z`);
}
test('All pages, not page medians: weighted collection retains every offer',async()=>{
 const progress:PriceProgress[]=[];
 const pages=[page([10,10],5),page([20,90],5,1),page([100],5,2)];
 const book=await collectMarketPrices(context,async i=>pages[i],{pageSize:2,onProgress:p=>progress.push(p)});
 assert.equal(book.complete,true);assert.deepEqual(book.statistics,{count:5,minimum:10,median:20,maximum:100});
 assert.deepEqual(book.prices.map(p=>p.position),[1,2,3,4,5]);
 assert.equal(progress.at(-1)?.received,5);assert.equal(book.fetchedFrom,pages[0].fetchedAt);assert.equal(book.fetchedTo,pages[2].fetchedAt);
 assert.ok(!JSON.stringify(book).includes('DO_NOT_KEEP'));
});
test('Real observed nine-price example: median is 7696, not first visible page 4222',async()=>{
 const values=[4214,4221,4222,7167,7696,14999,15000,16800,34000];
 const book=await collectMarketPrices(context,async()=>page(values,9,0,20),{pageSize:20});
 assert.deepEqual(book.statistics,{count:9,minimum:4214,median:7696,maximum:34000});
 // Local table slices cannot affect the full collection.
 assert.equal(book.prices.slice(5).length,4);assert.equal(book.statistics?.median,7696);
});
test('Even median keeps half-tenge precision and equal prices are not deduplicated',async()=>{
 const book=await collectMarketPrices(context,async()=>page([100,100,101,102],4,0,20),{pageSize:20});
 assert.equal(book.statistics?.median,100.5);assert.equal(book.statistics?.count,4);
});
test('Later page failure keeps partial rows but never exposes market guidance',async()=>{
 const book=await collectMarketPrices(context,async i=>{if(i)throw new Error('Kaspi unavailable');return page([10,20],4);},{pageSize:2});
 assert.equal(book.complete,false);assert.equal(book.prices.length,2);assert.equal(book.statistics,null);assert.match(book.issue!,/unavailable/);
 assert.equal(marketRecommendation(defaults,book),null);
});
test('Count changes and city/product/page mismatches cannot yield complete statistics',async()=>{
 for(const second of [page([30,40],5,1),{...page([30,40],4,1),city:'Астана'},{...page([30,40],4,1),productId:'other'},{...page([30,40],4,1),page:0}]){
  const book=await collectMarketPrices(context,async i=>i?second:page([10,20],4),{pageSize:2});
  assert.equal(book.complete,false);assert.equal(book.statistics,null);assert.ok(book.issue);
 }
});
test('Invalid price, truncated page, unknown count and page limit stay incomplete',async()=>{
 const invalid=await collectMarketPrices(context,async()=>page([10,0],2),{pageSize:2});
 const short=await collectMarketPrices(context,async()=>page([10],4),{pageSize:2});
 const unknown=await collectMarketPrices(context,async()=>page([10],null),{pageSize:2});
 const bounded=await collectMarketPrices(context,async i=>page([10,20],6,i),{pageSize:2,maxPages:2});
 for(const book of [invalid,short,unknown,bounded]){assert.equal(book.complete,false);assert.equal(book.statistics,null);assert.ok(book.issue);}
});
test('Empty complete source has no price recommendation, initial error propagates',async()=>{
 const empty=await collectMarketPrices(context,async()=>page([],0),{pageSize:2});
 assert.equal(empty.complete,true);assert.equal(empty.statistics,null);assert.equal(marketRecommendation(defaults,empty),null);
 await assert.rejects(collectMarketPrices(context,async()=>{throw new Error('Initial failure');},{pageSize:2}),/Initial failure/);
});
test('Cancellation rejects collection instead of publishing stale city statistics',async()=>{
 const controller=new AbortController();
 await assert.rejects(collectMarketPrices(context,async()=>{controller.abort();return page([10,20],2);},{pageSize:2,signal:controller.signal}),{name:'AbortError'});
});
test('Recommendation uses median plus costs; caps really preserve target profit',async()=>{
 const book=await collectMarketPrices(context,async()=>page([4214,4221,4222,7167,7696,14999,15000,16800,34000],9,0,20),{pageSize:20});
 const advice=marketRecommendation(defaults,book)!;
 assert.equal(advice.scenarios[0].price,4214);assert.equal(advice.scenarios[1].price,7696);
 assert.ok(advice.price!>=book.statistics!.median);assert.ok(calculate(defaults,advice.price!).profit>=defaults.target);assert.equal(advice.aboveMedian,true);
 for(const s of [...advice.scenarios,{price:advice.price!,purchaseCap:advice.purchaseCap!}]){
  if(s.purchaseCap>=0)assert.ok(calculate({...defaults,purchase:s.purchaseCap},s.price).profit>=defaults.target-1e-6);
 }
 const changed=marketRecommendation({...defaults,purchase:15000},book)!;
 assert.ok(changed.price!>advice.price!);
});
test('Recommendation handles shipping jumps above median instead of max(anchor, goal floor)',async()=>{
 const inputs={...defaults,purchase:7000,inbound:0,advertising:0,packaging:0,tax:0,commission:0,target:2000};
 assert.equal(minimumPrice(inputs,inputs.target),9927);
 assert.ok(calculate(inputs,10000).profit<inputs.target);
 const book=await collectMarketPrices(context,async()=>page([10000],1),{pageSize:2});
 const advice=marketRecommendation(inputs,book)!;
 assert.equal(advice.price,10507);assert.ok(calculate(inputs,advice.price!).profit>=2000);
});
test('Affordable median rounds up; unrepresentable recommendation does not enter inputs',async()=>{
 const book=await collectMarketPrices(context,async()=>page([30000,30001],2),{pageSize:2});
 const affordable=marketRecommendation(defaults,book)!;assert.equal(affordable.price,30001);assert.equal(affordable.aboveMedian,false);
 const impossible=marketRecommendation({...defaults,purchase:1e9,commission:99,tax:0},book)!;
 assert.equal(impossible.price,null);assert.equal(impossible.purchaseCap,null);
});
