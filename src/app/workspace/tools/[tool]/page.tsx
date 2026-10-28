import {isAiConfigured} from '@/lib/ai-config';
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {requireAccount} from '@/lib/auth';
import {toolCatalog,isAiTool} from '@/lib/tool-catalog';
import {PublicHeader} from '@/components/public-header';
import {AiToolForm} from '@/components/ai-tool-form';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{tool:string}>}){const {tool}=await params;if(!isAiTool(tool))notFound();await requireAccount('/workspace/tools/'+tool);const info=toolCatalog.find(t=>t.id===tool)!;return <div className="public-shell"><PublicHeader signedIn/><main className="tool-workspace"><Link href="/workspace/tools" className="text-button">← Все инструменты</Link><div className="tool-page-heading"><span className="section-kicker">ИИ-ПОМОЩНИК ПРОДАВЦА</span><h1>{info.name}</h1><p>{info.description}</p></div><nav className="tool-quick-nav" aria-label="ИИ-инструменты">{toolCatalog.filter(t=>t.mode==='ai').map(t=><Link key={t.id} href={t.href!} aria-current={t.id===tool?'page':undefined}>{t.name}</Link>)}</nav><AiToolForm key={tool} tool={tool} ready={isAiConfigured()}/></main></div>;}
