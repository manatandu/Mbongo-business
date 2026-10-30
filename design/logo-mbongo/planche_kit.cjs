// Planche du kit : node planche_kit.cjs (NODE_PATH vers Playwright). Écrit kit/planche-kit.png.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const K = path.join(__dirname, 'kit');
const b64 = (f) => 'data:' + (f.endsWith('.png') ? 'image/png' : 'image/svg+xml') + ';base64,' + fs.readFileSync(path.join(K, f)).toString('base64');
const police = 'data:font/woff2;base64,' + fs.readFileSync(path.join(__dirname, '../../src/ui/polices/archivo-latin-wdth-normal.woff2')).toString('base64');
const fonds = { couleur: '#fff', negatif: '#0B2A52', nuit: '#fff', noir: '#fff', blanc: '#3b4656' };
const bloc = (titre, contenu) => `<section><h2>${titre}</h2><div class="l">${contenu}</div></section>`;
const html = `<style>@font-face{font-family:A;src:url(${police});font-weight:100 900;font-stretch:62% 125%}
body{margin:0;padding:44px;font-family:A,sans-serif;color:#13202f;background:#fff}h1{font-size:30px;font-weight:800;font-stretch:118%;color:#0B2A52;margin:0 0 4px}
p{margin:0 0 26px;color:#556579}section{border-top:2px solid #0B2A52;padding:14px 0 26px}h2{font-size:17px;margin:0 0 14px}
.l{display:flex;flex-wrap:wrap;gap:16px;align-items:center}.f{padding:22px;border-radius:14px;display:flex;align-items:center;gap:18px;border:1px solid #dde6f1}
.c{display:flex;gap:10px;align-items:center}.s{font-size:12px;color:#556579}</style>
<h1>Mbongo Business · kit du logo</h1><p>Piste C, « le compte au bâton ». Bleu nuit #0B2A52, or #C99A06 (fond clair) et #E0B21B (fond foncé).</p>
${bloc('Logo horizontal', Object.keys(fonds).map((v) => `<div class="f" style="background:${fonds[v]}"><img src="${b64('mbongo-horizontal-' + v + '.svg')}" height="56"></div>`).join(''))}
${bloc('Logo empilé et symbole', ['couleur', 'negatif'].map((v) => `<div class="f" style="background:${fonds[v]}"><img src="${b64('mbongo-empile-' + v + '.svg')}" height="120"><img src="${b64('mbongo-symbole-' + v + '.svg')}" height="80"></div>`).join(''))}
${bloc('Petite taille (32 px et moins) et icônes', `<div class="f"><div class="c">${[48, 32, 16].map((t) => `<img src="${b64('mbongo-icone-petite.svg')}" width="${t}">`).join('')}</div><span class="s">icône petite</span></div>
<div class="f"><div class="c"><img src="${b64('mbongo-icone-appli.svg')}" width="96"><img src="${b64('mbongo-icone-appli.svg')}" width="64"></div><span class="s">icône d'appli</span></div>
<div class="f"><div class="c">${['couleur', 'noir'].map((v) => [32, 16].map((t) => `<img src="${b64('mbongo-symbole-petit-' + v + '.svg')}" width="${t}">`).join('')).join('')}</div><span class="s">symbole petit, couleur et noir</span></div>`)}`;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); await p.setContent(html); await p.waitForTimeout(300); await p.screenshot({ path: path.join(K, 'planche-kit.png'), fullPage: true }); await b.close(); })();
