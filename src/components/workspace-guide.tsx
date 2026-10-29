'use client';

import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Bookmark,ChartNoAxesCombined,Link as LinkIcon,SlidersHorizontal,X} from 'lucide-react';

export type GuideTab='market'|'economics'|'suppliers';
const steps=[
 {tab:'market',target:'city',title:'Сначала выберите город',body:'Цены и условия доставки зависят от города. Выберите свой город перед загрузкой товара. Автоматическая загрузка сейчас работает для Kaspi.'},
 {tab:'market',target:'search',title:'Добавьте ссылку на товар',body:'Скопируйте ссылку на карточку Kaspi и нажмите «Добавить товар». AnalyMark загрузит информацию о товаре и предложения для выбранного города.'},
 {tab:'market',target:'prices',title:'Посмотрите, что предлагает рынок',body:'После загрузки здесь появятся цены предложений, минимум и медиана полного списка. Проверьте модель товара, комплектацию и время обновления данных.'},
 {tab:'economics',target:'costs',title:'Учтите свои расходы',body:'Укажите закупочную цену, доставку партии, вес и желаемую прибыль. Комиссию, налог и остальные расходы проверьте ниже. Начальные суммы — пример, замените их своими.'},
 {tab:'suppliers',target:'purchase',title:'Узнайте предел закупки',body:'Здесь видно, сколько можно заплатить за товар при вашей цене продажи и цели по прибыли. Сравните расходы для разных мест поставки. Это расчёт бюджета, а не поиск поставщика.'},
 {tab:'market',target:'save',title:'Сохраните свой расчёт',body:'Когда добавите товар и проверите расходы, нажмите «Сохранить расчёт». Вернуться к нему можно в разделе «Расчёты». Это исходные данные: рыночные цены нужно обновлять отдельно.'},
] as const;

type Area={left:number;top:number;width:number;height:number};
type Placement={hole:Area|null;left:number;top:number;viewportWidth:number;viewportHeight:number};

export function WorkspaceGuide({onNavigate,onDismiss}:{onNavigate:(tab:GuideTab)=>void;onDismiss:(startProduct:boolean)=>Promise<void>}){
 const [step,setStep]=useState(-1),[placement,setPlacement]=useState<Placement|null>(null),[closing,setClosing]=useState(false);
 async function dismiss(startProduct:boolean){if(closing)return;setClosing(true);await onDismiss(startProduct);}
 const dialogRef=useRef<HTMLDialogElement>(null),cardRef=useRef<HTMLDivElement>(null),titleRef=useRef<HTMLHeadingElement>(null);
 const current=step<0?null:steps[step];

 useEffect(()=>{
  const dialog=dialogRef.current!,previous=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;
  dialog.showModal();document.body.style.overflow='hidden';titleRef.current?.focus({preventScroll:true});
  return()=>{
   dialog.close();document.body.style.overflow=overflow;
   if(previous?.isConnected&&previous.getClientRects().length)previous.focus({preventScroll:true});
  };
 },[]);

 useEffect(()=>{
  if(!current){setPlacement(null);titleRef.current?.focus({preventScroll:true});return;}
  onNavigate(current.tab);setPlacement(null);
  let frame=0,observer:ResizeObserver|undefined;
  const target=()=>document.querySelector<HTMLElement>(`[data-guide="${current.target}"]`);
  function measure(){
   const card=cardRef.current;if(!card)return;
   const vw=document.documentElement.clientWidth,vh=window.innerHeight,gap=16;
   const cardWidth=card.offsetWidth,cardHeight=card.offsetHeight;
   const rect=target()?.getBoundingClientRect();
   let hole:Area|null=null;
   if(rect&&rect.width>0&&rect.height>0){
    const left=Math.max(8,rect.left-6),top=Math.max(8,rect.top-6);
    const right=Math.min(vw-8,rect.right+6),bottom=Math.min(vh-8,rect.bottom+6);
    if(right>left&&bottom>top)hole={left,top,width:right-left,height:bottom-top};
   }
   let left=vw-cardWidth-gap,top=vh-cardHeight-gap;
   if(hole&&vw>=640){
    if(hole.left+hole.width+gap+cardWidth<=vw-gap){left=hole.left+hole.width+gap;top=hole.top;}
    else if(hole.top+hole.height+gap+cardHeight<=vh-gap){left=hole.left;top=hole.top+hole.height+gap;}
    else if(hole.top-gap-cardHeight>=gap){left=hole.left;top=hole.top-gap-cardHeight;}
    else if(hole.left-gap-cardWidth>=gap){left=hole.left-gap-cardWidth;top=hole.top;}
   }
   left=Math.max(gap,Math.min(left,vw-cardWidth-gap));top=Math.max(gap,Math.min(top,vh-cardHeight-gap));
   // Keep the visible part of a large highlighted section above the guide card.
   if(hole&&left<hole.left+hole.width&&left+cardWidth>hole.left&&top<hole.top+hole.height&&top+cardHeight>hole.top){
    if(top-gap-hole.top>=32)hole={...hole,height:top-gap-hole.top};else hole=null;
   }
   setPlacement({hole,left,top,viewportWidth:vw,viewportHeight:vh});
  }
  function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);}
  function resize(){target()?.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'});window.scrollBy({top:-24,behavior:'instant'});schedule();}
  frame=requestAnimationFrame(()=>{
   frame=requestAnimationFrame(()=>{
    const element=target();
    element?.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'});
    window.scrollBy({top:-24,behavior:'instant'});
    measure();titleRef.current?.focus({preventScroll:true});
    observer=new ResizeObserver(schedule);if(element)observer.observe(element);if(cardRef.current)observer.observe(cardRef.current);
   });
  });
  window.addEventListener('resize',resize);window.addEventListener('scroll',schedule,true);
  return()=>{cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('scroll',schedule,true);};
 },[current,onNavigate]);

 const hole=placement?.hole;
 const shade=hole&&placement?[
  {left:0,top:0,width:placement.viewportWidth,height:hole.top},
  {left:0,top:hole.top+hole.height,width:placement.viewportWidth,height:Math.max(0,placement.viewportHeight-hole.top-hole.height)},
  {left:0,top:hole.top,width:hole.left,height:hole.height},
  {left:hole.left+hole.width,top:hole.top,width:Math.max(0,placement.viewportWidth-hole.left-hole.width),height:hole.height},
 ]:null;

 return <dialog ref={dialogRef} className="workspace-guide" aria-busy={closing} aria-labelledby="guide-title" aria-describedby="guide-description" onCancel={event=>{event.preventDefault();void dismiss(false);}} onKeyDown={event=>{
  if(event.key!=='Tab')return;
  const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')).filter(button=>button.getClientRects().length);
  const first=buttons[0],last=buttons[buttons.length-1];
  if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
 }}>
  {shade?shade.map((area,index)=><div key={index} className="guide-shade" style={area} aria-hidden="true"/>):<div className="guide-shade guide-shade-full" aria-hidden="true"/>}
  {hole&&<div className="guide-highlight" style={hole} aria-hidden="true"/>}
  <div ref={cardRef} className={`guide-card${current?'':' guide-welcome'}`} style={current&&placement?{left:placement.left,top:placement.top}:undefined}>
   <div className="guide-card-top"><span className="section-kicker">{current?'ЗНАКОМСТВО С ANALYMARK':'ДОБРО ПОЖАЛОВАТЬ'}</span><button disabled={closing} className="icon-button" aria-label="Закрыть обучение" onClick={()=>void dismiss(false)}><X aria-hidden="true" size={19}/></button></div>
   {current?<>
    <p className="guide-counter" role="status">Шаг {step+1} из {steps.length}</p>
    <div className="guide-progress" aria-hidden="true">{steps.map((_,index)=><span key={index} className={index<=step?'reached':''}/>)}</div>
    <h2 ref={titleRef} id="guide-title" tabIndex={-1}>{current.title}</h2>
    <p id="guide-description">{current.body}</p>
    <div className="guide-actions"><button disabled={closing} className="text-button" onClick={()=>setStep(step-1)}><ArrowLeft aria-hidden="true" size={16}/>Назад</button><button disabled={closing} className="button primary" onClick={()=>step===steps.length-1?void dismiss(true):setStep(step+1)}>{closing?'Сохраняем…':step===steps.length-1?'Добавить первый товар':'Далее'}<ArrowRight aria-hidden="true" size={16}/></button></div>
    <button disabled={closing} className="guide-skip text-button" onClick={()=>void dismiss(false)}>Пропустить обучение</button>
   </>:<>
    <div className="guide-welcome-icon" aria-hidden="true"><ChartNoAxesCombined size={30}/><ArrowRight size={20}/><SlidersHorizontal size={30}/><ArrowRight size={20}/><LinkIcon size={30}/></div>
    <h2 ref={titleRef} id="guide-title" tabIndex={-1}>Разберём первый товар вместе</h2>
    <p id="guide-description">Покажем путь от ссылки на Kaspi до расчёта прибыли и цены закупки. Вы узнаете, где что находится, а затем сможете добавить свой товар.</p>
    <p className="guide-welcome-note"><Bookmark size={17} aria-hidden="true"/>Обучение можно пропустить и открыть снова через «Помощь».</p>
    <div className="guide-actions"><button disabled={closing} className="text-button" onClick={()=>void dismiss(false)}>Разберусь сам</button><button disabled={closing} className="button primary" onClick={()=>setStep(0)}>Показать шаги<ArrowRight aria-hidden="true" size={16}/></button></div>
   </>}
  </div>
 </dialog>;
}
