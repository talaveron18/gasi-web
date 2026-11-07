const fs = require('node:fs');
const path = require('node:path');

const sourcePages = [
  'Home.jsx', 'QuienesSomos.jsx', 'Sectores.jsx', 'Servicios.jsx',
  'CoberturaSanitaria.jsx', 'FormacionSanitaria.jsx',
];
const photoIds = [
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
const dir = path.resolve(__dirname, '../public/images');

describe('fotografías públicas locales', () => {
  test.each(photoIds)('el recurso photo-%s.jpg es un JPEG propio válido', id => {
    const file = path.join(dir, `photo-${id}.jpg`);
    const image = fs.readFileSync(file);
    expect(image.length).toBeGreaterThan(4096);
    expect([...image.subarray(0, 2)]).toEqual([0xff, 0xd8]);
    expect([...image.subarray(-2)]).toEqual([0xff, 0xd9]);
  });

  test.each(sourcePages)('%s no contiene enlaces ni proxy de imágenes de Unsplash', name => {
    const source = fs.readFileSync(path.join(__dirname, 'pages', name), 'utf8');
    expect(source).not.toMatch(/https:\/\/images\\.unsplash\\.com/);
    expect(source).not.toMatch(/publicImage\\(/);
    const used = [...source.matchAll(/\/images\/(photo-[0-9a-z-]+\\.jpg)/g)].map(m => m[1]);
    expect(used.length).toBeGreaterThan(0);
    used.forEach(filename => expect(fs.existsSync(path.join(dir, filename))).toBe(true));
  });
});
