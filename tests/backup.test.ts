import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createBackup} from '../src/lib/backup.ts';
test('online SQLite backup preserves committed WAL data and leaves source writable',async()=>{const dir=await mkdtemp(join(tmpdir(),'analymark-backup-test-'));const db=new DatabaseSync(join(dir,'source.sqlite'));try{db.exec('PRAGMA journal_mode=WAL;CREATE TABLE example(id TEXT,value TEXT)');db.prepare('INSERT INTO example VALUES (?,?)').run('a','committed-wal');const file=await createBackup(db,join(dir,'copies'));const restored=new DatabaseSync(file,{readOnly:true});try{assert.equal(restored.prepare('SELECT value FROM example').get()?.value,'committed-wal');}finally{restored.close();}db.prepare('INSERT INTO example VALUES (?,?)').run('b','still-writable');assert.equal(db.prepare('SELECT count(*) AS n FROM example').get()?.n,2);}finally{db.close();if(!resolve(dir).startsWith(resolve(tmpdir())))throw Error('Unexpected temp directory');await rm(dir,{recursive:true,force:true});}});
