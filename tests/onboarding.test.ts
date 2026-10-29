import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initAccounts} from '../src/lib/storage.ts';
import {onboardingPending,dismissOnboarding} from '../src/lib/onboarding.ts';

test('onboarding migration preserves existing accounts and remains repeatable',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec("CREATE TABLE calculations (id TEXT PRIMARY KEY,name TEXT,payload TEXT,created_at TEXT);CREATE TABLE users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,created_at INTEGER NOT NULL);INSERT INTO users VALUES ('old','old@example.invalid','Old','hash',0)");
  initAccounts(db);initAccounts(db);
  assert.equal(onboardingPending(db,'old'),false);
  assert.equal(db.prepare('SELECT name,password_hash FROM users WHERE id=?').get('old')?.password_hash,'hash');
 }finally{db.close();}
});

test('completing or skipping the guide persists only for the signed-in account',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('CREATE TABLE calculations (id TEXT PRIMARY KEY,name TEXT,payload TEXT,created_at TEXT)');initAccounts(db);
  for(const id of ['a','b'])db.prepare('INSERT INTO users (id,email,name,password_hash,created_at,onboarding_pending) VALUES (?,?,?,?,?,1)').run(id,id+'@example.invalid',id,'hash',0);
  assert.equal(onboardingPending(db,'a'),true);dismissOnboarding(db,'a');initAccounts(db);
  assert.equal(onboardingPending(db,'a'),false);assert.equal(onboardingPending(db,'b'),true);
  dismissOnboarding(db,'a');dismissOnboarding(db,'missing');
  assert.equal(onboardingPending(db,'b'),true);
 }finally{db.close();}
});
