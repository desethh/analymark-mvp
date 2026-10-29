import 'server-only';
import {readAiConfiguration} from './ai-settings';
export function isAiConfigured(){try{return readAiConfiguration()!==null;}catch{return false;}}
export function aiPresentation(){
 try{const config=readAiConfiguration();if(config)return {provider:config.provider,model:config.model};}catch{}
 const local=(process.env.AI_PROVIDER?.trim()||'ollama')==='ollama';
 return {provider:local?'ollama' as const:'openai' as const,model:local?(process.env.OLLAMA_MODEL?.trim()||'qwen3:14b'):(process.env.OPENAI_MODEL?.trim()||'gpt-4.1-mini')};
}
