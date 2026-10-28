import {load} from 'cheerio';
import {normalizeKaspiUrl, type PublicProduct} from './public-product.ts';
type Obj=Record<string,unknown>;
const obj=(v:unknown):Obj=>v&&typeof v==='object'&&!Array.isArray(v)?v as Obj:{};
function text(v:unknown,max=500):string|null {if(typeof v!=='string')return null;const $=load(v);$('script,style').remove();return $.text().replace(/\s+/g,' ').trim().slice(0,max)||null;}
function price(v:unknown):number|null {if(typeof v!=='number'&&typeof v!=='string')return null;const n=Number(String(v).replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)&&n>0&&n<=1e9?n:null;}
function productNode(value:unknown,depth=0):Obj|null {
 if(depth>8)return null;
 if(Array.isArray(value)){for(const entry of value){const found=productNode(entry,depth+1);if(found)return found;}return null;}
 const x=obj(value);const type=x['@type'];if(type==='Product'||Array.isArray(type)&&type.includes('Product'))return x;
 return x['@graph']?productNode(x['@graph'],depth+1):null;
}
export function parseKaspiProduct(html:string,url:string,city:string,now=new Date().toISOString()):PublicProduct {
 const canonical=normalizeKaspiUrl(url);const $=load(html);
 let product:Obj={};
 $('script[type="application/ld+json"]').each((_,script)=>{if(Object.keys(product).length)return;try{product=productNode(JSON.parse($(script).text()))??{};}catch{/* Ignore malformed unrelated structured markup. */}});
 const sku=product.sku??product.productID;
 if(sku!==undefined&&String(sku)!==canonical.productId)throw new Error('Карточка вернула другой идентификатор товара.');
 const meta=(key:string)=>$(`meta[property="${key}"]`).attr('content')??$(`meta[name="${key}"]`).attr('content');
 const name=text(product.name??$('h1').first().text()??meta('og:title'))||text(meta('og:title'));
 if(!name||!Object.keys(product).length)throw new Error('Не удалось найти публичную разметку товара. Возможно, Kaspi изменил страницу или ограничил доступ.');
 const offerValues=Array.isArray(product.offers)?product.offers:[product.offers];
 const prices=offerValues.map(offer=>{const x=obj(offer);if(x.priceCurrency&&x.priceCurrency!=='KZT')return null;return price(x.lowPrice??x.price);}).filter((p):p is number=>p!==null);
 const metaPrice=meta('product:price:currency')==='KZT'?price(meta('product:price:amount')):null;
 const rawImage=Array.isArray(product.image)?product.image[0]:product.image;
 const imageValue=typeof rawImage==='string'?rawImage:obj(rawImage).url;
 let image:string|null=null;try{const u=new URL(String(imageValue??meta('og:image')));if(u.protocol==='https:'&&u.hostname==='resources.cdn-kaspi.kz'&&!u.port)image=u.href;}catch{}
 const attributes:{name:string;value:string}[]=[];
 if(Array.isArray(product.additionalProperty))for(const entry of product.additionalProperty.slice(0,50)){const x=obj(entry),name=text(x.name,120),value=text(x.value,300);if(name&&value)attributes.push({name,value});}
 $('.specifications-list__spec').slice(0,50).each((_,entry)=>{const name=text($(entry).find('.specifications-list__spec-term').first().text(),120),value=text($(entry).find('.specifications-list__spec-definition').first().text(),300);if(name&&value&&!attributes.some(a=>a.name===name))attributes.push({name,value});});
 // Explicit product field allowlist. Never copy offers, sellers, contacts or raw HTML.
 return {productId:canonical.productId,url:canonical.url,name,image,brand:text(typeof product.brand==='string'?product.brand:obj(product.brand).name,120),category:text(product.category,160),description:text(product.description,3000),price:prices.length?Math.min(...prices):metaPrice,currency:'KZT',city,cityVerified:false,fetchedAt:now,source:'kaspi-public-html',attributes};
}
