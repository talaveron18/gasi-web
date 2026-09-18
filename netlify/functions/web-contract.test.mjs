import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=path.resolve(process.cwd(),"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const app=read("frontend/src/App.js");
const navbar=read("frontend/src/components/Navbar.jsx");
const chatbot=read("frontend/src/components/Chatbot.jsx");
const formation=read("frontend/src/pages/FormacionSanitaria.jsx");
const netlifyToml=read("netlify.toml");
const robots=read("frontend/public/robots.txt");
const sitemap=read("frontend/public/sitemap.xml");

test("public routes expose the finished commercial website",()=>{
 for(const route of ["/servicios","/cobertura-sanitaria","/servicios-sanitarios-organizaciones","/formacion-sanitaria","/sectores","/contacto","/quienes-somos","/politica-privacidad","/politica-cookies","/aviso-legal"]){
  assert.match(app,new RegExp(route.replaceAll("/","\\/")));
 }
});

test("training is directly visible and no longer depends on legacy course backend",()=>{
 assert.match(navbar,/Formación/);
 assert.match(navbar,/\/formacion-sanitaria/);
 assert.doesNotMatch(formation,/REACT_APP_BACKEND_URL|\/api\/courses|axios\./);
});

test("chatbot uses the shared production contact endpoint",()=>{
 assert.match(chatbot,/\/\.netlify\/functions\/contact/);
 assert.doesNotMatch(chatbot,/\/\.netlify\/functions\/chatbot/);
});

test("frontend no longer references provisional builder assets or legacy backend env",()=>{
 const sourceDir=path.join(root,"frontend","src");
 const files=[];
 const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(/\.(js|jsx|ts|tsx|css)$/.test(entry.name))files.push(full);}};
 walk(sourceDir);
 const text=files.map(f=>fs.readFileSync(f,"utf8")).join("\n");
 assert.doesNotMatch(text,/emergentagent\.com/);
 assert.doesNotMatch(text,/REACT_APP_BACKEND_URL/);
});

test("professional area is protected from indexing and caching",()=>{
 assert.match(netlifyToml,/for = "\/interno\/\*"[\s\S]*X-Robots-Tag = "noindex, nofollow, noarchive"[\s\S]*Cache-Control = "no-store"/);
 assert.match(robots,/Disallow: \/interno\//);
});

test("sitemap includes all important public conversion pages and excludes internal area",()=>{
 for(const route of ["servicios","cobertura-sanitaria","formacion-sanitaria","contacto","quienes-somos"]){
  assert.match(sitemap,new RegExp(route));
 }
 assert.doesNotMatch(sitemap,/\/interno\//);
});
