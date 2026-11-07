// One-time, reproducible vendoring of photos already used on GASI's public pages.
// Source: https://images.unsplash.com/photo-<id>, licensed under https://unsplash.com/license
// This script only writes local JPG files, never changes application code or deploys.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const ids = [
  "1576091160550-2173dba999ef",
  "1503676260728-1c00da094a0b",
  "1586528116311-ad8dd3c8310d",
  "1647427060118-4911c9821b82",
  "1441986300917-64674bd600d8",
  "1497366754035-f200968a6e72",
  "1576091160399-112ba8d25d1d",
  "1559839734-2b71ea197ec2",
  "1584982751601-97dcc096659c",
  "1497366811353-6870744d04b2",
  "1504307651254-35680f356dfd",
  "1517248135467-4c7edcad34c4"
];
const outputDir = resolve('frontend/public/images');
await mkdir(outputDir, { recursive: true });

const isJpeg = b => b.length > 4096 && b[0] === 0xff && b[1] === 0xd8 && b[b.length - 2] === 0xff && b[b.length - 1] === 0xd9;
const sleep = ms => new Promise(r => setTimeout(r, ms));

for (const id of ids) {
  const name = `photo-${id}.jpg`;
  const file = join(outputDir, name);
  try {
    if (isJpeg(await readFile(file))) { console.log('Already valid:', name); continue; }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const source = `https://images.unsplash.com/photo-${id}?fm=jpg&fit=crop&w=1600&q=78`;
  let done = false;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(source, {
        headers: { 'Accept': 'image/jpeg', 'User-Agent': 'GASI-public-image-asset-vendoring/1.0' },
        signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!isJpeg(bytes)) throw new Error(`Invalid JPEG or empty image (${bytes.length} bytes)`);
      await writeFile(file, bytes);
      console.log('Saved:', name, bytes.length, 'bytes');
      done = true;
      break;
    } catch (error) {
      console.error(`Attempt ${attempt}/4 for ${name}:`, error.message);
      if (attempt < 4) await sleep(attempt * 2000);
    }
  }
  if (!done) throw new Error(`Could not download and verify ${name}`);
}

const readme = `# Fotografías de la web pública de GASI

Estas 12 imágenes están almacenadas localmente para que el sitio no dependa de conexiones del navegador a un proveedor externo.

Origen: https://images.unsplash.com/photo-<identificador>
Licencia de las imágenes originales: https://unsplash.com/license
La licencia permite uso comercial sin permiso ni atribución obligatoria, con las limitaciones descritas por Unsplash.

Listado de identificadores originales:
${ids.map(id => '- photo-' + id).join('\n')}

Las imágenes se obtuvieron en formato JPG a un ancho máximo de 1600 px y calidad 78.
`;
await writeFile(join(outputDir, 'FUENTES-UNSPLASH.md'), readme, 'utf8');
console.log('Done. Assets:', ids.length);
