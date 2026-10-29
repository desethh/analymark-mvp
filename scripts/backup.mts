import {database} from '../src/lib/storage.ts';
import {createBackup} from '../src/lib/backup.ts';
import {join} from 'node:path';
const db=database();try{console.log(await createBackup(db,process.env.BACKUP_DIR||join(process.cwd(),'data','backups')));}finally{db.close();}
