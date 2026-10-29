import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {generateAi} from '../src/lib/ai-service.ts';
import {validateAiInput} from '../src/lib/ai-core.ts';
import {readAiConfiguration} from '../src/lib/ai-settings.ts';

const config=readAiConfiguration();
if(config?.provider!=='ollama')throw new Error('Enable AI_PROVIDER=ollama and AI_ENABLED=true before this check.');
const results=[];
for(const tool of ['audit','seo','reviews'] as const){
 const started=Date.now();
 const input=validateAiInput({tool,title:'USB-C адаптер 20 Вт',description:'Адаптер питания USB-C, мощность 20 Вт. Кабель в комплект не входит.',review:'Адаптер работает, но я ожидал увидеть кабель в комплекте.',attributes:'Разъём: USB-C. Мощность: 20 Вт.'});
 const result=await generateAi(input,config);
 results.push({tool,model:config.model,elapsedMs:Date.now()-started,result});
 console.log(`PASS ${tool}: ${results.at(-1)!.elapsedMs} ms, ${result.items.length} findings, ${result.draft.length} draft characters`);
}
const dir=join(process.cwd(),'docs','qa');await mkdir(dir,{recursive:true});
await writeFile(join(dir,'ollama-live.json'),JSON.stringify({checkedAt:new Date().toISOString(),provider:'ollama',model:config.model,syntheticInputs:true,results},null,2));
