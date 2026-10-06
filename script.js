'use strict';
/* ORYZAVELLE — deterministic infinite archive. Profile ID (BigInt) is the seed. */

/* ---------- word fragments ---------- */
const W = s => s.split(' ');
const P1 = W('Ae Vael Qor Nyth Ely Qel Zor Oryz Thal Ix Sy Vor Kael Myr Ul Ser Nox Phae Xel Aev Ny Tor');
const P2 = ['', '', 'a', 'e', 'i', 'o', 'y', 'ae', 'ei', 'ar', 'el', 'or', 'yn'];
const P3 = W('rion vane qora ynth varis velle thys lume ndra rix sora vael mere dyne');
const ADJ = W('Dimensional Astral Void Lattice Silent Hollow Resonant Obsidian Pale Tidal Echo Prismatic Veiled Nameless');
const NOUN = W('Entity Construct Archive Wanderer Sovereign Lineage Phenomenon Intelligence Relic Cartographer');
const WA = W('Silent Pale Fractured Hollow Drifting Veiled Quiet Sunken');
const WN = W('Meridian Reach Basin Spire Verge Orbit Tide Threshold Expanse');
const EN = W('Aetheric Umbral Lunar Static Harmonic Null Prismatic Quiet');
const ST = W('Observed Dormant Drifting Sealed Awakening Unmapped Archived');
const SF = W('Strain Lineage Host Form Clade');
const CV = W('Choir Concord Assembly Covenant Syndicate Order');
const DM = W('Folded Mirrored Nested Thin Deep');
const LA = W('Arc Gate Shelf Drift Rim Vault');
const ER = 'Pre-Silence|Early Lattice|Midrift|Afterglow|Deepwake|Unnumbered'.split('|');
const OP = ['A luminous', 'A silent', 'A fractured', 'A patient', 'An ancient', 'A drifting', 'A veiled', 'A resonant'];
const PL = ['beyond the mapped boundary', 'inside a folded corridor', 'beneath a dormant star', 'between two silent tides', 'past the final signal of the map'];
const S2 = ['Its signal repeats every # cycles.', 'Records disagree on its origin.', 'Observers describe a faint harmonic.', 'No instrument has measured it twice.', 'It is remembered by those who never met it.', 'Its shape shifts when unobserved.', 'It has been catalogued # times, never identically.'];
const TY = {
  WORLD: ['Shard', 'Ocean', 'Lattice', 'Desert', 'Moon'],
  SPECIES: ['Strain', 'Lineage', 'Clade', 'Host', 'Swarm'],
  CIVILIZATION: ['Concord', 'Choir', 'Assembly', 'Covenant', 'Order'],
  DIMENSION: ['Plane', 'Fold', 'Layer', 'Pocket', 'Reach'],
  ARTIFACT: ['Beacon', 'Lens', 'Seed', 'Engine', 'Codex', 'Key']
};
const KINDS = Object.keys(TY);
const GL = '◇◈◎△▽✦✧⊕⊗☉☽';

/* ---------- deterministic RNG: BigInt id -> sfc32 ---------- */
const mx = (h, w) => { h = Math.imul(h ^ w, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return h ^ h >>> 16; };
function rng(kind, id) {
  let a = 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = 0x1b873593;
  for (let i = 0; i < kind.length; i++) { a = mx(a, kind.charCodeAt(i)); b = mx(b, a + i); }
  let x = id;                                   // fold any-size BigInt, 32 bits at a time
  do {
    const w = Number(x & 0xffffffffn) | 0;
    a = mx(a, w); b = mx(b, a ^ w); c = mx(c, b + w | 0); d = mx(d, c ^ a);
    x >>= 32n;
  } while (x > 0n);
  const f = () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (a + b | 0) + d | 0;
    d = d + 1 | 0; a = b ^ b >>> 9; b = c + (c << 3) | 0; c = (c << 21 | c >>> 11) + t | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 12; i++) f();
  return f;
}
const pk = (r, a) => a[r() * a.length | 0];
const nm = r => pk(r, P1) + pk(r, P2) + pk(r, P3);

/* ---------- record generator ---------- */
function gen(kind, id) {
  const r = rng(kind, id), p = a => pk(r, a), n = m => 1 + (r() * m | 0);
  const big = () => (BigInt(r() * 4294967296 >>> 0) << 32n | BigInt(r() * 4294967296 >>> 0)) + 1n;
  const name = nm(r);
  const cls = p(ADJ) + ' ' + (kind === 'PROFILE' ? p(NOUN) : p(TY[kind]));
  const world = r() < .5 ? nm(r) : p(WA) + ' ' + p(WN);
  const o = { kind, id, name, cls, world, rarity: n(999), energy: p(EN), status: p(ST), glyph: [0, 1, 2].map(() => p([...GL])).join(' ') };
  const place = r() < .3 ? 'at the edge of ' + world : p(PL);
  o.desc = `${p(OP)} ${cls.toLowerCase()} recorded ${place}. ${p(S2).replace('#', n(9999))}`;
  if (kind === 'PROFILE') {
    o.species = nm(r) + ' ' + p(SF);
    o.location = p(LA) + ' ' + nm(r) + ' ' + n(999);
    o.civ = r() < .15 ? 'Uncontacted' : p(CV) + ' of ' + nm(r);
    o.dim = p(DM) + ' D-' + n(9999);
    o.era = p(ER) + ' · ' + n(999);
    o.refs = KINDS.map(big);
  } else o.seen = big();
  return o;
}

/* ---------- virtualized infinite stream ---------- */
const H = 304, SPAN = 20000, MID = 10000, BUF = 4, RE = 1500;   // card pitch, slot window, buffer, recenter margin
const $ = s => document.querySelector(s);
const sc = $('#sc'), stream = $('#st'), pos = $('#pos'), modal = $('#modal'), q = $('#q');
const live = new Map();           // slot -> element (only ~10 in the DOM)
let anchor = 1n, tick = 0, lastPos = '';
stream.style.height = SPAN * H + 'px';

function card(id) {
  const o = gen('PROFILE', id), el = document.createElement('article');
  el.className = 'card';
  el.innerHTML = `<div class="id">${id}</div><h2>${o.name}</h2><div class="cl">${o.glyph} &nbsp;${o.cls}</div>` +
    `<div class="m"><span>World: ${o.world}</span><span>Rarity: ${o.rarity} · Energy: ${o.energy}</span></div>` +
    `<p>${o.desc}</p><button class="b" data-open="${id}">OPEN</button>`;
  return el;
}
function clearAll() { live.forEach(el => el.remove()); live.clear(); }

function render() {
  tick = 0;
  const lim = anchor - 1n, minSlot = lim >= BigInt(MID) ? 0 : MID - Number(lim);   // ID 1 is the only floor
  let st = sc.scrollTop;
  if (st < minSlot * H) { st = sc.scrollTop = minSlot * H; }
  const cur = Math.floor(st / H);
  if (cur < RE || cur > SPAN - RE) {                         // silently re-centre the window
    const delta = cur - MID, na = anchor + BigInt(delta);
    if (na >= 1n) { anchor = na; clearAll(); st = sc.scrollTop = st - delta * H; }
  }
  const first = Math.max(0, Math.floor(st / H) - BUF), last = Math.min(SPAN - 1, Math.floor((st + sc.clientHeight) / H) + BUF);
  for (const [s, el] of live) if (s < first || s > last) { el.remove(); live.delete(s); }
  for (let s = first; s <= last; s++) {
    const id = anchor + BigInt(s - MID);
    if (live.has(s) || id < 1n) continue;
    const el = card(id);
    el.style.transform = `translateY(${s * H}px)`;
    stream.appendChild(el); live.set(s, el);
  }
  const t = 'POSITION ' + (anchor + BigInt(Math.round(st / H) - MID));
  if (t !== lastPos) pos.textContent = lastPos = t;
}
const sched = () => { if (!tick) { tick = 1; requestAnimationFrame(render); } };
sc.addEventListener('scroll', sched, { passive: true });
window.addEventListener('resize', sched);

function jumpTo(id) {
  anchor = id; clearAll();
  sc.scrollTop = MID * H;
  render();
  const el = live.get(MID);
  if (el) { el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 1400); }
}
const randId = () => {
  let s = String(1 + Math.random() * 9 | 0);
  for (let i = 3 + Math.random() * 28 | 0; i > 0; i--) s += Math.random() * 10 | 0;
  return BigInt(s);
};

/* ---------- search / discover ---------- */
$('#f').addEventListener('submit', e => {
  e.preventDefault();
  const d = q.value.replace(/\D/g, '');
  if (!d) { q.focus(); return; }
  let id = BigInt(d); if (id < 1n) id = 1n;
  q.value = String(id); q.blur(); jumpTo(id);
});
$('#dis').addEventListener('click', () => { const id = randId(); q.value = String(id); jumpTo(id); });

/* ---------- detail modal ---------- */
let cur = null, hist = [], startP = null, lastP = null, arch = [];
const esc = s => String(s).replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');

function view(k, id) {
  if (k === 'ARCHIVE') {
    const e = arch[Number(id)];
    return { label: 'ARCHIVE', idText: `ENTRY ${Number(id) + 1} / ${arch.length}`, title: e.Name, sub: e.Type || '',
      fields: Object.entries(e).filter(([a]) => a !== 'Name' && a !== 'Description' && a !== 'Type'), desc: e.Description || '', links: [] };
  }
  const o = gen(k, id), v = { label: k, idText: String(id), title: o.name, sub: o.glyph + '  ' + o.cls, desc: o.desc };
  if (k === 'PROFILE') {
    v.fields = [['Classification', o.cls], ['Species', o.species], ['World', o.world], ['Location', o.location], ['Civilization', o.civ],
      ['Dimension', o.dim], ['Era', o.era], ['Rarity', o.rarity], ['Energy', o.energy], ['Status', o.status]];
    v.links = KINDS.map((K, i) => [K, o.refs[i], K + ' · ' + gen(K, o.refs[i]).name]);
  } else {
    v.fields = [['Class', o.cls], ['Origin', o.world], ['Rarity', o.rarity], ['Energy', o.energy], ['Status', o.status]];
    v.links = [['PROFILE', o.seen, 'SEEN IN · PROFILE ' + o.seen]];
  }
  return v;
}
function show() {
  const v = view(cur.k, cur.id);
  $('#mk').textContent = v.label; $('#mi').textContent = v.idText;
  $('#mt').textContent = v.title; $('#mc').textContent = v.sub; $('#mp').textContent = v.desc;
  $('#md').innerHTML = v.fields.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('');
  $('#ml').innerHTML = v.links.map(([k, i, t]) => `<button class="lk" data-k="${k}" data-i="${i}">${esc(t)}</button>`).join('');
  $('#bk').hidden = !hist.length;
  $('[data-act=prev]').disabled = cur.k !== 'ARCHIVE' && cur.id <= 1n;
  if (cur.k === 'PROFILE') lastP = cur.id;
  $('.panel').scrollTop = 0;
  modal.classList.add('on'); modal.setAttribute('aria-hidden', 'false');
  $('#cl').focus({ preventScroll: true });
}
function openView(k, id) { hist = []; startP = lastP = k === 'PROFILE' ? id : null; cur = { k, id }; show(); }
function closeView() {
  modal.classList.remove('on'); modal.setAttribute('aria-hidden', 'true'); hist = [];
  if (lastP !== null && lastP !== startP) jumpTo(lastP);
}
function step(d) {
  if (cur.k === 'ARCHIVE') { const n = BigInt(arch.length); cur = { k: 'ARCHIVE', id: (cur.id + d + n) % n }; }
  else { const m = cur.id + d; if (m < 1n) return; cur = { k: cur.k, id: m }; }
  show();
}
function act(a) {
  if (a === 'close') closeView();
  else if (a === 'back') { cur = hist.pop(); show(); }
  else step(a === 'next' ? 1n : -1n);
}
stream.addEventListener('click', e => {                       // one delegated listener for every card
  const b = e.target.closest('[data-open]');
  if (b) openView('PROFILE', BigInt(b.dataset.open));
});
modal.addEventListener('click', e => {
  if (e.target === modal) return closeView();
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.act) act(b.dataset.act);
  else if (b.dataset.k) { hist.push(cur); cur = { k: b.dataset.k, id: BigInt(b.dataset.i) }; show(); }
});
document.addEventListener('keydown', e => {
  if (!modal.classList.contains('on')) return;
  if (e.key === 'Escape') closeView();
  else if (e.key === 'ArrowRight') step(1n);
  else if (e.key === 'ArrowLeft') step(-1n);
});

/* ---------- optional data.txt (never required) ---------- */
$('#arch').addEventListener('click', () => openView('ARCHIVE', 0n));
try {
  fetch('data.txt').then(r => r.ok ? r.text() : '').then(t => {
    arch = t.split(/\r?\n\s*\r?\n/).map(b => {
      const o = {};
      b.split(/\r?\n/).forEach(l => { const m = l.match(/^([A-Za-z ]+):\s*(.*)$/); if (m) o[m[1].trim()] = m[2]; });
      return o;
    }).filter(o => o.Name);
    if (arch.length) $('#arch').hidden = false;
  }).catch(() => {});
} catch (e) { /* generator keeps working without data.txt */ }

/* ---------- start ---------- */
jumpTo(1n);
