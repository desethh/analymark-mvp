import 'server-only';
import {readAiConfiguration} from './ai-settings';
export function isAiConfigured(){try{return readAiConfiguration()!==null;}catch{return false;}}
export function aiPresentation(){
 try{const config=readAiConfiguration();if(config)return {provider:config.provider,model:config.model};}catch{}
 return {provider:process.env.AI_PROVIDER==='openai'?'openai' as const:'ollama' as const,model:process.env.AI_PROVIDER==='openai'?'OpenAI':'qwen3.5:9b'};
}
