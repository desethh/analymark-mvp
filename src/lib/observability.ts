import {randomUUID} from 'node:crypto';
// Only fixed event codes and numeric status/timing. No request bodies, URLs, user data or errors.
export function logEvent(event:string,status:number,elapsedMs?:number){const id=randomUUID();console.info(JSON.stringify({time:new Date().toISOString(),event:event.replace(/[^a-z0-9_.-]/gi,'').slice(0,64),status,elapsedMs,id}));return id;}
