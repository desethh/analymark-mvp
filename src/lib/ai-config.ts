import 'server-only';
export function isAiConfigured(){return process.env.OPENAI_ENABLED==='true'&&!!process.env.OPENAI_API_KEY?.trim();}
