// One-time private bootstrap. Never run during a Netlify build or from a
// public request. Supply secrets through a protected local environment.
import bcrypt from "bcryptjs";
import {getDatabase} from "@netlify/database";

const email=String(process.env.AULA_BOOTSTRAP_EMAIL||"").trim().toLowerCase();
const name=String(process.env.AULA_BOOTSTRAP_NAME||"").trim();
const password=String(process.env.AULA_BOOTSTRAP_PASSWORD||"");
const dbUrl=String(process.env.GASI_AULA_DB_URL||"");
const confirmed=process.env.AULA_BOOTSTRAP_CONFIRM==="CREATE_FIRST_ADMIN";
if(!confirmed||!dbUrl||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||name.length<2||password.length<12||password.length>128){
  console.error("Bootstrap refused: private PostgreSQL URL, email, display name, strong password, and explicit confirmation are required.");
  process.exit(1);
}
const db=getDatabase({connectionString:dbUrl});
const client=await db.pool.connect();
try{
  await client.query("BEGIN");
  try{
    // Prevent two concurrent bootstrap processes from both observing zero admins.
    await client.query("SELECT pg_advisory_xact_lock(652117,49026)");
    const admins=await client.query("SELECT count(*)::int AS amount FROM aula_users WHERE role='admin'");
    if(admins.rows[0].amount!==0)throw new Error("Bootstrap refused: an administrator account already exists.");
    await client.query("INSERT INTO aula_users(email,name,role,password_hash,must_change_password) VALUES($1,$2,'admin',$3,TRUE)",[
      email,name,await bcrypt.hash(password,12)
    ]);
    await client.query("COMMIT");
    console.log("Private Aula administrator created. Change the bootstrap password at first login and remove AULA_BOOTSTRAP_PASSWORD from the environment.");
  }catch(error){await client.query("ROLLBACK");throw error;}
}finally{
  client.release();await db.pool.end();
}
