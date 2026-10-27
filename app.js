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
// in Arabic, the names in these lists are shown translated (exercise names stay as they are)
for (const k in MUSCLES) MUSCLES[k] = T(MUSCLES[k]);
for (const g of GROUPS) g[1] = T(g[1]);
for (const k in EQUIP) EQUIP[k] = T(EQUIP[k]);
for (const k in KINDS) KINDS[k] = T(KINDS[k]);
for (const k in SET_TYPES) { SET_TYPES[k].label = T(SET_TYPES[k].label); SET_TYPES[k].desc = T(SET_TYPES[k].desc); }
// with Arabic terms, set letters are the first letter of the Arabic word (إحماء for a warm-up, فشل for failure…)
const AR_SHORT = { W: 'إ', T: 'ث', B: 'خ', D: 'ن', F: 'ف', A: 'ق', RP: 'ر', M: 'م', C: 'ع', P: 'ج', E: 'س' };
if (window.AR_TERMS) for (const k in AR_SHORT) SET_TYPES[k].short = AR_SHORT[k];

const slug = s => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const parseLib = text => text.trim().split('\n').map(line => {
  const [name, m, eq, k, sec, fl] = line.split('|').map(x => (x || '').trim());
  return { id: slug(name), name, m, eq, k, sec: sec ? sec.split(',') : [], uni: (fl || '').includes('u') };
});
const LIB = parseLib(window.FORGE_LIBRARY);
const LIB_MAP = new Map(LIB.map(e => [e.id, e]));
// the open exercises-dataset adds ~1,200 more; names already in the curated list keep the curated entry
for (const e of window.LS_EXTRA ? parseLib(window.LS_EXTRA) : []) if (!LIB_MAP.has(e.id)) { LIB.push(e); LIB_MAP.set(e.id, e); }
// with Arabic names chosen, each exercise shows its Arabic name; the English one stays on it (e.en) for search,
// the science notes and video links
if (window.AR_NAMES && window.LS_AR_NAMES) for (const e of LIB) { e.en = e.name; e.name = window.LS_AR_NAMES[e.id] || e.name; }
// how-to steps are big and only shown in exercise details: fetched (or read from the page) the first time they're wanted
let STEPS = null, stepsLoading = null;
function loadSteps() {
  if (STEPS) return Promise.resolve(STEPS);
  if (!stepsLoading) {
    const inline = document.getElementById('ls-steps');
    stepsLoading = (inline ? Promise.resolve().then(() => JSON.parse(inline.textContent)) : fetch('steps.json').then(r => r.json()))
      .then(d => (STEPS = d)).catch(() => { stepsLoading = null; return null; });
  }
  return stepsLoading;
}
const PROGRAMS = window.FORGE_PROGRAMS;
// the machine version's swaps, by exercise id: barbell and dumbbell lifts for machines that do the same job
const MACHINE_SWAPS = new Map(Object.entries(window.FORGE_MACHINE_SWAPS || {}).map(([k, v]) => [slug(k), v.map(slug).filter(id => LIB_MAP.has(id))]));
const lineEx = line => slug(line.split('|')[0].trim());
// names the app gives things (a plan's name, note and days, a new workout's or split's name) are saved in the language
// of the moment; these are their English originals, so a saved one can be shown in the language chosen now
const NAMED = new Set(['Morning workout', 'Afternoon workout', 'Evening workout', 'Logged workout', 'New template', 'Template', 'My split']);
for (const p of PROGRAMS) { NAMED.add(p.name); if (p.note) NAMED.add(p.note); for (const d of p.days) if (Array.isArray(d)) NAMED.add(d[0]); }
// any language's version of one of those names → its English original (a version two names share is left alone)
const NAME_KEY = new Map();
for (const k of NAMED) for (const v of new Set([k, (window.LS_AR || {})[k], (window.LS_AR_FULL || {})[k]])) if (typeof v === 'string') NAME_KEY.set(v, NAME_KEY.has(v) && NAME_KEY.get(v) !== k ? null : k);
const relabel = s => { const k = typeof s === 'string' ? NAME_KEY.get(s) : null; return k ? T(k) : s; };
// ready-made plans in the chosen language: their names, notes and day names (the exercises keep their names)
for (const p of PROGRAMS) {
  p.name = T(p.name); p.about = T(p.about); p.freq = T(p.freq);
  for (const k of ['note', 'short', 'why']) if (p[k]) p[k] = T(p[k]);
  for (const d of p.days) if (Array.isArray(d)) d[0] = T(d[0]);
  // a machine version when the plan has lifts to swap (not the plan for home)
  p.machine = p.kit !== 'home' && p.days.some(d => Array.isArray(d) && typeof d[1] === 'string' && d[1].trim().split('\n').some(l => MACHINE_SWAPS.has(lineEx(l))));
}

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
// units, effort scales and side letters as shown: in Arabic when Arabic terms are chosen; what's saved never changes
const TERMS = { kg: 'كغ', lb: 'رطل', km: 'كم', mi: 'ميل', m: 'م', yd: 'ياردة', RIR: 'احتياط', RPE: 'الجهد', L: 'يس', R: 'يم', k: ' ألف', M: ' مليون' };
const term = x => (window.AR_TERMS && TERMS[x]) || x;
const isLb = () => state.settings.unit === 'lb';
const U = () => term(state.settings.unit);
function dispW(kg) { if (kg == null) return ''; return trimNum(isLb() ? kg * KG_LB : kg, isLb() ? 1 : 2); }
function toKg(v) { return v == null ? null : (isLb() ? v / KG_LB : v); }
function fmtW(kg, d) { return (d == null ? dispW(kg) : trimNum(isLb() ? kg * KG_LB : kg, d)) + ' ' + U(); }
function compact(v) {
  if (v >= 1e6) return trimNum(v / 1e6, 1) + term('M');
  if (v >= 1e5) return trimNum(v / 1e3, 0) + term('k');
  if (v >= 1e4) return trimNum(v / 1e3, 1) + term('k');
  return Math.round(v).toLocaleString(LOC);
}
function fmtVol(kg) { return compact(isLb() ? kg * KG_LB : kg) + ' ' + U(); }
function distUnit(k) { return term(k === 'wdist' ? (isLb() ? 'yd' : 'm') : (isLb() ? 'mi' : 'km')); }
function dispDist(m, k) {
  if (m == null) return '';
  if (k === 'wdist') return trimNum(isLb() ? m * 1.0936133 : m, 0);
  return trimNum(isLb() ? m / 1609.344 : m / 1000, 2);
}
function toMeters(v, k) {
  if (v == null) return null;
  if (k === 'wdist') return isLb() ? v / 1.0936133 : v;
  return isLb() ? v * 1609.344 : v * 1000;
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
function fmtRest(sec) { return sec < 60 ? (window.AR_TERMS ? `${sec} ث` : `${sec}s`) : fmtClock(sec); }
function fmtDuration(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  return min >= 60 ? T('{h}h {m}m', { h: Math.floor(min / 60), m: pad2(min % 60) }) : T('{n} min', { n: min });
}
const dfmt = (ts, o) => new Date(ts).toLocaleDateString(LOC, o);
const fmtDate = ts => dfmt(ts, { weekday: 'short', day: 'numeric', month: 'short' });
const fmtDateY = ts => dfmt(ts, { day: 'numeric', month: 'short', year: 'numeric' });
const fmtShort = ts => dfmt(ts, { day: 'numeric', month: 'short' });
const fmtTime = ts => new Date(ts).toLocaleTimeString(LOC, { hour: 'numeric', minute: '2-digit' });
function dayStart(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
function weekStart(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); }
function relDay(ts) {
  const n = Math.round((dayStart(Date.now()) - dayStart(ts)) / DAY);
  if (n <= 0) return T('today');
  if (n === 1) return T('yesterday');
  if (n < 7) return TN(n, '{n} day ago', '{n} days ago');
  if (n < 14) return T('last week');
  if (n < 60) return TN(Math.round(n / 7), '{n} week ago', '{n} weeks ago');
  return fmtDateY(ts);
}
function toLocalInput(ts) { const d = new Date(ts); return new Date(ts - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
// estimated 1RM (Epley), only from sets of 1 to 12 reps with a positive weight: higher-rep sets still count as
// training, records for weight, reps and volume, they just don't feed this estimate (it gets unreliable past ~12)
const E1RM_MAX_REPS = 12;
const e1rm = (w, r) => !(w > 0) || !(r >= 1) || r > E1RM_MAX_REPS ? 0 : (r === 1 ? w : w * (1 + r / 30));

/* ============================== Icons ============================== */

const ICONS = {
  dumbbell: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7.5V12l3 2',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  chart: 'M4 4v16h16M8 15l3.5-4 3 2.5L19 8',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9.5h-13zM12 15v2',
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
  flask: 'M9 3h6M10 3v6l-5.4 9.5A2 2 0 0 0 6.3 21.5h11.4a2 2 0 0 0 1.7-3L14 9V3M7.2 15h9.6',
  pin: 'M9 4h6M10 4v6l-3 4h10l-3-4V4M12 14v6',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  share: 'M12 3v12M7.5 7.5L12 3l4.5 4.5M5 12v8h14v-8',
  info: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 11v6M12 7.5h.01',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  backspace: 'M9 5h11v14H9l-6-7zM12 9.5l5 5M17 9.5l-5 5',
  camera: 'M4 8h3.5l2-3h5l2 3H20v11H4zM12 10.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7',
  same: 'M12 4v12M7 11l5 5 5-5M6 20h12',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  minus: 'M5 12h14',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z'
};
const THICK = new Set(['dots', 'grip']);
// each icon is marked with its name, so arrows can be turned round for right-to-left reading
const icon = (n, cls = '') => `<svg class="i i-${n} ${THICK.has(n) ? 'thick ' : ''}${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`;

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
/* ----- exercise illustrations: RepDB free tier (repdb.co), loaded from RepDB's own published copy ----- */
const VIS = window.LS_VISUALS || { base: '', map: {} };
const artFailed = new Set();
// picture URLs for an exercise: [start, finish], or one for a held position; null when there is none
const artRaw = exId => { const r = VIS.map[exId]; return Array.isArray(r) ? r[0] : r; };
function artOf(exId) {
  const v = artRaw(exId);
  if (!v || artFailed.has(exId)) return null;
  if (v.startsWith('ek:')) return v.slice(3).split(' ').map(n => VIS.ek + n + '.svg');
  const names = v[0] === '=' ? [v.slice(1)] : v.includes(' ') ? v.split(' ') : [v + '-start', v + '-peak'];
  return names.map(n => VIS.base + n + '.webp');
}
// a picture that shows a close variation rather than the exact exercise says how it differs
const artNote = exId => { const r = VIS.map[exId]; return Array.isArray(r) ? r[1] : ''; };
// Everkinetic line drawings sit on white; the tile colour shows through (CSS multiply)
const artKind = exId => { const v = artRaw(exId); return v && v.startsWith('ek:') ? ' ek' : ''; };
const artCredit = exId => artKind(exId) ? '<a href="https://github.com/everkinetic/data" target="_blank" rel="noopener">Everkinetic</a>, CC BY-SA 4.0' : `<a href="https://repdb.co" target="_blank" rel="noopener">${T('Exercise data by RepDB (repdb.co)')}</a>`;
// start and finish shown in turn, like a two-frame animation
const artFrames = (exId, art, alt) => art.map((u, i) => `<img class="${art.length > 1 ? 'f' + i : ''}" src="${u}" alt="${i ? '' : esc(alt)}" loading="lazy" decoding="async" data-art="${esc(exId)}">`).join('');

/* ----- movement: pictures and diagrams go through one rep on the page's clock, so they move together and carry on through redraws ----- */
const REP = 4000; // one rep: lift 1.2 s, squeeze 0.4 s, lower 1.9 s, pause in the stretch 0.5 s
const REP_KEYS = [[0, 0], [0.3, 1], [0.4, 1], [0.875, 0], [1, 0]]; // [time through the rep, position: 0 start … 1 end]
const smooth = x => x * x * (3 - 2 * x);
function repPos(t) {
  for (let i = 1; i < REP_KEYS.length; i++) {
    const [t1, p1] = REP_KEYS[i];
    if (t <= t1) { const [t0, p0] = REP_KEYS[i - 1]; return p0 + (p1 - p0) * smooth((t - t0) / (t1 - t0)); }
  }
  return 0;
}
const repPhase = t => t < 0.3 ? T('Lift') : t < 0.4 ? T('Squeeze') : t < 0.875 ? T('Lower slowly') : T('Stretch');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motionOn = () => state.settings.motion !== false && !reduceMotion.matches && !!Element.prototype.animate;
// the finish picture takes over as the movement passes halfway, and hands back on the way down
const PIC = Array.from({ length: 41 }, (_, i) => Math.min(1, Math.max(0, (repPos(i / 40) - 0.3) / 0.4)));
const fadeKeys = (lo, hi, back) => PIC.map((o, i) => ({ offset: i / 40, opacity: lo + (hi - lo) * (back ? 1 - o : o) }));
const MV_KEYS = { f0: fadeKeys(0, 1, true), f1: fadeKeys(0, 1), b0: fadeKeys(0.25, 1, true), b1: fadeKeys(0.25, 1) };
function mvAnim(el, kind) {
  if (el._mv && el._mv.playState === 'running' && el._mvKind === kind) return;
  if (el._mv) el._mv.cancel();
  el._mv = el.animate(MV_KEYS[kind], { duration: REP, iterations: Infinity });
  el._mv.startTime = 0; // started at the page's time origin: every picture and diagram is at the same point of the rep
  el._mvKind = kind;
}
const mvFigs = new Map(); // diagrams on screen → what they need each frame
let mvRaf = 0;
function mvStart(box) {
  if (!motionOn()) return;
  if (box.dataset.mv === 'sci') {
    if (mvFigs.has(box)) return;
    const a = sciOf(box.dataset.ex), live = box.querySelector('.sci-live'), sec = box.closest('.sci');
    if (!a || !a.scene || !live) return;
    mvFigs.set(box, { a, live, phase: box.querySelector('.sci-phase'), cur: sec && sec.querySelector('.sci-cur'), dot: sec && sec.querySelector('.sci-dot'), p: -1, ph: '' });
    if (!mvRaf) mvRaf = requestAnimationFrame(mvLoop);
    return;
  }
  const f0 = box.querySelector('img.f0'), f1 = box.querySelector('img.f1');
  if (!f0 || !f1) return;
  mvAnim(f0, 'f0'); mvAnim(f1, 'f1');
  const bars = box.querySelectorAll('.exd-step i');
  if (bars.length === 2) { mvAnim(bars[0], 'b0'); mvAnim(bars[1], 'b1'); }
}
function mvStop(box) {
  if (box.dataset.mv === 'sci') { mvFigs.delete(box); return; }
  for (const el of box.querySelectorAll('img.f0, img.f1, .exd-step i')) if (el._mv) { el._mv.cancel(); el._mv = null; }
}
function mvStopAll() {
  for (const box of document.querySelectorAll('[data-mv]')) mvStop(box);
  mvFigs.clear();
}
function mvLoop(ts) {
  mvRaf = 0;
  const t = (ts % REP) / REP, p = repPos(t), ph = repPhase(t);
  for (const [fig, d] of mvFigs) {
    if (!fig.isConnected) { mvFigs.delete(fig); continue; }
    if (d.phase && d.ph !== ph) { d.ph = ph; d.phase.textContent = ph; }
    if (Math.abs(p - d.p) < 0.001) continue; // holding still at the top or bottom
    d.p = p;
    d.live.innerHTML = SCI.live(d.a, p);
    const v = SCI.effortAt(d.a, p);
    if (d.cur && d.dot && v != null) { d.cur.style.transform = `translateX(${(p * 100).toFixed(2)}%)`; d.dot.style.transform = `translateY(${((1 - v * 0.9) * 100).toFixed(1)}%)`; }
  }
  if (mvFigs.size) mvRaf = requestAnimationFrame(mvLoop);
}
// only what is on screen moves; anything new on the page is picked up after each redraw
const mvSeen = new WeakSet(), mvShown = new WeakSet();
const mvIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
  for (const e of es) {
    const box = e.target;
    if (!box.isConnected) { mvIO.unobserve(box); mvShown.delete(box); mvStop(box); }
    else if (e.isIntersecting) { mvShown.add(box); mvStart(box); }
    else { mvShown.delete(box); mvStop(box); }
  }
}, { rootMargin: '60px' }) : null;
let mvQueued = false;
function mvScan() {
  mvQueued = false;
  if (!motionOn()) return;
  for (const box of document.querySelectorAll('[data-mv]')) {
    if (!mvSeen.has(box)) { mvSeen.add(box); if (mvIO) mvIO.observe(box); else mvStart(box); }
    else if (mvShown.has(box)) mvStart(box); // pictures moved into a redrawn card keep going
  }
}
function mvWatch() {
  new MutationObserver(() => { if (!mvQueued) { mvQueued = true; requestAnimationFrame(mvScan); } }).observe(document.body, { childList: true, subtree: true });
  const changed = () => { mvStopAll(); render(); renderWorkout(); };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', changed); else if (reduceMotion.addListener) reduceMotion.addListener(changed);
  mvScan();
}
// the small square picture shown beside an exercise: your photo, the illustration, or the muscle map
function thumb(exId, size = '') {
  const url = photos.get(exId);
  if (url) return `<span class="thumb ${size} photo"><img src="${url}" alt="" loading="lazy"></span>`;
  const art = artOf(exId);
  const mv = art && size.includes('lg') && art.length > 1 && motionOn();
  if (art) return `<span class="thumb ${size} art${artKind(exId)}${mv ? ' moving' : ''}"${mv ? ' data-mv="pic"' : ''}>${mv ? artFrames(exId, art, '') : `<img src="${art[art.length - 1]}" alt="" loading="lazy" decoding="async" data-art="${esc(exId)}">`}</span>`;
  return mapThumb(exId, size);
}
function mapThumb(exId, size = '') {
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
// a backup waits for this, so it never goes out without your photos
let photosLoaded = false;
async function loadPhotos() {
  photoDB = await openPhotoDB();
  if (!photoDB) { photosLoaded = true; return; }
  try {
    const rq = photoDB.transaction('photos').objectStore('photos').openCursor();
    rq.onsuccess = () => {
      const c = rq.result;
      if (c) { photos.set(c.key, c.value); c.continue(); } else { photosLoaded = true; if (photos.size) refreshAll(); }
    };
    rq.onerror = () => { photosLoaded = true; };
  } catch (e) { photosLoaded = true; /* no saved photos */ }
}
function storePhoto(id, url) {
  if (url) photos.set(id, url); else photos.delete(id);
  if (!photoDB) return;
  try {
    const tx = photoDB.transaction('photos', 'readwrite'), st = tx.objectStore('photos');
    if (url) st.put(url, id); else st.delete(id);
    tx.onerror = tx.onabort = () => toast(T('Couldn’t keep a photo on this device. The storage may be full.'));
  } catch (e) { toast(T('Couldn’t keep the photo on this device.')); }
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
    try { storePhoto(exId, await shrinkImage(f)); refreshAll(); toast(T('Photo saved.')); }
    catch (e) { toast(T('That image couldn’t be read. Try another photo.')); }
  });
  inp.click();
}

/* ============================== State ============================== */

const KEY = 'liftingsanity:data:v1';
// shown at the bottom of Settings; goes up with the offline cache in sw.js (a test checks they match)
const APP_VERSION = 35;
let state;
let storageOK = true;
// set when saved data couldn't be read or set aside: the app then never writes over it
let saveBlocked = false;
const ui = {
  tab: 'train', woHidden: false, effOpen: null, kp: null, delMode: null, setupOpen: null,
  lib: { q: '', g: 'all', m: 'all', eq: 'all' },
  hist: { month: null, day: null }
};

function defaults() {
  return {
    v: 1,
    settings: {
      unit: 'kg', effort: 'rir', rest: 120, autoRest: true, autoNext: true, view: 'focus',
      sound: true, wake: true, theme: 'auto', bar: 20, step: 2.5, installHint: true, keypad: 'auto', uniStyle: 'rows', padRir: true
    },
    custom: [], exPrefs: {}, templates: [], splits: [], activeSplit: null,
    workouts: [], active: null, rest: null,
    blocks: [{ id: 'b1', name: T('Block {n}', { n: 1 }), start: 0 }], exResets: {}, flags: {}
  };
}
function migrate(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) throw new Error('Not Lifting Sanity data');
  const d = defaults();
  for (const k of Object.keys(d)) if (s[k] == null) s[k] = d[k];
  for (const k of ['custom', 'templates', 'splits', 'workouts']) s[k] = Array.isArray(s[k]) ? s[k].filter(o => o && typeof o === 'object') : [];
  for (const k of ['exPrefs', 'exResets', 'flags']) if (typeof s[k] !== 'object' || Array.isArray(s[k])) s[k] = {};
  s.settings = Object.assign(d.settings, typeof s.settings === 'object' ? s.settings : {});
  if (!Array.isArray(s.blocks) || !s.blocks.length) s.blocks = d.blocks;
  // a record with something missing is mended rather than stopping the app from opening
  const mend = w => {
    w.ex = Array.isArray(w.ex) ? w.ex.filter(x => x && typeof x === 'object' && x.exId) : [];
    for (const x of w.ex) x.sets = Array.isArray(x.sets) ? x.sets.filter(o => o && typeof o === 'object') : [];
  };
  for (const w of s.workouts) { mend(w); if (!Array.isArray(w.prs)) w.prs = []; w.start = +w.start || 0; }
  for (const t of s.templates) mend(t);
  if (s.active && typeof s.active === 'object') { mend(s.active); s.active.start = +s.active.start || Date.now(); } else s.active = null;
  for (const sp of s.splits) {
    sp.days = Array.isArray(sp.days) ? sp.days.filter(id => isRest(id) || s.templates.some(t => t.id === id)) : [];
    sp.pos = Math.min(Math.max(0, +sp.pos || 0), Math.max(0, sp.days.length - 1));
  }
  if (!s.splits.some(sp => sp.id === s.activeSplit)) s.activeSplit = s.splits[0] ? s.splits[0].id : null;
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
  for (const w of s.workouts) {
    w.ex.forEach(splitRows);
    for (const p of w.prs) if (p && p.set && (p.set.rl != null || p.set.rr != null)) { p.set.r = Math.max(p.set.rl || 0, p.set.rr || 0); delete p.set.rl; delete p.set.rr; }
  }
  if (s.active) s.active.ex.forEach(splitRows);
  // names the app gave in another language are shown in this one; names people typed stay as they are
  for (const sp of s.splits) sp.name = relabel(sp.name);
  for (const t of s.templates) { t.name = relabel(t.name); if (t.from) t.from = relabel(t.from); if (t.note) t.note = relabel(t.note); }
  for (const w of s.workouts) w.name = relabel(w.name);
  if (s.active) s.active.name = relabel(s.active.name);
  return s;
}
function load() {
  let raw = null;
  state = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { storageOK = false; }
  if (raw) {
    try { state = migrate(JSON.parse(raw)); } catch (e) {
      state = null;
      try { localStorage.setItem(KEY + ':unreadable-' + Date.now(), raw); } catch (e2) { saveBlocked = true; }
    }
  }
  if (!state) state = defaults();
  // nothing saved yet: someone new (or a new device). They get the welcome, not the Full Body EOD split
  if (!raw && !saveBlocked) { state.flags.fbeod = 1; state.flags.newUser = 1; }
  ensureSplits();
  if (saveBlocked) setTimeout(() => toast(T('Your saved data couldn’t be read, so nothing is saved over it. Free some storage, then reopen.')), 600);
  else persist();
}
// your own Full Body EOD split is added once and made the active split
function ensureSplits() {
  if (!state.flags) state.flags = {};
  if (state.flags.fbeod) return;
  const p = PROGRAMS.find(x => x.id === 'fbeod');
  if (p && !state.splits.some(s => s.programId === 'fbeod')) installProgram(p, true, true);
  state.flags.fbeod = 1;
}
let saveTimer = null;
function save(now) {
  clearTimeout(saveTimer);
  if (now) persist(); else saveTimer = setTimeout(persist, 900);
}
function persist() {
  clearTimeout(saveTimer); saveTimer = null;
  if (saveBlocked) return;
  try { localStorage.setItem(KEY, JSON.stringify(state)); storageOK = true; } catch (e) {
    if (storageOK) toast(T('Couldn’t save on this device. Export a backup from Settings.'));
    storageOK = false;
  }
}

/* ============================== Exercises ============================== */

let customMap = new Map();
function rebuildCustom() { customMap = new Map(state.custom.map(c => [c.id, c])); allCache = null; }
function getEx(id) {
  return LIB_MAP.get(id) || customMap.get(id) || { id, name: T('Deleted exercise'), m: 'fullbody', eq: 'other', k: 'wr', sec: [], uni: false };
}
/* ----- exercise science (science.js): mechanics, ratings, studies ----- */
const SCI = window.LS_SCIENCE;
// for machines, the resistance profile you set (cams differ) feeds the curve, the diagram and the rating
const profOf = id => (state.exPrefs[id] || {}).profile;
const sciOf = id => SCI ? SCI.analyze(getEx(id), profOf(id)) : null;
const scoreOf = id => { const a = sciOf(id); return a ? a.score : null; };
// the growth score is an estimate from the mechanics; a dot marks exercises with studies of their own (shown in their details)
const studied = id => { const a = sciOf(id); return !!(a && a.evidence && a.evidence.length); };
const scorePill = id => { const v = scoreOf(id), st = v != null && studied(id); return v == null ? '' : `<span class="score ${v >= 9 ? 'hi' : v >= 7 ? 'good' : v >= 5 ? 'ok' : 'lo'}${st ? ' studied' : ''}" title="${st ? T('Growth estimate {v}/10, from the mechanics; studies on this kind of exercise are in its details', { v }) : T('Growth estimate {v}/10, from the mechanics', { v })}">${v}</span>`; };
// the best-rated exercises for a muscle, best first; ones with pictures win ties
// exercises the ready-made plans use, in either version: the common names, preferred among equally rated ones
let planEx = null;
const inPlans = id => (planEx = planEx || new Set(PROGRAMS.filter(p => !p.own).flatMap(p => p.days.filter(d => Array.isArray(d) && typeof d[1] === 'string').flatMap(d => d[1].trim().split('\n').map(lineEx))).flatMap(id => [id, ...(MACHINE_SWAPS.get(id) || [])]))).has(id);
function bestFor(m, n = 3, not = null, min = 0) {
  const used = new Set(state.workouts.flatMap(w => w.ex.map(x => x.exId)));
  return allExercises().filter(e => e.m === m && e.id !== not && (scoreOf(e.id) || 0) > min)
    .sort((a, b) => (scoreOf(b.id) - scoreOf(a.id)) || (inPlans(b.id) - inPlans(a.id)) || (!!artOf(b.id) - !!artOf(a.id)) || (used.has(b.id) - used.has(a.id)))
    .slice(0, n);
}
const refLink = k => { const r = SCI && SCI.REFS[k]; return r ? `<a href="${r.url}" target="_blank" rel="noopener">${esc(r.cite)}</a>` : ''; };
// the resistance profile: worked out from the setup, or for a machine, how you say yours feels
const PROF_OPTS = [['flat', T('Even')], ['desc', T('Hardest at the start')], ['bell', T('Hardest in the middle')], ['asc', T('Hardest at the end')], ['custom', T('Draw my own')], ['', T('Not sure')]];
const PROF_START = [0.6, 1, 0.75, 0.9, 0.5]; // what "Draw my own" shows before you've drawn anything
const profTop = v => ((1 - v * 0.9) * 100).toFixed(1); // same scale as the curve drawing
const profHandles = pts => pts.map((v, i) => `<b class="prof-h" style="left:${i * 25}%;top:${profTop(v)}%"></b>`).join('');
function profileHTML(exId, a, mv) {
  const shape = a.shape ? SCI.SHAPES[a.shape] : a.adjustable ? SCI.SHAPES.machine : null;
  if (!shape) return '';
  const p = profOf(exId), edit = a.adjustable && a.profile === 'custom';
  return `<div class="sci-prof"><p><b>${a.profile ? T('Resistance profile: {shape} (your machine).', { shape: esc(T(shape[0])) }) : T('Resistance profile: {shape}.', { shape: esc(T(shape[0])) })}</b> ${esc(T(shape[1]))}</p>
    ${a.curve ? `<div class="sci-curve-box${edit ? ' edit' : ''}"${edit ? ` data-ex="${esc(exId)}" role="group" aria-label="${T('Drag the points to set how hard each part of the rep is')}"` : ''}>${SCI.curveSvg(a)}${mv && !edit ? '<i class="sci-cur" aria-hidden="true"><i class="sci-dot"></i></i>' : ''}${edit ? profHandles(p) : ''}</div><div class="sci-axis"><span>${T('start · muscle long')}</span><span>${T('end · muscle short')}</span></div>` : ''}
    ${a.adjustable ? profPickHTML(exId, a) : ''}</div>`;
}
function profPickHTML(exId, a) {
  const p = profOf(exId), cur = a.profile || '';
  const mini = pts => `<svg viewBox="0 0 40 20" aria-hidden="true">${pts ? `<polyline points="${SCI.curveFrom(pts).map((v, i) => `${(i / 24 * 38 + 1).toFixed(1)},${(18 - v * 15).toFixed(1)}`).join(' ')}"/>` : '<text x="20" y="15" text-anchor="middle">?</text>'}</svg>`;
  return `<div class="prof-pick"><p class="prof-q">${T('<b>Machines differ.</b> Where does yours feel hardest?')}</p>
    <div class="prof-opts">${PROF_OPTS.map(([v, l]) => `<button class="prof-opt ${cur === v ? 'on' : ''}" data-a="profSet" data-id="${esc(exId)}" data-v="${v}" aria-pressed="${cur === v}">${mini(v === 'custom' ? (cur === 'custom' ? p : PROF_START) : v ? SCI.PROFILES[v].pts : null)}<span>${l}</span></button>`).join('')}</div>
    ${cur === 'custom' ? `<p class="prof-hint">${T('Drag the five points on the curve to match your machine, from the start of the rep to the end.')}</p>` : ''}
    <p class="muted small">${T('How to tell: do a few slow reps with a moderate weight and notice where it feels heaviest and lightest. On a cam, the rep is heavier where the belt or chain leaves the cam far from its axle, and lighter where it leaves close to it.')}</p></div>`;
}
// drawing your own: drag a point up or down (the nearest one to where you touched)
document.addEventListener('pointerdown', ev => {
  const box = ev.target.closest && ev.target.closest('.sci-curve-box.edit');
  if (!box || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
  const exId = box.dataset.ex, cur = profOf(exId);
  if (!Array.isArray(cur)) return;
  ev.preventDefault();
  const vals = cur.slice(), r0 = box.getBoundingClientRect();
  const i = Math.round(Math.min(1, Math.max(0, (ev.clientX - r0.left) / r0.width)) * 4);
  const handles = box.querySelectorAll('.prof-h');
  box.classList.add('dragging'); handles[i] && handles[i].classList.add('on');
  const move = e => {
    const r = box.getBoundingClientRect();
    vals[i] = Math.round(Math.min(1, Math.max(0.05, (1 - (e.clientY - r.top) / r.height) / 0.9)) * 100) / 100;
    const svg = box.querySelector('svg.sci-curve');
    if (svg) svg.outerHTML = SCI.curveSvg({ curve: SCI.curveFrom(vals) });
    if (handles[i]) handles[i].style.top = profTop(vals[i]) + '%';
  };
  const end = () => {
    box.removeEventListener('pointermove', move); box.removeEventListener('pointerup', end); box.removeEventListener('pointercancel', end);
    const p = state.exPrefs[exId] = state.exPrefs[exId] || {};
    p.profile = vals; save(); refreshAll();
  };
  try { box.setPointerCapture(ev.pointerId); } catch (e) { /* the box still gets the moves while the finger is over it */ }
  box.addEventListener('pointermove', move); box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  move(ev);
});
function profileSheet(exId) {
  openSheet({
    live: true,
    render: () => {
      const a = sciOf(exId);
      return `${sheetHead(T('Resistance profile'))}<div class="sheet-body pad prof-sheet"><p class="muted">${esc(getEx(exId).name)}${a && a.score != null ? ` · ${T('{score}/10 for growth', { score: a.score })}` : ''}</p>${a ? profileHTML(exId, a, false) : ''}${a && a.profWhy && a.profWhy.length ? `<p class="prof-why">${icon('info', 'inline')}${T('Rating: {why}.', { why: a.profWhy.map(x => esc(T(x))).join('; ') })}</p>` : ''}</div>`;
    }
  });
}
function scienceHTML(exId) {
  const ex = getEx(exId), a = sciOf(exId);
  if (!a || a.pattern === 'generic' && a.score == null) return '';
  const shape = a.shape ? SCI.SHAPES[a.shape] : null;
  const dots = (v, max) => `<span class="dots">${Array.from({ length: max }, (_, i) => `<i class="${i < v ? 'on' : ''}"></i>`).join('')}</span>`;
  const better = a.score != null ? bestFor(ex.m, 3, exId, a.score) : [];
  const rank = a.score != null ? allExercises().filter(e => e.m === ex.m && scoreOf(e.id) != null && scoreOf(e.id) > a.score).length + 1 : 0;
  const total = allExercises().filter(e => e.m === ex.m && scoreOf(e.id) != null).length;
  const mv = !!a.scene && motionOn();
  return `<section class="sci">
    <div class="sci-h"><h3 class="sub-h">${icon('flask')}${T('How it works')}</h3>${a.score != null ? `<span class="sci-score"><b>${a.score}</b><small>/10</small><span>${esc(T(SCI.verdict(a.score)))}<i>${T('Estimate from the mechanics')}</i></span></span>` : ''}</div>
    <p class="sci-title">${esc(T(a.title))}</p>
    ${a.joints.length || a.movers ? `<dl class="sci-facts">${a.joints.length ? `<dt>${T('Joint action')}</dt><dd>${esc(a.joints.map(j => T(j)).join(' · '))}</dd>` : ''}${a.movers ? `<dt>${T('Muscles')}</dt><dd>${esc(T(a.movers))}</dd>` : ''}</dl>` : ''}
    ${a.scene ? `<figure class="sci-diag"${mv ? ` data-mv="sci" data-ex="${esc(exId)}"` : ''}>${mv ? `<span class="sci-phase" aria-hidden="true">${T('Lift')}</span>` : ''}${SCI.diagram(a)}<figcaption>${mv ? `<span><i class="k seg"></i>${T('moving part')}</span>` : `<span><i class="k seg"></i>${T('where it’s hardest')}</span>`}${a.curve && a.shape !== 'flat' ? `<span><i class="k hard"></i>${T('hardest point')}</span>` : ''}<span><i class="k ghost"></i>${T('start and end')}</span>${a.scene.attach === 'cuff' ? `<span><i class="k cuff"></i>${T('cuff on the wrist')}</span>` : ''}${a.scene.force.type !== 'cam' ? `<span><i class="k force"></i>${T('line of force')}</span><span><i class="k arm"></i>${T('moment arm')}</span>` : ''}</figcaption></figure>` : ''}
    ${profileHTML(exId, a, mv)}
    ${a.moment ? `<p class="sci-p"><b>${T('Moment arm.')}</b> ${esc(T(a.moment))}</p>` : ''}
    ${a.r ? `<div class="sci-rates"><p class="sci-rates-h">${T('Why {score}/10: points from the mechanics', { score: a.score })}</p>${Object.entries(a.r).map(([k, v]) => `<div><span>${esc(T(SCI.RATE_NAMES[k]))}</span><span class="rate-v">${dots(v, SCI.RATE_MAX[k])}<small>${v}/${SCI.RATE_MAX[k]}</small></span></div>`).join('')}</div>
    ${a.profWhy && a.profWhy.length ? `<p class="prof-why">${icon('info', 'inline')}${T('Your machine’s profile: {why}.', { why: a.profWhy.map(x => esc(T(x))).join('; ') })}</p>` : ''}
    ${a.eqWhy ? `<p class="prof-why">${icon('info', 'inline')}${esc(T(a.eqWhy))}</p>` : ''}
    ${a.scoreWhy ? `<p class="prof-why">${icon('flask', 'inline')}${esc(T(a.scoreWhy))}</p>` : ''}
    <div class="sci-sure"><b>${icon('info', 'inline')}${T('How sure is this?')}</b>
      <p>${a.evidence.length ? T('There are studies on this kind of exercise, below. Where they compared exercises directly, they count for more than this score.') : T('No study has compared this kind of exercise directly, so the score is a rule of thumb from its mechanics: a reasoned estimate, not a measured result.')}</p>
      <p>${T('What it can’t see: how the exercise feels on your joints, your technique and range of motion, how close to failure you take your sets (which matters more than the choice of exercise), whether you can keep adding weight or reps, and the rest of your program.')}</p></div>` : a.unrated ? `<div class="sci-sure"><b>${icon('info', 'inline')}${T('Not rated for growth')}</b><p>${esc(T(a.unrated))}</p></div>` : ''}
    ${a.fibers ? `<p class="sci-p"><b>${T('Fibers.')}</b> ${esc(T(a.fibers))}</p>` : ''}
    ${a.evidence.length ? `<div class="sci-ev"><b>${T('What studies found')}</b>${a.evidence.map(([k, t]) => `<p>${esc(T(t))} <span class="muted">(${refLink(k)})</span></p>`).join('')}</div>` : ''}
    ${a.tips.length ? `<ul class="sci-tips">${a.tips.map(t => `<li>${esc(T(t))}</li>`).join('')}</ul>` : ''}
    ${a.score != null && total > 1 ? `<p class="sci-rank">${T('Ranks <b>#{rank}</b> of {total} for {muscle} in this library, by this estimate.', { rank, total, muscle: esc(MUSCLES[ex.m].toLowerCase()) })}</p>` : ''}
    ${better.length ? `<div class="sci-alt"><b>${T('Higher-rated for {muscle}', { muscle: esc(MUSCLES[ex.m].toLowerCase()) })}</b><p class="muted small">${T('Worth a try if they suit your joints, your gym and your progress; a lower rating doesn’t mean this exercise is a bad choice.')}</p>${better.map(e => `<button class="ex-row" data-a="openEx" data-id="${e.id}">${thumb(e.id, 'sm')}<span class="ex-txt"><b>${esc(e.name)}</b><small>${esc(T(sciOf(e.id).title))}</small></span>${scorePill(e.id)}</button>`).join('')}</div>` : ''}
  </section>`;
}
// sorted once and kept until your own exercises change; the search text for each is worked out once too
const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
let allCache = null;
function allExercises() {
  if (!allCache) allCache = [...LIB, ...state.custom.filter(c => !c.hidden)].sort((a, b) => collator.compare(a.name, b.name));
  return allCache;
}
const hays = new WeakMap();
const hayOf = e => { const key = e.name + e.m + e.eq + e.sec; let h = hays.get(e); if (h == null || h.key !== key) hays.set(e, h = { key, t: (e.name + ' ' + (e.en ? e.en + ' ' : '') + MUSCLES[e.m] + ' ' + EQUIP[e.eq] + ' ' + e.sec.map(x => MUSCLES[x]).join(' ')).toLowerCase() }); return h.t; };
const hasWeight = k => k === 'wr' || k === 'bw' || k === 'aw' || k === 'wdur' || k === 'wdist';
const hasReps = k => k === 'wr' || k === 'bw' || k === 'aw';
const hasTime = k => k === 'dur' || k === 'wdur' || k === 'dist';
const hasDist = k => k === 'dist' || k === 'wdist';
// a signed number (+20, −2.5) kept in one piece, so right-to-left text doesn't move its sign to the other end
const signed = t => (RTL ? `\u2066${t}\u2069` : t);
function weightLabel(k) { return k === 'bw' ? signed('+' + U()) : k === 'aw' ? signed('−' + U()) : U(); }
function filterExercises({ q = '', g = 'all', m = 'all', eq = 'all', sort = 'az' }) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const gm = g === 'all' ? null : new Set((GROUPS.find(x => x[0] === g) || [0, 0, []])[2]);
  const list = allExercises().filter(e => {
    if (gm && !gm.has(e.m)) return false;
    if (m !== 'all' && e.m !== m) return false;
    if (eq !== 'all' && e.eq !== eq) return false;
    if (!terms.length) return true;
    const hay = hayOf(e);
    return terms.every(t => hay.includes(t));
  });
  if (terms.length) {
    // names that start with what you typed come first; the list is already in name order, so a stable sort keeps the rest
    const q0 = q.toLowerCase().trim();
    list.sort((a, b) => hayOf(b).startsWith(q0) - hayOf(a).startsWith(q0));
  }
  if (sort === 'score') list.sort((a, b) => (scoreOf(b.id) ?? -1) - (scoreOf(a.id) ?? -1));
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
// machine: the machine version, where each swapped exercise remembers its free-weight one (free) for switching back
function programDay(name, spec, from, note, machine) {
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
  const lines = spec.trim().split('\n');
  // a swap never repeats an exercise the day already has; the next choice is used instead
  const used = new Set(lines.map(lineEx).filter(id => !machine || !MACHINE_SWAPS.has(id)));
  for (const line of lines) {
    const [exName, sets, reps, rir, rest] = line.split('|').map(s => s.trim());
    const id = slug(exName);
    if (!LIB_MAP.has(id)) continue;
    const to = machine ? (MACHINE_SWAPS.get(id) || []).find(c => !used.has(c)) : null;
    if (to) used.add(to);
    ex.push({
      exId: to || id, rest: +rest || 90, note: '', ss: null, ...(to ? { free: id } : {}),
      sets: parseSetSpec(sets).map(t => ({ t, tr: t === 'W' ? '' : reps, trir: t === 'W' || rir === '' ? null : +rir }))
    });
  }
  return { id: uid(), name, note: '', ex, from, created: Date.now() };
}
const isRest = d => d === 'rest';
// keepWeights: the starting weights written into a plan are one person's; only the split first made for them keeps them
// version 'machine': the plan's machine version, for people new to lifting
function installProgram(p, makeActive, keepWeights, version) {
  const machine = version === 'machine' && p.machine;
  const days = programDays(p, machine);
  if (!keepWeights) for (const d of days) if (!isRest(d)) for (const x of d.ex) for (const st of x.sets) delete st.tw;
  state.templates.push(...days.filter(d => !isRest(d)));
  const split = { id: uid(), name: p.name, days: days.map(d => isRest(d) ? 'rest' : d.id), pos: 0, programId: p.id };
  if (machine) split.version = 'machine';
  state.splits.push(split);
  if (makeActive) state.activeSplit = split.id;
  return split;
}
// a plan's days as templates, without adding them anywhere (installing does that; a preview just shows them)
const programDays = (p, machine) => p.days.map(d => isRest(d) ? 'rest' : programDay(d[0], d[1], p.name, p.note, machine));
// the split with this plan in this version, if there is one
const splitOfPlan = (p, version) => state.splits.find(s => s.programId === p.id && (s.version || 'free') === (version || 'free'));
// switches a split between free weights and machines in place: each swapped exercise remembers the other, so switching
// back gives the same exercises; sets, reps, rest and notes stay as they are
function setSplitVersion(sp, version) {
  for (const id of new Set(sp.days.filter(d => !isRest(d)))) {
    const t = tplById(id);
    if (!t) continue;
    const used = new Set(t.ex.map(x => x.exId));
    for (const x of t.ex) {
      if (version !== 'machine') { if (x.free) { x.exId = x.free; delete x.free; } continue; }
      if (x.free) continue;
      const to = (MACHINE_SWAPS.get(x.exId) || []).find(c => !used.has(c));
      if (to) { used.add(to); x.free = x.exId; x.exId = to; }
    }
  }
  if (version === 'machine') sp.version = 'machine'; else delete sp.version;
}
const tplById = id => state.templates.find(t => t.id === id);
// take day i out of a split, keeping "up next" on the same day (or the day after, if it was this one)
function dropDay(sp, i) {
  const p = sp.pos || 0;
  sp.days.splice(i, 1);
  sp.pos = Math.min(i < p ? p - 1 : p, Math.max(0, sp.days.length - 1));
}
// moving a day keeps "up next" on the same day
function moveDay(sp, i, j) {
  const p = sp.pos || 0;
  sp.days.splice(j, 0, sp.days.splice(i, 1)[0]);
  sp.pos = p === i ? j : i < p && j >= p ? p - 1 : i > p && j <= p ? p + 1 : p;
}
// days whose template no longer exists are taken out
function pruneDays(sp) { for (let i = sp.days.length - 1; i >= 0; i--) if (!isRest(sp.days[i]) && !tplById(sp.days[i])) dropDay(sp, i); }
function deleteTemplate(id) {
  state.templates = state.templates.filter(t => t.id !== id);
  for (const sp of state.splits) pruneDays(sp);
  // an open split editor works on its own copy of the days
  for (const def of sheets) if (def.split) pruneDays(def.split);
}
const splitById = id => state.splits.find(s => s.id === id);
const activeSplit = () => splitById(state.activeSplit) || null;
function splitDays(split) { return split.days.map(tplById).filter(Boolean); }
const splitNames = split => split.days.map(d => isRest(d) ? T('Rest') : (tplById(d) || {}).name).filter(Boolean);
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
    return { idx: r.idx, state: 'done', due, rests: r.rests };
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
// rough session length: each working set plus its rest, warm-ups a bit quicker
function estMinutes(t) {
  let sec = 0;
  for (const x of t.ex) for (const s of x.sets) sec += s.t === 'W' ? 60 : 40 + (x.rest || state.settings.rest) * (s.side ? 0.5 : 1);
  return Math.max(5, Math.round(sec / 300) * 5);
}
function whenText(ts) {
  const d = Math.round((dayStart(ts) - dayStart(Date.now())) / DAY);
  return d <= 0 ? T('today') : d === 1 ? T('tomorrow') : d < 7 ? T('on {day}', { day: dfmt(ts, { weekday: 'long' }) }) : T('on {date}', { date: fmtShort(ts) });
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
  if (w) parts.push(`${w}${SET_TYPES.W.short}`);
  const n = work.filter(s => s.t === 'N');
  if (n.length) parts.push(`${n.length} × ${(n[0].tr || '').replace('-', '–') || '?'}`);
  const others = {};
  for (const s of work) if (s.t !== 'N') others[s.t] = (others[s.t] || 0) + 1;
  for (const [t, c] of Object.entries(others)) parts.push(`${c > 1 ? c : ''}${SET_TYPES[t].short}`);
  return parts.join(' + ') || T('No sets');
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
// the latest reset of one exercise that is newer than the current block, or 0
// a block still called by its default name ("Block 2") shows in the language in use; a name you typed shows as typed
const blkName = b => { const m = /^Block (\d+)$/.exec(b.name); return m ? T('Block {n}', { n: +m[1] }) : b.name; };
function exResetSince(exId) { const r = state.exResets[exId] || []; const t = r.length ? Math.max(...r) : 0; return t > curBlock().start ? t : 0; }
// a reset made during a workout counts that workout as after it
function resetStamp(exId) {
  const w = state.active;
  return w && w.mode !== 'edit' && (!exId || w.ex.some(x => x.exId === exId)) ? Math.min(Date.now(), w.start) : Date.now();
}
// one exercise's progression starts fresh: records, charts and weight tips count from now; nothing is deleted
function resetExercise(exId, done) {
  const ex = getEx(exId);
  confirmSheet({
    title: T('Reset {name}?', { name: ex.name }),
    text: T('Records, charts and “try more weight” tips for this exercise start fresh from today. Other exercises are not touched. Nothing is deleted: earlier sessions stay in History and in the All time view, and you can undo this.'),
    ok: T('Reset this exercise'), onOk: () => {
      const at = resetStamp(exId);
      (state.exResets[exId] = state.exResets[exId] || []).push(at);
      save(); refreshAll(); if (done) done();
      toast(T('{name}: fresh start. Earlier sessions are kept.', { name: ex.name }), { label: T('Undo'), fn: () => { undoExReset(exId, at); if (done) done(); } });
    }
  });
}
// undo the latest reset, or one particular reset (an Undo tapped late never takes away a different one)
function undoExReset(exId, at) {
  const r = state.exResets[exId];
  const i = !r ? -1 : at != null ? r.lastIndexOf(at) : r.length - 1;
  if (i >= 0) { r.splice(i, 1); if (!r.length) delete state.exResets[exId]; recalcPRs(); }
  save(); refreshAll();
}
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
const sideName = side => side === 'L' ? T('Left') : T('Right');
const partnerOf = (x, s) => s.pair ? x.sets.find(o => o !== s && o.pair === s.pair) || null : null;
// a left + right pair counts as one set
const setWeight = s => s.side ? 0.5 : 1;
function firstSide(x) { const s = x.sets.find(o => o.side); return s ? s.side : 'L'; }
function isPairTail(sets, j) {
  const s = sets[j], p = sets[j - 1];
  if (!s || !s.side || !p || !p.side || p.side === s.side || p.t !== s.t) return false;
  if (s.pair || p.pair) return s.pair === p.pair;
  // template rows have no pair ids: pair neighbours from the start, the way pairUp does
  let tail = false;
  for (let n = 1; n <= j; n++) {
    const a = sets[n], b = sets[n - 1];
    tail = !tail && !!(a.side && b.side && a.side !== b.side && a.t === b.t && !a.pair && !b.pair);
  }
  return tail;
}
const liftSets = sets => sets.filter((s, j) => !isPairTail(sets, j));
// switching left/right off and back on never invents or doubles a set:
// - a set already done stays exactly as it was done (both sides at once, or each side)
// - a planned left/right pair becomes one set with the first side's numbers (never mixing the two sides),
//   and remembers both sides, so switching back gives the same two rows unless the set was changed meanwhile
const LR_KEEP = ['t', 'w', 'r', 'sec', 'dist', 'rir', 'tw', 'tr', 'trir', 'done'];
const lrKey = s => JSON.stringify(LR_KEEP.map(f => s[f] ?? null));
function pairUp(sets, first = 'L', sidedOnly = false) {
  const out = [];
  for (let i = 0; i < sets.length; i++) {
    const s = sets[i], n = sets[i + 1], p = uid();
    if (s.side && n && n.side && n.side !== s.side && n.t === s.t && (s.pair ?? null) === (n.pair ?? null)) { out.push({ ...s, pair: p }, { ...n, pair: p }); i++; }
    else if (s.side) {
      const c = { ...s, id: uid(), side: otherSide(s.side), pair: p, done: false };
      delete c.r; delete c.rir; delete c.at;
      out.push({ ...s, pair: p }, c);
    } else if (sidedOnly || s.done) out.push(s);
    else if (s.lr && s.lr.v === lrKey(s) && s.lr.rows.length === 2) out.push(...s.lr.rows.map(o => ({ ...o, id: uid(), pair: p, done: false })));
    else { const { lr, ...b } = s; out.push({ ...b, side: first, pair: p }, { ...b, id: uid(), side: otherSide(first), pair: p }); }
  }
  return out;
}
// left/right on the whole exercise splits every set; with it off, keep the sets that were made one-sided
// on their own, unless left/right was on for the whole exercise before (then it was switched off since)
function sidesFor(sets, uni, wasUni) {
  if (uni) return pairUp(sets);
  const paired = pairUp(sets, 'L', true);
  return wasUni ? unpair(paired) : paired;
}
function unpair(sets) {
  const out = [], seen = new Set();
  for (const s of sets) {
    if (!s.side) { out.push(s); continue; }
    if (s.pair && seen.has(s.pair)) continue;
    if (s.pair) seen.add(s.pair);
    const both = s.pair ? sets.filter(o => o.pair === s.pair) : [s];
    if (both.some(o => o.done)) { out.push(...both); continue; } // done work is kept as it was done
    const m = { ...both[0] };
    delete m.side; delete m.pair; delete m.at; delete m.lr;
    m.done = false;
    if (both.length === 2) {
      m.lr = { rows: both.map(o => { const c = { side: o.side }; for (const f of LR_KEEP) if (o[f] != null) c[f] = o[f]; c.done = false; return c; }) };
      m.lr.v = lrKey(m);
    }
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
  if (on) return pairUp(sets).map(({ id, pair, done, lr, ...s }) => s);
  return liftSets(sets).map(({ side, pair, lr, ...s }) => s);
}
function setVolume(x, s) {
  if (!s.done || s.t === 'W') return 0;
  const k = getEx(x.exId).k;
  return k === 'wr' || k === 'bw' ? (s.w || 0) * totalReps(x, s) : 0;
}
const workoutVolume = w => sum(w.ex, x => sum(x.sets, s => setVolume(x, s)));
// working sets as you'd count them: warm-ups don't count, a left + right pair is one set, done once both sides are
function setTally(x) {
  let done = 0, total = 0;
  for (const s of liftSets(x.sets)) {
    if (s.t === 'W') continue;
    total++;
    const m = partnerOf(x, s);
    if (s.done && (!m || m.done)) done++;
  }
  return { done, total };
}
const woTally = w => w.ex.reduce((a, x) => { const t = setTally(x); return { done: a.done + t.done, total: a.total + t.total }; }, { done: 0, total: 0 });
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
// `before` (optional) gives the records up to this workout, when they're already worked out
function livePRs(w, x, before) {
  const k = getEx(x.exId).k;
  const rec = before ? before(x.exId) : records(x.exId, baselineAt(x.exId, w.start), w.start, w.id);
  // the same exercise done earlier in this workout counts as before it
  for (const o of w.ex) { if (o === x) break; if (o.exId === x.exId) for (const s of o.sets) addToRec(rec, o, s, k); }
  return x.sets.map(s => { const p = setPRs(x, s, rec, k); addToRec(rec, x, s, k); return p; });
}
// one record of each kind per exercise: its best set in the workout
function workoutPRs(w, before) {
  const best = new Map();
  for (const x of w.ex) {
    const flags = livePRs(w, x, before);
    x.sets.forEach((s, j) => { for (const kind of flags[j]) best.set(x.exId + '|' + kind, [x, j, kind]); });
  }
  return [...best.values()].map(([x, j, kind]) => ({ exId: x.exId, kind, set: clone(x.sets[j]), uni: !!x.uni }));
}
// record flags on every saved workout, worked out again in date order after history changes
// (an edit, a delete, a past workout, an undone reset): one pass, keeping running records per exercise
function recalcPRs() {
  const run = new Map();
  const recAt = (exId, ts) => {
    const base = baselineAt(exId, ts);
    let r = run.get(exId);
    if (!r || r.base !== base) run.set(exId, r = { base, rec: emptyRec() });
    return r.rec;
  };
  const ws = state.workouts;
  for (let i = 0; i < ws.length;) {
    // workouts that start at the same moment don't count for each other
    let j = i;
    while (j < ws.length && ws[j].start === ws[i].start) j++;
    const group = ws.slice(i, j);
    for (const w of group) w.prs = workoutPRs(w, exId => clone(recAt(exId, w.start)));
    for (const w of group) for (const exId of new Set(w.ex.map(x => x.exId))) {
      const rec = recAt(exId, w.start), k = getEx(exId).k;
      let used = false;
      for (const x of w.ex) if (x.exId === exId) for (const s of x.sets) { if (s.done) used = true; addToRec(rec, x, s, k); }
      if (used) rec.sessions++;
    }
    i = j;
  }
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
function sessionNumber(w) { return sessionNums && sessionNums.has(w) ? sessionNums.get(w) : state.workouts.indexOf(w) + 1; }
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
  if (k === 'wr') return [['e1rm', T('Est. 1RM')], ['top', T('Heaviest')], ['vol', T('Volume')]];
  if (k === 'bw') return [['reps', T('Most reps')], ['top', T('Added weight')], ['vol', T('Volume')]];
  if (k === 'aw') return [['reps', T('Most reps')]];
  if (k === 'dur' || k === 'wdur') return [['sec', T('Longest')]];
  return [['dist', T('Distance')], ['sec', T('Time')]];
}
function fmtMetric(metric, v, k) {
  if (metric === 'reps') return TN(Math.round(v), '{n} reps', '{n} reps');
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
const effName = () => term(state.settings.effort === 'rpe' ? 'RPE' : 'RIR');
function fmtSet(x, s, k, withEff = true) {
  k = k || getEx(x.exId).k;
  const reps = `${s.r ?? 0}`;
  let t;
  if (k === 'wr') t = `${dispW(s.w || 0)} × ${reps}`;
  else if (k === 'bw') t = s.w ? `${signed('+' + dispW(s.w))} × ${reps}` : TN(s.r ?? 0, '{n} reps', '{n} reps');
  else if (k === 'aw') t = s.w ? `${signed('−' + dispW(s.w))} × ${reps}` : TN(s.r ?? 0, '{n} reps', '{n} reps');
  else if (k === 'dur') t = fmtClock(s.sec || 0);
  else if (k === 'wdur') t = `${dispW(s.w || 0)} · ${fmtClock(s.sec || 0)}`;
  else if (k === 'dist') t = `${dispDist(s.dist || 0, k)} ${distUnit(k)}${s.sec ? ' · ' + fmtClock(s.sec) : ''}`;
  else t = `${dispW(s.w || 0)} · ${dispDist(s.dist || 0, k)} ${distUnit(k)}`;
  if (withEff && s.rir != null && hasReps(k) && state.settings.effort !== 'off') t += ` @${effDisp(s.rir)}`;
  return t;
}
function setLabel(sets, j) {
  const s = sets[j];
  if (s.side) return term(s.side);
  if (s.t !== 'N') return SET_TYPES[s.t].short;
  return String(sets.slice(0, j + 1).filter(o => o.t === 'N' && !o.side).length);
}
// the set marker is a small weight plate: its colour says the kind of set, it fills in when the set is done,
// warm-ups have a dashed rim, and one-side sets wear L (green) or R (purple) with the set kind as a tag
const badge = (t, label, attrs = '', side = '') => `<button class="badge t-${t}${side ? ' side side-' + side : ''}" ${side && t !== 'N' ? `data-tag="${SET_TYPES[t].short}"` : ''} ${attrs} aria-label="${esc(!side ? SET_TYPES[t].label : side === 'L' ? T('Left side, {type}', { type: SET_TYPES[t].label }) : T('Right side, {type}', { type: SET_TYPES[t].label }))}">${esc(label)}</button>`;
const fullLabel = (sets, j) => { const s = sets[j]; return s.side && s.t !== 'N' ? SET_TYPES[s.t].short + term(s.side) : setLabel(sets, j); };
// Lyfta-style one-line set: "W  72.5 kg · 4 reps", "R  45 kg · 5 reps · 1 RIR"
function lineTag(sets, j) {
  const s = sets[j];
  // a one-side warm-up reads "WL": the W in the warm-up colour, the L in the left colour
  if (s.side && s.t !== 'N') return `<span class="lt lt-${s.t}">${esc(SET_TYPES[s.t].short)}<span class="lt-${s.side}">${term(s.side)}</span></span>`;
  return `<span class="lt lt-${s.side || s.t}">${esc(fullLabel(sets, j))}</span>`;
}
function fmtLine(x, s, k) {
  k = k || getEx(x.exId).k;
  const parts = [];
  if (hasWeight(k) && s.w != null) parts.push(signed(`${k === 'bw' ? '+' : k === 'aw' ? '−' : ''}${dispW(s.w)} ${U()}`));
  if (hasReps(k)) parts.push(TN(s.r ?? 0, '{n} reps', '{n} reps'));
  if (hasDist(k) && s.dist != null) parts.push(`${dispDist(s.dist, k)} ${distUnit(k)}`);
  if (hasTime(k) && s.sec != null) parts.push(fmtClock(s.sec));
  if (s.rir != null && hasReps(k) && state.settings.effort !== 'off') parts.push(`${effDisp(s.rir)} ${effName()}`);
  return parts.join(' · ');
}

/* ============================== Shell ============================== */

const TABS = [['train', 'Train', 'dumbbell'], ['history', 'History', 'clock'], ['library', 'Exercises', 'list'], ['progress', 'Progress', 'chart'], ['settings', 'Settings', 'sliders']].map(([id, l, ic]) => [id, T(l), ic]);

function applyTheme() {
  const t = state.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const y2k = state.settings.style === 'y2k';
  document.documentElement.dataset.style = y2k ? 'y2k' : 'clean';
  // the Y2K sheet only takes part in styling while it's chosen, so the clean look pays nothing for it
  const sheet = $('#y2kcss');
  if (sheet) sheet.media = y2k ? 'all' : 'not all';
  if (y2k) startY2k();
  else { clearInterval(hudTimer); const hud = $('#hud'); if (hud) hud.innerHTML = ''; }
}
/* ----- Y2K style extras: its fonts, a number-grid backdrop and the HUD strip (styles live in y2k.css) ----- */
let hudTimer = null;
function startY2k() {
  if (!$('link[data-y2kfont]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.dataset.y2kfont = ''; l.crossOrigin = 'anonymous';
    l.href = 'https://fonts.googleapis.com/css2?family=DotGothic16&family=Orbitron:wght@700;900&family=Share+Tech+Mono&family=Silkscreen:wght@400;700&family=VT323&display=swap';
    document.head.append(l);
  }
  if (!document.documentElement.style.getPropertyValue('--numgrid')) {
    let seed = 11, txt = '';
    const rnd = () => (seed = seed * 16807 % 2147483647) % 10;
    for (let r = 0; r < 14; r++) { let line = ''; for (let c = 0; c < 22; c++) line += rnd(); txt += `<text x="0" y="${r * 20 + 14}">${line}</text>`; }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280"><g fill="#1F3BFF" fill-opacity=".12" font-family="monospace" font-size="12.5" letter-spacing="0">${txt}</g></svg>`;
    document.documentElement.style.setProperty('--numgrid', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
  }
  renderHud();
  clearInterval(hudTimer);
  hudTimer = setInterval(() => { if (state.settings.style === 'y2k' && !document.hidden) tickHud(); else if (state.settings.style !== 'y2k') clearInterval(hudTimer); }, 1000);
}
function renderHud() {
  const el = $('#hud');
  if (!el) return;
  const sp = state.splits.find(x => x.id === state.activeSplit), st = sp ? splitToday(sp) : null;
  const next = st && sp.days[st.idx] && !isRest(sp.days[st.idx]) ? (tplById(sp.days[st.idx]) || {}).name : 'REST';
  const log = [`sessions_logged: ${state.workouts.length}`, `streak: ${streakWeeks()}wk`, `next: ${(next || '').toUpperCase()}`, `library: ${LIB.length} entries`, `cache: ok`, `rest_timer: ${state.rest ? 'running' : 'idle'}`, `block: ${curBlock().name.toUpperCase()}`];
  el.innerHTML = `<span>LS-OS v1.3</span><b>SYS:OK</b><span class="hud-jp">稼働中</span><span data-hud="t"></span><span class="hud-w" data-hud="w"></span><span class="hud-log"><span>${log.map(esc).map(x => '&gt; ' + x).join('&nbsp;&nbsp;&nbsp;')}</span></span>`;
  tickHud();
}
function tickHud() {
  const t = $('[data-hud="t"]'), w = $('[data-hud="w"]');
  if (!t) return;
  const d = new Date(), p = n => String(n).padStart(2, '0');
  setText(t, `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
  const zone = tz => { try { return d.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }); } catch (e) { return '--:--'; } };
  if (w) setText(w, `UTC ${zone('UTC')} · TYO ${zone('Asia/Tokyo')} · NYC ${zone('America/New_York')}`);
}
function renderTabs() {
  const el = $('#tabs');
  if (!el.querySelector('.tab')) el.innerHTML = `<span class="tab-pill" aria-hidden="true"></span><div class="brand" aria-hidden="true">${plateMark()}</div>` + TABS.map(([id, label, ic]) =>
    `<button class="tab" data-a="tab" data-tab="${id}">${icon(ic)}<span>${label}</span></button>`).join('');
  for (const b of el.querySelectorAll('.tab')) { const on = b.dataset.tab === ui.tab; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); }
  placePill();
}
// the highlight behind the current tab glides over to the new one
function placePill(instant) {
  const el = $('#tabs'), pill = el && $('.tab-pill', el), b = el && $('.tab.on', el);
  if (!pill || !b) return;
  const t = el.getBoundingClientRect(), r = (matchMedia('(min-width: 760px)').matches ? b : $('.i', b) || b).getBoundingClientRect();
  if (!r.width) return;
  pill.classList.toggle('still', !!instant || !pill.dataset.placed || calm());
  pill.style.width = r.width + 'px';
  pill.style.height = r.height + 'px';
  // measured from inside the bar's border, where the highlight is placed
  pill.style.transform = `translate(${(r.left - t.left - el.clientLeft).toFixed(1)}px, ${(r.top - t.top - el.clientTop).toFixed(1)}px)`;
  pill.dataset.placed = '1';
}
function plateMark() {
  return `<svg viewBox="0 0 32 32" class="mark"><rect x="2" y="14.5" width="28" height="3" rx="1.5" fill="var(--steel)"/><rect x="6" y="6" width="4.5" height="20" rx="1.6" fill="var(--plate-red)"/><rect x="11.5" y="9" width="3.5" height="14" rx="1.3" fill="var(--plate-blue)"/><rect x="21.5" y="6" width="4.5" height="20" rx="1.6" fill="var(--plate-red)"/><rect x="17" y="9" width="3.5" height="14" rx="1.3" fill="var(--plate-blue)"/></svg>`;
}
const VIEWS = {};
function render() {
  charts.clear();
  document.body.dataset.tab = ui.tab;
  renderTabs();
  const v = $('#view'), shown = imgsBySrc(v);
  const page = VIEWS[ui.tab](), tip = tipHTML(ui.tab);
  v.innerHTML = tip ? (page.includes('</header>') ? page.replace('</header>', '</header>' + tip) : tip + page) : page;
  keepImgs(v, shown);
  renderMini();
  requestAnimationFrame(() => drawCharts($('#view')));
}
function go(tab) {
  const from = TABS.findIndex(t => t[0] === ui.tab), to = TABS.findIndex(t => t[0] === tab);
  const ghost = tab !== ui.tab && canMove() && !document.body.classList.contains('wo-open') ? liftView() : null;
  ui.tab = tab; ui.histLimit = null;
  render();
  window.scrollTo(0, 0);
  // the new page comes in from the side its tab is on (the tabs run right to left in Arabic)
  if (ghost) tabMotion(ghost, (to >= from ? 1 : -1) * (RTL ? -1 : 1));
}
/* ============================== Screen transitions ============================== */
// motion like iOS: a quick start that settles softly. With Reduce Motion on, screens fade instead of moving
const EASE = 'cubic-bezier(.32, .72, 0, 1)';
const calm = () => reduceMotion.matches;
const canMove = () => !!ui.booted && !!document.body.animate;
// pictures already on screen, by address: a redraw puts them back instead of loading them again (no white flash)
function imgsBySrc(root) {
  const m = new Map();
  for (const im of root.querySelectorAll('img')) { const k = im.getAttribute('src'); if (!m.has(k)) m.set(k, []); m.get(k).push(im); }
  return m;
}
function keepImgs(root, shown) {
  if (!shown.size) return;
  for (const im of root.querySelectorAll('img')) {
    const old = (shown.get(im.getAttribute('src')) || []).shift();
    if (old) { old.className = im.className; old.alt = im.alt; im.replaceWith(old); }
  }
}
// switching tabs: the page you leave drifts away and fades, the new one drifts in from the side of its tab.
// The old page is moved (not copied) into a layer of its own for the moment it takes
let viewFx = null;
function endViewFx() { const f = viewFx; if (!f) return; viewFx = null; f.ghost.remove(); for (const a of f.anims) a.cancel(); }
function liftView() {
  endViewFx();
  const v = $('#view'), r = v.getBoundingClientRect(), cs = getComputedStyle(v);
  const ghost = document.createElement('div'), inner = document.createElement('div');
  ghost.className = 'view-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.inert = true;
  inner.className = 'view-ghost-in';
  inner.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;padding:${cs.paddingTop} ${cs.paddingRight} 0 ${cs.paddingLeft}`;
  inner.append(...v.childNodes);
  ghost.append(inner);
  document.body.append(ghost);
  return ghost;
}
function tabMotion(ghost, dir) {
  const c = calm(), d = c ? 0 : 28;
  // the new page's parts move, not the page itself, so it never pokes out sideways (the page clips them)
  const parts = [...$('#view').children];
  const anims = [ghost.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * d}px)` }], { duration: c ? 120 : 160, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' })];
  for (const el of parts) anims.push(el.animate([{ opacity: 0, transform: `translateX(${dir * d}px)` }, { opacity: 1, transform: 'none' }], { duration: c ? 200 : 400, delay: c ? 0 : 60, easing: EASE, fill: 'backwards' }));
  const f = viewFx = { ghost, anims };
  anims[anims.length - 1].onfinish = () => { if (viewFx === f) endViewFx(); };
}
// a part of a page that changes in place (a month in the calendar) slides in from the side it comes from
function slideIn(el, dir) {
  if (!el || !canMove()) return;
  el.animate(calm() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: `translateX(${dir * 30}px)` }, { opacity: 1, transform: 'none' }], { duration: 340, easing: EASE });
}
// a panel at the bottom (number pad, rest timer) slides up when it appears and back down before it goes
function slidePanel(el, show, gone) {
  const out = el._out;
  if (show) {
    if (out) { el._out = null; out.cancel(); }
    const was = el.hidden || !!out;
    el.hidden = false;
    if (was && canMove()) el.animate(calm() ? [{ opacity: 0 }, { opacity: 1 }] : [{ translate: '0 110%' }, { translate: '0 0' }], { duration: 420, easing: EASE });
    return;
  }
  if (el.hidden || out) return;
  if (!canMove()) { el.hidden = true; if (gone) gone(); return; }
  const a = el._out = el.animate(calm() ? [{ opacity: 1 }, { opacity: 0 }] : [{ translate: '0 0' }, { translate: '0 110%' }], { duration: 240, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' });
  a.onfinish = () => { if (el._out !== a) return; el._out = null; el.hidden = true; a.cancel(); if (gone) gone(); };
}
function fadeUp(el) {
  if (!el || !canMove()) return;
  el.animate(calm() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 340, easing: EASE });
}
// the workout screen grows up out of its bar (or rises from the bottom) and shrinks back down into the bar
let woFx = null;
function woScrim() { let sc = $('#woScrim'); if (!sc) { sc = document.createElement('div'); sc.id = 'woScrim'; document.body.append(sc); } return sc; }
function woFxEnd() { const f = woFx; if (!f) return; woFx = null; f.done(); for (const a of f.anims) a.cancel(); }
function woFxStart(kind, anims, done) {
  const f = woFx = { kind, anims, done };
  anims[0].onfinish = () => { if (woFx === f) woFxEnd(); };
}
// the workout shrunk onto the bar: the bar's centre and width, its top edge on the bar
function barPose(r) {
  return `translate(${(r.left + r.width / 2 - innerWidth / 2).toFixed(1)}px, ${r.top.toFixed(1)}px) scale(${(r.width / innerWidth).toFixed(4)})`;
}
function woRise(el, from) {
  if (!canMove()) return;
  const sc = woScrim(), c = calm(), dur = c ? 200 : 480;
  document.body.classList.add('wo-moving');
  el.classList.add('wo-card');
  const anims = [
    el.animate(c ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: from ? barPose(from) : 'translateY(100%)' }, { transform: 'none' }], { duration: dur, easing: EASE, fill: 'both' }),
    sc.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, fill: 'both' })
  ];
  if (from && !c) anims.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur * .3, fill: 'both' }));
  woFxStart('rise', anims, () => { document.body.classList.remove('wo-moving'); el.classList.remove('wo-card'); sc.remove(); });
}
function woDrop(el) {
  const mini = $('#mini'), to = mini.hidden ? null : mini.getBoundingClientRect();
  const sc = woScrim(), c = calm(), dur = c ? 180 : to ? 460 : 380;
  el.inert = true;
  el.classList.add('wo-card');
  const anims = [
    el.animate(c ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'none' }, { transform: to ? barPose(to) : 'translateY(100%)' }], { duration: dur, easing: to ? EASE : 'cubic-bezier(.4, 0, .8, .4)', fill: 'forwards' }),
    sc.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, fill: 'forwards' })
  ];
  if (to && !c) {
    anims.push(el.animate([{ opacity: 1 }, { opacity: 1, offset: .4 }, { opacity: 0 }], { duration: dur, fill: 'forwards' }));
    mini.animate([{ opacity: 0, transform: 'translateY(14px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 340, delay: dur * .45, easing: EASE, fill: 'backwards' });
  }
  woFxStart('drop', anims, () => { el.hidden = true; el.innerHTML = ''; el.inert = false; el.classList.remove('wo-card'); delete el.dataset.wk; sc.remove(); });
}
// one-at-a-time layout: the card you leave slides out one way while the next slides in from the other
function liftCard(card) {
  const main = card.parentElement, mr = main.getBoundingClientRect(), r = card.getBoundingClientRect();
  const dx = parseFloat((card.style.transform.match(/-?[\d.]+/) || [0])[0]) || 0, op = card.style.opacity === '' ? 1 : +card.style.opacity;
  const box = document.createElement('div');
  box.className = 'card-ghost';
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText = `left:${mr.left}px;top:${mr.top}px;width:${mr.width}px;height:${mr.height}px`;
  card.removeAttribute('id');
  card.style.cssText = `position:absolute;margin:0;left:${r.left - dx - mr.left}px;top:${r.top - mr.top}px;width:${r.width}px`;
  box.append(card);
  document.body.append(box);
  return { box, card, dx, op };
}
function cardIn(card, g, back) {
  const dir = (back ? -1 : 1) * (RTL ? -1 : 1), W = card.offsetWidth || innerWidth, c = calm();
  if (g) {
    const a = g.card.animate(c ? [{ opacity: g.op }, { opacity: 0 }] : [{ transform: `translateX(${g.dx}px)`, opacity: g.op }, { transform: `translateX(${-dir * Math.max(W * .55, Math.abs(g.dx) + 60)}px)`, opacity: 0 }], { duration: c ? 160 : 340, easing: EASE, fill: 'forwards' });
    a.onfinish = a.oncancel = () => g.box.remove();
  }
  card.animate(c ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: `translateX(${dir * Math.min(W * .4, 160)}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: c ? 200 : 440, easing: EASE });
}

function renderMini() {
  const el = $('#mini');
  const w = state.active;
  if (!w || !ui.woHidden) { el.hidden = true; document.body.classList.remove('has-mini'); return; }
  el.hidden = false;
  document.body.classList.add('has-mini');
  const { done, total } = woTally(w);
  el.innerHTML = `<button class="mini-btn" data-a="resume"><span class="live-dot"></span><span class="mini-name">${esc(w.mode === 'edit' ? T('Editing {name}', { name: w.name }) : w.name)}</span><span class="mini-meta">${w.mode === 'edit' ? '' : `<span data-clock>${fmtClock((Date.now() - w.start) / 1000)}</span> · `}${T('{done}/{total} sets', { done, total })}</span><span class="mini-go">${T('Resume')} ${icon('up')}</span></button>`;
}

/* ============================== Welcome (first time on a device) ============================== */

function welcomeSheet() {
  let step = 'start';
  const done = () => { state.flags.welcomed = 1; save(true); };

  // "Set me up" runs the guide's questions in this same sheet; backing out of the first one comes back here
  const G = guideFlow('start', def => { done(); closeSheet(def); }, def => { step = 'start'; refreshSheet(def); });
  openSheet({
    full: true, cls: 'welcome',
    render: () => step === 'guide' ? G.view() : step === 'start' ? `${sheetHead('', `<button class="btn ghost sm" data-a="sheetClose">${T('Skip')}</button>`, `<div class="seg sm lang-seg" role="group" aria-label="${T('Language')}">${[['en', 'English'], ['ar', 'العربية']].map(([v, l]) => `<button class="${LANG === v ? 'on' : ''}" data-a="setLang" data-v="${v}" lang="${v}">${l}</button>`).join('')}</div>`)}<div class="sheet-body pad welcome-b">
        <div class="welcome-mark" aria-hidden="true">${plateMark()}</div>
        <h1 class="welcome-h">${T('Welcome to Lifting Sanity')}</h1>
        <ul class="welcome-points">
          <li>${icon('check')}<span>${T('<b>Log fast.</b> A set done as planned is one tap.')}</span></li>
          <li>${icon('chart')}<span>${T('<b>See your progress.</b> Records, estimated 1RM and weekly volume, worked out by rules you can read.')}</span></li>
          <li>${icon('lock')}<span>${T('<b>Your data stays on this phone.</b> No account, nothing sent anywhere. Back it up to a file whenever you like.')}</span></li>
        </ul>
        <div class="welcome-unit"><b>${T('Weights in')}</b><div class="seg" role="group">${['kg', 'lb'].map(u => `<button class="${state.settings.unit === u ? 'on' : ''}" data-a="wUnit" data-v="${u}" aria-pressed="${state.settings.unit === u}">${term(u)}</button>`).join('')}</div></div>
        <p class="eyebrow">${T('How do you want to start?')}</p>
        <div class="welcome-opts">
          <button class="welcome-opt rec" data-a="wGuide">${icon('list')}<span><b>${T('Set me up')} <span class="rec-pill">${T('Recommended')}</span></b><small>${T('Five quick questions, then a plan and settings that fit you')}</small></span>${icon('right', 'chev')}</button>
          <button class="welcome-opt" data-a="wPlans">${icon('calendar')}<span><b>${T('Pick a ready-made plan')}</b><small>${T('Push / pull / legs, upper / lower, full body and more')}</small></span>${icon('right', 'chev')}</button>
          <button class="welcome-opt" data-a="wOwn">${icon('edit')}<span><b>${T('Build my own')}</b><small>${T('Your own days and exercises, from a library of {n}', { n: LIB.length.toLocaleString(LOC) })}</small></span>${icon('right', 'chev')}</button>
          <button class="welcome-opt" data-a="wLook">${icon('play')}<span><b>${T('Look around first')}</b><small>${T('With 8 weeks of sample workouts, easy to remove later')}</small></span>${icon('right', 'chev')}</button>
          <label class="welcome-opt">${icon('upload')}<span><b>${T('I have a backup')}</b><small>${T('A file saved from this app on another device')}</small></span>${icon('right', 'chev')}<input type="file" accept=".json,application/json" data-f="importFile" hidden></label>
        </div>
      </div>`
      : `${sheetHead(T('Pick a plan'), '', `<button class="btn ghost sm" data-a="wBack">${T('{icon}Back', { icon: icon('left') })}</button>`)}<div class="sheet-body pad">
        <p class="muted">${T('You can change the exercises, sets and rest in any of them later, or switch plans.')}</p>
        ${planBrowser()}</div>`,
    actions: {
      ...G.actions,
      wGuide: (b, def) => { step = 'guide'; G.begin(def); },
      wUnit: (b, def) => { ACT.setUnit(b); refreshSheet(def); },
      wPlans: (b, def) => { step = 'plans'; refreshSheet(def); },
      wBack: (b, def) => { step = 'start'; refreshSheet(def); },
      planOpen: (b, def) => planSheet(b.dataset.id, { onUse: (p, v, d2) => {
        installProgram(p, true, false, v);
        done(); closeSheet(d2); closeSheet(def); render();
        toast(T('{name} is your plan. Tap Start when you’re at the gym.', { name: p.name }));
      } }),
      wOwn: (b, def) => { done(); closeSheet(def); render(); splitEditor(null); },
      wLook: (b, def) => { done(); closeSheet(def); loadSamples(); }
    },
    onInput: (el, def) => { if (el.dataset.f === 'importFile') { done(); closeSheet(def); readBackupFile(el); } else G.onInput(el, def); },
    onClose: () => { if (!state.flags.welcomed) done(); }
  });
}

/* ============================== Guide ============================== */
// for new people (and anyone, from Settings → Guide): a few questions, a plan and settings that fit the answers, and
// three ways to learn the rest: a short tour, a tip the first time each part is opened, or nothing. The questions are
// remembered (state.profile), so the guide can say what it based things on.
const GUIDE_Q = () => [
  { k: 'level', h: T('How long have you been lifting?'), why: T('So the plan, the tips and the words fit where you are.'), opts: [
    ['new', T('Just starting'), T('Or coming back after a long break')],
    ['some', T('Up to two years'), T('You know the main lifts')],
    ['exp', T('More than two years'), T('You plan your own training')]] },
  { k: 'goal', h: T('What matters most right now?'), why: T('It sets your rest times and which plan comes first.'), opts: [
    ['muscle', T('Building muscle'), T('Size and shape')],
    ['strength', T('Getting stronger'), T('Lifting heavier on the big lifts')],
    ['health', T('Fitness and health'), T('Feeling good and keeping it up')]] },
  { k: 'days', h: T('How many days a week can you train?'), why: T('Pick what you can keep up most weeks, not your best week.'), opts: [2, 3, 4, 5, 6].map(n => [String(n), String(n), '']) },
  { k: 'kit', h: T('Where do you train?'), why: T('So every exercise in your plan is one you can do.'), opts: [
    ['gym', T('In a gym'), T('Barbells, machines and cables')],
    ['db', T('At home'), T('Dumbbells and a bench')]] },
  { k: 'learn', h: T('How do you like to learn a new app?'), why: T('You can change this any time in Settings → Guide.'), opts: [
    ['tour', T('Show me around'), T('A short tour of what the app does')],
    ['tips', T('Tips as I go'), T('A short tip the first time you open each part')],
    ['self', T('I’ll explore'), T('No tips; the guide stays in Settings')]] }
];
// the answers in a line ("Just starting · Building muscle · 3 days a week · In a gym")
const guideSaid = a => GUIDE_Q().slice(0, 4).map(q => q.k === 'days' ? (a.days ? TN(+a.days, '{n} day a week', '{n} days a week') : '') : (q.opts.find(o => o[0] === a[q.k]) || [0, ''])[1]).filter(Boolean).join(' · ');
// the days a week each ready-made plan is built for
const PLAN_DAYS = Object.fromEntries(PROGRAMS.map(p => [p.id, p.week || [3]]));
// the plans for each goal and level, best first (5×5, PHUL and PHAT are the strength plans; the rest come up as plans
// that use the days you have)
const PLAN_PREFS = {
  strength: { new: ['5x5', 'fb', 'fb2', 'ulf', 'ul'], some: ['phul', '5x5', 'ul', 'ulppl', 'ap', 'ulf', 'fb2'], exp: ['phul', 'phat', '5x5', 'ul', 'ul6', 'ap6', 'ulppl', 'fb2'] },
  muscle: { new: ['fb', 'fb2', 'ulf', 'ul'], some: ['ul', 'ulf', 'ap', 'tl', 'ulppl', 'ppl', 'fb', 'fb2'], exp: ['ulf', 'ppl', 'ul', 'ap', 'ulppl', 'ul6', 'ap6', 'arnold', 'tl', 'fb2'] },
  health: { new: ['fb', 'fb2', 'ulf', 'ul'], some: ['fb', 'ulf', 'ul', 'fb2'], exp: ['ul', 'ulf', 'fb', 'ap', 'fb2'] }
};
const STRENGTH_PLANS = new Set(['5x5', 'phul', 'phat']);
const fitsDays = (id, n) => PLAN_DAYS[id].includes(n);
// "3", "3 or 4", "2 to 4"
const daysText = ds => ds.length === 1 ? String(ds[0]) : ds.length === 2 ? T('{a} or {b}', { a: ds[0], b: ds[1] }) : T('{a} to {b}', { a: ds[0], b: ds[ds.length - 1] });
// when a plan isn't built for the days you have, it says so and why
function guideDaysNote(id, d, level, goal) {
  const ds = PLAN_DAYS[id], p = PROGRAMS.find(x => x.id === id);
  if (!ds || !p || ds.includes(d)) return '';
  const v = { plan: p.name, m: daysText(ds), n: d };
  if (d > ds[ds.length - 1]) return `${T('{plan} trains {m} days a week, fewer than the {n} you have.', v)} ${level === 'new' ? T('When you’re starting, that’s plenty: lifts improve with rest in between. Add days once it feels easy to keep up.') : goal === 'strength' ? T('Heavy training needs recovery more than extra sessions; use the other days for walking, mobility or rest.') : T('Use the other days for rest or something light, or pick a plan below that trains more often.')}`;
  if (d < ds[0]) return T('{plan} is made for {m} days a week. On {n}, go through its days in order: each one still comes round, just less often.', v);
  return T('{plan} is made for {m} days a week. On {n}, go through its days in order and they rotate across the week.', v);
}
// the plans that fit the answers, best first, each with a note when it isn't built for the days you have
function guidePick(a) {
  const d = +a.days || 3, level = a.level || 'some', goal = a.goal || 'muscle';
  const note = id => guideDaysNote(id, d, level, goal);
  if (a.kit === 'db') return [{ id: 'db', note: note('db') }];
  const prefs = PLAN_PREFS[goal][level];
  // someone just starting is pointed to four days at most; more comes later
  const want = level === 'new' ? Math.min(d, 4) : d;
  // closest to the days wanted; on two days, whole-body plans first (each session works everything); on a tie, one
  // that can use all the days, then the goal's order
  const near = (id, n) => Math.min(...PLAN_DAYS[id].map(x => Math.abs(x - n)));
  const whole = id => (['fb', 'fb2', 'fbeod', '5x5'].includes(id) ? 0 : 1);
  const rank = (id, n) => [n < 3 ? whole(id) : 0, near(id, n), PLAN_DAYS[id].some(v => v >= n) ? 0 : 1];
  const cmp = n => (x, y) => { const a = rank(x, n), b = rank(y, n); return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]; };
  const best = (ids, n) => ids.find(id => fitsDays(id, n)) || [...ids].sort(cmp(n))[0];
  // for strength, the strength plans come first even when they're built for fewer days (and say why)
  const main = best(goal === 'strength' ? prefs.filter(id => STRENGTH_PLANS.has(id)) : prefs, want);
  // then one that uses every day you have, if the first doesn't, and the next best for the goal
  const suits = id => LEVEL_RANK[(PROGRAMS.find(x => x.id === id) || {}).level || 'some'] <= LEVEL_RANK[level];
  const every = fitsDays(main, d) ? null : [...prefs, 'ppl', 'ul', 'ulppl', 'ul6', 'ap6', 'bro', 'arnold'].find(id => id !== main && fitsDays(id, d) && suits(id));
  const rest = prefs.filter(id => id !== main && id !== every).sort((x, y) => (fitsDays(y, want) ? 1 : 0) - (fitsDays(x, want) ? 1 : 0) || (want < 3 ? whole(x) - whole(y) : 0));
  const alts = [every, ...rest.filter(id => fitsDays(id, want)), ...rest].filter((id, i, all) => id && all.indexOf(id) === i).slice(0, 2);
  return [main, ...alts].map(id => ({ id, note: note(id) }));
}
const guidePlans = a => guidePick(a).map(p => p.id);
const GUIDE_WHY = () => Object.fromEntries(PROGRAMS.map(p => [p.id, p.why || '']));
// settings that fit the answers: rest by goal, and effort tracking once you can judge it
const guideSettings = a => ({ rest: a.goal === 'strength' ? 180 : a.goal === 'health' ? 90 : 120, effort: a.level === 'new' ? 'off' : 'rir' });
const GUIDE_TOUR = () => [
  { icon: 'check', h: T('Log a set in one tap'), pts: [T('Each set shows what to aim for, from your plan and from last time. Did it? Tap ✓.'), T('Something different? Tap the number and type it on the number pad.'), T('The rest timer starts by itself. −15 and +15 change it.')],
    note: { new: T('New to this? Start lighter than you think and focus on clean reps. The app suggests when to add weight.'), exp: T('Warm-up, top, back-off, drop and failure sets, supersets and one side at a time are all there: tap a set’s marker or the ⋯ menu.') } },
  { icon: 'calendar', h: T('A plan that keeps up with you'), pts: [T('Your plan is a list of days. Train shows the next one; tap Start.'), T('Change the exercises, sets, reps and rest in any day, or switch plans. Your history stays.'), T('Plan review checks your week against the research: sets per muscle, effort and rest.')],
    note: { new: T('Stick with one plan for a couple of months before changing it: that’s when progress shows.'), exp: T('Start a new block when you change plans: the earlier one is kept to compare with.') } },
  { icon: 'chart', h: T('See your progress'), pts: [T('Records for the heaviest set, estimated 1RM, most reps and volume, marked as they happen.'), T('A chart for every exercise, and your weekly sets per muscle.'), T('A fresh start on one exercise, or a new block, keeps everything that came before.')],
    note: { new: T('Early on, nearly every week brings a record. They come slower later, and that’s normal.'), exp: T('Estimated 1RM lets you compare sets of different reps; it’s worked out only from sets of 12 reps or fewer.') } },
  { icon: 'flask', h: T('Learn as you lift'), pts: [T('Every exercise has how-to steps and a picture of the muscles it works.'), T('An estimate of how well it builds muscle, from its mechanics, with the studies behind it or marked as a rule of thumb.'), T('For a machine, say where it feels hardest and the estimate follows.')],
    note: { new: T('Not sure how to do a lift? Tap its picture during a workout for the steps.'), exp: T('A lower estimate isn’t a reason to drop a lift you progress well on; it’s a hint, not a rule.') } },
  { icon: 'lock', h: T('Your data stays yours'), pts: [T('No account and nothing sent anywhere. It all stays on this phone and works with no signal.'), T('A copy is kept each day for the last five days, and you can save a backup file any time.'), T('Settings shows when you last backed up, and reminds you now and then.')] },
  { icon: 'sliders', h: T('Make it yours'), pts: [T('Clean or Y2K style, kg or lb, English or Arabic.'), T('One exercise at a time with big buttons, or all of them in a list.'), T('Settings → Guide brings all of this back, with the words you’ll see explained.')] }
];
// short answers to questions people ask, each with the studies behind it
const GUIDE_FACTS = () => [
  [T('Taking a break'), T('A few weeks off costs little: in one study, 3-week breaks every 6 weeks ended with the same muscle and strength as training straight through. Strength lasts longer than size, and both come back quickly. Start a little lighter for your first session or two back (a rule of thumb).'), ['ogasawara2013']],
  [T('Protein'), T('Eating more protein adds a little muscle and strength on top of training. The benefit levelled off around 1.6 g per kg of body weight a day, about 110 g for someone of 70 kg. Training itself matters far more.'), ['morton2018']],
  [T('Over 65'), T('Strength and muscle respond to training at any age. The same plans work: start lighter, aim for 2 to 3 sessions a week with 2 to 3 sets for each muscle, and build up steadily. With a health condition, check with your doctor first.'), ['fragala2019']],
  [T('Women'), T('The same plans work. Women gain muscle at about the same rate as men relative to where they start, and there’s no need to plan training around the menstrual cycle; ease off on days you feel worse.'), ['refalo2025', 'colensosemple2023']],
  [T('Deloads'), T('An easier week now and then is common practice, not a proven need: a week off mid-block didn’t cost trained lifters any muscle, though lower-body strength gains slowed. Take one when you feel run down, and cut sets rather than stopping.'), ['coleman2024']],
  [T('Rep speed'), T('Anything from about half a second to 8 seconds a rep grows muscle about the same. Lift with intent, lower with control, and skip very slow reps of 10 seconds or more.'), ['schoenfeld2015t']],
  [T('Machines or free weights'), T('Muscle grows about as well on either. Strength carries over best to what you train, so practise a barbell lift if you want to test it.'), ['haugen2023']],
  [T('Training to failure'), T('Sets don’t need to go to failure. Stopping 1 to 2 reps short grew muscle as well in trained lifters, with less fatigue.'), ['refalo2024', 'refalo2023']]
];
const GUIDE_WORDS = () => [
  [T('Working set'), T('A set that counts: the hard sets after your warm-ups. Plans, records and weekly sets use these.')],
  [T('Warm-up'), T('Lighter sets to get ready. They’re left out of volume, set counts and records.')],
  [term('RIR'), `${T('Reps in reserve: how many more reps you could have done. 0 is to failure; 1 to 3 is the usual aim.')} ${T('Most people guess about one rep low at first; it gets easier with practice.')}`],
  [term('RPE'), T('How hard a set was, out of 10. RPE 8 is about two reps left.')],
  [T('Est. 1RM'), T('The most you could likely lift once, worked out from a set of up to 12 reps. It lets you compare sets with different reps.')],
  [T('Volume'), T('Weight times reps, added up. For growth, the number of hard sets per muscle each week matters more.')],
  [T('Superset'), T('Two exercises done back to back, resting after both. Saves time.')],
  [T('Top set'), T('Your heaviest set of the day, usually followed by lighter back-off sets.')],
  [T('Drop set'), T('Straight after a set, take weight off and keep going.')],
  [T('Progressive overload'), T('Doing a little more over time: more weight, reps or sets. The app suggests the next step.')],
  [T('Split'), T('Your plan: the days you go through in order.')],
  [T('Template'), T('One day of your plan: its exercises, sets, reps and rest.')],
  [T('Block'), T('A stretch of training you look at as a whole. Start a new one when you change plans or come back from a break.')]
];
// the guide's steps, shared by the welcome and Settings → Guide; `done(def)` runs when it's finished
function guideFlow(home, done, exit) {
  const g = { step: home, i: 0, card: 0, a: Object.assign({}, state.profile || {}), useSet: true };
  const focusHead = def => setTimeout(() => { const h = def.el && def.el.querySelector('#guideH'); if (h) h.focus({ preventScroll: true }); }, 60);
  const show = (def, step, extra) => { Object.assign(g, { step }, extra || {}); refreshSheet(def); const b = def.el && def.el.querySelector('.sheet-body'); if (b) b.scrollTop = 0; focusHead(def); };
  const backBtn = (a = 'gBack') => `<button class="btn ghost sm" data-a="${a}">${T('{icon}Back', { icon: icon('left') })}</button>`;
  const dots = (n, cur) => `<div class="guide-dots" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<i class="${k < cur ? 'done' : k === cur ? 'on' : ''}"></i>`).join('')}</div>`;
  // someone just starting at a gym gets each plan's machine version
  const versionOf = p => p.machine && g.a.level === 'new' && g.a.kit !== 'db' ? 'machine' : 'free';
  const planCard = (id, main, note) => {
    const p = PROGRAMS.find(x => x.id === id); if (!p) return '';
    const days = p.days.filter(d => !isRest(d)).length, v = versionOf(p);
    return `<article class="guide-plan${main ? ' main' : ''}"><div><b>${esc(p.name)}</b><span class="muted">${p.freq ? esc(p.freq) : TN(days, '{n} training day', '{n} training days')}${v === 'machine' ? ` · ${T('Machine version')}` : ''}</span>${main ? '' : `<p class="muted small">${GUIDE_WHY()[id] || ''}</p>`}${note ? `<p class="small guide-days" data-days-note>${icon('calendar', 'inline')} ${note}</p>` : ''}</div>
      <div class="guide-plan-btns"><button class="btn sm${main ? ' primary' : ''}" data-a="gUse" data-id="${id}" data-v="${v}">${main ? T('Use this plan') : T('Use this')}</button><button class="btn sm ghost" data-a="gSee" data-id="${id}" data-v="${v}" aria-label="${T('See {name}', { name: esc(p.name) })}">${T('See the plan')}</button></div></article>`;
  };
  const view = () => {
    const Q = GUIDE_Q();
    if (g.step === 'q') {
      const q = Q[g.i];
      return `${sheetHead('', `<button class="btn ghost sm" data-a="gSkipQ">${T('Skip')}</button>`, backBtn())}
      <div class="sheet-body pad guide">
        <p class="guide-step">${T('Question {n} of {total}', { n: g.i + 1, total: Q.length })}</p>${dots(Q.length, g.i)}
        <h2 class="guide-h" id="guideH" tabindex="-1">${q.h}</h2>
        <p class="muted guide-why">${q.why}</p>
        <div class="guide-opts${q.k === 'days' ? ' row' : ''}" role="radiogroup" aria-labelledby="guideH">${q.opts.map(([v, l, sub]) => `<button class="guide-opt${g.a[q.k] === v ? ' on' : ''}" role="radio" aria-checked="${g.a[q.k] === v}" data-a="gAns" data-v="${v}"><b>${l}</b>${sub ? `<small>${sub}</small>` : ''}</button>`).join('')}</div>
      </div>`;
    }
    if (g.step === 'result') {
      const pick = guidePick(g.a), ids = pick.map(x => x.id), set = guideSettings(g.a), lv = g.a.level || 'some';
      const said = guideSaid(g.a);
      return `${sheetHead(T('Your plan'), '', backBtn())}
      <div class="sheet-body pad guide">
        <p class="guide-step">${T('From your answers: {list}', { list: esc(said) })}</p>
        <h2 class="guide-h" id="guideH" tabindex="-1">${esc((PROGRAMS.find(p => p.id === ids[0]) || {}).name || '')}</h2>
        <p class="guide-lead">${GUIDE_WHY()[ids[0]] || ''}</p>
        ${pick[0].note ? `<p class="guide-note days" data-days-note>${icon('calendar')}<span>${pick[0].note}</span></p>` : ''}
        ${lv === 'new' ? `<p class="guide-note">${icon('info')}<span>${T('Start lighter than you think and learn each lift. Adding weight comes quickly at first.')}</span></p>` : ''}
        ${versionOf(PROGRAMS.find(p => p.id === ids[0]) || {}) === 'machine' ? `<p class="guide-note machine" data-machine-note>${icon('dumbbell')}<span>${T('This is the machine version: machines and cables in place of barbell, dumbbell and pull-up lifts while you learn. Muscle grows about as well either way ({ref}). Move to free weights in one tap from your split when you’re ready.', { ref: refLink('haugen2023') })}${g.a.goal === 'strength' ? ` ${T('Strength carries over best to the lift you train, so move to free weights before you test a barbell max.')}` : ''}</span></p>` : ''}
        ${planCard(ids[0], true)}
        <div class="guide-set" role="group" aria-label="${T('Settings that fit your answers')}">
          <p class="eyebrow">${T('Settings that fit your answers')}</p>
          <p>${icon('timer')}<span><b>${T('Rest between sets: {time}', { time: fmtRest(set.rest) })}</b><small>${set.rest >= 180 ? T('Heavy sets need longer rests to do your best on the next one.') : set.rest <= 90 ? T('Shorter rests keep sessions quick; take longer on the big lifts if you need to.') : T('Long enough to do well on the next set, short enough to keep moving.')}</small></span></p>
          <p>${icon('flame')}<span><b>${set.effort === 'off' ? T('Effort tracking: off for now') : T('Effort tracking: {name}', { name: term('RIR') })}</b><small>${set.effort === 'off' ? T('One thing less to log while you learn. Turn it on in Settings once you can tell how many reps you have left.') : T('After a set, note how many more reps you could have done. It shows how hard you’re really training.')}</small></span></p>
          <label class="guide-check"><input type="checkbox" data-f="gUseSet" ${g.useSet ? 'checked' : ''}><span>${T('Use these settings')}</span></label>
        </div>
        ${ids.length > 1 ? `<p class="eyebrow">${T('Also a good fit')}</p>${pick.slice(1).map(x => planCard(x.id, false, x.note)).join('')}` : ''}
        <div class="guide-more">
          <button class="btn ghost" data-a="gOwn">${icon('edit')}${T('Build my own instead')}</button>
          <button class="btn ghost" data-a="gAll">${icon('calendar')}${T('See every plan')}</button>
        </div>
      </div>`;
    }
    if (g.step === 'tour') {
      const T_ = GUIDE_TOUR(), c = T_[g.card], lv = g.a.level === 'new' ? 'new' : g.a.level === 'exp' ? 'exp' : null, last = g.card === T_.length - 1;
      return `${sheetHead(T('Tour'), `<button class="btn ghost sm" data-a="gEnd">${T('Close')}</button>`, g.card ? backBtn('gPrev') : '')}
      <div class="sheet-body pad guide">
        <p class="guide-step">${T('Part {n} of {total}', { n: g.card + 1, total: T_.length })}</p>${dots(T_.length, g.card)}
        <div class="guide-card">${icon(c.icon, 'guide-ic')}
          <h2 class="guide-h" id="guideH" tabindex="-1">${c.h}</h2>
          <ul>${c.pts.map(p => `<li>${p}</li>`).join('')}</ul>
          ${c.note && (c.note[lv] || (!lv && c.note.new)) ? `<p class="guide-note">${icon('info')}<span>${c.note[lv] || c.note.new}</span></p>` : ''}
        </div>
        <div class="guide-nav">${last ? `<button class="btn ghost" data-a="gWords">${T('Words you’ll see')}</button><button class="btn primary" data-a="gEnd">${T('Done')}</button>` : `<button class="btn primary wide" data-a="gNext">${T('Next')}</button>`}</div>
      </div>`;
    }
    if (g.step === 'facts') {
      return `${sheetHead('', `<button class="btn ghost sm" data-a="gEnd">${T('Close')}</button>`, backBtn('gHub'))}
      <div class="sheet-body pad guide">
        <h2 class="guide-h" id="guideH" tabindex="-1">${T('What the research says')}</h2>
        <p class="muted">${T('Short answers to questions people often have, with the studies behind them.')}</p>
        <dl class="guide-words guide-facts">${GUIDE_FACTS().map(([w, d, refs]) => `<div><dt>${w}</dt><dd>${d}<span class="rv-src"><span class="basis study">${icon('flask')}${T('Studies')}</span>${refs.map(refLink).join('<span class="dot"> · </span>')}</span></dd></div>`).join('')}</dl>
      </div>`;
    }
    if (g.step === 'words') {
      return `${sheetHead('', `<button class="btn ghost sm" data-a="gEnd">${T('Close')}</button>`, backBtn(home === 'hub' ? 'gHub' : 'gBackTour'))}
      <div class="sheet-body pad guide">
        <h2 class="guide-h" id="guideH" tabindex="-1">${T('Words you’ll see')}</h2>
        <dl class="guide-words">${GUIDE_WORDS().map(([w, d]) => `<div><dt>${w}</dt><dd>${d}</dd></div>`).join('')}</dl>
      </div>`;
    }
    // hub: Settings → Guide
    const p = state.profile, said = p ? guideSaid(p) : '';
    return `${sheetHead(T('Guide'))}
    <div class="sheet-body pad guide">
      <h2 class="guide-h" id="guideH" tabindex="-1">${T('Get to know Lifting Sanity')}</h2>
      <p class="muted">${T('Pick whatever suits you; all of it can be opened again here.')}</p>
      ${said ? `<p class="guide-step">${T('You told us: {list}', { list: esc(said) })}</p>` : ''}
      <div class="welcome-opts">
        <button class="welcome-opt" data-a="gStart">${icon('list')}<span><b>${T('Find a plan that fits')}</b><small>${T('Five quick questions, then a plan and settings to match')}</small></span>${icon('right', 'chev')}</button>
        <button class="welcome-opt" data-a="gTour">${icon('play')}<span><b>${T('Tour of the app')}</b><small>${T('What it does, in six short parts')}</small></span>${icon('right', 'chev')}</button>
        <button class="welcome-opt" data-a="gWords">${icon('note')}<span><b>${T('Words you’ll see')}</b><small>${T('RIR, 1RM, working sets, supersets and more, in plain words')}</small></span>${icon('right', 'chev')}</button>
        <button class="welcome-opt" data-a="gFacts">${icon('flask')}<span><b>${T('What the research says')}</b><small>${T('Breaks, protein, age, women, deloads, rep speed and more')}</small></span>${icon('right', 'chev')}</button>
        <button class="welcome-opt" data-a="gTips" aria-pressed="${!!state.flags.tips}">${icon('info')}<span><b>${T('Tips as you go')}</b><small>${state.flags.tips ? T('On: a short tip the first time you open each part') : T('Off: tap to turn on, and see each tip once more')}</small></span><span class="switch${state.flags.tips ? ' on' : ''}" aria-hidden="true"><span></span></span></button>
      </div>
    </div>`;
  };
  const answer = (def, v) => {
    const Q = GUIDE_Q(), q = Q[g.i];
    g.a[q.k] = v; refreshSheet(def);
    // a moment to see the choice, then on to the next question
    setTimeout(() => { if (!def.el || !def.el.isConnected) return; if (g.i < Q.length - 1) show(def, 'q', { i: g.i + 1 }); else show(def, 'result'); }, calm() ? 0 : 180);
  };
  const finishSetup = (def, id, version) => {
    state.profile = Object.assign({}, g.a, { at: Date.now() });
    ui.planF = null; // the plan list starts from the new answers
    if (g.useSet) { const s = guideSettings(g.a); state.settings.rest = s.rest; state.settings.effort = s.effort; }
    state.flags.tips = g.a.learn === 'tips' ? 1 : 0;
    if (state.flags.tips) state.flags.tipSeen = {};
    const p = id && PROGRAMS.find(x => x.id === id);
    if (p) { const have = splitOfPlan(p, version); if (have) state.activeSplit = have.id; else installProgram(p, true, false, version); }
    save(true);
    if (g.a.learn === 'tour') { show(def, 'tour', { card: 0 }); render(); return; }
    done(def); render();
    if (p) toast(T('{name} is your plan. Tap Start when you’re at the gym.', { name: p.name }));
  };
  const actions = {
    gStart: (b, def) => show(def, 'q', { i: 0 }),
    gAns: (b, def) => answer(def, b.dataset.v),
    gBack: (b, def) => { if (g.step === 'result') show(def, 'q', { i: GUIDE_Q().length - 1 }); else if (g.i > 0) show(def, 'q', { i: g.i - 1 }); else if (home === 'hub') show(def, 'hub'); else exit(def); },
    gSkipQ: (b, def) => { const Q = GUIDE_Q(); if (g.i < Q.length - 1) show(def, 'q', { i: g.i + 1 }); else show(def, 'result'); },
    gUse: (b, def) => finishSetup(def, b.dataset.id, b.dataset.v),
    gSee: (b, def) => planSheet(b.dataset.id, { version: b.dataset.v, onUse: (p, v, d2) => { closeSheet(d2); finishSetup(def, p.id, v); } }),
    gOwn: (b, def) => { g.a.learn = g.a.learn === 'tour' ? 'self' : g.a.learn; finishSetup(def, null); splitEditor(null); },
    gAll: (b, def) => { state.profile = Object.assign({}, g.a, { at: Date.now() }); ui.planF = null; save(); done(def); go_('train'); setTimeout(() => { const el = $('#plans'); if (el) el.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth' }); }, 400); },
    gTour: (b, def) => show(def, 'tour', { card: 0 }),
    gNext: (b, def) => show(def, 'tour', { card: Math.min(g.card + 1, GUIDE_TOUR().length - 1) }),
    gPrev: (b, def) => show(def, 'tour', { card: Math.max(0, g.card - 1) }),
    gWords: (b, def) => show(def, 'words'),
    gFacts: (b, def) => show(def, 'facts'),
    gBackTour: (b, def) => show(def, 'tour', { card: GUIDE_TOUR().length - 1 }),
    gHub: (b, def) => show(def, 'hub'),
    gEnd: (b, def) => done(def),
    gTips: (b, def) => { state.flags.tips = state.flags.tips ? 0 : 1; if (state.flags.tips) state.flags.tipSeen = {}; save(); refreshSheet(def); render(); renderWorkout(); }
  };
  const onInput = (el, def) => { if (el.dataset.f === 'gUseSet') g.useSet = el.checked; };
  return { g, view, actions, onInput, focusHead, begin: def => show(def, 'q', { i: 0 }) };
}
const go_ = tab => { if (ui.tab !== tab) go(tab); };
function guideSheet() {
  const G = guideFlow('hub', def => closeSheet(def), def => closeSheet(def));
  openSheet({ full: true, cls: 'welcome guide-sheet', render: G.view, actions: G.actions, onInput: G.onInput });
  const def = sheets[sheets.length - 1]; G.focusHead(def);
}
// tips as you go: a short note the first time each part is opened, until it's dismissed (Settings → Guide turns them on)
const TIPS = () => ({
  train: [T('This is your plan'), T('The next day is at the top: tap Start when you’re at the gym. Below it are the plan’s review, its days and other plans.')],
  workout: [T('Logging a set'), T('Tap ✓ when a set went as shown. Tap a number to change it first. Swipe a set sideways to delete it.')],
  history: [T('Every workout you’ve done'), T('Tap a day in the calendar, or a workout, to see every set. You can edit them or add one you forgot.')],
  library: [T('All the exercises'), T('Search, or filter by muscle and equipment. Tap one for how-to steps, its growth estimate and your history with it.')],
  progress: [T('Your progress'), T('Records and charts fill in as you log. Tap a lift for its chart; a fresh start on one exercise is here too.')],
  settings: [T('Back up now and then'), T('Your data lives only on this phone. Save a backup file to Files or iCloud Drive once in a while.')]
});
function tipHTML(id) {
  if (!state.flags.tips || (state.flags.tipSeen || {})[id]) return '';
  const t = TIPS()[id]; if (!t) return '';
  return `<aside class="tip-card" role="note" aria-label="${T('Tip')}">${icon('info')}<div><b>${t[0]}</b><p>${t[1]}</p><button class="link" data-a="tipsOff">${T('Turn tips off')}</button></div><button class="icon-btn" data-a="tipDone" data-id="${id}" aria-label="${T('Got it')}">${icon('x')}</button></aside>`;
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
  // a sheet opened over another one: the one below steps back a little
  const below = sheets[sheets.length - 1];
  if (below) below.el.classList.add('behind');
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
  // it slides all the way down before it goes (the page under it can be used straight away)
  const wrap = def.el, panel = $('.sheet', wrap);
  wrap.classList.remove('in');
  wrap.classList.add('out');
  wrap.inert = true;
  let gone = false;
  const rm = () => { if (!gone) { gone = true; wrap.remove(); } };
  panel.addEventListener('transitionend', e => { if (e.target === panel && e.propertyName === 'transform') rm(); });
  setTimeout(rm, 520);
  const top = sheets[sheets.length - 1];
  if (top) top.el.classList.remove('behind');
  if (def.onClose) def.onClose(def);
}
function closeAllSheets() { while (sheets.length) closeSheet(); }
function sheetHead(title, right = '', left = `<button class="btn ghost sm" data-a="sheetClose">${T('Close')}</button>`) {
  return `<header class="sheet-h">${left}<h2>${title}</h2><div class="sheet-h-r">${right}</div></header>`;
}
function confirmSheet({ title, text = '', ok = T('OK'), danger = false, cancel = T('Cancel'), onOk, extra = '' }) {
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
function inputSheet({ title, label, value = '', ok = T('Save'), multiline = false, onOk, placeholder = '' }) {
  return openSheet({
    cls: 'small', focus: '#sheetInput',
    render: () => `<div class="sheet-body pad confirm"><h2>${esc(title)}</h2>
      <label class="field"><span>${esc(label)}</span>${multiline
        ? `<textarea id="sheetInput" rows="4" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`
        : `<input id="sheetInput" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off" enterkeyhint="done">`}</label>
      <div class="row-btns"><button class="btn" data-a="sheetClose">${T('Cancel')}</button><button class="btn primary" data-a="ok">${esc(ok)}</button></div></div>`,
    actions: { ok: (t, def) => { onOk($('#sheetInput', def.el).value.trim()); closeSheet(def); } },
    onKey: (ev, def) => { if (ev.key === 'Enter' && !multiline && ev.target.id === 'sheetInput' && !ev.isComposing) { onOk($('#sheetInput', def.el).value.trim()); closeSheet(def); } }
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
// whole = counts like reps or seconds: lines at whole numbers only, so no label repeats
function niceTicks(min, max, count = 4, whole = false) {
  if (!(max > min)) { const p = Math.abs(max) * 0.1 || 1; min -= p; max += p; }
  const raw = (max - min) / count, mag = 10 ** Math.floor(Math.log10(raw)), n = raw / mag;
  const step = Math.max(whole ? 1 : 0, (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag);
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
  if (!pts.length) return `<p class="chart-empty">${esc(spec.empty || T('Nothing logged yet.'))}</p>`;
  let x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x));
  if (x1 - x0 < DAY) { x0 -= 3 * DAY; x1 += 3 * DAY; }
  const ys = pts.map(p => p.y), yMin = Math.min(...ys), yMax = Math.max(...ys), span = (yMax - yMin) || yMax * 0.1 || 1;
  const { lo, hi, ticks } = niceTicks(Math.max(0, yMin - span * 0.2), yMax + span * 0.12, 4, spec.whole);
  const X = v => P.l + (v - x0) / (x1 - x0) * (W - P.l - P.r);
  const Y = v => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  let g = '';
  // a label that rounds to the same text as the one below it is left off (its line stays)
  let lastLab = null;
  for (const t of ticks) {
    const lab = spec.tick ? spec.tick(t) : compact(t);
    g += `<line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${Y(t)}" y2="${Y(t)}"/>${lab === lastLab ? '' : `<text class="axis" x="${P.l - 8}" y="${Y(t) + 4}" text-anchor="end">${esc(lab)}</text>`}`;
    lastLab = lab;
  }
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
  if (!max) return `<p class="chart-empty">${esc(spec.empty || T('Nothing logged yet.'))}</p>`;
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
      html = `<b>${esc(spec.fmt(best.y))}</b><span>${best.dim ? T('{date} · earlier block', { date: esc(fmtDateY(best.x)) }) : esc(fmtDateY(best.x))}</span>`;
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
  const streak = streakWeeks();
  let h = `<header class="page-h"><div><p class="eyebrow">${esc(dfmt(Date.now(), { weekday: 'long', day: 'numeric', month: 'long' }))}</p><h1>${T('Train')}</h1></div>
    <div class="page-h-side">${streak ? `<span class="streak">${icon('flame')}${TN(streak, '<b>{n}</b> week', '<b>{n}</b> weeks')}</span>` : ''}<span class="sess">${T('Session <b>#{n}</b> next', { n: state.workouts.length + 1 })}</span></div></header>`;
  h += weekStrip();
  if (!storageOK) h += `<div class="notice bad">${icon('info')}<p>${T('This browser is blocking storage, so nothing you log will be kept. Open Lifting Sanity in Safari, or add it to your Home Screen.')}</p></div>`;
  h += installHint();
  h += backupNudge();
  if (state.active) {
    const w = state.active;
    h += `<button class="card resume" data-a="resume"><span class="live-dot"></span><span><b>${esc(w.mode === 'edit' ? T('Editing {name}', { name: w.name }) : T('{name} in progress', { name: w.name }))}</b><small>${w.mode === 'edit' ? T('{n} sets done', { n: woTally(w).done }) : T('{n} sets done · started {time}', { n: woTally(w).done, time: fmtTime(w.start) })}</small></span><span class="btn primary sm">${T('Resume')}</span></button>`;
  }
  h += split ? splitCard(split) : `<section class="card pad"><h2>${T('No split picked')}</h2><p class="muted">${T('Pick a ready-made split below, or build templates of your own.')}</p></section>`;
  h += `<div class="quick"><button class="btn wide" data-a="startEmpty">${icon('plus')}${T('Start an empty workout')}</button><button class="btn wide" data-a="newTpl">${icon('edit')}${T('New template')}</button></div>`;
  h += templatesSection(split);
  h += programLibrary();
  return h;
};
// this week at a glance: a dot for each day, filled on the days you trained
function weekStrip() {
  const ws = weekStart(Date.now()), today = dayStart(Date.now());
  const done = state.workouts.filter(w => w.start >= ws && w.end);
  const on = new Set(done.map(w => dayStart(w.start)));
  const vol = done.reduce((a, w) => a + workoutVolume(w), 0);
  return `<section class="week" aria-label="${T('This week')}"><div class="week-days">${Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws); d.setDate(d.getDate() + i); const t = d.getTime();
    return `<span class="wd ${on.has(t) ? 'on' : ''} ${t === today ? 'today' : ''} ${t > today ? 'later' : ''}"><small>${esc(dfmt(t, { weekday: 'narrow' }))}</small><b>${on.has(t) ? icon('check', 'thick') : d.getDate()}</b></span>`;
  }).join('')}</div><p class="week-sum">${vol ? TN(done.length, '<b>{n}</b> workout this week · <b>{vol}</b>', '<b>{n}</b> workouts this week · <b>{vol}</b>', { vol: esc(fmtVol(vol)) }) : TN(done.length, '<b>{n}</b> workout this week', '<b>{n}</b> workouts this week')}</p></section>`;
}
function installHint() {
  if (inFrame || !state.settings.installHint || navigator.standalone || matchMedia('(display-mode: standalone)').matches) return '';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/.test(navigator.userAgent);
  const how = ios ? T('Tap the Share button, then <b>Add to Home Screen</b>.') : android ? T('Open the browser’s <b>⋮</b> menu, then <b>Add to Home screen</b> or <b>Install app</b>.') : T('It’s made for your phone: open this page there and add it to your Home Screen.');
  return `<div class="notice">${icon('share')}<p>${T('<b>Add Lifting Sanity to your Home Screen.</b> {how} It opens full screen, works offline and keeps your data safe from the browser’s cleanup.', { how })}</p><button class="icon-btn" data-a="dismissInstall" aria-label="${T('Hide this tip')}">${icon('x')}</button></div>`;
}
// for a ready-made plan: which version it is, and the way to the other one
function splitVersionLine(split) {
  const p = split.programId && PROGRAMS.find(x => x.id === split.programId);
  if (!p || !p.machine) return '';
  return split.version === 'machine'
    ? `<p class="split-ver">${T('Machine version')} · <button class="link" data-a="splitVersion" data-id="${split.id}">${T('Move to free weights')}</button></p>`
    : `<p class="split-ver">${T('Free weights')} · <button class="link" data-a="splitVersion" data-id="${split.id}">${T('Switch to machines')}</button></p>`;
}
function splitCard(split) {
  const days = split.days.map(d => isRest(d) ? 'rest' : tplById(d) || null);
  const n = days.length, trainDays = days.filter(d => d && !isRest(d)).length, restDays = days.filter(isRest).length;
  if (!trainDays) return `<section class="card pad"><h2>${esc(split.name)}</h2><p class="muted">${T('This split has no training days yet.')}</p><button class="btn" data-a="splitEdit" data-id="${split.id}">${T('Add days')}</button></section>`;
  const st = splitToday(split), pos = st.idx;
  const t = days[pos] && !isRest(days[pos]) ? days[pos] : null;
  const last = t ? tplLastDone(t.id) : null;
  const est = t ? estMinutes(t) : 0;
  const head = !t ? '' : st.state === 'rest' ? `<p class="eyebrow good">${icon('moon')}${T('Rest day today')}</p><h3>${T('Recover')}</h3><p class="muted">${TN(t ? t.ex.length : 0, 'Next up: <b>{name}</b> {when} · {n} exercises', 'Next up: <b>{name}</b> {when} · {n} exercises', { name: esc(t ? t.name : ''), when: whenText(st.due) })}</p>`
    : st.state === 'done' ? `<p class="eyebrow good">${icon('check')}${T('Done for today')}</p><h3>${T('Nice work')}</h3><p class="muted">${st.rests ? TN(st.rests, 'Next up: <b>{name}</b> {when}, after a rest day', 'Next up: <b>{name}</b> {when}, after {n} rest days', { name: esc(t ? t.name : ''), when: whenText(st.due) }) : T('Next up: <b>{name}</b> {when}', { name: esc(t ? t.name : ''), when: whenText(st.due) })}</p>`
    : `<p class="eyebrow accent">${T('Up next · Day {day} of {n}', { day: pos + 1, n })}</p><h3>${esc(t.name)}</h3><div class="facts"><span>${icon('dumbbell')}${TN(t.ex.length, '{n} exercises', '{n} exercises')}</span><span>${icon('rows')}${TN(tplWorkingSets(t), '{n} working sets', '{n} working sets', { n: trimNum(tplWorkingSets(t), 1) })}</span><span>${icon('clock')}${TN(est, 'about {n} min', 'about {n} min')}</span><span>${icon('calendar')}${last ? T('last done {when}', { when: relDay(last.start) }) : T('not done yet')}</span></div>`;
  const strip = t ? t.ex.filter(x => artOf(x.exId) || photos.get(x.exId)).slice(0, 4) : [];
  return `<section class="split">
    <div class="split-h"><div><p class="eyebrow">${restDays ? TN(trainDays, 'Your split · {n} training day + {r} rest', 'Your split · {n} training days + {r} rest', { r: restDays }) : TN(trainDays, 'Your split · {n} training day', 'Your split · {n} training days')}</p><h2>${esc(split.name)}</h2>${splitVersionLine(split)}</div>
      <div class="split-actions"><button class="btn sm review-btn" data-a="planReview" data-id="${split.id}">${icon('flask')}${T('Review')}</button><button class="btn sm" data-a="splitSwitch">${icon('swap')}${T('Change')}</button><button class="btn sm" data-a="splitEdit" data-id="${split.id}">${icon('edit')}${T('Edit')}</button></div></div>
    ${t ? `<div class="upnext ${st.state === 'due' ? '' : 'resting'}">
      ${strip.length >= 3 ? `<div class="strip" aria-hidden="true">${strip.map(x => thumb(x.exId, 'tile')).join('')}</div>` : ''}
      <div class="upnext-b">${head}
      <ol class="ex-preview">${(ui.nextOpen ? t.ex : t.ex.slice(0, 5)).map(x => `<li><span>${thumb(x.exId, 'md')}<span class="exn"><b>${esc(getEx(x.exId).name)}</b><small>${esc(scheme(x.sets))}</small></span></span></li>`).join('')}</ol>
      ${t.ex.length > 5 ? `<button class="btn sm more-ex" data-a="nextOpen">${ui.nextOpen ? T('Show less') : T('Show all {n} exercises', { n: t.ex.length })}${icon(ui.nextOpen ? 'up' : 'down')}</button>` : ''}
      <button class="btn ${st.state === 'due' ? 'primary' : ''} big" data-a="startDay" data-split="${split.id}" data-day="${pos}">${icon('play')}${st.state === 'due' ? T('Start {name}', { name: esc(t.name) }) : T('Train anyway: start {name}', { name: esc(t.name) })}</button>
    </div></div>` : ''}
    <p class="eyebrow">${T('Any day, any time')}</p>
    <div class="days">${days.map((d, i) => !d ? '' : isRest(d)
      ? `<div class="day rest"><span class="day-n">${T('Day {n}', { n: i + 1 })}</span><b>${T('Rest')}</b><span class="muted">${T('recover')}</span></div>`
      : `<button class="day ${i === pos ? 'is-next' : ''}" data-a="dayPreview" data-split="${split.id}" data-day="${i}">
      <span class="day-n">${i === pos ? T('Day {n} · next', { n: i + 1 }) : T('Day {n}', { n: i + 1 })}</span><b>${esc(d.name)}</b><span class="muted">${(() => { const l = tplLastDone(d.id); return l ? relDay(l.start) : T('not done yet'); })()}</span></button>`).join('')}</div>
  </section>`;
}
/* ----- review the plan against the training literature ----- */
const MAJOR = ['chest', 'lats', 'upperback', 'frontdelts', 'sidedelts', 'reardelts', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'];
const COMPOUND = new Set(['pressHorizontal', 'pressVertical', 'row', 'pullVertical', 'squat', 'hinge']);
function planStats(split, perWeek) {
  const tpls = split.tpls || split.days.filter(d => !isRest(d)).map(tplById).filter(Boolean);
  const each = tpls.length ? perWeek / tpls.length : 0; // how often each training day comes round in a week
  const sets = {}, days = {}, ex = [];
  for (const t of tpls) {
    const hit = new Set();
    for (const x of t.ex) {
      const e = getEx(x.exId), n = liftSets(x.sets).filter(s => s.t !== 'W').length, a = sciOf(x.exId);
      ex.push({ t, x, e, n, a });
      sets[e.m] = (sets[e.m] || 0) + n * each;
      for (const m of e.sec) sets[m] = (sets[m] || 0) + 0.5 * n * each;
      if (n) hit.add(e.m);
    }
    for (const m of hit) days[m] = (days[m] || 0) + each;
  }
  return { tpls, sets, days, ex, each };
}
function guessPerWeek(split) {
  const train = split.days.filter(d => !isRest(d)).length;
  if (split.days.some(isRest)) return Math.round(train * 7 / split.days.length * 10) / 10;
  const recent = state.workouts.filter(w => w.start > Date.now() - 28 * DAY).length / 4;
  return recent >= 1 ? Math.round(recent) : Math.min(train, 4);
}
// the review's points for a split trained `perWeek` times a week, grouped by topic: { st, topics }; each point is
// { kind: fix | tip | good, text, refs } and says what it rests on: studies (linked) or a rule of thumb
function reviewTopics(split, perWeek) {
  const st = planStats(split, perWeek);
  const topics = [];
  let cur = null;
  const topic = (title, about) => topics.push(cur = { title, about, items: [], after: '' });
  const say = (kind, text, refs = []) => cur.items.push({ kind, text, refs });
  const name = m => esc(MUSCLES[m].toLowerCase());
  // in Arabic each item is set apart, so a list of English names still reads from right to left
  const list = a => a.map(x => RTL ? `<bdi>${x}</bdi>` : x).join(T(', '));
  // exercise names as links that wrap like words, so a full stop after a long name stays with it
  const exLink = e => `<a class="link" role="button" tabindex="0" data-a="openEx" data-id="${e.id}">${esc(e.name)}</a>`;
  const best = m => { const b = bestFor(m, 1)[0]; return b ? exLink(b) : ''; };
  const trained = MAJOR.filter(m => (st.sets[m] || 0) > 0), none = MAJOR.filter(m => !(st.sets[m] > 0));
  const helperOnly = trained.filter(m => !st.days[m]);
  // every muscle covered
  topic(T('Every muscle covered'), T('Each major muscle should have at least one exercise aimed at it. Muscles that only help in other exercises get less work than it looks.'));
  for (const m of none) say('fix', T('Nothing works the {muscle}, not even as a helper. A highly rated exercise for them: {ex}.', { muscle: name(m), ex: best(m) }));
  if (helperOnly.length) say('tip', T('Only worked as a helper, in exercises aimed at other muscles: {list}. An exercise aimed at them would grow them more, for example {ex}.', { list: list(helperOnly.map(m => T('{muscle} ({n} sets a week, each helper set counted as half)', { muscle: name(m), n: trimNum(st.sets[m], 1) }))), ex: helperOnly.map(best).filter(Boolean).slice(0, 2).join(T(' or ')) }), ['pelland2026']);
  if (!none.length && !helperOnly.length) say('good', T('Every major muscle has an exercise aimed at it.'));
  // weekly sets
  topic(T('Weekly sets per muscle'), T('How many hard sets each muscle gets in a week: the biggest single driver of growth. 10 to 20 is a common target.'));
  const low = trained.filter(m => st.sets[m] < 10), inRange = trained.filter(m => st.sets[m] >= 10 && st.sets[m] <= 20), high = trained.filter(m => st.sets[m] > 20);
  const withSets = ms => list(ms.map(m => `${name(m)} (${trimNum(st.sets[m], 1)})`));
  if (low.length) say('tip', T('Under 10 sets a week: {list}. That still builds muscle, but more sets would likely build more. One more working set on an exercise adds about {n} sets a week for its muscle.', { list: withSets(low), n: trimNum(st.each, 1) }), ['schoenfeld2017', 'pelland2026']);
  if (inRange.length) say('good', T('10 to 20 sets a week: {list}.', { list: list(inRange.map(name)) }), ['schoenfeld2017']);
  if (high.length) say('good', T('Over 20 sets a week: {list}. More can still help as long as you recover and keep the effort high, with smaller returns.', { list: withSets(high) }), ['pelland2026']);
  const muscles = Object.entries(st.sets).filter(([m, v]) => v > 0 && MUSCLES[m]).sort((a, b) => b[1] - a[1]);
  const maxV = Math.max(22, ...muscles.map(([, v]) => v));
  if (muscles.length) cur.after = `<div class="mbars">${muscles.map(([m, v]) => `<div class="mbar"><span class="mbar-l">${esc(MUSCLES[m])}</span><span class="mbar-t"><span class="band" style="left:${10 / maxV * 100}%;width:${10 / maxV * 100}%"></span><span class="fill" style="width:${Math.min(100, v / maxV * 100)}%"></span></span><span class="mbar-v">${trimNum(v, 1)}</span></div>`).join('')}</div>
    <p class="muted small rv-note">${T('Working sets a week. A set counts fully for its main muscle and half for helper muscles, the way that predicted growth best in the largest analysis so far ({ref}). Shaded band: 10 to 20 sets.', { ref: refLink('pelland2026') })}</p>`;
  // frequency
  topic(T('How often each muscle is trained'), T('With the same weekly sets, how many days you spread them over makes little difference to growth. More days keep each session shorter and help strength a little.'));
  const once = trained.filter(m => st.days[m] > 0 && st.days[m] < 1.5 && st.sets[m] >= 1);
  if (once.length) say('tip', T('Trained directly about once a week: {list}. That works if the weekly sets are there; spreading them over two days keeps sessions shorter and helps strength a little.', { list: list(once.map(name)) }), ['schoenfeld2019f', 'pelland2026']);
  else if (trained.length > helperOnly.length) say('good', T('Every muscle you aim an exercise at is trained about {n} times a week or more.', { n: trimNum(Math.min(...trained.filter(m => st.days[m]).map(m => st.days[m])), 1) }), ['schoenfeld2019f', 'pelland2026']);
  // effort
  topic(T('Effort'), T('How close to failure your working sets end. RIR is the reps you could still have done.'));
  const rirs = st.ex.flatMap(({ x }) => x.sets.filter(s => s.t !== 'W' && s.trir != null).map(s => s.trir));
  if (rirs.length) {
    const avg = rirs.reduce((a, b) => a + b, 0) / rirs.length, lo = Math.min(...rirs), hi = Math.max(...rirs);
    const aim = lo === hi ? TN(lo, 'Working sets aim to stop {n} rep short of failure.', 'Working sets aim to stop {n} reps short of failure.') : T('Working sets aim to stop {lo} to {hi} reps short of failure.', { lo, hi });
    if (avg <= 3) say('good', `${aim} ${T('Close to failure is where growth is best; going all the way on every set is optional.')}`, ['robinson2024', 'refalo2023', 'refalo2024']);
    else say('tip', `${aim} ${T('Growth tends to improve as sets end closer to failure; try 0 to 3 reps short.')}`, ['robinson2024']);
  } else say('tip', T('No target effort (RIR) is set on the working sets. Aim to stop 0 to 3 reps short of failure.'), ['robinson2024']);
  const heavyFail = st.ex.filter(o => o.a && COMPOUND.has(o.a.pattern) && o.x.sets.some(s => s.t !== 'W' && s.trir === 0 && parseInt(s.tr, 10) <= 6));
  if (heavyFail.length) say('tip', T('Heavy sets of big lifts planned to failure: {list}. Failure added little or nothing over stopping 1 to 2 reps short, and slows recovery for a day or two; leave a rep or two in the tank.', { list: list(heavyFail.map(o => esc(o.e.name))) }), ['refalo2024', 'grgic2022']);
  if (rirs.length) say('good', T('When you log RIR, most people guess about one rep low, more so on sets of over 12 reps. It gets easier with practice.'), ['halperin2022']);
  // exercise choice
  topic(T('Exercise choice'), T('Some versions of an exercise grew muscle more than others in direct comparisons. Scores are estimates from each exercise’s mechanics.'));
  const pats = new Set(st.ex.map(o => o.a && o.a.pattern));
  const names = re => st.ex.filter(o => re.test((o.e.en || o.e.name).toLowerCase())).map(o => esc(o.e.name));
  if (pats.has('triPushdown') && !pats.has('triOverhead') && !pats.has('triLying')) say('tip', T('Triceps only get pushdowns ({names}). Adding an overhead or lying extension stretches the long head; in a direct comparison overhead extensions grew the triceps about 1.4 times as much. Try {ex}.', { names: list(names(/push ?down|press ?down/)), ex: best('triceps') }), ['maeo2023']);
  if (pats.has('triOverhead')) say('good', T('Overhead triceps extensions are in: the arm position that grew the triceps most in a direct comparison.'), ['maeo2023']);
  const curls = st.ex.filter(o => o.a && o.a.pattern === 'legCurl');
  if (curls.some(o => /seated/.test((o.e.en || o.e.name).toLowerCase()))) say('good', T('Seated leg curls: the version that grew the hamstrings more than lying curls.'), ['maeo2021']);
  else if (curls.length) say('tip', T('Your leg curl isn’t the seated kind. Seated curls stretch the hamstrings at the hip and grew them more (about +14% vs +9%).'), ['maeo2021']);
  const calves = st.ex.filter(o => o.a && o.a.pattern === 'calf');
  if (calves.length && calves.every(o => /seated|squat calf/.test((o.e.en || o.e.name).toLowerCase()))) say('tip', T('Calves only get seated (knee-bent) raises, which train the soleus but barely grew the gastrocnemius. Add a straight-knee version such as {ex}, and spend time in the stretched bottom position.', { ex: best('calves') }), ['kinoshita2023', 'kassiano2023']);
  if (pats.has('legExt')) say('tip', T('Leg extensions: when full reps run out, keep going with partials in the bent-knee half. That half grew the quads at least as well as full reps.'), ['pedrosa2022']);
  if (pats.has('bridge') && !pats.has('squat') && !pats.has('hinge')) say('good', T('Glute bridges or hip thrusts grew the glutes about as much as squats in a direct comparison, so they can carry your glute work.'), ['plotkin2023']);
  if (pats.has('squat') && !pats.has('legExt')) say('tip', T('Quads only get squats or presses. Leg extensions grew the rectus femoris (the quad that crosses the hip) where squats didn’t, more so with the seat reclined: {ex}.', { ex: exLink(getEx('leg-extension')) }), ['zabaletakorta2021', 'larsen2025h']);
  if (!pats.has('squat') && (st.sets.quads || 0) > 0) say('tip', T('Quads only get isolation work. A squat, hack squat or leg press would also train the glutes and adductors at long lengths: {ex}.', { ex: best('quads') }), ['plotkin2023']);
  const weak = st.ex.filter(o => o.a && o.a.score != null && o.a.score <= 5);
  for (const o of weak) { const b = bestFor(o.e.m, 1, o.e.id, o.a.score)[0]; if (b) say('tip', T('{name} rates {score}/10 on its mechanics ({title}). A higher-rated swap for the {muscle}: {ex} ({best}/10).', { name: esc(o.e.name), score: o.a.score, title: esc(T(o.a.title).toLowerCase()), muscle: name(o.e.m), ex: exLink(b), best: scoreOf(b.id) })); }
  const strong = st.ex.filter(o => o.a && o.a.score >= 9);
  if (strong.length) say('good', T('{n} of your {total} exercises rate 9 or 10 out of 10 on their mechanics: {list}.', { n: strong.length, total: st.ex.length, list: list(strong.slice(0, 6).map(o => esc(o.e.name))) + (strong.length > 6 ? '…' : '') }));
  // rest
  topic(T('Rest between sets'), T('Longer rests on the big lifts let you do more reps on the next set.'));
  const shortRest = st.ex.filter(o => o.a && COMPOUND.has(o.a.pattern) && (o.x.rest || state.settings.rest) < 120);
  if (shortRest.length) say('tip', T('Rest under 2 minutes on big lifts: {list}. Longer rests (2 to 3 minutes) let you do more reps on the next set, and gave more growth and strength in trained lifters.', { list: list(shortRest.map(o => `${esc(o.e.name)} (${fmtRest(o.x.rest || state.settings.rest)})`)) }), ['schoenfeld2016r', 'grgic2018r']);
  else if (st.ex.some(o => o.a && COMPOUND.has(o.a.pattern))) say('good', T('The big lifts get at least 2 minutes of rest.'), ['schoenfeld2016r', 'grgic2018r']);
  const quick = st.ex.filter(o => o.a && o.a.score != null && !COMPOUND.has(o.a.pattern) && (o.x.rest || state.settings.rest) < 60);
  if (quick.length) say('tip', T('Rest under a minute on {list}. Rests over 60 seconds gave slightly more growth; if you keep them short, add a set.', { list: list(quick.map(o => `${esc(o.e.name)} (${fmtRest(o.x.rest || state.settings.rest)})`)) }), ['singer2024']);
  // session length
  topic(T('Workout length'), T('Effort tends to drop late in very long sessions.'));
  const long = st.tpls.map(t => [t, estMinutes(t)]).filter(([, min]) => min > 75);
  for (const [t, min] of long) say('tip', T('{name} takes about {n} minutes. Supersets save time: pair exercises that share no muscles, not even as helpers (a leg exercise with an arm exercise, or a chest press with a row). Pairs that work the same muscles cost reps. Keep heavy barbell lifts out of pairs.', { name: esc(t.name), n: min }), ['zhang2025', 'iversen2021']);
  if (!long.length && st.tpls.length) say('good', T('Each day takes about {n} minutes or less.', { n: Math.max(...st.tpls.map(estMinutes)) }));
  // balance
  topic(T('Push and pull balance'), T('Similar amounts of pushing and pulling keep the shoulders balanced.'));
  const sum_ = ms => ms.reduce((a, m) => a + (st.sets[m] || 0), 0);
  const push = sum_(['chest', 'frontdelts', 'triceps']), pull = sum_(['lats', 'upperback', 'reardelts', 'biceps']);
  if (push && pull) { const r = push / pull; const v = { push: trimNum(push, 0), pull: trimNum(pull, 0) }; if (r > 1.5 || r < 0.67) say('tip', T('Pushing and pulling are uneven: about {push} pushing sets for {pull} pulling sets a week. Closer to 1:1 is a common target.', v)); else say('good', T('Pushing and pulling are balanced: {push} and {pull} sets a week.', v)); }
  return { st, topics };
}
// split can be a plan not used yet ({ name, days, tpls }); perWeek: how often it's meant to be trained
function planReview(split, perWeek = guessPerWeek(split)) {
  openSheet({
    full: true,
    render: () => {
      const { st, topics } = reviewTopics(split, perWeek);
      // what to show
      const RANK = { fix: 0, tip: 1, good: 2 }, MARK = { fix: 'x', tip: 'info', good: 'check' };
      const shown = topics.filter(t => t.items.length);
      for (const t of shown) { t.items.sort((a, b) => RANK[a.kind] - RANK[b.kind]); t.worst = t.items[0].kind; }
      const count = k => shown.reduce((n, t) => n + t.items.filter(i => i.kind === k).length, 0);
      const STATUS = { fix: T('Needs a fix'), tip: T('Worth a look'), good: T('On track') };
      const item = i => `<li class="${i.kind}">${icon(MARK[i.kind])}<div class="rv-txt"><p>${i.text}</p><p class="rv-src">${i.refs.length ? `<span class="basis study">${icon('flask')}${T('Studies')}</span>${i.refs.map(refLink).join('<span class="dot"> · </span>')}` : `<span class="basis rule">${T('Rule of thumb')}</span>`}</p></div></li>`;
      const tiles = [['fix', T('To fix')], ['tip', T('To consider')], ['good', T('On track')]];
      const trainDays = split.days.filter(d => !isRest(d)).length;
      return `${sheetHead(T('Plan review'))}
      <div class="sheet-body pad review">
        <p class="eyebrow accent">${icon('flask', 'inline')} ${T('Based on the training literature')}</p>
        <h2 class="big-title">${esc(split.name)}</h2>
        <div class="review-week"><span>${T('Sessions a week')}</span><div class="seg sm">${[2, 3, 3.5, 4, 5, 6].map(v => `<button class="${perWeek === v ? 'on' : ''}" data-a="pw" data-v="${v}">${v}</button>`).join('')}</div></div>
        <p class="muted small">${split.days.some(isRest) ? TN(trainDays, 'Worked out from your rotation ({n} training day in a {len}-day cycle).', 'Worked out from your rotation ({n} training days in a {len}-day cycle).', { len: split.days.length }) : T('Worked out from your last four weeks.')} ${T('Change it if you train more or less often.')}</p>
        <div class="rv-sum">${tiles.map(([k, l]) => `<div class="rv-tile ${k}">${icon(MARK[k])}<b>${count(k)}</b><span>${l}</span></div>`).join('')}</div>
        <div class="rv-key"><p class="rv-key-h">${T('How to read this')}</p>
          <p><span class="basis study">${icon('flask')}${T('Studies')}</span><span>${T('Tested in research. Tap a source to read the study.')}</span></p>
          <p><span class="basis rule">${T('Rule of thumb')}</span><span>${T('Common coaching practice or the exercise’s mechanics. Sensible, but not tested directly.')}</span></p></div>
        ${shown.map(t => `<section class="rv-topic">
          <h3 class="rv-h"><span>${esc(t.title)}</span><span class="rv-status ${t.worst}">${icon(MARK[t.worst])}${STATUS[t.worst]}</span></h3>
          <p class="rv-about">${t.about}</p>
          <ul class="review-list">${t.items.map(item).join('')}</ul>${t.after}</section>`).join('')}
        <h3 class="sub-h">${T('Your exercises, rated')}</h3>
        <div class="card list-card">${st.ex.map(o => `<button class="ex-row" data-a="openEx" data-id="${o.e.id}">${thumb(o.e.id, 'sm')}<span class="ex-txt"><b>${esc(o.e.name)}</b><small>${o.a ? esc(T(o.a.title)) : ''}</small></span>${scorePill(o.e.id)}</button>`).join('')}</div>
        <p class="muted small">${T('A higher-rated exercise isn’t automatically better for you: how your joints feel, your equipment, fatigue, the order you do things in and whether you can keep progressing it all matter. The review can’t see those, so treat it as suggestions.')}</p>
      </div>`;
    },
    actions: { pw: (b, def) => { perWeek = +b.dataset.v; refreshSheet(def); } }
  });
}
function templatesSection(split) {
  const inSplit = new Set(split ? split.days : []);
  const rest = state.templates.filter(t => !inSplit.has(t.id));
  if (!rest.length) return '';
  const groups = {};
  for (const t of rest) {
    const sp = state.splits.find(s => s.days.includes(t.id));
    const g = sp ? sp.name : T('Your templates');
    (groups[g] = groups[g] || []).push(t);
  }
  const order = Object.keys(groups).sort((a, b) => (b === T('Your templates')) - (a === T('Your templates')));
  return `<section class="section"><h2 class="section-h">${T('Templates')}</h2>${order.map(g => `<p class="eyebrow">${esc(g)}</p><div class="tpl-grid">${groups[g].map(tplCard).join('')}</div>`).join('')}</section>`;
}
function tplCard(t) {
  const last = tplLastDone(t.id);
  return `<article class="tpl-card"><button class="tpl-main" data-a="tplPreview" data-id="${t.id}"><b>${esc(t.name)}</b><span class="muted">${TN(t.ex.length, '{n} exercises · {when}', '{n} exercises · {when}', { when: last ? relDay(last.start) : T('not done yet') })}</span><span class="tpl-ex">${esc(t.ex.slice(0, 4).map(x => getEx(x.exId).name).join(', '))}${t.ex.length > 4 ? '…' : ''}</span></button>
    <div class="tpl-btns"><button class="btn sm primary" data-a="tplStart" data-id="${t.id}">${icon('play')}${T('Start')}</button><button class="icon-btn" data-a="tplMenu" data-id="${t.id}" aria-label="${T('More for {name}', { name: esc(t.name) })}">${icon('dots')}</button></div></article>`;
}
function programLibrary() {
  return `<section class="section" id="plans"><h2 class="section-h">${T('Ready-made splits')}</h2><p class="muted section-sub">${T('Each one adds its days as templates you can change. Your current split and history stay as they are.')}</p>${planBrowser()}</section>`;
}
/* ----- ready-made plans: a list to narrow down by days and experience, and a page for each before you use it ----- */
const LEVEL_RANK = { new: 0, some: 1, exp: 2 };
const LEVEL_NAME = () => ({ new: T('Good first plan'), some: T('Some experience'), exp: T('Experienced') });
// minutes a session, shortest and longest day
const planMins = new Map();
function planMinutes(p) {
  if (!planMins.has(p.id)) { const m = programDays(p, false).filter(d => !isRest(d)).map(estMinutes); planMins.set(p.id, [Math.min(...m), Math.max(...m)]); }
  return planMins.get(p.id);
}
const minText = ([a, b]) => a === b ? TN(a, 'about {n} min', 'about {n} min') : T('{a} to {b} min', { a, b });
// what the list shows: starts from the guide's answers when there are some
function planFilter() {
  if (!ui.planF) { const a = state.profile || {}; ui.planF = { days: +a.days || 0, level: a.level || '' }; }
  return ui.planF;
}
// a plan fits a level when it's for that much experience or less
const planFits = (p, f) => (!f.days || (p.week || []).includes(f.days)) && (!f.level || LEVEL_RANK[p.level || 'some'] <= LEVEL_RANK[f.level]);
function planBrowser() {
  const f = planFilter();
  const top = state.profile ? guidePlans(state.profile)[0] : null;
  const list = PROGRAMS.filter(p => planFits(p, f)).sort((a, b) => (b.id === top) - (a.id === top));
  const chip = (k, v, label) => `<button class="chip${f[k] === v ? ' on' : ''}" data-a="planF" data-k="${k}" data-v="${v}" aria-pressed="${f[k] === v}">${label}</button>`;
  return `<div class="plan-filter">
    <div class="pf-row" role="group" aria-labelledby="pfDays"><span class="pf-l" id="pfDays">${T('Days a week')}</span><div class="chips wrap">${chip('days', 0, T('Any'))}${[2, 3, 4, 5, 6].map(n => chip('days', n, String(n))).join('')}</div></div>
    <div class="pf-row" role="group" aria-labelledby="pfLevel"><span class="pf-l" id="pfLevel">${T('Experience')}</span><div class="chips wrap">${chip('level', '', T('Any'))}${[['new', T('Just starting')], ['some', T('Up to two years')], ['exp', T('More than two years')]].map(([v, l]) => chip('level', v, l)).join('')}</div></div>
  </div>
  <p class="muted small pf-count" role="status">${list.length ? TN(list.length, '{n} plan fits', '{n} plans fit') : T('No plan fits both. Try another number of days, or see them all.')}</p>
  ${list.length ? `<div class="prog-grid">${list.map(p => planCard(p, p.id === top)).join('')}</div>` : `<button class="btn" data-a="planF" data-k="all">${T('Show all plans')}</button>`}`;
}
function planCard(p, rec) {
  const inst = state.splits.find(s => s.programId === p.id), active = inst && inst.id === state.activeSplit;
  return `<article class="prog${rec ? ' rec' : ''}"><div>
    <p class="eyebrow">${esc(p.freq)}</p>
    <h3>${esc(p.name)}${rec ? ` <span class="rec-pill">${T('Fits your answers')}</span>` : ''}</h3>
    <p class="muted">${esc(p.short || p.about)}</p>
    <p class="prog-facts"><span class="pill lv-${p.level || 'some'}">${esc(LEVEL_NAME()[p.level || 'some'])}</span><span class="pill">${icon('clock')}${minText(planMinutes(p))}</span>${p.kit === 'home' ? `<span class="pill">${T('At home')}</span>` : p.machine ? `<span class="pill">${T('Machines or free weights')}</span>` : ''}</p>
    <p class="prog-days">${p.days.map(d => `<span>${esc(isRest(d) ? T('Rest') : d[0])}</span>`).join('')}</p></div>
    <div class="prog-btns">${active ? `<span class="pill good">${icon('check')}${T('Your split')}</span>` : ''}<button class="btn sm${active ? '' : ' primary'}" data-a="planOpen" data-id="${p.id}" aria-label="${T('See {name}', { name: esc(p.name) })}">${T('See the plan')}</button></div></article>`;
}
// the training days a week could fall on, Monday first
const WEEK_ON = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };
const MAIN_MUSCLES = ['chest', 'lats', 'upperback', 'quads', 'hamstrings', 'glutes'];
// the page for one plan: who it's for, the week, its days in either version, how it's built and why, then use it.
// opts.onUse(p, version, def) replaces what Use does (the welcome finishes itself too)
function planSheet(id, opts = {}) {
  const p = PROGRAMS.find(x => x.id === id);
  if (!p) return;
  const f = planFilter(), a = state.profile || {};
  // the machine version for someone new, or the version already in use
  let v = !p.machine ? 'free' : opts.version || (splitOfPlan(p, 'machine') && !splitOfPlan(p) ? 'machine' : a.level === 'new' && a.kit !== 'db' ? 'machine' : 'free');
  const n = [f.days, +a.days].find(x => x && (p.week || []).includes(x)) || (p.week || [3])[0];
  const days = () => programDays(p, v === 'machine');
  openSheet({
    full: true, cls: 'plan-sheet', focus: '#planH',
    render: () => {
      const ds = days(), train = ds.filter(d => !isRest(d));
      const st = planStats({ tpls: train }, n);
      const main = MAIN_MUSCLES.filter(m => st.sets[m] > 0);
      const lo = Math.round(Math.min(...main.map(m => st.sets[m]))), hi = Math.round(Math.max(...main.map(m => st.sets[m])));
      const often = Math.min(...main.map(m => st.days[m] || 0));
      const strength = (p.goals || [])[0] === 'strength';
      const mins = train.map(estMinutes);
      const inUse = splitOfPlan(p, v), active = inUse && inUse.id === state.activeSplit;
      const wk = new Date(2024, 0, 1); // a Monday
      const week = ds.some(isRest) ? '' : `<h3 class="sub-h">${TN(n, 'A week on {n} day could look like this', 'A week on {n} days could look like this')}</h3>
        <ol class="plan-week">${Array.from({ length: 7 }, (_, i) => { const on = WEEK_ON[n] && WEEK_ON[n].indexOf(i); const d = new Date(wk); d.setDate(d.getDate() + i);
          return `<li class="${on >= 0 ? 'on' : ''}"><b>${esc(dfmt(d.getTime(), { weekday: 'short' }))}</b><span>${on >= 0 ? esc(train[on % train.length].name) : T('Rest')}</span></li>`; }).join('')}</ol>`;
      const why = [
        [T('{lo} to {hi} hard sets a week for each main muscle: enough to keep growing, with time to recover.', { lo, hi }), ['schoenfeld2017', 'pelland2026']],
        often >= 1.5 ? [`${TN(Math.floor(often), 'Each main muscle is trained {n} time a week or more.', 'Each main muscle is trained {n} times a week or more.')} ${T('That spreads the weekly sets out, so no session has to do them all, and helps strength a little.')}`, ['schoenfeld2019f', 'pelland2026']] : [T('Each muscle is trained once a week. That works when the weekly sets are there; spreading them over two days keeps sessions shorter and helps strength a little.'), ['schoenfeld2019f', 'pelland2026']],
        [T('Working sets stop 1 to 2 reps short of failure, small exercises 0 to 1: close enough to grow well without wearing you down.'), ['robinson2024', 'refalo2023', 'refalo2024']],
        strength ? [T('3 to 5 reps on the main lifts, because heavy sets build the most strength, and more reps on the rest for size.'), ['lopez2021']] : [T('6 to 12 reps on the big lifts and 10 to 20 on small ones: muscle grows about as well anywhere in that range when sets are hard.'), ['lopez2021']],
        [T('2 to 3 minutes of rest on the big lifts and 60 to 90 seconds on small ones, so each set can be a good one.'), ['schoenfeld2016r', 'grgic2018r', 'singer2024']]
      ];
      return `${sheetHead(esc(p.name))}
      <div class="sheet-body pad plan-d">
        <p class="eyebrow">${esc(p.freq)} · ${esc(LEVEL_NAME()[p.level || 'some'])}</p>
        <h2 class="big-title" id="planH" tabindex="-1">${esc(p.name)}</h2>
        <p class="plan-lead">${esc(p.short || '')}</p>
        <p class="muted">${esc(p.about)}</p>
        ${p.machine ? `<div class="plan-ver"><p class="pv-l" id="pvL">${T('Version')}</p><div class="seg" role="group" aria-labelledby="pvL">${[['free', T('Free weights')], ['machine', T('Machines')]].map(([k, l]) => `<button class="${v === k ? 'on' : ''}" data-a="ver" data-v="${k}" aria-pressed="${v === k}">${l}</button>`).join('')}</div>
          <p class="muted small">${v === 'machine' ? T('Machines and cables in place of barbell, dumbbell and pull-up lifts, so you can learn each movement and push hard safely. Muscle grows about as well either way ({ref}). Move to free weights in one tap from your split when you’re ready.', { ref: refLink('haugen2023') }) : T('Barbells, dumbbells and pull-ups for the big lifts. New to lifting? The machine version is easier to learn and builds muscle about as well ({ref}).', { ref: refLink('haugen2023') })}</p></div>` : ''}
        <div class="tiles plan-tiles"><div class="tile"><span>${T('Days a week')}</span><b>${esc(p.week ? daysText(p.week) : '')}</b></div><div class="tile"><span>${T('A session')}</span><b>${esc(minText([Math.min(...mins), Math.max(...mins)]))}</b></div><div class="tile"><span>${T('Sets per muscle a week')}</span><b>${lo === hi ? lo : `${lo}–${hi}`}</b></div></div>
        ${week}
        <h3 class="sub-h">${TN(train.length, 'The {n} day', 'The {n} days')}</h3>
        ${train.map(t => `<section class="plan-day"><h4>${esc(t.name)}<small>${TN(estMinutes(t), 'about {n} min', 'about {n} min')}</small></h4><ol class="ex-preview">${t.ex.map(x => `<li><span>${thumb(x.exId, 'sm')}<span class="exn"><b>${esc(getEx(x.exId).name)}</b><small>${esc(scheme(x.sets))}${x.free ? ` · ${T('instead of {name}', { name: esc(getEx(x.free).name) })}` : ''}</small></span></span></li>`).join('')}</ol></section>`).join('')}
        <h3 class="sub-h">${T('How it’s built')}</h3>
        <ul class="review-list plan-why">${why.map(([text, refs]) => `<li class="good">${icon('check')}<div class="rv-txt"><p>${text}</p><p class="rv-src"><span class="basis study">${icon('flask')}${T('Studies')}</span>${refs.map(refLink).join('<span class="dot"> · </span>')}</p></div></li>`).join('')}</ul>
        <button class="btn ghost wide" data-a="review">${icon('flask')}${T('Full review against the research')}</button>
        <div class="row-btns plan-use">${active ? `<span class="pill good">${icon('check')}${T('This is your split')}</span>` : `<button class="btn primary big" data-a="use">${inUse ? T('Switch to this plan') : T('Use this plan')}</button>`}</div>
      </div>`;
    },
    actions: {
      ver: (b, def) => { v = b.dataset.v; refreshSheet(def); },
      review: () => { const ds = days(); planReview({ name: p.name, days: ds.map(d => isRest(d) ? d : d.id), tpls: ds.filter(d => !isRest(d)) }, ds.some(isRest) ? Math.round(ds.filter(d => !isRest(d)).length * 7 / ds.length * 10) / 10 : n); },
      use: (b, def) => (opts.onUse || usePlan)(p, v, def)
    }
  });
}
// makes a plan your split: the one you have in that version, or a new one
function usePlan(p, version, def) {
  const have = splitOfPlan(p, version);
  if (have) state.activeSplit = have.id; else installProgram(p, true, false, version);
  save();
  if (def) closeSheet(def);
  render(); window.scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' });
  toast(T('{name} is now your split.', { name: p.name }));
}
// moving a split between machines and free weights, after saying what changes
function splitVersionSheet(sp) {
  const p = PROGRAMS.find(x => x.id === sp.programId);
  if (!p || !p.machine) return;
  const to = sp.version === 'machine' ? 'free' : 'machine';
  const pairs = [];
  for (const id of new Set(sp.days.filter(d => !isRest(d)))) {
    const t = tplById(id); if (!t) continue;
    const used = new Set(t.ex.map(x => x.exId));
    for (const x of t.ex) {
      const other = to === 'free' ? x.free : !x.free && (MACHINE_SWAPS.get(x.exId) || []).find(c => !used.has(c));
      if (other) { if (to === 'machine') used.add(other); const k = `${getEx(x.exId).name} → ${getEx(other).name}`; if (!pairs.includes(k)) pairs.push(k); }
    }
  }
  confirmSheet({
    title: to === 'free' ? T('Move to free weights?') : T('Switch to machines?'),
    text: !pairs.length ? T('Nothing in {name} has another version to switch to.', { name: esc(sp.name) }) : to === 'free' ? T('The machines in {name} go back to their free-weight lifts. Sets, reps and rest stay, and the history of every exercise is kept.', { name: esc(sp.name) }) : T('The barbell, dumbbell and pull-up lifts in {name} become machines. Sets, reps and rest stay, and the history of every exercise is kept.', { name: esc(sp.name) }),
    extra: pairs.length ? `<ul class="swap-list">${pairs.map(k => `<li>${esc(k)}</li>`).join('')}</ul><p class="muted small">${T('You can switch back the same way.')}</p>` : '',
    ok: to === 'free' ? T('Move to free weights') : T('Switch to machines'),
    onOk: () => { if (!pairs.length) return; setSplitVersion(sp, to); save(); render(); toast(to === 'free' ? T('{name} now uses free weights.', { name: sp.name }) : T('{name} now uses machines.', { name: sp.name })); }
  });
}
function tplPreviewSheet(tplId, splitId, day) {
  openSheet({
    cls: 'wide',
    render: () => {
      const t = tplById(tplId);
      if (!t) return `<div class="sheet-body pad">${T('This template was deleted.')}</div>`;
      const sp = splitId ? splitById(splitId) : null;
      const n = tplTimesDone(t.id);
      return `${sheetHead(esc(t.name), `<button class="btn sm" data-a="edit">${icon('edit')}${T('Edit')}</button>`)}
      <div class="sheet-body pad">
        <p class="eyebrow">${sp ? TN(n, '{split} · Day {day} · done {n} time', '{split} · Day {day} · done {n} times', { split: esc(sp.name), day: day + 1 }) : TN(n, 'Template · done {n} time', 'Template · done {n} times')}</p>
        ${t.note ? `<p class="note-text">${esc(t.note)}</p>` : ''}
        <ol class="ex-preview big">${t.ex.map(x => {
          const lp = lastPerf(x.exId, Date.now());
          return `<li><span>${thumb(x.exId, 'sm')}<span><b>${esc(getEx(x.exId).name)}</b><small>${T('{scheme} · rest {time}', { scheme: esc(scheme(x.sets)), time: fmtRest(x.rest || state.settings.rest) })}</small></span></span><span class="muted">${lp ? T('last {set}', { set: esc(lp.x.sets.filter(s => s.done && s.t !== 'W').slice(0, 1).map(s => fmtSet(lp.x, s)).join('')) }) : ''}</span></li>`;
        }).join('')}</ol>
        <div class="row-btns">${sp && sp.pos !== day ? `<button class="btn" data-a="makeNext">${T('Make this next')}</button>` : ''}<button class="btn primary big" data-a="start">${icon('play')}${T('Start {name}', { name: esc(t.name) })}</button></div>
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
    uni, ss: tx.ss || null, note: '',
    sets: sidesFor(sets, uni, tx.uni ?? sets.every(s => s.side)).map(s => ({ ...s, id: uid() }))
  };
}
function wexFresh(exId) {
  const prefs = state.exPrefs[exId] || {}, def = getEx(exId);
  const lp = lastPerf(exId, Date.now());
  let sets = lp ? lp.x.sets.filter(s => s.done).map(s => s.side ? { t: s.t, side: s.side, pair: s.pair, done: false } : { t: s.t, done: false }) : [];
  if (!sets.length) sets = [0, 1, 2].map(() => ({ t: 'N', done: false }));
  const uni = hasReps(def.k) && !!(prefs.uni ?? def.uni);
  return { id: uid(), exId, rest: prefs.rest || state.settings.rest, uni, ss: null, note: '', sets: sidesFor(sets, uni, !!(lp && lp.x.uni)).map(s => ({ ...s, id: uid() })) };
}
// the pad, pickers and open editors belong to one workout
function resetWoUI() { ui.kp = null; ui.effOpen = null; ui.effSid = null; ui.delMode = null; ui.noteOpen = null; ui.setupOpen = null; }
function beginWorkout(w) {
  const go2 = () => {
    state.active = w;
    state.rest = null;
    ui.woHidden = false;
    resetWoUI();
    save(true);
    closeAllSheets();
    render();
    renderWorkout(true);
    wake(true);
  };
  if (state.active) {
    confirmSheet({
      title: T('A workout is already open'),
      text: T('Finish or discard <b>{name}</b> before starting another. Discarding deletes the sets you logged in it.', { name: esc(state.active.name) }),
      ok: T('Discard it and start'), danger: true, cancel: T('Keep it'), onOk: () => { setTimeout(go2, 50); }
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
  const name = h < 11 ? T('Morning workout') : h < 17 ? T('Afternoon workout') : T('Evening workout');
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
  if (state.active) { toast(T('Finish your open workout first.')); return; }
  const w = clone(src);
  w.mode = 'edit'; w.editOf = id; w.cur = 0;
  state.active = w;
  ui.woHidden = false;
  resetWoUI();
  save(true);
  closeAllSheets();
  render();
  renderWorkout(true);
}
function logPastWorkout() {
  if (state.active) { toast(T('Finish your open workout first.')); return; }
  const start = dayStart(Date.now() - DAY) + 18 * 3600e3;
  state.active = { id: uid(), name: T('Logged workout'), start, end: start + 3600e3, tplId: null, splitId: null, day: null, note: '', ex: [], cur: 0, mode: 'edit', editOf: null };
  ui.woHidden = false;
  resetWoUI();
  save(true);
  render();
  renderWorkout(true);
  setTimeout(() => dateSheet(), 500);
}
function cleanForSave(w) {
  // a left + right pair is one set: kept once both sides are checked (the finish prompt says so)
  for (const x of w.ex) x.sets = x.sets.filter(s => { const m = s.done && partnerOf(x, s); return s.done && (!m || m.done); });
  w.ex = w.ex.filter(x => x.sets.length);
  delete w.cur; delete w.mode; delete w.editOf;
  for (const x of w.ex) for (const s of x.sets) { delete s.prs; delete s.lr; }
  return w;
}
function finishPrompt() {
  const w = A();
  // counted like everywhere else (a left + right pair is one set), warm-ups included here
  const all = w.ex.flatMap(x => liftSets(x.sets).map(s => [x, s]));
  const total = all.length, done = all.filter(([x, s]) => { const m = partnerOf(x, s); return s.done && (!m || m.done); }).length;
  const half = all.filter(([x, s]) => { const m = partnerOf(x, s); return m && s.done !== m.done; }).length;
  const editing = w.mode === 'edit';
  if (!done) {
    confirmSheet({
      title: editing ? T('No sets are checked') : T('Nothing logged yet'),
      text: editing ? T('Check the sets you did, or this workout will be deleted when you save.') : T('Check off at least one set, or discard this workout.'),
      ok: editing ? T('Delete workout') : T('Discard workout'), danger: true, cancel: T('Keep going'),
      onOk: () => { if (editing && w.editOf) { state.workouts = state.workouts.filter(o => o.id !== w.editOf); recalcPRs(); } discardActive(); }
    });
    return;
  }
  confirmSheet({
    title: editing ? T('Save changes?') : T('Finish {name}?', { name: w.name }),
    text: `${TN(total, '{done} of {n} sets checked.', '{done} of {n} sets checked.', { done })}${done < total ? ' ' + T('Unchecked sets are left out.') : ''}${half ? ' ' + TN(half, 'One set has only one side checked: check the other side to keep it.', '{n} sets have only one side checked: check the other side to keep them.') : ''}`,
    ok: editing ? T('Save') : T('Finish workout'), cancel: T('Keep going'),
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
  // a new workout at the end only needs its own records; an edit or a past workout can change later ones
  if (state.workouts[state.workouts.length - 1] === w) w.prs = workoutPRs(w); else recalcPRs();
  if (!editing && w.splitId) {
    const sp = splitById(w.splitId);
    if (sp && w.day != null && sp.days[w.day] === w.tplId) sp.pos = (w.day + 1) % Math.max(1, sp.days.length);
  }
  state.active = null;
  state.rest = null;
  resetWoUI();
  save(true);
  wake(false);
  render();
  renderWorkout();
  renderRest();
  if (canMove() && !calm()) setTimeout(() => summarySheet(w.id, !editing), 280); else summarySheet(w.id, !editing);
  keepCopy();
}
function discardActive() {
  state.active = null;
  state.rest = null;
  resetWoUI();
  ui.woHidden = false;
  save(true);
  wake(false);
  renderWorkout();
  renderRest();
  render();
}
// record names are saved in English (old logs have them that way too); shown in the chosen language
const recKind = k => ({ 'Est. 1RM': T('Est. 1RM'), Heaviest: T('Heaviest'), 'Most reps': T('Most reps'), Longest: T('Longest'), Farthest: T('Farthest') })[k] || k;
function summarySheet(id, fresh) {
  const w = state.workouts.find(o => o.id === id);
  if (!w) return;
  const n = sessionNumber(w), times = w.tplId ? state.workouts.filter(o => o.tplId === w.tplId && o.start <= w.start).length : 0;
  const ms = muscleSets([w]);
  openSheet({
    cls: 'wide',
    render: () => `${sheetHead(fresh ? T('Workout saved') : T('Changes saved'))}
    <div class="sheet-body pad summary">
      <p class="eyebrow accent">${T('Session #{n}', { n })}${times > 1 ? ` · ${esc(w.name)} #${times}` : ''}</p>
      <h2 class="big-title">${esc(w.name)}</h2>
      <div class="tiles">
        <div class="tile"><span>${T('Time')}</span><b>${fmtDuration(w.end - w.start)}</b></div>
        <div class="tile"><span>${T('Working sets')}</span><b>${workingSets(w)}</b></div>
        <div class="tile"><span>${T('Volume')}</span><b>${fmtVol(workoutVolume(w))}</b></div>
        <div class="tile"><span>${T('Records')}</span><b>${w.prs.length}</b></div>
      </div>
      ${w.prs.length ? `<h3 class="sub-h">${icon('trophy')}${T('New records')}</h3><ul class="pr-list">${w.prs.map(p => `<li><b>${esc(getEx(p.exId).name)}</b><span>${esc(recKind(p.kind))}</span><span class="num">${esc(fmtSet({ uni: p.uni, exId: p.exId }, p.set))}</span></li>`).join('')}</ul>` : ''}
      ${ms.length ? `<h3 class="sub-h">${T('Sets per muscle')}</h3><div class="msets">${ms.slice(0, 8).map(([m, c]) => `<span class="pill">${esc(MUSCLES[m])} <b>${trimNum(c, 1)}</b></span>`).join('')}</div>` : ''}
      <label class="field wnote"><span>${icon('note')} ${T('How did it go?')}</span><textarea data-f="wnote" rows="2" placeholder="${T('Energy, sleep, anything to remember')}">${esc(w.note || '')}</textarea></label>
      <div class="chips wrap note-chips wnote-chips">${WNOTE_CHIPS.map(([en, c]) => `<button class="chip ${noteHas(w.note, en, c) ? 'on' : ''}" data-a="wnoteChip" data-v="${esc(c)}" aria-pressed="${noteHas(w.note, en, c)}">${esc(c)}</button>`).join('')}</div>
      <div class="row-btns">
        ${w.tplId && tplById(w.tplId) ? `<button class="btn" data-a="updTpl">${T('Update “{name}” to match', { name: esc(tplById(w.tplId).name) })}</button>` : ''}
        <button class="btn" data-a="saveTpl">${T('Save as new template')}</button>
        <button class="btn primary" data-a="sheetClose">${T('Done')}</button>
      </div>
    </div>`,
    onInput: el => { if (el.dataset.f === 'wnote') { w.note = el.value; save(); } },
    actions: {
      // tap a word to add it to the note, tap again to take it out (the text box keeps anything typed)
      // the word goes in as shown; the same word saved in English counts as it too
      wnoteChip: (b, def) => {
        const parts = noteParts(w.note), c = b.dataset.v, en = (WNOTE_CHIPS.find(o => o[1] === c) || [c])[0], same = p => p === c || p === en;
        w.note = (parts.some(same) ? parts.filter(p => !same(p)) : [...parts, c]).join(', ');
        save();
        const t = $('textarea[data-f="wnote"]', def.el);
        if (t) t.value = w.note;
        b.classList.toggle('on', noteHas(w.note, en, c)); b.setAttribute('aria-pressed', b.classList.contains('on'));
      },
      saveTpl: () => templateFromWorkout(w),
      updTpl: (b, def) => {
        const t = tplById(w.tplId);
        t.ex = tplExFromWorkout(w, t);
        save(); closeSheet(def); render(); toast(T('{name} now matches this workout.', { name: t.name }));
      }
    }
  });
}
function tplExFromWorkout(w, oldTpl) {
  return w.ex.map(x => {
    const old = oldTpl ? oldTpl.ex.find(o => o.exId === x.exId) : null;
    return {
      exId: x.exId, rest: x.rest, uni: x.uni, ss: x.ss, note: old ? old.note || '' : '', ...(old && old.free ? { free: old.free } : {}),
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
    title: T('Save as template'), label: T('Template name'), value: w.name, ok: T('Save template'),
    onOk: name => {
      const t = { id: uid(), name: name || w.name, note: '', ex: tplExFromWorkout(w, null), created: Date.now() };
      state.templates.push(t); save(); render(); toast(T('Saved “{name}” to your templates.', { name: t.name }));
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
  return groups.filter(g => g.idx.length > 1).map((g, n) => ({ ...g, letter: window.AR_TERMS ? 'أبجدهوزحطي'[n] || String(n + 1) : String.fromCharCode(65 + n) }));
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
    if (woFx && woFx.kind === 'rise') woFxEnd();
    const leaving = !el.hidden && !woFx && canMove();
    document.body.classList.remove('wo-open'); woLock(false);
    ui.kp = null; renderKeypad();
    renderMini(); renderRest();
    if (leaving) woDrop(el);
    else if (!woFx) { el.hidden = true; el.innerHTML = ''; }
    return;
  }
  // opening while the screen is still on its way down: that ends now, and it comes back up from the bar
  if (woFx && woFx.kind === 'drop') woFxEnd();
  const mini = $('#mini'), opening = el.hidden, from = opening && !mini.hidden ? mini.getBoundingClientRect() : null;
  const main = $('.wo-main', el);
  const sc = main ? main.scrollTop : 0;
  if (w.cur == null || w.cur >= w.ex.length) w.cur = Math.max(0, w.ex.length - 1);
  tidySupersets(w.ex);
  syncPads(w);
  const P = workoutParts(w);
  if (!resetScroll && !el.hidden && el.dataset.wk === P.key && $('.wo', el)) {
    // same layout: replace only the parts that changed (checking a set redraws one card, not all of them)
    swapPart($('.wo-h', el), P.head);
    swapPart($('.wo-prog', el), P.prog);
    const nav = $('.wo-nav', el), sl = nav ? nav.scrollLeft : 0;
    if (swapPart(nav, P.nav)) $('.wo-nav', el).scrollLeft = sl;
    const cards = $$('.wo-main > .exc', el);
    P.cards.forEach((h, n) => { if (cards[n]) swapPart(cards[n], h); });
  } else {
    // pictures already on screen are put back as they were, so they don't blink each time a set is checked
    const shown = imgsBySrc(el);
    el.innerHTML = workoutHTML(w, P);
    keepImgs(el, shown);
    el.dataset.wk = P.key;
    $('.wo-h', el)._h = P.head; $('.wo-prog', el)._h = P.prog; $('.wo-nav', el)._h = P.nav;
    $$('.wo-main > .exc', el).forEach((c, n) => { c._h = P.cards[n]; });
  }
  ui.flash = null; ui.flashEx = null;
  el.hidden = false;
  document.body.classList.add('wo-open'); woLock(true);
  const m2 = $('.wo-main', el);
  if (m2) {
    // in the list, starting over (reopening the app, switching layout, adding exercises) lands on the current exercise
    const card = resetScroll && state.settings.view !== 'focus' && w.cur > 0 ? $('#exc-' + w.cur, el) : null;
    m2.scrollTop = card ? 0 : resetScroll ? 0 : sc;
    if (card) m2.scrollTop = card.getBoundingClientRect().top - m2.getBoundingClientRect().top - 8;
  }
  navTo(w.cur, false);
  renderKeypad();
  markKpCell(false);
  renderMini();
  renderRest();
  if (opening) woRise(el, from);
}
// the number pad and the RIR picker remember their set by id: adding, deleting or moving sets never sends typing to another set
function kpOpen(e, s, f) {
  const x = A().ex[e];
  return { e, s, f, buf: null, fresh: true, xid: x.id, sid: x.sets[s] && x.sets[s].id };
}
function syncPads(w) {
  const find = (xid, sid) => { const e = w.ex.findIndex(x => x.id === xid); const s = e < 0 ? -1 : w.ex[e].sets.findIndex(o => o.id === sid); return s < 0 ? null : [e, s]; };
  if (ui.kp && ui.kp.sid) { const at = find(ui.kp.xid, ui.kp.sid); if (at) [ui.kp.e, ui.kp.s] = at; else ui.kp = null; }
  if (ui.effOpen && ui.effSid) { const at = find(ui.effSid[0], ui.effSid[1]); ui.effOpen = at ? at.join(':') : null; if (!at) ui.effSid = null; }
}
// superset ids only on exercises next to each other: a group that got split up gets fresh ids, a lone leftover none
function tidySupersets(list) {
  const seen = new Set();
  for (let i = 0; i < list.length;) {
    const id = list[i].ss;
    if (!id) { i++; continue; }
    let j = i;
    while (j < list.length && list[j].ss === id) j++;
    const nid = seen.has(id) ? uid() : id;
    seen.add(id);
    for (let n = i; n < j; n++) list[n].ss = j - i > 1 ? nid : null;
    i = j;
  }
}
// link an exercise with the next one (joining the next one's group, if it has one)
function linkNext(list, i) {
  tidySupersets(list);
  const a = list[i], b = list[i + 1], id = a.ss || uid(), old = b.ss;
  for (let n = i + 1; n < list.length && (n === i + 1 || (old && list[n].ss === old)); n++) list[n].ss = id;
  a.ss = id;
}
// break the link after exercise i; each side stays a superset if it still has two or more
function unlinkNext(list, i) {
  const id = list[i].ss, nid = uid();
  for (let n = i + 1; n < list.length && list[n].ss === id; n++) list[n].ss = nid;
  tidySupersets(list);
}
// swap one part of the workout screen for new markup if it changed, keeping the pictures already showing (no blink)
function swapPart(old, html) {
  if (!old || old._h === html) return false;
  const t = document.createElement('template');
  t.innerHTML = html;
  const nn = t.content.firstElementChild;
  keepImgs(nn, imgsBySrc(old));
  old.replaceWith(nn);
  nn._h = html;
  return true;
}
// the exercise strip follows the current exercise, sideways only (never moves the page up or down)
function navTo(i, smooth) {
  const nav = $('#workout .wo-nav');
  if (!nav) return;
  for (const b of nav.querySelectorAll('.nav-ex[data-i]')) b.classList.toggle('cur', +b.dataset.i === i);
  const b = nav.querySelector(`.nav-ex[data-i="${i}"]`);
  // centred by how far it is from the middle, which works the same reading left to right or right to left
  if (b) { const nr = nav.getBoundingClientRect(), br = b.getBoundingClientRect(); nav.scrollBy({ left: br.left + br.width / 2 - (nr.left + nr.width / 2), behavior: smooth ? 'smooth' : 'auto' }); }
}
// list layout: the exercise you're looking at becomes the current one, so closing and reopening the app comes back to it
let curRaf = 0;
function trackCur() {
  curRaf = 0;
  const w = A(), main = $('#workout .wo-main');
  if (!w || !main || state.settings.view === 'focus' || ui.woHidden) return;
  const line = main.getBoundingClientRect().top + main.clientHeight * 0.3;
  let at = 0;
  for (const c of main.querySelectorAll('.exc[data-e]')) { if (c.getBoundingClientRect().top <= line) at = +c.dataset.e; else break; }
  if (at !== w.cur && at < w.ex.length) { w.cur = at; save(); navTo(at, true); }
}
document.addEventListener('scroll', ev => { if (ev.target.classList && ev.target.classList.contains('wo-main') && !curRaf) curRaf = requestAnimationFrame(trackCur); }, { capture: true, passive: true });
// the workout screen in parts (header, progress, exercise strip, one card per exercise), so a redraw can swap only what changed
function workoutParts(w) {
  const editing = w.mode === 'edit';
  const focus = state.settings.view === 'focus';
  const { done, total } = woTally(w);
  // the sets-done count bumps when a check completes a set (both sides of a pair)
  const bump = ui.flash && w.ex.some(x => { const s = x.sets.find(o => o.id === ui.flash), m = s && partnerOf(x, s); return s && s.t !== 'W' && s.done && (!m || m.done); });
  const num = editing && w.editOf ? sessionNumber(state.workouts.find(o => o.id === w.editOf)) : state.workouts.length + 1;
  const head = `<header class="wo-h">
    <button class="icon-btn" data-a="woMin" aria-label="${T('Minimize workout')}">${icon('down')}</button>
    <div class="wo-title"><button class="wo-name" data-a="woRename">${esc(w.name)}</button>
      <div class="wo-meta">${editing ? `<span>${esc(fmtDate(w.start))} · ${fmtDuration((w.end || w.start) - w.start)}</span>` : `<span class="clock" data-clock>${fmtClock((Date.now() - w.start) / 1000)}</span>`}<span>${T('Session #{n}', { n: num })}</span><span>${T('<b class="{bump}">{done}</b>/{total} sets', { bump: bump ? 'bump' : '', done, total })}</span><span>${fmtVol(workoutVolume(w))}</span></div></div>
    ${editing ? '' : `<button class="icon-btn" data-a="woRest" aria-label="${T('Start a rest timer')}">${icon('timer')}</button>`}
    <button class="icon-btn" data-a="woMenu" aria-label="${T('Workout options')}">${icon('dots')}</button>
    <button class="btn primary" data-a="woFinish">${editing ? T('Save') : T('Finish')}</button>
  </header>`;
  const prog = `<div class="wo-prog" aria-hidden="true">${w.ex.map((x, i) => {
    const t = x.sets.length, d = x.sets.filter(s => s.done).length;
    return `<span class="${i === w.cur ? 'cur' : ''} ${t && d === t ? 'full' : ''}"><i style="width:${t ? Math.round(d / t * 100) : 0}%"></i></span>`;
  }).join('')}</div>`;
  const nav = `<nav class="wo-nav" aria-label="${T('Exercises')}">${w.ex.map((x, i) => {
      const ss = ssInfo(w, i), { done: d, total: t } = setTally(x);
      return `<button class="nav-ex ${i === w.cur ? 'cur' : ''} ${exComplete(x) ? 'complete' : ''} ${ui.flashEx === x.id ? 'done-now' : ''} ${ss ? 'ss' : ''}" data-a="woGo" data-i="${i}">
        ${thumb(x.exId, 'sm nav-pic')}<span class="nav-txt"><span class="nav-name">${esc(getEx(x.exId).name)}</span><span class="nav-bar"><i style="width:${t ? Math.round(d / t * 100) : 0}%"></i></span></span><span class="nav-n">${exComplete(x) ? icon('check') : ss ? ss.label : `${d}/${t}`}</span></button>`;
    }).join('')}<button class="nav-ex add" data-a="woAddEx">${icon('plus')}<span class="nav-name">${T('Add exercise')}</span></button></nav>`;
  const cards = !w.ex.length ? [] : focus ? [exCardHTML(w, w.cur, true)] : w.ex.map((x, i) => exCardHTML(w, i, false));
  // what decides the layout: anything else can be updated card by card
  const tip = tipHTML('workout');
  const key = [focus ? 'f' + w.cur : 'l', w.ex.map(x => x.id).join(','), editing ? 'e' : '', tip ? 't' : ''].join('|');
  return { focus, head, prog, nav, cards, key, tip };
}
function workoutHTML(w, P = workoutParts(w)) {
  let h = `<div class="wo ${P.focus ? 'focus' : 'list'}">${P.head}${P.prog}<div class="wo-body">${P.nav}<div class="wo-main">${P.tip || ''}`;
  if (!w.ex.length) {
    h += `<div class="wo-empty"><h2>${T('Add your first exercise')}</h2><p class="muted">${TN(LIB.length, 'Search {n} exercises or create your own.', 'Search {n} exercises or create your own.', { n: LIB.length.toLocaleString(LOC) })}</p><button class="btn primary big" data-a="woAddEx">${icon('plus')}${T('Add exercises')}</button></div>`;
  } else {
    h += P.cards.join('');
    if (!P.focus) h += `<button class="btn wide add-ex" data-a="woAddEx">${icon('plus')}${T('Add exercises')}</button>`;
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
  if (!lp || lp.archived || k !== 'wr') return null; // nothing from before a reset or a new block
  const range = x.sets.map(s => s.tr).find(tr => /^\d+\s*[-–]\s*\d+$/.test(tr || ''));
  if (!range) return null;
  const [lo, hi] = range.split(/[-–]/).map(Number);
  const work = lp.x.sets.filter(s => s.done && !NO_RECORD.has(s.t) && s.t !== 'D');
  if (!work.length || !work.every(s => minReps(lp.x, s) >= hi)) return null;
  const top = Math.max(...work.map(s => s.w || 0));
  if (!top) return null;
  return { w: top + toKg(state.settings.step), r: lo, hi };
}
// set types that follow last time's set rather than the "add weight" tip (lighter or partial by design)
const NO_SUGGEST = new Set(['W', 'B', 'D', 'P', 'E']);
function placeholder(x, j, ctx) {
  const s = x.sets[j], prev = ctx.prevSets[j], out = {}, k = getEx(x.exId).k;
  const sameSide = o => (o.side || '') === (s.side || '');
  // what you did earlier today in a set of the same type; warm-ups ramp up, so last time's warm-up wins for them
  const today = s.t === 'W' && prev ? null : x.sets.slice(0, j).reverse().find(o => o.done && o.t === s.t && sameSide(o));
  const mate = partnerOf(x, s);
  const sug = ctx.suggest && !NO_SUGGEST.has(s.t) ? ctx.suggest : null;
  if (prev) for (const f of ['w', 'r', 'sec', 'dist']) if (prev[f] != null) out[f] = prev[f];
  if (sug) { out.w = sug.w; out.r = sug.r; }
  if (today) {
    if (today.w != null) out.w = today.w;
    for (const f of ['r', 'sec', 'dist']) if (out[f] == null && today[f] != null) out[f] = today[f];
  }
  if (out.w == null && s.tw != null) out.w = s.tw;
  // a drop set comes down from the set just before it, unless last time's matching set was a drop set too
  const before = s.t === 'D' ? x.sets.slice(0, j).reverse().find(o => o.done && o.t !== 'W' && sameSide(o)) : null;
  if (before && before.w != null && !(prev && prev.t === 'D')) {
    const step = toKg(state.settings.step) || 1;
    out.w = Math.max(step, Math.round(before.w * 0.8 / step) * step);
  }
  // the second side usually uses the weight the first side just did
  if (mate && mate.done && mate.w != null && x.sets.indexOf(mate) < j) out.w = mate.w;
  if (s.tr) {
    const n = parseInt(s.tr, 10);
    // "120s" is 120 seconds and "1:30" a time; a plain number is seconds for a timed exercise, reps otherwise
    const sec = /^\d+\s*s$/.test(s.tr) ? n : s.tr.includes(':') ? parseTime(s.tr) : (k === 'dur' || k === 'wdur') && /^\d+$/.test(s.tr) ? n : null;
    if (sec != null) { if (out.sec == null) out.sec = sec; }
    else if (n && out.r == null) out.r = n;
  }
  return out;
}
// one-side exercises: each side its own row ('rows'), or one row with reps for each side ('one')
const uniStyle = x => (state.exPrefs[x.exId] || {}).uniStyle || state.settings.uniStyle || 'rows';
const isCompact = x => uniStyle(x) === 'one' && x.sets.some(s => s.side);
function setCols(k, eff, two) {
  const c = ['var(--c-badge)', 'minmax(0,1fr)'];
  if (hasWeight(k)) c.push('var(--c-w)');
  if (hasReps(k)) c.push(two ? 'var(--c-r2) var(--c-r2)' : 'var(--c-r)');
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
  const target = work.length ? `${work.length} × ${(work[0].tr || '').replace('-', '–') || T('your reps')}${work[0].trir != null && effOn ? ` · ${effName()} ${effDisp(work[0].trir)}` : ''}` : '';
  let h = `<article class="exc ${exComplete(x) ? 'complete' : ''} ${ui.flashEx === x.id ? 'done-now' : ''}" data-e="${i}" id="exc-${i}">
    ${exHero(x.exId, i)}
    <div class="exc-h">
      <div class="exc-t"><p class="eyebrow">${focus ? T('Exercise {i} of {n}', { i: i + 1, n: w.ex.length }) + ' · ' : ''}${esc(MUSCLES[ex.m])} · ${esc(EQUIP[ex.eq])}${ss ? ` · <span class="ss-tag">${T('Superset {label}', { label: ss.label })}</span>` : ''}</p>
        <h2><button class="exc-name" data-a="exInfo" data-e="${i}">${esc(ex.name)}</button></h2>
        <p class="exc-sub">${target ? `<span>${esc(target)}</span>` : ''}<button class="chip ${x.note ? 'on' : ''}" data-a="noteOpen" data-e="${i}">${icon('note')}${T('Note')}</button><button class="chip ${setupOf(x.exId) ? 'on' : ''}" data-a="setupOpen" data-e="${i}">${icon('pin')}${T('Setup')}</button><button class="chip" data-a="exRest" data-e="${i}">${icon('timer')}${T('Rest {time}', { time: fmtRest(x.rest || state.settings.rest) })}</button>${exResetSince(x.exId) ? `<button class="chip fresh" data-a="exInfo" data-e="${i}">${icon('reset')}${T('Fresh since {date}', { date: esc(fmtShort(exResetSince(x.exId))) })}</button>` : ''}${hasReps(k) && (x.uni || ex.uni) ? `<button class="chip ${x.uni ? 'on' : ''}" data-a="exUni" data-e="${i}">${icon('side')}${x.uni ? (uniStyle(x) === 'one' ? T('Left and right, one row') : T('Left and right')) : T('Both sides together')}</button>` : ''}</p></div>
      <button class="icon-btn" data-a="exMenu" data-e="${i}" aria-label="${T('Options for {name}', { name: esc(ex.name) })}">${icon('dots')}</button>
    </div>`;
  h += notesHTML(i, x, ctx);
  if (ctx.suggest) h += `<p class="hint good">${icon('up')}<span>${T('Last time you hit {n}+ reps on every set. Try <b>{w}</b> today.', { n: ctx.suggest.hi, w: esc(fmtW(ctx.suggest.w)) })}</span></p>`;
  else if (ctx.lp && ctx.lp.archived) h += `<p class="hint">${icon('archive')}<span>${exResetSince(x.exId) ? T('“Previous” is from before your reset ({date}). Records for this exercise start fresh.', { date: esc(fmtShort(ctx.lp.w.start)) }) : T('“Previous” is from before your reset ({date}). Records for this block start fresh.', { date: esc(fmtShort(ctx.lp.w.start)) })}</span></p>`;
  const two = isCompact(x), f1 = firstSide(x), del = ui.delMode === x.id;
  h += `<div class="sets ${del ? 'deleting' : ''}" style="--cols:${setCols(k, effOn, two)}"><div class="set-row head"><span>${TC('Set', 'column')}</span><span>${T('Previous')}</span>`;
  if (hasWeight(k)) h += `<span>${esc(weightLabel(k))}</span>`;
  if (hasReps(k)) h += two ? `<span class="hs-${f1}">${T('{side} reps', { side: f1 })}</span><span class="hs-${otherSide(f1)}">${T('{side} reps', { side: otherSide(f1) })}</span>` : `<span>${T('Reps')}</span>`;
  if (hasDist(k)) h += `<span>${distUnit(k)}</span>`;
  if (hasTime(k)) h += `<span>${T('Time')}</span>`;
  if (effOn) h += `<span>${effName()}</span>`;
  h += `<span class="sr">${T('Done')}</span></div>`;
  x.sets.forEach((s, j) => {
    const head = s.side && isPairTail(x.sets, j + 1), tail = s.side && isPairTail(x.sets, j);
    if (two && tail) return;
    if (two && head) { h += oneRowHTML(i, x, j, k, ctx, effOn); return; }
    if (head) h += `<div class="pair ${s.side === 'R' ? 'r-first' : ''} ${s.done && x.sets[j + 1].done ? 'done' : ''}">`;
    h += setRowHTML(i, x, j, k, ctx, effOn, two);
    if (tail) h += `</div>`;
  });
  const anyDone = x.sets.some(s => s.done);
  h += `</div>${del ? `<p class="hint del-hint">${icon('trash')}<span>${T('Tap <b>Delete</b> on a set to remove it. Any time, you can also swipe a set to the left.')}</span></p>` : ''}<div class="exc-actions">
    <div class="set-ctl"><button class="btn add" data-a="addSet" data-e="${i}">${icon('plus')}${T('Add set')}</button><button class="btn del-btn ${del ? 'on' : ''}" data-a="delMode" data-e="${i}" ${x.sets.length || del ? '' : 'disabled'} aria-pressed="${del}">${icon(del ? 'check' : 'trash')}${del ? T('Done') : T('Delete')}</button></div>
    <button class="btn ghost" data-a="repeatSet" data-e="${i}" ${anyDone ? '' : 'disabled'}>${icon('repeat')}${T('Repeat last')}</button>
    <button class="btn ghost" data-a="addWarm" data-e="${i}">${icon('flame')}${T('Warm-ups')}</button>${BAR_EQUIP.has(ex.eq) ? `<button class="btn ghost" data-a="plates" data-e="${i}">${icon('plate')}${T('Plates')}</button>` : ''}</div>`;
  if (focus) {
    const nxt = nextExIndex(w, i);
    h += `<div class="exc-nav"><button class="btn" data-a="woPrev" ${i === 0 ? 'disabled' : ''}>${icon('left')}${T('Previous')}</button>
      ${i < w.ex.length - 1 ? `<button class="btn next ${exComplete(x) ? 'primary' : ''}" data-a="woNext"><span>${T('Next: {name}', { name: esc(getEx(w.ex[nxt == null ? i + 1 : nxt].exId).name) })}</span>${icon('right')}</button>`
        : `<button class="btn next ${exComplete(x) ? 'primary' : ''}" data-a="woFinish"><span>${w.mode === 'edit' ? T('Save workout') : T('Finish workout')}</span>${icon('check')}</button>`}</div>`;
  }
  return h + `</article>`;
}
// the picture across the top of an exercise: your photo, the start and finish illustrations, or the muscle map
function exHero(exId, i) {
  const ex = getEx(exId), photo = photos.get(exId), art = artOf(exId);
  // moving: start and finish in one place, one fading into the other through the rep; still: side by side
  const mv = !photo && art && art.length > 1 && motionOn();
  const inner = photo ? `<img class="own" src="${photo}" alt="${T('Your photo of {name}', { name: esc(ex.name) })}">`
    : mv ? `<span class="hero-pic">${art.map((u, n) => `<img class="f${n}" src="${u}" alt="${n ? '' : esc(ex.name)}" decoding="async" data-art="${esc(exId)}">`).join('')}</span>`
    : art ? art.map((u, n) => `<img src="${u}" alt="${n ? '' : esc(ex.name)}" decoding="async" data-art="${esc(exId)}">`).join(art.length > 1 ? icon('right', 'arr') : '')
    : heroMaps(ex);
  const note = !photo && art ? artNote(exId) : '';
  return `<button class="exc-hero ${photo ? 'photo' : art ? 'art' + artKind(exId) : 'maps'}${note ? ' noted' : ''}"${mv ? ' data-mv="pic"' : ''} data-a="exInfo" data-e="${i}" data-callout="TGT:${esc(MUSCLES[ex.m].toUpperCase())} // ${esc(EQUIP[ex.eq].toUpperCase())}" aria-label="${T('How to do {name}', { name: esc(ex.name) })}">${inner}${note ? `<span class="hero-note">${T('Similar picture: {note}', { note: esc(note.charAt(0).toLowerCase() + note.slice(1)) })}</span>` : ''}${scoreOf(exId) != null ? `<span class="hero-tag">${icon('flask', 'inline')} ${T('Est. {score}/10 · how it works', { score: scoreOf(exId) })}</span>` : art && !photo ? `<span class="hero-tag">${T('How to')}</span>` : ''}</button>`;
}
const heroMaps = ex => `<span class="hero-maps">${figure('front', ex, 'full')}${figure('back', ex, 'full')}</span>`;
function setRowHTML(i, x, j, k, ctx, effOn, two) {
  const s = x.sets[j], ph = placeholder(x, j, ctx), prev = ctx.prevSets[j], prs = ctx.prs[j] || [];
  const pad = useKeypad();
  const inp = (f, val, pv, mode, aria) => pad
    ? `<button class="cell${val === '' ? ' empty' : ''}" data-a="kp" data-f="${f}" data-e="${i}" data-s="${j}" data-ph="${esc(pv)}" aria-label="${esc(aria)}">${val !== '' ? esc(val) : `<span class="ph">${esc(pv)}</span>`}</button>`
    : `<input class="cell" data-f="${f}" data-e="${i}" data-s="${j}" inputmode="${mode}" enterkeyhint="done" autocomplete="off" value="${esc(val)}" placeholder="${esc(pv)}" aria-label="${esc(aria)}">`;
  const n = s.side ? (s.side === 'L' ? T('left side') : T('right side')) : T('set {n}', { n: j + 1 });
  const above = s.done ? null : setAbove(x, j);
  const cls = ['set-row', s.done ? 'done' : '', s.t === 'W' ? 'warm' : '', s.side ? 'side-' + s.side : '', s.done && ui.flash === s.id ? 'just' : ''].join(' ');
  let h = `<div class="row-wrap"><button class="row-del" data-a="rowDel" data-e="${i}" data-s="${j}" tabindex="-1">${icon('trash')}<span>${T('Delete')}</span></button><div class="${cls}" data-s="${j}">`;
  h += badge(s.t, setLabel(x.sets, j), `data-a="setType" data-e="${i}" data-s="${j}"`, s.side);
  // "same as above" copies the set you just did; the line under it is last session's set
  h += `<div class="prev">${above ? `<button class="same" data-a="copyAbove" data-e="${i}" data-s="${j}" aria-label="${T('Same as the set above, {v}', { v: esc(fmtSet(x, above, k, false)) })}">${icon('same')}<span>${esc(fmtSet(x, above, k, false))}</span></button>` : ''}`
    + (prev ? `<button class="last ${ctx.lp.archived ? 'archived' : ''}" data-a="usePrev" data-e="${i}" data-s="${j}" aria-label="${T('Use last time, {v}', { v: esc(fmtSet(ctx.lp.x, prev, k)) })}">${above ? '' : `<i>${T('Last')}</i>`}${esc(fmtSet(ctx.lp.x, prev, k))}</button>` : above ? '' : '<span class="none">—</span>') + `</div>`;
  if (hasWeight(k)) h += inp('w', s.w != null ? dispW(s.w) : '', ph.w != null ? dispW(ph.w) : '', 'decimal', T('Weight, {set}', { set: n }));
  if (hasReps(k)) h += two ? inp('r', s.r ?? '', ph.r ?? '', 'numeric', T('Reps, {set}', { set: n })).replace('class="cell', 'class="cell span2') : inp('r', s.r ?? '', ph.r ?? '', 'numeric', T('Reps, {set}', { set: n }));
  if (hasDist(k)) h += inp('dist', s.dist != null ? dispDist(s.dist, k) : '', ph.dist != null ? dispDist(ph.dist, k) : '', 'decimal', T('Distance, {set}', { set: n }));
  if (hasTime(k)) h += inp('sec', s.sec != null ? fmtClock(s.sec) : '', ph.sec != null ? fmtClock(ph.sec) : '0:00', 'numeric', T('Time, {set}', { set: n }));
  if (effOn) h += `<button class="cell eff ${s.rir != null ? 'has' : 'empty'}" ${pad ? 'data-a="kp" data-f="rir"' : 'data-a="effort"'} data-e="${i}" data-s="${j}" aria-label="${T('{eff}, {set}', { eff: effName(), set: n })}">${s.rir != null ? esc(effDisp(s.rir)) : s.trir != null ? `<span class="ph">${esc(effDisp(s.trir))}</span>` : '<span class="ph">–</span>'}</button>`;
  h += ui.delMode === x.id ? delBtn(i, j, n)
    : `<button class="check" data-a="toggleSet" data-e="${i}" data-s="${j}" aria-pressed="${!!s.done}" aria-label="${s.done ? T('Uncheck {set}', { set: n }) : T('Check {set}', { set: n })}">${icon('check')}</button>`;
  h += `</div></div>`;
  if (prs.length && s.done) h += `<div class="pr-row ${ui.flash === s.id ? 'just' : ''}">${icon('trophy')}<span>${T('New record: {list}', { list: esc(prs.map(recKind).join(' · ')) })}</span></div>`;
  if (ui.effOpen === `${i}:${j}`) h += effPicker(i, j, s);
  return h;
}
// notes on an exercise: a setup note kept for next time (seat, pins, grip) and today's note. Written right on the card
const noteParts = t => (t || '').split(/\s*[,·،]\s*/).filter(Boolean);
// a quick word goes into the note as it's shown (in the chosen language); each one is [English, shown],
// so a word saved in English still counts as that word
const noteHas = (t, en, c) => noteParts(t).some(p => p === en || p === c);
// words for the end of a workout, in the order people tend to reach for them
const WNOTE_CHIPS = [['Great session', T('Great session')], ['Felt strong', T('Felt strong')], ['Good pump', T('Good pump')], ['New records', T('New records')], ['Tired', T('Tired')], ['Low energy', T('Low energy')], ['Slept badly', T('Slept badly')], ['Short on time', T('Short on time')], ['Busy gym', T('Busy gym')], ['Rushed rest', T('Rushed rest')], ['Sore from last time', T('Sore from last time')], ['Joint pain', T('Joint pain')], ['Ate well', T('Ate well')], ['Under-ate', T('Under-ate')], ['Good focus', T('Good focus')], ['Distracted', T('Distracted')]];
const NOTE_CHIPS = [['Felt strong', T('Felt strong')], ['Felt weak', T('Felt weak')], ['Easy', T('Easy')], ['Hard', T('Hard')], ['Form slipped', T('Form slipped')], ['Pain / discomfort', T('Pain / discomfort')], ['Changed the setup', T('Changed the setup')], ['Slow lowering', T('Slow lowering')], ['Paused reps', T('Paused reps')], ['Partials at the end', T('Partials at the end')]];
function notesHTML(i, x, ctx) {
  const last = !x.note && ctx.lp && ctx.lp.x.note ? ctx.lp.x.note : '';
  let h = setupHTML(i, x);
  if (ui.noteOpen === x.id) return h + `<div class="note-ed">
    <label class="note-f"><span>${icon('note')}${T('Today’s note')}</span><textarea data-note="today" data-e="${i}" rows="2" placeholder="${T('How did it feel? Pain, tempo, form…')}">${esc(x.note || '')}</textarea></label>
    <div class="chips wrap note-chips">${NOTE_CHIPS.map(([en, c]) => `<button class="chip ${(x.note || '').includes(en) || (x.note || '').includes(c) ? 'on' : ''}" data-a="noteChip" data-e="${i}" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    ${last ? `<p class="muted small">${T('Last time: {note}', { note: esc(last) })}</p>` : ''}
    <div class="row-btns"><button class="btn sm primary" data-a="noteDone">${T('Done')}</button></div></div>`;
  if (!x.note && !last) return h;
  return h + `<button class="exc-notes" data-a="noteOpen" data-e="${i}">${x.note ? `<span class="nl">${icon('note')}<span>${esc(x.note)}</span></span>` : ''}${last ? `<span class="nl last">${icon('undo')}<span>${T('Last time: {note}', { note: esc(last) })}</span></span>` : ''}</button>`;
}
/* ----- machine setup: seat, pads, handles…, kept per exercise and shown every time you do it ----- */
const setupOf = exId => (state.exPrefs[exId] || {}).note || '';
// the parts worth noting depend on the equipment
function setupParts(ex) {
  if (ex.eq === 'machine' || ex.eq === 'smith') return [T('Seat'), T('Back pad'), T('Chest pad'), T('Leg pad'), T('Handles'), T('Range lock'), T('Foot position'), T('Pin')];
  if (ex.eq === 'cable') return [T('Pulley height'), T('Attachment'), T('Stance'), T('Steps from the stack'), T('Grip'), T('Seat')];
  if (['barbell', 'ezbar', 'trapbar', 'specialty', 'landmine'].includes(ex.eq)) return [T('Bench angle'), T('Rack height'), T('Safety pins'), T('Grip width'), T('Stance'), T('Belt')];
  if (ex.eq === 'dumbbell' || ex.eq === 'kettlebell') return [T('Bench angle'), T('Seat'), T('Grip'), T('Stance')];
  return [T('Bench angle'), T('Grip'), T('Stance'), T('Band'), T('Foot position')];
}
function setupHTML(i, x) {
  const setup = setupOf(x.exId);
  if (ui.setupOpen === x.id) return `<div class="note-ed setup-ed">
    <label class="note-f"><span>${icon('pin')}${T('Machine setup · shown every time you do this exercise')}</span><input data-note="setup" data-e="${i}" value="${esc(setup)}" placeholder="${T('Seat 4, back pad 2, handles wide…')}" autocomplete="off" enterkeyhint="done"></label>
    <div class="chips wrap setup-chips">${setupParts(getEx(x.exId)).map(c => `<button class="chip" data-a="setupChip" data-e="${i}" data-v="${esc(c)}">${icon('plus')}${esc(c)}</button>`).join('')}</div>
    <p class="muted small">${T('Tap a part, then type its setting.')}</p>
    <div class="row-btns">${setup ? `<button class="btn sm ghost" data-a="setupClear">${T('Clear')}</button>` : ''}<button class="btn sm primary" data-a="setupDone">${T('Done')}</button></div></div>`;
  return setup ? `<button class="exc-setup" data-a="setupOpen" data-e="${i}" aria-label="${T('Machine setup: {setup}. Change', { setup: esc(setup) })}">${icon('pin')}<span><b>${T('Setup')}</b> ${esc(setup)}</span>${icon('edit')}</button>` : '';
}
function exSetup(i) {
  const x = A().ex[i];
  ui.setupOpen = x.id; ui.noteOpen = null; ui.kp = null; renderWorkout();
  const t = $('#workout input[data-note="setup"]');
  if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
}
function noteInput(el) {
  const x = A() && A().ex[+el.dataset.e];
  if (!x) return;
  if (el.dataset.note === 'setup') { const p = state.exPrefs[x.exId] = state.exPrefs[x.exId] || {}; p.note = el.value.trim() ? el.value : ''; if (!p.note) delete p.note; }
  else x.note = el.value;
  save();
}
const delBtn = (i, j, n) => `<button class="check del" data-a="rowDel" data-e="${i}" data-s="${j}" aria-label="${T('Delete {set}', { set: esc(n) })}">${icon('trash')}</button>`;
// a left/right pair in one row: one weight, reps for each side, one effort, one check (the earlier style)
function oneRowHTML(i, x, j, k, ctx, effOn) {
  const a = x.sets[j], b = x.sets[j + 1], f1 = firstSide(x);
  const [p, q] = a.side === f1 ? [j, j + 1] : [j + 1, j];
  const done = a.done && b.done, part = !done && (a.done || b.done);
  const pad = useKeypad(), pha = placeholder(x, j, ctx), php = placeholder(x, p, ctx), phq = placeholder(x, q, ctx);
  const n = T('set {n}', { n: oneLabel(x.sets, j) });
  const inp = (jj, f, val, pv, mode, aria, cls = '') => pad
    ? `<button class="cell ${cls}${val === '' ? ' empty' : ''}" data-a="kp" data-f="${f}" data-e="${i}" data-s="${jj}" data-ph="${esc(pv)}" aria-label="${esc(aria)}">${val !== '' ? esc(val) : `<span class="ph">${esc(pv)}</span>`}</button>`
    : `<input class="cell ${cls}" data-f="${f}" data-e="${i}" data-s="${jj}" inputmode="${mode}" enterkeyhint="done" autocomplete="off" value="${esc(val)}" placeholder="${esc(pv)}" aria-label="${esc(aria)}">`;
  const prevA = ctx.prevSets[p], prevB = ctx.prevSets[q];
  const lw = prevA && prevA.w != null && hasWeight(k) ? dispW(prevA.w) + ' × ' : '';
  const last = prevA || prevB ? `${lw}${prevA ? prevA.r ?? '–' : '–'} / ${prevB ? prevB.r ?? '–' : '–'}` : '';
  const upA = done ? null : setAbove(x, p), upB = done ? null : setAbove(x, q);
  const up = upA || upB ? `${upA && upA.w != null && hasWeight(k) ? dispW(upA.w) + ' × ' : ''}${upA ? upA.r ?? '–' : '–'}/${upB ? upB.r ?? '–' : '–'}` : '';
  const sp = x.sets[p], sq = x.sets[q];
  let h = `<div class="row-wrap"><button class="row-del" data-a="rowDel" data-e="${i}" data-s="${j}" tabindex="-1">${icon('trash')}<span>${T('Delete')}</span></button>`
    + `<div class="set-row one ${done ? 'done' : ''} ${part ? 'part' : ''} ${a.t === 'W' ? 'warm' : ''} ${done && (ui.flash === a.id || ui.flash === b.id) ? 'just' : ''}" data-s="${j}">`;
  h += `<button class="badge t-${a.t} ${a.t === 'N' ? 'lr' : ''}" data-a="setType" data-e="${i}" data-s="${j}" aria-label="${T('Set {n}, left and right. Change type', { n: esc(oneLabel(x.sets, j)) })}">${esc(oneLabel(x.sets, j))}</button>`;
  h += `<div class="prev">${up ? `<button class="same" data-a="copyAbove" data-e="${i}" data-s="${j}" aria-label="${T('Same as the set above, {v}', { v: esc(up) })}">${icon('same')}<span>${esc(up)}</span></button>` : ''}`
    + (last ? `<button class="last ${ctx.lp.archived ? 'archived' : ''}" data-a="usePrev" data-e="${i}" data-s="${j}" aria-label="${T('Use last time, {v}', { v: esc(last) })}">${up ? '' : `<i>${T('Last')}</i>`}${esc(last)}</button>` : up ? '' : '<span class="none">—</span>') + `</div>`;
  // one weight for both sides; if they were logged with different weights, show both (typing a new one sets both)
  const diffW = sp.w != null && sq.w != null && Math.abs(sp.w - sq.w) > 1e-9;
  if (hasWeight(k)) h += inp(j, 'w', diffW ? `${dispW(sp.w)}/${dispW(sq.w)}` : a.w != null ? dispW(a.w) : b.w != null ? dispW(b.w) : '', pha.w != null ? dispW(pha.w) : '', 'decimal', diffW ? T('Weight, {set}: {side1} {w1}, {side2} {w2}', { set: n, side1: sideName(f1), w1: dispW(sp.w), side2: sideName(otherSide(f1)), w2: dispW(sq.w) }) : T('Weight, {set}', { set: n }), diffW ? 'two-w' : '');
  h += inp(p, 'r', sp.r ?? '', php.r ?? '', 'numeric', T('{side} reps, {set}', { side: sideName(f1), set: n }), 'side-' + f1 + (sp.done ? ' got' : ''));
  h += inp(q, 'r', sq.r ?? '', phq.r ?? '', 'numeric', T('{side} reps, {set}', { side: sideName(otherSide(f1)), set: n }), 'side-' + otherSide(f1) + (sq.done ? ' got' : ''));
  // effort for each side, stacked in the side colours (first side on top)
  const ev = o => o.rir != null ? esc(effDisp(o.rir)) : `<span class="ph">${o.trir != null ? esc(effDisp(o.trir)) : '–'}</span>`;
  if (effOn) h += `<button class="cell eff sides ${sp.rir != null || sq.rir != null ? 'has' : 'empty'}" ${pad ? `data-a="kp" data-f="rir" data-e="${i}" data-s="${p}"` : `data-a="effort" data-e="${i}" data-s="${j}"`} aria-label="${T('{eff} for each side, {set}: {side1} {v1}, {side2} {v2}', { eff: effName(), set: n, side1: sideName(f1), v1: sp.rir != null ? effDisp(sp.rir) : T('not set'), side2: sideName(otherSide(f1)), v2: sq.rir != null ? effDisp(sq.rir) : T('not set') })}"><span class="side-${f1}">${ev(sp)}</span><span class="side-${otherSide(f1)}">${ev(sq)}</span></button>`;
  h += ui.delMode === x.id ? delBtn(i, j, n)
    : `<button class="check" data-a="toggleBoth" data-e="${i}" data-s="${j}" aria-pressed="${done}" aria-label="${done ? T('Uncheck {set}, both sides', { set: n }) : T('Check {set}, both sides', { set: n })}">${icon('check')}</button>`;
  h += `</div></div>`;
  const prs = [...(ctx.prs[j] || []), ...(ctx.prs[j + 1] || [])];
  if (prs.length && done) h += `<div class="pr-row ${ui.flash === a.id || ui.flash === b.id ? 'just' : ''}">${icon('trophy')}<span>${T('New record: {list}', { list: esc([...new Set(prs)].map(recKind).join(' · ')) })}</span></div>`;
  if (ui.effOpen === `${i}:${j}`) h += effPicker(i, p, sp, q, sq);
  return h;
}
function oneLabel(sets, j) {
  const s = sets[j];
  if (s.t !== 'N') return SET_TYPES[s.t].short;
  return String(sets.slice(0, j + 1).filter((o, n) => o.t === 'N' && !isPairTail(sets, n)).length);
}
// check both sides of a one-row pair; a half-done pair counts as not done
function toggleBoth(i, j, viaPad) {
  const w = A(), x = w.ex[i], a = x.sets[j], b = x.sets[j + 1], k = getEx(x.exId).k;
  // both sides checked: uncheck both. Only one: this checks the other side too
  if (a.done && b.done) { for (const o of [a, b]) { o.done = false; delete o.at; } ui.kp = null; save(); renderWorkout(); return; }
  const ctx = exCtx(w, x);
  const fill = (o, jj) => { if (o.done) return o; const c = { ...o }, ph = placeholder(x, jj, ctx); for (const f of ['w', 'r', 'sec', 'dist']) if (c[f] == null && ph[f] != null) c[f] = ph[f]; return c; };
  const ca = fill(a, j), cb = fill(b, j + 1);
  if (!b.done && ca.w != null && cb.w == null) cb.w = ca.w; // sides logged with different weights keep them
  if (!hasValue(k, x, ca) || !hasValue(k, x, cb)) {
    toast(T('Type the reps for both sides first.'));
    const row = $(`#workout .exc[data-e="${i}"] .set-row[data-s="${j}"]`);
    if (row) { row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake'); }
    return;
  }
  Object.assign(a, ca);
  if (!b.done) Object.assign(b, cb);
  if (!a.done) { keepShownEffort(a, k); a.done = true; a.at = Date.now(); }
  // the rest timer and moving on happen as the second row is checked; a right side done earlier keeps its time
  const at = b.done ? b.at : null;
  if (b.done) b.done = false;
  toggleSet(i, j + 1, viaPad);
  if (at != null) b.at = at;
}
// nearest set above this one of the same kind (and side) that has numbers in it
function setAbove(x, j) {
  const s = x.sets[j];
  for (let n = j - 1; n >= 0; n--) {
    const o = x.sets[n];
    if ((o.t === 'W') !== (s.t === 'W') || (o.side || '') !== (s.side || '')) continue;
    if (o.w == null && o.r == null && o.sec == null && o.dist == null) continue;
    return ['w', 'r', 'sec', 'dist'].every(f => o[f] == null || o[f] === s[f]) ? null : o;
  }
  return null;
}
// a left/right set is two rows; deleting either deletes the set
function setRows(x, s) { const m = partnerOf(x, s); return (m ? [s, m] : [s]).sort((a, b) => x.sets.indexOf(a) - x.sets.indexOf(b)); }
function deleteRows(x, rows, label) {
  const before = x.sets.slice();
  x.sets = x.sets.filter(o => !rows.includes(o));
  save(); renderWorkout();
  toast(label || (rows.length > 1 ? T('Set deleted, both sides.') : T('Set deleted.')), { label: T('Undo'), fn: () => { if (A() && A().ex.includes(x)) { x.sets = before; save(); renderWorkout(); } } });
}
function repeatSet(i) {
  const x = A().ex[i];
  const last = x.sets.slice().reverse().find(s => s.done && s.t !== 'W') || x.sets.slice().reverse().find(s => s.done);
  if (!last) { addSet(i); return; }
  const rows = setRows(x, last), p = uid();
  const copies = rows.map(o => {
    const c = { id: uid(), t: o.t, tr: o.tr || '', trir: o.trir ?? null, done: false };
    for (const f of ['w', 'r', 'sec', 'dist']) if (o[f] != null) c[f] = o[f];
    if (o.side) { c.side = o.side; c.pair = p; }
    return c;
  });
  x.sets.push(...copies);
  save(); renderWorkout();
  toast(T('Added another {set}. Tap ✓ when it’s done.', { set: fmtSet(x, last, null, false) }));
}
// the effort choices, as [RIR, shown]: RPE 6–10 in halves, or RIR 0–5+ (under the set, and on the number pad)
const effVals = () => state.settings.effort === 'rpe' ? [[4, '6'], [3, '7'], [2.5, '7.5'], [2, '8'], [1.5, '8.5'], [1, '9'], [0.5, '9.5'], [0, '10']] : [[0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5+']];
const effQ = two => state.settings.effort === 'rpe' ? (two ? T('How hard was it? (RPE), each side') : T('How hard was it? (RPE)')) : (two ? T('Reps left in the tank (RIR), each side') : T('Reps left in the tank (RIR)'));
// with a second set (the other side of a one-row left/right set), each side gets its own row of choices
function effPicker(i, j, s, j2, s2) {
  const rpe = state.settings.effort === 'rpe', vals = effVals();
  // one even row of choices (RPE: two rows of four); the target, while nothing is picked, gets a ring
  const chips = (jj, o, one) => `<div class="eff-chips ${rpe ? 'rpe' : ''}">${vals.map(([v, l]) =>
    `<button class="${o.rir === v ? 'on' : o.rir == null && o.trir === v ? 'target' : ''}" data-a="effPick" data-e="${i}" data-s="${jj}" data-v="${v}"${one} aria-pressed="${o.rir === v}">${l}</button>`).join('')}</div>`;
  const q = effQ(s2 != null);
  // Clear empties this set (both sides of a one-row left/right set)
  const head = `<div class="eff-head"><span class="eff-q">${q}</span><button class="eff-clear" data-a="effPick" data-e="${i}" data-s="${j}" data-v="">${T('Clear')}</button></div>`;
  if (s2 == null) return `<div class="eff-pick">${head}${chips(j, s, '')}</div>`;
  return `<div class="eff-pick sides">${head}${[[j, s], [j2, s2]].map(([jj, o]) => `<div class="eff-side"><b class="side-${o.side}">${sideName(o.side)}</b>${chips(jj, o, ' data-one="1"')}</div>`).join('')}</div>`;
}
function nextExIndex(w, i) {
  for (let n = i + 1; n < w.ex.length; n++) if (!exComplete(w.ex[n])) return n;
  return i + 1 < w.ex.length ? i + 1 : null;
}
function woGo(i, smooth) {
  const w = A();
  if (!w || i < 0 || i >= w.ex.length) return;
  const back = i < w.cur;
  w.cur = i;
  ui.effOpen = null;
  ui.kp = null;
  ui.delMode = null;
  ui.noteOpen = null;
  ui.setupOpen = null;
  save();
  if (state.settings.view === 'focus') {
    const old = smooth && canMove() ? $('#workout .wo-main > .exc') : null;
    const ghost = old ? liftCard(old) : null;
    renderWorkout(true);
    const card = $('#workout .exc');
    if (card && smooth) cardIn(card, ghost, back);
    else if (ghost) ghost.box.remove();
  } else {
    renderWorkout();
    const c = $('#exc-' + i), main = $('#workout .wo-main');
    if (c && main) {
      main.scrollTo({ top: main.scrollTop + c.getBoundingClientRect().top - main.getBoundingClientRect().top - 8, behavior: smooth && !reduceMotion.matches ? 'smooth' : 'auto' });
      if (smooth) { c.classList.remove('arrive'); void c.offsetWidth; c.classList.add('arrive'); }
    }
  }
}
// the target RIR shown in a set is logged with it when you check it, like the weight and reps shown
function keepShownEffort(s, k) {
  if (s.rir == null && s.trir != null && s.t !== 'W' && hasReps(k) && state.settings.effort !== 'off') s.rir = s.trir;
}
// a light tick when a set is done: vibration where the browser has it; on iPhone (no vibration API)
// Safari gives a haptic tap when a switch control is toggled, so one is toggled out of sight
function haptic() {
  try {
    if (navigator.vibrate) { navigator.vibrate(12); return; }
    if (!/iPhone|iPad|iPod/.test(navigator.userAgent) && !(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return;
    const l = document.createElement('label'), c = document.createElement('input');
    c.type = 'checkbox'; c.setAttribute('switch', ''); l.ariaHidden = 'true'; l.style.display = 'none';
    l.append(c); document.head.append(l); l.click(); l.remove();
  } catch (e) { /* no haptics here */ }
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
  // the numbers shown are taken into the set only if it can be checked
  const ph = placeholder(x, j, exCtx(w, x)), c = { ...s };
  for (const f of ['w', 'r', 'sec', 'dist']) if (c[f] == null && ph[f] != null) c[f] = ph[f];
  if (!hasValue(k, x, c)) {
    toast(hasReps(k) ? T('Type how many reps you did first.') : T('Type the time or distance first.'));
    const row = $(`#workout .exc[data-e="${i}"] .set-row[data-s="${j}"]`);
    if (row) { row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake'); }
    return;
  }
  Object.assign(s, c);
  keepShownEffort(s, k);
  s.done = true;
  s.at = Date.now();
  delete s.lr;
  ui.flash = s.id; // the row just checked gets its animation
  if (exComplete(x)) ui.flashEx = x.id; // and the whole exercise when this was its last set
  ui.kp = null;
  haptic();
  // first side of a left/right set: no rest yet, straight on to the other side
  const mate = partnerOf(x, s);
  if (mate && !mate.done) {
    if (viaPad) ui.kp = kpOpen(i, x.sets.indexOf(mate), rowFields(x, k)[0]);
    save(); renderWorkout(); markKpCell(true);
    return;
  }
  const editing = w.mode === 'edit';
  const ss = ssInfo(w, i);
  let jumpTo = null, groupDone = false;
  if (ss) {
    // straight on to the next exercise in the group that has sets left (no rest); going round to the start ends a round
    const g = ss.g.idx;
    let next = null, wrapped = false;
    for (let d = 1; d < g.length && next == null; d++) if (!exComplete(w.ex[g[(ss.k + d) % g.length]])) { next = g[(ss.k + d) % g.length]; wrapped = ss.k + d >= g.length; }
    if (next != null) jumpTo = next;
    groupDone = next == null && exComplete(x);
    if (next == null || wrapped) {
      const after = next != null ? next : groupDone ? nextExIndex(w, i) : i;
      if (!editing && state.settings.autoRest) startRest(x.rest || state.settings.rest, after != null ? getEx(w.ex[after].exId).name : '');
    }
  } else if (!editing && state.settings.autoRest) {
    const remaining = x.sets.some(o => !o.done);
    const nxt = nextExIndex(w, i);
    startRest(x.rest || state.settings.rest, remaining ? getEx(x.exId).name : nxt != null ? getEx(w.ex[nxt].exId).name : '');
  }
  save();
  if (jumpTo != null && state.settings.view === 'focus') {
    renderWorkout();
    setTimeout(() => { if (A() === w) { woGo(jumpTo, true); toast(T('Superset: {name}', { name: getEx(w.ex[jumpTo].exId).name })); } }, 350);
    return;
  }
  renderWorkout();
  // all sets done: on to the next unfinished exercise (slide in one-at-a-time, glide down the list)
  if (exComplete(x) && state.settings.autoNext && (!ss || groupDone) && !editing) {
    const nxt = nextExIndex(w, i);
    if (nxt != null && nxt !== i) {
      if (state.settings.view !== 'focus') w.cur = i; // so the check below holds even if the list scrolled a little
      setTimeout(() => {
        if (A() === w && !ui.woHidden && w.cur === i && exComplete(w.ex[i]) && !ui.kp) { woGo(nxt, true); toast(T('Up next: {name}', { name: getEx(w.ex[nxt].exId).name }), { label: T('Go back'), fn: () => woGo(i, true) }); }
      }, 650);
    }
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
// one more warm-up, after the warm-ups already there; sided = a left row and a right row
function addWarmSet(i, sided) {
  const x = A().ex[i], warm = x.sets.filter(s => s.t === 'W');
  const like = warm.filter(s => !!s.side === sided).pop() || warm[warm.length - 1];
  const base = { t: 'W', tr: '', trir: null, done: false };
  if (like) {
    if (like.w != null || like.tw != null) base.tw = like.w ?? like.tw;
    base.tr = like.r != null ? String(like.r) : like.tr || '';
  }
  const at = warm.length ? x.sets.indexOf(warm[warm.length - 1]) + 1 : 0;
  const rows = sided ? pairUp([base], firstSide(x)) : [base];
  x.sets.splice(at, 0, ...rows.map(o => ({ ...o, id: uid() })));
  save(); renderWorkout();
  toast(sided ? T('Added a warm-up, left and right.') : T('Added a warm-up set.'));
}
function warmMenu(i) {
  const x = A().ex[i], ex = getEx(x.exId), uni = !!x.uni, sides = hasReps(ex.k);
  menuSheet(T('Warm-ups · {name}', { name: ex.name }), [
    [T('Add a warm-up set'), 'flame', () => addWarmSet(i, uni), { sub: uni ? T('Left and right') : T('Both sides together') }],
    sides && !uni ? [T('Add a one-side warm-up'), 'side', () => addWarmSet(i, true), { sub: T('A left row and a right row') }] : null,
    sides && uni ? [T('Add a both-sides warm-up'), 'side', () => addWarmSet(i, false), { sub: T('One row for both sides') }] : null,
    ex.k === 'wr' ? [T('Suggested warm-ups'), 'flame', () => addWarmups(i), { sub: uni ? T('About 50%, 70% and 85% of your first working weight, left and right. Replaces warm-ups you haven’t logged.') : T('About 50%, 70% and 85% of your first working weight. Replaces warm-ups you haven’t logged.') }] : null
  ]);
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
    toast(T('Added a warm-up set. Type a working weight first to get suggested warm-ups.'));
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
  toast(TN(made.length, 'Added {n} warm-up sets up to {w}.', 'Added {n} warm-up sets up to {w}.', { w: fmtW(target) }));
}
function woInput(el) { if (el.dataset.note) noteInput(el); else woSetField(+el.dataset.e, +el.dataset.s, el.dataset.f, el.value); }
function woSetField(i, j, f, v) {
  const w = A();
  if (!w) return;
  const x = w.ex[i], s = x && x.sets[j];
  if (!s) return;
  const k = getEx(x.exId).k;
  const pos = n => n != null && isFinite(n) && n >= 0 ? n : null; // no negative weights, reps, times or distances
  if (f === 'w') s.w = toKg(pos(parseNum(v)));
  else if (f === 'sec') s.sec = pos(parseTime(v));
  else if (f === 'dist') s.dist = toMeters(pos(parseNum(v)), k);
  else { const n = parseInt(v, 10); s[f] = pos(isFinite(n) ? n : null); }
  if (s[f] == null) delete s[f];
  const m = f === 'w' && isCompact(x) ? partnerOf(x, s) : null;
  if (m) { if (s.w == null) delete m.w; else m.w = s.w; }
  save();
}

/* ----- Workout sheets ----- */

// how a one-side exercise is logged: both sides as one set, a row for each side, or one row with reps for each side
function uniSheet(i) {
  const x = A().ex[i], ex = getEx(x.exId), cur = !x.uni ? 'off' : uniStyle(x);
  const pick = v => {
    const p = state.exPrefs[x.exId] = state.exPrefs[x.exId] || {};
    if (v === 'off') { setUni(x, false); p.uni = false; }
    else { if (!x.uni) setUni(x, true); p.uni = true; p.uniStyle = v; }
    ui.kp = null; save(); renderWorkout();
    if (v === 'off' ? x.sets.some(o => o.side && o.done) : x.sets.some(o => !o.side && o.done && hasReps(getEx(x.exId).k))) toast(T('Sets you already checked stay the way you did them.'));
  };
  const opt = (v, ic, label, sub) => [label, cur === v ? 'check' : ic, () => pick(v), { sub }];
  menuSheet(T('Left and right · {name}', { name: ex.name }), [
    opt('rows', 'rows', T('Left and right, separate rows'), T('Each side gets its own row: weight, reps, effort and check. Best when the sides differ.')),
    opt('one', 'side', T('Left and right in one row'), T('One weight, the reps for each side side by side, and one check. The quick way.')),
    opt('off', 'dumbbell', T('Both sides together'), T('One set counts both sides, like a normal exercise.'))
  ]);
}
function exMenu(i) {
  const w = A(), x = w.ex[i], ex = getEx(x.exId);
  const ss = ssInfo(w, i);
  menuSheet(ex.name, [
    [T('History and records'), 'chart', () => exerciseSheet(x.exId)],
    [T('Replace exercise'), 'swap', () => pickExercises({ single: true, title: T('Replace with'), onPick: ([id]) => {
      let y = x;
      // sets already done stay logged under the exercise they were done on; the new one takes the sets still to do
      if (x.sets.some(s => s.done)) {
        const todo = x.sets.filter(s => !s.done && !(partnerOf(x, s) || {}).done);
        x.sets = x.sets.filter(s => !todo.includes(s));
        y = { ...clone(x), id: uid(), sets: todo.length ? todo : [{ id: uid(), t: 'N', done: false }], note: '', ss: null };
        w.ex.splice(i + 1, 0, y);
        w.cur = i + 1;
        toast(T('The sets you did stay under {name}.', { name: getEx(x.exId).name }));
      }
      y.exId = id; const d = getEx(id);
      setUni(y, hasReps(d.k) && !!((state.exPrefs[id] || {}).uni ?? d.uni));
      for (const s of y.sets) if (!s.done) { delete s.w; delete s.r; delete s.sec; delete s.dist; delete s.tw; }
      save(); renderWorkout(true);
    } })],
    [T('Note for today'), 'note', () => exNote(i), { sub: x.note || T('How it felt, pain, tempo…') }],
    [T('Machine setup'), 'pin', () => exSetup(i), { sub: setupOf(x.exId) || T('Seat, pads, handles…; shown every time you do this exercise') }],
    [photos.has(x.exId) ? T('Change photo') : T('Add a photo of this machine'), 'camera', () => pickPhoto(x.exId), { sub: T('Take one or pick from your library') }],
    hasReps(ex.k) ? [T('Left and right…'), 'side', () => uniSheet(i), { sub: x.uni ? (uniStyle(x) === 'one' ? T('Now: one row with reps for each side') : T('Now: a row for each side')) : T('Now: both sides together') }] : null,
    sciOf(x.exId) && sciOf(x.exId).adjustable ? [T('Machine resistance profile…'), 'chart', () => profileSheet(x.exId), { sub: sciOf(x.exId).profile ? T('Now: {profile}', { profile: sciOf(x.exId).profile === 'custom' ? T('drawn by you') : T(SCI.PROFILES[sciOf(x.exId).profile].name).toLowerCase() }) : T('Where your machine feels hardest; it changes the rating') }] : null,
    [T('Reset progression for this exercise'), 'reset', () => resetExercise(x.exId), { sub: exResetSince(x.exId) ? T('Counting from {date}. Only this exercise', { date: fmtShort(exResetSince(x.exId)) }) : T('Fresh records and tips for this exercise only; history is kept') }],
    exResetSince(x.exId) ? [T('Undo this exercise’s last reset'), 'undo', () => { undoExReset(x.exId); toast(T('Last reset undone.')); }] : null,
    i < w.ex.length - 1 ? [ss && ss.k < ss.g.idx.length - 1 ? T('Unlink from next exercise') : T('Superset with next exercise'), 'link', () => {
      if (ss && ss.k < ss.g.idx.length - 1) unlinkNext(w.ex, i);
      else { linkNext(w.ex, i); toast(T('Linked. You’ll go back and forth with no rest until the round is done.')); }
      save(); renderWorkout();
    }, { sub: T('Alternate sets, then rest after both') }] : null,
    ex.k === 'wr' ? [T('Add suggested warm-ups'), 'flame', () => addWarmups(i)] : null,
    BAR_EQUIP.has(ex.eq) ? [T('Plate calculator'), 'plate', () => plateSheet(x.sets.find(s => !s.done && s.t !== 'W')?.w ?? x.sets[x.sets.length - 1]?.w)] : null,
    i > 0 ? [T('Move up'), 'up', () => { w.ex.splice(i - 1, 0, w.ex.splice(i, 1)[0]); w.cur = i - 1; save(); renderWorkout(); }] : null,
    i < w.ex.length - 1 ? [T('Move down'), 'down', () => { w.ex.splice(i + 1, 0, w.ex.splice(i, 1)[0]); w.cur = i + 1; save(); renderWorkout(); }] : null,
    [T('Remove exercise'), 'trash', () => {
      const removed = w.ex.splice(i, 1)[0];
      if (w.cur >= w.ex.length) w.cur = Math.max(0, w.ex.length - 1);
      save(); renderWorkout();
      toast(T('Removed {name}.', { name: ex.name }), { label: T('Undo'), fn: () => { if (A() === w) { w.ex.splice(i, 0, removed); w.cur = i; save(); renderWorkout(); } } });
    }, { danger: true }]
  ]);
}
function exNote(i) {
  const x = A().ex[i];
  ui.noteOpen = x.id; ui.setupOpen = null; ui.kp = null; renderWorkout();
  const t = $('#workout textarea[data-note="today"]');
  if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
}
function setTypeSheet(i, j) {
  const x = A().ex[i], s = x.sets[j], mate = partnerOf(x, s);
  const rows = (mate ? [s, mate] : [s]).sort((a, b) => x.sets.indexOf(a) - x.sets.indexOf(b));
  // numbered like the badges: warm-ups aren't counted
  const num = x.sets.slice(0, j + 1).filter(o => o.t !== 'W' && !o.side).length || 1;
  const title = s.side ? (s.side === 'L' ? T('Left side') : T('Right side')) : s.t === 'W' ? T('Warm-up') : T('Set {n}', { n: num });
  const restore = before => { if (A() && A().ex.includes(x)) { x.sets = before; save(); renderWorkout(); } };
  openSheet({
    cls: 'small',
    render: () => `${sheetHead(`${title} · ${esc(getEx(x.exId).name)}`)}<div class="sheet-body menu">
      ${TYPE_ORDER.map(t => `<button class="menu-item ${s.t === t ? 'on' : ''}" data-a="type" data-t="${t}"><span class="badge t-${t}">${t === 'N' ? (s.side ? term(s.side) : num) : SET_TYPES[t].short}</span><span><b>${SET_TYPES[t].label}</b><small>${SET_TYPES[t].desc}</small></span>${s.t === t ? icon('check', 'tick') : ''}</button>`).join('')}
      <div class="menu-sep"></div>
      ${hasReps(getEx(x.exId).k) ? (mate
        ? `<button class="menu-item" data-a="join">${icon('side')}<span><b>${T('Do both sides together')}</b><small>${T('Joins the left and right rows into one set')}</small></span></button>`
        : `<button class="menu-item" data-a="split">${icon('side')}<span><b>${T('Do this set one side at a time')}</b><small>${s.t === 'W' ? T('Splits it into a left row and a right row, for a one-arm or one-leg warm-up') : T('Splits it into a left row and a right row')}</small></span></button>`) : ''}
      <button class="menu-item" data-a="dup">${icon('copy')}<span><b>${mate ? T('Duplicate this set, both sides') : T('Duplicate set')}</b></span></button>
      ${mate ? `<button class="menu-item" data-a="swap">${icon('swap')}<span><b>${otherSide(rows[0].side) === 'L' ? T('Do the left side first') : T('Do the right side first')}</b><small>${T('Swaps the order of the two sides')}</small></span></button>` : ''}
      <button class="menu-item danger" data-a="del">${icon('trash')}<span><b>${mate ? T('Delete this set, both sides') : T('Delete set')}</b></span></button>
      ${mate ? `<button class="menu-item danger" data-a="delOne">${icon('x')}<span><b>${s.side === 'L' ? T('Delete only the left side') : T('Delete only the right side')}</b></span></button>` : ''}</div>`,
    actions: {
      type: (b, def) => { for (const o of rows) o.t = b.dataset.t; save(); closeSheet(def); renderWorkout(); },
      dup: (b, def) => {
        const p = uid(), at = x.sets.indexOf(rows[rows.length - 1]) + 1;
        const copies = rows.map(o => { const c = clone(o); c.id = uid(); c.done = false; delete c.at; if (mate) c.pair = p; return c; });
        x.sets.splice(at, 0, ...copies); save(); closeSheet(def); renderWorkout();
      },
      split: (b, def) => { if (s.done) { toast(T('This set is checked. Uncheck it first to split it into left and right.')); return; } x.sets.splice(x.sets.indexOf(s), 1, ...pairUp([s], firstSide(x))); save(); closeSheet(def); renderWorkout(); },
      join: (b, def) => { if (rows.some(o => o.done)) { toast(T('Uncheck both sides first to join them into one set.')); return; } x.sets.splice(x.sets.indexOf(rows[0]), 2, ...unpair(rows)); save(); closeSheet(def); renderWorkout(); },
      swap: (b, def) => { const a = x.sets.indexOf(rows[0]), c = x.sets.indexOf(rows[1]); [x.sets[a], x.sets[c]] = [x.sets[c], x.sets[a]]; save(); closeSheet(def); renderWorkout(); },
      del: (b, def) => {
        const before = x.sets.slice();
        x.sets = x.sets.filter(o => !rows.includes(o)); save(); closeSheet(def); renderWorkout();
        toast(mate ? T('Set deleted, both sides.') : T('Set deleted.'), { label: T('Undo'), fn: () => restore(before) });
      },
      delOne: (b, def) => {
        const before = x.sets.slice(), pair = s.pair;
        x.sets = x.sets.filter(o => o !== s); delete mate.pair; save(); closeSheet(def); renderWorkout();
        toast(T('Side deleted.'), { label: T('Undo'), fn: () => { mate.pair = pair; restore(before); } });
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
    [T('Rename workout'), 'edit', () => renameWorkout()],
    [T('Workout notes'), 'note', () => inputSheet({ title: T('Workout notes'), label: w.name, value: w.note || '', multiline: true, onOk: v => { w.note = v; save(); } }), { sub: w.note || T('How it felt, sleep, energy…') }],
    w.mode === 'edit' ? [T('Date and time'), 'calendar', () => dateSheet(), { sub: fmtDate(w.start) + ', ' + fmtTime(w.start) }] : null,
    [state.settings.view === 'focus' ? T('Show all exercises in a list') : T('Show one exercise at a time'), state.settings.view === 'focus' ? 'rows' : 'layout', () => { state.settings.view = state.settings.view === 'focus' ? 'list' : 'focus'; save(); renderWorkout(true); fadeUp($('#workout .wo-main')); }],
    [T('Add exercises'), 'plus', () => addExercisesToWorkout()],
    w.mode === 'edit'
      ? [T('Cancel editing'), 'x', () => confirmSheet({ title: T('Cancel editing?'), text: T('Your changes to this workout won’t be saved.'), ok: T('Discard changes'), danger: true, cancel: T('Keep editing'), onOk: () => discardActive() }), { danger: true }]
      : [T('Discard workout'), 'trash', () => confirmSheet({ title: T('Discard this workout?'), text: T('Every set you logged in it will be deleted. This can’t be undone.'), ok: T('Discard workout'), danger: true, cancel: T('Keep it'), onOk: () => discardActive() }), { danger: true }]
  ]);
}
function renameWorkout() {
  const w = A();
  inputSheet({ title: T('Rename workout'), label: T('Name'), value: w.name, onOk: v => { if (v) { w.name = v; save(); renderWorkout(); } } });
}
function dateSheet() {
  const w = A();
  openSheet({
    cls: 'small',
    render: () => `<div class="sheet-body pad confirm"><h2>${T('Date and time')}</h2>
      <label class="field"><span>${T('Started')}</span><input type="datetime-local" id="dtStart" value="${toLocalInput(w.start)}"></label>
      <label class="field"><span>${T('Length in minutes')}</span><input id="dtLen" inputmode="numeric" value="${Math.round(((w.end || w.start + 3600e3) - w.start) / 60000)}"></label>
      <div class="row-btns"><button class="btn" data-a="sheetClose">${T('Cancel')}</button><button class="btn primary" data-a="ok">${T('Save')}</button></div></div>`,
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
    title: T('Add exercises'),
    onPick: ids => {
      const w = A();
      const first = w.ex.length;
      for (const id of ids) {
        w.ex.push(wexFresh(id));
      }
      w.cur = first;
      save(); renderWorkout(true);
    }
  });
}
function plateSheet(kg) {
  const lb = isLb();
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
      return `${sheetHead(T('Plate calculator'))}<div class="sheet-body pad">
        <div class="two"><label class="field"><span>${T('Total weight ({unit})', { unit: U() })}</span><input id="plT" inputmode="decimal" value="${st.target}"></label>
        <label class="field"><span>${T('Bar ({unit})', { unit: U() })}</span><input id="plB" inputmode="decimal" value="${st.bar}"></label></div>
        <div class="bar-viz" aria-hidden="true"><span class="sleeve"></span>${out.length ? '<span class="collar"></span>' : ''}${out.slice().reverse().map(p => `<span class="plate p-${lb ? 'iron' : PLATE_COLORS[p]}" style="height:${30 + 70 * p / maxP}%"></span>`).join('')}<span class="shoulder"></span></div>
        <p class="per-side">${st.target < st.bar ? T('That’s less than the bar.') : out.length ? T('Each side: <b>{plates}</b> {unit}', { plates: out.map(p => trimNum(p)).join(' + '), unit: U() }) : T('Just the bar.')}</p>
        ${left > 0.01 ? `<p class="muted">${T('{w} {unit} can’t be made with standard plates.', { w: trimNum(left * 2), unit: U() })}</p>` : ''}</div>`;
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
  const ok = k.f === 'rir' ? state.settings.effort !== 'off' && hasReps(kind) : rowFields(x, kind).includes(k.f);
  return ok ? { w, x, set, k: kind } : null;
}
// a one-row left/right set has one RIR box for both sides
function kpCell() {
  const k = ui.kp;
  if (!k) return null;
  const x = k.f === 'rir' && A() && A().ex[k.e], s = x && x.sets[k.s];
  const rows = s && s.side && isCompact(x) ? setRows(x, s).map(o => x.sets.indexOf(o)) : [k.s];
  return $(rows.map(n => `#workout .cell[data-e="${k.e}"][data-s="${n}"][data-f="${k.f}"]`).join(','));
}
// the pad asks for the RIR after the reps (Settings → RIR on the number pad), on all but warm-ups
const rirStep = (x, s) => state.settings.padRir !== false && state.settings.effort !== 'off' && !!s && s.t !== 'W' && hasReps(getEx(x.exId).k);
// a one-row left/right set: its rows, first side first
const sidesInOrder = (x, s) => isCompact(x) && s.side && partnerOf(x, s) ? setRows(x, s).sort((a, b) => (b.side === firstSide(x)) - (a.side === firstSide(x))) : [s];
function canLog(w, x, s) {
  const ph = placeholder(x, x.sets.indexOf(s), exCtx(w, x)), c = { ...s };
  for (const f of ['w', 'r', 'sec', 'dist']) if (c[f] == null && ph[f] != null) c[f] = ph[f];
  return hasValue(getEx(x.exId).k, x, c);
}
// move the pad to another box; `then: 'log'` logs the set once its RIR is picked
function kpGo(s, f, then) {
  const fld = kpField();
  ui.kp.s = s; ui.kp.f = f; ui.kp.sid = fld && fld.x.sets[s] && fld.x.sets[s].id;
  ui.kp.fresh = true; ui.kp.buf = null; ui.kp.then = then || null;
  renderKeypad(); markKpCell(true);
}
function kpCurrent() {
  const fld = kpField();
  if (!fld || ui.kp.f === 'rir') return '';
  const v = fld.set[ui.kp.f], f = ui.kp.f;
  if (v == null) return '';
  return f === 'w' ? dispW(v) : f === 'sec' ? fmtClock(v) : f === 'dist' ? dispDist(v, fld.k) : String(v);
}
function kpShow(buf) { const c = ui.kp.f !== 'rir' && kpCell(); if (c) { c.innerHTML = buf ? esc(buf) : `<span class="ph">${esc(c.dataset.ph || '')}</span>`; c.classList.toggle('empty', !buf); } }
function kpSet(buf) { ui.kp.buf = buf; woSetField(ui.kp.e, ui.kp.s, ui.kp.f, buf); kpShow(buf); }
function kpClose() { ui.kp = null; renderWorkout(); }
const KP_NAMES = { w: T('Weight'), r: T('Reps'), sec: T('Time'), dist: T('Distance') };
function kpRowName(x, j) { const s = x.sets[j]; return s.side ? (s.t === 'W' ? (s.side === 'L' ? T('Left side, warm-up') : T('Right side, warm-up')) : (s.side === 'L' ? T('Left side') : T('Right side'))) : T('Set {n}', { n: setLabel(x.sets, j) }); }
function renderKeypad() {
  const el = $('#keypad');
  const fld = kpField();
  if (!fld || !kpCell()) {
    ui.kp = null;
    document.body.classList.remove('kp-open');
    slidePanel(el, false, () => { el.innerHTML = ''; });
    return;
  }
  const { x, k } = fld, f = ui.kp.f;
  const head = name => `<div class="kp-head"><div class="kp-title"><b>${esc(getEx(x.exId).name)}</b><span>${esc(kpRowName(x, ui.kp.s))} · ${name}</span></div>
    <span class="kp-rest" data-kprest hidden></span><button class="kp-hide" data-a="kpClose" aria-label="${T('Hide number pad')}">${icon('down')}</button></div>`;
  const log = `<button class="kp-k log" data-a="kpLog">${icon('check')}${T('Log')}</button>`;
  if (f === 'rir') {
    // fixed choices, one tap each: the one picked is filled, the target ringed
    const s = fld.set, rpe = state.settings.effort === 'rpe';
    el.innerHTML = `${head(effName())}<div class="kp-grid kp-eff${rpe ? ' rpe' : ''}" role="group" aria-label="${esc(effQ())}">
      <p class="kp-q">${esc(effQ())}${s.trir != null ? ` <span>${T('Target {v}', { v: esc(effDisp(s.trir)) })}</span>` : ''}</p>
      ${effVals().map(([v, l]) => `<button class="kp-k ${s.rir === v ? 'on' : s.rir == null && s.trir === v ? 'target' : ''}" data-a="kpEff" data-v="${v}" aria-pressed="${s.rir === v}">${l}</button>`).join('')}
      <button class="kp-k fn" data-a="kpEff" data-v="" ${s.rir == null ? 'disabled' : ''}>${T('Clear')}</button><button class="kp-k fn" data-a="kpNext">${T('Next')}</button>${log}</div>`;
    slidePanel(el, true);
    document.body.classList.add('kp-open');
    tickRest();
    return;
  }
  const unit = f === 'w' ? weightLabel(k) : f === 'dist' ? distUnit(k) : f === 'sec' ? T('min:sec') : '';
  const step = f === 'w' ? trimNum(state.settings.step) : f === 'sec' ? '15s' : f === 'dist' ? (k === 'wdist' ? '5' : '0.1') : '1';
  const dot = f === 'sec' ? ':' : f === 'w' || f === 'dist' ? '.' : '';
  const key = c => `<button class="kp-k" data-a="kpKey" data-k="${c}">${c}</button>`;
  el.innerHTML = `${head(`${KP_NAMES[f]}${unit ? ` (${esc(unit)})` : ''}`)}
    <div class="kp-grid">${key('1')}${key('2')}${key('3')}<button class="kp-k fn" data-a="kpBack" aria-label="${T('Delete')}">${icon('backspace')}</button>
    ${key('4')}${key('5')}${key('6')}<button class="kp-k fn" data-a="kpStep" data-d="-1">−${step}</button>
    ${key('7')}${key('8')}${key('9')}<button class="kp-k fn" data-a="kpStep" data-d="1">+${step}</button>
    ${dot ? key(dot) : '<span></span>'}${key('0')}<button class="kp-k fn" data-a="kpNext">${T('Next')}</button>${log}</div>`;
  slidePanel(el, true);
  document.body.classList.add('kp-open');
  tickRest();
}
function markKpCell(scroll) {
  for (const c of $$('#workout .cell.kp-on')) c.classList.remove('kp-on');
  const c = kpCell();
  if (!c) return;
  c.classList.add('kp-on');
  const s = c.classList.contains('sides') && A().ex[ui.kp.e].sets[ui.kp.s];
  for (const n of c.querySelectorAll(':scope > span')) n.classList.toggle('kp-side', !!s && n.classList.contains('side-' + s.side));
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
  if (!r) { document.body.classList.remove('resting'); slidePanel(el, false, () => { el.className = ''; }); const kr = $('[data-kprest]'); if (kr) kr.hidden = true; return; }
  slidePanel(el, true);
  document.body.classList.add('resting');
  el.innerHTML = `<div class="rb-track"><div class="rb-fill"></div></div>
    <div class="rb-main"><div class="rb-txt"><span class="rb-label">${T('Rest')}</span><span class="rb-time" role="timer" aria-live="off"></span>${r.next ? `<span class="rb-next">${T('Next: {name}', { name: esc(r.next) })}</span>` : ''}</div>
    <div class="rb-btns"><button data-a="restAdj" data-d="-15" aria-label="${T('15 seconds less')}">−15</button><button data-a="restAdj" data-d="15" aria-label="${T('15 seconds more')}">+15</button><button data-a="restPresets" aria-label="${T('Choose rest length')}">${icon('timer')}</button><button class="skip" data-a="restSkip">${T('Skip')}</button></div></div>`;
  tickRest();
}
const setText = (el, t) => { if (el.textContent !== t) el.textContent = t; };
function tickRest() {
  const r = state.rest;
  const kr = $('[data-kprest]');
  if (kr) {
    const l = r ? Math.ceil((r.end - Date.now()) / 1000) : 0;
    kr.hidden = !r;
    if (r) { setText(kr, l > 0 ? T('Rest {time}', { time: fmtClock(l) }) : T('Rest over')); kr.classList.toggle('over', l <= 0); }
  }
  if (!r) return;
  const el = $('#restbar');
  const left = (r.end - Date.now()) / 1000;
  const t = $('.rb-time', el), f = $('.rb-fill', el);
  if (left > 0) {
    if (t) setText(t, fmtClock(Math.ceil(left)));
    if (f) f.style.transform = `scaleX(${Math.max(0, left / r.total)})`;
    el.classList.toggle('soon', left <= 10);
  } else {
    if (!r.alerted) {
      r.alerted = true;
      el.classList.add('over');
      const lab = $('.rb-label', el);
      if (lab) lab.textContent = T('Rest over');
      beep();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      save();
    }
    if (t) t.textContent = T('Go');
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
    <label class="search">${icon('search')}<input id="${prefix}Q" data-f="${prefix}q" value="${esc(f.q)}" placeholder="${TN(LIB.length + state.custom.length, 'Search {count} exercises', 'Search {count} exercises', { count: (LIB.length + state.custom.length).toLocaleString(LOC) })}" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search" type="search"></label>
    <div class="chips" role="group" aria-label="${T('Muscle group')}"><button class="chip ${f.g === 'all' ? 'on' : ''}" data-a="${prefix}G" data-v="all">${T('All')}</button>${GROUPS.map(([id, label]) => `<button class="chip ${f.g === id ? 'on' : ''}" data-a="${prefix}G" data-v="${id}">${label}</button>`).join('')}</div>
    ${g && g[2].length > 1 ? `<div class="chips sub" role="group" aria-label="${T('Muscle')}"><button class="chip ${f.m === 'all' ? 'on' : ''}" data-a="${prefix}M" data-v="all">${T('All {group}', { group: esc(g[1].toLowerCase()) })}</button>${g[2].map(m => `<button class="chip ${f.m === m ? 'on' : ''}" data-a="${prefix}M" data-v="${m}">${esc(MUSCLES[m])}</button>`).join('')}</div>` : ''}
    <div class="filter-row"><label class="select-wrap"><span class="sr">${T('Equipment')}</span><select data-f="${prefix}eq"><option value="all">${T('Any equipment')}</option>${Object.entries(EQUIP).map(([k, v]) => `<option value="${k}" ${f.eq === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
    <div class="seg sm" role="group" aria-label="${T('Order')}"><button class="${f.sort !== 'score' ? 'on' : ''}" data-a="${prefix}S" data-v="az">${T('A–Z')}</button><button class="${f.sort === 'score' ? 'on' : ''}" data-a="${prefix}S" data-v="score">${icon('flask', 'inline')} ${T('Best for growth')}</button></div></div>
    ${f.sort === 'score' ? `<p class="sort-note">${T('Ordered by an estimate from each exercise’s mechanics, not a measured result. {dot} a dot means there are studies on that kind of exercise, in its details.', { dot: '<span class="score studied" aria-hidden="true">9</span>' })}</p>` : ''}
  </div>`;
}
function pickExercises({ title, single = false, onPick }) {
  const f = { q: '', g: 'all', m: 'all', eq: 'all' };
  const sel = [];
  let limit = PAGE;
  const listHTML = () => {
    const all = filterExercises(f), list = all.slice(0, limit);
    const recent = !f.q && f.g === 'all' && f.eq === 'all' ? recentExercises(8) : [];
    const row = e => {
      const on = sel.includes(e.id);
      return `<button class="ex-row ${on ? 'on' : ''}" data-a="tog" data-id="${e.id}" aria-pressed="${on}">${thumb(e.id, 'md')}<span class="ex-txt"><b>${esc(e.name)}</b><small>${esc(MUSCLES[e.m])} · ${esc(EQUIP[e.eq])}${e.uni ? ` · ${T('one side')}` : ''}${e.custom ? ` · ${T('yours')}` : ''}</small></span>${scorePill(e.id)}${single ? '' : `<span class="tickbox">${on ? sel.indexOf(e.id) + 1 : ''}</span>`}</button>`;
    };
    return `${recent.length ? `<p class="eyebrow list-h">${T('Recently used')}</p>${recent.map(id => row(getEx(id))).join('')}<p class="eyebrow list-h">${T('All exercises')}</p>` : ''}
      ${list.map(row).join('') || `<p class="muted pad">${T('No exercises match. Try fewer words, or create it.')}</p>`}${moreButton(list.length, all.length, 'more')}
      <button class="ex-row create" data-a="create">${icon('plus')}<span class="ex-txt"><b>${f.q ? T('Create “{name}”', { name: esc(f.q) }) : T('Create a custom exercise')}</b><small>${T('Add anything that’s missing')}</small></span></button>`;
  };
  openSheet({
    full: true,
    render: () => `${sheetHead(esc(title), single ? '' : `<button class="btn primary sm" data-a="done" ${sel.length ? '' : 'disabled'}>${sel.length ? T('Add {n}', { n: sel.length }) : T('Add')}</button>`, `<button class="btn ghost sm" data-a="sheetClose">${T('Cancel')}</button>`)}
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
        btn.disabled = !sel.length; btn.textContent = sel.length ? T('Add {n}', { n: sel.length }) : T('Add');
      },
      done: (b, def) => { closeSheet(def); onPick(sel.slice()); },
      more: (b, def) => { limit += PAGE; $('#pkList', def.el).innerHTML = listHTML(); },
      pkG: (b, def) => { f.g = b.dataset.v; f.m = 'all'; refreshSheet(def); },
      pkM: (b, def) => { f.m = b.dataset.v; refreshSheet(def); },
      pkS: (b, def) => { f.sort = b.dataset.v; limit = PAGE; refreshSheet(def); },
      create: (b, def) => customExerciseSheet(null, f.q, id => {
        if (single) { closeSheet(def); onPick([id]); } else { sel.push(id); refreshSheet(def); }
      })
    },
    onInput: (el, def) => {
      if (el.dataset.f === 'pkq') { f.q = el.value; limit = PAGE; typed(() => { const l = $('#pkList', def.el); if (l) l.innerHTML = listHTML(); }); }
      if (el.dataset.f === 'pkeq') { f.eq = el.value; limit = PAGE; $('#pkList', def.el).innerHTML = listHTML(); }
    }
  });
}
function customExerciseSheet(id, name, onSaved) {
  const ex = id ? customMap.get(id) : null;
  const d = ex ? clone(ex) : { id: 'c-' + uid(), name: name || '', m: 'chest', eq: 'barbell', k: 'wr', sec: [], uni: false, custom: true };
  openSheet({
    cls: 'small', focus: ex ? null : '#cxName',
    render: () => `${sheetHead(ex ? T('Edit exercise') : T('New exercise'), `<button class="btn primary sm" data-a="save">${T('Save')}</button>`, `<button class="btn ghost sm" data-a="sheetClose">${T('Cancel')}</button>`)}
      <div class="sheet-body pad form">
        <label class="field"><span>${T('Name')}</span><input id="cxName" data-f="name" value="${esc(d.name)}" placeholder="${T('e.g. Cable Y-Raise')}" autocomplete="off"></label>
        <label class="field"><span>${T('Main muscle')}</span><select data-f="m">${Object.entries(MUSCLES).map(([k, v]) => `<option value="${k}" ${d.m === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
        <label class="field"><span>${T('Equipment')}</span><select data-f="eq">${Object.entries(EQUIP).map(([k, v]) => `<option value="${k}" ${d.eq === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
        <label class="field"><span>${T('How you log it')}</span><select data-f="k">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}" ${d.k === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
        <div class="field"><span>${T('Other muscles worked')}</span><div class="chips wrap">${Object.entries(MUSCLES).filter(([k]) => k !== d.m).map(([k, v]) => `<button class="chip ${d.sec.includes(k) ? 'on' : ''}" data-a="sec" data-v="${k}">${esc(v)}</button>`).join('')}</div></div>
        <div class="set-item"><div><b>${T('One side at a time')}</b><p class="muted">${T('Log left and right reps separately.')}</p></div>${toggle(d.uni, 'uni')}</div>
      </div>`,
    actions: {
      sec: (b, def) => { const k = b.dataset.v; d.sec = d.sec.includes(k) ? d.sec.filter(x => x !== k) : [...d.sec, k]; refreshSheet(def); },
      uni: (b, def) => { d.uni = !d.uni; refreshSheet(def); },
      save: (b, def) => {
        d.name = d.name.trim();
        if (!d.name) { toast(T('Give the exercise a name.')); return; }
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

// in a template: is left/right on for the whole exercise, and which side comes first
const tplUni = x => hasReps(getEx(x.exId).k) && !!(x.uni ?? (state.exPrefs[x.exId] || {}).uni ?? getEx(x.exId).uni);
const tplFirst = x => (x.sets.find(o => o.side) || {}).side || 'L';
function templateEditor(tplId, opts = {}) {
  const orig = tplId ? tplById(tplId) : null;
  const d = orig ? clone(orig) : { id: uid(), name: opts.name || T('New template'), note: '', ex: [], created: Date.now() };
  const isNew = !orig;
  openSheet({
    full: true,
    render: () => (tidySupersets(d.ex), `${sheetHead(isNew ? T('New template') : T('Edit template'), `<button class="btn primary sm" data-a="save">${T('Save')}</button>`, `<button class="btn ghost sm" data-a="sheetClose">${T('Cancel')}</button>`)}
      <div class="sheet-body pad tpl-ed">
        <label class="field"><span>${T('Name')}</span><input data-f="name" value="${esc(d.name)}" autocomplete="off"></label>
        <label class="field"><span>${T('Notes')}</span><textarea data-f="note" rows="2" placeholder="${T('Focus, tempo, anything to remember')}">${esc(d.note || '')}</textarea></label>
        ${d.ex.map((x, i) => {
          const ex = getEx(x.exId);
          return `<div class="tex"><div class="tex-h"><span class="tex-n">${i + 1}</span><span class="tex-name"><b>${esc(ex.name)}</b><small>${esc(MUSCLES[ex.m])} · ${esc(scheme(x.sets))}${x.ss ? ' · ' + T('superset') : ''}</small></span><button class="icon-btn" data-a="texMenu" data-i="${i}" aria-label="${T('Options')}">${icon('dots')}</button></div>
            <div class="tset head"><span>${T('Set')}</span><span>${esc(U())}</span><span>${T('Target reps')}</span><span>${effName()}</span><span></span></div>
            ${x.sets.map((s, j) => `<div class="tset ${s.side ? (isPairTail(x.sets, j) ? 'pair-tail' : 'pair-head') : ''}">${badge(s.t, setLabel(x.sets, j), `data-a="tType" data-i="${i}" data-j="${j}"`, s.side)}
              <input class="cell" data-f="tw" data-i="${i}" data-j="${j}" inputmode="decimal" value="${s.tw != null ? dispW(s.tw) : ''}" placeholder="–" autocomplete="off" aria-label="${T('Starting weight')}">
              <input class="cell" data-f="tr" data-i="${i}" data-j="${j}" value="${esc(s.tr || '')}" placeholder="${s.t === 'W' ? T('any') : '8-12'}" autocomplete="off" aria-label="${T('Target reps')}">
              <input class="cell" data-f="trir" data-i="${i}" data-j="${j}" inputmode="decimal" value="${s.trir != null ? effDisp(s.trir) : ''}" placeholder="–" aria-label="${T('Target {eff}', { eff: effName() })}">
              <button class="icon-btn" data-a="tDel" data-i="${i}" data-j="${j}" aria-label="${T('Delete set')}">${icon('x')}</button></div>`).join('')}
            <div class="tex-f"><button class="btn sm" data-a="tAdd" data-i="${i}">${icon('plus')}${T('Set')}</button><button class="btn sm ghost" data-a="tAddW" data-i="${i}">${icon('flame')}${T('Warm-up')}</button>
              <label class="select-wrap sm"><span>${T('Rest')}</span><select data-f="rest" data-i="${i}">${REST_PRESETS.map(v => `<option value="${v}" ${v === (x.rest || state.settings.rest) ? 'selected' : ''}>${fmtRest(v)}</option>`).join('')}</select></label></div></div>`;
        }).join('')}
        <button class="btn wide" data-a="addEx">${icon('plus')}${T('Add exercises')}</button>
        ${isNew ? '' : `<button class="btn wide danger ghost" data-a="del">${icon('trash')}${T('Delete template')}</button>`}
      </div>`),
    actions: {
      save: (b, def) => {
        d.name = (d.name || '').trim() || T('Template');
        tidySupersets(d.ex);
        if (isNew) state.templates.push(d); else Object.assign(orig, d);
        if (opts.onSaved) opts.onSaved(d.id);
        save(); closeSheet(def); refreshAll();
        toast(T('Saved {name}.', { name: d.name }));
      },
      addEx: (b, def) => pickExercises({ title: T('Add to template'), onPick: ids => {
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
        const at = x.sets.indexOf(rows.length > 1 && x.sets.indexOf(rows[1]) < j ? rows[1] : s);
        menuSheet(T('Set type'), [
          ...TYPE_ORDER.map(t => [SET_TYPES[t].label, s.t === t ? 'check' : 'grip', () => { for (const o of rows) o.t = t; refreshSheet(def); }, { sub: SET_TYPES[t].desc }]),
          !hasReps(getEx(x.exId).k) ? null : rows.length > 1
            ? [T('Do both sides together'), 'side', () => { const { side, ...one } = x.sets[at]; x.uni = tplUni(x); x.sets.splice(at, 2, one); refreshSheet(def); }, { sub: T('Joins the left and right rows into one set') }]
            : [T('Do this set one side at a time'), 'side', () => { const f = tplFirst(x); x.uni = tplUni(x); x.sets.splice(at, 1, { ...s, side: f }, { ...s, side: otherSide(f) }); refreshSheet(def); }, { sub: T('Splits it into a left row and a right row') }]
        ]);
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
        const first = tplUni(x) && tplFirst(x);
        x.sets.push(...(first ? [{ ...s, side: first }, { ...s, side: otherSide(first) }] : [s]));
        refreshSheet(def);
      },
      tAddW: (b, def) => {
        const x = d.ex[+b.dataset.i], k = x.sets.filter(s => s.t === 'W').length, first = tplUni(x) && tplFirst(x);
        const s = { t: 'W', tr: '', trir: null };
        x.sets.splice(k, 0, ...(first ? [{ ...s, side: first }, { ...s, side: otherSide(first) }] : [s]));
        refreshSheet(def);
      },
      texMenu: (b, def) => {
        const i = +b.dataset.i, x = d.ex[i];
        menuSheet(getEx(x.exId).name, [
          i > 0 ? [T('Move up'), 'up', () => { d.ex.splice(i - 1, 0, d.ex.splice(i, 1)[0]); refreshSheet(def); }] : null,
          i < d.ex.length - 1 ? [T('Move down'), 'down', () => { d.ex.splice(i + 1, 0, d.ex.splice(i, 1)[0]); refreshSheet(def); }] : null,
          i < d.ex.length - 1 ? [x.ss && d.ex[i + 1].ss === x.ss ? T('Unlink from next exercise') : T('Superset with next exercise'), 'link', () => {
            if (x.ss && d.ex[i + 1].ss === x.ss) unlinkNext(d.ex, i); else linkNext(d.ex, i);
            refreshSheet(def);
          }] : null,
          hasReps(getEx(x.exId).k) ? [tplUni(x) ? T('Log both sides together') : T('Log left and right separately'), 'side', () => { x.uni = !tplUni(x); x.sets = tplSides(x.sets, x.uni); refreshSheet(def); }] : null,
          [T('Replace exercise'), 'swap', () => pickExercises({ single: true, title: T('Replace with'), onPick: ([id]) => { x.exId = id; delete x.free; refreshSheet(def); } })],
          [T('Remove from template'), 'trash', () => { d.ex.splice(i, 1); refreshSheet(def); }, { danger: true }]
        ]);
      },
      del: (b, def) => confirmSheet({
        title: T('Delete {name}?', { name: d.name }), text: T('Workouts you already did with it stay in your history.'), ok: T('Delete template'), danger: true,
        onOk: () => {
          deleteTemplate(d.id);
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
    [T('Start workout'), 'play', () => startFromTemplate(id)],
    [T('Edit template'), 'edit', () => templateEditor(id)],
    [T('Duplicate'), 'copy', () => { const c = clone(t); c.id = uid(); c.name = T('{name} (copy)', { name: t.name }); delete c.from; state.templates.push(c); save(); render(); toast(T('Made {name}.', { name: c.name })); }],
    activeSplit() && !activeSplit().days.includes(id) ? [T('Add to {name}', { name: activeSplit().name }), 'plus', () => { activeSplit().days.push(id); save(); render(); toast(T('{name} is now a day in {split}.', { name: t.name, split: activeSplit().name })); }] : null,
    [T('Delete template'), 'trash', () => confirmSheet({ title: T('Delete {name}?', { name: t.name }), text: T('Workouts you already did with it stay in your history.'), ok: T('Delete'), danger: true,
      onOk: () => { deleteTemplate(id); save(); refreshAll(); } }), { danger: true }]
  ]);
}

/* ============================== Split editor ============================== */

function splitEditor(splitId) {
  const orig = splitId ? splitById(splitId) : null;
  const d = orig ? clone(orig) : { id: uid(), name: T('My split'), days: [], pos: 0 };
  const keep = () => { d.name = d.name.trim() || T('My split'); pruneDays(d); d.pos = Math.min(d.pos || 0, Math.max(0, d.days.length - 1)); };
  openSheet({
    cls: 'wide', live: true, split: d,
    render: () => `${sheetHead(orig ? T('Edit split') : T('New split'), `<button class="btn primary sm" data-a="save">${T('Save')}</button>`, `<button class="btn ghost sm" data-a="sheetClose">${T('Cancel')}</button>`)}
      <div class="sheet-body pad">
        <label class="field"><span>${T('Name')}</span><input data-f="name" value="${esc(d.name)}" autocomplete="off"></label>
        <p class="eyebrow list-h">${T('Days, in order')}</p>
        <div class="split-days">${d.days.map((tid, i) => {
          const t = isRest(tid) ? null : tplById(tid);
          if (!t && !isRest(tid)) return '';
          const name = t ? t.name : T('Rest day');
          const moves = `<button class="icon-btn" data-a="up" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="${T('Move {name} up', { name: esc(name) })}">${icon('up')}</button>
            <button class="icon-btn" data-a="down" data-i="${i}" ${i === d.days.length - 1 ? 'disabled' : ''} aria-label="${T('Move {name} down', { name: esc(name) })}">${icon('down')}</button>`;
          return t ? `<div class="split-day"><span class="tex-n">${i + 1}</span><span class="tex-name"><b>${esc(t.name)}</b><small>${TN(t.ex.length, '{n} exercises', '{n} exercises')}${i === d.pos ? ' · ' + T('up next') : ''}</small></span>
            ${moves}<button class="icon-btn" data-a="editDay" data-i="${i}" aria-label="${T('Edit {name}', { name: esc(t.name) })}">${icon('edit')}</button>
            <button class="icon-btn" data-a="rm" data-i="${i}" aria-label="${T('Remove {name} from split', { name: esc(t.name) })}">${icon('x')}</button></div>`
            : `<div class="split-day rest"><span class="tex-n">${icon('moon')}</span><span class="tex-name"><b>${T('Rest day')}</b><small>${T('Passes by itself with the calendar')}</small></span>
            ${moves}<button class="icon-btn" data-a="rm" data-i="${i}" aria-label="${T('Remove rest day')}">${icon('x')}</button></div>`;
        }).join('') || `<p class="muted">${T('No days yet.')}</p>`}</div>
        <div class="row-btns left"><button class="btn" data-a="addNew">${icon('plus')}${T('New day')}</button><button class="btn" data-a="addExisting">${icon('copy')}${T('Add a template')}</button><button class="btn" data-a="addRest">${icon('moon')}${T('Rest day')}</button></div>
        ${orig ? `<div class="row-btns left">${state.activeSplit !== d.id ? `<button class="btn" data-a="activate">${T('Make this my split')}</button>` : ''}<button class="btn danger ghost" data-a="del">${icon('trash')}${T('Delete split')}</button></div>` : ''}
      </div>`,
    actions: {
      save: (b, def) => {
        keep();
        if (orig) Object.assign(orig, d); else { state.splits.push(d); state.activeSplit = d.id; }
        save(); closeSheet(def); render();
      },
      up: (b, def) => { const i = +b.dataset.i; moveDay(d, i, i - 1); refreshSheet(def); },
      down: (b, def) => { const i = +b.dataset.i; moveDay(d, i, i + 1); refreshSheet(def); },
      rm: (b, def) => { dropDay(d, +b.dataset.i); refreshSheet(def); },
      editDay: (b) => templateEditor(d.days[+b.dataset.i]),
      addRest: (b, def) => { d.days.push('rest'); refreshSheet(def); },
      addNew: (b, def) => templateEditor(null, { name: T('Day {n}', { n: d.days.length + 1 }), onSaved: id => { d.days.push(id); refreshSheet(def); } }),
      addExisting: (b, def) => {
        const list = state.templates.filter(t => !d.days.includes(t.id));
        if (!list.length) { toast(T('Every template is already in this split.')); return; }
        menuSheet(T('Add a template'), list.map(t => [t.name, 'copy', () => { d.days.push(t.id); refreshSheet(def); }, { sub: TN(t.ex.length, '{n} exercises', '{n} exercises') }]));
      },
      activate: (b, def) => { keep(); Object.assign(orig, d); state.activeSplit = d.id; save(); closeSheet(def); render(); toast(T('{name} is now your split.', { name: d.name })); },
      del: (b, def) => confirmSheet({ title: T('Delete {name}?', { name: d.name }), text: T('Its templates and your history are kept. Only the split itself is removed.'), ok: T('Delete split'), danger: true,
        onOk: () => { state.splits = state.splits.filter(s => s.id !== d.id); if (state.activeSplit === d.id) state.activeSplit = state.splits[0] ? state.splits[0].id : null; save(); closeSheet(def); render(); } })
    },
    onInput: (el) => { if (el.dataset.f === 'name') d.name = el.value; }
  });
}
function splitSwitcher() {
  openSheet({
    cls: 'small',
    render: () => `${sheetHead(T('Change split'))}<div class="sheet-body menu">
      ${state.splits.map(s => `<button class="menu-item ${s.id === state.activeSplit ? 'on' : ''}" data-a="pick" data-id="${s.id}">${icon(s.id === state.activeSplit ? 'check' : 'calendar')}<span><b>${esc(s.name)}</b><small>${esc(splitNames(s).join(' · ')) || T('No days yet')}</small></span></button>`).join('')}
      <div class="menu-sep"></div>
      <button class="menu-item" data-a="new">${icon('plus')}<span><b>${T('Build a new split')}</b><small>${T('Pick the days and their order')}</small></span></button>
      <button class="menu-item" data-a="lib">${icon('list')}<span><b>${T('Browse ready-made splits')}</b></span></button></div>`,
    actions: {
      pick: (b, def) => { state.activeSplit = b.dataset.id; save(); closeSheet(def); render(); },
      new: (b, def) => { closeSheet(def); splitEditor(null); },
      lib: (b, def) => { closeSheet(def); const el = $$('.section-h').find(h => h.textContent.includes(T('Ready-made splits'))); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
    }
  });
}

/* ============================== History tab ============================== */

VIEWS.history = function () {
  const ws = state.workouts;
  const mStart = ui.hist.month || (() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  ui.hist.month = mStart;
  let h = `<header class="page-h"><div><p class="eyebrow">${TN(ws.length, '{n} session logged', '{n} sessions logged')}</p><h1>${T('History')}</h1></div><button class="btn sm" data-a="logPast">${icon('plus')}${T('Log a past workout')}</button></header>`;
  h += calendarHTML(mStart);
  if (!ws.length) return h + `<section class="card pad empty"><h2>${T('No workouts yet')}</h2><p class="muted">${T('Finish a workout and it shows up here, with every set you did.')}</p></section>`;
  let list = ws.slice().reverse();
  if (ui.hist.day) list = list.filter(w => dayStart(w.start) === ui.hist.day);
  const all = list.length;
  list = list.slice(0, ui.histLimit || HIST_PAGE);
  sessionNums = new Map(ws.map((w, n) => [w, n + 1]));
  if (ui.hist.day) h += `<div class="filter-note"><span>${T('Showing {date}', { date: esc(fmtDateY(ui.hist.day)) })}</span><button class="btn sm ghost" data-a="histDay" data-v="">${T('Show all')}</button></div>`;
  let lastBlock = null;
  h += `<div class="hist-list">`;
  for (const w of list) {
    const b = blockAt(w.start);
    if (b !== lastBlock && state.blocks.length > 1) {
      h += `<p class="block-div">${icon(b === curBlock() ? 'chart' : 'archive')}<span>${esc(blkName(b))}</span><small>${b === curBlock() ? T('current block') : T('earlier block')}${b.start ? ' · ' + T('from {date}', { date: esc(fmtDateY(b.start)) }) : ''}</small></p>`;
      lastBlock = b;
    }
    h += histCard(w);
  }
  sessionNums = null;
  return h + `</div>` + (all > list.length ? `<button class="btn wide more" data-a="histMore" data-auto>${T('Show {n} more · {left} left', { n: Math.min(HIST_PAGE, all - list.length), left: all - list.length })}</button>` : '');
};
const HIST_PAGE = 25;
let sessionNums = null;
function histCard(w) {
  const n = sessionNumber(w);
  const prs = (w.prs || []).length;
  return `<button class="hist-card" data-a="openWorkout" data-id="${w.id}">
    <div class="hist-top"><span class="stack" aria-hidden="true">${w.ex.slice(0, 4).map(x => thumb(x.exId, 'sm')).join('')}</span><span class="hist-n">#${n}</span><b>${esc(w.name)}</b>${w.demo ? `<span class="pill">${T('sample')}</span>` : ''}${prs ? `<span class="pill good">${icon('trophy')}${prs}</span>` : ''}<span class="muted hist-date">${esc(fmtDate(w.start))}</span></div>
    <div class="hist-stats"><span>${fmtDuration(w.end - w.start)}</span><span>${TN(workingSets(w), '{n} sets', '{n} sets')}</span><span>${fmtVol(workoutVolume(w))}</span></div>
    <div class="hist-ex">${w.ex.slice(0, 5).map(x => `<span>${trimNum(sum(x.sets, s => s.t !== 'W' ? setWeight(s) : 0), 1)} × ${esc(getEx(x.exId).name)}</span>`).join('')}${w.ex.length > 5 ? `<span class="muted">${T('+{n} more', { n: w.ex.length - 5 })}</span>` : ''}</div></button>`;
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
    cells += `<button class="cal-d ${c ? 'has' : ''} ${ts === today ? 'today' : ''} ${ui.hist.day === ts ? 'on' : ''}" data-a="histDay" data-v="${c ? ts : ''}" ${c ? '' : 'tabindex="-1"'} aria-label="${c ? TN(c, '{date}, {n} workout', '{date}, {n} workouts', { date: esc(fmtDateY(ts)) }) : esc(fmtDateY(ts))}">${i}</button>`;
  }
  const monthCount = state.workouts.filter(w => { const x = new Date(w.start); return x.getFullYear() === y && x.getMonth() === m; }).length;
  return `<section class="card cal"><div class="cal-h"><button class="icon-btn" data-a="histMonth" data-d="-1" aria-label="${T('Previous month')}">${icon('left')}</button><div><b>${esc(d.toLocaleDateString(LOC, { month: 'long', year: 'numeric' }))}</b><small class="muted">${TN(monthCount, '{n} workout', '{n} workouts')}</small></div><button class="icon-btn" data-a="histMonth" data-d="1" aria-label="${T('Next month')}">${icon('right')}</button></div>
    <div class="cal-grid">${T('M T W T F S S').split(' ').map(x => `<span class="cal-w">${x}</span>`).join('')}${cells}</div></section>`;
}
function workoutSheet(id) {
  openSheet({
    cls: 'wide', live: true,
    render: () => {
      const w = state.workouts.find(o => o.id === id);
      if (!w) return `${sheetHead(T('Workout'))}<div class="sheet-body pad"><p>${T('This workout was deleted.')}</p></div>`;
      const b = blockAt(w.start);
      return `${sheetHead(esc(w.name), `<button class="btn sm" data-a="edit">${icon('edit')}${T('Edit')}</button>`)}
      <div class="sheet-body pad">
        <p class="eyebrow">${T('Session #{n} · {date}, {time}', { n: sessionNumber(w), date: esc(fmtDate(w.start)), time: esc(fmtTime(w.start)) })}${state.blocks.length > 1 ? ' · ' + esc(blkName(b)) : ''}</p>
        <div class="tiles"><div class="tile"><span>${T('Time')}</span><b>${fmtDuration(w.end - w.start)}</b></div><div class="tile"><span>${T('Working sets')}</span><b>${workingSets(w)}</b></div><div class="tile"><span>${T('Volume')}</span><b>${fmtVol(workoutVolume(w))}</b></div><div class="tile"><span>${T('Records')}</span><b>${(w.prs || []).length}</b></div></div>
        ${w.note ? `<p class="note-text">${esc(w.note)}</p>` : ''}
        ${w.ex.map(x => {
          const ex = getEx(x.exId), k = ex.k;
          const prSets = new Set((w.prs || []).filter(p => p.exId === x.exId).map(p => p.set.id));
          return `<div class="wd-ex"><button class="wd-pic" data-a="openEx" data-id="${x.exId}" aria-label="${T('About {name}', { name: esc(ex.name) })}">${thumb(x.exId, 'lg')}</button><div class="wd-body">
            <button class="wd-name" data-a="openEx" data-id="${x.exId}"><b>${esc(ex.name)}</b></button>${x.note ? `<p class="muted small">${esc(x.note)}</p>` : ''}
            <ol class="lines">${x.sets.map((s, j) => `<li>${lineTag(x.sets, j)}<span class="num">${esc(fmtLine(x, s, k))}</span>${prSets.has(s.id) ? `<span class="pill good">${icon('trophy')}${T('Record')}</span>` : ''}</li>`).join('')}</ol></div></div>`;
        }).join('')}
        <div class="row-btns left"><button class="btn" data-a="repeat">${icon('play')}${T('Do it again')}</button><button class="btn" data-a="saveTpl">${icon('copy')}${T('Save as template')}</button><button class="btn danger ghost" data-a="del">${icon('trash')}${T('Delete')}</button></div>
      </div>`;
    },
    actions: {
      edit: () => editWorkout(id),
      repeat: () => repeatWorkout(state.workouts.find(o => o.id === id)),
      saveTpl: () => templateFromWorkout(state.workouts.find(o => o.id === id)),
      del: (b, def) => confirmSheet({ title: T('Delete this workout?'), text: T('It’s removed from your history, charts and records.'), ok: T('Delete workout'), danger: true,
        onOk: () => {
          const w = state.workouts.find(o => o.id === id);
          state.workouts = state.workouts.filter(o => o.id !== id);
          recalcPRs();
          save(); closeSheet(def); render();
          toast(T('Workout deleted.'), { label: T('Undo'), fn: () => { state.workouts.push(w); state.workouts.sort((a, b2) => a.start - b2.start); recalcPRs(); save(); render(); } });
        } })
    }
  });
}

/* ============================== Exercises tab ============================== */

VIEWS.library = function () {
  return `<header class="page-h"><div><p class="eyebrow">${T('{n} built in · {mine} of yours', { n: LIB.length, mine: state.custom.filter(c => !c.hidden).length })}</p><h1>${T('Exercises')}</h1></div><button class="btn sm" data-a="libNew">${icon('plus')}${T('New exercise')}</button></header>
    ${filterBar(ui.lib, 'lib')}<div class="ex-list card" id="libList">${libListHTML()}</div>`;
};
const PAGE = 40;
// typing in a search box: wait until there's a short pause before redrawing the list
let typeT = null;
const typed = fn => { clearTimeout(typeT); typeT = setTimeout(fn, 140); };
function moreButton(shown, total, action) {
  return total > shown ? `<button class="btn wide more" data-a="${action}" data-auto>${T('Show {n} more · {left} left', { n: Math.min(PAGE, total - shown), left: total - shown })}</button>` : '';
}
function libRows(list) {
  const used = {};
  for (const w of state.workouts) for (const x of w.ex) used[x.exId] = w.start;
  return list.map(e => `<button class="ex-row" data-a="openEx" data-id="${e.id}">${thumb(e.id, 'md')}<span class="ex-txt"><b>${esc(e.name)}</b><small>${esc(MUSCLES[e.m])} · ${esc(EQUIP[e.eq])}${e.uni ? ' · ' + T('one side') : ''}${e.custom ? ' · ' + T('yours') : ''}${used[e.id] ? ` · ${esc(relDay(used[e.id]))}` : ''}</small></span>${scorePill(e.id)}${icon('right', 'chev')}</button>`).join('');
}
function libListHTML() {
  const all = filterExercises(ui.lib), list = all.slice(0, ui.libLimit || PAGE);
  return `<p class="eyebrow list-h">${TN(all.length, '{n} exercise', '{n} exercises')}</p>` + libRows(list)
    + moreButton(list.length, all.length, 'libMore')
    + (list.length ? '' : `<p class="muted pad">${T('Nothing matches.')} <button class="link" data-a="libNew">${T('Create “{q}”', { q: esc(ui.lib.q) })}</button></p>`);
}
function exerciseSheet(exId) {
  const st = { range: 'block', metric: null };
  openSheet({
    full: true, live: true,
    render: self => {
      const ex = getEx(exId), k = ex.k;
      if (!STEPS) loadSteps().then(d => { if (d && d[exId] && sheets.includes(self)) refreshSheet(self); });
      const steps = STEPS && STEPS[exId];
      const metrics = metricsFor(k);
      // changing how a custom exercise is logged can leave the chosen chart behind
      if (!metrics.some(m => m[0] === st.metric)) st.metric = metrics[0][0];
      const base = baseline(exId);
      const resets = (state.exResets[exId] || []).slice().sort((a, b) => a - b);
      const allPts = exSeries(exId, st.metric);
      const hasArchived = allPts.some(p => p.x < base);
      const pts = (st.range === 'all' ? allPts : allPts.filter(p => p.x >= base)).map(p => ({ ...p, dim: p.x < base }));
      const marks = st.range === 'all' ? [...state.blocks.slice(1).map(b => ({ x: b.start, label: blkName(b) })), ...resets.map(r => ({ x: r, label: T('Reset') }))] : [];
      const rec = records(exId, st.range === 'all' ? 0 : base);
      const prefs = state.exPrefs[exId] || {};
      const sessions = [];
      for (let i = state.workouts.length - 1; i >= 0; i--) {
        const w = state.workouts[i], xs = w.ex.filter(x => x.exId === exId && x.sets.some(s => s.done));
        if (xs.length) sessions.push({ w, xs });
      }
      const tiles = k === 'wr'
        ? [[T('Est. 1RM'), rec.e1rm ? fmtW(rec.e1rm, 1) : '—'], [T('Heaviest'), rec.w ? fmtW(rec.w) : '—'], [T('Best set'), rec.vol ? fmtVol(rec.vol) : '—'], [T('Sessions'), rec.sessions]]
        : k === 'bw' || k === 'aw' ? [[T('Most reps'), rec.reps || '—'], [T('Most added'), rec.w ? fmtW(rec.w) : '—'], [T('Sessions'), rec.sessions]]
        : k === 'dur' || k === 'wdur' ? [[T('Longest'), rec.sec ? fmtClock(rec.sec) : '—'], [T('Sessions'), rec.sessions]]
        : [[T('Farthest'), rec.dist ? dispDist(rec.dist, k) + ' ' + distUnit(k) : '—'], [T('Sessions'), rec.sessions]];
      const yt = 'https://www.youtube.com/results?search_query=' + encodeURIComponent((ex.en || ex.name) + ' exercise form');
      const photo = photos.get(exId), art = artOf(exId);
      return `${sheetHead(esc(ex.name), ex.custom ? `<button class="btn sm" data-a="editCustom">${icon('edit')}${T('Edit')}</button>` : '')}
      <div class="sheet-body pad exd">${ex.en ? `<p class="exd-en" lang="en" dir="ltr">${esc(ex.en)}</p>` : ''}
        <div class="exd-hero">${photo ? `<img class="exd-photo" src="${photo}" alt="${T('Your photo of {name}', { name: esc(ex.name) })}">` : ''}
          ${art ? `<figure class="exd-art ${art.length > 1 ? motionOn() ? 'moving' : 'still' : ''}${artKind(exId)}"${art.length > 1 && motionOn() ? ' data-mv="pic"' : ''}>${artFrames(exId, art, ex.name)}${art.length > 1 && motionOn() ? '<span class="exd-step"><i></i><i></i></span>' : ''}<figcaption>${artNote(exId) ? `<b class="similar">${icon('info', 'inline')} ${T('Similar picture. {note}.', { note: esc(artNote(exId)) })}</b>` : ''}<span>${T('Illustration: {credit}', { credit: artCredit(exId) })}</span></figcaption></figure>` : ''}
          <div class="exd-map"><figure>${figure('front', ex, 'full')}<figcaption>${T('Front')}</figcaption></figure><figure>${figure('back', ex, 'full')}<figcaption>${T('Back')}</figcaption></figure></div></div>
        <div class="exd-legend"><span><i class="dot hit"></i>${T('Main: {muscle}', { muscle: esc(MUSCLES[ex.m]) })}</span>${ex.sec.length ? `<span><i class="dot hit-2"></i>${T('Also: {muscles}', { muscles: esc(ex.sec.map(m => MUSCLES[m]).join(T(', '))) })}</span>` : ''}
          <button class="btn sm" data-a="photo">${icon('camera')}${photo ? T('Change photo') : T('Add your own photo')}</button>${photo ? `<button class="btn sm ghost" data-a="photoDel">${T('Remove photo')}</button>` : ''}</div>
        ${steps ? `<details class="howto" ${st.howto ? 'open' : ''}><summary data-a="howto">${icon('info')}${T('How to do it')}<span class="muted">${TN(steps.length, '{n} steps', '{n} steps')}</span>${icon('down', 'chev')}</summary>
          <ol class="steps">${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><p class="muted small">${T('Instructions from the open {link} (MIT).', { link: '<a href="https://github.com/hasaneyldrm/exercises-dataset" target="_blank" rel="noopener">exercises-dataset</a>' })}</p></details>` : ''}
        ${scienceHTML(exId)}
        <div class="exd-tags"><span class="pill">${esc(MUSCLES[ex.m])}</span>${ex.sec.map(m => `<span class="pill quiet">${esc(MUSCLES[m])}</span>`).join('')}<span class="pill quiet">${esc(EQUIP[ex.eq])}</span><span class="pill quiet">${esc(KINDS[k])}</span>
          <a class="btn sm ghost" href="${yt}" target="_blank" rel="noopener">${icon('external')}${T('Watch how it’s done')}</a></div>
        ${hasArchived || resets.length || state.blocks.length > 1 ? `<div class="seg" role="group" aria-label="${T('Time range')}"><button class="${st.range === 'block' ? 'on' : ''}" data-a="range" data-v="block">${T('Since last reset')}</button><button class="${st.range === 'all' ? 'on' : ''}" data-a="range" data-v="all">${T('All time')}</button></div>` : ''}
        <div class="tiles">${tiles.map(([l, v]) => `<div class="tile"><span>${l}</span><b>${esc(String(v))}</b></div>`).join('')}</div>
        ${k === 'wr' && !rec.e1rm && rec.reps > E1RM_MAX_REPS ? `<p class="muted small">${T('Est. 1RM is worked out from sets of {n} reps or fewer; higher-rep sets still count for everything else.', { n: E1RM_MAX_REPS })}</p>` : ''}
        <div class="card chart-card"><div class="chart-top"><h3>${esc(metrics.find(m => m[0] === st.metric)[1])}</h3>${metrics.length > 1 ? `<div class="seg sm">${metrics.map(([id, l]) => `<button class="${st.metric === id ? 'on' : ''}" data-a="metric" data-v="${id}">${esc(l)}</button>`).join('')}</div>` : ''}</div>
          ${chartSlot({ type: 'line', points: pts, marks, h: 220, whole: st.metric === 'reps' || st.metric === 'sec', fmt: v => fmtMetric(st.metric, v, k), tick: v => st.metric === 'sec' ? fmtClock(v) : st.metric === 'dist' ? dispDist(v, k) : compact(isLb() && st.metric !== 'reps' ? v * KG_LB : v), aria: T('{name} progress', { name: ex.name }), empty: st.range === 'block' && hasArchived ? T('Nothing since your last reset yet. Switch to All time to see earlier sessions.') : T('Log this exercise to see your progress here.') })}
          ${st.range === 'all' && hasArchived ? `<p class="muted small">${T('Faded points are from before a reset.')}</p>` : ''}</div>
        ${k === 'wr' && Object.keys(rec.repMax).length ? `<h3 class="sub-h">${T('Best weight for each rep count')}</h3><div class="repmax">${Array.from({ length: 12 }, (_, i) => i + 1).filter(r => rec.repMax[r]).map(r => `<div><span>${TN(r, '{n} rep', '{n} reps')}</span><b>${esc(fmtW(rec.repMax[r]))}</b></div>`).join('')}</div>` : ''}
        <h3 class="sub-h">${T('Settings for this exercise')}</h3>
        <div class="card list-card">
          <div class="set-item"><div><b>${T('Rest timer')}</b><p class="muted">${T('Used when you add it to a workout.')}</p></div><button class="btn sm" data-a="rest">${fmtRest(prefs.rest || state.settings.rest)}</button></div>
          ${hasReps(k) ? `<div class="set-item"><div><b>${T('One side at a time')}</b><p class="muted">${T('Log left and right reps separately.')}</p></div>${toggle(prefs.uni ?? ex.uni, 'uni')}</div>` : ''}
          <div class="set-item"><div><b>${T('Machine setup')}</b><p class="muted">${esc(prefs.note || T('Seat, pads, handles, grip. Shown every time you do this exercise.'))}</p></div><button class="btn sm" data-a="note">${prefs.note ? T('Edit') : T('Add')}</button></div>
        </div>
        <h3 class="sub-h">${icon('reset')}${T('Progression')}</h3>
        <div class="card pad reset-card">
          <p>${base > 0 ? T('Records and charts count from <b>{date}</b>.', { date: esc(fmtDateY(base)) }) : T('Records and charts count from your first session.')} ${T('Resetting starts them fresh from today. Every set you’ve logged stays in History and under All time.')}</p>
          <div class="row-btns left"><button class="btn" data-a="reset">${icon('reset')}${T('Reset this exercise')}</button>${resets.length ? `<button class="btn ghost" data-a="undoReset">${icon('undo')}${T('Undo last reset')}</button>` : ''}</div>
          ${resets.length ? `<p class="muted small">${T('Earlier resets: {dates}', { dates: resets.map(r => esc(fmtDateY(r))).join(T(', ')) })}</p>` : ''}
        </div>
        <h3 class="sub-h">${T('History')}</h3>
        ${sessions.length ? `<div class="exd-hist">${sessions.slice(0, 40).map(({ w, xs }) => `<button class="exd-sess ${w.start < base ? 'archived' : ''}" data-a="openWorkout" data-id="${w.id}"><span class="exd-date"><b>${esc(fmtShort(w.start))}</b><small>${esc(w.name)}</small>${xs.filter(x => x.note).map(x => `<small class="exd-note">${icon('note')}${esc(x.note)}</small>`).join('')}</span><span class="exd-sets">${xs.map(x => x.sets.filter(s => s.done).map(s => `<span class="${s.t === 'W' ? 'warm' : ''}">${s.side || s.t !== 'N' ? `<i class="${s.t === 'N' ? 'side-' + s.side : 't-' + s.t}">${s.t === 'N' ? '' : esc(SET_TYPES[s.t].short)}${s.side ? `<b class="side-${s.side}">${s.side}</b>` : ''}</i>` : ''}${esc(fmtSet(x, s, k))}</span>`).join('')).join('')}</span></button>`).join('')}</div>` : `<p class="muted">${T('You haven’t logged this one yet.')}</p>`}
        ${ex.custom ? `<button class="btn wide danger ghost" data-a="delCustom">${icon('trash')}${T('Delete exercise')}</button>` : ''}
      </div>`;
    },
    actions: {
      range: (b, def) => { st.range = b.dataset.v; refreshSheet(def); },
      howto: (b, def, ev) => { ev.preventDefault(); st.howto = !st.howto; b.parentElement.open = st.howto; },
      photo: () => pickPhoto(exId),
      photoDel: (b, def) => { storePhoto(exId, null); refreshAll(); toast(T('Photo removed.')); },
      metric: (b, def) => { st.metric = b.dataset.v; refreshSheet(def); },
      rest: (b, def) => restChooser({ title: T('Rest timer'), current: (state.exPrefs[exId] || {}).rest || state.settings.rest, onPick: v => { (state.exPrefs[exId] = state.exPrefs[exId] || {}).rest = v; save(); refreshSheet(def); } }),
      uni: (b, def) => { const p = state.exPrefs[exId] = state.exPrefs[exId] || {}; p.uni = !(p.uni ?? getEx(exId).uni); save(); refreshSheet(def); },
      note: (b, def) => inputSheet({ title: T('Setup note'), label: getEx(exId).name, value: (state.exPrefs[exId] || {}).note || '', multiline: true, onOk: v => { (state.exPrefs[exId] = state.exPrefs[exId] || {}).note = v; save(); refreshSheet(def); } }),
      reset: (b, def) => resetExercise(exId, () => refreshSheet(def)),
      undoReset: (b, def) => { undoExReset(exId); refreshSheet(def); toast(T('Last reset undone.')); },
      editCustom: (b, def) => customExerciseSheet(exId, null, () => refreshSheet(def)),
      delCustom: (b, def) => {
        // the open workout counts too: an exercise you're doing right now is only hidden
        const n = state.workouts.filter(w => w.ex.some(x => x.exId === exId)).length + state.templates.filter(t => t.ex.some(x => x.exId === exId)).length + (state.active && state.active.ex.some(x => x.exId === exId) ? 1 : 0);
        confirmSheet({ title: T('Delete {name}?', { name: getEx(exId).name }), text: n ? T('It’s used in your history, templates or this workout, so it’s hidden from the list but kept there.') : T('This can’t be undone.'), ok: T('Delete'), danger: true,
          onOk: () => { const c = customMap.get(exId); if (n) c.hidden = true; else state.custom = state.custom.filter(x => x.id !== exId); rebuildCustom(); save(); closeSheet(def); refreshAll(); } });
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
  // weeks counted on the calendar, so a week with a clock change (167 or 169 hours) is neither skipped nor cut short
  const weekFrom = (ts, n) => { const d = new Date(ts); d.setDate(d.getDate() + 7 * n); return d.getTime(); };
  const weeks = Array.from({ length: 12 }, (_, i) => weekFrom(wk, i - 11));
  const vol = weeks.map(s => ({ s, ws: workoutsIn(s, weekFrom(s, 1)) }));
  const archived = state.blocks.slice(0, -1).reverse();
  let h = `<header class="page-h"><div><p class="eyebrow">${TN(state.workouts.length, '{n} sessions all time', '{n} sessions all time')}</p><h1>${T('Progress')}</h1></div></header>`;
  h += weekCard();
  h += `<section class="card block-card"><div class="block-top"><div><p class="eyebrow accent">${T('Current block')}</p><h2><button class="link-h" data-a="blockRename">${esc(blkName(b))}${icon('edit')}</button></h2>
      <p class="muted">${b.start ? `${T('Since {date}', { date: esc(fmtDateY(b.start)) })} · ` : ''}${TN(inBlock.length, '{n} session', '{n} sessions')} · ${T('{vol} lifted', { vol: fmtVol(sum(inBlock, workoutVolume)) })}</p></div>
      <div class="block-btns"><button class="btn" data-a="blockReset">${icon('reset')}${T('Reset progression')}</button>${archived.length ? `<button class="btn ghost" data-a="blockUndo">${icon('undo')}${T('Undo reset')}</button>` : ''}</div></div>
    <p class="small muted">${T('Starting a new block gives you fresh records and charts for everything, for a new program, after a break or after an injury. To start just one exercise fresh, tap {icon} next to it under Your lifts, or use its ⋯ menu in a workout. Everything stays saved below and in History.', { icon: icon('reset', 'inline') })}</p></section>`;
  h += `<div class="tiles four">
    <div class="tile"><span>${T('This week')}</span><b>${thisWeek.length}</b><small>${TN(thisWeek.length, 'session', 'sessions')}</small></div>
    <div class="tile"><span>${T('Week streak')}</span><b>${streakWeeks()}</b><small>${T('weeks in a row')}</small></div>
    <div class="tile"><span>${T('Sets this week')}</span><b>${trimNum(sum(thisWeek, workingSets), 1)}</b><small>${T('working sets')}</small></div>
    <div class="tile"><span>${T('Block volume')}</span><b>${esc(fmtVol(sum(inBlock, workoutVolume)).replace(' ' + U(), ''))}</b><small>${T('{unit} lifted', { unit: U() })}</small></div></div>`;
  h += `<section class="card chart-card"><div class="chart-top"><h3>${T('Weekly volume')}</h3><span class="muted small">${T('last 12 weeks, {unit}', { unit: U() })}</span></div>
    ${chartSlot({ type: 'bars', h: 200, bars: vol.map(v => ({ v: (isLb() ? KG_LB : 1) * sum(v.ws, workoutVolume), label: fmtShort(v.s), tip: `${T('Week of {date}', { date: fmtShort(v.s) })} · ${TN(v.ws.length, '{n} session', '{n} sessions')}` })), fmt: v => compact(v) + ' ' + U(), aria: T('Weekly volume, last 12 weeks'), empty: T('Finish a workout to start this chart.') })}</section>`;
  const ms = muscleSets(workoutsIn(Date.now() - 7 * DAY, Infinity));
  const maxM = Math.max(22, ...ms.map(m => m[1]));
  h += `<section class="card chart-card"><div class="chart-top"><h3>${T('Sets per muscle')}</h3><span class="muted small">${T('last 7 days')}</span></div>
    ${ms.length ? `<div class="mbars">${ms.map(([m, c]) => `<div class="mbar"><span class="mbar-l">${esc(MUSCLES[m])}</span><span class="mbar-t"><span class="band" style="left:${10 / maxM * 100}%;width:${10 / maxM * 100}%"></span><span class="fill" style="width:${c / maxM * 100}%"></span></span><span class="mbar-v">${trimNum(c, 1)}</span></div>`).join('')}</div>
    <p class="muted small">${T('Shaded band: 10 to 20 sets a week, a common range for growth. Sets for helper muscles count as half.')}</p>` : `<p class="chart-empty">${T('No sets in the last 7 days.')}</p>`}</section>`;
  h += liftsSection(from, Infinity, T('Your lifts this block'));
  const prs = [], kindName = { 'Est. 1RM': T('Est. 1RM'), Heaviest: T('Heaviest'), 'Most reps': T('Most reps'), Longest: T('Longest'), Farthest: T('Farthest') };
  for (const w of inBlock.slice().reverse()) for (const p of w.prs || []) if (prs.length < 12) prs.push({ w, p });
  if (prs.length) h += `<section class="section"><h2 class="section-h">${T('Recent records')}</h2><div class="card list-card">${prs.map(({ w, p }) => `<button class="pr-item" data-a="openEx" data-id="${p.exId}">${icon('trophy')}<span><b>${esc(getEx(p.exId).name)}</b><small>${esc(kindName[p.kind] || p.kind)} · ${esc(fmtShort(w.start))}</small></span><span class="num">${esc(fmtSet({ uni: p.uni, exId: p.exId }, p.set))}</span></button>`).join('')}</div></section>`;
  if (archived.length) h += `<section class="section"><h2 class="section-h">${T('Earlier blocks')}</h2><p class="muted section-sub">${T('Saved progress from before each reset.')}</p><div class="tpl-grid">${archived.map(bk => {
    const [f, t] = blockRange(bk), ws = workoutsIn(f, t);
    return `<button class="tpl-card block-old" data-a="openBlock" data-id="${bk.id}"><span class="tpl-main"><b>${esc(blkName(bk))}</b><span class="muted">${bk.start ? `${esc(fmtShort(bk.start))} – ${esc(fmtShort(t))}` : T('Start – {to}', { to: esc(fmtShort(t)) })}</span><span class="tpl-ex">${TN(ws.length, '{n} sessions', '{n} sessions')} · ${esc(fmtVol(sum(ws, workoutVolume)))}</span></span>${icon('right', 'chev')}</button>`;
  }).join('')}</div></section>`;
  return h;
};
function weekLines() {
  const ws = workoutsIn(weekStart(Date.now()), Infinity);
  const vol = sum(ws, workoutVolume), min = Math.round(sum(ws, w => (w.end || w.start) - w.start) / 60000), streak = streakWeeks();
  const num = v => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return [
    `total_workouts: ${ws.length}`,
    `total_volume: ${num(isLb() ? vol * KG_LB : vol)} ${state.settings.unit}`,
    `total_duration: ${min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`}`,
    `streak: ${streak} week${streak === 1 ? '' : 's'}`,
    `status: ${ws.length >= 3 ? 'beast_mode' : ws.length ? 'grind_mode_active' : 'recovery_mode'}`
  ];
}
function weekCard() {
  const rule = '-'.repeat(28);
  return `<section class="term" aria-label="This week"><div class="term-h"><span>LIFTING-SANITY v1.3</span><button class="term-btn" data-a="shareWeek">${icon('share')}Share</button></div>
    <pre>${rule}\n$ cat weekly_stats.log\n${rule}\n${weekLines().map(l => '> ' + esc(l)).join('\n')}\n${rule}\n$ <span class="cur">_</span></pre></section>`;
}
function liftsSection(from, to, title) {
  const ws = workoutsIn(from, to);
  const count = {};
  for (const w of ws) for (const x of w.ex) if (x.sets.some(s => s.done)) count[x.exId] = (count[x.exId] || 0) + 1;
  const ids = Object.keys(count).sort((a, b) => count[b] - count[a]).slice(0, 10);
  if (!ids.length) return `<section class="section"><h2 class="section-h">${esc(title)}</h2><p class="muted">${T('Lifts you train show up here with their trend.')}</p></section>`;
  return `<section class="section"><h2 class="section-h">${esc(title)}</h2><div class="card list-card">${ids.map(id => {
    const ex = getEx(id), m = metricsFor(ex.k)[0][0];
    const pts = exSeries(id, m, Math.max(from, baseline(id)), to);
    const ptsAll = pts.length ? pts : exSeries(id, m, from, to);
    const first = ptsAll[0], last = ptsAll[ptsAll.length - 1];
    const best = ptsAll.length ? Math.max(...ptsAll.map(p => p.y)) : 0;
    const diff = first && last ? last.y - first.y : 0;
    const dtxt = ptsAll.length > 1 && Math.abs(diff) > 1e-6 ? signed(`${diff > 0 ? '+' : '−'}${fmtMetric(m, Math.abs(diff), ex.k)}`) : '';
    const fresh = exResetSince(id);
    return `<div class="lift-row"><button class="lift" data-a="openEx" data-id="${id}"><span class="lift-n"><b>${esc(ex.name)}</b><small>${fresh ? `${T('Fresh since {date}', { date: esc(fmtShort(fresh)) })} · ` : ''}${TN(count[id], '{n} session', '{n} sessions')} · ${esc(metricsFor(ex.k)[0][1])}</small></span>${sparkline(ptsAll.map(p => p.y))}<span class="lift-v"><b>${esc(best ? fmtMetric(m, best, ex.k) : '—')}</b>${dtxt ? `<small class="${diff > 0 ? 'up' : 'down'}">${esc(dtxt)}</small>` : ''}</span></button>`
      + `<button class="icon-btn lift-reset ${fresh ? 'on' : ''}" data-a="liftReset" data-id="${id}" aria-label="${T('Reset progression for {name}', { name: esc(ex.name) })}">${icon('reset')}</button></div>`;
  }).join('')}</div><button class="btn wide reset-any" data-a="resetAny">${icon('reset')}${T('Reset one exercise…')}</button></section>`;
}
function blockResetSheet() {
  const n = state.blocks.length + 1;
  openSheet({
    cls: 'small', focus: '#blkName',
    render: () => `<div class="sheet-body pad confirm"><h2>${T('Start a new block?')}</h2>
      <p>${T('Records, charts, “try more weight” tips and progress all start fresh from today.')}</p>
      <p>${T('<b>Nothing is deleted.</b> {name} is saved under Earlier blocks, every workout stays in History, and the All time view still shows it. You can undo this.', { name: esc(blkName(curBlock())) })}</p>
      <label class="field"><span>${T('Name for the new block')}</span><input id="blkName" value="${T('Block {n}', { n })}" autocomplete="off"></label>
      <div class="row-btns"><button class="btn" data-a="sheetClose">${T('Cancel')}</button><button class="btn primary" data-a="ok">${icon('reset')}${T('Start new block')}</button></div></div>`,
    actions: {
      ok: (b, def) => {
        const name = $('#blkName', def.el).value.trim() || T('Block {n}', { n });
        const nb = { id: uid(), name, start: resetStamp() };
        state.blocks.push(nb);
        save(true); closeSheet(def); refreshAll();
        toast(T('{name} started. Earlier progress is saved.', { name }), { label: T('Undo'), fn: () => { const i = state.blocks.indexOf(nb); if (i > 0) { state.blocks.splice(i, 1); recalcPRs(); save(); refreshAll(); } } });
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
    render: () => `${sheetHead(esc(blkName(b)))}<div class="sheet-body pad">
      <p class="eyebrow">${b.start ? esc(fmtDateY(b.start)) : T('From the start')} – ${esc(fmtDateY(t))} · ${T('saved block')}</p>
      <div class="tiles"><div class="tile"><span>${T('Sessions')}</span><b>${ws.length}</b></div><div class="tile"><span>${T('Working sets')}</span><b>${sum(ws, workingSets)}</b></div><div class="tile"><span>${T('Volume')}</span><b>${fmtVol(sum(ws, workoutVolume))}</b></div><div class="tile"><span>${T('Records')}</span><b>${sum(ws, w => (w.prs || []).length)}</b></div></div>
      ${liftsSection(f, t, T('Lifts in this block'))}
      <h3 class="sub-h">${T('Sessions')}</h3><div class="hist-list">${ws.slice().reverse().map(histCard).join('') || `<p class="muted">${T('No sessions in this block.')}</p>`}</div>
    </div>`
  });
}
/* ============================== Settings tab ============================== */

VIEWS.settings = function () {
  const s = state.settings;
  const seg = (action, cur, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button class="${String(cur) === String(v) ? 'on' : ''}" data-a="${action}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${esc(l)}</button>`).join('')}</div>`;
  const row = (title, desc, ctl) => `<div class="set-item"><div><b>${title}</b>${desc ? `<p class="muted">${desc}</p>` : ''}</div>${ctl}</div>`;
  const demo = state.workouts.some(w => w.demo);
  return `<header class="page-h"><div><p class="eyebrow">${T('Saved on this device')}</p><h1>${T('Settings')}</h1></div></header>
  <div class="card list-card guide-row">
    ${row(T('Guide'), T('A plan that fits you, a tour of the app, the words you’ll see and tips as you go.'), `<button class="btn sm" data-a="openGuide">${icon('info')}${T('Open')}</button>`)}
  </div>
  <h2 class="section-h">${T('Logging')}</h2><div class="card list-card">
    ${row(T('Units'), T('Weights you already logged convert automatically.'), seg('setUnit', s.unit, [['kg', term('kg')], ['lb', term('lb')]]))}
    ${row(T('Effort'), T('RIR: reps left in the tank. RPE: how hard, out of 10.'), seg('setEffort', s.effort, [['rir', term('RIR')], ['rpe', term('RPE')], ['off', T('Off')]]))}
    ${row(T('Weight step'), T('Used for warm-ups and “try more weight” tips.'), `<label class="select-wrap sm"><select data-f="step">${(s.unit === 'lb' ? [1, 2.5, 5, 10] : [0.5, 1, 1.25, 2, 2.5, 5]).map(v => `<option value="${v}" ${+s.step === v ? 'selected' : ''}>${v} ${s.unit}</option>`).join('')}</select></label>`)}
    ${row(T('Bar weight'), T('For the plate calculator and warm-ups.'), `<label class="select-wrap sm"><select data-f="bar">${(s.unit === 'lb' ? [15, 25, 35, 45, 55] : [7, 10, 15, 20, 25]).map(v => `<option value="${v}" ${+s.bar === v ? 'selected' : ''}>${v} ${s.unit}</option>`).join('')}</select></label>`)}
  </div>
  <h2 class="section-h">${T('During a workout')}</h2><div class="card list-card">
    ${row(T('Layout'), T('One exercise at a time with big next and previous buttons, or every exercise in one list.'), seg('setView', s.view, [['focus', T('One at a time')], ['list', T('List')]]))}
    ${row(T('One-side exercises'), T('How left and right are logged on one-arm and one-leg exercises. You can also change it on each exercise.'), seg('setUniStyle', s.uniStyle || 'rows', [['rows', T('Separate rows')], ['one', T('One row')]]))}
    ${row(T('Number pad'), T('Auto uses the in-app pad on iPhone, with Next, + / − and Log keys, and the normal keyboard on iPad.'), seg('setKeypad', s.keypad, [['auto', T('Auto')], ['app', T('In-app pad')], ['system', T('Keyboard')]]))}
    ${s.effort !== 'off' ? row(T('{eff} on the number pad', { eff: effName() }), T('Next and Log go from weight to reps to {eff}, and one tap on a choice moves on. Off: the pad skips it, and you tap the {eff} box to set it.', { eff: effName() }), toggle(s.padRir !== false, 'tgl', 'data-k="padRir"')) : ''}
    ${row(T('Default rest'), T('Each exercise can have its own.'), `<label class="select-wrap sm"><select data-f="rest">${REST_PRESETS.map(v => `<option value="${v}" ${v === s.rest ? 'selected' : ''}>${fmtRest(v)}</option>`).join('')}</select></label>`)}
    ${row(T('Start rest timer when a set is checked'), '', toggle(s.autoRest, 'tgl', 'data-k="autoRest"'))}
    ${row(T('Move to the next exercise when one is done'), T('Slides to it one at a time, or scrolls down to it in the list.'), toggle(s.autoNext, 'tgl', 'data-k="autoNext"'))}
    ${row(T('Sound when rest is over'), `<button class="link" data-a="testSound">${T('Play it')}</button>`, toggle(s.sound, 'tgl', 'data-k="sound"'))}
    ${row(T('Keep the screen awake'), T('While a workout is open.'), toggle(s.wake, 'tgl', 'data-k="wake"'))}
  </div>
  <h2 class="section-h">${T('Look')}</h2><div class="card list-card">
    ${row(T('Language'), T('العربية: the app reads right to left. How-to steps stay in English; exercise names, units and gym terms can be switched to Arabic too.'), seg('setLang', LANG, [['en', 'English'], ['ar', 'العربية']]))}
    ${RTL ? row(T('Exercise names'), T('In Arabic, or as they’re known in gyms and videos. Search finds an exercise by either name.'), seg('setArNames', window.AR_NAMES ? 'ar' : 'en', [['en', T('In English')], ['ar', T('In Arabic')]])) : ''}
    ${RTL ? row(T('Units and gym terms'), T('kg, RIR, 1RM, set letters and the like, in Arabic: كغ، احتياط، أقصى رفعة.'), seg('setArTerms', window.AR_TERMS ? 'ar' : 'en', [['en', T('As they are')], ['ar', T('In Arabic')]])) : ''}
    ${row(T('Theme'), '', seg('setTheme', s.theme, [['auto', T('Auto')], ['dark', T('Dark')], ['light', T('Light')]]))}
    ${row(T('Style'), T('Clean is the default look. Y2K is a dense, retro desktop look: cobalt and chrome, pixel type, LCD readouts and a HUD.'), seg('setStyle', s.style || 'clean', [['clean', T('Clean')], ['y2k', 'Y2K']]))}
    ${row(T('Movement animations'), `${T('Exercise pictures and the “How it works” diagrams move through a rep. Off shows the start and finish side by side.')}${reduceMotion.matches ? ' ' + T('Reduce Motion is on in your device settings, so they stay still.') : ''}`, seg('setMotion', s.motion === false ? 'off' : 'on', [['on', T('On')], ['off', T('Off')]]))}
  </div>
  <h2 class="section-h">${T('Your data')}</h2><div class="card list-card">
    ${row(T('Back up'), esc(backupText()) + ' ' + T('Saves everything, photos included, to a file in Files or iCloud Drive.'), `<div class="btn-pair"><button class="btn sm" data-a="exportFile">${icon('download')}${T('Save file')}</button><button class="btn sm ghost" data-a="exportCopy">${icon('copy')}${T('Copy')}</button></div>`)}
    ${row(T('Restore'), T('Load a backup file. Replaces what’s on this device.'), `<div class="btn-pair"><label class="btn sm">${icon('upload')}${T('Choose file')}<input type="file" accept=".json,application/json" data-f="importFile" hidden></label><button class="btn sm ghost" data-a="importPaste">${T('Paste')}</button></div>`)}
    ${row(T('Copies on this device'), TN(COPY_DAYS, 'The last {n} day, kept automatically. Go back to one if something goes wrong.', 'The last {n} days, kept automatically. Go back to one if something goes wrong.'), `<button class="btn sm" data-a="copies">${icon('clock')}${T('View')}</button>`)}
    ${row(T('Sample history'), demo ? T('Sample workouts are mixed into your history.') : T('Load 8 weeks of example workouts to see what the charts look like.'), demo ? `<button class="btn sm" data-a="demoOff">${T('Remove samples')}</button>` : `<button class="btn sm" data-a="demoOn">${T('Load samples')}</button>`)}
    ${row(T('Erase everything'), T('Deletes all workouts, templates and settings on this device.'), `<button class="btn sm danger" data-a="eraseAll">${T('Erase')}</button>`)}
  </div>
  <h2 class="section-h">${T('Install on your phone')}</h2><div class="card pad prose">
    <ol><li>${T('<b>iPhone or iPad:</b> open Lifting Sanity in <b>Safari</b>, tap the <b>Share</b> button, then <b>Add to Home Screen</b>.')}</li><li>${T('<b>Android:</b> open it in Chrome, tap <b>⋮</b>, then <b>Add to Home screen</b> or <b>Install app</b>.')}</li><li>${T('Open it from your Home Screen. It runs full screen and works without internet.')}</li></ol>
    <p class="muted small">${T('Your workouts are stored on this device only, and nobody else can see them: sharing the link shares the app, not your data. Browsers can clear storage for websites you haven’t opened in a while, and the Home Screen app is protected from that. Back up now and then anyway.')}</p>
  </div>
  <p class="muted small center">Lifting Sanity 1.3 · ${TN(LIB.length, '{n} exercise', '{n} exercises')} · ${storageOK ? T('saving to this device') : T('storage blocked')}</p>
  <p class="muted small center credits">${T('Illustrations: {repdb} and {everkinetic} (Greg Priday, CC BY-SA 4.0)', { repdb: `<a href="https://repdb.co" target="_blank" rel="noopener">${T('Exercise data by RepDB (repdb.co)')}</a>`, everkinetic: '<a href="https://github.com/everkinetic/data" target="_blank" rel="noopener">Everkinetic</a>' })} · ${T('Instructions: {dataset} (MIT)', { dataset: '<a href="https://github.com/hasaneyldrm/exercises-dataset" target="_blank" rel="noopener">exercises-dataset</a>' })}</p>
  <p class="muted small center fit-info" id="fitInfo" lang="en" dir="ltr">${(screenGap(), fitLine())}</p>`;
};
function exportData() {
  return JSON.stringify({ app: 'liftingsanity', version: 1, exported: Date.now(), data: { ...state, rest: null }, photos: Object.fromEntries(photos) });
}
/* ----- backups: when you last made one, a nudge when it's been a while, and automatic copies on the device ----- */
// your own workouts (not the samples), and how many came after the last backup
function backupInfo() {
  const real = state.workouts.filter(w => !w.demo).length, at = state.flags.backup || 0;
  return { real, at, since: at ? Math.max(0, real - (state.flags.backupN || 0)) : real, days: at ? Math.floor((Date.now() - at) / DAY) : null };
}
function markBackedUp() {
  const b = backupInfo();
  state.flags.backup = Date.now(); state.flags.backupN = b.real; delete state.flags.backupSnooze;
  save(true); render();
}
function backupText() {
  const b = backupInfo();
  if (!b.at) return b.real ? TN(b.real, 'Never backed up. Your {n} workout is only on this device.', 'Never backed up. Your {n} workouts are only on this device.') : T('Save everything to a file in Files or iCloud Drive.');
  return `${b.days === 0 ? T('Last backup today') : b.days === 1 ? T('Last backup yesterday') : TN(b.days, 'Last backup {n} day ago', 'Last backup {n} days ago')}${b.since ? ` · ${TN(b.since, '{n} workout since', '{n} workouts since')}` : ` · ${T('nothing new since')}`}.`;
}
// a gentle nudge on the Train page: a few workouts in and never backed up, or a week and something new since
function backupNudge() {
  const b = backupInfo();
  if (state.active || b.real < 3 || (state.flags.backupSnooze || 0) > Date.now()) return '';
  if (b.at && !(b.days >= 7 && b.since >= 1) && b.since < 8) return '';
  return `<div class="notice backup-nudge">${icon('download')}<p><b>${b.at ? TN(b.since, '{n} workout since your last backup.', '{n} workouts since your last backup.') : TN(b.real, 'Your {n} workouts are only on this device.', 'Your {n} workouts are only on this device.')}</b> ${T('Save a copy to Files or iCloud Drive, so losing your phone doesn’t lose them.')}</p>
    <div class="nudge-btns"><button class="btn sm primary" data-a="exportFile">${T('Back up now')}</button><button class="btn sm ghost" data-a="backupLater">${T('Later')}</button></div></div>`;
}
// one copy of your data a day on this device, for the last few days: a way back from a mistake or a damaged save.
// It's on this device only, so it doesn't replace a backup file
const COPY_DAYS = 5;
function copyDB() {
  return new Promise(res => {
    try {
      const rq = indexedDB.open('liftingsanity-copies', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('copies');
      rq.onsuccess = () => res(rq.result);
      rq.onerror = rq.onblocked = () => res(null);
    } catch (e) { res(null); }
  });
}
const idbDone = rq => new Promise((res, rej) => { rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
async function listCopies() {
  const db = await copyDB();
  if (!db) return [];
  try { return (await idbDone(db.transaction('copies').objectStore('copies').getAll())).sort((a, b) => b.at - a.at); } catch (e) { return []; } finally { db.close(); }
}
async function keepCopy() {
  if (saveBlocked || !state.workouts.some(w => !w.demo)) return;
  const db = await copyDB();
  if (!db) return;
  try {
    const d = new Date(), key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await idbDone(db.transaction('copies', 'readwrite').objectStore('copies').put({ key, at: Date.now(), n: backupInfo().real, json: JSON.stringify({ ...state, rest: null }) }, key));
    const all = (await idbDone(db.transaction('copies').objectStore('copies').getAll())).sort((a, b) => b.at - a.at);
    // the last few days, plus the fullest of the older copies, so a wiped or damaged save can't push every good copy out
    // (picked among the older ones only: there's always one older copy to go back to, however full the recent ones are)
    const older = all.slice(COPY_DAYS);
    const fullest = older.reduce((m, c) => (c.n > m.n ? c : m), older[0]);
    const st = db.transaction('copies', 'readwrite').objectStore('copies');
    for (const c of older) if (c !== fullest) st.delete(c.key);
  } catch (e) { /* copies are a safety net; they never get in the way */ } finally { db.close(); }
}
async function copiesSheet() {
  const list = await listCopies();
  openSheet({
    cls: 'small',
    render: () => `${sheetHead(T('Copies on this device'))}<div class="sheet-body pad">
      <p class="muted">${TN(COPY_DAYS, 'Each day you use the app it keeps a copy of your data here, for the last {n} day. Going back to one replaces what’s on the device now (that’s set aside first, and your photos stay). They’re on this device only, so they don’t replace a backup file.', 'Each day you use the app it keeps a copy of your data here, for the last {n} days. Going back to one replaces what’s on the device now (that’s set aside first, and your photos stay). They’re on this device only, so they don’t replace a backup file.')}</p>
      ${list.length ? `<div class="card list-card copies">${list.map((c, i) => `<button class="menu-item" data-a="useCopy" data-i="${i}">${icon('clock')}<span><b>${esc(relDay(c.at).replace(/^./, m => m.toUpperCase()))} · ${esc(fmtShort(c.at))}, ${esc(fmtTime(c.at))}</b><small>${TN(c.n, '{n} workout', '{n} workouts')}</small></span></button>`).join('')}</div>` : `<p class="muted">${T('No copies yet. The first one is made once you have a workout logged.')}</p>`}
    </div>`,
    actions: { useCopy: (b, def) => { const c = list[+b.dataset.i]; let data = null; try { data = JSON.parse(c.json); } catch (e) { /* checked below */ } importText(JSON.stringify({ app: 'liftingsanity', version: 1, exported: c.at, data }), { copy: true }); } }
  });
}
async function exportFile() {
  if (!photosLoaded) { toast(T('Your photos are still loading. Try again in a second.')); return; }
  const name = `lifting-sanity-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([exportData()], { type: 'application/json' });
  // inside claude.ai the page can't download on its own, so the viewer saves through the host
  const host = window.claude && window.claude.use ? await window.claude.use('downloads').catch(() => null) : null;
  if (host) {
    try { await host.save({ filename: name, data: blob }); markBackedUp(); toast(T('Backup saved.')); }
    catch (e) { if (!e || e.code !== 'declined') toast(T('Saving isn’t available here. Use Copy instead.')); }
    return;
  }
  try {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: T('Lifting Sanity backup') }); markBackedUp(); toast(T('Backup saved.')); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  markBackedUp();
  toast(T('Backup saved.'));
}
// the shape a backup must have before anything on the device is touched
function backupProblem(d) {
  const arr = v => Array.isArray(v), obj = v => v && typeof v === 'object' && !Array.isArray(v);
  if (!obj(d) || !arr(d.workouts)) return T('it has no workouts list');
  for (const w of d.workouts) if (!obj(w) || !arr(w.ex) || !isFinite(w.start) || w.ex.some(x => !obj(x) || typeof x.exId !== 'string' || !arr(x.sets) || x.sets.some(s => !obj(s)))) return T('a workout in it is damaged');
  for (const k of ['templates', 'splits', 'custom']) if (d[k] != null && !arr(d[k])) return k === 'templates' ? T('its templates are damaged') : k === 'splits' ? T('its splits are damaged') : T('its custom are damaged');
  if ((d.templates || []).some(t => !obj(t) || !arr(t.ex))) return T('a template in it is damaged');
  for (const k of ['settings', 'exPrefs', 'exResets']) if (d[k] != null && !obj(d[k])) return k === 'exPrefs' ? T('its exercise settings are damaged') : k === 'exResets' ? T('its resets are damaged') : T('its settings are damaged');
  return '';
}
// opts.copy: going back to an automatic copy (it has no photos, so the ones on the device stay)
function importText(text, opts = {}) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { toast(T('That isn’t a Lifting Sanity backup. The text isn’t valid JSON.')); return; }
  const data = obj && obj.app === 'liftingsanity' ? obj.data : null;
  if (!data) { toast(T('That file isn’t a Lifting Sanity backup.')); return; }
  // check and convert a copy first: a damaged backup changes nothing
  let next = null, problem = backupProblem(data);
  if (!problem) try { next = migrate(JSON.parse(JSON.stringify(data))); } catch (e) { problem = T('it couldn’t be read'); }
  if (problem) { toast(T('This backup can’t be restored: {problem}. Nothing was changed.', { problem })); return; }
  const pics = obj.photos && typeof obj.photos === 'object' ? Object.entries(obj.photos).filter(([id, url]) => typeof url === 'string' && url.startsWith('data:image/')) : [];
  const has = { w: TN(next.workouts.length, '<b>{n}</b> workouts', '<b>{n}</b> workouts'), t: TN(next.templates.length, '<b>{n}</b> templates', '<b>{n}</b> templates'), p: TN(pics.length, '<b>{n}</b> photo', '<b>{n}</b> photos'), date: obj.exported ? esc(fmtDateY(obj.exported)) : '' };
  confirmSheet({
    title: opts.copy ? T('Go back to this copy?') : T('Restore this backup?'),
    text: pics.length
      ? (obj.exported ? T('It has {w}, {t} and {p}, saved {date}. Everything on this device is replaced.', has) : T('It has {w}, {t} and {p}. Everything on this device is replaced.', has))
      : (obj.exported ? T('It has {w}, {t}, saved {date}. Everything on this device is replaced.', has) : T('It has {w}, {t}. Everything on this device is replaced.', has)),
    ok: T('Restore'), danger: true,
    onOk: () => {
      const before = state;
      try { localStorage.setItem(KEY + ':before-restore', JSON.stringify(state)); } catch (e) { /* storage full */ }
      try { state = next; state.active = null; ensureSplits(); rebuildCustom(); } catch (e) {
        state = before; rebuildCustom();
        toast(T('This backup can’t be restored: it couldn’t be read. Nothing was changed.'));
        return;
      }
      // photos too, once the data is in place: the backup's photos replace the ones on the device (none are left over from before)
      if (!opts.copy) {
        const keep = new Set(pics.map(([id]) => id));
        for (const id of [...photos.keys()]) if (!keep.has(id)) storePhoto(id, null);
        for (const [id, url] of pics) storePhoto(id, url);
      }
      rebuildCustom(); applyTheme(); save(true); renderWorkout(); renderRest(); render();
      toast(storageOK ? T('Backup restored.') : T('Backup loaded, but this device couldn’t save it. Free some space and restore again.'));
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
  recalcPRs();
  save(true); render();
  toast(T('Loaded 24 sample workouts. Remove them any time in Settings.'));
}

/* ============================== Actions ============================== */

const ACT = {
  tab: b => go(b.dataset.tab),
  toastAct: () => { const a = toast.action; $('#toast').classList.remove('in'); if (a) a.fn(); },
  resume: () => { ui.woHidden = false; renderWorkout(); wake(true); },
  nextOpen: () => { ui.nextOpen = !ui.nextOpen; render(); },
  // a new language takes effect on a fresh start of the page (everything is drawn in it from the beginning)
  openGuide: () => guideSheet(),
  tipDone: b => { (state.flags.tipSeen = state.flags.tipSeen || {})[b.dataset.id] = 1; save(); render(); renderWorkout(); },
  tipsOff: () => { state.flags.tips = 0; save(); render(); renderWorkout(); toast(T('Tips are off. Settings → Guide turns them back on.')); },
  setLang: b => { if (b.dataset.v === LANG) return; setLang(b.dataset.v); persist(); location.reload(); },
  setArNames: b => { const on = b.dataset.v === 'ar'; if (on === !!window.AR_NAMES) return; setPref('arNames', on); persist(); location.reload(); },
  setArTerms: b => { const on = b.dataset.v === 'ar'; if (on === !!window.AR_TERMS) return; setPref('arTerms', on); persist(); location.reload(); },
  backupLater: () => { state.flags.backupSnooze = Date.now() + 3 * DAY; save(); render(); },
  copies: () => copiesSheet(),
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
  planF: b => {
    const f = planFilter(), k = b.dataset.k, v = b.dataset.v;
    if (k === 'all') { f.days = 0; f.level = ''; } else f[k] = k === 'days' ? +v : v;
    const def = sheetFor(b);
    if (def) refreshSheet(def); else render();
    // the same choice keeps the focus after the list is drawn again
    const again = $(`${def ? `[data-sheet="${def.id}"] ` : '#view '}[data-a="planF"][data-k="${k === 'all' ? 'days' : k}"][data-v="${k === 'all' ? 0 : v}"]`);
    if (again) again.focus();
  },
  planOpen: b => planSheet(b.dataset.id),
  splitVersion: b => splitVersionSheet(splitById(b.dataset.id)),
  // workout
  woMin: () => { ui.woHidden = true; render(); renderWorkout(); },
  woRename: () => renameWorkout(),
  woMenu: () => woMenu(),
  woFinish: () => finishPrompt(),
  woGo: b => woGo(+b.dataset.i),
  woPrev: () => woGo(A().cur - 1, true),
  woNext: () => { const w = A(); const n = nextExIndex(w, w.cur); woGo(n == null ? w.cur + 1 : n, true); },
  woAddEx: () => addExercisesToWorkout(),
  woRest: () => restChooser({ title: T('Start a rest timer'), current: state.rest ? state.rest.total : null, onPick: v => startRest(v) }),
  exMenu: b => exMenu(+b.dataset.e),
  exInfo: b => exerciseSheet(A().ex[+b.dataset.e].exId),
  exNote: b => exNote(+b.dataset.e),
  exRest: b => {
    const x = A().ex[+b.dataset.e];
    restChooser({ title: T('Rest · {name}', { name: getEx(x.exId).name }), current: x.rest || state.settings.rest, onPick: v => {
      x.rest = v; (state.exPrefs[x.exId] = state.exPrefs[x.exId] || {}).rest = v;
      if (state.rest && !state.rest.alerted) startRest(v, state.rest.next);
      save(); renderWorkout();
    } });
  },
  exUni: b => uniSheet(+b.dataset.e),
  noteOpen: b => exNote(+b.dataset.e),
  noteDone: () => { ui.noteOpen = null; renderWorkout(); },
  setupOpen: b => exSetup(+b.dataset.e),
  setupDone: () => { ui.setupOpen = null; renderWorkout(); },
  setupClear: () => { const w = A(), x = w && w.ex.find(o => o.id === ui.setupOpen); if (x && state.exPrefs[x.exId]) { delete state.exPrefs[x.exId].note; save(); } ui.setupOpen = null; renderWorkout(); },
  // add a part to the setup and leave the cursor after it, ready for its number
  setupChip: b => {
    const t = $(`#workout input[data-note="setup"][data-e="${b.dataset.e}"]`);
    if (!t) return;
    const v = t.value.replace(/[\s,·]+$/, '');
    t.value = (v ? v + ', ' : '') + b.dataset.v + ' ';
    noteInput(t);
    t.focus(); t.setSelectionRange(t.value.length, t.value.length);
  },
  noteChip: b => {
    const x = A().ex[+b.dataset.e], c = b.dataset.v, parts = noteParts(x.note);
    // the same word saved in English or in the language shown counts as one
    const en = (NOTE_CHIPS.find(o => o[1] === c) || [c])[0], same = p => p === c || p === en;
    x.note = (parts.some(same) ? parts.filter(p => !same(p)) : [...parts, c]).join(', ');
    save(); renderWorkout();
  },
  addSet: b => addSet(+b.dataset.e),
  toggleBoth: b => toggleBoth(+b.dataset.e, +b.dataset.s),
  delMode: b => { const x = A().ex[+b.dataset.e]; ui.delMode = ui.delMode === x.id ? null : x.id; ui.kp = null; ui.effOpen = null; renderWorkout(); },
  repeatSet: b => repeatSet(+b.dataset.e),
  rowDel: b => { const x = A().ex[+b.dataset.e], s = x && x.sets[+b.dataset.s]; if (s) deleteRows(x, setRows(x, s)); },
  copyAbove: b => {
    const x = A().ex[+b.dataset.e], s = x.sets[+b.dataset.s];
    for (const row of isCompact(x) ? setRows(x, s) : [s]) {
      const o = setAbove(x, x.sets.indexOf(row));
      if (o) for (const f of ['w', 'r', 'sec', 'dist']) { if (o[f] != null) row[f] = o[f]; else delete row[f]; }
    }
    save(); renderWorkout();
  },
  addWarm: b => warmMenu(+b.dataset.e),
  plates: b => { const x = A().ex[+b.dataset.e]; const s = x.sets.find(o => !o.done && o.t !== 'W'); plateSheet(s && s.w != null ? s.w : (x.sets.filter(o => o.w != null).pop() || {}).w); },
  setType: b => setTypeSheet(+b.dataset.e, +b.dataset.s),
  toggleSet: b => toggleSet(+b.dataset.e, +b.dataset.s),
  usePrev: b => {
    const w = A(), i = +b.dataset.e, j = +b.dataset.s, x = w.ex[i];
    const prev = exCtx(w, x).prevSets;
    for (const s of isCompact(x) ? setRows(x, x.sets[j]) : [x.sets[j]]) {
      const p = prev[x.sets.indexOf(s)];
      if (p) for (const f of ['w', 'r', 'sec', 'dist']) { if (p[f] != null) s[f] = p[f]; }
    }
    save(); renderWorkout();
  },
  effort: b => {
    const key = `${b.dataset.e}:${b.dataset.s}`, x = A().ex[+b.dataset.e];
    ui.effOpen = ui.effOpen === key ? null : key;
    ui.effSid = ui.effOpen ? [x.id, x.sets[+b.dataset.s].id] : null;
    ui.kp = null; renderWorkout();
  },
  kp: b => {
    ui.kp = kpOpen(+b.dataset.e, +b.dataset.s, b.dataset.f);
    ui.effOpen = null;
    // the picker is taken off by hand, so its card is redrawn in full next time (it can open again)
    $$('#workout .eff-pick').forEach(n => { const c = n.closest('.exc'); if (c) c._h = null; n.remove(); });
    renderKeypad(); markKpCell(true);
  },
  kpKey: b => {
    if (!kpField() || ui.kp.f === 'rir') return;
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
    if (!kpField() || ui.kp.f === 'rir') return;
    const buf = ui.kp.fresh ? '' : (ui.kp.buf ?? kpCurrent()).slice(0, -1);
    ui.kp.fresh = false;
    kpSet(buf);
  },
  kpStep: b => {
    const fld = kpField();
    if (!fld || ui.kp.f === 'rir') return;
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
  // across the row and on to the next set: weight, reps, then RIR (unless that's turned off, or it's a warm-up)
  kpNext: () => {
    const fld = kpField();
    if (!fld) { kpClose(); return; }
    kpShow(kpCurrent());
    const { x } = fld, sides = sidesInOrder(x, fld.set);
    if (ui.kp.f === 'rir' && sides.length > 1 && sides[0] === fld.set) { kpGo(x.sets.indexOf(sides[1]), 'rir'); return; }
    const cells = $$(`#workout .exc[data-e="${ui.kp.e}"] .cell[data-a="kp"]`);
    const nx = cells.slice(cells.indexOf(kpCell()) + 1).find(c => c.dataset.f !== 'rir' || rirStep(x, x.sets[+c.dataset.s]));
    if (!nx) { kpClose(); return; }
    kpGo(+nx.dataset.s, nx.dataset.f);
  },
  // Log asks for the RIR first (each side of a one-row set), then logs; on the RIR step it logs straight away
  kpLog: () => {
    const fld = kpField();
    if (!fld) { kpClose(); return; }
    const { w, x } = fld, rows = sidesInOrder(x, fld.set), two = rows.length > 1;
    if (fld.set.done && !two) { kpClose(); return; }
    if (rows.every(o => o.done)) { kpClose(); return; }
    const open = rows.filter(o => !o.done);
    if (ui.kp.f !== 'rir' && open.every(o => canLog(w, x, o))) {
      const ask = open.find(o => o.rir == null && rirStep(x, o));
      if (ask) { kpGo(x.sets.indexOf(ask), 'rir', 'log'); return; }
    }
    if (two) toggleBoth(ui.kp.e, Math.min(...rows.map(o => x.sets.indexOf(o))), true);
    else toggleSet(ui.kp.e, ui.kp.s, true);
  },
  // a RIR choice on the pad: then the other side, the log it was asked for, or on to the next set
  kpEff: b => {
    const fld = kpField();
    if (!fld || ui.kp.f !== 'rir') return;
    const { x, set } = fld, then = ui.kp.then;
    if (b.dataset.v === '') { delete set.rir; save(); renderWorkout(); return; }
    set.rir = +b.dataset.v;
    save(); renderWorkout();
    const sides = sidesInOrder(x, set), mate = sides.length > 1 && sides[0] === set ? sides[1] : null;
    if (mate && (!then || (!mate.done && mate.rir == null))) { kpGo(x.sets.indexOf(mate), 'rir', then); return; }
    if (then === 'log') ACT.kpLog();
    else if (state.settings.padRir !== false) ACT.kpNext();
    else kpClose();
  },
  kpClose: () => kpClose(),
  effPick: b => {
    const x = A().ex[+b.dataset.e], s = x.sets[+b.dataset.s];
    // data-one: just this side (one-row left/right), and the choices stay open until both sides have one
    for (const o of b.dataset.one ? [s] : isCompact(x) ? setRows(x, s) : [s]) { o.rir = b.dataset.v === '' ? null : +b.dataset.v; if (o.rir == null) delete o.rir; }
    if (!b.dataset.one || setRows(x, s).every(o => o.rir != null)) ui.effOpen = null;
    save(); renderWorkout();
  },
  restAdj: b => { const r = state.rest; if (!r) return; r.end += +b.dataset.d * 1000; r.total = Math.max(r.total, Math.ceil((r.end - Date.now()) / 1000)); if (r.end > Date.now()) { r.alerted = false; $('#restbar').classList.remove('over'); const l = $('.rb-label', $('#restbar')); if (l) l.textContent = T('Rest'); } save(); tickRest(); },
  restSkip: () => { state.rest = null; save(); renderRest(); },
  restPresets: () => restChooser({ title: T('Rest length'), current: state.rest ? state.rest.total : null, onPick: v => startRest(v, state.rest ? state.rest.next : '') }),
  // history
  histMonth: b => { const d = new Date(ui.hist.month); d.setMonth(d.getMonth() + +b.dataset.d); ui.hist.month = d.getTime(); render(); slideIn($('#view .cal-grid'), +b.dataset.d * (RTL ? -1 : 1)); },
  histDay: b => { const v = b.dataset.v; ui.hist.day = v ? (ui.hist.day === +v ? null : +v) : null; ui.histLimit = null; render(); },
  openWorkout: b => workoutSheet(b.dataset.id),
  logPast: () => logPastWorkout(),
  // library
  libG: b => { ui.lib.g = b.dataset.v; ui.lib.m = 'all'; ui.libLimit = PAGE; render(); },
  libM: b => { ui.lib.m = b.dataset.v; ui.libLimit = PAGE; render(); },
  libS: b => { ui.lib.sort = b.dataset.v; ui.libLimit = PAGE; render(); },
  histMore: () => { const y = scrollY; ui.histLimit = (ui.histLimit || HIST_PAGE) + HIST_PAGE; render(); scrollTo(0, y); },
  libMore: b => {
    const from = ui.libLimit || PAGE, all = filterExercises(ui.lib);
    ui.libLimit = from + PAGE;
    b.outerHTML = libRows(all.slice(from, ui.libLimit)) + moreButton(ui.libLimit, all.length, 'libMore');
  },
  libNew: () => customExerciseSheet(null, ui.lib.q, id => exerciseSheet(id)),
  openEx: b => exerciseSheet(b.dataset.id),
  planReview: b => { const sp = state.splits.find(s => s.id === b.dataset.id); if (sp) planReview(sp); },
  liftReset: b => { const id = b.dataset.id; if (exResetSince(id)) menuSheet(getEx(id).name, [[T('Reset again from today'), 'reset', () => resetExercise(id)], [T('Undo the last reset'), 'undo', () => { undoExReset(id); toast(T('Last reset undone.')); }]]); else resetExercise(id); },
  resetAny: () => pickExercises({ single: true, title: T('Reset which exercise?'), onPick: ([id]) => resetExercise(id) }),
  // progress
  blockReset: () => blockResetSheet(),
  shareWeek: async () => {
    const text = ['LIFTING-SANITY', '$ cat weekly_stats.log', ...weekLines().map(l => '> ' + l)].join('\n');
    try { if (navigator.share && !inFrame) { await navigator.share({ text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast(T('Copied your week. Paste it anywhere.')), () => showCopyBox(text));
    else showCopyBox(text);
  },
  blockUndo: () => {
    const b = curBlock();
    if (state.blocks.length < 2) return;
    confirmSheet({ title: T('Undo {name}?', { name: blkName(b) }), text: T('{name} merges back into {prev}. No workouts are changed.', { name: esc(blkName(b)), prev: esc(blkName(state.blocks[state.blocks.length - 2])) }), ok: T('Undo reset'),
      onOk: () => { const i = state.blocks.indexOf(b); if (i > 0) { state.blocks.splice(i, 1); recalcPRs(); save(); refreshAll(); } } });
  },
  blockRename: () => { const b = curBlock(); inputSheet({ title: T('Rename block'), label: T('Name'), value: blkName(b), onOk: v => { if (v) { b.name = v; save(); render(); } } }); },
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
  setUniStyle: b => { state.settings.uniStyle = b.dataset.v; for (const p of Object.values(state.exPrefs)) delete p.uniStyle; save(); render(); },
  setTheme: b => { state.settings.theme = b.dataset.v; applyTheme(); save(); render(); },
  profSet: b => {
    const id = b.dataset.id, v = b.dataset.v, p = state.exPrefs[id] = state.exPrefs[id] || {};
    if (!v) delete p.profile;
    else if (v !== 'custom') p.profile = v;
    else if (sciOf(id).profile !== 'custom') { const a = sciOf(id); p.profile = a && a.curve ? [0, 6, 12, 18, 24].map(k => Math.round(Math.max(0.05, a.curve[k]) * 100) / 100) : PROF_START.slice(); }
    save(); refreshAll();
  },
  setMotion: b => { state.settings.motion = b.dataset.v === 'on'; save(); mvStopAll(); render(); renderWorkout(); },
  setStyle: b => { state.settings.style = b.dataset.v; applyTheme(); save(); render(); renderWorkout(); },
  tgl: b => { const k = b.dataset.k; state.settings[k] = !state.settings[k]; save(); render(); if (k === 'wake') wake(state.settings.wake); },
  testSound: () => { unlockAudio(); const s = state.settings.sound; state.settings.sound = true; beep(); state.settings.sound = s; },
  exportFile: () => exportFile(),
  exportCopy: () => {
    if (!photosLoaded) { toast(T('Your photos are still loading. Try again in a second.')); return; }
    const text = exportData();
    const done = () => { markBackedUp(); toast(T('Backup copied. Paste it into Notes or Files to keep it.')); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => showCopyBox(text)); else showCopyBox(text);
  },
  importPaste: () => openSheet({
    cls: 'small', focus: '#pasteBox',
    render: () => `<div class="sheet-body pad confirm"><h2>${T('Paste a backup')}</h2><label class="field"><span>${T('Backup text')}</span><textarea id="pasteBox" rows="6" placeholder='{"app":"liftingsanity", …}'></textarea></label>
      <div class="row-btns"><button class="btn" data-a="sheetClose">${T('Cancel')}</button><button class="btn primary" data-a="ok">${T('Continue')}</button></div></div>`,
    actions: { ok: (b, def) => { const t = $('#pasteBox', def.el).value; closeSheet(def); importText(t); } }
  }),
  demoOn: () => loadSamples(),
  demoOff: () => { state.workouts = state.workouts.filter(w => !w.demo); recalcPRs(); save(true); render(); toast(T('Sample workouts removed.')); },
  eraseAll: () => confirmSheet({
    title: T('Erase everything?'), text: T('All workouts, templates, splits and settings on this device are deleted. Type <b>ERASE</b> to confirm.'),
    extra: `<label class="field"><span class="sr">${T('Type ERASE')}</span><input id="eraseBox" autocomplete="off" autocapitalize="characters"></label>`,
    ok: T('Erase everything'), danger: true,
    onOk: def => {
      if ($('#eraseBox', def.el).value.trim().toUpperCase() !== 'ERASE') { toast(T('Type ERASE to confirm.')); return false; }
      for (const id of [...photos.keys()]) storePhoto(id, null);
      // the copies kept before a restore or of unreadable data go too
      try { for (const k of Object.keys(localStorage)) if (k.startsWith(KEY + ':')) localStorage.removeItem(k); } catch (e) { /* nothing stored */ }
      try { indexedDB.deleteDatabase('liftingsanity-copies'); } catch (e) { /* none kept */ }
      saveBlocked = false;
      state = defaults(); ensureSplits(); rebuildCustom(); applyTheme(); save(true); renderWorkout(); renderRest(); render();
      toast(T('Everything was erased.'));
    }
  })
};
function showCopyBox(text) {
  openSheet({ cls: 'small', render: () => `<div class="sheet-body pad confirm"><h2>${T('Copy your backup')}</h2><p class="muted">${T('Select all of the text and copy it.')}</p><textarea id="copyBox" rows="8" readonly>${esc(text)}</textarea><div class="row-btns"><button class="btn primary" data-a="sheetClose">${T('Done')}</button></div></div>`,
    focus: '#copyBox' });
  setTimeout(() => { const t = $('#copyBox'); if (t) t.select(); }, 300);
}

/* ============================== Events ============================== */

function sheetFor(el) { const w = el.closest('[data-sheet]'); return w ? sheets.find(s => s.id === w.dataset.sheet) : null; }

// long lists draw a page at a time; the next page comes in as you scroll near the end
let moreQueued = false;
document.addEventListener('scroll', () => {
  if (moreQueued) return;
  moreQueued = true;
  requestAnimationFrame(() => {
    moreQueued = false;
    for (const b of $$('[data-auto]')) if (b.isConnected && b.getBoundingClientRect().top < innerHeight + 400) { b.removeAttribute('data-auto'); b.click(); }
  });
}, { capture: true, passive: true });
// an illustration that can't load (offline and never seen) falls back to the muscle map
document.addEventListener('error', ev => {
  const img = ev.target;
  if (!(img instanceof HTMLImageElement) || !img.dataset.art) return;
  const exId = img.dataset.art, box = img.closest('.thumb, .exd-art, .exc-hero');
  artFailed.add(exId);
  if (!box) return;
  if (box.classList.contains('exc-hero')) { box.className = 'exc-hero maps'; box.removeAttribute('data-mv'); box.innerHTML = heroMaps(getEx(exId)); }
  else if (box.classList.contains('thumb')) box.outerHTML = mapThumb(exId, [...box.classList].filter(c => !['thumb', 'art', 'moving'].includes(c)).join(' '));
  else box.remove();
}, true);
// keep the pictures for your current split on the device, so they show at the gym without signal
function warmArt() {
  const sp = state.splits.find(s => s.id === state.activeSplit);
  if (!sp || !navigator.onLine) return;
  const ids = new Set(sp.days.filter(d => !isRest(d)).flatMap(d => (tplById(d) || { ex: [] }).ex.map(x => x.exId)));
  for (const id of ids) for (const u of artOf(id) || []) { const im = new Image(); im.decoding = 'async'; im.src = u; }
}
document.addEventListener('click', ev => {
  if (ui.dragged && ev.timeStamp - ui.dragged < 450) { ui.dragged = 0; return; }
  // a screen on its way out (a closing sheet, the workout sliding away) takes no taps
  if (ev.target.closest && ev.target.closest('[inert]')) return;
  if (!ev.target.closest('.row-del')) closeSwipes();
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
  if (el.closest('[inert]')) return;
  const def = sheetFor(el);
  if (def) { if (def.onInput) def.onInput(el, def, ev); return; }
  if (el.closest('#workout')) { if (A()) woInput(el); return; }
  const f = el.dataset.f;
  if (f === 'libq') { ui.lib.q = el.value; ui.libLimit = PAGE; typed(() => { const l = $('#libList'); if (l) l.innerHTML = libListHTML(); }); }
  else if (f === 'libeq') { ui.lib.eq = el.value; ui.libLimit = PAGE; $('#libList').innerHTML = libListHTML(); }
  else if (f === 'rest' || f === 'bar' || f === 'step') { state.settings[f] = +el.value; save(); }
  else if (f === 'importFile') readBackupFile(el);
}
function readBackupFile(el) {
  const file = el.files && el.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => importText(String(r.result));
  r.readAsText(file);
  el.value = '';
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
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('a[role="button"][data-a]')) { ev.preventDefault(); ev.target.click(); }
});
// swipe a set row left to show Delete
let rowSwipe = null;
function closeSwipes(except) { for (const el of $$('#workout .set-row.swiped')) if (el !== except) { el.classList.remove('swiped'); el.style.transform = ''; } }
document.addEventListener('touchstart', ev => {
  if (ev.target.closest('.row-del')) { rowSwipe = null; return; } // tapping the revealed Delete: leave the row open so the tap lands
  const row = ev.target.closest('#workout .row-wrap > .set-row');
  closeSwipes(row);
  rowSwipe = row && ev.touches.length === 1 ? { row, x: ev.touches[0].clientX, y: ev.touches[0].clientY, active: false, off: 0, base: row.classList.contains('swiped') ? (RTL ? 92 : -92) : 0 } : null;
}, { passive: true });
document.addEventListener('touchmove', ev => {
  const r = rowSwipe;
  if (!r) return;
  const dx = ev.touches[0].clientX - r.x, dy = ev.touches[0].clientY - r.y;
  if (!r.active) {
    if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { rowSwipe = null; return; }
    if (Math.abs(dx) < 12) return;
    r.active = true;
  }
  // Delete sits at the end of the row: swipe left to reach it in English, right in Arabic
  r.off = RTL ? Math.min(120, Math.max(0, r.base + dx)) : Math.max(-120, Math.min(0, r.base + dx));
  r.row.style.transition = 'none';
  r.row.style.transform = `translateX(${r.off}px)`;
}, { passive: true });
document.addEventListener('touchend', () => {
  const r = rowSwipe;
  rowSwipe = null;
  if (!r || !r.active) return;
  r.row.style.transition = '';
  const open = RTL ? r.off > 46 : r.off < -46;
  r.row.style.transform = open ? `translateX(${RTL ? 92 : -92}px)` : '';
  r.row.classList.toggle('swiped', open);
});
// one-at-a-time layout: the card follows your finger sideways; let go past a quarter of the way (or flick) for the next exercise
let cardDrag = null;
document.addEventListener('pointerdown', ev => {
  cardDrag = null;
  if (ev.pointerType !== 'touch' || !ev.isPrimary || !A()) return;
  const m = ev.target.closest('.wo.focus .wo-main');
  if (!m || ev.target.closest('input,textarea,.eff-pick,.chart,.row-wrap,.sci-curve-box,.kp')) return;
  const card = m.querySelector(':scope > .exc');
  if (card) cardDrag = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, card, on: false, dx: 0, v: 0, t: ev.timeStamp };
}, { passive: true });
document.addEventListener('pointermove', ev => {
  const d = cardDrag;
  if (!d || ev.pointerId !== d.id) return;
  const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
  if (!d.on) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.2 || !d.card.isConnected) { cardDrag = null; return; }
    d.on = true;
    d.x += Math.sign(dx) * 10; // starts from where it is, no jump
    closeSwipes();
  }
  const w = A(), nx = ev.clientX - d.x;
  // the first and last exercise only give a little
  // the next exercise is the way you read: dragging left in English, right in Arabic
  const fwd = RTL ? -nx : nx;
  const off = w && ((fwd < 0 && w.cur >= w.ex.length - 1) || (fwd > 0 && w.cur <= 0)) ? nx * .22 : nx;
  if (ev.timeStamp > d.t) { d.v = (off - d.dx) / (ev.timeStamp - d.t); d.t = ev.timeStamp; }
  d.dx = off;
  d.card.style.transform = `translateX(${off.toFixed(1)}px)`;
  d.card.style.opacity = String(1 - Math.min(.4, Math.abs(off) / innerWidth * .5));
}, { passive: true });
function cardRelease(ev) {
  const d = cardDrag;
  if (!d || ev.pointerId !== d.id) return;
  cardDrag = null;
  if (!d.on) return;
  ui.dragged = ev.timeStamp;
  const w = A(), W = d.card.offsetWidth || innerWidth, i = w ? w.cur + ((RTL ? -d.dx : d.dx) < 0 ? 1 : -1) : -1;
  const far = Math.abs(d.dx) > W * .25 || (Math.abs(d.v) > .4 && Math.sign(d.v) === Math.sign(d.dx));
  if (ev.type === 'pointerup' && w && d.card.isConnected && i >= 0 && i < w.ex.length && far) { woGo(i, true); return; }
  // not far enough: it settles back
  const from = d.card.style.transform || 'none', op = d.card.style.opacity || '1';
  d.card.style.transform = ''; d.card.style.opacity = '';
  if (d.card.animate && d.card.isConnected) d.card.animate([{ transform: from, opacity: op }, { transform: 'none', opacity: 1 }], { duration: 360, easing: EASE });
}
document.addEventListener('pointerup', cardRelease, { passive: true });
document.addEventListener('pointercancel', cardRelease, { passive: true });
// pull a sheet down to close it: from its top bar, or from anywhere when its content is scrolled to the top
let sheetDrag = null;
const sheetHost = document.getElementById('sheets');
sheetHost.addEventListener('touchstart', ev => {
  sheetDrag = null;
  if (ev.touches.length !== 1 || matchMedia('(min-width: 760px)').matches) return;
  const panel = ev.target.closest('.sheet'), def = sheets[sheets.length - 1];
  if (!panel || !def || def.el !== panel.parentElement || ev.target.closest('input,textarea,select,.chart,.sci-curve-box,.prof-pick')) return;
  sheetDrag = { def, panel, back: $('.sheet-backdrop', def.el), body: ev.target.closest('.sheet-body'), x: ev.touches[0].clientX, y: ev.touches[0].clientY, on: false, dy: 0, v: 0, t: ev.timeStamp };
}, { passive: true });
sheetHost.addEventListener('touchmove', ev => {
  const d = sheetDrag;
  if (!d) return;
  const dx = ev.touches[0].clientX - d.x, dy = ev.touches[0].clientY - d.y;
  if (!d.on) {
    // decided on the first movement: a pull downwards with nothing above to scroll back to
    if (dy <= 0 || Math.abs(dx) > dy || (d.body && d.body.scrollTop > 0)) { sheetDrag = null; return; }
    d.on = true;
    d.panel.style.transition = 'none';
    d.back.style.transition = 'none';
  }
  ev.preventDefault();
  const y = Math.max(0, dy);
  if (ev.timeStamp > d.t) { d.v = (y - d.dy) / (ev.timeStamp - d.t); d.t = ev.timeStamp; }
  d.dy = y;
  d.panel.style.transform = `translateY(${y}px)`;
  d.back.style.opacity = String(Math.max(0, 1 - y / (d.panel.offsetHeight || 600)));
}, { passive: false });
function sheetRelease() {
  const d = sheetDrag;
  sheetDrag = null;
  if (!d || !d.on) return;
  d.panel.style.transition = ''; d.back.style.transition = ''; d.back.style.opacity = '';
  if (d.dy > Math.min(140, d.panel.offsetHeight * .3) || d.v > .5) closeSheet(d.def);
  d.panel.style.transform = '';
}
sheetHost.addEventListener('touchend', sheetRelease, { passive: true });
sheetHost.addEventListener('touchcancel', sheetRelease, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persist();
  else { wake(true); tickRest(); fitSoon(100); }
});
window.addEventListener('pagehide', persist);
// another tab saved: take its data, unless this one has changes not written yet (those are written out instead of dropped)
window.addEventListener('storage', ev => {
  if (ev.key !== KEY || !ev.newValue) return;
  if (saveTimer) { persist(); return; }
  let next;
  try { next = migrate(JSON.parse(ev.newValue)); } catch (e) { return; }
  state = next;
  closeAllSheets(); rebuildCustom(); renderWorkout(); renderRest(); render();
});
let resizeT;
let padMode = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    drawCharts(document);
    placePill(true);
    const m = useKeypad();
    if (padMode !== null && m !== padMode && A() && !ui.woHidden) { ui.kp = null; renderWorkout(); }
    padMode = m;
    fitScreen();
  }, 150);
});
// iPhone Home Screen app: iOS can lay the page out shorter than the screen (after the keyboard has been up, and on
// some phones by the height of the status bar), which showed as a dark strip under the workout and the tab bar.
// Taking the page out of layout for a moment makes iOS measure it again; while it's still short, the parts on the
// bottom edge reach down to the real edge. What it finds is shown at the bottom of Settings.
let fitTried = 0, fitT, fitProbe = null;
const fitInfo = { app: false, screen: '', page: '', box: '', gap: 0 };
const homeScreenApp = () => navigator.standalone === true || matchMedia('(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)').matches;
// the box that fixed things (the workout, the tab bar) are placed in, measured directly
function pageBox() {
  if (!fitProbe || !fitProbe.isConnected) { fitProbe = document.createElement('div'); fitProbe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none;z-index:-1'; document.body.append(fitProbe); }
  return { w: fitProbe.offsetWidth, h: fitProbe.offsetHeight };
}
function screenGap() {
  const box = pageBox(), long = Math.max(screen.width, screen.height), short = Math.min(screen.width, screen.height), land = box.w > box.h;
  Object.assign(fitInfo, { app: homeScreenApp(), screen: `${land ? long : short}×${land ? short : long}`, page: `${innerWidth}×${innerHeight}`, box: `${box.w}×${box.h}` });
  if (!fitInfo.app) return 0;
  const el = document.activeElement;
  if (el && el.matches('input:not([readonly]), textarea:not([readonly]), [contenteditable]')) return 0; // the keyboard may be up
  if (Math.abs(box.w - (land ? long : short)) > 1) return 0; // not the whole width, e.g. an iPad window beside another app
  const gap = (land ? short : long) - Math.min(box.h, innerHeight);
  return gap > 0 && gap < 160 ? gap : 0;
}
function fitScreen() {
  let gap = screenGap();
  if (gap && fitTried !== innerHeight) {
    fitTried = innerHeight;
    const keep = [document.scrollingElement, ...$$('.wo-main, .wo-nav, .sheet-body')].filter(Boolean).map(el => [el, el.scrollTop, el.scrollLeft]);
    const b = document.body;
    b.style.display = 'none'; void b.offsetHeight; b.style.display = ''; void b.offsetHeight;
    for (const [el, top, left] of keep) { el.scrollTop = top; el.scrollLeft = left; }
    gap = screenGap();
  }
  if (!gap) fitTried = 0;
  fitInfo.gap = gap;
  document.documentElement.classList.toggle('vfix', gap > 0);
  document.documentElement.style.setProperty('--vgap', gap + 'px');
  const out = $('#fitInfo'); if (out) out.textContent = fitLine();
}
// while a workout is open the page behind it is held still: it can't scroll or bounce (dragging the rest timer used
// to move it). In the Home Screen app the workout is also placed as part of the page rather than pinned to the
// screen, because iOS can keep a hidden toolbar's worth of the bottom where it won't draw pinned things (that was the
// strip under the workout); it sits where the page is scrolled to, so nothing moves
function woLock(on) {
  const root = document.documentElement;
  if (on === root.classList.contains('wo-lock')) return;
  if (on) root.style.setProperty('--wo-top', (window.scrollY || 0) + 'px');
  root.classList.toggle('wo-lock', on);
}
// the version and what the screen check found, for the bottom of Settings
// (with every height iOS reports, so a screenshot of it tells what a phone is doing)
function fitLine() {
  const probe = css => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;' + css; document.body.append(d); const cs = getComputedStyle(d), r = [d.offsetHeight, parseFloat(cs.paddingTop) || 0, parseFloat(cs.paddingBottom) || 0]; d.remove(); return r; };
  const lvh = probe('height:100lvh')[0], svh = probe('height:100svh')[0], dvh = probe('height:100dvh')[0], [, st, sb] = probe('height:0;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)');
  const vv = window.visualViewport ? Math.round(visualViewport.height) : '–';
  const how = navigator.standalone === true ? 'standalone' : matchMedia('(display-mode: standalone)').matches ? 'display-mode' : 'browser';
  return `v${APP_VERSION} · screen ${fitInfo.screen} · page ${fitInfo.page} · fixed ${fitInfo.box} · lvh ${lvh} · svh ${svh} · dvh ${dvh} · vv ${vv} · safe ${st}/${sb} · ${fitInfo.app ? 'Home Screen app' : 'browser'} (${how})${fitInfo.gap ? ` · filled ${fitInfo.gap}` : ' · nothing filled'}`;
}
const fitSoon = (ms = 600) => { clearTimeout(fitT); fitT = setTimeout(fitScreen, ms); };
document.addEventListener('focusout', () => fitSoon());
if (window.visualViewport) visualViewport.addEventListener('resize', () => fitSoon(250));
window.addEventListener('pageshow', () => fitSoon(100));

setInterval(() => {
  const w = state.active;
  if (w && w.mode !== 'edit' && !document.hidden) for (const el of $$('[data-clock]')) setText(el, fmtClock((Date.now() - w.start) / 1000));
}, 1000);
setInterval(() => { if (state.rest && !document.hidden) tickRest(); }, 250);

/* ============================== Start ============================== */

// the display font loads without holding up the first screen (system font until it arrives)
for (const l of $$('link[data-font]')) l.media = 'all';
document.body.insertAdjacentHTML('afterbegin', FIG_SPRITE);
load();
rebuildCustom();
// once: older saves get their record flags worked out the current way
if (!state.flags.prs2) { try { recalcPRs(); state.flags.prs2 = 1; save(); } catch (e) { /* flags stay as saved */ } }
loadPhotos();
applyTheme();
render();
if (state.active) { ui.woHidden = false; renderWorkout(true); wake(true); }
renderRest();
mvWatch();
requestAnimationFrame(() => { ui.booted = true; placePill(true); });
// the welcome stays until it's used or skipped (switching language on it starts the page again with it open)
if (state.flags.newUser && !state.flags.welcomed) setTimeout(welcomeSheet, 350);
setTimeout(keepCopy, 2000);
fitSoon(500);
document.documentElement.classList.toggle('ios-app', homeScreenApp());
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
// https, or a local copy on this computer (how the tests run it)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && !inFrame) {
  // a new version installs in the background; offer to switch to it (the saved copy keeps opening instantly until then)
  // one that arrives while the app is starting, before you've touched anything, switches over at once (your data is
  // saved first and the open workout comes back), so fixes reach you the next time you open the app
  const hadWorker = !!navigator.serviceWorker.controller;
  let touched = false;
  for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, () => { touched = true; }, { once: true, passive: true });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadWorker) return;
    if (!touched && performance.now() < 6000) { persist(); location.reload(); return; }
    toast(T('Lifting Sanity has been updated.'), { label: T('Reload'), fn: () => { persist(); location.reload(); } });
  });
  navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => setTimeout(warmArt, 3000)).catch(() => {});
}

/* ----- self-check: run LiftingSanity.selfCheck() in the browser console. It runs the app's own calculation functions on
   made-up sets (your saved workouts are never touched) and lists what passed. ----- */
function selfCheck() {
  const out = [], check = (name, fn) => { try { const r = fn(); out.push({ check: name, passed: r === true, detail: r === true ? '' : String(r) }); } catch (e) { out.push({ check: name, passed: false, detail: String(e) }); } };
  const side = (side, w, r, done, rir) => ({ id: uid(), t: 'N', side, pair: 'p1', w, r, done, ...(rir != null ? { rir } : {}) });
  const ex = (sets, uni = true) => ({ exId: 'barbell-curl', uni, sets: clone(sets) });
  const vals = sets => JSON.stringify(sets.map(o => [o.side || '', o.w ?? null, o.r ?? null, o.rir ?? null, !!o.done]));
  check('Left/right off never mixes the two sides into a set nobody did', () => {
    const x = ex([side('L', 25, 8, false), side('R', 20, 12, false)]); setUni(x, false);
    return x.sets.length === 1 && x.sets[0].w === 25 && x.sets[0].r === 8 || vals(x.sets);
  });
  check('Switching left/right back on restores both sides exactly', () => {
    const x = ex([side('L', 25, 8, false, 2), side('R', 20, 12, false, 1)]), before = vals(x.sets);
    for (let n = 0; n < 20; n++) { setUni(x, false); setUni(x, true); }
    return vals(x.sets) === before || vals(x.sets);
  });
  check('Done left/right sets stay exactly as done when switching off', () => {
    const x = ex([side('L', 25, 8, true), side('R', 20, 12, true)]), before = vals(x.sets); setUni(x, false);
    return vals(x.sets) === before || vals(x.sets);
  });
  check('A set done with both sides at once is never doubled when switching on', () => {
    const x = ex([{ id: uid(), t: 'N', w: 20, r: 10, done: true }], false), vol = sum(x.sets, o => setVolume(x, o)); setUni(x, true);
    return x.sets.length === 1 && sum(x.sets, o => setVolume(x, o)) === vol || vals(x.sets);
  });
  check('A left + right pair counts as one set; half-done pairs are not done', () => {
    const t1 = setTally(ex([side('L', 20, 8, true), side('R', 20, 8, true)])), t2 = setTally(ex([side('L', 20, 8, true), side('R', 20, 8, false)]));
    return t1.done === 1 && t1.total === 1 && t2.done === 0 && t2.total === 1 || JSON.stringify([t1, t2]);
  });
  check('Warm-ups never count as working sets, records or 1RM', () => {
    const x = ex([{ id: uid(), t: 'W', w: 200, r: 1, done: true }, { id: uid(), t: 'N', w: 50, r: 5, done: true }], false), rec = emptyRec();
    for (const o of x.sets) addToRec(rec, x, o, 'wr');
    const w = { ex: [x] };
    return setTally(x).total === 1 && workingSets(w) === 1 && rec.w === 50 && Math.abs(rec.e1rm - e1rm(50, 5)) < 1e-9 || JSON.stringify(rec);
  });
  check('Plan and summary volume count a pair as one set per muscle', () => {
    const m = muscleSets([{ ex: [ex([side('L', 20, 8, true), side('R', 20, 8, true)])] }]);
    return m.length && m[0][0] === 'biceps' && m[0][1] === 1 || JSON.stringify(m);
  });
  check('Est. 1RM only from 1–12 reps with a real weight', () => {
    const ok = e1rm(100, 1) === 100 && Math.abs(e1rm(100, 10) - 133.333) < 0.01 && e1rm(100, 12) > 0 && e1rm(100, 13) === 0 && e1rm(0, 5) === 0 && e1rm(-5, 5) === 0 && e1rm(100, 0) === 0 && e1rm(100, NaN) === 0;
    return ok || [e1rm(100, 13), e1rm(-5, 5), e1rm(100, 0)].join(',');
  });
  check('kg ↔ lb only changes what is shown, never what is stored', () => {
    const was = state.settings.unit;
    try {
      state.settings.unit = 'lb'; const lb = dispW(100), typed = toKg(225), back = dispW(typed);
      state.settings.unit = 'kg'; const kg = dispW(100);
      let x = 100; for (let n = 0; n < 100; n++) { state.settings.unit = n % 2 ? 'kg' : 'lb'; dispW(x); }
      return lb === '220.5' && kg === '100' && back === '225' && x === 100 || [lb, kg, back].join(' / ');
    } finally { state.settings.unit = was; }
  });
  check('A damaged backup is refused before anything changes', () => {
    const bad = backupProblem({ workouts: [{ start: 1, ex: 'oops' }] }), good = backupProblem(clone({ ...state, active: null }));
    return !!bad && !good || `bad: "${bad}", current data: "${good}"`;
  });
  console.table(out);
  return out;
}
window.LiftingSanity = { get state() { return state; }, save: () => save(true), selfCheck };
})();
