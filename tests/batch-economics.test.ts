import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,batchDefaults,acquisitionCosts,calculate,normalizeInputs,validateInputs,minimumPrice,type Inputs} from '../src/lib/economics.ts';

const close=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);
function sample():Inputs{return {...defaults,purchase:400,quantity:10,inbound:100,packaging:20,price:1000,commission:12.5,tax:4,advertising:10,useKaspiTariff:false,manualDelivery:100,target:100,batch:{...batchDefaults,defective:2,warehouseEnabled:true,warehouse:300,expenses:[{id:'inspection',name:'Проверка',amount:50}]}};}

test('batch spending, defects, unit cost and full-stock profit reconcile without double counting',()=>{
 const x=sample();validateInputs(x);const r=calculate(x);
 assert.equal(r.batch.total,4650);assert.equal(r.batch.goodQuantity,8);
 assert.equal(r.batch.unitPurchased,465);assert.equal(r.unitCost,581.25);
 assert.equal(r.grossProfit,418.75);assert.equal(r.saleCosts,275);
 assert.equal(r.profit,143.75);assert.equal(r.totalProfit,1150);
 close(r.totalProfit,x.price*8-r.saleCosts*8-r.batch.total);
});

test('a partial sale allocates unit costs and keeps unsold goods in inventory',()=>{
 const x=sample();x.batch!.saleQuantity=5;const r=calculate(x);
 assert.equal(r.totalProfit,718.75);assert.equal(r.remainingQuantity,3);assert.equal(r.remainingCost,1743.75);
 close(r.soldCost+r.remainingCost,r.batch.total);assert.equal(r.allStockProfit,1150);
 x.batch!.saleQuantity=0;assert.equal(calculate(x).totalProfit,0);assert.equal(calculate(x).remainingCost,4650);
});

test('warehouse and added purchase VAT are opt-in; revenue tax has a different base',()=>{
 const x=sample();x.batch!.warehouseEnabled=false;
 assert.equal(acquisitionCosts(x).warehouse,0);assert.equal(acquisitionCosts(x).total,4350);
 x.batch!.vatEnabled=true;const r=calculate(x);
 assert.equal(r.batch.vat,640);assert.equal(r.batch.total,4990);assert.equal(r.tax,40);
 x.batch!.vatBase=5000;assert.equal(acquisitionCosts(x).vat,800);
 x.batch!.vatEnabled=false;assert.equal(acquisitionCosts(x).vat,0);
});

test('purchase ceilings preserve target profit with defects and either VAT base',()=>{
 for(const base of [undefined,null,5000]){
  const x=sample();if(base!==undefined){x.batch!.vatEnabled=true;x.batch!.vatBase=base;}
  const r=calculate(x),cap=r.maxPurchase;
  close(calculate({...x,purchase:cap}).profit,x.target);
  assert.ok(calculate({...x,purchase:Math.floor(cap)}).profit>=x.target-1e-6);
  const extra=30,routeCap=cap-extra/r.purchaseCostFactor;
  const changed={...x,purchase:routeCap,batch:{...x.batch!,expenses:[...x.batch!.expenses,{id:'route',name:'Поставка',amount:extra*x.quantity}]}};
  close(calculate(changed).profit,x.target);
 }
});

test('break-even solving and target prices include batch expenses and shipping jumps',()=>{
 const x=sample();x.useKaspiTariff=true;x.batch!.vatEnabled=true;
 const p=minimumPrice(x,x.target)!;assert.ok(calculate(x,p).profit>=x.target-1e-6);
 for(let candidate=1;candidate<p;candidate++)assert.ok(calculate(x,candidate).profit<x.target);
});

test('legacy saved costs migrate once, retain their financial result and strip unknown fields',()=>{
 const old={...defaults,reserve:20,other:30} as Record<string,unknown>;delete old.batch;
 const before=calculate(old as unknown as Inputs).profit;
 const normalized=normalizeInputs({...old,secret:'discarded'});
 assert.equal(normalized.reserve,0);assert.equal(normalized.other,0);assert.equal(normalized.batch?.expenses.length,2);
 assert.equal(normalized.batch?.expenses.reduce((sum,row)=>sum+row.amount,0),1000);
 close(calculate(normalized).profit,before);assert.deepEqual(normalizeInputs(normalized),normalized);
 assert.equal(Object.hasOwn(normalized,'secret'),false);
 const newInput=normalizeInputs({...sample(),batch:{...sample().batch!,secret:'discarded',expenses:[{id:'one',name:' Check ',amount:50,secret:'discarded'}]}});
 assert.equal(Object.hasOwn(newInput.batch!,'secret'),false);assert.deepEqual(newInput.batch!.expenses,[{id:'one',name:'Check',amount:50}]);
});

test('invalid quantities, duplicates, names, nonfinite costs and all-defect batches cannot be saved',()=>{
 const x=sample();
 for(const batch of [
  {...x.batch!,defective:10},{...x.batch!,defective:1.5},{...x.batch!,saleQuantity:9},{...x.batch!,saleQuantity:-1},
  {...x.batch!,warehouse:NaN},{...x.batch!,vatRate:101},{...x.batch!,vatBase:-1},
  {...x.batch!,expenses:[{id:'one',name:'',amount:1}]},{...x.batch!,expenses:[{id:'one',name:'X',amount:Infinity}]},
  {...x.batch!,expenses:[{id:'one',name:'X',amount:1},{id:'one',name:'Y',amount:1}]}
 ])assert.throws(()=>validateInputs({...x,batch}));
 assert.equal(minimumPrice({...x,batch:{...x.batch!,defective:10}}),null);
 assert.throws(()=>validateInputs({...x,purchase:1e9,quantity:1e6}));
});
