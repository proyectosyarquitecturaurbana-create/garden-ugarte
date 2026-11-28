// Verifica un tour: saca capturas de cada escena y de cada punto de paso.
// Uso: node tools/tour/verificar.js <id-tour> <carpeta-salida> [ancho alto]
// Usa el Chromium preinstalado (require('playwright')).
const { chromium } = require('playwright'); const fs = require('fs'); const http = require('http'); const path = require('path');
const raiz = path.resolve(__dirname, '..', '..'); const [id, out, W = 1280, H = 800] = process.argv.slice(2);
if (!id || !out) { console.log('Uso: node tools/tour/verificar.js <id-tour> <salida> [ancho alto]'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const f = path.join(raiz, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': tipos[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const espera = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const port = srv.address().port; const T = JSON.parse(fs.readFileSync(path.join(raiz, 'data/tours', id + '.json'), 'utf8'));
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +W, height: +H } });
  const errores = []; p.on('pageerror', e => errores.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts/.test(m.text())) errores.push(m.text()); });
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto(`http://localhost:${port}/tour.html?t=${id}&entrada=0`);
  await p.waitForSelector('.t360-titulo:not(:empty)', { timeout: 20000 }); await espera(1500);
  // acceso al visor
  await p.evaluate(() => { const v = document.querySelector('.t360-visor'); window.__v = null; });
  for (const [eid, e] of Object.entries(T.escenas)) {
    await p.evaluate(x => { const b = [...document.querySelectorAll('.t360-tira button')].find(b => b.dataset.e === x); if (b) b.click(); }, eid);
    await espera(2200);
    await p.screenshot({ path: `${out}/${eid}-inicio.png` });
    let k = 0;
    for (const pt of (e.puntos || [])) {
      k++;
      // mirar el punto: arrastre programático no es fiable; usamos teclado no. Captura con el punto centrado vía API expuesta.
      await p.evaluate(([y, pi]) => window.__tour && window.__tour.viewer.lookAt(pi, y, 90, false), [pt.yaw, pt.pitch]);
      await espera(700);
      await p.screenshot({ path: `${out}/${eid}-punto${k}-${pt.tipo || 'paso'}.png` });
    }
  }
  console.log('capturas en', out, errores.length ? 'ERRORES: ' + errores.join(' | ') : 'sin errores');
  await b.close(); srv.close();
})();
