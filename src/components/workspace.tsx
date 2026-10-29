'use client';
import Link from 'next/link';
import { useEffect, useState, useRef, useCallback } from 'react';
import {ProductEconomics} from '@/components/product-economics';
import {WorkspaceGuide,type GuideTab} from '@/components/workspace-guide';
import { type PublicProduct } from '@/lib/public-product';
import { useMarketPrices } from '@/lib/use-market-prices';
import { marketRecommendation } from '@/lib/market-prices';
import { MarketGuidance } from '@/components/market-guidance';
import { KaspiPrices } from '@/components/kaspi-prices';
import { MarketplaceLogo } from '@/components/marketplace-logo';
import { ArrowUpRight, ArrowRight, Plus, Bookmark, ChartNoAxesCombined, SlidersHorizontal, BookOpen, ChevronRight, Check, X, Link as LinkIcon, Headphones, Trash2, Menu, LayoutGrid, Search, Database, Wrench, CircleHelp } from 'lucide-react';
import { calculate, defaults, sources, validateInputs, normalizeInputs, type Inputs, type Market } from '@/lib/economics';

async function sessionFetch(input:RequestInfo|URL,init?:RequestInit){const response=await fetch(input,init);if(response.status===401)window.location.assign('/login');return response;}

type Saved={id:string;name:string;created_at:string;payload:{name:string;inputs:Inputs;product?:PublicProduct|null;url:string;city:string;demo:boolean;routes?:{name:string;cost:number}[]}};
const money=(n:number)=>new Intl.NumberFormat('ru-KZ',{maximumFractionDigits:0}).format(n)+'\u00a0₸';
const analysisTabs = [{id:'market',label:'Рынок',icon:ChartNoAxesCombined},{id:'economics',label:'Экономика товара',icon:SlidersHorizontal},{id:'suppliers',label:'Закупка у поставщика',icon:LinkIcon}] as const;
const number=(n:number)=>new Intl.NumberFormat('ru-KZ',{maximumFractionDigits:1}).format(n);
export default function Workspace({accountName,initialTab='market',showGuide=false}:{accountName:string;initialTab?:'market'|'economics'|'suppliers';showGuide?:boolean}){
 const [guideOpen,setGuideOpen]=useState(showGuide);
 const [sidebarSelection,setSidebarSelection]=useState('overview');
 const [analysisTab,setAnalysisTab]=useState<(typeof analysisTabs)[number]['id']>(initialTab);
 function tabKey(e:React.KeyboardEvent<HTMLButtonElement>,index:number){
  const last=analysisTabs.length-1;
  const next=e.key==='ArrowRight'?(index+1)%analysisTabs.length:e.key==='ArrowLeft'?(index+last)%analysisTabs.length:e.key==='Home'?0:e.key==='End'?last:null;
  if(next===null)return;e.preventDefault();setAnalysisTab(analysisTabs[next].id);e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus();
 }
 const [inputs,setInputs]=useState<Inputs>(defaults),[name,setName]=useState('Добавьте товар по ссылке');
 const [demo,setDemo]=useState(false),[url,setUrl]=useState(''),[city,setCity]=useState('Алматы');
 const [view,setView]=useState<'analysis'|'saved'|'method'>('analysis'),[saved,setSaved]=useState<Saved[]>([]),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const [saving,setSaving]=useState(false),[mobile,setMobile]=useState(false);
 const [productName,setProductName]=useState(''),[product,setProduct]=useState<PublicProduct|null>(null),[loading,setLoading]=useState(false);
 const requestVersion=useRef(0),sidebarRef=useRef<HTMLElement>(null),mainRef=useRef<HTMLDivElement>(null);
 const [routes,setRoutes]=useState([{name:'В своём городе',cost:0},{name:'Другой город Казахстана',cost:300},{name:'Импорт · полная доплата',cost:1500}]);
 const put=<K extends keyof Inputs>(k:K,v:Inputs[K])=>setInputs(x=>({...x,[k]:v}));
 let invalid='';try{validateInputs(inputs);}catch(e){invalid=(e as Error).message;}
 const result=calculate(inputs);
 const marketPrices=useMarketPrices(product,city,inputs.market);
 const marketStats=marketPrices.book?.complete?marketPrices.book.statistics:null;
 const recommendation=invalid?null:marketRecommendation(inputs,marketPrices.book);
 const guidance=(purchase=false)=><MarketGuidance {...marketPrices} inputs={inputs} invalid={invalid} onRefresh={marketPrices.refresh} onUsePrice={price=>put('price',price)} purchase={purchase}/>;
 async function refresh(){try{const r=await sessionFetch('/api/calculations');if(!r.ok)throw new Error();setSaved(await r.json());}catch{setError('Не удалось загрузить сохранённые расчёты. Проверьте сервер.');}}
 useEffect(()=>{void refresh();},[]);
 const navigateGuide=useCallback((tab:GuideTab)=>{setMobile(false);setView('analysis');setAnalysisTab(tab);},[]);
 async function dismissGuide(startProduct:boolean){
  try{const r=await sessionFetch('/api/account/onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',keepalive:true,signal:AbortSignal.timeout(5000)});if(!r.ok)throw new Error();}
  catch{setError('Не удалось сохранить завершение обучения. При следующем входе оно может открыться снова.');}
  setGuideOpen(false);
  if(startProduct){setView('analysis');setAnalysisTab('market');requestAnimationFrame(()=>{const field=document.getElementById('product-url');field?.scrollIntoView({block:'center',behavior:'instant'});field?.focus({preventScroll:true});});}
  else requestAnimationFrame(()=>document.getElementById('main-content')?.focus({preventScroll:true}));
 }

 useEffect(()=>{
  if(!mobile)return;
  const aside=sidebarRef.current!,main=mainRef.current!,previous=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;
  main.inert=true;document.body.style.overflow='hidden';
  aside.querySelector<HTMLButtonElement>('.sidebar-close')?.focus();
  const closeOnDesktop=()=>{if(window.innerWidth>767)setMobile(false);};
  const keydown=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.preventDefault();setMobile(false);return;}
   if(e.key!=='Tab')return;
   const items=Array.from(aside.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)')).filter(el=>el.getClientRects().length);
   const first=items[0],last=items[items.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  };
  document.addEventListener('keydown',keydown);window.addEventListener('resize',closeOnDesktop);
  return()=>{main.inert=false;document.body.style.overflow=overflow;document.removeEventListener('keydown',keydown);window.removeEventListener('resize',closeOnDesktop);if(previous?.isConnected)previous.focus();};
 },[mobile]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(t);},[notice]);
 function resetProduct(){requestVersion.current++;setLoading(false);setProduct(null);setDemo(false);setUrl('');setProductName('');setName('Добавьте товар по ссылке');}
 function switchMarket(market:Market){if(market===inputs.market)return;put('market',market);resetProduct();}
 async function fetchProduct(link:string){
  if(inputs.market!=='kaspi'){setError('Автозагрузка пока доступна только для Kaspi.');return;}
  const version=++requestVersion.current;setLoading(true);setError('');
  try{const r=await sessionFetch('/api/kaspi/product',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:link,city})});const b=await r.json();if(!r.ok)throw new Error(b.error);if(version!==requestVersion.current)return;
   const item=b.product as PublicProduct;
   setProduct(item);setName(item.name);setProductName(item.name);setUrl(item.url);setDemo(false);
   setNotice(b.cached?'Публичные данные загружены из кэша. Время проверки указано в карточке.':'Публичная карточка загружена. Идентификация магазинов не сохраняется.');
  }catch(e){if(version===requestVersion.current)setError((e as Error).message);}finally{if(version===requestVersion.current)setLoading(false);}
 }
 function addProduct(e:React.FormEvent){e.preventDefault();void fetchProduct(url);}

 async function save(){if(invalid){setError(invalid);return;}setSaving(true);setError('');try{const r=await sessionFetch('/api/calculations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,inputs,offers:[],url,city,demo,routes,product})});const b=await r.json();if(!r.ok)throw new Error(b.error);await refresh();setNotice('Расчёт сохранён в вашем аккаунте');}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
 function load(s:Saved){setInputs(normalizeInputs(s.payload.inputs));setProduct(s.payload.product??null);setName(s.name);setUrl(s.payload.url);setCity(s.payload.city);setDemo(s.payload.demo);if(s.payload.routes)setRoutes(s.payload.routes);setView('analysis');setAnalysisTab('market');setNotice('Сохранённый расчёт открыт');}
 async function remove(id:string){try{const r=await sessionFetch('/api/calculations?id='+encodeURIComponent(id),{method:'DELETE'});if(!r.ok)throw new Error();await refresh();}catch{setError('Не удалось удалить расчёт');}}
 function download(){if(invalid)return;const rows=[['Товар',name],['Площадка',inputs.market],['Город',city],['Данные',product?'Публичная карточка Kaspi':'Пользовательский расчёт'],['Цена продажи',inputs.price],['Закупка за единицу',inputs.purchase],['Закуплено единиц',inputs.quantity],['Непригодный брак',inputs.quantity-result.batch.goodQuantity],['Годных единиц',result.batch.goodQuantity],['Затраты на партию',result.batch.total],['Доставка всей партии',inputs.inbound],['Реклама на продажу',inputs.advertising],['НДС закупки',result.batch.vat],['Склад',result.batch.warehouse],['Упаковка всей партии',result.batch.packaging],...((inputs.batch?.expenses??[]).map(row=>['Доп. расход: '+row.name,row.amount])),['Стоимость закупленной единицы',result.batch.unitPurchased],['Себестоимость годной единицы',result.unitCost],['Планируем продать',result.batch.saleQuantity],['Общая прибыль выбранных продаж',result.totalProfit],['Прибыль продажи всех годных',result.allStockProfit],['Маржинальность, %',result.margin],['Комиссия',result.commission],['Налог',result.tax],['Доставка покупателю',result.delivery],['Доставка закупки на единицу',result.inbound],['Прибыль',result.profit],['Целевая прибыль',inputs.target],['Максимальная закупка',Math.floor(result.maxPurchase)],['Предложений Kaspi в городе',marketStats?.count??'Нет полных данных'],['Минимум всех предложений',marketStats?.minimum??'Нет полных данных'],['Медиана всех предложений',marketStats?.median??'Нет полных данных'],['Рекомендация цены продажи',recommendation?.price??'Нет рекомендации'],['Проверка рыночных цен',marketPrices.book?.fetchedTo??'Нет данных']];const csv='\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""').replace(/^[=+@-]/,"'$&")+'"').join(';')).join('\r\n');const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));link.download='analymark-calculation.csv';link.click();URL.revokeObjectURL(link.href);}

 return <div className="app-shell">
  <a className="skip-link" href="#main-content">Перейти к содержимому</a>
  {mobile&&<button className="sidebar-scrim" aria-label="Закрыть боковую панель" onClick={()=>setMobile(false)}/>}
  <aside ref={sidebarRef} id="workspace-sidebar" className={mobile?'sidebar open':'sidebar'} aria-label="Боковая панель">
   <div className="sidebar-brand-row"><a className="brand" href="/" aria-label="AnalyMark"><span className="brand-icon">A<span className="brand-spark"/></span><span className="brand-copy">AnalyMark<small>РАБОЧЕЕ МЕСТО ПРОДАВЦА</small></span></a><button className="sidebar-close icon-button" aria-label="Закрыть меню" onClick={()=>setMobile(false)}><X aria-hidden="true" size={18}/></button></div>
   <div className="workspace-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
   <nav aria-label="Основная навигация">{([
    {id:'overview',label:'Обзор',icon:LayoutGrid},
    {id:'search',label:'Поиск товаров',icon:Search},
    {id:'analytics',label:'Аналитика',icon:ChartNoAxesCombined},
    {id:'saved',label:'Мои расчёты',icon:Bookmark},
    {id:'sources',label:'Источники данных',icon:Database}
   ] as const).map(n=>{const active=view==='saved'?n.id==='saved':view==='method'?n.id==='sources':analysisTab==='economics'?n.id==='analytics':n.id===(sidebarSelection==='search'?'search':'overview');return <button key={n.id} className={active?'nav-item active':'nav-item'} aria-label={n.id==='saved'?`${n.label} ${saved.length}`:n.label} title={n.label} aria-current={active?'page':undefined} onClick={()=>{
    setSidebarSelection(n.id);setMobile(false);
    if(n.id==='saved')setView('saved');
    else if(n.id==='sources')setView('method');
    else {setView('analysis');setAnalysisTab(n.id==='analytics'?'economics':'market');if(n.id==='search')requestAnimationFrame(()=>document.querySelector<HTMLInputElement>('[aria-label="Ссылка на товар"]')?.focus());}
   }}><n.icon aria-hidden="true" size={17} strokeWidth={1.6}/><span>{({overview:'Обзор',search:'Поиск',analytics:'Аналитика',saved:'Расчёты',sources:'Источники'} as const)[n.id]}</span>{n.id==='saved'&&<span className="nav-count">{saved.length}</span>}</button>;})}<Link href="/workspace/tools" className="nav-item" title="Инструменты"><Wrench aria-hidden="true" size={17}/><span>Инструменты</span></Link><button className="nav-item" aria-label="Помощь" title="Пройти обучение" onClick={()=>{setMobile(false);setGuideOpen(true);}}><CircleHelp aria-hidden="true" size={21}/><span>Помощь</span></button></nav>
   <div className="marketplace-sidebar"><div className="workspace-label">МАРКЕТПЛЕЙСЫ</div><nav aria-label="Маркетплейсы">{([
    {id:'kaspi',label:'Kaspi.kz',mark:'K',className:'kaspi'},
    {id:'halyk',label:'Halyk Market',mark:'H',className:'halyk'},
    {id:'ozon',label:'Ozon',mark:'ozon',className:'ozon'},
    {id:'wb',label:'Wildberries',mark:'wb',className:'wildberries'},
    {id:'teez',label:'Teez',mark:'teez',className:'teez'}
   ] as const).map(m=>{const supported=m.id==='kaspi'||m.id==='ozon';return <button key={m.id} className={'sidebar-market'+(inputs.market===m.id?' current-market':'')} disabled={!supported} aria-label={`${m.label}${!supported?' — скоро':''}`} title={supported?`Выбрать ${m.label}`:'Площадка пока не подключена'} aria-pressed={supported?inputs.market===m.id:undefined} onClick={()=>{if(m.id==='kaspi'||m.id==='ozon'){switchMarket(m.id);setView('analysis');setAnalysisTab('market');setSidebarSelection('overview');setMobile(false);}}}>{m.id==='kaspi'||m.id==='ozon'||m.id==='wb'?<MarketplaceLogo market={m.id} className="sidebar-market-logo"/>:<span className={`sidebar-market-logo ${m.className}`} aria-hidden="true">{m.mark}</span>}<span>{m.label}</span>{!supported&&<small>скоро</small>}</button>;})}</nav></div>
   <div className="sidebar-note"><span className="sidebar-note-label">ДЛЯ ПРОДАВЦОВ</span><strong>Прозрачные цены.<br/>Решение за продавцом.</strong><p>Проверьте источники данных<br/>и экономику товара.</p><span className="version">Казахстан · сначала Kaspi.kz</span></div>
  </aside>
  <div ref={mainRef} className="main-shell"><header className="topbar"><button className="icon-button mobile-toggle" aria-label="Открыть меню" aria-expanded={mobile} aria-controls="workspace-sidebar" onClick={()=>setMobile(!mobile)}><Menu aria-hidden="true" size={20}/></button><div className="breadcrumb"><span className="header-wordmark">AnalyMark</span><span className="breadcrumb-label">Рабочее пространство</span><ChevronRight aria-hidden="true" size={14}/><strong>{view==='analysis'?'Анализ товара':view==='saved'?'Мои расчёты':'Методика'}</strong></div><div className="account-controls"><Link href="/workspace/account" className="account-name">{accountName}</Link><button className="button secondary" onClick={async()=>{try{const r=await sessionFetch('/api/auth/logout',{method:'POST'});if(!r.ok)throw new Error();window.location.assign('/login');}catch{setError('Не удалось выйти. Повторите попытку.');}}}>Выйти</button></div></header>
  <main id="main-content" tabIndex={-1}>{notice&&<div role="status" className="toast"><Check aria-hidden="true" size={17}/>{notice}<button className="icon-button" aria-label="Закрыть уведомление" onClick={()=>setNotice('')}><X aria-hidden="true" size={16}/></button></div>}{error&&<div role="alert" className="error-message">{error}<button className="icon-button" aria-label="Закрыть ошибку" onClick={()=>setError('')}><X aria-hidden="true" size={16}/></button></div>}
  {view==='analysis'?<>
   <div className="page-heading workspace-heading"><div><div className="section-kicker">РАБОЧЕЕ ПРОСТРАНСТВО</div><h1>{analysisTabs.find(t=>t.id===analysisTab)?.label}</h1></div><button className="button secondary" data-guide="save" onClick={save} disabled={saving||!!invalid}><Bookmark aria-hidden="true" size={16}/>{saving?'Сохраняем…':'Сохранить расчёт'}</button></div>
   <div className="workspace-controls">
   <div className="market-toolbar"><div className="market-switch" role="group" aria-label="Маркетплейс"><button aria-pressed={inputs.market==='kaspi'} className={inputs.market==='kaspi'?'selected':''} onClick={()=>switchMarket('kaspi')}><MarketplaceLogo market="kaspi" className="market-mark"/>Kaspi.kz</button><button aria-pressed={inputs.market==='ozon'} className={inputs.market==='ozon'?'selected':''} onClick={()=>switchMarket('ozon')}><MarketplaceLogo market="ozon" className="market-mark"/>Ozon</button></div><label className="city-select" data-guide="city">Город <select value={city} onChange={e=>{setCity(e.target.value);resetProduct();setNotice('Город изменён. Загрузите карточку заново.');}}><option>Алматы</option><option>Астана</option><option>Шымкент</option><option>Кызылорда</option></select></label><span className="mode-label">{product?'Публичная карточка Kaspi':'Загрузка по ссылке'}</span></div>
   <div className="analysis-tabs" role="tablist" aria-label="Этапы анализа товара">{analysisTabs.map((tab,index)=><button type="button" key={tab.id} role="tab" id={`tab-${tab.id}`} aria-controls={`panel-${tab.id}`} aria-selected={analysisTab===tab.id} tabIndex={analysisTab===tab.id?0:-1} onKeyDown={e=>tabKey(e,index)} onClick={()=>setAnalysisTab(tab.id)}><tab.icon aria-hidden="true" size={17}/><span>{tab.label}</span><span className="tab-index">0{index+1}</span></button>)}</div></div>
   {analysisTab!=='market'&&<div className="analysis-context"><span>Текущий товар</span><strong>{name}</strong><span className="market-inline"><MarketplaceLogo market={inputs.market}/>{inputs.market==='kaspi'?'Kaspi.kz':'Ozon'} · {city}</span></div>}
   <div role="tabpanel" className="workspace-panel" id="panel-market" aria-labelledby="tab-market" hidden={analysisTab!=='market'} tabIndex={0}>
   <div className="search-card" data-guide="search"><label htmlFor="product-url" className="search-label"><span className="search-step" aria-hidden="true">01</span> Ссылка на товар</label>
   <form className="product-search" onSubmit={addProduct}><label className="url-input"><LinkIcon aria-hidden="true" size={18}/><input id="product-url" aria-label="Ссылка на товар" aria-describedby="product-help" maxLength={2000} placeholder={`Ссылка на товар ${inputs.market==='kaspi'?'Kaspi.kz':'Ozon'}`} value={url} onChange={e=>setUrl(e.target.value)} required/></label>{inputs.market!=='kaspi'&&<input className="product-name-input" aria-label="Название и вариант товара" placeholder="Название, модель и вариант" value={productName} onChange={e=>setProductName(e.target.value)} maxLength={200} required/>}<button className="button primary" type="submit" disabled={loading}>{loading?'Загружаем…':'Добавить товар'}<ArrowRight aria-hidden="true" size={16}/></button></form>
   <div className="disclosure" id="product-help"><span className="mini-dot"/><span>Публичные данные товара и цены предложений. Названия магазинов, контакты и рейтинги продавцов не сохраняются.</span></div></div>
   <section className="market-section">{product?<>
    <div className="product-overview"><article className="product-card"><div className="product-heading"><div className="product-symbol">{product.image?<img src={product.image} alt={product.name} referrerPolicy="no-referrer"/>:<Headphones aria-hidden="true" size={30} strokeWidth={1.4}/>}</div><div><span className="section-kicker">ВАШ ТОВАР</span><h2>{name}</h2><span className="muted small market-inline"><MarketplaceLogo market={inputs.market}/>{inputs.market==='kaspi'?'Kaspi.kz':'Ozon'} · {city}</span></div></div><div className="product-facts"><span>Код <strong>{product.productId}</strong></span>{product.brand&&<span>Бренд <strong>{product.brand}</strong></span>}{product.category&&<span>Категория <strong>{product.category}</strong></span>}</div><div className="product-source"><a href={product.url} target="_blank" rel="noreferrer">На Kaspi<ArrowUpRight aria-hidden="true" size={14}/></a><span>Проверено {new Date(product.fetchedAt).toLocaleString('ru-KZ',{timeZone:'Asia/Qyzylorda'})}</span><button className="text-button" disabled={loading} onClick={()=>void fetchProduct(product.url)}>Обновить</button></div></article>
    <article className="product-details-card"><span className="section-kicker">ДАННЫЕ КАРТОЧКИ</span><h2>О товаре</h2>{product.description&&<details><summary>Описание товара</summary><p>{product.description}</p></details>}{!!product.attributes.length&&<details><summary>Характеристики ({product.attributes.length})</summary><dl className="product-attributes">{product.attributes.map((a,i)=><div key={i}><dt>{a.name}</dt><dd>{a.value}</dd></div>)}</dl></details>}{!product.description&&!product.attributes.length&&<p className="hint">В публичной карточке нет описания и характеристик.</p>}<p className="hint">Цена карточки не подтверждена для города. Для расчёта используйте предложения продавцов ниже.</p></article></div>
    <KaspiPrices {...marketPrices} onRefresh={marketPrices.refresh} key={`${product.productId}:${city}`} product={product} city={city} onUsePrice={price=>{put('price',price);setAnalysisTab('economics');}}/>
   </>:<div className="start-state"><div className="start-heading" data-guide="prices"><span className="section-kicker">ОТ ПЕРВОГО ТОВАРА ДО РЕШЕНИЯ</span><h2>Ваш следующий шаг</h2><p>Добавьте ссылку выше — остальное разложим по полочкам.</p></div><ol className="start-steps"><li className="step-market"><span>01 <ChartNoAxesCombined aria-hidden="true" size={25}/></span><strong>Понять рынок</strong><p>Цены на один товар. Все предложения в вашем городе.</p><button className="step-action" onClick={()=>document.getElementById('product-url')?.focus()} aria-label="Добавить ссылку для анализа рынка"><ArrowUpRight aria-hidden="true" size={20}/></button></li><li className="step-economics"><span>02 <SlidersHorizontal aria-hidden="true" size={25}/></span><strong>Посчитать прибыль</strong><p>Комиссия, доставка и расходы. Всё в одном расчёте.</p><button className="step-action" onClick={()=>setAnalysisTab('economics')} aria-label="Открыть экономику товара"><ArrowUpRight aria-hidden="true" size={20}/></button></li><li className="step-supplier"><span>03 <LinkIcon aria-hidden="true" size={25}/></span><strong>Найти цену закупки</strong><p>Узнайте, сколько можно заплатить поставщику.</p><button className="step-action" onClick={()=>setAnalysisTab('suppliers')} aria-label="Открыть расчёт закупки"><ArrowUpRight aria-hidden="true" size={20}/></button></li></ol></div>}
   </section>
   </div>
   <div role="tabpanel" className="workspace-panel" id="panel-economics" aria-labelledby="tab-economics" hidden={analysisTab!=='economics'} tabIndex={0}>
   <section className="economics-section">
    <ProductEconomics inputs={inputs} onChange={setInputs} invalid={invalid} onExport={download} market={marketStats} recommendation={recommendation?.price??null}/>
    {inputs.market==='kaspi'&&guidance()}
   </section>
   </div>
   <div role="tabpanel" className="workspace-panel" id="panel-suppliers" aria-labelledby="tab-suppliers" hidden={analysisTab!=='suppliers'} tabIndex={0}>
   <section className="supplier-section"><div className="section-heading"><div><div className="section-kicker">ОБРАТНЫЙ РАСЧЁТ</div><h2>По какой цене искать поставщика?</h2><p className="muted">При продаже за {money(inputs.price)} и целевой прибыли {money(inputs.target)}.</p></div></div><p className="hint">Сценарии, не найденные поставщики. Укажите полные дополнительные расходы на единицу сверх уже учтённой доставки партии. Начальные суммы — учебные допущения.</p><div className="supplier-rows">{routes.map((route,i)=>{const cap=Math.floor(result.maxPurchase-route.cost/result.purchaseCostFactor);return <div className="supplier-row" data-guide={i===0?'purchase':undefined} key={route.name}><div><span className="route-number">0{i+1}</span><strong>{route.name}</strong></div><label>Доп. расходы, ₸ / шт.<input aria-label={`Дополнительные расходы: ${route.name}`} type="number" min={0} max={1e9} value={route.cost} onChange={e=>setRoutes(rs=>rs.map((r,j)=>j===i?{...r,cost:Math.max(0,Number(e.target.value))}:r))}/></label><div className="purchase-cap"><span>Закупка не выше</span><strong className={cap<0?'negative':''}>{invalid?'—':cap<0?'Цель недостижима':money(cap)}</strong></div></div>;})}</div><p className="supplier-footnote">Импорт: таможня, посредник и невозмещаемые налоги должны входить в вашу полную оценку. Автоматическая растаможка и расчёт объёмного веса пока не подключены.</p>{inputs.market==='kaspi'&&guidance(true)}</section>
   <div className="explanation"><BookOpen aria-hidden="true" size={19}/><div><strong>{invalid?'Проверьте исходные данные':result.profit>=inputs.target?'При этих расходах цель по прибыли достижима.':'Текущая цена не обеспечивает целевую прибыль.'}</strong><p>Это арифметический сценарий, а не прогноз спроса. НДС с собственных продаж и неуказанные затраты не рассчитываются. ИИ не участвует в формулах.</p></div><button className="text-button" onClick={()=>setView('method')}>Как считаем<ArrowRight aria-hidden="true" size={16}/></button></div>
   </div>
  </>:view==='saved'?<><div className="page-heading"><div><div className="eyebrow">ВАШИ РЕШЕНИЯ</div><h1>Мои расчёты</h1><p>Сохранённые исходные данные. Цены автоматически не обновляются.</p></div><button className="button primary" onClick={()=>setView('analysis')}><Plus aria-hidden="true" size={16}/>К анализу</button></div>{!saved.length?<div className="empty-state"><Bookmark aria-hidden="true" size={35} strokeWidth={1.3}/><h2>Первый расчёт — начало истории</h2><p>Добавьте товар, проверьте расходы и сохраните результат.</p><button className="button primary" onClick={()=>setView('analysis')}>Открыть калькулятор</button></div>:<div className="saved-list">{saved.map(s=><article className="saved-row" key={s.id}><div><span className="section-kicker market-inline"><MarketplaceLogo market={s.payload.inputs.market}/>{s.payload.inputs.market.toUpperCase()} · {s.payload.city} · {s.payload.product?'ПУБЛИЧНАЯ КАРТОЧКА':s.payload.demo?'ДЕМО':'СОХРАНЁННЫЙ РАСЧЁТ'}</span><h2>{s.name}</h2><p className="muted">{new Date(s.created_at).toLocaleString('ru-KZ',{timeZone:'Asia/Qyzylorda'})}</p></div><div><span className="muted small">Прибыль с единицы</span><strong className="saved-profit">{money(calculate(s.payload.inputs).profit)}</strong></div><button className="button secondary" onClick={()=>load(s)}>Открыть<ArrowRight aria-hidden="true" size={15}/></button><button className="icon-button" aria-label={`Удалить расчёт ${s.name}`} onClick={()=>remove(s.id)}><Trash2 aria-hidden="true" size={17}/></button></article>)}</div>}</>:<><div className="page-heading"><div><div className="eyebrow">ПРОЗРАЧНЫЕ РАСЧЁТЫ</div><h1>Методика и источники</h1><p>Что известно, что задано пользователем и где проходят границы расчёта.</p></div></div><div className="method-content"><h2>Затраты на закупку партии</h2><p>Сумма партии = закупочная цена × закупленное количество + доставка партии + упаковка закупленных единиц + дополнительный невозмещаемый НДС + выбранные расходы склада + дополнительные расходы. Уже включённый в цену НДС второй раз не добавляется. Для импорта базу и платежи берите из документов.</p><h2>Брак и себестоимость единицы</h2><p>Стоимость закупленной единицы = сумма партии / закупленное количество. Себестоимость годной единицы = сумма партии / (закупленное количество − непригодный брак). Оплаченный брак распределяется между годными единицами, без повторного начисления.</p><h2>Прибыль и количество продаж</h2><p>Валовая разница = цена продажи − себестоимость годной единицы. Расчётная прибыль дополнительно вычитает комиссию, налог с выручки, доставку покупателю и рекламу. Общая прибыль = прибыль с единицы × количество продаж. Непроданные годные товары остаются в запасах. Прибыль выбранных продаж не равна возврату всех денег, потраченных на партию.</p><h2>Налоги и комиссии</h2><p>НДС на услуги Kaspi не является универсальным налогом 16% со всей цены товара. Комиссия задаётся итоговой ставкой с НДС; автоматический тариф доставки уже включает НДС. 4% — базовый пример налога с выручки, зависящий от режима и региона. НДС с собственных продаж и вычеты общего режима не рассчитываются.</p><h2>Максимальная закупка и тарифные пороги</h2><p>Предел закупки учитывает оплаченные и годные единицы, затраты на партию, цель по прибыли и выбранный НДС закупки. Безубыточная цена ищется отдельно между тарифными порогами Kaspi, поскольку доставка может скачкообразно дорожать. В заказе предполагается одна единица товара.</p><h2>Источники и ограничения</h2><ul><li><a href={sources.serviceVat} target="_blank" rel="noreferrer">Kaspi: НДС и комиссии партнёров</a></li><li><a href={sources.tax} target="_blank" rel="noreferrer">КГД: налоговые режимы 2026 года</a></li><li><a href={sources.importCosts} target="_blank" rel="noreferrer">КГД: таможенная стоимость и расходы</a></li><li><a href={sources.delivery} target="_blank" rel="noreferrer">Тариф доставки Kaspi</a></li></ul><p>Цены собираются по всем страницам для выбранного товара и города. Неполные данные не используются для рекомендаций. Ориентир продажи учитывает медиану и расходы, но не прогнозирует спрос. Сохранённые расчёты принадлежат аккаунту; рыночные цены обновляются отдельно. ИИ готовит только текстовые черновики и не участвует в формулах экономики.</p><h2>Сценарии поставщиков</h2><p>Суммы задаются вручную на единицу и добавляются к уже учтённой доставке закупки. Для импорта внесите полную оценку расходов. Автоматического подбора перевозчика, поставщика, пошлин и валютного курса нет. Отрицательный предел закупки означает недостижимость целевой прибыли при данных условиях.</p></div></>}
  <footer>AnalyMark<span>Понятные данные. Взвешенные решения.</span><span>Локальный MVP · 2026</span></footer></main></div>

 {guideOpen&&<WorkspaceGuide onNavigate={navigateGuide} onDismiss={dismissGuide}/>}
 </div>;
}
