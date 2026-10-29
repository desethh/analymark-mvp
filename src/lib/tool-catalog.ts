export const toolGroups=[{id:'launch',label:'Выйти на маркетплейсы'},{id:'card',label:'Создать карточку товара'},{id:'sales',label:'Поднять продажи'},{id:'routine',label:'Избавиться от рутины'}] as const;
export const toolCatalog=[
 {id:'market',name:'Внешняя аналитика',description:'Цены предложений одного товара Kaspi, минимум и медиана выбранного города.',groups:['launch'],href:'/workspace?step=market',icon:'chart',mode:'ready',platform:'Kaspi'},
 {id:'cabinet',name:'Кабинет продаж',description:'Продажи, выручка и возвраты из кабинета продавца. Потребуется подключение API маркетплейса.',groups:['launch'],href:null,icon:'grid',mode:'connection',platform:'WB / Ozon'},
 {id:'audit',name:'Аудит карточки',description:'ИИ проверит название, описание и характеристики, выделит пробелы и предложит улучшения.',groups:['card'],href:'/workspace/tools/audit',icon:'audit',mode:'ai',platform:'Kaspi / текст'},
 {id:'seo',name:'SEO-помощник',description:'Черновик названия и описания на основе ваших фактов и ключевых слов.',groups:['sales','card'],href:'/workspace/tools/seo',icon:'search',mode:'ai',platform:'Kaspi / текст'},
 {id:'bidder',name:'Биддер',description:'Автоматизация рекламных ставок требует API рекламного кабинета. Подключение запланировано.',groups:['sales'],href:null,icon:'bid',mode:'connection',platform:'WB / Ozon'},
 {id:'price',name:'Управление ценой',description:'Рассчитайте выгодную цену с учётом расходов. Автоизменение цен на площадке пока не подключено.',groups:['routine','sales'],href:'/workspace?step=economics',icon:'price',mode:'ready',platform:'Kaspi'},
 {id:'reviews',name:'Ответы на отзывы',description:'ИИ подготовит ответ по тексту отзыва. Проверьте черновик и опубликуйте его самостоятельно.',groups:['routine'],href:'/workspace/tools/reviews',icon:'message',mode:'ai',platform:'Текст отзыва'}
] as const;
export type AiTool='audit'|'seo'|'reviews';
export function isAiTool(value:unknown):value is AiTool{return value==='audit'||value==='seo'||value==='reviews';}
