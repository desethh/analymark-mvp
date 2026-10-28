export interface PublicProduct {
 productId: string; url: string; name: string; image: string | null;
 brand: string | null; category: string | null; description: string | null;
 price: number | null; currency: 'KZT'; city: string; cityVerified: false;
 fetchedAt: string; source: 'kaspi-public-html';
 attributes: {name:string;value:string}[];
}
export const cities:Record<string,string>={'Алматы':'750000000','Астана':'710000000','Шымкент':'790000000','Кызылорда':'431010000'};
export function normalizeKaspiUrl(input:string):{url:string;productId:string} {
 let u:URL;try{u=new URL(input);}catch{throw new Error('Вставьте полную HTTPS-ссылку на карточку Kaspi.');}
 if(u.protocol!=='https:'||!['kaspi.kz','www.kaspi.kz'].includes(u.hostname)||u.port||u.username||u.password)throw new Error('Допускаются только публичные HTTPS-карточки kaspi.kz.');
 const match=u.pathname.match(/^\/shop\/p\/([a-z0-9][a-z0-9-]*-([0-9]{5,15}))\/?$/i);
 if(!match)throw new Error('Нужна ссылка вида https://kaspi.kz/shop/p/название-ID/.');
 return {url:`https://kaspi.kz/shop/p/${match[1]}/`,productId:match[2]};
}
/** Allowlist boundary for client submissions and cached/saved product snapshots. */
export function sanitizeProduct(value:unknown):PublicProduct {
 if(!value||typeof value!=='object')throw new Error('Некорректная карточка');
 const x=value as Record<string,unknown>;
 const str=(key:string,max:number,nullable=false):string|null=>{const v=x[key];if(nullable&&v===null)return null;if(typeof v!=='string'||v.length>max)throw new Error(`Некорректное поле карточки: ${key}`);return v;};
 const url=str('url',2000)!;const canonical=normalizeKaspiUrl(url);
 if(x.productId!==canonical.productId||x.source!=='kaspi-public-html'||x.currency!=='KZT'||typeof x.city!=='string'||!Object.hasOwn(cities,x.city)||typeof x.fetchedAt!=='string'||!Number.isFinite(Date.parse(x.fetchedAt)))throw new Error('Некорректный источник карточки');
 if(x.price!==null&&(typeof x.price!=='number'||!Number.isFinite(x.price)||x.price<=0||x.price>1e9))throw new Error('Некорректная цена карточки');
 let image=str('image',2000,true);if(image){const u=new URL(image);if(u.protocol!=='https:'||u.hostname!=='resources.cdn-kaspi.kz'||u.port||u.username||u.password)image=null;}
 const attributes=Array.isArray(x.attributes)?x.attributes.slice(0,50).map(a=>{if(!a||typeof a.name!=='string'||typeof a.value!=='string')throw new Error('Некорректные характеристики');return {name:a.name.slice(0,120),value:a.value.slice(0,300)};}):[];
 return {productId:canonical.productId,url:canonical.url,name:str('name',500)!,image,brand:str('brand',120,true),category:str('category',160,true),description:str('description',3000,true),price:x.price as number|null,currency:'KZT',city:x.city,cityVerified:false,fetchedAt:x.fetchedAt,source:'kaspi-public-html',attributes};
}
