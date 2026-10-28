import {randomBytes} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {tokenHash} from './auth-core.ts';
export type TokenPurpose='verify'|'reset';
export function issueAccountToken(db:DatabaseSync,userId:string,purpose:TokenPurpose,now=Date.now()){
 const token=randomBytes(32).toString('hex');db.exec('BEGIN IMMEDIATE');try{db.prepare('DELETE FROM account_tokens WHERE (user_id=? AND purpose=?) OR expires_at<=?').run(userId,purpose,now);db.prepare('INSERT INTO account_tokens VALUES (?,?,?,?)').run(tokenHash(token),userId,purpose,now+(purpose==='reset'?30:60)*60000);db.exec('COMMIT');return token;}catch(e){db.exec('ROLLBACK');throw e;}
}
export function completeAccountToken(db:DatabaseSync,token:unknown,purpose:TokenPurpose,passwordHash?:string,now=Date.now()){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return false;
 db.exec('BEGIN IMMEDIATE');try{const row=db.prepare('SELECT user_id FROM account_tokens WHERE token_hash=? AND purpose=? AND expires_at>?').get(tokenHash(token),purpose,now);if(!row){db.exec('ROLLBACK');return false;}
 if(purpose==='verify'){db.prepare('UPDATE users SET email_verified_at=? WHERE id=?').run(now,row.user_id);db.prepare('DELETE FROM account_tokens WHERE user_id=? AND purpose=?').run(row.user_id,'verify');}
 else{if(!passwordHash)throw new Error('Missing password hash');db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash,row.user_id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id);db.prepare('DELETE FROM account_tokens WHERE user_id=?').run(row.user_id);}
 db.exec('COMMIT');return true;}catch(e){db.exec('ROLLBACK');throw e;}
}
export function verificationRequired(){return process.env.NODE_ENV==='production'||process.env.REQUIRE_EMAIL_VERIFICATION!=='false';}
