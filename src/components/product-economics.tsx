'use client';

import {Plus,Trash2,Download,ArrowUpRight} from 'lucide-react';
import {batchSettings,calculate,minimumPrice,sources,type Inputs,type BatchInputs} from '@/lib/economics';

const money=(value:number)=>new Intl.NumberFormat('ru-KZ',{maximumFractionDigits:2}).format(value)+' ₸';
const percent=(value:number)=>new Intl.NumberFormat('ru-KZ',{maximumFractionDigits:1}).format(value)+'%';
const suggestedExpenses=['Приёмка и проверка','Страхование груза','Таможенные платежи / брокер','Комиссия перевода / конвертация','Сертификация товара'];

export function ProductEconomics({inputs:x,onChange,invalid,onExport,market,recommendation}:{inputs:Inputs;onChange:(inputs:Inputs)=>void;invalid:string;onExport:()=>void;market:{minimum:number;median:number}|null;recommendation:number|null}){
 const b=batchSettings(x),r=calculate(x),c=r.batch;
 const put=<K extends keyof Inputs>(key:K,value:Inputs[K])=>onChange({...x,[key]:value});
 const batch=<K extends keyof BatchInputs>(key:K,value:BatchInputs[K])=>put('batch',{...b,[key]:value});
 const field=(label:string,key:'purchase'|'quantity'|'inbound'|'packaging'|'price'|'commission'|'tax'|'advertising'|'target'|'weight'|'manualDelivery',unit='₸',hint?:string)=><label className="field"><span>{label}</span><span className="input-wrap"><input type="number" min={key==='quantity'||key==='price'?1:0} step={key==='quantity'?1:'any'} value={x[key]} onChange={event=>put(key,Number(event.target.value))}/><small>{unit}</small></span>{hint&&<small className="hint">{hint}</small>}</label>;
 const addExpense=(name='')=>{if(b.expenses.length<30)batch('expenses',[...b.expenses,{id:crypto.randomUUID(),name,amount:0}]);};
 const updateExpense=(id:string,key:'name'|'amount',value:string|number)=>batch('expenses',b.expenses.map(row=>row.id===id?{...row,[key]:value}:row));
 const breakEven=invalid?null:minimumPrice(x),goal=invalid?null:minimumPrice(x,x.target);
 const numericFormula=[c.purchase,x.inbound,c.packaging,c.vat,c.warehouse,c.extras,c.legacy].filter((value,index)=>index===0||value!==0).map(money).join(' + ');

 return <div className="batch-economics">
  <section aria-labelledby="batch-cost-heading">
   <div className="batch-section-heading"><span className="batch-step">01</span><div><h2 id="batch-cost-heading">Себестоимость партии</h2><p>Сначала посчитаем, сколько стоит закупка целиком.</p></div></div>
   <div className="batch-layout">
    <div className="batch-form">
     <p className="hint">Начальные суммы — пример. Внесите свои расходы в тенге.</p>
     <div className="fields-grid" data-guide="costs">
      {field('Закупочная цена за единицу','purchase')}
      {field('Закупаемое количество','quantity','шт.')}
      {field('Доставка всей партии до вас','inbound','₸','Перевозка до вашего склада или пункта приёмки.')}
      {field('Упаковка и маркировка за единицу','packaging')}
      <label className="field"><span>Брак, который нельзя продать</span><span className="input-wrap"><input type="number" min={0} max={Math.max(0,x.quantity-1)} step={1} value={b.defective} onChange={event=>batch('defective',Number(event.target.value))}/><small>шт.</small></span><small className="hint">Оплаченные бракованные единицы уменьшают количество годных, а не добавляют закупку второй раз.</small></label>
     </div>

     <div className="batch-option">
      <label className="checkbox-field"><input type="checkbox" checked={b.vatEnabled} onChange={event=>batch('vatEnabled',event.target.checked)}/>Добавить невозмещаемый НДС закупки / импорта</label>
      <p className="hint">Только если он уплачен сверх введённой цены. НДС, уже включённый в счёт поставщика, повторно не прибавляйте.</p>
      {b.vatEnabled&&<div className="fields-grid"><label className="field"><span>База для НДС закупки</span><span className="input-wrap"><input type="number" min={0} step="any" value={b.vatBase??c.purchase} onChange={event=>batch('vatBase',Number(event.target.value))}/><small>₸</small></span><small className="hint">По умолчанию — сумма закупки. Для импорта возьмите базу из документов, включая применимые начисления.</small><button type="button" className="text-button" onClick={()=>batch('vatBase',null)}>Вернуть сумму закупки</button></label><label className="field"><span>Ставка НДС закупки</span><span className="input-wrap"><input type="number" min={0} max={100} step="any" value={b.vatRate} onChange={event=>batch('vatRate',Number(event.target.value))}/><small>%</small></span></label></div>}
     </div>
     <div className="batch-option">
      <label className="checkbox-field"><input type="checkbox" checked={b.warehouseEnabled} onChange={event=>batch('warehouseEnabled',event.target.checked)}/>Учитывать расходы на склад</label>
      {b.warehouseEnabled&&<label className="field"><span>Склад: расходы, относящиеся к этой партии</span><span className="input-wrap"><input type="number" min={0} step="any" value={b.warehouse} onChange={event=>batch('warehouse',Number(event.target.value))}/><small>₸</small></span><small className="hint">Внесите долю аренды и обслуживания на эту партию за выбранный срок, а не аренду всех товаров сразу.</small></label>}
     </div>

     <div className="batch-extras-heading"><h3>Дополнительные расходы</h3><button type="button" className="text-button" disabled={b.expenses.length>=30} onClick={()=>addExpense()}><Plus size={16} aria-hidden="true"/>Добавить расход</button></div>
     <p className="hint">Каждая сумма — на всю партию. Добавляйте только ещё не учтённые платежи.</p>
     <div className="batch-expenses">{b.expenses.map((row,index)=><div className="batch-expense" key={row.id}>
      <label className="field"><span>На что потратили · {index+1}</span><input type="text" maxLength={120} value={row.name} placeholder="Например, проверка качества" onChange={event=>updateExpense(row.id,'name',event.target.value)}/></label>
      <label className="field"><span>Сумма на партию</span><span className="input-wrap"><input type="number" min={0} step="any" value={row.amount} onChange={event=>updateExpense(row.id,'amount',Number(event.target.value))}/><small>₸</small></span></label>
      <button type="button" className="icon-button" aria-label={`Удалить расход ${index+1}`} onClick={()=>batch('expenses',b.expenses.filter(item=>item.id!==row.id))}><Trash2 size={17} aria-hidden="true"/></button>
     </div>)}</div>
     <details className="batch-suggestions"><summary>Что ещё может входить в расходы</summary><p className="hint">При закупке могут возникать затраты на приёмку, проверку качества, страховку, услуги брокера, пошлины, сертификацию и банковский перевод. Это подсказки, а не обязательные платежи.</p><div>{suggestedExpenses.map(name=><button type="button" className="text-button" key={name} disabled={b.expenses.length>=30} onClick={()=>addExpense(name)}><Plus size={14} aria-hidden="true"/>{name}</button>)}</div><a href={sources.importCosts} target="_blank" rel="noreferrer" className="small">КГД: транспортировка и страхование при определении таможенной стоимости<ArrowUpRight size={12} aria-hidden="true"/></a></details>
    </div>

    <aside className="batch-summary" aria-label="Итог себестоимости партии" aria-live="polite">
     <span className="result-label">ЗАТРАТЫ НА ВСЮ ПАРТИЮ</span>
     {invalid?<p role="alert" className="batch-error">{invalid}</p>:<>
      <strong className="batch-total">{money(c.total)}</strong>
      <p className="batch-formula">{numericFormula} = {money(c.total)}</p>
      <p className="batch-formula">Закупка × количество + доставка + упаковка + добавленный НДС + склад + дополнительные расходы.</p>
      <dl className="batch-breakdown"><div><dt>Закупка {x.quantity} шт.</dt><dd>{money(c.purchase)}</dd></div><div><dt>Доставка партии</dt><dd>{money(x.inbound)}</dd></div><div><dt>Упаковка и маркировка</dt><dd>{money(c.packaging)}</dd></div>{b.vatEnabled&&<div><dt>НДС закупки</dt><dd>{money(c.vat)}</dd></div>}{b.warehouseEnabled&&<div><dt>Склад</dt><dd>{money(c.warehouse)}</dd></div>}{b.expenses.filter(row=>row.amount>0).map(row=><div key={row.id}><dt>{row.name}</dt><dd>{money(row.amount)}</dd></div>)}{c.legacy>0&&<div><dt>Резерв и прочие прежние расходы</dt><dd>{money(c.legacy)}</dd></div>}</dl>
      <div className="batch-unit"><span>На закупленную единицу<strong>{money(c.unitPurchased)}</strong></span><p>{money(c.total)} ÷ {x.quantity} шт.</p></div>
      {b.defective>0&&<div className="batch-unit"><span>Себестоимость годной единицы<strong>{money(c.unitSaleable)}</strong></span><p>{money(c.total)} ÷ ({x.quantity} − {b.defective}) = {money(c.unitSaleable)}</p></div>}
      <p className="batch-summary-note">{c.goodQuantity} шт. доступны для продажи. Комиссия и налог с выручки учитываются на следующем шаге.</p>
     </>}
    </aside>
   </div>
  </section>

  <section aria-labelledby="batch-profit-heading">
   <div className="batch-section-heading"><span className="batch-step">02</span><div><h2 id="batch-profit-heading">Прибыль от продаж</h2><p>Выберите цену и количество, которое планируете продать.</p></div></div>
   <div className="batch-layout">
    <div className="batch-form">
     <div className="fields-grid">{field('Цена продажи за единицу','price')}<label className="field"><span>Планируем продать</span><span className="input-wrap"><input type="number" min={0} max={Math.max(0,c.goodQuantity)} step={1} value={b.saleQuantity??c.goodQuantity} onChange={event=>batch('saleQuantity',Number(event.target.value))}/><small>шт.</small></span><button type="button" className="text-button" onClick={()=>batch('saleQuantity',null)}>Все годные: {Math.max(0,c.goodQuantity)} шт.</button></label>{field('Комиссия площадки с учётом НДС','commission','%')}{field('Налог с выручки','tax','%','4% — базовый пример для СНР. Укажите ставку своего режима и региона.')}{field('Реклама на успешную продажу','advertising')}{field('Целевая прибыль с продажи','target')}</div>
     <p className="batch-tax-note">{x.market==='kaspi'?'16% НДС на услуги Kaspi не равны дополнительным 16% от цены товара. Введите итоговую комиссию с НДС; тариф доставки ниже уже учитывает НДС.':'Введите комиссию и доставку по своим условиям с учётом применимых налогов.'} <a href={sources.serviceVat} target="_blank" rel="noreferrer">Пояснение Kaspi</a> · <a href={sources.tax} target="_blank" rel="noreferrer">Налоговый режим</a></p>
     <div className="price-presets"><span>Проверить цену:</span><button type="button" disabled={!market} onClick={()=>market&&put('price',market.minimum)}>Минимум рынка</button><button type="button" disabled={!market} onClick={()=>market&&put('price',market.median)}>Медиана рынка</button><button type="button" disabled={recommendation===null} onClick={()=>recommendation!==null&&put('price',recommendation)}>Рекомендация</button></div>
     <details className="batch-sale-options"><summary>Доставка покупателю и тариф</summary><div className="fields-grid">{field('Вес единицы с упаковкой','weight','кг')}<label className="field"><span>Направление доставки</span><select value={x.direction} onChange={event=>put('direction',event.target.value as Inputs['direction'])}><option value="city">По городу</option><option value="country">По Казахстану</option><option value="express">Express по городу</option></select></label>{field('Ручной тариф на одну продажу','manualDelivery')}</div><label className="checkbox-field"><input type="checkbox" checked={x.market==='kaspi'&&x.useKaspiTariff} disabled={x.market!=='kaspi'} onChange={event=>put('useKaspiTariff',event.target.checked)}/>Использовать тариф Kaspi с НДС</label><p className="hint">Расчёт предполагает одну единицу товара в заказе. Для особых условий или другой площадки введите ручной тариф.</p><a className="small" href={sources.delivery} target="_blank" rel="noreferrer">Источник тарифа доставки<ArrowUpRight size={12} aria-hidden="true"/></a></details>
     <p className="hint">Расчёт денежной экономики для продавца без НДС с налогом от выручки. НДС с ваших собственных продаж и налоговые вычеты общего режима здесь не рассчитываются.</p>
    </div>
    <aside className="batch-profit" aria-label="Итог прибыли от продаж" aria-live="polite">
     <span className="result-label">ПРИБЫЛЬ С ПРОДАННОЙ ЕДИНИЦЫ</span>
     {invalid?<p role="alert" className="negative">{invalid}</p>:<>
      <strong className={`batch-total${r.profit<0?' negative':''}`}>{money(r.profit)}</strong>
      <p className="batch-formula">{money(x.price)} − {money(c.unitSaleable)} − {money(r.saleCosts)} = {money(r.profit)}</p>
      <p className="batch-formula">Цена продажи − себестоимость годной единицы − комиссия, налог, доставка покупателю и реклама.</p>
      <dl className="batch-breakdown"><div><dt>Цена минус себестоимость</dt><dd>{money(r.grossProfit)}</dd></div><div><dt>Комиссия площадки</dt><dd>−{money(r.commission)}</dd></div><div><dt>Налог с выручки</dt><dd>−{money(r.tax)}</dd></div><div><dt>Доставка покупателю</dt><dd>−{money(r.delivery)}</dd></div><div><dt>Реклама</dt><dd>−{money(x.advertising)}</dd></div><div><dt>Маржинальность</dt><dd className={r.profit<0?'negative':'positive'}>{percent(r.margin)}</dd></div></dl>
      <div className="batch-profit-total"><span>Прибыль от продажи {c.saleQuantity} шт.</span><strong className={r.totalProfit<0?'negative':''}>{money(r.totalProfit)}</strong><p className="batch-formula">{money(r.profit)} × {c.saleQuantity} шт.</p></div>
      {r.remainingQuantity>0&&<p className="hint">Останется {r.remainingQuantity} шт. себестоимостью {money(r.remainingCost)}. При продаже всех {c.goodQuantity} годных единиц прибыль составит {money(r.allStockProfit)}. Непроданный остаток не списывается в расходы выбранных продаж.</p>}
      <div className="result-bottom"><span>Безубыточная цена<strong>{breakEven===null?'Недостижима':money(breakEven)}</strong></span><span>Для цели {money(x.target)}<strong>{goal===null?'Недостижима':money(goal)}</strong></span></div>
      <button type="button" className="text-button" onClick={onExport}><Download size={16} aria-hidden="true"/>Скачать расчёт CSV</button>
      <p className="hint">Промежуточные значения не округляются при вычислениях. Это расчётная прибыль после указанных расходов, а не бухгалтерская чистая прибыль или прогноз спроса.</p>
     </>}
    </aside>
   </div>
  </section>
 </div>;
}
