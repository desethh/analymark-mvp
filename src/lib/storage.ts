import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
let instance: DatabaseSync | undefined;
export function database() {
 if(!instance){const dir=process.env.DATA_DIR||join(process.cwd(),'data');mkdirSync(dir,{recursive:true});instance=new DatabaseSync(join(dir,'analymark.sqlite'));instance.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS calculations (id TEXT PRIMARY KEY, name TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL)');initAccounts(instance);}
 return instance;
}

export function initAccounts(db:DatabaseSync){
 db.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);`);
 if(!db.prepare('PRAGMA table_info(calculations)').all().some(c=>c.name==='user_id'))db.exec('ALTER TABLE calculations ADD COLUMN user_id TEXT REFERENCES users(id)');
 if(!db.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='email_verified_at'))db.exec('ALTER TABLE users ADD COLUMN email_verified_at INTEGER');
 if(!db.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='privacy_accepted_at'))db.exec('ALTER TABLE users ADD COLUMN privacy_accepted_at INTEGER');
 if(!db.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='onboarding_pending'))db.exec('ALTER TABLE users ADD COLUMN onboarding_pending INTEGER NOT NULL DEFAULT 0 CHECK(onboarding_pending IN (0,1))');
 db.exec(`CREATE TABLE IF NOT EXISTS account_tokens (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')),expires_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS account_tokens_user ON account_tokens(user_id,purpose);`);
 db.exec('CREATE INDEX IF NOT EXISTS calculations_user ON calculations(user_id); CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at)');
}
