import {isAiConfigured} from '@/lib/ai-config';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireAccount} from '@/lib/auth';
import {PublicHeader} from '@/components/public-header';
import {ToolCatalog} from '@/components/tool-catalog';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export default async function Page(){await requireAccount('/workspace/tools');return <div className="public-shell"><PublicHeader signedIn/><main className="tool-workspace"><Link className="text-button" href="/workspace">← К анализу товара</Link><ToolCatalog aiReady={isAiConfigured()}/></main></div>;}
