'use client';
import {useEffect,useState} from 'react';
import type {PublicProduct} from './public-product';
import {collectMarketPrices,type MarketPriceBook,type PriceProgress} from './market-prices';

export function useMarketPrices(product:PublicProduct|null,city:string,market:string){
 const [state,setState]=useState<{key:string;book:MarketPriceBook|null;progress:PriceProgress|null;loading:boolean;error:string}>({key:'',book:null,progress:null,loading:false,error:''});
 const [revision,setRevision]=useState(0);
 const key=product&&market==='kaspi'?`${product.url}:${product.fetchedAt}:${city}:${revision}`:'';
 useEffect(()=>{
  if(!key||!product)return;
  const controller=new AbortController();let active=true;
  setState({key,book:null,progress:null,loading:true,error:''});
  void (async()=>{
   try{
    const book=await collectMarketPrices({productId:product.productId,url:product.url,city},async(page)=>{
     const response=await fetch('/api/kaspi/prices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:product.url,city,page}),signal:controller.signal});
     if(response.status===401)window.location.assign('/login');const data=await response.json();if(!response.ok)throw new Error(data.error||'Не удалось загрузить цены.');
     return data.snapshot;
    },{pageSize:20,signal:controller.signal,onProgress:progress=>{if(active)setState(s=>({...s,progress}));}});
    if(active)setState(s=>({...s,book,loading:false}));
   }catch(e){if(active&&!controller.signal.aborted)setState(s=>({...s,loading:false,error:e instanceof Error?e.message:'Не удалось загрузить цены.'}));}
  })();
  return()=>{active=false;controller.abort();};
 },[key,product?.url,product?.productId,city]);
 // Filter in render too: effects run after paint, so a previous city must never leak into guidance.
 const current=key&&state.key===key?state:{book:null,progress:null,loading:!!key,error:''};
 return {book:current.book,progress:current.progress,loading:current.loading,error:current.error,refresh:()=>setRevision(r=>r+1)};
}
