import {initAccounts} from '../src/lib/storage.ts';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,cp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
const source=process.argv[2];if(!source)throw Error('Pass backup path. Live database is never overwritten.');
const dir=await mkdtemp(join(tmpdir(),'analymark-restore-'));try{const path=join(dir,'restored.sqlite');await cp(resolve(source),path);const db=new DatabaseSync(path);try{initAccounts(db);assert.equal(Object.values(db.prepare('PRAGMA integrity_check').get()!)[0],'ok');for(const table of ['users','calculations','sessions','account_tokens'])assert.ok(db.prepare('SELECT name FROM sqlite_master WHERE type=? AND name=?').get('table',table));console.log('PASS: isolated restore, schema migration, integrity and application tables.');}finally{db.close();}}finally{const target=resolve(dir);if(!target.startsWith(resolve(tmpdir())+String.fromCharCode(92))&&process.platform==='win32')throw Error('Unexpected temporary path');await rm(target,{recursive:true,force:true});}
