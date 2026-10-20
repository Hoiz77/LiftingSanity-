/* Lifting Sanity: a lifting log that lives on your device. */
'use strict';
(function () {

/* ============================== Reference data ============================== */

const KG_LB = 2.20462262;
const DAY = 864e5;

const MUSCLES = {
  chest: 'Chest', lats: 'Lats', upperback: 'Upper back', traps: 'Traps', lowerback: 'Lower back',
  frontdelts: 'Front delts', sidedelts: 'Side delts', reardelts: 'Rear delts',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', abs: 'Abs', obliques: 'Obliques',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves',
  adductors: 'Adductors', abductors: 'Abductors', neck: 'Neck', fullbody: 'Full body',
  cardio: 'Cardio', mobility: 'Mobility'
};
const GROUPS = [
  ['chest', 'Chest', ['chest']],
  ['back', 'Back', ['lats', 'upperback', 'traps', 'lowerback']],
  ['shoulders', 'Shoulders', ['frontdelts', 'sidedelts', 'reardelts']],
  ['arms', 'Arms', ['biceps', 'triceps', 'forearms']],
  ['core', 'Core', ['abs', 'obliques']],
  ['legs', 'Legs', ['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors']],
  ['other', 'More', ['fullbody', 'cardio', 'mobility', 'neck']]
];
const EQUIP = {
  barbell: 'Barbell', dumbbell: 'Dumbbell', kettlebell: 'Kettlebell', cable: 'Cable', machine: 'Machine',
  smith: 'Smith machine', ezbar: 'EZ bar', trapbar: 'Trap bar', specialty: 'Specialty bar',
  bodyweight: 'Bodyweight', band: 'Band', plate: 'Plate', landmine: 'Landmine', medball: 'Medicine ball',
  suspension: 'Rings / TRX', sled: 'Sled', cardio: 'Cardio machine', other: 'Other'
};
const KINDS = {
  wr: 'Weight and reps', bw: 'Reps, optional added weight', aw: 'Reps with assistance',
  dur: 'Time', wdur: 'Weight and time', dist: 'Distance and time', wdist: 'Weight and distance'
};
const SET_TYPES = {
  N: { label: 'Working set', short: '', desc: 'A normal set. Counts toward volume, sets and records.' },
  W: { label: 'Warm-up', short: 'W', desc: 'Left out of volume, set counts and records.' },
  T: { label: 'Top set', short: 'T', desc: 'Your heaviest set of the day.' },
  B: { label: 'Back-off set', short: 'B', desc: 'Lighter sets after the top set.' },
  D: { label: 'Drop set', short: 'D', desc: 'Straight after a set, with less weight.' },
  F: { label: 'To failure', short: 'F', desc: 'Taken until no more reps are possible.' },
  A: { label: 'AMRAP', short: 'A', desc: 'As many reps as possible at a set weight.' },
  RP: { label: 'Rest-pause', short: 'RP', desc: 'Short pauses inside the set for extra reps.' },
  M: { label: 'Myo-reps', short: 'M', desc: 'An activation set, then mini-sets with brief rests.' },
  C: { label: 'Cluster set', short: 'C', desc: 'Reps split into small clusters with short rests.' },
  P: { label: 'Partial reps', short: 'P', desc: 'Partial range of motion. Not used for records.' },
  E: { label: 'Negatives', short: 'E', desc: 'Slow lowering only. Not used for records.' }
};
const TYPE_ORDER = ['N', 'W', 'T', 'B', 'D', 'F', 'A', 'RP', 'M', 'C', 'P', 'E'];
const NO_RECORD = new Set(['W', 'P', 'E']);
const BAR_EQUIP = new Set(['barbell', 'ezbar', 'trapbar', 'smith', 'specialty']);
const REST_PRESETS = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
const PLATE_COLORS = { 25: 'red', 20: 'blue', 15: 'yellow', 10: 'green', 5: 'white', 2.5: 'red', 1.25: 'steel', 0.5: 'steel' };

const slug = s => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const LIB = window.FORGE_LIBRARY.trim().split('\n').map(line => {
  const [name, m, eq, k, sec, fl] = line.split('|').map(x => (x || '').trim());
  return { id: slug(name), name, m, eq, k, sec: sec ? sec.split(',') : [], uni: (fl || '').includes('u') };
});
const LIB_MAP = new Map(LIB.map(e => [e.id, e]));
const PROGRAMS = window.FORGE_PROGRAMS;

/* ============================== Utilities ============================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const sum = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0);
const clone = o => JSON.parse(JSON.stringify(o));
const pad2 = n => String(n).padStart(2, '0');
const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

function trimNum(v, d = 2) { const f = 10 ** d; return String(Math.round(v * f) / f); }
function parseNum(str) {
  if (str == null || String(str).trim() === '') return null;
  const v = parseFloat(String(str).replace(',', '.'));
  return isFinite(v) ? v : null;
}
const U = () => state.settings.unit;
function dispW(kg) { if (kg == null) return ''; return trimNum(U() === 'lb' ? kg * KG_LB : kg, U() === 'lb' ? 1 : 2); }
function toKg(v) { return v == null ? null : (U() === 'lb' ? v / KG_LB : v); }
function fmtW(kg, d) { return (d == null ? dispW(kg) : trimNum(U() === 'lb' ? kg * KG_LB : kg, d)) + ' ' + U(); }
function compact(v) {
  if (v >= 1e6) return trimNum(v / 1e6, 1) + 'M';
  if (v >= 1e5) return trimNum(v / 1e3, 0) + 'k';
  if (v >= 1e4) return trimNum(v / 1e3, 1) + 'k';
  return Math.round(v).toLocaleString();
}
function fmtVol(kg) { return compact(U() === 'lb' ? kg * KG_LB : kg) + ' ' + U(); }
function distUnit(k) { return k === 'wdist' ? (U() === 'lb' ? 'yd' : 'm') : (U() === 'lb' ? 'mi' : 'km'); }
function dispDist(m, k) {
  if (m == null) return '';
  if (k === 'wdist') return trimNum(U() === 'lb' ? m * 1.0936133 : m, 0);
  return trimNum(U() === 'lb' ? m / 1609.344 : m / 1000, 2);
}
function toMeters(v, k) {
  if (v == null) return null;
  if (k === 'wdist') return U() === 'lb' ? v / 1.0936133 : v;
  return U() === 'lb' ? v * 1609.344 : v * 1000;
}
function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return h ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}
// "45" is 45 s, "130" is 1:30, "1:30" is 1:30, like a microwave keypad
function parseTime(str) {
  if (str == null) return null;
  str = String(str).trim();
  if (!str) return null;
  if (str.includes(':')) {
    const parts = str.split(':').map(p => parseInt(p, 10) || 0);
    return parts.reduce((a, p) => a * 60 + p, 0);
  }
  const digits = str.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length <= 2) return +digits;
  const s = +digits.slice(-2), rest = digits.slice(0, -2);
  if (rest.length <= 2) return +rest * 60 + s;
  return +rest.slice(0, -2) * 3600 + +rest.slice(-2) * 60 + s;
}
function fmtRest(sec) { return sec < 60 ? `${sec}s` : fmtClock(sec); }
function fmtDuration(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  return min >= 60 ? `${Math.floor(min / 60)}h ${pad2(min % 60)}m` : `${min} min`;
}
const dfmt = (ts, o) => new Date(ts).toLocaleDateString(undefined, o);
const fmtDate = ts => dfmt(ts, { weekday: 'short', day: 'numeric', month: 'short' });
const fmtDateY = ts => dfmt(ts, { day: 'numeric', month: 'short', year: 'numeric' });
const fmtShort = ts => dfmt(ts, { day: 'numeric', month: 'short' });
const fmtTime = ts => new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
function dayStart(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
function weekStart(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); }
function relDay(ts) {
  const n = Math.round((dayStart(Date.now()) - dayStart(ts)) / DAY);
  if (n <= 0) return 'today';
  if (n === 1) return 'yesterday';
  if (n < 7) return `${n} days ago`;
  if (n < 14) return 'last week';
  if (n < 60) return `${Math.round(n / 7)} weeks ago`;
  return fmtDateY(ts);
}
function toLocalInput(ts) { const d = new Date(ts); return new Date(ts - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
const e1rm = (w, r) => r <= 0 || !w ? 0 : (r === 1 ? w : w * (1 + r / 30));

/* ============================== Icons ============================== */

const ICONS = {
  dumbbell: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7.5V12l3 2',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  chart: 'M4 4v16h16M8 15l3.5-4 3 2.5L19 8',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M6 6l12 12M18 6L6 18',
  dots: 'M6 12h.01M12 12h.01M18 12h.01',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  down: 'M6 9l6 6 6-6',
  up: 'M6 15l6-6 6 6',
  timer: 'M12 6a8 8 0 1 0 0 16a8 8 0 1 0 0-16M12 10v4M10 2.5h4M18.5 6.5l1.5-1.5',
  play: 'M8 5.5v13l10.5-6.5z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M20 20l-4-4',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 6h3v1a3 3 0 0 1-3 3M7 6H4v1a3 3 0 0 0 3 3',
  reset: 'M4 12a8 8 0 1 0 2.4-5.7L4 8.5M4 4v4.5h4.5',
  archive: 'M3 5h18v4H3zM5 9v10h14V9M10 13h4',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  swap: 'M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  calendar: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
  note: 'M6 4h12v16H6zM9 9h6M9 13h6M9 17h3',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  plate: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5',
  flame: 'M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2.3-4.6.1 2 .9 3.2 2.2 3.6-.4-3.4.3-6.4.5-9z',
  download: 'M12 4v11M7 10.5l5 5 5-5M5 20h14',
  upload: 'M12 16V5M7 9.5l5-5 5 5M5 20h14',
  side: 'M8 4v16M16 4v16M3 12h5M16 12h5',
  layout: 'M4 5h16v14H4zM10 5v14',
  rows: 'M4 6h16M4 12h16M4 18h16',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  share: 'M12 3v12M7.5 7.5L12 3l4.5 4.5M5 12v8h14v-8',
  info: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 11v6M12 7.5h.01',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  backspace: 'M9 5h11v14H9l-6-7zM12 9.5l5 5M17 9.5l-5 5',
  camera: 'M4 8h3.5l2-3h5l2 3H20v11H4zM12 10.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z'
};
const THICK = new Set(['dots', 'grip']);
const icon = (n, cls = '') => `<svg class="i ${THICK.has(n) ? 'thick ' : ''}${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`;

/* ============================== Exercise pictures ============================== */

// A plain body, front and back, on a 100 × 200 grid. Every exercise gets its working muscles
// painted on it (main muscle red, helpers light red). Shapes for one side are mirrored to the other.
const FIG_BODY = `<ellipse cx="50" cy="15" rx="9" ry="11"/><rect x="45" y="23" width="10" height="10" rx="3"/>
<path d="M33 33Q50 29 67 33L71 44Q68 72 64 100L63 112Q50 117 37 112L36 100Q32 72 29 44Z"/>`;
const FIG_LIMBS = `<path d="M31 35Q22 37 20.5 50L18.5 78Q22 82 26 79L30 54Z"/><path d="M18.5 78L14.5 108Q18 112 21 109L26.5 80Z"/><ellipse cx="16.5" cy="115" rx="4" ry="6"/>
<path d="M37 108Q33.5 130 36.5 152L47 152Q50 130 50 112Z"/><path d="M37.5 152Q35.5 172 38.5 188L45 188Q48 170 47 152Z"/><ellipse cx="42" cy="192" rx="6" ry="3"/>`;
const MIRROR = 'matrix(-1 0 0 1 100 0)';
const FIG_FRONT = [
  ['traps', '<path d="M45 30L36 35L45 36Z"/>', 1],
  ['neck', '<rect x="46.5" y="24" width="7" height="8" rx="2"/>', 0],
  ['frontdelts', '<ellipse cx="32" cy="41" rx="5.5" ry="6.5"/>', 1],
  ['sidedelts', '<ellipse cx="26.5" cy="43.5" rx="3.6" ry="6.5"/>', 1],
  ['chest', '<path d="M49.5 38Q40 35.5 34.5 41.5Q33 52 38.5 57Q45 60.5 49.5 57.5Z"/>', 1],
  ['biceps', '<ellipse cx="25.3" cy="61" rx="4" ry="10.5" transform="rotate(7 25.3 61)"/>', 1],
  ['forearms', '<ellipse cx="20.8" cy="93" rx="3.7" ry="12" transform="rotate(8 20.8 93)"/>', 1],
  ['abs', '<rect x="44" y="61" width="12" height="38" rx="4"/>', 0],
  ['obliques', '<path d="M37.5 62Q35.5 80 39 98L43 98L43 63Z"/>', 1],
  ['abductors', '<ellipse cx="37" cy="111" rx="2.6" ry="6"/>', 1],
  ['quads', '<ellipse cx="42.5" cy="132" rx="5.5" ry="17"/>', 1],
  ['adductors', '<ellipse cx="48" cy="124" rx="2.2" ry="9"/>', 1],
  ['calves', '<ellipse cx="41.6" cy="168" rx="3.2" ry="12"/>', 1]
];
const FIG_BACK = [
  ['neck', '<rect x="46.5" y="24" width="7" height="8" rx="2"/>', 0],
  ['traps', '<path d="M50 27L36 36Q44 41 50 64Q56 41 64 36Z"/>', 0],
  ['reardelts', '<ellipse cx="32" cy="41" rx="5.5" ry="6.5"/>', 1],
  ['sidedelts', '<ellipse cx="26.5" cy="43.5" rx="3.6" ry="6.5"/>', 1],
  ['upperback', '<ellipse cx="40.5" cy="49" rx="5" ry="5"/>', 1],
  ['lats', '<path d="M34 52Q33 70 41 88Q46 80 47.5 70Q44 58 34 52Z"/>', 1],
  ['lowerback', '<ellipse cx="46.5" cy="94" rx="2.8" ry="10"/>', 1],
  ['triceps', '<ellipse cx="25.3" cy="61" rx="4" ry="10.5" transform="rotate(7 25.3 61)"/>', 1],
  ['forearms', '<ellipse cx="20.8" cy="93" rx="3.7" ry="12" transform="rotate(8 20.8 93)"/>', 1],
  ['abductors', '<ellipse cx="37.5" cy="108.5" rx="3.6" ry="4.6"/>', 1],
  ['glutes', '<ellipse cx="43.5" cy="118" rx="7" ry="8"/>', 1],
  ['hamstrings', '<ellipse cx="43" cy="138" rx="5.5" ry="13"/>', 1],
  ['adductors', '<ellipse cx="48.2" cy="131" rx="1.8" ry="8"/>', 1],
  ['calves', '<ellipse cx="42" cy="166" rx="4.6" ry="10"/>', 1]
];
const figGroup = list => list.map(([m, d, mir]) => `<g style="fill:var(--m-${m},var(--fig-m))">${d}${mir ? `<g transform="${MIRROR}">${d}</g>` : ''}</g>`).join('');
// drawn once; every picture reuses it, coloured through CSS variables
const FIG_SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<g id="fig-body" style="fill:var(--fig)">${FIG_BODY}${FIG_LIMBS}<g transform="${MIRROR}">${FIG_LIMBS}</g></g>
<g id="fig-front"><use href="#fig-body"/>${figGroup(FIG_FRONT)}</g>
<g id="fig-back"><use href="#fig-body"/>${figGroup(FIG_BACK)}</g></defs></svg>`;
const BACK_VIEW = new Set(['lats', 'upperback', 'traps', 'lowerback', 'reardelts', 'triceps', 'hamstrings', 'glutes', 'calves', 'abductors']);
const LOWER_BODY = new Set(['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors']);
const CROPS = { upper: '6 2 88 118', lower: '14 96 72 100', full: '0 0 100 200' };
const HEART = '<path style="fill:var(--hit)" d="M50 50c-3-4-9-3-9 2 0 4 5 7 9 10 4-3 9-6 9-10 0-5-6-6-9-2z"/>';
function figVars(ex) {
  const v = [];
  const helpers = ex.m === 'fullbody' ? ['chest', 'quads', 'abs', 'frontdelts', 'lats', 'glutes', 'hamstrings', 'upperback', ...ex.sec]
    : ex.m === 'cardio' ? ['quads', 'calves', 'hamstrings', 'glutes', ...ex.sec] : ex.sec;
  for (const m of helpers) if (m !== ex.m) v.push(`--m-${m}:var(--hit-2)`);
  v.push(`--m-${ex.m}:var(--hit)`);
  return v.join(';');
}
function figure(view, ex, crop) {
  return `<svg viewBox="${CROPS[crop]}" style="${figVars(ex)}" aria-hidden="true"><use href="#fig-${view}"/>${ex.m === 'cardio' && view === 'front' ? HEART : ''}</svg>`;
}
// the small square picture shown beside an exercise: your photo if you added one, otherwise the muscle map
function thumb(exId, size = '') {
  const url = photos.get(exId);
  if (url) return `<span class="thumb ${size} photo"><img src="${url}" alt="" loading="lazy"></span>`;
  const ex = getEx(exId);
  const crop = ex.m === 'fullbody' || ex.m === 'cardio' || ex.m === 'mobility' ? 'full' : LOWER_BODY.has(ex.m) ? 'lower' : 'upper';
  return `<span class="thumb ${size}">${figure(BACK_VIEW.has(ex.m) ? 'back' : 'front', ex, crop)}</span>`;
}

/* ----- your own photos live in IndexedDB so they don't crowd the main save ----- */
const photos = new Map();
let photoDB = null;
function openPhotoDB() {
  return new Promise(res => {
    try {
      const rq = indexedDB.open('liftingsanity', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('photos');
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => res(null);
      rq.onblocked = () => res(null);
    } catch (e) { res(null); }
  });
}
async function loadPhotos() {
  photoDB = await openPhotoDB();
  if (!photoDB) return;
  try {
    const rq = photoDB.transaction('photos').objectStore('photos').openCursor();
    rq.onsuccess = () => {
      const c = rq.result;
      if (c) { photos.set(c.key, c.value); c.continue(); } else if (photos.size) refreshAll();
    };
  } catch (e) { /* no saved photos */ }
}
function storePhoto(id, url) {
  if (url) photos.set(id, url); else photos.delete(id);
  if (!photoDB) return;
  try {
    const st = photoDB.transaction('photos', 'readwrite').objectStore('photos');
    if (url) st.put(url, id); else st.delete(id);
  } catch (e) { toast('Couldn’t keep the photo on this device.'); }
}
function shrinkImage(file, max = 560) {
  return new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * sc);
      c.height = Math.round(img.naturalHeight * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      res(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('unreadable image')); };
    img.src = u;
  });
}
function pickPhoto(exId) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.hidden = true;
  document.body.append(inp);
  inp.addEventListener('change', async () => {
    const f = inp.files && inp.files[0];
    inp.remove();
    if (!f) return;
    try { storePhoto(exId, await shrinkImage(f)); refreshAll(); toast('Photo saved.'); }
    catch (e) { toast('That image couldn’t be read. Try another photo.'); }
  });
  inp.click();
}

/* ============================== State ============================== */

const KEY = 'liftingsanity:data:v1';
let state;
let storageOK = true;
const ui = {
  tab: 'train', woHidden: false, effOpen: null, kp: null,
  lib: { q: '', g: 'all', m: 'all', eq: 'all' },
  hist: { month: null, day: null }
};

function defaults() {
  return {
    v: 1,
    settings: {
      unit: 'kg', effort: 'rir', rest: 120, autoRest: true, autoNext: true, view: 'focus',
      sound: true, wake: true, theme: 'auto', bar: 20, step: 2.5, installHint: true, keypad: 'auto'
    },
    custom: [], exPrefs: {}, templates: [], splits: [], activeSplit: null,
    workouts: [], active: null, rest: null,
    blocks: [{ id: 'b1', name: 'Block 1', start: 0 }], exResets: {}, flags: {}
  };
}
function migrate(s) {
  const d = defaults();
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  s.settings = Object.assign(d.settings, s.settings || {});
  if (!Array.isArray(s.blocks) || !s.blocks.length) s.blocks = d.blocks;
  s.workouts.sort((a, b) => a.start - b.start);
  // earlier versions kept left and right reps on one row; split them into a row per side
  const splitRows = x => {
    if (!x.sets.some(o => o.rl != null || o.rr != null)) return;
    x.sets = x.sets.flatMap(o => {
      if (o.rl == null && o.rr == null) return [o];
      const p = uid(), a = { ...o, side: 'L', pair: p, r: o.rl }, b = { ...o, id: uid(), side: 'R', pair: p, r: o.rr };
      for (const c of [a, b]) { delete c.rl; delete c.rr; if (c.r == null) delete c.r; }
      return [a, b];
    });
    x.uni = true;
  };
  for (const w of s.workouts) w.ex.forEach(splitRows);
  if (s.active) s.active.ex.forEach(splitRows);
  return s;
}
function load() {
  let raw = null;
  state = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { storageOK = false; }
  if (raw) {
    try { state = migrate(JSON.parse(raw)); } catch (e) {
      state = null;
      try { localStorage.setItem(KEY + ':unreadable-' + Date.now(), raw); } catch (e2) { /* nothing else to try */ }
    }
  }
  if (!state) state = defaults();
  ensureSplits();
  persist();
}
// your own Full Body EOD split is added once and made the active split
function ensureSplits() {
  if (!state.flags) state.flags = {};
  if (state.flags.fbeod) return;
  const p = PROGRAMS.find(x => x.id === 'fbeod');
  if (p && !state.splits.some(s => s.programId === 'fbeod')) installProgram(p, true);
  state.flags.fbeod = 1;
}
let saveTimer = null;
function save(now) {
  clearTimeout(saveTimer);
  if (now) persist(); else saveTimer = setTimeout(persist, 300);
}
function persist() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(KEY, JSON.stringify(state)); storageOK = true; } catch (e) {
    if (storageOK) toast('Couldn’t save on this device. Export a backup from Settings.');
    storageOK = false;
  }
}

/* ============================== Exercises ============================== */

let customMap = new Map();
function rebuildCustom() { customMap = new Map(state.custom.map(c => [c.id, c])); }
function getEx(id) {
  return LIB_MAP.get(id) || customMap.get(id) || { id, name: 'Deleted exercise', m: 'fullbody', eq: 'other', k: 'wr', sec: [], uni: false };
}
function allExercises() {
  return [...LIB, ...state.custom.filter(c => !c.hidden)].sort((a, b) => a.name.localeCompare(b.name));
}
const hasWeight = k => k === 'wr' || k === 'bw' || k === 'aw' || k === 'wdur' || k === 'wdist';
const hasReps = k => k === 'wr' || k === 'bw' || k === 'aw';
const hasTime = k => k === 'dur' || k === 'wdur' || k === 'dist';
const hasDist = k => k === 'dist' || k === 'wdist';
function weightLabel(k) { return k === 'bw' ? '+' + U() : k === 'aw' ? '−' + U() : U(); }
function filterExercises({ q = '', g = 'all', m = 'all', eq = 'all' }) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const gm = g === 'all' ? null : new Set((GROUPS.find(x => x[0] === g) || [0, 0, []])[2]);
  const list = allExercises().filter(e => {
    if (gm && !gm.has(e.m)) return false;
    if (m !== 'all' && e.m !== m) return false;
    if (eq !== 'all' && e.eq !== eq) return false;
    if (!terms.length) return true;
    const hay = (e.name + ' ' + MUSCLES[e.m] + ' ' + EQUIP[e.eq] + ' ' + e.sec.map(x => MUSCLES[x]).join(' ')).toLowerCase();
    return terms.every(t => hay.includes(t));
  });
  if (terms.length) {
    const q0 = q.toLowerCase().trim();
    list.sort((a, b) => (b.name.toLowerCase().startsWith(q0) - a.name.toLowerCase().startsWith(q0)) || a.name.localeCompare(b.name));
  }
  return list;
}
function recentExercises(n = 12) {
  const seen = new Set(), out = [];
  for (let i = state.workouts.length - 1; i >= 0 && out.length < n; i--) {
    for (const x of state.workouts[i].ex) if (!seen.has(x.exId)) { seen.add(x.exId); out.push(x.exId); }
  }
  return out.slice(0, n);
}

/* ============================== Templates & splits ============================== */

function parseSetSpec(spec) {
  const map = { '': 'N', w: 'W', t: 'T', b: 'B', d: 'D', f: 'F', a: 'A', p: 'P', m: 'M', rp: 'RP', c: 'C', e: 'E' };
  const out = [];
  for (const part of String(spec).split('+')) {
    const m = part.trim().match(/^(\d+)\s*([a-z]*)$/i);
    if (!m) continue;
    for (let i = 0; i < +m[1]; i++) out.push(map[m[2].toLowerCase()] || 'N');
  }
  return out;
}
function programDay(name, spec, from, note) {
  const ex = [];
  if (Array.isArray(spec)) {
    for (const e of spec) {
      const id = slug(e.ex);
      if (!LIB_MAP.has(id)) continue;
      ex.push({
        exId: id, rest: e.rest || 90, note: e.note || '', ss: null, uni: e.uni ? true : undefined,
        sets: e.sets.map(([t, tw, tr, trir, side]) => {
          const s = { t, tr: tr == null ? '' : String(tr), trir: trir ?? null };
          if (tw != null) s.tw = tw;
          if (side) s.side = side;
          return s;
        })
      });
    }
    return { id: uid(), name, note: note || '', ex, from, created: Date.now() };
  }
  for (const line of spec.trim().split('\n')) {
    const [exName, sets, reps, rir, rest] = line.split('|').map(s => s.trim());
    const id = slug(exName);
    if (!LIB_MAP.has(id)) continue;
    ex.push({
      exId: id, rest: +rest || 90, note: '', ss: null,
      sets: parseSetSpec(sets).map(t => ({ t, tr: t === 'W' ? '' : reps, trir: t === 'W' || rir === '' ? null : +rir }))
    });
  }
  return { id: uid(), name, note: '', ex, from, created: Date.now() };
}
const isRest = d => d === 'rest';
function installProgram(p, makeActive) {
  const days = p.days.map(d => isRest(d) ? 'rest' : programDay(d[0], d[1], p.name, p.note));
  state.templates.push(...days.filter(d => !isRest(d)));
  const split = { id: uid(), name: p.name, days: days.map(d => isRest(d) ? 'rest' : d.id), pos: 0, programId: p.id };
  state.splits.push(split);
  if (makeActive) state.activeSplit = split.id;
  return split;
}
const tplById = id => state.templates.find(t => t.id === id);
const splitById = id => state.splits.find(s => s.id === id);
const activeSplit = () => splitById(state.activeSplit) || null;
function splitDays(split) { return split.days.map(tplById).filter(Boolean); }
const splitNames = split => split.days.map(d => isRest(d) ? 'Rest' : (tplById(d) || {}).name).filter(Boolean);
function splitLast(split) {
  for (let i = state.workouts.length - 1; i >= 0; i--) {
    const w = state.workouts[i];
    if (w.splitId === split.id || split.days.includes(w.tplId)) return w;
  }
  return null;
}
const nextDay = ts => dayStart(ts + DAY * 1.5);
function skipRest(split, idx) {
  const n = split.days.length;
  let k = 0;
  while (isRest(split.days[idx]) && k < n) { idx = (idx + 1) % n; k++; }
  return { idx, rests: k };
}
// Where the split stands today. Rest days pass with the calendar; a training day waits until you do it.
function splitToday(split) {
  const n = split.days.length, today = dayStart(Date.now());
  let idx = Math.min(split.pos || 0, n - 1);
  const last = splitLast(split);
  if (!last) return { idx: skipRest(split, idx).idx, state: 'due' };
  const lastDay = dayStart(last.start);
  if (lastDay >= today) {
    const r = skipRest(split, idx);
    let due = today;
    for (let i = 0; i <= r.rests; i++) due = nextDay(due);
    return { idx: r.idx, state: 'done', due };
  }
  let date = nextDay(lastDay), k = 0;
  while (date < today && isRest(split.days[idx]) && k++ < n) { idx = (idx + 1) % n; date = nextDay(date); }
  if (isRest(split.days[idx])) {
    const r = skipRest(split, idx);
    let due = today;
    for (let i = 0; i < r.rests; i++) due = nextDay(due);
    return { idx: r.idx, state: 'rest', due };
  }
  return { idx, state: 'due' };
}
function whenText(ts) {
  const d = Math.round((dayStart(ts) - dayStart(Date.now())) / DAY);
  return d <= 0 ? 'today' : d === 1 ? 'tomorrow' : d < 7 ? 'on ' + dfmt(ts, { weekday: 'long' }) : 'on ' + fmtShort(ts);
}
function tplLastDone(tplId) {
  for (let i = state.workouts.length - 1; i >= 0; i--) if (state.workouts[i].tplId === tplId) return state.workouts[i];
  return null;
}
function tplTimesDone(tplId) { return state.workouts.filter(w => w.tplId === tplId).length; }
function scheme(all) {
  const sets = liftSets(all);
  const w = sets.filter(s => s.t === 'W').length;
  const work = sets.filter(s => s.t !== 'W');
  const parts = [];
  if (w) parts.push(`${w}W`);
  const n = work.filter(s => s.t === 'N');
  if (n.length) parts.push(`${n.length} × ${(n[0].tr || '').replace('-', '–') || '?'}`);
  const others = {};
  for (const s of work) if (s.t !== 'N') others[s.t] = (others[s.t] || 0) + 1;
  for (const [t, c] of Object.entries(others)) parts.push(`${c > 1 ? c : ''}${SET_TYPES[t].short}`);
  return parts.join(' + ') || 'No sets';
}
function tplWorkingSets(t) { return sum(t.ex, x => sum(x.sets, s => s.t !== 'W' ? setWeight(s) : 0)); }

/* ============================== Blocks & resets ============================== */

const curBlock = () => state.blocks[state.blocks.length - 1];
function blockAt(ts) {
  let b = state.blocks[0];
  for (const x of state.blocks) if (x.start <= ts) b = x;
  return b;
}
function baselineAt(exId, ts) {
  let b = blockAt(ts).start;
  for (const r of state.exResets[exId] || []) if (r <= ts && r > b) b = r;
  return b;
}
const baseline = exId => baselineAt(exId, Infinity);
function blockRange(b) {
  const i = state.blocks.indexOf(b);
  return [b.start, i < state.blocks.length - 1 ? state.blocks[i + 1].start : Infinity];
}
const workoutsIn = (from, to) => state.workouts.filter(w => w.start >= from && w.start < to);

/* ============================== Records & stats ============================== */

const recReps = (x, s) => s.r || 0;
const minReps = recReps, totalReps = recReps;

// One side at a time: each side is its own row (weight, reps, RIR, check), and the two rows of a set share a pair id.
const otherSide = side => side === 'L' ? 'R' : 'L';
const sideName = side => side === 'L' ? 'Left' : 'Right';
const partnerOf = (x, s) => s.pair ? x.sets.find(o => o !== s && o.pair === s.pair) || null : null;
// a left + right pair counts as one set
const setWeight = s => s.side ? 0.5 : 1;
function firstSide(x) { const s = x.sets.find(o => o.side); return s ? s.side : 'L'; }
function isPairTail(sets, j) {
  const s = sets[j], p = sets[j - 1];
  return !!(s && s.side && p && p.side && p.side !== s.side && p.t === s.t && (!s.pair || s.pair === p.pair));
}
const liftSets = sets => sets.filter((s, j) => !isPairTail(sets, j));
function pairUp(sets, first = 'L') {
  const out = [];
  for (let i = 0; i < sets.length; i++) {
    const s = sets[i], n = sets[i + 1], p = uid();
    if (s.side && n && n.side && n.side !== s.side && n.t === s.t) { out.push({ ...s, pair: p }, { ...n, pair: p }); i++; }
    else if (s.side) {
      const c = { ...s, id: uid(), side: otherSide(s.side), pair: p, done: false };
      delete c.r; delete c.rir; delete c.at;
      out.push({ ...s, pair: p }, c);
    } else out.push({ ...s, side: first, pair: p }, { ...s, id: uid(), side: otherSide(first), pair: p });
  }
  return out;
}
function unpair(sets) {
  const out = [], seen = new Set();
  for (const s of sets) {
    if (!s.side) { out.push(s); continue; }
    if (s.pair && seen.has(s.pair)) continue;
    if (s.pair) seen.add(s.pair);
    const both = s.pair ? sets.filter(o => o.pair === s.pair) : [s];
    const m = { ...s };
    delete m.side; delete m.pair;
    for (const f of ['w', 'r', 'sec', 'dist']) {
      const v = both.map(o => o[f]).filter(v => v != null);
      if (v.length) m[f] = Math.max(...v); else delete m[f];
    }
    const rirs = both.map(o => o.rir).filter(v => v != null);
    if (rirs.length) m.rir = Math.min(...rirs);
    m.done = both.every(o => o.done);
    out.push(m);
  }
  return out;
}
function setUni(x, on) {
  x.uni = !!on;
  x.sets = (on ? pairUp(x.sets, firstSide(x)) : unpair(x.sets)).map(s => s.id ? s : { ...s, id: uid() });
}
// templates keep pairs as two neighbouring rows without ids
function tplSides(sets, on) {
  if (on) return pairUp(sets).map(({ id, pair, done, ...s }) => s);
  return liftSets(sets).map(({ side, pair, ...s }) => s);
}
function setVolume(x, s) {
  if (!s.done || s.t === 'W') return 0;
  const k = getEx(x.exId).k;
  return k === 'wr' || k === 'bw' ? (s.w || 0) * totalReps(x, s) : 0;
}
const workoutVolume = w => sum(w.ex, x => sum(x.sets, s => setVolume(x, s)));
const workingSets = w => +trimNum(sum(w.ex, x => sum(x.sets, s => s.done && s.t !== 'W' ? setWeight(s) : 0)), 1);
function emptyRec() { return { e1rm: 0, w: 0, vol: 0, reps: 0, sec: 0, dist: 0, sessions: 0, repMax: {} }; }
function addToRec(rec, x, s, k) {
  if (!s.done || NO_RECORD.has(s.t)) return;
  const r = recReps(x, s);
  if (k === 'wr') {
    if (r > 0 && s.w > 0) {
      rec.e1rm = Math.max(rec.e1rm, e1rm(s.w, r));
      rec.w = Math.max(rec.w, s.w);
      rec.vol = Math.max(rec.vol, s.w * r);
      if (r <= 12) rec.repMax[r] = Math.max(rec.repMax[r] || 0, s.w);
    }
    rec.reps = Math.max(rec.reps, r);
  } else if (k === 'bw' || k === 'aw') {
    rec.reps = Math.max(rec.reps, r);
    if (k === 'bw' && s.w > 0) rec.w = Math.max(rec.w, s.w);
  } else if (k === 'dur' || k === 'wdur') {
    rec.sec = Math.max(rec.sec, s.sec || 0);
    if (k === 'wdur') rec.w = Math.max(rec.w, s.w || 0);
  } else {
    rec.dist = Math.max(rec.dist, s.dist || 0);
    if (k === 'wdist') rec.w = Math.max(rec.w, s.w || 0);
    if (k === 'dist') rec.sec = Math.max(rec.sec, s.sec || 0);
  }
}
function records(exId, from = 0, to = Infinity, excludeId = null) {
  const rec = emptyRec(), k = getEx(exId).k;
  for (const w of state.workouts) {
    if (w.start < from || w.start >= to || w.id === excludeId) continue;
    let used = false;
    for (const x of w.ex) {
      if (x.exId !== exId) continue;
      for (const s of x.sets) { if (s.done) used = true; addToRec(rec, x, s, k); }
    }
    if (used) rec.sessions++;
  }
  return rec;
}
function setPRs(x, s, rec, k) {
  if (!rec || !rec.sessions || !s.done || NO_RECORD.has(s.t)) return [];
  const r = recReps(x, s), out = [];
  if (k === 'wr') {
    if (s.w > 0 && r > 0) {
      if (e1rm(s.w, r) > rec.e1rm + 1e-6) out.push('Est. 1RM');
      if (s.w > rec.w + 1e-6) out.push('Heaviest');
    }
  } else if (k === 'bw' || k === 'aw') { if (r > rec.reps) out.push('Most reps'); }
  else if (k === 'dur' || k === 'wdur') { if ((s.sec || 0) > rec.sec) out.push('Longest'); }
  else if ((s.dist || 0) > rec.dist) out.push('Farthest');
  return out;
}
// PR flags for each set of one exercise in a workout, compared with what came before it
function livePRs(w, x) {
  const k = getEx(x.exId).k;
  const rec = records(x.exId, baselineAt(x.exId, w.start), w.start, w.id);
  return x.sets.map(s => { const p = setPRs(x, s, rec, k); addToRec(rec, x, s, k); return p; });
}
function workoutPRs(w) {
  const out = [];
  for (const x of w.ex) {
    const flags = livePRs(w, x);
    const best = {};
    x.sets.forEach((s, j) => { for (const kind of flags[j]) best[kind] = j; });
    for (const [kind, j] of Object.entries(best)) out.push({ exId: x.exId, kind, set: clone(x.sets[j]), uni: !!x.uni });
  }
  return out;
}
function lastPerf(exId, before, excludeId) {
  for (let i = state.workouts.length - 1; i >= 0; i--) {
    const w = state.workouts[i];
    if (w.start >= before || w.id === excludeId) continue;
    const x = w.ex.find(x => x.exId === exId && x.sets.some(s => s.done));
    if (x) return { w, x, archived: w.start < baseline(exId) };
  }
  return null;
}
function sessionNumber(w) { return state.workouts.indexOf(w) + 1; }
function muscleSets(ws) {
  const m = {};
  for (const w of ws) for (const x of w.ex) {
    const e = getEx(x.exId);
    const n = sum(x.sets, s => s.done && s.t !== 'W' ? setWeight(s) : 0);
    if (!n) continue;
    m[e.m] = (m[e.m] || 0) + n;
    for (const sm of e.sec) m[sm] = (m[sm] || 0) + n * 0.5;
  }
  return Object.entries(m).filter(([k]) => k !== 'cardio' && k !== 'mobility').sort((a, b) => b[1] - a[1]);
}
function exSeries(exId, metric, from = 0, to = Infinity) {
  const k = getEx(exId).k, pts = [];
  for (const w of state.workouts) {
    if (w.start < from || w.start >= to) continue;
    const xs = w.ex.filter(x => x.exId === exId);
    if (!xs.some(x => x.sets.some(s => s.done))) continue;
    const rec = emptyRec();
    let vol = 0;
    for (const x of xs) for (const s of x.sets) { addToRec(rec, x, s, k); vol += setVolume(x, s); }
    const y = metric === 'e1rm' ? rec.e1rm : metric === 'top' ? rec.w : metric === 'vol' ? vol
      : metric === 'reps' ? rec.reps : metric === 'sec' ? rec.sec : rec.dist;
    if (y > 0) pts.push({ x: w.start, y, wid: w.id });
  }
  return pts;
}
function metricsFor(k) {
  if (k === 'wr') return [['e1rm', 'Est. 1RM'], ['top', 'Heaviest'], ['vol', 'Volume']];
  if (k === 'bw') return [['reps', 'Most reps'], ['top', 'Added weight'], ['vol', 'Volume']];
  if (k === 'aw') return [['reps', 'Most reps']];
  if (k === 'dur' || k === 'wdur') return [['sec', 'Longest']];
  return [['dist', 'Distance'], ['sec', 'Time']];
}
function fmtMetric(metric, v, k) {
  if (metric === 'reps') return `${Math.round(v)} reps`;
  if (metric === 'sec') return fmtClock(v);
  if (metric === 'dist') return dispDist(v, k) + ' ' + distUnit(k);
  if (metric === 'vol') return fmtVol(v);
  return fmtW(v, metric === 'e1rm' ? 1 : null);
}
function streakWeeks() {
  if (!state.workouts.length) return 0;
  const weeks = new Set(state.workouts.map(w => weekStart(w.start)));
  let wk = weekStart(Date.now());
  if (!weeks.has(wk)) wk = weekStart(wk - 3 * DAY);
  let n = 0;
  while (weeks.has(wk)) { n++; wk = weekStart(wk - 3 * DAY); }
  return n;
}

/* ============================== Set formatting ============================== */

function effDisp(rir) {
  if (rir == null) return '';
  if (state.settings.effort === 'rpe') return trimNum(10 - rir, 1);
  return rir >= 5 ? '5+' : trimNum(rir, 1);
}
const effName = () => state.settings.effort === 'rpe' ? 'RPE' : 'RIR';
function fmtSet(x, s, k, withEff = true) {
  k = k || getEx(x.exId).k;
  const reps = `${s.r ?? 0}`;
  let t;
  if (k === 'wr') t = `${dispW(s.w || 0)} × ${reps}`;
  else if (k === 'bw') t = s.w ? `+${dispW(s.w)} × ${reps}` : `${reps} reps`;
  else if (k === 'aw') t = s.w ? `−${dispW(s.w)} × ${reps}` : `${reps} reps`;
  else if (k === 'dur') t = fmtClock(s.sec || 0);
  else if (k === 'wdur') t = `${dispW(s.w || 0)} · ${fmtClock(s.sec || 0)}`;
  else if (k === 'dist') t = `${dispDist(s.dist || 0, k)} ${distUnit(k)}${s.sec ? ' · ' + fmtClock(s.sec) : ''}`;
  else t = `${dispW(s.w || 0)} · ${dispDist(s.dist || 0, k)} ${distUnit(k)}`;
  if (withEff && s.rir != null && hasReps(k) && state.settings.effort !== 'off') t += ` @${effDisp(s.rir)}`;
  return t;
}
function setLabel(sets, j) {
  const s = sets[j];
  if (s.side) return (s.t === 'N' ? '' : SET_TYPES[s.t].short) + s.side;
  if (s.t !== 'N') return SET_TYPES[s.t].short;
  return String(sets.slice(0, j + 1).filter(o => o.t === 'N' && !o.side).length);
}
const badge = (t, label, attrs = '', side = '') => `<button class="badge t-${t}${side ? ' side side-' + side : ''}" ${attrs} aria-label="${esc((side ? sideName(side) + ' side, ' : '') + SET_TYPES[t].label)}">${esc(label)}</button>`;
// Lyfta-style one-line set: "W  72.5 kg · 4 reps", "R  45 kg · 5 reps · 1 RIR"
function lineTag(sets, j) { const s = sets[j]; return `<span class="lt lt-${s.side && s.t === 'N' ? s.side : s.t}">${esc(setLabel(sets, j))}</span>`; }
function fmtLine(x, s, k) {
  k = k || getEx(x.exId).k;
  const parts = [];
  if (hasWeight(k) && s.w != null) parts.push(`${k === 'bw' ? '+' : k === 'aw' ? '−' : ''}${dispW(s.w)} ${U()}`);
  if (hasReps(k)) parts.push(`${s.r ?? 0} reps`);
  if (hasDist(k) && s.dist != null) parts.push(`${dispDist(s.dist, k)} ${distUnit(k)}`);
  if (hasTime(k) && s.sec != null) parts.push(fmtClock(s.sec));
  if (s.rir != null && hasReps(k) && state.settings.effort !== 'off') parts.push(`${effDisp(s.rir)} ${effName()}`);
  return parts.join(' · ');
}

/* ============================== Shell ============================== */

const TABS = [['train', 'Train', 'dumbbell'], ['history', 'History', 'clock'], ['library', 'Exercises', 'list'], ['progress', 'Progress', 'chart'], ['settings', 'Settings', 'sliders']];

function applyTheme() {
  const t = state.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}
function renderTabs() {
  $('#tabs').innerHTML = `<div class="brand" aria-hidden="true">${plateMark()}</div>` + TABS.map(([id, label, ic]) =>
    `<button class="tab ${ui.tab === id ? 'on' : ''}" data-a="tab" data-tab="${id}" aria-current="${ui.tab === id ? 'page' : 'false'}">${icon(ic)}<span>${label}</span></button>`).join('');
}
function plateMark() {
  return `<svg viewBox="0 0 32 32" class="mark"><rect x="2" y="14.5" width="28" height="3" rx="1.5" fill="var(--steel)"/><rect x="6" y="6" width="4.5" height="20" rx="1.6" fill="var(--plate-red)"/><rect x="11.5" y="9" width="3.5" height="14" rx="1.3" fill="var(--plate-blue)"/><rect x="21.5" y="6" width="4.5" height="20" rx="1.6" fill="var(--plate-red)"/><rect x="17" y="9" width="3.5" height="14" rx="1.3" fill="var(--plate-blue)"/></svg>`;
}
const VIEWS = {};
function render() {
  charts.clear();
  renderTabs();
  $('#view').innerHTML = VIEWS[ui.tab]();
  renderMini();
  requestAnimationFrame(() => drawCharts($('#view')));
}
function go(tab) { ui.tab = tab; render(); window.scrollTo(0, 0); }

function renderMini() {
  const el = $('#mini');
  const w = state.active;
  if (!w || !ui.woHidden) { el.hidden = true; document.body.classList.remove('has-mini'); return; }
  el.hidden = false;
  document.body.classList.add('has-mini');
  const done = sum(w.ex, x => x.sets.filter(s => s.done && s.t !== 'W').length), total = sum(w.ex, x => x.sets.filter(s => s.t !== 'W').length);
  el.innerHTML = `<button class="mini-btn" data-a="resume"><span class="live-dot"></span><span class="mini-name">${esc(w.mode === 'edit' ? 'Editing ' + w.name : w.name)}</span><span class="mini-meta">${w.mode === 'edit' ? '' : `<span data-clock>${fmtClock((Date.now() - w.start) / 1000)}</span> · `}${done}/${total} sets</span><span class="mini-go">Resume ${icon('up')}</span></button>`;
}

/* ============================== Toasts ============================== */

let toastTimer;
function toast(msg, action) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button data-a="toastAct">${esc(action.label)}</button>` : ''}`;
  el.classList.add('in');
  toast.action = action;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('in'), action ? 5000 : 2600);
}

/* ============================== Sheets ============================== */

const sheets = [];
let sheetSeq = 0;
function openSheet(def) {
  def.id = 'sh' + (++sheetSeq);
  sheets.push(def);
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap' + (def.full ? ' full' : '') + (def.cls ? ' ' + def.cls : '');
  wrap.dataset.sheet = def.id;
  wrap.innerHTML = `<div class="sheet-backdrop" data-a="sheetClose"></div><div class="sheet" role="dialog" aria-modal="true"></div>`;
  $('#sheets').append(wrap);
  def.el = wrap;
  refreshSheet(def);
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('in')));
  if (def.focus) setTimeout(() => { const f = $(def.focus, wrap); if (f) f.focus(); }, 280);
  return def;
}
function refreshSheet(def) {
  if (!def || !def.el) return;
  const panel = $('.sheet', def.el);
  const body = $('.sheet-body', panel);
  const sc = body ? body.scrollTop : 0;
  for (const id of $$('[data-chart]', panel).map(e => e.dataset.chart)) charts.delete(id);
  panel.innerHTML = def.render(def);
  const nb = $('.sheet-body', panel);
  if (nb) nb.scrollTop = sc;
  requestAnimationFrame(() => drawCharts(panel));
}
function closeSheet(def) {
  def = def || sheets[sheets.length - 1];
  if (!def) return;
  sheets.splice(sheets.indexOf(def), 1);
  def.el.classList.remove('in');
  setTimeout(() => def.el.remove(), 220);
  if (def.onClose) def.onClose(def);
}
function closeAllSheets() { while (sheets.length) closeSheet(); }
function sheetHead(title, right = '', left = `<button class="btn ghost sm" data-a="sheetClose">Close</button>`) {
  return `<header class="sheet-h">${left}<h2>${title}</h2><div class="sheet-h-r">${right}</div></header>`;
}
function confirmSheet({ title, text = '', ok = 'OK', danger = false, cancel = 'Cancel', onOk, extra = '' }) {
  return openSheet({
    cls: 'small',
    render: () => `<div class="sheet-body pad confirm"><h2>${esc(title)}</h2>${text ? `<p>${text}</p>` : ''}${extra}
      <div class="row-btns"><button class="btn" data-a="sheetClose">${esc(cancel)}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-a="ok">${esc(ok)}</button></div></div>`,
    actions: { ok: (t, def) => { if (onOk && onOk(def) === false) return; closeSheet(def); } }
  });
}
function menuSheet(title, items) {
  // items: [label, iconName, fn, {danger, sub}]
  return openSheet({
    cls: 'small',
    render: () => `${sheetHead(esc(title))}<div class="sheet-body menu">${items.filter(Boolean).map((it, i) =>
      `<button class="menu-item ${it[3] && it[3].danger ? 'danger' : ''}" data-a="pick" data-i="${i}">${icon(it[1])}<span><b>${esc(it[0])}</b>${it[3] && it[3].sub ? `<small>${esc(it[3].sub)}</small>` : ''}</span></button>`).join('')}</div>`,
    actions: { pick: (t, def) => { const it = items.filter(Boolean)[+t.dataset.i]; closeSheet(def); it[2](); } }
  });
}
function inputSheet({ title, label, value = '', ok = 'Save', multiline = false, onOk, placeholder = '' }) {
  return openSheet({
    cls: 'small', focus: '#sheetInput',
    render: () => `<div class="sheet-body pad confirm"><h2>${esc(title)}</h2>
      <label class="field"><span>${esc(label)}</span>${multiline
        ? `<textarea id="sheetInput" rows="4" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`
        : `<input id="sheetInput" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off" enterkeyhint="done">`}</label>
      <div class="row-btns"><button class="btn" data-a="sheetClose">Cancel</button><button class="btn primary" data-a="ok">${esc(ok)}</button></div></div>`,
    actions: { ok: (t, def) => { onOk($('#sheetInput', def.el).value.trim()); closeSheet(def); } },
    onKey: (ev, def) => { if (ev.key === 'Enter' && !multiline) { onOk($('#sheetInput', def.el).value.trim()); closeSheet(def); } }
  });
}

/* ============================== Charts ============================== */

const charts = new Map();
let chartSeq = 0;
function chartSlot(spec) {
  const id = 'c' + (++chartSeq);
  charts.set(id, spec);
  return `<div class="chart" data-chart="${id}" style="height:${spec.h || 200}px"></div>`;
}
function niceTicks(min, max, count = 4) {
  if (!(max > min)) { const p = Math.abs(max) * 0.1 || 1; min -= p; max += p; }
  const raw = (max - min) / count, mag = 10 ** Math.floor(Math.log10(raw)), n = raw / mag;
  const step = (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(8));
  return { lo, hi, ticks };
}
function drawCharts(root) {
  for (const el of $$('[data-chart]', root)) {
    const spec = charts.get(el.dataset.chart);
    if (!spec) continue;
    const W = el.clientWidth;
    if (!W) continue;
    el.innerHTML = (spec.type === 'bars' ? barsSVG : lineSVG)(spec, W) + '<div class="tip" hidden></div>';
    bindChart(el, spec);
  }
}
function lineSVG(spec, W) {
  const H = spec.h || 200, P = { l: 46, r: 16, t: 18, b: 26 };
  const pts = spec.points;
  if (!pts.length) return `<p class="chart-empty">${esc(spec.empty || 'Nothing logged yet.')}</p>`;
  let x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x));
  if (x1 - x0 < DAY) { x0 -= 3 * DAY; x1 += 3 * DAY; }
  const ys = pts.map(p => p.y), yMin = Math.min(...ys), yMax = Math.max(...ys), span = (yMax - yMin) || yMax * 0.1 || 1;
  const { lo, hi, ticks } = niceTicks(Math.max(0, yMin - span * 0.2), yMax + span * 0.12, 4);
  const X = v => P.l + (v - x0) / (x1 - x0) * (W - P.l - P.r);
  const Y = v => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  let g = '';
  for (const t of ticks) g += `<line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${Y(t)}" y2="${Y(t)}"/><text class="axis" x="${P.l - 8}" y="${Y(t) + 4}" text-anchor="end">${esc(spec.tick ? spec.tick(t) : compact(t))}</text>`;
  const xt = [x0, (x0 + x1) / 2, x1];
  xt.forEach((t, i) => { g += `<text class="axis" x="${X(t)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}">${esc(fmtShort(t))}</text>`; });
  for (const m of spec.marks || []) {
    if (m.x < x0 || m.x > x1) continue;
    g += `<line class="mark-line" x1="${X(m.x)}" x2="${X(m.x)}" y1="${P.t - 4}" y2="${H - P.b}"/><text class="axis mark-label" x="${X(m.x) + 4}" y="${P.t + 6}">${esc(m.label)}</text>`;
  }
  const dim = pts.filter(p => p.dim), live = pts.filter(p => !p.dim);
  const path = arr => arr.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  if (dim.length > 1) g += `<path class="line dim" d="${path(dim)}"/>`;
  for (const p of dim) g += `<circle class="dot-dim" cx="${X(p.x)}" cy="${Y(p.y)}" r="2.5"/>`;
  if (live.length > 1) {
    g += `<path class="area" d="${path(live)}L${X(live[live.length - 1].x)},${H - P.b}L${X(live[0].x)},${H - P.b}Z"/>`;
    g += `<path class="line" d="${path(live)}"/>`;
  }
  const end = live[live.length - 1] || pts[pts.length - 1];
  const ex = X(end.x), ey = Y(end.y);
  g += `<circle class="end-dot" cx="${ex}" cy="${ey}" r="4.5"/>`;
  g += `<text class="end-label" x="${Math.min(ex, W - P.r)}" y="${ey - 10}" text-anchor="end">${esc(spec.fmt(end.y))}</text>`;
  g += `<line class="xhair" x1="0" x2="0" y1="${P.t}" y2="${H - P.b}" visibility="hidden"/><circle class="focus-dot" r="5" visibility="hidden"/>`;
  spec._ = { X, Y, P, W, H };
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.aria || '')}">${g}<rect class="hit" x="${P.l}" y="0" width="${W - P.l - P.r}" height="${H}" fill="transparent"/></svg>`;
}
function barsSVG(spec, W) {
  const H = spec.h || 200, P = { l: 46, r: 12, t: 22, b: 26 };
  const bars = spec.bars, n = bars.length;
  const max = Math.max(...bars.map(b => b.v), 0);
  if (!max) return `<p class="chart-empty">${esc(spec.empty || 'Nothing logged yet.')}</p>`;
  const { hi, ticks } = niceTicks(0, max, 3);
  const slot = (W - P.l - P.r) / n, bw = Math.min(24, slot * 0.62);
  const Y = v => P.t + (1 - v / hi) * (H - P.t - P.b);
  let g = '';
  for (const t of ticks) g += `<line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${Y(t)}" y2="${Y(t)}"/><text class="axis" x="${P.l - 8}" y="${Y(t) + 4}" text-anchor="end">${esc(compact(t))}</text>`;
  const every = Math.ceil(44 / slot);
  bars.forEach((b, i) => {
    const cx = P.l + slot * (i + 0.5), x = cx - bw / 2, y = Y(b.v), h = H - P.b - y;
    if (b.v > 0) {
      const r = Math.min(4, bw / 2, h);
      g += `<path class="bar ${i === n - 1 ? 'cur' : ''}" d="M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${y + h}Z"/>`;
    }
    if ((n - 1 - i) % every === 0) g += `<text class="axis" x="${cx}" y="${H - 6}" text-anchor="middle">${esc(b.label)}</text>`;
    g += `<rect class="hit" data-i="${i}" x="${P.l + slot * i}" y="0" width="${slot}" height="${H - P.b}" fill="transparent"/>`;
  });
  const last = bars[n - 1];
  if (last.v > 0) g += `<text class="end-label" x="${P.l + slot * (n - 0.5)}" y="${Y(last.v) - 7}" text-anchor="middle">${esc(spec.fmt(last.v))}</text>`;
  spec._ = { slot, P, W, H, Y };
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.aria || '')}">${g}</svg>`;
}
function bindChart(el, spec) {
  const tip = $('.tip', el), svg = $('svg', el);
  if (!svg || !spec._) return;
  const show = ev => {
    const r = svg.getBoundingClientRect();
    const px = ev.clientX - r.left;
    let html, tx, ty;
    if (spec.type === 'bars') {
      const i = Math.max(0, Math.min(spec.bars.length - 1, Math.floor((px - spec._.P.l) / spec._.slot)));
      const b = spec.bars[i];
      html = `<b>${esc(spec.fmt(b.v))}</b><span>${esc(b.tip || b.label)}</span>`;
      tx = spec._.P.l + spec._.slot * (i + 0.5); ty = spec._.Y(b.v);
    } else {
      const { X, Y } = spec._;
      let best = spec.points[0];
      for (const p of spec.points) if (Math.abs(X(p.x) - px) < Math.abs(X(best.x) - px)) best = p;
      tx = X(best.x); ty = Y(best.y);
      const xh = $('.xhair', svg), fd = $('.focus-dot', svg);
      xh.setAttribute('x1', tx); xh.setAttribute('x2', tx); xh.setAttribute('visibility', 'visible');
      fd.setAttribute('cx', tx); fd.setAttribute('cy', ty); fd.setAttribute('visibility', 'visible');
      html = `<b>${esc(spec.fmt(best.y))}</b><span>${esc(fmtDateY(best.x))}${best.dim ? ' · earlier block' : ''}</span>`;
    }
    tip.innerHTML = html;
    tip.hidden = false;
    const tw = tip.offsetWidth;
    tip.style.left = Math.max(0, Math.min(spec._.W - tw, tx - tw / 2)) + 'px';
    tip.style.top = Math.max(0, ty - tip.offsetHeight - 12) + 'px';
  };
  const hide = () => { tip.hidden = true; for (const n of $$('.xhair,.focus-dot', svg)) n.setAttribute('visibility', 'hidden'); };
  el.addEventListener('pointermove', show);
  el.addEventListener('pointerdown', show);
  el.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse') hide(); });
}
function sparkline(vals) {
  if (vals.length < 2) return '';
  const W = 72, H = 26, min = Math.min(...vals), max = Math.max(...vals), sp = (max - min) || 1;
  const pts = vals.map((v, i) => [2 + i / (vals.length - 1) * (W - 6), 3 + (1 - (v - min) / sp) * (H - 6)]);
  const last = pts[pts.length - 1];
  return `<svg class="spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('')}"/><circle cx="${last[0]}" cy="${last[1]}" r="2.6"/></svg>`;
}

/* ============================== Train tab ============================== */

VIEWS.train = function () {
  const split = activeSplit();
  let h = `<header class="page-h"><div><p class="eyebrow">${esc(dfmt(Date.now(), { weekday: 'long', day: 'numeric', month: 'long' }))}</p><h1>Train</h1></div>
    <p class="page-h-side">Session <b>#${state.workouts.length + 1}</b> is next</p></header>`;
  if (!storageOK) h += `<div class="notice bad">${icon('info')}<p>This browser is blocking storage, so nothing you log will be kept. Open Lifting Sanity in Safari, or add it to your Home Screen.</p></div>`;
  h += installHint();
  if (state.active) {
    const w = state.active;
    h += `<button class="card resume" data-a="resume"><span class="live-dot"></span><span><b>${esc(w.mode === 'edit' ? 'Editing ' + w.name : w.name + ' in progress')}</b><small>${workingSets(w)} sets done${w.mode === 'edit' ? '' : ` · started ${fmtTime(w.start)}`}</small></span><span class="btn primary sm">Resume</span></button>`;
  }
  h += split ? splitCard(split) : `<section class="card pad"><h2>No split picked</h2><p class="muted">Pick a ready-made split below, or build templates of your own.</p></section>`;
  h += `<div class="quick"><button class="btn wide" data-a="startEmpty">${icon('plus')}Start an empty workout</button><button class="btn wide" data-a="newTpl">${icon('edit')}New template</button></div>`;
  h += templatesSection(split);
  h += programLibrary();
  return h;
};
function installHint() {
  if (inFrame || !state.settings.installHint || navigator.standalone || matchMedia('(display-mode: standalone)').matches) return '';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!ios) return '';
  return `<div class="notice">${icon('share')}<p><b>Add Lifting Sanity to your Home Screen.</b> Tap the Share button, then <b>Add to Home Screen</b>. It opens full screen, works offline and keeps your data safe from Safari’s cleanup.</p><button class="icon-btn" data-a="dismissInstall" aria-label="Hide this tip">${icon('x')}</button></div>`;
}
function splitCard(split) {
  const days = split.days.map(d => isRest(d) ? 'rest' : tplById(d) || null);
  const n = days.length, trainDays = days.filter(d => d && !isRest(d)).length, restDays = days.filter(isRest).length;
  if (!trainDays) return `<section class="card pad"><h2>${esc(split.name)}</h2><p class="muted">This split has no training days yet.</p><button class="btn" data-a="splitEdit" data-id="${split.id}">Add days</button></section>`;
  const st = splitToday(split), pos = st.idx;
  const t = days[pos] && !isRest(days[pos]) ? days[pos] : null;
  const last = t ? tplLastDone(t.id) : null;
  const head = st.state === 'rest' ? `<p class="eyebrow good">${icon('moon')}Rest day today</p><h3>Recover</h3><p class="muted">Next up: <b>${esc(t ? t.name : '')}</b> ${whenText(st.due)} · ${t ? t.ex.length : 0} exercises</p>`
    : st.state === 'done' ? `<p class="eyebrow good">${icon('check')}Done for today</p><h3>Nice work</h3><p class="muted">Next up: <b>${esc(t ? t.name : '')}</b> ${whenText(st.due)}${restDays ? ', after a rest day' : ''}</p>`
    : `<p class="eyebrow accent">Up next · Day ${pos + 1} of ${n}</p><h3>${esc(t.name)}</h3><p class="muted">${t.ex.length} exercises · ${trimNum(tplWorkingSets(t), 1)} working sets · ${last ? 'last done ' + relDay(last.start) : 'not done yet'}</p>`;
  return `<section class="card split">
    <div class="split-h"><div><p class="eyebrow">Your split · ${trainDays} training day${trainDays === 1 ? '' : 's'}${restDays ? ` + ${restDays} rest` : ''}</p><h2>${esc(split.name)}</h2></div>
      <div class="split-actions"><button class="btn sm" data-a="splitSwitch">${icon('swap')}Change</button><button class="btn sm" data-a="splitEdit" data-id="${split.id}">${icon('edit')}Edit</button></div></div>
    ${t ? `<div class="upnext ${st.state === 'due' ? '' : 'resting'}">
      ${head}
      <ol class="ex-preview">${t.ex.map(x => `<li><span>${thumb(x.exId, 'xs')}<span>${esc(getEx(x.exId).name)}</span></span><span class="muted">${esc(scheme(x.sets))}</span></li>`).join('')}</ol>
      <button class="btn ${st.state === 'due' ? 'primary' : ''} big" data-a="startDay" data-split="${split.id}" data-day="${pos}">${icon('play')}${st.state === 'due' ? 'Start' : 'Train anyway: start'} ${esc(t.name)}</button>
    </div>` : ''}
    <p class="eyebrow">Any day, any time</p>
    <div class="days">${days.map((d, i) => !d ? '' : isRest(d)
      ? `<div class="day rest"><span class="day-n">Day ${i + 1}</span><b>Rest</b><span class="muted">recover</span></div>`
      : `<button class="day ${i === pos ? 'is-next' : ''}" data-a="dayPreview" data-split="${split.id}" data-day="${i}">
      <span class="day-n">Day ${i + 1}${i === pos ? ' · next' : ''}</span><b>${esc(d.name)}</b><span class="muted">${(() => { const l = tplLastDone(d.id); return l ? relDay(l.start) : 'not done yet'; })()}</span></button>`).join('')}</div>
  </section>`;
}
function templatesSection(split) {
  const inSplit = new Set(split ? split.days : []);
  const rest = state.templates.filter(t => !inSplit.has(t.id));
  if (!rest.length) return '';
  const groups = {};
  for (const t of rest) {
    const sp = state.splits.find(s => s.days.includes(t.id));
    const g = sp ? sp.name : 'Your templates';
    (groups[g] = groups[g] || []).push(t);
  }
  const order = Object.keys(groups).sort((a, b) => (b === 'Your templates') - (a === 'Your templates'));
  return `<section class="section"><h2 class="section-h">Templates</h2>${order.map(g => `<p class="eyebrow">${esc(g)}</p><div class="tpl-grid">${groups[g].map(tplCard).join('')}</div>`).join('')}</section>`;
}
function tplCard(t) {
  const last = tplLastDone(t.id);
  return `<article class="tpl-card"><button class="tpl-main" data-a="tplPreview" data-id="${t.id}"><b>${esc(t.name)}</b><span class="muted">${t.ex.length} exercises · ${last ? relDay(last.start) : 'not done yet'}</span><span class="tpl-ex">${esc(t.ex.slice(0, 4).map(x => getEx(x.exId).name).join(', '))}${t.ex.length > 4 ? '…' : ''}</span></button>
    <div class="tpl-btns"><button class="btn sm primary" data-a="tplStart" data-id="${t.id}">${icon('play')}Start</button><button class="icon-btn" data-a="tplMenu" data-id="${t.id}" aria-label="More for ${esc(t.name)}">${icon('dots')}</button></div></article>`;
}
function programLibrary() {
  return `<section class="section"><h2 class="section-h">Ready-made splits</h2><p class="muted section-sub">Each one adds its days as templates you can change. Your current split and history stay as they are.</p>
    <div class="prog-grid">${PROGRAMS.map(p => {
      const inst = state.splits.find(s => s.programId === p.id);
      const active = inst && inst.id === state.activeSplit;
      return `<article class="prog"><div><p class="eyebrow">${esc(p.freq)}</p><h3>${esc(p.name)}</h3><p class="muted">${esc(p.about)}</p>
        <p class="prog-days">${p.days.map(d => `<span>${esc(isRest(d) ? 'Rest' : d[0])}</span>`).join('')}</p></div>
        ${active ? `<span class="pill good">${icon('check')}Your split</span>` : `<button class="btn sm" data-a="useProgram" data-id="${p.id}">${inst ? 'Switch to this split' : 'Use this split'}</button>`}</article>`;
    }).join('')}</div></section>`;
}
function tplPreviewSheet(tplId, splitId, day) {
  openSheet({
    cls: 'wide',
    render: () => {
      const t = tplById(tplId);
      if (!t) return `<div class="sheet-body pad">This template was deleted.</div>`;
      const sp = splitId ? splitById(splitId) : null;
      const n = tplTimesDone(t.id);
      return `${sheetHead(esc(t.name), `<button class="btn sm" data-a="edit">${icon('edit')}Edit</button>`)}
      <div class="sheet-body pad">
        <p class="eyebrow">${sp ? `${esc(sp.name)} · Day ${day + 1}` : 'Template'} · done ${n} time${n === 1 ? '' : 's'}</p>
        ${t.note ? `<p class="note-text">${esc(t.note)}</p>` : ''}
        <ol class="ex-preview big">${t.ex.map(x => {
          const lp = lastPerf(x.exId, Date.now());
          return `<li><span>${thumb(x.exId, 'sm')}<span><b>${esc(getEx(x.exId).name)}</b><small>${esc(scheme(x.sets))} · rest ${fmtRest(x.rest || state.settings.rest)}</small></span></span><span class="muted">${lp ? 'last ' + esc(lp.x.sets.filter(s => s.done && s.t !== 'W').slice(0, 1).map(s => fmtSet(lp.x, s)).join('')) : ''}</span></li>`;
        }).join('')}</ol>
        <div class="row-btns">${sp && sp.pos !== day ? `<button class="btn" data-a="makeNext">Make this next</button>` : ''}<button class="btn primary big" data-a="start">${icon('play')}Start ${esc(t.name)}</button></div>
      </div>`;
    },
    actions: {
      start: (b, def) => { closeSheet(def); startFromTemplate(tplId, splitId, day); },
      edit: (b, def) => { closeSheet(def); templateEditor(tplId); },
      makeNext: (b, def) => { const sp = splitById(splitId); sp.pos = day; save(); closeSheet(def); render(); }
    }
  });
}

/* ============================== Starting & finishing ============================== */

const A = () => state.active;
function wexFromTemplate(tx) {
  const prefs = state.exPrefs[tx.exId] || {}, def = getEx(tx.exId);
  const uni = hasReps(def.k) && !!(tx.uni ?? prefs.uni ?? def.uni);
  const sets = tx.sets.map(s => {
    const c = { t: s.t, tr: s.tr || '', trir: s.trir ?? null, done: false };
    if (s.side) c.side = s.side;
    if (s.tw != null) c.tw = s.tw;
    return c;
  });
  return {
    id: uid(), exId: tx.exId, rest: tx.rest || prefs.rest || state.settings.rest,
    uni, ss: tx.ss || null, note: tx.note || '',
    sets: (uni ? pairUp(sets) : unpair(sets)).map(s => ({ ...s, id: uid() }))
  };
}
function wexFresh(exId) {
  const prefs = state.exPrefs[exId] || {}, def = getEx(exId);
  const lp = lastPerf(exId, Date.now());
  let sets = lp ? lp.x.sets.filter(s => s.done).map(s => s.side ? { t: s.t, side: s.side, pair: s.pair, done: false } : { t: s.t, done: false }) : [];
  if (!sets.length) sets = [0, 1, 2].map(() => ({ t: 'N', done: false }));
  const uni = hasReps(def.k) && !!(prefs.uni ?? def.uni);
  return { id: uid(), exId, rest: prefs.rest || state.settings.rest, uni, ss: null, note: '', sets: (uni ? pairUp(sets) : unpair(sets)).map(s => ({ ...s, id: uid() })) };
}
function beginWorkout(w) {
  const go2 = () => {
    state.active = w;
    state.rest = null;
    ui.woHidden = false;
    ui.effOpen = null;
    save(true);
    closeAllSheets();
    renderWorkout(true);
    render();
    wake(true);
  };
  if (state.active) {
    confirmSheet({
      title: 'A workout is already open',
      text: `Finish or discard <b>${esc(state.active.name)}</b> before starting another. Discarding deletes the sets you logged in it.`,
      ok: 'Discard it and start', danger: true, cancel: 'Keep it', onOk: () => { setTimeout(go2, 50); }
    });
  } else go2();
}
function startFromTemplate(tplId, splitId, day) {
  const t = tplById(tplId);
  if (!t) return;
  const w = { id: uid(), name: t.name, start: Date.now(), end: null, tplId: t.id, splitId: splitId || null, day: day ?? null, note: '', ex: t.ex.map(wexFromTemplate), cur: 0 };
  beginWorkout(w);
}
function startEmpty() {
  const h = new Date().getHours();
  const name = h < 11 ? 'Morning workout' : h < 17 ? 'Afternoon workout' : 'Evening workout';
  beginWorkout({ id: uid(), name, start: Date.now(), end: null, tplId: null, splitId: null, day: null, note: '', ex: [], cur: 0 });
}
function repeatWorkout(src) {
  const w = { id: uid(), name: src.name, start: Date.now(), end: null, tplId: src.tplId, splitId: null, day: null, note: '', cur: 0,
    ex: src.ex.map(x => ({ id: uid(), exId: x.exId, rest: x.rest, uni: x.uni, ss: x.ss, note: x.note || '', sets: x.sets.map(s => ({ id: uid(), t: s.t, side: s.side, pair: s.pair, tr: s.tr || '', trir: s.trir ?? null, done: false })) })) };
  beginWorkout(w);
}
function editWorkout(id) {
  const src = state.workouts.find(w => w.id === id);
  if (!src) return;
  if (state.active) { toast('Finish your open workout first.'); return; }
  const w = clone(src);
  w.mode = 'edit'; w.editOf = id; w.cur = 0;
  state.active = w;
  ui.woHidden = false;
  save(true);
  closeAllSheets();
  renderWorkout(true);
  render();
}
function logPastWorkout() {
  if (state.active) { toast('Finish your open workout first.'); return; }
  const start = dayStart(Date.now() - DAY) + 18 * 3600e3;
  state.active = { id: uid(), name: 'Logged workout', start, end: start + 3600e3, tplId: null, splitId: null, day: null, note: '', ex: [], cur: 0, mode: 'edit', editOf: null };
  ui.woHidden = false;
  save(true);
  renderWorkout(true);
  render();
  setTimeout(() => dateSheet(), 250);
}
function cleanForSave(w) {
  for (const x of w.ex) x.sets = x.sets.filter(s => s.done);
  w.ex = w.ex.filter(x => x.sets.length);
  delete w.cur; delete w.mode; delete w.editOf;
  for (const x of w.ex) for (const s of x.sets) { delete s.prs; }
  return w;
}
function finishPrompt() {
  const w = A();
  const total = sum(w.ex, x => x.sets.length), done = sum(w.ex, x => x.sets.filter(s => s.done).length);
  const editing = w.mode === 'edit';
  if (!done) {
    confirmSheet({
      title: editing ? 'No sets are checked' : 'Nothing logged yet',
      text: editing ? 'Check the sets you did, or this workout will be deleted when you save.' : 'Check off at least one set, or discard this workout.',
      ok: editing ? 'Delete workout' : 'Discard workout', danger: true, cancel: 'Keep going',
      onOk: () => { if (editing && w.editOf) { state.workouts = state.workouts.filter(o => o.id !== w.editOf); } discardActive(); }
    });
    return;
  }
  confirmSheet({
    title: editing ? 'Save changes?' : `Finish ${w.name}?`,
    text: `${done} of ${total} sets checked.${done < total ? ' Unchecked sets are left out.' : ''}`,
    ok: editing ? 'Save' : 'Finish workout', cancel: 'Keep going',
    onOk: () => { setTimeout(finishWorkout, 30); }
  });
}
function finishWorkout() {
  const w = A();
  if (!w) return;
  const editing = w.mode === 'edit', editOf = w.editOf;
  if (!editing) w.end = Date.now();
  cleanForSave(w);
  if (editing && editOf) state.workouts = state.workouts.filter(o => o.id !== editOf);
  state.workouts.push(w);
  state.workouts.sort((a, b) => a.start - b.start);
  w.prs = workoutPRs(w);
  if (!editing && w.splitId) {
    const sp = splitById(w.splitId);
    if (sp && w.day != null && sp.days[w.day] === w.tplId) sp.pos = (w.day + 1) % Math.max(1, sp.days.length);
  }
  state.active = null;
  state.rest = null;
  save(true);
  wake(false);
  renderWorkout();
  renderRest();
  render();
  summarySheet(w.id, !editing);
}
function discardActive() {
  state.active = null;
  state.rest = null;
  ui.woHidden = false;
  save(true);
  wake(false);
  renderWorkout();
  renderRest();
  render();
}
function summarySheet(id, fresh) {
  const w = state.workouts.find(o => o.id === id);
  if (!w) return;
  const n = sessionNumber(w), times = w.tplId ? state.workouts.filter(o => o.tplId === w.tplId && o.start <= w.start).length : 0;
  const ms = muscleSets([w]);
  openSheet({
    cls: 'wide',
    render: () => `${sheetHead(fresh ? 'Workout saved' : 'Changes saved')}
    <div class="sheet-body pad summary">
      <p class="eyebrow accent">Session #${n}${times > 1 ? ` · ${esc(w.name)} #${times}` : ''}</p>
      <h2 class="big-title">${esc(w.name)}</h2>
      <div class="tiles">
        <div class="tile"><span>Time</span><b>${fmtDuration(w.end - w.start)}</b></div>
        <div class="tile"><span>Working sets</span><b>${workingSets(w)}</b></div>
        <div class="tile"><span>Volume</span><b>${fmtVol(workoutVolume(w))}</b></div>
        <div class="tile"><span>Records</span><b>${w.prs.length}</b></div>
      </div>
      ${w.prs.length ? `<h3 class="sub-h">${icon('trophy')}New records</h3><ul class="pr-list">${w.prs.map(p => `<li><b>${esc(getEx(p.exId).name)}</b><span>${esc(p.kind)}</span><span class="num">${esc(fmtSet({ uni: p.uni, exId: p.exId }, p.set))}</span></li>`).join('')}</ul>` : ''}
      ${ms.length ? `<h3 class="sub-h">Sets per muscle</h3><div class="msets">${ms.slice(0, 8).map(([m, c]) => `<span class="pill">${esc(MUSCLES[m])} <b>${trimNum(c, 1)}</b></span>`).join('')}</div>` : ''}
      <div class="row-btns">
        ${w.tplId && tplById(w.tplId) ? `<button class="btn" data-a="updTpl">Update “${esc(tplById(w.tplId).name)}” to match</button>` : ''}
        <button class="btn" data-a="saveTpl">Save as new template</button>
        <button class="btn primary" data-a="sheetClose">Done</button>
      </div>
    </div>`,
    actions: {
      saveTpl: () => templateFromWorkout(w),
      updTpl: (b, def) => {
        const t = tplById(w.tplId);
        t.ex = tplExFromWorkout(w, t);
        save(); closeSheet(def); render(); toast(`${t.name} now matches this workout.`);
      }
    }
  });
}
function tplExFromWorkout(w, oldTpl) {
  return w.ex.map(x => {
    const old = oldTpl ? oldTpl.ex.find(o => o.exId === x.exId) : null;
    return {
      exId: x.exId, rest: x.rest, uni: x.uni, ss: x.ss, note: x.note || '',
      sets: x.sets.map((s, j) => {
        const os = old ? old.sets[j] : null;
        const t = { t: s.t, tr: s.tr || (os && os.tr) || (hasReps(getEx(x.exId).k) && s.t !== 'W' ? String(recReps(x, s) || '') : ''), trir: s.trir ?? (os ? os.trir : null) };
        if (s.side) t.side = s.side;
        if (s.w != null) t.tw = s.w;
        return t;
      })
    };
  });
}
function templateFromWorkout(w) {
  inputSheet({
    title: 'Save as template', label: 'Template name', value: w.name, ok: 'Save template',
    onOk: name => {
      const t = { id: uid(), name: name || w.name, note: '', ex: tplExFromWorkout(w, null), created: Date.now() };
      state.templates.push(t); save(); render(); toast(`Saved “${t.name}” to your templates.`);
    }
  });
}

/* ============================== Workout screen ============================== */

function supersetGroups(w) {
  const groups = [];
  w.ex.forEach((x, i) => {
    if (!x.ss) return;
    const last = groups[groups.length - 1];
    if (last && last.ss === x.ss && last.idx[last.idx.length - 1] === i - 1) last.idx.push(i);
    else groups.push({ ss: x.ss, idx: [i] });
  });
  return groups.filter(g => g.idx.length > 1).map((g, n) => ({ ...g, letter: String.fromCharCode(65 + n) }));
}
function ssInfo(w, i) {
  for (const g of supersetGroups(w)) { const k = g.idx.indexOf(i); if (k >= 0) return { g, k, label: g.letter + (k + 1) }; }
  return null;
}
const exComplete = x => x.sets.length > 0 && x.sets.every(s => s.done);

function renderWorkout(resetScroll) {
  const el = $('#workout');
  const w = A();
  if (!w || ui.woHidden) {
    el.hidden = true; el.innerHTML = '';
    document.body.classList.remove('wo-open');
    ui.kp = null; renderKeypad();
    renderMini(); renderRest();
    return;
  }
  const main = $('.wo-main', el);
  const sc = main ? main.scrollTop : 0;
  if (w.cur == null || w.cur >= w.ex.length) w.cur = Math.max(0, w.ex.length - 1);
  el.innerHTML = workoutHTML(w);
  el.hidden = false;
  document.body.classList.add('wo-open');
  const m2 = $('.wo-main', el);
  if (m2) m2.scrollTop = resetScroll ? 0 : sc;
  const curNav = $('.nav-ex.cur', el);
  if (curNav) curNav.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  renderKeypad();
  markKpCell(false);
  renderMini();
  renderRest();
}
function workoutHTML(w) {
  const editing = w.mode === 'edit';
  const focus = state.settings.view === 'focus';
  const done = sum(w.ex, x => x.sets.filter(s => s.done && s.t !== 'W').length), total = sum(w.ex, x => x.sets.filter(s => s.t !== 'W').length);
  const num = editing && w.editOf ? sessionNumber(state.workouts.find(o => o.id === w.editOf)) : state.workouts.length + 1;
  let h = `<div class="wo ${focus ? 'focus' : 'list'}">
  <header class="wo-h">
    <button class="icon-btn" data-a="woMin" aria-label="Minimize workout">${icon('down')}</button>
    <div class="wo-title"><button class="wo-name" data-a="woRename">${esc(w.name)}</button>
      <div class="wo-meta">${editing ? `<span>${esc(fmtDate(w.start))} · ${fmtDuration((w.end || w.start) - w.start)}</span>` : `<span class="clock" data-clock>${fmtClock((Date.now() - w.start) / 1000)}</span>`}<span>Session #${num}</span><span><b>${done}</b>/${total} sets</span><span>${fmtVol(workoutVolume(w))}</span></div></div>
    ${editing ? '' : `<button class="icon-btn" data-a="woRest" aria-label="Start a rest timer">${icon('timer')}</button>`}
    <button class="icon-btn" data-a="woMenu" aria-label="Workout options">${icon('dots')}</button>
    <button class="btn primary" data-a="woFinish">${editing ? 'Save' : 'Finish'}</button>
  </header>
  <div class="wo-body">
    <nav class="wo-nav" aria-label="Exercises">${w.ex.map((x, i) => {
      const ss = ssInfo(w, i), d = x.sets.filter(s => s.done && s.t !== 'W').length, t = x.sets.filter(s => s.t !== 'W').length;
      return `<button class="nav-ex ${i === w.cur ? 'cur' : ''} ${exComplete(x) ? 'complete' : ''} ${ss ? 'ss' : ''}" data-a="woGo" data-i="${i}">
        <span class="nav-n">${exComplete(x) ? icon('check') : ss ? ss.label : i + 1}</span>${thumb(x.exId, 'xs nav-pic')}<span class="nav-name">${esc(getEx(x.exId).name)}</span><span class="nav-p">${d}/${t}</span></button>`;
    }).join('')}<button class="nav-ex add" data-a="woAddEx">${icon('plus')}<span class="nav-name">Add exercise</span></button></nav>
    <div class="wo-main">`;
  if (!w.ex.length) {
    h += `<div class="wo-empty"><h2>Add your first exercise</h2><p class="muted">Search 400+ exercises or create your own.</p><button class="btn primary big" data-a="woAddEx">${icon('plus')}Add exercises</button></div>`;
  } else if (focus) {
    h += exCardHTML(w, w.cur, true);
  } else {
    h += w.ex.map((x, i) => exCardHTML(w, i, false)).join('');
    h += `<button class="btn wide add-ex" data-a="woAddEx">${icon('plus')}Add exercises</button>`;
  }
  h += `<div class="wo-spacer"></div></div></div></div>`;
  return h;
}
function exCtx(w, x) {
  const lp = lastPerf(x.exId, w.start, w.editOf || w.id);
  const cat = o => (o.t === 'W' ? 'W' : 'N') + (o.side || '');
  const prevSets = x.sets.map((s, j) => {
    if (!lp) return null;
    const isW = s.t === 'W', done = lp.x.sets.filter(o => o.done);
    const k = x.sets.slice(0, j).filter(o => cat(o) === cat(s)).length;
    // same side if last time was logged that way, otherwise the matching set either way
    return done.filter(o => cat(o) === cat(s))[k]
      || done.filter(o => (o.t === 'W') === isW && (s.side ? !o.side : o.side === 'L'))[k] || null;
  });
  return { lp, prevSets, suggest: suggestion(x, lp), prs: livePRs(w, x) };
}
function suggestion(x, lp) {
  const k = getEx(x.exId).k;
  if (!lp || k !== 'wr') return null;
  const range = x.sets.map(s => s.tr).find(tr => /^\d+\s*[-–]\s*\d+$/.test(tr || ''));
  if (!range) return null;
  const [lo, hi] = range.split(/[-–]/).map(Number);
  const work = lp.x.sets.filter(s => s.done && !NO_RECORD.has(s.t) && s.t !== 'D');
  if (!work.length || !work.every(s => minReps(lp.x, s) >= hi)) return null;
  const top = Math.max(...work.map(s => s.w || 0));
  if (!top) return null;
  return { w: top + toKg(state.settings.step), r: lo, hi };
}
function placeholder(x, j, ctx) {
  const s = x.sets[j], prev = ctx.prevSets[j], out = {};
  const sameCat = o => (o.t === 'W') === (s.t === 'W') && (o.side || '') === (s.side || '');
  const today = x.sets.slice(0, j).reverse().find(o => sameCat(o) && o.done);
  const mate = partnerOf(x, s);
  const sug = ctx.suggest && s.t !== 'W' ? ctx.suggest : null;
  if (prev) for (const f of ['w', 'r', 'sec', 'dist']) if (prev[f] != null) out[f] = prev[f];
  if (sug) { out.w = sug.w; out.r = sug.r; }
  if (today) {
    if (today.w != null) out.w = today.w;
    for (const f of ['r', 'sec', 'dist']) if (out[f] == null && today[f] != null) out[f] = today[f];
  }
  // the second side usually uses the weight the first side just did
  if (mate && mate.done && mate.w != null && x.sets.indexOf(mate) < j) out.w = mate.w;
  if (out.w == null && s.tw != null) out.w = s.tw;
  // a drop set comes down from the set before it, unless last time's matching set was a drop set too
  if (s.t === 'D' && today && today.w != null && !(prev && prev.t === 'D')) {
    const step = toKg(state.settings.step) || 1;
    out.w = Math.max(step, Math.round(today.w * 0.8 / step) * step);
  }
  if (s.tr) {
    const n = parseInt(s.tr, 10);
    if (/^\d+\s*s$|:/.test(s.tr)) { if (out.sec == null) out.sec = parseTime(s.tr.replace(/s$/, '')); }
    else if (n && out.r == null) out.r = n;
  }
  return out;
}
function setCols(k, eff) {
  const c = ['var(--c-badge)', 'minmax(0,1fr)'];
  if (hasWeight(k)) c.push('var(--c-w)');
  if (hasReps(k)) c.push('var(--c-r)');
  if (hasDist(k)) c.push('var(--c-w)');
  if (hasTime(k)) c.push('var(--c-t)');
  if (eff && hasReps(k)) c.push('var(--c-e)');
  c.push('var(--c-check)');
  return c.join(' ');
}
function exCardHTML(w, i, focus) {
  const x = w.ex[i], ex = getEx(x.exId), k = ex.k, ctx = exCtx(w, x);
  const effOn = state.settings.effort !== 'off' && hasReps(k);
  const ss = ssInfo(w, i);
  const work = liftSets(x.sets).filter(s => s.t !== 'W');
  const target = work.length ? `${work.length} × ${(work[0].tr || '').replace('-', '–') || 'your reps'}${work[0].trir != null && effOn ? ` · ${effName()} ${effDisp(work[0].trir)}` : ''}` : '';
  let h = `<article class="exc ${exComplete(x) ? 'complete' : ''}" data-e="${i}" id="exc-${i}">
    <div class="exc-h">
      <button class="exc-pic" data-a="exInfo" data-e="${i}" aria-label="About ${esc(ex.name)}">${thumb(x.exId, 'lg')}</button>
      <div class="exc-t"><p class="eyebrow">${focus ? `Exercise ${i + 1} of ${w.ex.length} · ` : ''}${esc(MUSCLES[ex.m])} · ${esc(EQUIP[ex.eq])}${ss ? ` · <span class="ss-tag">Superset ${ss.label}</span>` : ''}</p>
        <h2><button class="exc-name" data-a="exInfo" data-e="${i}">${esc(ex.name)}</button></h2>
        <p class="exc-sub">${target ? `<span>${esc(target)}</span>` : ''}<button class="chip" data-a="exRest" data-e="${i}">${icon('timer')}Rest ${fmtRest(x.rest || state.settings.rest)}</button>${hasReps(k) && (x.uni || ex.uni) ? `<button class="chip ${x.uni ? 'on' : ''}" data-a="exUni" data-e="${i}" aria-pressed="${!!x.uni}">${icon('side')}${x.uni ? 'Left and right' : 'Both sides together'}</button>` : ''}</p></div>
      <button class="icon-btn" data-a="exMenu" data-e="${i}" aria-label="Options for ${esc(ex.name)}">${icon('dots')}</button>
    </div>`;
  if (x.note) h += `<button class="exc-note" data-a="exNote" data-e="${i}">${icon('note')}<span>${esc(x.note)}</span></button>`;
  if (ctx.suggest) h += `<p class="hint good">${icon('up')}<span>Last time you hit ${ctx.suggest.hi}+ reps on every set. Try <b>${esc(fmtW(ctx.suggest.w))}</b> today.</span></p>`;
  else if (ctx.lp && ctx.lp.archived) h += `<p class="hint">${icon('archive')}<span>“Previous” is from before your reset (${esc(fmtShort(ctx.lp.w.start))}). Records for this block start fresh.</span></p>`;
  h += `<div class="sets" style="--cols:${setCols(k, effOn)}"><div class="set-row head"><span>Set</span><span>Previous</span>`;
  if (hasWeight(k)) h += `<span>${esc(weightLabel(k))}</span>`;
  if (hasReps(k)) h += `<span>Reps</span>`;
  if (hasDist(k)) h += `<span>${distUnit(k)}</span>`;
  if (hasTime(k)) h += `<span>Time</span>`;
  if (effOn) h += `<span>${effName()}</span>`;
  h += `<span class="sr">Done</span></div>`;
  x.sets.forEach((s, j) => { h += setRowHTML(i, x, j, k, ctx, effOn); });
  h += `</div><div class="exc-actions"><button class="btn" data-a="addSet" data-e="${i}">${icon('plus')}Add set</button><button class="btn ghost" data-a="addWarm" data-e="${i}">${icon('flame')}Warm-ups</button>${BAR_EQUIP.has(ex.eq) ? `<button class="btn ghost" data-a="plates" data-e="${i}">${icon('plate')}Plates</button>` : ''}</div>`;
  if (focus) {
    const nxt = nextExIndex(w, i);
    h += `<div class="exc-nav"><button class="btn" data-a="woPrev" ${i === 0 ? 'disabled' : ''}>${icon('left')}Previous</button>
      ${i < w.ex.length - 1 ? `<button class="btn next ${exComplete(x) ? 'primary' : ''}" data-a="woNext"><span>Next: ${esc(getEx(w.ex[nxt == null ? i + 1 : nxt].exId).name)}</span>${icon('right')}</button>`
        : `<button class="btn next ${exComplete(x) ? 'primary' : ''}" data-a="woFinish"><span>${w.mode === 'edit' ? 'Save workout' : 'Finish workout'}</span>${icon('check')}</button>`}</div>`;
  }
  return h + `</article>`;
}
function setRowHTML(i, x, j, k, ctx, effOn) {
  const s = x.sets[j], ph = placeholder(x, j, ctx), prev = ctx.prevSets[j], prs = ctx.prs[j] || [];
  const pad = useKeypad();
  const inp = (f, val, pv, mode, aria) => pad
    ? `<button class="cell" data-a="kp" data-f="${f}" data-e="${i}" data-s="${j}" data-ph="${esc(pv)}" aria-label="${esc(aria)}">${val !== '' ? esc(val) : `<span class="ph">${esc(pv)}</span>`}</button>`
    : `<input class="cell" data-f="${f}" data-e="${i}" data-s="${j}" inputmode="${mode}" enterkeyhint="done" autocomplete="off" value="${esc(val)}" placeholder="${esc(pv)}" aria-label="${esc(aria)}">`;
  const n = s.side ? `${sideName(s.side).toLowerCase()} side` : `set ${j + 1}`;
  const cls = ['set-row', s.done ? 'done' : '', s.t === 'W' ? 'warm' : '', s.side ? (isPairTail(x.sets, j) ? 'pair-tail' : 'pair-head') : ''].join(' ');
  let h = `<div class="${cls}" data-s="${j}">`;
  h += badge(s.t, setLabel(x.sets, j), `data-a="setType" data-e="${i}" data-s="${j}"`, s.side);
  h += `<button class="prev ${ctx.lp && ctx.lp.archived ? 'archived' : ''}" data-a="usePrev" data-e="${i}" data-s="${j}" ${prev ? '' : 'disabled'}>${prev ? esc(fmtSet(ctx.lp.x, prev, k)) : '—'}</button>`;
  if (hasWeight(k)) h += inp('w', s.w != null ? dispW(s.w) : '', ph.w != null ? dispW(ph.w) : '', 'decimal', `Weight, ${n}`);
  if (hasReps(k)) h += inp('r', s.r ?? '', ph.r ?? '', 'numeric', `Reps, ${n}`);
  if (hasDist(k)) h += inp('dist', s.dist != null ? dispDist(s.dist, k) : '', ph.dist != null ? dispDist(ph.dist, k) : '', 'decimal', `Distance, ${n}`);
  if (hasTime(k)) h += inp('sec', s.sec != null ? fmtClock(s.sec) : '', ph.sec != null ? fmtClock(ph.sec) : '0:00', 'numeric', `Time, ${n}`);
  if (effOn) h += `<button class="cell eff ${s.rir != null ? 'has' : ''}" data-a="effort" data-e="${i}" data-s="${j}" aria-label="${effName()}, ${n}">${s.rir != null ? esc(effDisp(s.rir)) : s.trir != null ? `<span class="ph">${esc(effDisp(s.trir))}</span>` : '<span class="ph">–</span>'}</button>`;
  h += `<button class="check" data-a="toggleSet" data-e="${i}" data-s="${j}" aria-pressed="${!!s.done}" aria-label="${s.done ? 'Uncheck' : 'Check'} ${n}">${icon('check')}</button>`;
  h += `</div>`;
  if (prs.length && s.done) h += `<div class="pr-row">${icon('trophy')}<span>New record: ${esc(prs.join(' · '))}</span></div>`;
  if (ui.effOpen === `${i}:${j}`) h += effPicker(i, j, s);
  return h;
}
function effPicker(i, j, s) {
  const rpe = state.settings.effort === 'rpe';
  const vals = rpe ? [[4, '6'], [3, '7'], [2.5, '7.5'], [2, '8'], [1.5, '8.5'], [1, '9'], [0.5, '9.5'], [0, '10']] : [[0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5+']];
  return `<div class="eff-pick"><span class="eff-q">${rpe ? 'How hard was it? (RPE)' : 'Reps left in the tank (RIR)'}</span><div class="eff-chips">${vals.map(([v, l]) =>
    `<button class="${s.rir === v ? 'on' : ''}" data-a="effPick" data-e="${i}" data-s="${j}" data-v="${v}">${l}</button>`).join('')}<button class="clear" data-a="effPick" data-e="${i}" data-s="${j}" data-v="">Clear</button></div></div>`;
}
function nextExIndex(w, i) {
  for (let n = i + 1; n < w.ex.length; n++) if (!exComplete(w.ex[n])) return n;
  return i + 1 < w.ex.length ? i + 1 : null;
}
function woGo(i, smooth) {
  const w = A();
  if (!w || i < 0 || i >= w.ex.length) return;
  w.cur = i;
  ui.effOpen = null;
  ui.kp = null;
  save();
  if (state.settings.view === 'focus') {
    renderWorkout(true);
    const card = $('#workout .exc');
    if (card && smooth) { card.classList.add('slide-in'); }
  } else {
    renderWorkout();
    const c = $('#exc-' + i);
    if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
function hasValue(k, x, s) {
  if (hasReps(k)) return s.r > 0;
  if (k === 'wdist') return s.dist > 0;
  if (k === 'dist') return s.dist > 0 || s.sec > 0;
  return s.sec > 0;
}
function toggleSet(i, j, viaPad) {
  const w = A(), x = w.ex[i], s = x.sets[j], k = getEx(x.exId).k;
  ui.effOpen = null;
  if (s.done) { s.done = false; delete s.at; ui.kp = null; save(); renderWorkout(); return; }
  const ph = placeholder(x, j, exCtx(w, x));
  for (const f of ['w', 'r', 'sec', 'dist']) if (s[f] == null && ph[f] != null) s[f] = ph[f];
  if (!hasValue(k, x, s)) {
    toast(hasReps(k) ? 'Type how many reps you did first.' : 'Type the time or distance first.');
    const row = $(`#workout .exc[data-e="${i}"] .set-row[data-s="${j}"]`);
    if (row) { row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake'); }
    return;
  }
  s.done = true;
  s.at = Date.now();
  ui.kp = null;
  if (navigator.vibrate) navigator.vibrate(15);
  // first side of a left/right set: no rest yet, straight on to the other side
  const mate = partnerOf(x, s);
  if (mate && !mate.done) {
    if (viaPad) ui.kp = { e: i, s: x.sets.indexOf(mate), f: rowFields(x, k)[0], buf: null, fresh: true };
    save(); renderWorkout(); markKpCell(true);
    return;
  }
  const editing = w.mode === 'edit';
  const ss = ssInfo(w, i);
  let jumpTo = null;
  if (ss && ss.k < ss.g.idx.length - 1) {
    const n = ss.g.idx[ss.k + 1];
    if (!exComplete(w.ex[n])) jumpTo = n;
  } else if (ss) {
    const first = ss.g.idx.find(n => !exComplete(w.ex[n]));
    if (first != null && first !== i) jumpTo = first;
    if (!editing && state.settings.autoRest) startRest(x.rest || state.settings.rest, getEx(w.ex[first ?? i].exId).name);
  } else if (!editing && state.settings.autoRest) {
    const remaining = x.sets.some(o => !o.done);
    const nxt = nextExIndex(w, i);
    startRest(x.rest || state.settings.rest, remaining ? getEx(x.exId).name : nxt != null ? getEx(w.ex[nxt].exId).name : '');
  }
  save();
  if (jumpTo != null && state.settings.view === 'focus') {
    renderWorkout();
    setTimeout(() => { if (A() === w) { woGo(jumpTo, true); toast(`Superset: ${getEx(w.ex[jumpTo].exId).name}`); } }, 350);
    return;
  }
  renderWorkout();
  if (exComplete(x) && state.settings.autoNext && state.settings.view === 'focus' && !ss) {
    const nxt = nextExIndex(w, i);
    if (nxt != null && nxt !== i) setTimeout(() => {
      if (A() === w && w.cur === i && exComplete(w.ex[i])) { woGo(nxt, true); toast(`Up next: ${getEx(w.ex[nxt].exId).name}`, { label: 'Go back', fn: () => woGo(i) }); }
    }, 700);
  }
}
function addSet(i, type) {
  const x = A().ex[i];
  const last = x.sets.filter(s => s.t !== 'W').pop();
  const t = type || (last && ['D', 'F', 'P', 'E', 'A', 'RP', 'M', 'C'].includes(last.t) ? 'N' : last ? last.t : 'N');
  const base = { t, done: false };
  if (last) { base.tr = last.tr || ''; base.trir = last.trir ?? null; }
  if (x.uni) { const f = firstSide(x), p = uid(); x.sets.push({ ...base, id: uid(), side: f, pair: p }, { ...base, id: uid(), side: otherSide(f), pair: p }); }
  else x.sets.push({ ...base, id: uid() });
  save();
  renderWorkout();
}
function addWarmups(i) {
  const w = A(), x = w.ex[i], ex = getEx(x.exId);
  if (ex.k !== 'wr') { addSet(i, 'W'); return; }
  const ctx = exCtx(w, x);
  const j0 = x.sets.findIndex(s => s.t !== 'W');
  let target = null;
  if (j0 >= 0) target = x.sets[j0].w ?? placeholder(x, j0, ctx).w;
  if (!target) {
    const w0 = [{ id: uid(), t: 'W', done: false }];
    x.sets.unshift(...(x.uni ? pairUp(w0, firstSide(x)) : w0));
    save(); renderWorkout();
    toast('Added a warm-up set. Type a working weight first to get suggested warm-ups.');
    return;
  }
  const step = toKg(state.settings.step), bar = toKg(state.settings.bar);
  const round = v => Math.max(BAR_EQUIP.has(ex.eq) ? bar : step, Math.round(v / step) * step);
  const plan = [];
  if (BAR_EQUIP.has(ex.eq) && target > bar * 1.8) plan.push([bar, 10]);
  plan.push([round(target * 0.5), 8], [round(target * 0.7), 5], [round(target * 0.85), 3]);
  const seen = new Set();
  const made = plan.filter(([wt]) => wt < target - 0.01 && !seen.has(wt) && seen.add(wt)).map(([wt, r]) => ({ id: uid(), t: 'W', w: wt, r, done: false }));
  x.sets = [...(x.uni ? pairUp(made, firstSide(x)) : made), ...x.sets.filter(s => s.t !== 'W' || s.done)];
  save(); renderWorkout();
  toast(`Added ${made.length} warm-up sets up to ${fmtW(target)}.`);
}
function woInput(el) { woSetField(+el.dataset.e, +el.dataset.s, el.dataset.f, el.value); }
function woSetField(i, j, f, v) {
  const w = A();
  if (!w) return;
  const x = w.ex[i], s = x && x.sets[j];
  if (!s) return;
  const k = getEx(x.exId).k;
  if (f === 'w') s.w = toKg(parseNum(v));
  else if (f === 'sec') s.sec = parseTime(v);
  else if (f === 'dist') s.dist = toMeters(parseNum(v), k);
  else { const n = parseInt(v, 10); s[f] = isFinite(n) ? n : null; }
  if (s[f] == null) delete s[f];
  save();
}

/* ----- Workout sheets ----- */

function exMenu(i) {
  const w = A(), x = w.ex[i], ex = getEx(x.exId);
  const ss = ssInfo(w, i);
  menuSheet(ex.name, [
    ['History and records', 'chart', () => exerciseSheet(x.exId)],
    ['Replace exercise', 'swap', () => pickExercises({ single: true, title: 'Replace with', onPick: ([id]) => {
      x.exId = id; const d = getEx(id);
      setUni(x, hasReps(d.k) && !!((state.exPrefs[id] || {}).uni ?? d.uni));
      for (const s of x.sets) if (!s.done) { delete s.w; delete s.r; delete s.sec; delete s.dist; delete s.tw; }
      save(); renderWorkout();
    } })],
    ['Notes', 'note', () => exNote(i), { sub: x.note || 'Seat height, grip, cues…' }],
    [photos.has(x.exId) ? 'Change photo' : 'Add a photo of this machine', 'camera', () => pickPhoto(x.exId), { sub: 'Take one or pick from your library' }],
    hasReps(ex.k) ? [x.uni ? 'Log both sides together' : 'Log left and right separately', 'side', () => ACT.exUni({ dataset: { e: i } }), { sub: 'For one-arm or one-leg sets' }] : null,
    i < w.ex.length - 1 ? [ss && ss.k < ss.g.idx.length - 1 ? 'Unlink from next exercise' : 'Superset with next exercise', 'link', () => {
      const nx = w.ex[i + 1];
      if (ss && ss.k < ss.g.idx.length - 1) { nx.ss = null; if (ss.k === 0) x.ss = null; }
      else { const id = x.ss || uid(); x.ss = id; nx.ss = id; toast('Linked. You’ll go back and forth with no rest until the round is done.'); }
      save(); renderWorkout();
    }, { sub: 'Alternate sets, then rest after both' }] : null,
    ex.k === 'wr' ? ['Add suggested warm-ups', 'flame', () => addWarmups(i)] : null,
    BAR_EQUIP.has(ex.eq) ? ['Plate calculator', 'plate', () => plateSheet(x.sets.find(s => !s.done && s.t !== 'W')?.w ?? x.sets[x.sets.length - 1]?.w)] : null,
    i > 0 ? ['Move up', 'up', () => { w.ex.splice(i - 1, 0, w.ex.splice(i, 1)[0]); w.cur = i - 1; save(); renderWorkout(); }] : null,
    i < w.ex.length - 1 ? ['Move down', 'down', () => { w.ex.splice(i + 1, 0, w.ex.splice(i, 1)[0]); w.cur = i + 1; save(); renderWorkout(); }] : null,
    ['Remove exercise', 'trash', () => {
      const removed = w.ex.splice(i, 1)[0];
      if (w.cur >= w.ex.length) w.cur = Math.max(0, w.ex.length - 1);
      save(); renderWorkout();
      toast(`Removed ${ex.name}.`, { label: 'Undo', fn: () => { if (A() === w) { w.ex.splice(i, 0, removed); w.cur = i; save(); renderWorkout(); } } });
    }, { danger: true }]
  ]);
}
function exNote(i) {
  const x = A().ex[i];
  inputSheet({ title: 'Exercise notes', label: getEx(x.exId).name, value: x.note || '', multiline: true, placeholder: 'Seat height, grip, cues…',
    onOk: v => {
      x.note = v;
      const p = state.exPrefs[x.exId] = state.exPrefs[x.exId] || {};
      p.note = v;
      save(); renderWorkout();
    } });
}
function setTypeSheet(i, j) {
  const x = A().ex[i], s = x.sets[j], mate = partnerOf(x, s);
  const rows = (mate ? [s, mate] : [s]).sort((a, b) => x.sets.indexOf(a) - x.sets.indexOf(b));
  const title = s.side ? `${sideName(s.side)} side` : `Set ${j + 1}`;
  const restore = before => { if (A() && A().ex.includes(x)) { x.sets = before; save(); renderWorkout(); } };
  openSheet({
    cls: 'small',
    render: () => `${sheetHead(`${title} · ${esc(getEx(x.exId).name)}`)}<div class="sheet-body menu">
      ${TYPE_ORDER.map(t => `<button class="menu-item ${s.t === t ? 'on' : ''}" data-a="type" data-t="${t}"><span class="badge t-${t}">${t === 'N' ? (s.side || j + 1) : SET_TYPES[t].short}</span><span><b>${SET_TYPES[t].label}</b><small>${SET_TYPES[t].desc}</small></span>${s.t === t ? icon('check', 'tick') : ''}</button>`).join('')}
      <div class="menu-sep"></div>
      <button class="menu-item" data-a="dup">${icon('copy')}<span><b>${mate ? 'Duplicate this set, both sides' : 'Duplicate set'}</b></span></button>
      ${mate ? `<button class="menu-item" data-a="swap">${icon('swap')}<span><b>Do the ${sideName(otherSide(rows[0].side)).toLowerCase()} side first</b><small>Swaps the order of the two sides</small></span></button>` : ''}
      <button class="menu-item danger" data-a="del">${icon('trash')}<span><b>${mate ? 'Delete this set, both sides' : 'Delete set'}</b></span></button>
      ${mate ? `<button class="menu-item danger" data-a="delOne">${icon('x')}<span><b>Delete only the ${sideName(s.side).toLowerCase()} side</b></span></button>` : ''}</div>`,
    actions: {
      type: (b, def) => { for (const o of rows) o.t = b.dataset.t; save(); closeSheet(def); renderWorkout(); },
      dup: (b, def) => {
        const p = uid(), at = x.sets.indexOf(rows[rows.length - 1]) + 1;
        const copies = rows.map(o => { const c = clone(o); c.id = uid(); c.done = false; delete c.at; if (mate) c.pair = p; return c; });
        x.sets.splice(at, 0, ...copies); save(); closeSheet(def); renderWorkout();
      },
      swap: (b, def) => { const a = x.sets.indexOf(rows[0]), c = x.sets.indexOf(rows[1]); [x.sets[a], x.sets[c]] = [x.sets[c], x.sets[a]]; save(); closeSheet(def); renderWorkout(); },
      del: (b, def) => {
        const before = x.sets.slice();
        x.sets = x.sets.filter(o => !rows.includes(o)); save(); closeSheet(def); renderWorkout();
        toast(mate ? 'Set deleted, both sides.' : 'Set deleted.', { label: 'Undo', fn: () => restore(before) });
      },
      delOne: (b, def) => {
        const before = x.sets.slice(), pair = s.pair;
        x.sets = x.sets.filter(o => o !== s); delete mate.pair; save(); closeSheet(def); renderWorkout();
        toast('Side deleted.', { label: 'Undo', fn: () => { mate.pair = pair; restore(before); } });
      }
    }
  });
}
function restChooser({ title, current, onPick, extra }) {
  openSheet({
    cls: 'small',
    render: () => `${sheetHead(esc(title))}<div class="sheet-body pad"><div class="rest-grid">${REST_PRESETS.map(v => `<button class="${v === current ? 'on' : ''}" data-a="pick" data-v="${v}">${fmtRest(v)}</button>`).join('')}</div>${extra || ''}</div>`,
    actions: { pick: (b, def) => { closeSheet(def); onPick(+b.dataset.v); } }
  });
}
function woMenu() {
  const w = A();
  menuSheet(w.name, [
    ['Rename workout', 'edit', () => renameWorkout()],
    ['Workout notes', 'note', () => inputSheet({ title: 'Workout notes', label: w.name, value: w.note || '', multiline: true, onOk: v => { w.note = v; save(); } }), { sub: w.note || 'How it felt, sleep, energy…' }],
    w.mode === 'edit' ? ['Date and time', 'calendar', () => dateSheet(), { sub: fmtDate(w.start) + ', ' + fmtTime(w.start) }] : null,
    [state.settings.view === 'focus' ? 'Show all exercises in a list' : 'Show one exercise at a time', state.settings.view === 'focus' ? 'rows' : 'layout', () => { state.settings.view = state.settings.view === 'focus' ? 'list' : 'focus'; save(); renderWorkout(true); }],
    ['Add exercises', 'plus', () => addExercisesToWorkout()],
    w.mode === 'edit'
      ? ['Cancel editing', 'x', () => confirmSheet({ title: 'Cancel editing?', text: 'Your changes to this workout won’t be saved.', ok: 'Discard changes', danger: true, cancel: 'Keep editing', onOk: () => discardActive() }), { danger: true }]
      : ['Discard workout', 'trash', () => confirmSheet({ title: 'Discard this workout?', text: 'Every set you logged in it will be deleted. This can’t be undone.', ok: 'Discard workout', danger: true, cancel: 'Keep it', onOk: () => discardActive() }), { danger: true }]
  ]);
}
function renameWorkout() {
  const w = A();
  inputSheet({ title: 'Rename workout', label: 'Name', value: w.name, onOk: v => { if (v) { w.name = v; save(); renderWorkout(); } } });
}
function dateSheet() {
  const w = A();
  openSheet({
    cls: 'small',
    render: () => `<div class="sheet-body pad confirm"><h2>Date and time</h2>
      <label class="field"><span>Started</span><input type="datetime-local" id="dtStart" value="${toLocalInput(w.start)}"></label>
      <label class="field"><span>Length in minutes</span><input id="dtLen" inputmode="numeric" value="${Math.round(((w.end || w.start + 3600e3) - w.start) / 60000)}"></label>
      <div class="row-btns"><button class="btn" data-a="sheetClose">Cancel</button><button class="btn primary" data-a="ok">Save</button></div></div>`,
    actions: {
      ok: (b, def) => {
        const st = new Date($('#dtStart', def.el).value).getTime();
        const len = parseInt($('#dtLen', def.el).value, 10);
        if (isFinite(st)) w.start = st;
        w.end = w.start + (isFinite(len) && len > 0 ? len : 60) * 60000;
        save(); closeSheet(def); renderWorkout();
      }
    }
  });
}
function addExercisesToWorkout() {
  pickExercises({
    title: 'Add exercises',
    onPick: ids => {
      const w = A();
      const first = w.ex.length;
      for (const id of ids) {
        const x = wexFresh(id);
        if (state.exPrefs[id] && state.exPrefs[id].note) x.note = state.exPrefs[id].note;
        w.ex.push(x);
      }
      w.cur = first;
      save(); renderWorkout(true);
    }
  });
}
function plateSheet(kg) {
  const lb = U() === 'lb';
  const plates = lb ? [45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];
  const st = { target: kg != null ? +dispW(kg) : (lb ? 135 : 60), bar: state.settings.bar };
  const calc = () => {
    let side = (st.target - st.bar) / 2;
    const out = [];
    if (side < 0) return { out, left: side };
    for (const p of plates) while (side >= p - 1e-9) { out.push(p); side -= p; }
    return { out, left: side };
  };
  openSheet({
    cls: 'small',
    render: () => {
      const { out, left } = calc();
      const maxP = plates[0];
      return `${sheetHead('Plate calculator')}<div class="sheet-body pad">
        <div class="two"><label class="field"><span>Total weight (${U()})</span><input id="plT" inputmode="decimal" value="${st.target}"></label>
        <label class="field"><span>Bar (${U()})</span><input id="plB" inputmode="decimal" value="${st.bar}"></label></div>
        <div class="bar-viz" aria-hidden="true"><span class="sleeve"></span>${out.length ? '<span class="collar"></span>' : ''}${out.slice().reverse().map(p => `<span class="plate p-${lb ? 'iron' : PLATE_COLORS[p]}" style="height:${30 + 70 * p / maxP}%"></span>`).join('')}<span class="shoulder"></span></div>
        <p class="per-side">${st.target < st.bar ? 'That’s less than the bar.' : out.length ? `Each side: <b>${out.map(p => trimNum(p)).join(' + ')}</b> ${U()}` : 'Just the bar.'}</p>
        ${left > 0.01 ? `<p class="muted">${trimNum(left * 2)} ${U()} can’t be made with standard plates.</p>` : ''}</div>`;
    },
    onInput: (el, def) => {
      const v = parseNum(el.value);
      if (v == null) return;
      if (el.id === 'plT') st.target = v; else st.bar = v;
      const keep = el.id, pos = el.selectionStart;
      refreshSheet(def);
      const ne = $('#' + keep, def.el);
      if (ne) { ne.focus(); try { ne.setSelectionRange(pos, pos); } catch (e) { /* not a text input */ } }
    }
  });
}

/* ============================== Number pad (phones) ============================== */

function useKeypad() {
  const k = state.settings.keypad;
  if (k === 'app') return true;
  if (k === 'system') return false;
  return matchMedia('(max-width: 600px) and (pointer: coarse)').matches;
}
function rowFields(x, k) {
  const f = [];
  if (hasWeight(k)) f.push('w');
  if (hasReps(k)) f.push('r');
  if (hasDist(k)) f.push('dist');
  if (hasTime(k)) f.push('sec');
  return f;
}
function kpField() {
  const w = A(), k = ui.kp;
  if (!w || !k) return null;
  const x = w.ex[k.e], set = x && x.sets[k.s];
  if (!set) return null;
  const kind = getEx(x.exId).k;
  return rowFields(x, kind).includes(k.f) ? { w, x, set, k: kind } : null;
}
function kpCell() { const k = ui.kp; return k ? $(`#workout .cell[data-e="${k.e}"][data-s="${k.s}"][data-f="${k.f}"]`) : null; }
function kpCurrent() {
  const fld = kpField();
  if (!fld) return '';
  const v = fld.set[ui.kp.f], f = ui.kp.f;
  if (v == null) return '';
  return f === 'w' ? dispW(v) : f === 'sec' ? fmtClock(v) : f === 'dist' ? dispDist(v, fld.k) : String(v);
}
function kpShow(buf) { const c = kpCell(); if (c) c.innerHTML = buf ? esc(buf) : `<span class="ph">${esc(c.dataset.ph || '')}</span>`; }
function kpSet(buf) { ui.kp.buf = buf; woSetField(ui.kp.e, ui.kp.s, ui.kp.f, buf); kpShow(buf); }
function kpClose() { ui.kp = null; renderWorkout(); }
const KP_NAMES = { w: 'Weight', r: 'Reps', sec: 'Time', dist: 'Distance' };
function kpRowName(x, j) { const s = x.sets[j]; return s.side ? `${sideName(s.side)} side${s.t === 'W' ? ', warm-up' : ''}` : `Set ${setLabel(x.sets, j)}`; }
function renderKeypad() {
  const el = $('#keypad');
  const fld = kpField();
  if (!fld || !kpCell()) {
    ui.kp = null; el.hidden = true; el.innerHTML = '';
    document.body.classList.remove('kp-open');
    return;
  }
  const { x, k } = fld, f = ui.kp.f;
  const unit = f === 'w' ? weightLabel(k) : f === 'dist' ? distUnit(k) : f === 'sec' ? 'min:sec' : '';
  const step = f === 'w' ? trimNum(state.settings.step) : f === 'sec' ? '15s' : f === 'dist' ? (k === 'wdist' ? '5' : '0.1') : '1';
  const dot = f === 'sec' ? ':' : f === 'w' || f === 'dist' ? '.' : '';
  const key = c => `<button class="kp-k" data-a="kpKey" data-k="${c}">${c}</button>`;
  el.innerHTML = `<div class="kp-head"><div class="kp-title"><b>${esc(getEx(x.exId).name)}</b><span>${esc(kpRowName(x, ui.kp.s))} · ${KP_NAMES[f]}${unit ? ` (${esc(unit)})` : ''}</span></div>
    <span class="kp-rest" data-kprest hidden></span><button class="kp-hide" data-a="kpClose" aria-label="Hide number pad">${icon('down')}</button></div>
    <div class="kp-grid">${key('1')}${key('2')}${key('3')}<button class="kp-k fn" data-a="kpBack" aria-label="Delete">${icon('backspace')}</button>
    ${key('4')}${key('5')}${key('6')}<button class="kp-k fn" data-a="kpStep" data-d="-1">−${step}</button>
    ${key('7')}${key('8')}${key('9')}<button class="kp-k fn" data-a="kpStep" data-d="1">+${step}</button>
    ${dot ? key(dot) : '<span></span>'}${key('0')}<button class="kp-k fn" data-a="kpNext">Next</button><button class="kp-k log" data-a="kpLog">${icon('check')}Log</button></div>`;
  el.hidden = false;
  document.body.classList.add('kp-open');
  tickRest();
}
function markKpCell(scroll) {
  for (const c of $$('#workout .cell.kp-on')) c.classList.remove('kp-on');
  const c = kpCell();
  if (!c) return;
  c.classList.add('kp-on');
  if (!scroll) return;
  requestAnimationFrame(() => {
    const main = $('#workout .wo-main'), kp = $('#keypad');
    if (!main || kp.hidden) return;
    const r = c.getBoundingClientRect(), top = kp.getBoundingClientRect().top, mtop = main.getBoundingClientRect().top;
    if (r.bottom > top - 16) main.scrollBy({ top: r.bottom - top + 72, behavior: 'smooth' });
    else if (r.top < mtop + 8) main.scrollBy({ top: r.top - mtop - 72, behavior: 'smooth' });
  });
}

/* ============================== Rest timer ============================== */

function startRest(sec, next) {
  if (!sec) return;
  state.rest = { end: Date.now() + sec * 1000, total: sec, next: next || '', alerted: false };
  save();
  renderRest();
}
function renderRest() {
  const el = $('#restbar'), r = state.rest;
  if (!r) { el.hidden = true; el.className = ''; document.body.classList.remove('resting'); return; }
  el.hidden = false;
  document.body.classList.add('resting');
  el.innerHTML = `<div class="rb-track"><div class="rb-fill"></div></div>
    <div class="rb-main"><div class="rb-txt"><span class="rb-label">Rest</span><span class="rb-time" role="timer" aria-live="off"></span>${r.next ? `<span class="rb-next">Next: ${esc(r.next)}</span>` : ''}</div>
    <div class="rb-btns"><button data-a="restAdj" data-d="-15" aria-label="15 seconds less">−15</button><button data-a="restAdj" data-d="15" aria-label="15 seconds more">+15</button><button data-a="restPresets" aria-label="Choose rest length">${icon('timer')}</button><button class="skip" data-a="restSkip">Skip</button></div></div>`;
  tickRest();
}
function tickRest() {
  const r = state.rest;
  const kr = $('[data-kprest]');
  if (kr) {
    const l = r ? Math.ceil((r.end - Date.now()) / 1000) : 0;
    kr.hidden = !r;
    if (r) { kr.textContent = l > 0 ? 'Rest ' + fmtClock(l) : 'Rest over'; kr.classList.toggle('over', l <= 0); }
  }
  if (!r) return;
  const el = $('#restbar');
  const left = (r.end - Date.now()) / 1000;
  const t = $('.rb-time', el), f = $('.rb-fill', el);
  if (left > 0) {
    if (t) t.textContent = fmtClock(Math.ceil(left));
    if (f) f.style.transform = `scaleX(${Math.max(0, left / r.total)})`;
    el.classList.toggle('soon', left <= 10);
  } else {
    if (!r.alerted) {
      r.alerted = true;
      el.classList.add('over');
      const lab = $('.rb-label', el);
      if (lab) lab.textContent = 'Rest over';
      beep();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      save();
    }
    if (t) t.textContent = 'Go';
    if (f) f.style.transform = 'scaleX(0)';
    if (left < -6) { state.rest = null; save(); renderRest(); }
  }
}
let actx = null;
function unlockAudio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
  if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
}
function beep() {
  if (!state.settings.sound || !actx) return;
  try {
    const t0 = actx.currentTime;
    [0, 0.22, 0.44].forEach((d, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine';
      o.frequency.value = i === 2 ? 1318 : 880;
      g.gain.setValueAtTime(0.0001, t0 + d);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + d + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + (i === 2 ? 0.4 : 0.16));
      o.connect(g).connect(actx.destination);
      o.start(t0 + d);
      o.stop(t0 + d + 0.45);
    });
  } catch (e) { /* audio unavailable */ }
}
let wakeLock = null;
async function wake(on) {
  try {
    if (on && state.settings.wake && state.active && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      if (!wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { wakeLock = null; }
}

/* ============================== Exercise picker ============================== */

function filterBar(f, prefix) {
  const g = GROUPS.find(x => x[0] === f.g);
  return `<div class="filters">
    <label class="search">${icon('search')}<input id="${prefix}Q" data-f="${prefix}q" value="${esc(f.q)}" placeholder="Search ${LIB.length + state.custom.length} exercises" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search" type="search"></label>
    <div class="chips" role="group" aria-label="Muscle group"><button class="chip ${f.g === 'all' ? 'on' : ''}" data-a="${prefix}G" data-v="all">All</button>${GROUPS.map(([id, label]) => `<button class="chip ${f.g === id ? 'on' : ''}" data-a="${prefix}G" data-v="${id}">${label}</button>`).join('')}</div>
    ${g && g[2].length > 1 ? `<div class="chips sub" role="group" aria-label="Muscle"><button class="chip ${f.m === 'all' ? 'on' : ''}" data-a="${prefix}M" data-v="all">All ${esc(g[1].toLowerCase())}</button>${g[2].map(m => `<button class="chip ${f.m === m ? 'on' : ''}" data-a="${prefix}M" data-v="${m}">${esc(MUSCLES[m])}</button>`).join('')}</div>` : ''}
    <label class="select-wrap"><span class="sr">Equipment</span><select data-f="${prefix}eq"><option value="all">Any equipment</option>${Object.entries(EQUIP).map(([k, v]) => `<option value="${k}" ${f.eq === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
  </div>`;
}
function pickExercises({ title, single = false, onPick }) {
  const f = { q: '', g: 'all', m: 'all', eq: 'all' };
  const sel = [];
  const listHTML = () => {
    const list = filterExercises(f);
    const recent = !f.q && f.g === 'all' && f.eq === 'all' ? recentExercises(8) : [];
    const row = e => {
      const on = sel.includes(e.id);
      return `<button class="ex-row ${on ? 'on' : ''}" data-a="tog" data-id="${e.id}" aria-pressed="${on}">${thumb(e.id, 'md')}<span class="ex-txt"><b>${esc(e.name)}</b><small>${esc(MUSCLES[e.m])} · ${esc(EQUIP[e.eq])}${e.uni ? ' · one side' : ''}${e.custom ? ' · yours' : ''}</small></span>${single ? '' : `<span class="tickbox">${on ? sel.indexOf(e.id) + 1 : ''}</span>`}</button>`;
    };
    return `${recent.length ? `<p class="eyebrow list-h">Recently used</p>${recent.map(id => row(getEx(id))).join('')}<p class="eyebrow list-h">All exercises</p>` : ''}
      ${list.map(row).join('') || `<p class="muted pad">No exercises match. Try fewer words, or create it.</p>`}
      <button class="ex-row create" data-a="create">${icon('plus')}<span class="ex-txt"><b>${f.q ? `Create “${esc(f.q)}”` : 'Create a custom exercise'}</b><small>Add anything that’s missing</small></span></button>`;
  };
  openSheet({
    full: true,
    render: () => `${sheetHead(esc(title), single ? '' : `<button class="btn primary sm" data-a="done" ${sel.length ? '' : 'disabled'}>Add${sel.length ? ' ' + sel.length : ''}</button>`, `<button class="btn ghost sm" data-a="sheetClose">Cancel</button>`)}
      <div class="sheet-body">${filterBar(f, 'pk')}<div class="ex-list" id="pkList">${listHTML()}</div></div>`,
    actions: {
      tog: (b, def) => {
        const id = b.dataset.id;
        if (single) { closeSheet(def); onPick([id]); return; }
        const k = sel.indexOf(id);
        if (k >= 0) sel.splice(k, 1); else sel.push(id);
        const list = $('#pkList', def.el), sc = $('.sheet-body', def.el).scrollTop;
        list.innerHTML = listHTML();
        $('.sheet-body', def.el).scrollTop = sc;
        const btn = $('[data-a="done"]', def.el);
        btn.disabled = !sel.length; btn.textContent = 'Add' + (sel.length ? ' ' + sel.length : '');
      },
      done: (b, def) => { closeSheet(def); onPick(sel.slice()); },
      pkG: (b, def) => { f.g = b.dataset.v; f.m = 'all'; refreshSheet(def); },
      pkM: (b, def) => { f.m = b.dataset.v; refreshSheet(def); },
      create: (b, def) => customExerciseSheet(null, f.q, id => {
        if (single) { closeSheet(def); onPick([id]); } else { sel.push(id); refreshSheet(def); }
      })
    },
    onInput: (el, def) => {
      if (el.dataset.f === 'pkq') { f.q = el.value; $('#pkList', def.el).innerHTML = listHTML(); }
      if (el.dataset.f === 'pkeq') { f.eq = el.value; $('#pkList', def.el).innerHTML = listHTML(); }
    }
  });
}
function customExerciseSheet(id, name, onSaved) {
  const ex = id ? customMap.get(id) : null;
  const d = ex ? clone(ex) : { id: 'c-' + uid(), name: name || '', m: 'chest', eq: 'barbell', k: 'wr', sec: [], uni: false, custom: true };
  openSheet({
    cls: 'small', focus: ex ? null : '#cxName',
    render: () => `${sheetHead(ex ? 'Edit exercise' : 'New exercise', `<button class="btn primary sm" data-a="save">Save</button>`, `<button class="btn ghost sm" data-a="sheetClose">Cancel</button>`)}
      <div class="sheet-body pad form">
        <label class="field"><span>Name</span><input id="cxName" data-f="name" value="${esc(d.name)}" placeholder="e.g. Cable Y-Raise" autocomplete="off"></label>
        <label class="field"><span>Main muscle</span><select data-f="m">${Object.entries(MUSCLES).map(([k, v]) => `<option value="${k}" ${d.m === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
        <label class="field"><span>Equipment</span><select data-f="eq">${Object.entries(EQUIP).map(([k, v]) => `<option value="${k}" ${d.eq === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
        <label class="field"><span>How you log it</span><select data-f="k">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}" ${d.k === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
        <div class="field"><span>Other muscles worked</span><div class="chips wrap">${Object.entries(MUSCLES).filter(([k]) => k !== d.m).map(([k, v]) => `<button class="chip ${d.sec.includes(k) ? 'on' : ''}" data-a="sec" data-v="${k}">${esc(v)}</button>`).join('')}</div></div>
        <div class="set-item"><div><b>One side at a time</b><p class="muted">Log left and right reps separately.</p></div>${toggle(d.uni, 'uni')}</div>
      </div>`,
    actions: {
      sec: (b, def) => { const k = b.dataset.v; d.sec = d.sec.includes(k) ? d.sec.filter(x => x !== k) : [...d.sec, k]; refreshSheet(def); },
      uni: (b, def) => { d.uni = !d.uni; refreshSheet(def); },
      save: (b, def) => {
        d.name = d.name.trim();
        if (!d.name) { toast('Give the exercise a name.'); return; }
        d.sec = d.sec.filter(k => k !== d.m);
        if (ex) Object.assign(ex, d); else state.custom.push(d);
        rebuildCustom(); save(); closeSheet(def);
        if (onSaved) onSaved(d.id);
        refreshAll();
      }
    },
    onInput: (el) => { const f = el.dataset.f; if (f) d[f] = el.value; }
  });
}
function toggle(on, action, extra = '') {
  return `<button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${!!on}" data-a="${action}" ${extra}><span></span></button>`;
}
function refreshAll() {
  render();
  if (A() && !ui.woHidden) renderWorkout();
  for (const s of sheets) if (s.live) refreshSheet(s);
}

/* ============================== Template editor ============================== */

function templateEditor(tplId, opts = {}) {
  const orig = tplId ? tplById(tplId) : null;
  const d = orig ? clone(orig) : { id: uid(), name: opts.name || 'New template', note: '', ex: [], created: Date.now() };
  const isNew = !orig;
  openSheet({
    full: true,
    render: () => `${sheetHead(isNew ? 'New template' : 'Edit template', `<button class="btn primary sm" data-a="save">Save</button>`, `<button class="btn ghost sm" data-a="sheetClose">Cancel</button>`)}
      <div class="sheet-body pad tpl-ed">
        <label class="field"><span>Name</span><input data-f="name" value="${esc(d.name)}" autocomplete="off"></label>
        <label class="field"><span>Notes</span><textarea data-f="note" rows="2" placeholder="Focus, tempo, anything to remember">${esc(d.note || '')}</textarea></label>
        ${d.ex.map((x, i) => {
          const ex = getEx(x.exId);
          return `<div class="tex"><div class="tex-h"><span class="tex-n">${i + 1}</span><span class="tex-name"><b>${esc(ex.name)}</b><small>${esc(MUSCLES[ex.m])} · ${esc(scheme(x.sets))}${x.ss ? ' · superset' : ''}</small></span><button class="icon-btn" data-a="texMenu" data-i="${i}" aria-label="Options">${icon('dots')}</button></div>
            <div class="tset head"><span>Set</span><span>${esc(U())}</span><span>Target reps</span><span>${effName()}</span><span></span></div>
            ${x.sets.map((s, j) => `<div class="tset ${s.side ? (isPairTail(x.sets, j) ? 'pair-tail' : 'pair-head') : ''}">${badge(s.t, setLabel(x.sets, j), `data-a="tType" data-i="${i}" data-j="${j}"`, s.side)}
              <input class="cell" data-f="tw" data-i="${i}" data-j="${j}" inputmode="decimal" value="${s.tw != null ? dispW(s.tw) : ''}" placeholder="–" autocomplete="off" aria-label="Starting weight">
              <input class="cell" data-f="tr" data-i="${i}" data-j="${j}" value="${esc(s.tr || '')}" placeholder="${s.t === 'W' ? 'any' : '8-12'}" autocomplete="off" aria-label="Target reps">
              <input class="cell" data-f="trir" data-i="${i}" data-j="${j}" inputmode="decimal" value="${s.trir != null ? effDisp(s.trir) : ''}" placeholder="–" aria-label="Target ${effName()}">
              <button class="icon-btn" data-a="tDel" data-i="${i}" data-j="${j}" aria-label="Delete set">${icon('x')}</button></div>`).join('')}
            <div class="tex-f"><button class="btn sm" data-a="tAdd" data-i="${i}">${icon('plus')}Set</button><button class="btn sm ghost" data-a="tAddW" data-i="${i}">${icon('flame')}Warm-up</button>
              <label class="select-wrap sm"><span>Rest</span><select data-f="rest" data-i="${i}">${REST_PRESETS.map(v => `<option value="${v}" ${v === (x.rest || state.settings.rest) ? 'selected' : ''}>${fmtRest(v)}</option>`).join('')}</select></label></div></div>`;
        }).join('')}
        <button class="btn wide" data-a="addEx">${icon('plus')}Add exercises</button>
        ${isNew ? '' : `<button class="btn wide danger ghost" data-a="del">${icon('trash')}Delete template</button>`}
      </div>`,
    actions: {
      save: (b, def) => {
        d.name = (d.name || '').trim() || 'Template';
        if (isNew) state.templates.push(d); else Object.assign(orig, d);
        if (opts.onSaved) opts.onSaved(d.id);
        save(); closeSheet(def); refreshAll();
        toast(`Saved ${d.name}.`);
      },
      addEx: (b, def) => pickExercises({ title: 'Add to template', onPick: ids => {
        for (const id of ids) {
          const lp = lastPerf(id, Date.now()), ex = getEx(id);
          const rows = lp ? liftSets(lp.x.sets.filter(s => s.done)) : [{ t: 'N' }, { t: 'N' }, { t: 'N' }];
          const uni = hasReps(ex.k) && !!((state.exPrefs[id] || {}).uni ?? ex.uni);
          const sets = rows.map(s => ({ t: s.t, tr: s.t === 'W' ? '' : '8-12', trir: s.t === 'W' ? null : 2 }));
          d.ex.push({ exId: id, rest: (state.exPrefs[id] || {}).rest || state.settings.rest, note: '', ss: null, uni: uni || undefined, sets: uni ? tplSides(sets, true) : sets });
        }
        refreshSheet(def);
      } }),
      tType: (b, def) => {
        const x = d.ex[+b.dataset.i], j = +b.dataset.j, s = x.sets[j];
        const rows = [s, isPairTail(x.sets, j) ? x.sets[j - 1] : isPairTail(x.sets, j + 1) ? x.sets[j + 1] : null].filter(Boolean);
        menuSheet('Set type', TYPE_ORDER.map(t => [SET_TYPES[t].label, s.t === t ? 'check' : 'grip', () => { for (const o of rows) o.t = t; refreshSheet(def); }, { sub: SET_TYPES[t].desc }]));
      },
      tDel: (b, def) => {
        const x = d.ex[+b.dataset.i], j = +b.dataset.j;
        if (isPairTail(x.sets, j)) x.sets.splice(j - 1, 2);
        else if (isPairTail(x.sets, j + 1)) x.sets.splice(j, 2);
        else x.sets.splice(j, 1);
        refreshSheet(def);
      },
      tAdd: (b, def) => {
        const x = d.ex[+b.dataset.i], l = x.sets.filter(s => s.t !== 'W').pop();
        const s = { t: 'N', tr: l ? l.tr : '8-12', trir: l ? l.trir : 2 };
        if (l && l.tw != null) s.tw = l.tw;
        const first = (x.sets.find(o => o.side) || {}).side;
        x.sets.push(...(first ? [{ ...s, side: first }, { ...s, side: otherSide(first) }] : [s]));
        refreshSheet(def);
      },
      tAddW: (b, def) => {
        const x = d.ex[+b.dataset.i], k = x.sets.filter(s => s.t === 'W').length, first = (x.sets.find(o => o.side) || {}).side;
        const s = { t: 'W', tr: '', trir: null };
        x.sets.splice(k, 0, ...(first ? [{ ...s, side: first }, { ...s, side: otherSide(first) }] : [s]));
        refreshSheet(def);
      },
      texMenu: (b, def) => {
        const i = +b.dataset.i, x = d.ex[i];
        menuSheet(getEx(x.exId).name, [
          i > 0 ? ['Move up', 'up', () => { d.ex.splice(i - 1, 0, d.ex.splice(i, 1)[0]); refreshSheet(def); }] : null,
          i < d.ex.length - 1 ? ['Move down', 'down', () => { d.ex.splice(i + 1, 0, d.ex.splice(i, 1)[0]); refreshSheet(def); }] : null,
          i < d.ex.length - 1 ? [x.ss && d.ex[i + 1].ss === x.ss ? 'Unlink from next exercise' : 'Superset with next exercise', 'link', () => {
            const nx = d.ex[i + 1];
            if (x.ss && nx.ss === x.ss) nx.ss = null; else { const id = x.ss || uid(); x.ss = id; nx.ss = id; }
            refreshSheet(def);
          }] : null,
          hasReps(getEx(x.exId).k) ? [x.uni ?? getEx(x.exId).uni ? 'Log both sides together' : 'Log left and right separately', 'side', () => { x.uni = !(x.uni ?? getEx(x.exId).uni); x.sets = tplSides(x.sets, x.uni); refreshSheet(def); }] : null,
          ['Replace exercise', 'swap', () => pickExercises({ single: true, title: 'Replace with', onPick: ([id]) => { x.exId = id; refreshSheet(def); } })],
          ['Remove from template', 'trash', () => { d.ex.splice(i, 1); refreshSheet(def); }, { danger: true }]
        ]);
      },
      del: (b, def) => confirmSheet({
        title: `Delete ${d.name}?`, text: 'Workouts you already did with it stay in your history.', ok: 'Delete template', danger: true,
        onOk: () => {
          state.templates = state.templates.filter(t => t.id !== d.id);
          for (const sp of state.splits) { sp.days = sp.days.filter(id => id !== d.id); sp.pos = Math.min(sp.pos, Math.max(0, sp.days.length - 1)); }
          save(); closeSheet(def); refreshAll();
        }
      })
    },
    onInput: (el) => {
      const f = el.dataset.f;
      if (f === 'name' || f === 'note') { d[f] = el.value; return; }
      const x = d.ex[+el.dataset.i];
      if (!x) return;
      if (f === 'rest') { x.rest = +el.value; return; }
      const s = x.sets[+el.dataset.j];
      if (f === 'tr') s.tr = el.value.trim();
      if (f === 'tw') { const v = parseNum(el.value); if (v == null) delete s.tw; else s.tw = toKg(v); }
      if (f === 'trir') {
        const v = parseNum(el.value.replace('+', ''));
        s.trir = v == null ? null : state.settings.effort === 'rpe' ? Math.max(0, 10 - v) : v;
      }
    }
  });
}
function tplMenu(id) {
  const t = tplById(id);
  menuSheet(t.name, [
    ['Start workout', 'play', () => startFromTemplate(id)],
    ['Edit template', 'edit', () => templateEditor(id)],
    ['Duplicate', 'copy', () => { const c = clone(t); c.id = uid(); c.name = t.name + ' (copy)'; delete c.from; state.templates.push(c); save(); render(); toast(`Made ${c.name}.`); }],
    activeSplit() && !activeSplit().days.includes(id) ? ['Add to ' + activeSplit().name, 'plus', () => { activeSplit().days.push(id); save(); render(); toast(`${t.name} is now a day in ${activeSplit().name}.`); }] : null,
    ['Delete template', 'trash', () => confirmSheet({ title: `Delete ${t.name}?`, text: 'Workouts you already did with it stay in your history.', ok: 'Delete', danger: true,
      onOk: () => { state.templates = state.templates.filter(x => x.id !== id); for (const sp of state.splits) sp.days = sp.days.filter(d => d !== id); save(); render(); } }), { danger: true }]
  ]);
}

/* ============================== Split editor ============================== */

function splitEditor(splitId) {
  const orig = splitId ? splitById(splitId) : null;
  const d = orig ? clone(orig) : { id: uid(), name: 'My split', days: [], pos: 0 };
  openSheet({
    cls: 'wide', live: true,
    render: () => `${sheetHead(orig ? 'Edit split' : 'New split', `<button class="btn primary sm" data-a="save">Save</button>`, `<button class="btn ghost sm" data-a="sheetClose">Cancel</button>`)}
      <div class="sheet-body pad">
        <label class="field"><span>Name</span><input data-f="name" value="${esc(d.name)}" autocomplete="off"></label>
        <p class="eyebrow list-h">Days, in order</p>
        <div class="split-days">${d.days.map((tid, i) => {
          const t = isRest(tid) ? null : tplById(tid);
          if (!t && !isRest(tid)) return '';
          const name = t ? t.name : 'Rest day';
          const moves = `<button class="icon-btn" data-a="up" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(name)} up">${icon('up')}</button>
            <button class="icon-btn" data-a="down" data-i="${i}" ${i === d.days.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(name)} down">${icon('down')}</button>`;
          return t ? `<div class="split-day"><span class="tex-n">${i + 1}</span><span class="tex-name"><b>${esc(t.name)}</b><small>${t.ex.length} exercises${i === d.pos ? ' · up next' : ''}</small></span>
            ${moves}<button class="icon-btn" data-a="editDay" data-i="${i}" aria-label="Edit ${esc(t.name)}">${icon('edit')}</button>
            <button class="icon-btn" data-a="rm" data-i="${i}" aria-label="Remove ${esc(t.name)} from split">${icon('x')}</button></div>`
            : `<div class="split-day rest"><span class="tex-n">${icon('moon')}</span><span class="tex-name"><b>Rest day</b><small>Passes by itself with the calendar</small></span>
            ${moves}<button class="icon-btn" data-a="rm" data-i="${i}" aria-label="Remove rest day">${icon('x')}</button></div>`;
        }).join('') || '<p class="muted">No days yet.</p>'}</div>
        <div class="row-btns left"><button class="btn" data-a="addNew">${icon('plus')}New day</button><button class="btn" data-a="addExisting">${icon('copy')}Add a template</button><button class="btn" data-a="addRest">${icon('moon')}Rest day</button></div>
        ${orig ? `<div class="row-btns left">${state.activeSplit !== d.id ? `<button class="btn" data-a="activate">Make this my split</button>` : ''}<button class="btn danger ghost" data-a="del">${icon('trash')}Delete split</button></div>` : ''}
      </div>`,
    actions: {
      save: (b, def) => {
        d.name = d.name.trim() || 'My split';
        d.pos = Math.min(d.pos, Math.max(0, d.days.length - 1));
        if (orig) Object.assign(orig, d); else { state.splits.push(d); state.activeSplit = d.id; }
        save(); closeSheet(def); render();
      },
      up: (b, def) => { const i = +b.dataset.i; d.days.splice(i - 1, 0, d.days.splice(i, 1)[0]); refreshSheet(def); },
      down: (b, def) => { const i = +b.dataset.i; d.days.splice(i + 1, 0, d.days.splice(i, 1)[0]); refreshSheet(def); },
      rm: (b, def) => { d.days.splice(+b.dataset.i, 1); refreshSheet(def); },
      editDay: (b) => templateEditor(d.days[+b.dataset.i]),
      addRest: (b, def) => { d.days.push('rest'); refreshSheet(def); },
      addNew: (b, def) => templateEditor(null, { name: `Day ${d.days.length + 1}`, onSaved: id => { d.days.push(id); refreshSheet(def); } }),
      addExisting: (b, def) => {
        const list = state.templates.filter(t => !d.days.includes(t.id));
        if (!list.length) { toast('Every template is already in this split.'); return; }
        menuSheet('Add a template', list.map(t => [t.name, 'copy', () => { d.days.push(t.id); refreshSheet(def); }, { sub: `${t.ex.length} exercises` }]));
      },
      activate: (b, def) => { Object.assign(orig, d); state.activeSplit = d.id; save(); closeSheet(def); render(); toast(`${d.name} is now your split.`); },
      del: (b, def) => confirmSheet({ title: `Delete ${d.name}?`, text: 'Its templates and your history are kept. Only the split itself is removed.', ok: 'Delete split', danger: true,
        onOk: () => { state.splits = state.splits.filter(s => s.id !== d.id); if (state.activeSplit === d.id) state.activeSplit = state.splits[0] ? state.splits[0].id : null; save(); closeSheet(def); render(); } })
    },
    onInput: (el) => { if (el.dataset.f === 'name') d.name = el.value; }
  });
}
function splitSwitcher() {
  openSheet({
    cls: 'small',
    render: () => `${sheetHead('Change split')}<div class="sheet-body menu">
      ${state.splits.map(s => `<button class="menu-item ${s.id === state.activeSplit ? 'on' : ''}" data-a="pick" data-id="${s.id}">${icon(s.id === state.activeSplit ? 'check' : 'calendar')}<span><b>${esc(s.name)}</b><small>${esc(splitNames(s).join(' · ')) || 'No days yet'}</small></span></button>`).join('')}
      <div class="menu-sep"></div>
      <button class="menu-item" data-a="new">${icon('plus')}<span><b>Build a new split</b><small>Pick the days and their order</small></span></button>
      <button class="menu-item" data-a="lib">${icon('list')}<span><b>Browse ready-made splits</b></span></button></div>`,
    actions: {
      pick: (b, def) => { state.activeSplit = b.dataset.id; save(); closeSheet(def); render(); },
      new: (b, def) => { closeSheet(def); splitEditor(null); },
      lib: (b, def) => { closeSheet(def); const el = $$('.section-h').find(h => h.textContent.includes('Ready-made')); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
    }
  });
}

/* ============================== History tab ============================== */

VIEWS.history = function () {
  const ws = state.workouts;
  const mStart = ui.hist.month || (() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  ui.hist.month = mStart;
  let h = `<header class="page-h"><div><p class="eyebrow">${ws.length} session${ws.length === 1 ? '' : 's'} logged</p><h1>History</h1></div><button class="btn sm" data-a="logPast">${icon('plus')}Log a past workout</button></header>`;
  h += calendarHTML(mStart);
  if (!ws.length) return h + `<section class="card pad empty"><h2>No workouts yet</h2><p class="muted">Finish a workout and it shows up here, with every set you did.</p></section>`;
  let list = ws.slice().reverse();
  if (ui.hist.day) list = list.filter(w => dayStart(w.start) === ui.hist.day);
  if (ui.hist.day) h += `<div class="filter-note"><span>Showing ${esc(fmtDateY(ui.hist.day))}</span><button class="btn sm ghost" data-a="histDay" data-v="">Show all</button></div>`;
  let lastBlock = null;
  h += `<div class="hist-list">`;
  for (const w of list) {
    const b = blockAt(w.start);
    if (b !== lastBlock && state.blocks.length > 1) {
      h += `<p class="block-div">${icon(b === curBlock() ? 'chart' : 'archive')}<span>${esc(b.name)}</span><small>${b === curBlock() ? 'current block' : 'earlier block'}${b.start ? ' · from ' + esc(fmtDateY(b.start)) : ''}</small></p>`;
      lastBlock = b;
    }
    h += histCard(w);
  }
  return h + `</div>`;
};
function histCard(w) {
  const n = sessionNumber(w);
  const prs = (w.prs || []).length;
  return `<button class="hist-card" data-a="openWorkout" data-id="${w.id}">
    <div class="hist-top"><span class="hist-n">#${n}</span><b>${esc(w.name)}</b>${w.demo ? '<span class="pill">sample</span>' : ''}${prs ? `<span class="pill good">${icon('trophy')}${prs}</span>` : ''}<span class="muted hist-date">${esc(fmtDate(w.start))}</span></div>
    <div class="hist-stats"><span>${fmtDuration(w.end - w.start)}</span><span>${workingSets(w)} sets</span><span>${fmtVol(workoutVolume(w))}</span></div>
    <div class="hist-ex">${w.ex.slice(0, 5).map(x => `<span>${trimNum(sum(x.sets, s => s.t !== 'W' ? setWeight(s) : 0), 1)} × ${esc(getEx(x.exId).name)}</span>`).join('')}${w.ex.length > 5 ? `<span class="muted">+${w.ex.length - 5} more</span>` : ''}</div></button>`;
}
function calendarHTML(mStart) {
  const d = new Date(mStart);
  const y = d.getFullYear(), m = d.getMonth();
  const first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
  const counts = {};
  for (const w of state.workouts) { const k = dayStart(w.start); counts[k] = (counts[k] || 0) + 1; }
  const today = dayStart(Date.now());
  let cells = '';
  for (let i = 0; i < first; i++) cells += `<span></span>`;
  for (let i = 1; i <= days; i++) {
    const ts = new Date(y, m, i).getTime();
    const c = counts[ts] || 0;
    cells += `<button class="cal-d ${c ? 'has' : ''} ${ts === today ? 'today' : ''} ${ui.hist.day === ts ? 'on' : ''}" data-a="histDay" data-v="${c ? ts : ''}" ${c ? '' : 'tabindex="-1"'} aria-label="${esc(fmtDateY(ts))}${c ? `, ${c} workout${c > 1 ? 's' : ''}` : ''}">${i}</button>`;
  }
  const monthCount = state.workouts.filter(w => { const x = new Date(w.start); return x.getFullYear() === y && x.getMonth() === m; }).length;
  return `<section class="card cal"><div class="cal-h"><button class="icon-btn" data-a="histMonth" data-d="-1" aria-label="Previous month">${icon('left')}</button><div><b>${esc(d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))}</b><small class="muted">${monthCount} workout${monthCount === 1 ? '' : 's'}</small></div><button class="icon-btn" data-a="histMonth" data-d="1" aria-label="Next month">${icon('right')}</button></div>
    <div class="cal-grid">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<span class="cal-w">${x}</span>`).join('')}${cells}</div></section>`;
}
function workoutSheet(id) {
  openSheet({
    cls: 'wide', live: true,
    render: () => {
      const w = state.workouts.find(o => o.id === id);
      if (!w) return `${sheetHead('Workout')}<div class="sheet-body pad"><p>This workout was deleted.</p></div>`;
      const b = blockAt(w.start);
      return `${sheetHead(esc(w.name), `<button class="btn sm" data-a="edit">${icon('edit')}Edit</button>`)}
      <div class="sheet-body pad">
        <p class="eyebrow">Session #${sessionNumber(w)} · ${esc(fmtDate(w.start))}, ${esc(fmtTime(w.start))}${state.blocks.length > 1 ? ' · ' + esc(b.name) : ''}</p>
        <div class="tiles"><div class="tile"><span>Time</span><b>${fmtDuration(w.end - w.start)}</b></div><div class="tile"><span>Working sets</span><b>${workingSets(w)}</b></div><div class="tile"><span>Volume</span><b>${fmtVol(workoutVolume(w))}</b></div><div class="tile"><span>Records</span><b>${(w.prs || []).length}</b></div></div>
        ${w.note ? `<p class="note-text">${esc(w.note)}</p>` : ''}
        ${w.ex.map(x => {
          const ex = getEx(x.exId), k = ex.k;
          const prSets = new Set((w.prs || []).filter(p => p.exId === x.exId).map(p => p.set.id));
          return `<div class="wd-ex"><button class="wd-pic" data-a="openEx" data-id="${x.exId}" aria-label="About ${esc(ex.name)}">${thumb(x.exId, 'lg')}</button><div class="wd-body">
            <button class="wd-name" data-a="openEx" data-id="${x.exId}"><b>${esc(ex.name)}</b></button>${x.note ? `<p class="muted small">${esc(x.note)}</p>` : ''}
            <ol class="lines">${x.sets.map((s, j) => `<li>${lineTag(x.sets, j)}<span class="num">${esc(fmtLine(x, s, k))}</span>${prSets.has(s.id) ? `<span class="pill good">${icon('trophy')}Record</span>` : ''}</li>`).join('')}</ol></div></div>`;
        }).join('')}
        <div class="row-btns left"><button class="btn" data-a="repeat">${icon('play')}Do it again</button><button class="btn" data-a="saveTpl">${icon('copy')}Save as template</button><button class="btn danger ghost" data-a="del">${icon('trash')}Delete</button></div>
      </div>`;
    },
    actions: {
      edit: () => editWorkout(id),
      repeat: () => repeatWorkout(state.workouts.find(o => o.id === id)),
      saveTpl: () => templateFromWorkout(state.workouts.find(o => o.id === id)),
      del: (b, def) => confirmSheet({ title: 'Delete this workout?', text: 'It’s removed from your history, charts and records.', ok: 'Delete workout', danger: true,
        onOk: () => {
          const w = state.workouts.find(o => o.id === id);
          state.workouts = state.workouts.filter(o => o.id !== id);
          save(); closeSheet(def); render();
          toast('Workout deleted.', { label: 'Undo', fn: () => { state.workouts.push(w); state.workouts.sort((a, b2) => a.start - b2.start); save(); render(); } });
        } })
    }
  });
}

/* ============================== Exercises tab ============================== */

VIEWS.library = function () {
  return `<header class="page-h"><div><p class="eyebrow">${LIB.length} built in · ${state.custom.filter(c => !c.hidden).length} of yours</p><h1>Exercises</h1></div><button class="btn sm" data-a="libNew">${icon('plus')}New exercise</button></header>
    ${filterBar(ui.lib, 'lib')}<div class="ex-list card" id="libList">${libListHTML()}</div>`;
};
function libListHTML() {
  const list = filterExercises(ui.lib);
  const used = {};
  for (const w of state.workouts) for (const x of w.ex) used[x.exId] = w.start;
  return `<p class="eyebrow list-h">${list.length} exercise${list.length === 1 ? '' : 's'}</p>` + list.map(e => `<button class="ex-row" data-a="openEx" data-id="${e.id}">${thumb(e.id, 'md')}<span class="ex-txt"><b>${esc(e.name)}</b><small>${esc(MUSCLES[e.m])} · ${esc(EQUIP[e.eq])}${e.uni ? ' · one side' : ''}${e.custom ? ' · yours' : ''}</small></span>${used[e.id] ? `<span class="muted small">${esc(relDay(used[e.id]))}</span>` : ''}${icon('right', 'chev')}</button>`).join('')
    + (list.length ? '' : `<p class="muted pad">Nothing matches. <button class="link" data-a="libNew">Create “${esc(ui.lib.q)}”</button></p>`);
}
function exerciseSheet(exId) {
  const st = { range: 'block', metric: null };
  openSheet({
    full: true, live: true,
    render: () => {
      const ex = getEx(exId), k = ex.k;
      const metrics = metricsFor(k);
      if (!st.metric) st.metric = metrics[0][0];
      const base = baseline(exId);
      const resets = (state.exResets[exId] || []).slice().sort((a, b) => a - b);
      const allPts = exSeries(exId, st.metric);
      const hasArchived = allPts.some(p => p.x < base);
      const pts = (st.range === 'all' ? allPts : allPts.filter(p => p.x >= base)).map(p => ({ ...p, dim: p.x < base }));
      const marks = st.range === 'all' ? [...state.blocks.slice(1).map(b => ({ x: b.start, label: b.name })), ...resets.map(r => ({ x: r, label: 'Reset' }))] : [];
      const rec = records(exId, st.range === 'all' ? 0 : base);
      const prefs = state.exPrefs[exId] || {};
      const sessions = [];
      for (let i = state.workouts.length - 1; i >= 0; i--) {
        const w = state.workouts[i], xs = w.ex.filter(x => x.exId === exId && x.sets.some(s => s.done));
        if (xs.length) sessions.push({ w, xs });
      }
      const tiles = k === 'wr'
        ? [['Est. 1RM', rec.e1rm ? fmtW(rec.e1rm, 1) : '—'], ['Heaviest', rec.w ? fmtW(rec.w) : '—'], ['Best set', rec.vol ? fmtVol(rec.vol) : '—'], ['Sessions', rec.sessions]]
        : k === 'bw' || k === 'aw' ? [['Most reps', rec.reps || '—'], ['Most added', rec.w ? fmtW(rec.w) : '—'], ['Sessions', rec.sessions]]
        : k === 'dur' || k === 'wdur' ? [['Longest', rec.sec ? fmtClock(rec.sec) : '—'], ['Sessions', rec.sessions]]
        : [['Farthest', rec.dist ? dispDist(rec.dist, k) + ' ' + distUnit(k) : '—'], ['Sessions', rec.sessions]];
      const yt = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(ex.name + ' exercise form');
      const photo = photos.get(exId);
      return `${sheetHead(esc(ex.name), ex.custom ? `<button class="btn sm" data-a="editCustom">${icon('edit')}Edit</button>` : '')}
      <div class="sheet-body pad exd">
        <div class="exd-hero">${photo ? `<img class="exd-photo" src="${photo}" alt="Your photo of ${esc(ex.name)}">` : ''}
          <div class="exd-map"><figure>${figure('front', ex, 'full')}<figcaption>Front</figcaption></figure><figure>${figure('back', ex, 'full')}<figcaption>Back</figcaption></figure></div></div>
        <div class="exd-legend"><span><i class="dot hit"></i>Main: ${esc(MUSCLES[ex.m])}</span>${ex.sec.length ? `<span><i class="dot hit-2"></i>Also: ${esc(ex.sec.map(m => MUSCLES[m]).join(', '))}</span>` : ''}
          <button class="btn sm" data-a="photo">${icon('camera')}${photo ? 'Change photo' : 'Add your own photo'}</button>${photo ? `<button class="btn sm ghost" data-a="photoDel">Remove photo</button>` : ''}</div>
        <div class="exd-tags"><span class="pill">${esc(MUSCLES[ex.m])}</span>${ex.sec.map(m => `<span class="pill quiet">${esc(MUSCLES[m])}</span>`).join('')}<span class="pill quiet">${esc(EQUIP[ex.eq])}</span><span class="pill quiet">${esc(KINDS[k])}</span>
          <a class="btn sm ghost" href="${yt}" target="_blank" rel="noopener">${icon('external')}Watch how it’s done</a></div>
        ${hasArchived || resets.length || state.blocks.length > 1 ? `<div class="seg" role="group" aria-label="Time range"><button class="${st.range === 'block' ? 'on' : ''}" data-a="range" data-v="block">Since last reset</button><button class="${st.range === 'all' ? 'on' : ''}" data-a="range" data-v="all">All time</button></div>` : ''}
        <div class="tiles">${tiles.map(([l, v]) => `<div class="tile"><span>${l}</span><b>${esc(String(v))}</b></div>`).join('')}</div>
        <div class="card chart-card"><div class="chart-top"><h3>${esc(metrics.find(m => m[0] === st.metric)[1])}</h3>${metrics.length > 1 ? `<div class="seg sm">${metrics.map(([id, l]) => `<button class="${st.metric === id ? 'on' : ''}" data-a="metric" data-v="${id}">${esc(l)}</button>`).join('')}</div>` : ''}</div>
          ${chartSlot({ type: 'line', points: pts, marks, h: 220, fmt: v => fmtMetric(st.metric, v, k), tick: v => st.metric === 'sec' ? fmtClock(v) : st.metric === 'dist' ? dispDist(v, k) : compact(U() === 'lb' && st.metric !== 'reps' ? v * KG_LB : v), aria: `${ex.name} progress`, empty: st.range === 'block' && hasArchived ? 'Nothing since your last reset yet. Switch to All time to see earlier sessions.' : 'Log this exercise to see your progress here.' })}
          ${st.range === 'all' && hasArchived ? '<p class="muted small">Faded points are from before a reset.</p>' : ''}</div>
        ${k === 'wr' && Object.keys(rec.repMax).length ? `<h3 class="sub-h">Best weight for each rep count</h3><div class="repmax">${Array.from({ length: 12 }, (_, i) => i + 1).filter(r => rec.repMax[r]).map(r => `<div><span>${r} rep${r > 1 ? 's' : ''}</span><b>${esc(fmtW(rec.repMax[r]))}</b></div>`).join('')}</div>` : ''}
        <h3 class="sub-h">Settings for this exercise</h3>
        <div class="card list-card">
          <div class="set-item"><div><b>Rest timer</b><p class="muted">Used when you add it to a workout.</p></div><button class="btn sm" data-a="rest">${fmtRest(prefs.rest || state.settings.rest)}</button></div>
          ${hasReps(k) ? `<div class="set-item"><div><b>One side at a time</b><p class="muted">Log left and right reps separately.</p></div>${toggle(prefs.uni ?? ex.uni, 'uni')}</div>` : ''}
          <div class="set-item"><div><b>Notes</b><p class="muted">${esc(prefs.note || 'Seat height, grip, cues…')}</p></div><button class="btn sm" data-a="note">${prefs.note ? 'Edit' : 'Add'}</button></div>
        </div>
        <h3 class="sub-h">${icon('reset')}Progression</h3>
        <div class="card pad reset-card">
          <p>${base > 0 ? `Records and charts count from <b>${esc(fmtDateY(base))}</b>.` : 'Records and charts count from your first session.'} Resetting starts them fresh from today. Every set you’ve logged stays in History and under All time.</p>
          <div class="row-btns left"><button class="btn" data-a="reset">${icon('reset')}Reset this exercise</button>${resets.length ? `<button class="btn ghost" data-a="undoReset">${icon('undo')}Undo last reset</button>` : ''}</div>
          ${resets.length ? `<p class="muted small">Earlier resets: ${resets.map(r => esc(fmtDateY(r))).join(', ')}</p>` : ''}
        </div>
        <h3 class="sub-h">History</h3>
        ${sessions.length ? `<div class="exd-hist">${sessions.slice(0, 40).map(({ w, xs }) => `<button class="exd-sess ${w.start < base ? 'archived' : ''}" data-a="openWorkout" data-id="${w.id}"><span class="exd-date"><b>${esc(fmtShort(w.start))}</b><small>${esc(w.name)}</small></span><span class="exd-sets">${xs.map(x => x.sets.filter(s => s.done).map(s => `<span class="${s.t === 'W' ? 'warm' : ''}">${s.side || s.t !== 'N' ? `<i class="${s.side ? 'side-' + s.side : 't-' + s.t}">${esc((s.t === 'N' ? '' : SET_TYPES[s.t].short) + (s.side || ''))}</i>` : ''}${esc(fmtSet(x, s, k))}</span>`).join('')).join('')}</span></button>`).join('')}</div>` : `<p class="muted">You haven’t logged this one yet.</p>`}
        ${ex.custom ? `<button class="btn wide danger ghost" data-a="delCustom">${icon('trash')}Delete exercise</button>` : ''}
      </div>`;
    },
    actions: {
      range: (b, def) => { st.range = b.dataset.v; refreshSheet(def); },
      photo: () => pickPhoto(exId),
      photoDel: (b, def) => { storePhoto(exId, null); refreshAll(); toast('Photo removed.'); },
      metric: (b, def) => { st.metric = b.dataset.v; refreshSheet(def); },
      rest: (b, def) => restChooser({ title: 'Rest timer', current: (state.exPrefs[exId] || {}).rest || state.settings.rest, onPick: v => { (state.exPrefs[exId] = state.exPrefs[exId] || {}).rest = v; save(); refreshSheet(def); } }),
      uni: (b, def) => { const p = state.exPrefs[exId] = state.exPrefs[exId] || {}; p.uni = !(p.uni ?? getEx(exId).uni); save(); refreshSheet(def); },
      note: (b, def) => inputSheet({ title: 'Exercise notes', label: getEx(exId).name, value: (state.exPrefs[exId] || {}).note || '', multiline: true, onOk: v => { (state.exPrefs[exId] = state.exPrefs[exId] || {}).note = v; save(); refreshSheet(def); } }),
      reset: (b, def) => confirmSheet({
        title: `Reset ${getEx(exId).name}?`,
        text: 'Records, charts and “try more weight” tips for this exercise start fresh from today. Nothing is deleted: earlier sessions stay in History and in the All time view, and you can undo this.',
        ok: 'Reset exercise', onOk: () => { (state.exResets[exId] = state.exResets[exId] || []).push(Date.now()); save(); refreshSheet(def); render(); toast('Reset. Earlier sessions are kept.'); }
      }),
      undoReset: (b, def) => { const r = state.exResets[exId]; if (r && r.length) { r.pop(); if (!r.length) delete state.exResets[exId]; } save(); refreshSheet(def); render(); toast('Last reset undone.'); },
      editCustom: (b, def) => customExerciseSheet(exId, null, () => refreshSheet(def)),
      delCustom: (b, def) => {
        const n = state.workouts.filter(w => w.ex.some(x => x.exId === exId)).length + state.templates.filter(t => t.ex.some(x => x.exId === exId)).length;
        confirmSheet({ title: `Delete ${getEx(exId).name}?`, text: n ? 'It’s used in your history or templates, so it’s hidden from the list but kept there.' : 'This can’t be undone.', ok: 'Delete', danger: true,
          onOk: () => { const c = customMap.get(exId); if (n) c.hidden = true; else state.custom = state.custom.filter(x => x.id !== exId); rebuildCustom(); save(); closeSheet(def); render(); } });
      }
    }
  });
}

/* ============================== Progress tab ============================== */

VIEWS.progress = function () {
  const b = curBlock(), [from] = blockRange(b);
  const inBlock = workoutsIn(from, Infinity);
  const wk = weekStart(Date.now());
  const thisWeek = workoutsIn(wk, Infinity);
  const weeks = Array.from({ length: 12 }, (_, i) => weekStart(wk - (11 - i) * 7 * DAY));
  const vol = weeks.map(s => ({ s, ws: workoutsIn(s, s + 7 * DAY) }));
  const archived = state.blocks.slice(0, -1).reverse();
  let h = `<header class="page-h"><div><p class="eyebrow">${state.workouts.length} sessions all time</p><h1>Progress</h1></div></header>`;
  h += weekCard();
  h += `<section class="card block-card"><div class="block-top"><div><p class="eyebrow accent">Current block</p><h2><button class="link-h" data-a="blockRename">${esc(b.name)}${icon('edit')}</button></h2>
      <p class="muted">${b.start ? `Since ${esc(fmtDateY(b.start))} · ` : ''}${inBlock.length} session${inBlock.length === 1 ? '' : 's'} · ${fmtVol(sum(inBlock, workoutVolume))} lifted</p></div>
      <div class="block-btns"><button class="btn" data-a="blockReset">${icon('reset')}Reset progression</button>${archived.length ? `<button class="btn ghost" data-a="blockUndo">${icon('undo')}Undo reset</button>` : ''}</div></div>
    <p class="small muted">Starting a new block gives you fresh records and charts, for a new program, after a break or after an injury. Everything from earlier blocks stays saved below and in History.</p></section>`;
  h += `<div class="tiles four">
    <div class="tile"><span>This week</span><b>${thisWeek.length}</b><small>session${thisWeek.length === 1 ? '' : 's'}</small></div>
    <div class="tile"><span>Week streak</span><b>${streakWeeks()}</b><small>weeks in a row</small></div>
    <div class="tile"><span>Sets this week</span><b>${trimNum(sum(thisWeek, workingSets), 1)}</b><small>working sets</small></div>
    <div class="tile"><span>Block volume</span><b>${esc(fmtVol(sum(inBlock, workoutVolume)).replace(' ' + U(), ''))}</b><small>${U()} lifted</small></div></div>`;
  h += `<section class="card chart-card"><div class="chart-top"><h3>Weekly volume</h3><span class="muted small">last 12 weeks, ${U()}</span></div>
    ${chartSlot({ type: 'bars', h: 200, bars: vol.map(v => ({ v: (U() === 'lb' ? KG_LB : 1) * sum(v.ws, workoutVolume), label: fmtShort(v.s), tip: `Week of ${fmtShort(v.s)} · ${v.ws.length} session${v.ws.length === 1 ? '' : 's'}` })), fmt: v => compact(v) + ' ' + U(), aria: 'Weekly volume, last 12 weeks', empty: 'Finish a workout to start this chart.' })}</section>`;
  const ms = muscleSets(workoutsIn(Date.now() - 7 * DAY, Infinity));
  const maxM = Math.max(22, ...ms.map(m => m[1]));
  h += `<section class="card chart-card"><div class="chart-top"><h3>Sets per muscle</h3><span class="muted small">last 7 days</span></div>
    ${ms.length ? `<div class="mbars">${ms.map(([m, c]) => `<div class="mbar"><span class="mbar-l">${esc(MUSCLES[m])}</span><span class="mbar-t"><span class="band" style="left:${10 / maxM * 100}%;width:${10 / maxM * 100}%"></span><span class="fill" style="width:${c / maxM * 100}%"></span></span><span class="mbar-v">${trimNum(c, 1)}</span></div>`).join('')}</div>
    <p class="muted small">Shaded band: 10 to 20 sets a week, a common range for growth. Sets for helper muscles count as half.</p>` : `<p class="chart-empty">No sets in the last 7 days.</p>`}</section>`;
  h += liftsSection(from, Infinity, 'Your lifts this block');
  const prs = [];
  for (const w of inBlock.slice().reverse()) for (const p of w.prs || []) if (prs.length < 12) prs.push({ w, p });
  if (prs.length) h += `<section class="section"><h2 class="section-h">Recent records</h2><div class="card list-card">${prs.map(({ w, p }) => `<button class="pr-item" data-a="openEx" data-id="${p.exId}">${icon('trophy')}<span><b>${esc(getEx(p.exId).name)}</b><small>${esc(p.kind)} · ${esc(fmtShort(w.start))}</small></span><span class="num">${esc(fmtSet({ uni: p.uni, exId: p.exId }, p.set))}</span></button>`).join('')}</div></section>`;
  if (archived.length) h += `<section class="section"><h2 class="section-h">Earlier blocks</h2><p class="muted section-sub">Saved progress from before each reset.</p><div class="tpl-grid">${archived.map(bk => {
    const [f, t] = blockRange(bk), ws = workoutsIn(f, t);
    return `<button class="tpl-card block-old" data-a="openBlock" data-id="${bk.id}"><span class="tpl-main"><b>${esc(bk.name)}</b><span class="muted">${bk.start ? esc(fmtShort(bk.start)) : 'Start'} – ${esc(fmtShort(t))}</span><span class="tpl-ex">${ws.length} sessions · ${esc(fmtVol(sum(ws, workoutVolume)))}</span></span>${icon('right', 'chev')}</button>`;
  }).join('')}</div></section>`;
  return h;
};
function weekLines() {
  const ws = workoutsIn(weekStart(Date.now()), Infinity);
  const vol = sum(ws, workoutVolume), min = Math.round(sum(ws, w => (w.end || w.start) - w.start) / 60000), streak = streakWeeks();
  const num = v => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return [
    `total_workouts: ${ws.length}`,
    `total_volume: ${num(U() === 'lb' ? vol * KG_LB : vol)} ${U()}`,
    `total_duration: ${min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`}`,
    `streak: ${streak} week${streak === 1 ? '' : 's'}`,
    `status: ${ws.length >= 3 ? 'beast_mode' : ws.length ? 'grind_mode_active' : 'recovery_mode'}`
  ];
}
function weekCard() {
  const rule = '-'.repeat(28);
  return `<section class="term" aria-label="This week"><div class="term-h"><span>LIFTING-SANITY v1.1</span><button class="term-btn" data-a="shareWeek">${icon('share')}Share</button></div>
    <pre>${rule}\n$ cat weekly_stats.log\n${rule}\n${weekLines().map(l => '> ' + esc(l)).join('\n')}\n${rule}\n$ <span class="cur">_</span></pre></section>`;
}
function liftsSection(from, to, title) {
  const ws = workoutsIn(from, to);
  const count = {};
  for (const w of ws) for (const x of w.ex) if (x.sets.some(s => s.done)) count[x.exId] = (count[x.exId] || 0) + 1;
  const ids = Object.keys(count).sort((a, b) => count[b] - count[a]).slice(0, 10);
  if (!ids.length) return `<section class="section"><h2 class="section-h">${esc(title)}</h2><p class="muted">Lifts you train show up here with their trend.</p></section>`;
  return `<section class="section"><h2 class="section-h">${esc(title)}</h2><div class="card list-card">${ids.map(id => {
    const ex = getEx(id), m = metricsFor(ex.k)[0][0];
    const pts = exSeries(id, m, Math.max(from, baseline(id)), to);
    const ptsAll = pts.length ? pts : exSeries(id, m, from, to);
    const first = ptsAll[0], last = ptsAll[ptsAll.length - 1];
    const best = ptsAll.length ? Math.max(...ptsAll.map(p => p.y)) : 0;
    const diff = first && last ? last.y - first.y : 0;
    const dtxt = ptsAll.length > 1 && Math.abs(diff) > 1e-6 ? `${diff > 0 ? '+' : '−'}${fmtMetric(m, Math.abs(diff), ex.k)}` : '';
    return `<button class="lift" data-a="openEx" data-id="${id}"><span class="lift-n"><b>${esc(ex.name)}</b><small>${count[id]} session${count[id] === 1 ? '' : 's'} · ${esc(metricsFor(ex.k)[0][1])}</small></span>${sparkline(ptsAll.map(p => p.y))}<span class="lift-v"><b>${esc(best ? fmtMetric(m, best, ex.k) : '—')}</b>${dtxt ? `<small class="${diff > 0 ? 'up' : 'down'}">${esc(dtxt)}</small>` : ''}</span></button>`;
  }).join('')}</div></section>`;
}
function blockResetSheet() {
  const n = state.blocks.length + 1;
  openSheet({
    cls: 'small', focus: '#blkName',
    render: () => `<div class="sheet-body pad confirm"><h2>Start a new block?</h2>
      <p>Records, charts, “try more weight” tips and progress all start fresh from today.</p>
      <p><b>Nothing is deleted.</b> ${esc(curBlock().name)} is saved under Earlier blocks, every workout stays in History, and the All time view still shows it. You can undo this.</p>
      <label class="field"><span>Name for the new block</span><input id="blkName" value="Block ${n}" autocomplete="off"></label>
      <div class="row-btns"><button class="btn" data-a="sheetClose">Cancel</button><button class="btn primary" data-a="ok">${icon('reset')}Start new block</button></div></div>`,
    actions: {
      ok: (b, def) => {
        const name = $('#blkName', def.el).value.trim() || `Block ${n}`;
        state.blocks.push({ id: uid(), name, start: Date.now() });
        save(true); closeSheet(def); render();
        toast(`${name} started. Earlier progress is saved.`, { label: 'Undo', fn: () => { state.blocks.pop(); save(); render(); } });
      }
    }
  });
}
function blockSheet(id) {
  const b = state.blocks.find(x => x.id === id);
  if (!b) return;
  const [f, t] = blockRange(b), ws = workoutsIn(f, t);
  openSheet({
    full: true,
    render: () => `${sheetHead(esc(b.name))}<div class="sheet-body pad">
      <p class="eyebrow">${b.start ? esc(fmtDateY(b.start)) : 'From the start'} – ${esc(fmtDateY(t))} · saved block</p>
      <div class="tiles"><div class="tile"><span>Sessions</span><b>${ws.length}</b></div><div class="tile"><span>Working sets</span><b>${sum(ws, workingSets)}</b></div><div class="tile"><span>Volume</span><b>${fmtVol(sum(ws, workoutVolume))}</b></div><div class="tile"><span>Records</span><b>${sum(ws, w => (w.prs || []).length)}</b></div></div>
      ${liftsSection(f, t, 'Lifts in this block')}
      <h3 class="sub-h">Sessions</h3><div class="hist-list">${ws.slice().reverse().map(histCard).join('') || '<p class="muted">No sessions in this block.</p>'}</div>
    </div>`
  });
}

/* ============================== Settings tab ============================== */

VIEWS.settings = function () {
  const s = state.settings;
  const seg = (action, cur, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button class="${String(cur) === String(v) ? 'on' : ''}" data-a="${action}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${esc(l)}</button>`).join('')}</div>`;
  const row = (title, desc, ctl) => `<div class="set-item"><div><b>${title}</b>${desc ? `<p class="muted">${desc}</p>` : ''}</div>${ctl}</div>`;
  const demo = state.workouts.some(w => w.demo);
  return `<header class="page-h"><div><p class="eyebrow">Saved on this device</p><h1>Settings</h1></div></header>
  <h2 class="section-h">Logging</h2><div class="card list-card">
    ${row('Units', 'Weights you already logged convert automatically.', seg('setUnit', s.unit, [['kg', 'kg'], ['lb', 'lb']]))}
    ${row('Effort', 'RIR: reps left in the tank. RPE: how hard, out of 10.', seg('setEffort', s.effort, [['rir', 'RIR'], ['rpe', 'RPE'], ['off', 'Off']]))}
    ${row('Weight step', `Used for warm-ups and “try more weight” tips.`, `<label class="select-wrap sm"><select data-f="step">${(s.unit === 'lb' ? [1, 2.5, 5, 10] : [0.5, 1, 1.25, 2, 2.5, 5]).map(v => `<option value="${v}" ${+s.step === v ? 'selected' : ''}>${v} ${s.unit}</option>`).join('')}</select></label>`)}
    ${row('Bar weight', 'For the plate calculator and warm-ups.', `<label class="select-wrap sm"><select data-f="bar">${(s.unit === 'lb' ? [15, 25, 35, 45, 55] : [7, 10, 15, 20, 25]).map(v => `<option value="${v}" ${+s.bar === v ? 'selected' : ''}>${v} ${s.unit}</option>`).join('')}</select></label>`)}
  </div>
  <h2 class="section-h">During a workout</h2><div class="card list-card">
    ${row('Layout', 'One exercise at a time with big next and previous buttons, or every exercise in one list.', seg('setView', s.view, [['focus', 'One at a time'], ['list', 'List']]))}
    ${row('Number pad', 'Auto uses the in-app pad on iPhone, with Next, + / − and Log keys, and the normal keyboard on iPad.', seg('setKeypad', s.keypad, [['auto', 'Auto'], ['app', 'In-app pad'], ['system', 'Keyboard']]))}
    ${row('Default rest', 'Each exercise can have its own.', `<label class="select-wrap sm"><select data-f="rest">${REST_PRESETS.map(v => `<option value="${v}" ${v === s.rest ? 'selected' : ''}>${fmtRest(v)}</option>`).join('')}</select></label>`)}
    ${row('Start rest timer when a set is checked', '', toggle(s.autoRest, 'tgl', 'data-k="autoRest"'))}
    ${row('Move to the next exercise when one is done', 'In one-at-a-time layout.', toggle(s.autoNext, 'tgl', 'data-k="autoNext"'))}
    ${row('Sound when rest is over', '<button class="link" data-a="testSound">Play it</button>', toggle(s.sound, 'tgl', 'data-k="sound"'))}
    ${row('Keep the screen awake', 'While a workout is open.', toggle(s.wake, 'tgl', 'data-k="wake"'))}
  </div>
  <h2 class="section-h">Look</h2><div class="card list-card">
    ${row('Theme', '', seg('setTheme', s.theme, [['auto', 'Auto'], ['dark', 'Dark'], ['light', 'Light']]))}
  </div>
  <h2 class="section-h">Your data</h2><div class="card list-card">
    ${row('Back up', 'Save everything to a file in Files or iCloud Drive. Do this now and then.', `<div class="btn-pair"><button class="btn sm" data-a="exportFile">${icon('download')}Save file</button><button class="btn sm ghost" data-a="exportCopy">${icon('copy')}Copy</button></div>`)}
    ${row('Restore', 'Load a backup file. Replaces what’s on this device.', `<div class="btn-pair"><label class="btn sm">${icon('upload')}Choose file<input type="file" accept=".json,application/json" data-f="importFile" hidden></label><button class="btn sm ghost" data-a="importPaste">Paste</button></div>`)}
    ${row('Sample history', demo ? 'Sample workouts are mixed into your history.' : 'Load 8 weeks of example workouts to see what the charts look like.', demo ? `<button class="btn sm" data-a="demoOff">Remove samples</button>` : `<button class="btn sm" data-a="demoOn">Load samples</button>`)}
    ${row('Erase everything', 'Deletes all workouts, templates and settings on this device.', `<button class="btn sm danger" data-a="eraseAll">Erase</button>`)}
  </div>
  <h2 class="section-h">Install on iPad</h2><div class="card pad prose">
    <ol><li>Open Lifting Sanity in <b>Safari</b>.</li><li>Tap the <b>Share</b> button, then <b>Add to Home Screen</b>.</li><li>Open it from your Home Screen. It runs full screen and works without internet.</li></ol>
    <p class="muted small">Your workouts are stored on this device only. Safari can clear storage for websites you haven’t opened in a while, and the Home Screen app is protected from that. Back up now and then anyway.</p>
  </div>
  <p class="muted small center">Lifting Sanity 1.1 · ${LIB.length} exercises · ${storageOK ? 'saving to this device' : 'storage blocked'}</p>`;
};
function exportData() {
  return JSON.stringify({ app: 'liftingsanity', version: 1, exported: Date.now(), data: { ...state, rest: null }, photos: Object.fromEntries(photos) });
}
async function exportFile() {
  const name = `lifting-sanity-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([exportData()], { type: 'application/json' });
  // inside claude.ai the page can't download on its own, so the viewer saves through the host
  const host = window.claude && window.claude.use ? await window.claude.use('downloads').catch(() => null) : null;
  if (host) {
    try { await host.save({ filename: name, data: blob }); toast('Backup saved.'); }
    catch (e) { if (!e || e.code !== 'declined') toast('Saving isn’t available here. Use Copy instead.'); }
    return;
  }
  try {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Lifting Sanity backup' }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('Backup saved.');
}
function importText(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { toast('That isn’t a Lifting Sanity backup. The text isn’t valid JSON.'); return; }
  const data = obj && obj.app === 'liftingsanity' ? obj.data : null;
  if (!data || !Array.isArray(data.workouts)) { toast('That file isn’t a Lifting Sanity backup.'); return; }
  confirmSheet({
    title: 'Restore this backup?',
    text: `It has <b>${data.workouts.length}</b> workouts and <b>${(data.templates || []).length}</b> templates${obj.exported ? `, saved ${esc(fmtDateY(obj.exported))}` : ''}. Everything on this device is replaced.`,
    ok: 'Restore', danger: true,
    onOk: () => {
      try { localStorage.setItem(KEY + ':before-restore', JSON.stringify(state)); } catch (e) { /* storage full */ }
      state = migrate(data);
      state.active = null;
      ensureSplits();
      if (obj.photos) for (const [id, url] of Object.entries(obj.photos)) if (typeof url === 'string' && url.startsWith('data:image/')) storePhoto(id, url);
      rebuildCustom(); applyTheme(); save(true); renderWorkout(); render();
      toast('Backup restored.');
    }
  });
}
function loadSamples() {
  const p = PROGRAMS.find(x => x.id === 'ppl');
  const base = {
    'barbell-bench-press': [60, 2.5], 'incline-dumbbell-press': [22, 1], 'seated-dumbbell-shoulder-press': [18, 1], 'cable-lateral-raise': [7.5, 0.5],
    'rope-pushdown': [20, 1.25], 'overhead-cable-triceps-extension': [15, 1], 'pull-up': [0, 0], 'barbell-row': [55, 2.5], 'seated-cable-row': [50, 2.5],
    'face-pull': [15, 1], 'barbell-curl': [25, 1.25], 'hammer-curl': [12, 0.5], 'back-squat': [80, 2.5], 'romanian-deadlift': [70, 2.5],
    'leg-press': [140, 5], 'lying-leg-curl': [35, 1.25], 'leg-extension': [45, 1.25], 'standing-calf-raise': [60, 2.5]
  };
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const days = p.days.map(([n, text]) => programDay(n, text, p.name));
  const start0 = dayStart(Date.now()) - 56 * DAY;
  let k = 0;
  for (let d = 0; d < 56; d++) {
    if (![0, 2, 4].includes(d % 7)) continue;
    const t = days[k % 3], cycle = Math.floor(k / 3);
    k++;
    const st = start0 + d * DAY + (17 + rnd() * 2) * 3600e3;
    const w = { id: uid(), name: t.name, start: st, end: st + (52 + rnd() * 20) * 60000, tplId: null, splitId: null, day: null, note: '', demo: true, ex: [] };
    for (const tx of t.ex) {
      const [b0, inc] = base[tx.exId] || [20, 1];
      const top = b0 + inc * Math.floor(cycle * 0.85);
      const x = { id: uid(), exId: tx.exId, rest: tx.rest, uni: getEx(tx.exId).uni, ss: null, note: '', sets: [] };
      const [lo, hi] = (tx.sets.find(s => s.t !== 'W') || { tr: '8-12' }).tr.split('-').map(Number);
      tx.sets.forEach((s, j) => {
        const set = { id: uid(), t: s.t, done: true };
        const reps = s.t === 'W' ? 8 - j * 2 : Math.round(lo + rnd() * ((hi || lo) - lo));
        if (getEx(tx.exId).k === 'bw') set.r = Math.round(6 + cycle * 0.6 + rnd() * 2);
        else {
          set.w = s.t === 'W' ? Math.round(top * (0.45 + j * 0.2) / 2.5) * 2.5 : s.t === 'D' ? Math.round(top * 0.7 / 1.25) * 1.25 : top;
          set.r = reps;
        }
        if (s.t !== 'W') set.rir = Math.round(rnd() * 3);
        if (x.uni) {
          const pr = uid(), other = { ...set, id: uid(), side: 'R', pair: pr };
          if (other.r) other.r = Math.max(1, other.r - (rnd() < 0.3 ? 1 : 0));
          x.sets.push({ ...set, side: 'L', pair: pr }, other);
        } else x.sets.push(set);
      });
      w.ex.push(x);
    }
    state.workouts.push(w);
  }
  state.workouts.sort((a, b) => a.start - b.start);
  for (const w of state.workouts) if (w.demo) w.prs = workoutPRs(w);
  save(true); render();
  toast('Loaded 24 sample workouts. Remove them any time in Settings.');
}

/* ============================== Actions ============================== */

const ACT = {
  tab: b => go(b.dataset.tab),
  toastAct: () => { const a = toast.action; $('#toast').classList.remove('in'); if (a) a.fn(); },
  resume: () => { ui.woHidden = false; renderWorkout(); wake(true); },
  dismissInstall: () => { state.settings.installHint = false; save(); render(); },
  startEmpty: () => startEmpty(),
  startDay: b => startFromTemplate(splitById(b.dataset.split).days[+b.dataset.day], b.dataset.split, +b.dataset.day),
  dayPreview: b => tplPreviewSheet(splitById(b.dataset.split).days[+b.dataset.day], b.dataset.split, +b.dataset.day),
  tplPreview: b => tplPreviewSheet(b.dataset.id),
  tplStart: b => startFromTemplate(b.dataset.id),
  tplMenu: b => tplMenu(b.dataset.id),
  newTpl: () => templateEditor(null),
  splitSwitch: () => splitSwitcher(),
  splitEdit: b => splitEditor(b.dataset.id),
  useProgram: b => {
    const p = PROGRAMS.find(x => x.id === b.dataset.id);
    const inst = state.splits.find(s => s.programId === p.id);
    if (inst) state.activeSplit = inst.id; else installProgram(p, true);
    save(); render(); window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(`${p.name} is now your split.`);
  },
  // workout
  woMin: () => { ui.woHidden = true; renderWorkout(); render(); },
  woRename: () => renameWorkout(),
  woMenu: () => woMenu(),
  woFinish: () => finishPrompt(),
  woGo: b => woGo(+b.dataset.i),
  woPrev: () => woGo(A().cur - 1, true),
  woNext: () => { const w = A(); const n = nextExIndex(w, w.cur); woGo(n == null ? w.cur + 1 : n, true); },
  woAddEx: () => addExercisesToWorkout(),
  woRest: () => restChooser({ title: 'Start a rest timer', current: state.rest ? state.rest.total : null, onPick: v => startRest(v) }),
  exMenu: b => exMenu(+b.dataset.e),
  exInfo: b => exerciseSheet(A().ex[+b.dataset.e].exId),
  exNote: b => exNote(+b.dataset.e),
  exRest: b => {
    const x = A().ex[+b.dataset.e];
    restChooser({ title: `Rest · ${getEx(x.exId).name}`, current: x.rest || state.settings.rest, onPick: v => {
      x.rest = v; (state.exPrefs[x.exId] = state.exPrefs[x.exId] || {}).rest = v;
      if (state.rest && !state.rest.alerted) startRest(v, state.rest.next);
      save(); renderWorkout();
    } });
  },
  exUni: b => {
    const x = A().ex[+b.dataset.e];
    setUni(x, !x.uni);
    (state.exPrefs[x.exId] = state.exPrefs[x.exId] || {}).uni = x.uni;
    save(); renderWorkout();
  },
  addSet: b => addSet(+b.dataset.e),
  addWarm: b => addWarmups(+b.dataset.e),
  plates: b => { const x = A().ex[+b.dataset.e]; const s = x.sets.find(o => !o.done && o.t !== 'W'); plateSheet(s && s.w != null ? s.w : (x.sets.filter(o => o.w != null).pop() || {}).w); },
  setType: b => setTypeSheet(+b.dataset.e, +b.dataset.s),
  toggleSet: b => toggleSet(+b.dataset.e, +b.dataset.s),
  usePrev: b => {
    const w = A(), i = +b.dataset.e, j = +b.dataset.s, x = w.ex[i];
    const p = exCtx(w, x).prevSets[j];
    if (!p) return;
    const s = x.sets[j];
    for (const f of ['w', 'r', 'sec', 'dist']) { if (p[f] != null) s[f] = p[f]; }
    save(); renderWorkout();
  },
  effort: b => { const key = `${b.dataset.e}:${b.dataset.s}`; ui.effOpen = ui.effOpen === key ? null : key; ui.kp = null; renderWorkout(); },
  kp: b => { ui.kp = { e: +b.dataset.e, s: +b.dataset.s, f: b.dataset.f, buf: null, fresh: true }; ui.effOpen = null; $$('#workout .eff-pick').forEach(n => n.remove()); renderKeypad(); markKpCell(true); },
  kpKey: b => {
    if (!kpField()) return;
    const ch = b.dataset.k;
    let buf = ui.kp.fresh ? '' : (ui.kp.buf ?? kpCurrent());
    ui.kp.fresh = false;
    if (ch === '.' && buf.includes('.')) return;
    if (ch === '.' && !buf) buf = '0';
    if (ch === ':' && (!buf || buf.split(':').length > 2)) return;
    if (buf.length >= 8) return;
    kpSet(buf + ch);
  },
  kpBack: () => {
    if (!kpField()) return;
    const buf = ui.kp.fresh ? '' : (ui.kp.buf ?? kpCurrent()).slice(0, -1);
    ui.kp.fresh = false;
    kpSet(buf);
  },
  kpStep: b => {
    const fld = kpField();
    if (!fld) return;
    const d = +b.dataset.d, f = ui.kp.f, k = fld.k;
    const cur = fld.set[f] ?? placeholder(fld.x, ui.kp.s, exCtx(fld.w, fld.x))[f] ?? 0;
    let buf;
    if (f === 'w') buf = trimNum(Math.max(0, (+dispW(cur) || 0) + d * state.settings.step));
    else if (f === 'sec') buf = fmtClock(Math.max(0, cur + d * 15));
    else if (f === 'dist') buf = trimNum(Math.max(0, (+dispDist(cur, k) || 0) + d * (k === 'wdist' ? 5 : 0.1)));
    else buf = String(Math.max(0, Math.round(cur) + d));
    kpSet(buf);
    ui.kp.fresh = true;
  },
  kpNext: () => {
    const fld = kpField();
    if (!fld) { kpClose(); return; }
    const fields = rowFields(fld.x, fld.k), n = fields.indexOf(ui.kp.f);
    kpShow(kpCurrent());
    if (n < fields.length - 1) ui.kp.f = fields[n + 1];
    else if (ui.kp.s < fld.x.sets.length - 1) { ui.kp.s++; ui.kp.f = fields[0]; }
    else { kpClose(); return; }
    ui.kp.fresh = true; ui.kp.buf = null;
    renderKeypad(); markKpCell(true);
  },
  kpLog: () => {
    const fld = kpField();
    if (!fld) { kpClose(); return; }
    if (fld.set.done) { kpClose(); return; }
    toggleSet(ui.kp.e, ui.kp.s, true);
  },
  kpClose: () => kpClose(),
  effPick: b => { const s = A().ex[+b.dataset.e].sets[+b.dataset.s]; s.rir = b.dataset.v === '' ? null : +b.dataset.v; if (s.rir == null) delete s.rir; ui.effOpen = null; save(); renderWorkout(); },
  restAdj: b => { const r = state.rest; if (!r) return; r.end += +b.dataset.d * 1000; r.total = Math.max(r.total, Math.ceil((r.end - Date.now()) / 1000)); if (r.end > Date.now()) { r.alerted = false; $('#restbar').classList.remove('over'); const l = $('.rb-label', $('#restbar')); if (l) l.textContent = 'Rest'; } save(); tickRest(); },
  restSkip: () => { state.rest = null; save(); renderRest(); },
  restPresets: () => restChooser({ title: 'Rest length', current: state.rest ? state.rest.total : null, onPick: v => startRest(v, state.rest ? state.rest.next : '') }),
  // history
  histMonth: b => { const d = new Date(ui.hist.month); d.setMonth(d.getMonth() + +b.dataset.d); ui.hist.month = d.getTime(); render(); },
  histDay: b => { const v = b.dataset.v; ui.hist.day = v ? (ui.hist.day === +v ? null : +v) : null; render(); },
  openWorkout: b => workoutSheet(b.dataset.id),
  logPast: () => logPastWorkout(),
  // library
  libG: b => { ui.lib.g = b.dataset.v; ui.lib.m = 'all'; render(); },
  libM: b => { ui.lib.m = b.dataset.v; render(); },
  libNew: () => customExerciseSheet(null, ui.lib.q, id => exerciseSheet(id)),
  openEx: b => exerciseSheet(b.dataset.id),
  // progress
  blockReset: () => blockResetSheet(),
  shareWeek: async () => {
    const text = ['LIFTING-SANITY', '$ cat weekly_stats.log', ...weekLines().map(l => '> ' + l)].join('\n');
    try { if (navigator.share && !inFrame) { await navigator.share({ text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast('Copied your week. Paste it anywhere.'), () => showCopyBox(text));
    else showCopyBox(text);
  },
  blockUndo: () => {
    const b = curBlock();
    confirmSheet({ title: `Undo ${b.name}?`, text: `${esc(b.name)} merges back into ${esc(state.blocks[state.blocks.length - 2].name)}. No workouts are changed.`, ok: 'Undo reset',
      onOk: () => { state.blocks.pop(); save(); render(); } });
  },
  blockRename: () => { const b = curBlock(); inputSheet({ title: 'Rename block', label: 'Name', value: b.name, onOk: v => { if (v) { b.name = v; save(); render(); } } }); },
  openBlock: b => blockSheet(b.dataset.id),
  // settings
  setUnit: b => {
    const s = state.settings, to = b.dataset.v;
    if (s.unit === to) return;
    s.unit = to;
    s.bar = to === 'lb' ? 45 : 20;
    s.step = to === 'lb' ? 5 : 2.5;
    save(); render();
  },
  setEffort: b => { state.settings.effort = b.dataset.v; save(); render(); },
  setView: b => { state.settings.view = b.dataset.v; save(); render(); },
  setKeypad: b => { state.settings.keypad = b.dataset.v; save(); render(); },
  setTheme: b => { state.settings.theme = b.dataset.v; applyTheme(); save(); render(); },
  tgl: b => { const k = b.dataset.k; state.settings[k] = !state.settings[k]; save(); render(); if (k === 'wake') wake(state.settings.wake); },
  testSound: () => { unlockAudio(); const s = state.settings.sound; state.settings.sound = true; beep(); state.settings.sound = s; },
  exportFile: () => exportFile(),
  exportCopy: () => {
    const text = exportData();
    const done = () => toast('Backup copied. Paste it into Notes or Files to keep it.');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => showCopyBox(text)); else showCopyBox(text);
  },
  importPaste: () => openSheet({
    cls: 'small', focus: '#pasteBox',
    render: () => `<div class="sheet-body pad confirm"><h2>Paste a backup</h2><label class="field"><span>Backup text</span><textarea id="pasteBox" rows="6" placeholder='{"app":"liftingsanity", …}'></textarea></label>
      <div class="row-btns"><button class="btn" data-a="sheetClose">Cancel</button><button class="btn primary" data-a="ok">Continue</button></div></div>`,
    actions: { ok: (b, def) => { const t = $('#pasteBox', def.el).value; closeSheet(def); importText(t); } }
  }),
  demoOn: () => loadSamples(),
  demoOff: () => { state.workouts = state.workouts.filter(w => !w.demo); save(true); render(); toast('Sample workouts removed.'); },
  eraseAll: () => confirmSheet({
    title: 'Erase everything?', text: 'All workouts, templates, splits and settings on this device are deleted. Type <b>ERASE</b> to confirm.',
    extra: `<label class="field"><span class="sr">Type ERASE</span><input id="eraseBox" autocomplete="off" autocapitalize="characters"></label>`,
    ok: 'Erase everything', danger: true,
    onOk: def => {
      if ($('#eraseBox', def.el).value.trim().toUpperCase() !== 'ERASE') { toast('Type ERASE to confirm.'); return false; }
      for (const id of [...photos.keys()]) storePhoto(id, null);
      state = defaults(); ensureSplits(); rebuildCustom(); applyTheme(); save(true); renderWorkout(); renderRest(); render();
      toast('Everything was erased.');
    }
  })
};
function showCopyBox(text) {
  openSheet({ cls: 'small', render: () => `<div class="sheet-body pad confirm"><h2>Copy your backup</h2><p class="muted">Select all of the text and copy it.</p><textarea id="copyBox" rows="8" readonly>${esc(text)}</textarea><div class="row-btns"><button class="btn primary" data-a="sheetClose">Done</button></div></div>`,
    focus: '#copyBox' });
  setTimeout(() => { const t = $('#copyBox'); if (t) t.select(); }, 300);
}

/* ============================== Events ============================== */

function sheetFor(el) { const w = el.closest('[data-sheet]'); return w ? sheets.find(s => s.id === w.dataset.sheet) : null; }

document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-a]');
  if (!t || t.disabled) return;
  const a = t.dataset.a;
  const def = sheetFor(t);
  if (def) {
    if (a === 'sheetClose') { closeSheet(def); return; }
    if (def.actions && def.actions[a]) { def.actions[a](t, def, ev); return; }
  }
  if (ACT[a]) ACT[a](t, ev);
});
document.addEventListener('pointerdown', unlockAudio, { passive: true });
document.addEventListener('input', ev => {
  const el = ev.target;
  if ((el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'file')) return;
  handleInput(el, ev);
});
document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'file') { handleInput(el, ev); return; }
  // tidy up times and distances once the field is left
  if (el.closest('#workout') && (el.dataset.f === 'sec' || el.dataset.f === 'dist')) {
    const x = A() && A().ex[+el.dataset.e], s = x && x.sets[+el.dataset.s];
    if (s && el.dataset.f === 'sec' && s.sec != null) el.value = fmtClock(s.sec);
    if (s && el.dataset.f === 'dist' && s.dist != null) el.value = dispDist(s.dist, getEx(x.exId).k);
  }
});
function handleInput(el, ev) {
  const def = sheetFor(el);
  if (def) { if (def.onInput) def.onInput(el, def, ev); return; }
  if (el.closest('#workout')) { woInput(el); return; }
  const f = el.dataset.f;
  if (f === 'libq') { ui.lib.q = el.value; $('#libList').innerHTML = libListHTML(); }
  else if (f === 'libeq') { ui.lib.eq = el.value; $('#libList').innerHTML = libListHTML(); }
  else if (f === 'rest' || f === 'bar' || f === 'step') { state.settings[f] = +el.value; save(); }
  else if (f === 'importFile') {
    const file = el.files && el.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => importText(String(r.result));
    r.readAsText(file);
    el.value = '';
  }
}
document.addEventListener('focusin', ev => {
  const el = ev.target;
  if (el.classList && el.classList.contains('cell') && el.tagName === 'INPUT' && !el.readOnly) setTimeout(() => { try { el.select(); } catch (e) { /* not selectable */ } }, 0);
});
document.addEventListener('keydown', ev => {
  const top = sheets[sheets.length - 1];
  if (ev.key === 'Escape' && top) { closeSheet(top); return; }
  if (top && top.onKey) top.onKey(ev, top);
  if (ev.key === 'Enter' && ev.target.classList && ev.target.classList.contains('cell') && ev.target.closest('#workout')) ev.target.blur();
});
// swipe left / right between exercises in one-at-a-time layout
let swipe = null;
document.addEventListener('touchstart', ev => {
  const m = ev.target.closest('.wo.focus .wo-main');
  if (!m || ev.touches.length !== 1 || ev.target.closest('input,textarea,.eff-pick,.chart')) { swipe = null; return; }
  swipe = { x: ev.touches[0].clientX, y: ev.touches[0].clientY, t: Date.now() };
}, { passive: true });
document.addEventListener('touchend', ev => {
  if (!swipe || !A()) return;
  const dx = ev.changedTouches[0].clientX - swipe.x, dy = ev.changedTouches[0].clientY - swipe.y;
  const fast = Date.now() - swipe.t < 600;
  swipe = null;
  if (!fast || Math.abs(dx) < 80 || Math.abs(dy) > 50) return;
  const w = A();
  if (dx < 0 && w.cur < w.ex.length - 1) woGo(w.cur + 1, true);
  if (dx > 0 && w.cur > 0) woGo(w.cur - 1, true);
}, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persist();
  else { wake(true); tickRest(); }
});
window.addEventListener('pagehide', persist);
window.addEventListener('storage', ev => { if (ev.key === KEY && ev.newValue) { try { state = migrate(JSON.parse(ev.newValue)); rebuildCustom(); renderWorkout(); render(); } catch (e) { /* ignore */ } } });
let resizeT;
let padMode = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    drawCharts(document);
    const m = useKeypad();
    if (padMode !== null && m !== padMode && A() && !ui.woHidden) { ui.kp = null; renderWorkout(); }
    padMode = m;
  }, 150);
});

setInterval(() => {
  const w = state.active;
  if (w && w.mode !== 'edit') for (const el of $$('[data-clock]')) el.textContent = fmtClock((Date.now() - w.start) / 1000);
}, 1000);
setInterval(tickRest, 250);

/* ============================== Start ============================== */

document.body.insertAdjacentHTML('afterbegin', FIG_SPRITE);
load();
rebuildCustom();
loadPhotos();
applyTheme();
render();
if (state.active) { ui.woHidden = false; renderWorkout(true); wake(true); }
renderRest();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol === 'https:' && !inFrame) navigator.serviceWorker.register('sw.js').catch(() => {});

window.LiftingSanity = { get state() { return state; }, save: () => save(true) };
})();
