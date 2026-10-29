import type {DatabaseSync} from 'node:sqlite';

export function onboardingPending(db:DatabaseSync,userId:string){
 return db.prepare('SELECT onboarding_pending FROM users WHERE id=?').get(userId)?.onboarding_pending===1;
}

export function dismissOnboarding(db:DatabaseSync,userId:string){
 db.prepare('UPDATE users SET onboarding_pending=0 WHERE id=?').run(userId);
}
