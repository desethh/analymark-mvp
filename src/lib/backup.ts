import {DatabaseSync,backup} from 'node:sqlite';
import {mkdir,chmod} from 'node:fs/promises';
import {join} from 'node:path';
export async function createBackup(source:DatabaseSync,dir:string){await mkdir(dir,{recursive:true,mode:0o700});const path=join(dir,'analymark-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');await backup(source,path);await chmod(path,0o600);const copy=new DatabaseSync(path,{readOnly:true});try{const check=copy.prepare('PRAGMA integrity_check').get();if(!check||Object.values(check)[0]!=='ok')throw Error('Backup integrity check failed');}finally{copy.close();}return path;}
