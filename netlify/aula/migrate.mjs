// Run explicitly against the PRIVATE Aula PostgreSQL instance, never in a public build.
// Uses transactional versioned migrations with checksums to detect drift.
import {getDatabase} from '@netlify/database';
import {createHash} from 'node:crypto';
import {readdir,readFile} from 'node:fs/promises';
const url=String(process.env.GASI_AULA_DB_URL||process.env.GASI_INTEGRATION_DB_URL||'');
if(!url||!/^postgres(?:ql)?:\/\//.test(url))throw new Error('A private PostgreSQL URL is required.');
const directory=new URL('./migrations/',import.meta.url);
const files=(await readdir(directory)).filter(x=>/^\d{3}_[a-z0-9_-]+\.sql$/.test(x)).sort();
if(!files.length)throw new Error('No migrations found.');
const db=getDatabase({connectionString:url});
const client=await db.pool.connect();
try{
 await client.query('CREATE TABLE IF NOT EXISTS aula_schema_migrations(version text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
 for(const filename of files){
   const sql=await readFile(new URL(filename,directory),'utf8');
   if(/^\s*BEGIN\s*;|\bCOMMIT\s*;/im.test(sql))throw new Error('Migration must not manage its own transaction: '+filename);
   const checksum=createHash('sha256').update(sql).digest('hex');
   await client.query('BEGIN');
   try{
     await client.query('SELECT pg_advisory_xact_lock(652117,49025)');
     const previous=(await client.query('SELECT checksum FROM aula_schema_migrations WHERE version=$1',[filename])).rows[0];
     if(previous){
       if(previous.checksum!==checksum)throw new Error('Migration checksum mismatch: '+filename);
       console.log('Already applied: '+filename);
     }else{
       await client.query(sql);
       await client.query('INSERT INTO aula_schema_migrations(version,checksum) VALUES($1,$2)',[filename,checksum]);
       console.log('Applied: '+filename);
     }
     await client.query('COMMIT');
   }catch(error){await client.query('ROLLBACK');throw error;}
 }
}finally{client.release();await db.pool.end();}
