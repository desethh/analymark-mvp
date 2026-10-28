import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
let instance: DatabaseSync | undefined;
export function database() {
 if(!instance){const dir=join(process.cwd(),'data');mkdirSync(dir,{recursive:true});instance=new DatabaseSync(join(dir,'analymark.sqlite'));instance.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS calculations (id TEXT PRIMARY KEY, name TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL)');}
 initAccounts(instance);return instance;
}

export function initAccounts(db:DatabaseSync){
 db.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);`);
 if(!db.prepare('PRAGMA table_info(calculations)').all().some(c=>c.name==='user_id'))db.exec('ALTER TABLE calculations ADD COLUMN user_id TEXT REFERENCES users(id)');
 db.exec('CREATE INDEX IF NOT EXISTS calculations_user ON calculations(user_id); CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at)');
}
