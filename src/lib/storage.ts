import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
let instance: DatabaseSync | undefined;
export function database() {
 if(!instance){const dir=join(process.cwd(),'data');mkdirSync(dir,{recursive:true});instance=new DatabaseSync(join(dir,'analymark.sqlite'));instance.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS calculations (id TEXT PRIMARY KEY, name TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL)');}
 return instance;
}
