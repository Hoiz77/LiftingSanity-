/* Lift ranks for Lifting Sanity: Wood to Olympian, from how much you lift for your bodyweight (and age, if you give it).
   - The standards come from OpenPowerlifting (public domain, openpowerlifting.org): every raw lifter's best squat,
     bench press and deadlift in the meet records of ten federations (USAPL, USPA, CPU, BP, RPS, IPF, SPF, APU, NZPF,
     WRPF), 659,000 lifter-lifts. For each sex and lift, curves of the form a × bodyweight^b were fitted to the 15th,
     40th, 65th, 85th, 95th and 99th percentiles in bodyweight bands: those are Gold, Platinum, Diamond, Champion,
     Titan and Olympian. Competitors are a strong crowd, so the bottom 15% of them is already a solid gym lifter.
     Below that, Silver starts at 80% of Gold and Bronze at 60% (rules of thumb); anything less is Wood.
   - Age: from the same records, the median lifter at each age compared with ages 23 to 35 (masters and teens lift
     less). Used only if you give your age; the standards are lowered to match.
   - Other exercises are ranked against the nearest of the three lifts by a typical ratio (an incline bench is about
     82% of a flat one, a dumbbell press about 40% of the bench in each hand). Those are rules of thumb, marked
     "estimated". Machines and cables are marked "rough": the same number reads differently on every machine.
   No app state is used here: basis(ex, pattern) needs { name, eq, k, uni }, and ladder() a profile { sex, bw, age }. */
window.LS_RANKS = (() => {
  const TIERS = [
    { id: 'wood', name: 'Wood', c: ['#C7A982', '#7E5B3A', '#3F2A18'], ink: '#F3E3CC', glow: '#9C7650' },
    { id: 'bronze', name: 'Bronze', c: ['#FFCFA3', '#E07B34', '#7A3510'], ink: '#FFF3E8', glow: '#F08A40' },
    { id: 'silver', name: 'Silver', c: ['#FFFFFF', '#B9C3CE', '#5F6B78'], ink: '#FFFFFF', glow: '#C9D6E3' },
    { id: 'gold', name: 'Gold', c: ['#FFF6B8', '#F5BE16', '#946100'], ink: '#FFFBEA', glow: '#FFC93C' },
    { id: 'platinum', name: 'Platinum', c: ['#E9FFFB', '#5ED6C6', '#156E68'], ink: '#F2FFFD', glow: '#5EE0CF' },
    { id: 'diamond', name: 'Diamond', c: ['#E8F8FF', '#5AB8FF', '#1A44B8'], ink: '#F3FBFF', glow: '#61B8FF' },
    { id: 'champion', name: 'Champion', c: ['#FFD3E0', '#FF3D6E', '#7D0A33'], ink: '#FFF0F4', glow: '#FF4F7E' },
    { id: 'titan', name: 'Titan', c: ['#EBDDFF', '#9A5BFF', '#3A138C'], ink: '#F7F0FF', glow: '#A970FF' },
    { id: 'olympian', name: 'Olympian', c: ['#FFFFFF', '#FFE27A', '#E08A00'], ink: '#FFFFFF', glow: '#FFD84D' }
  ];
  // [a, b] for a × bodyweight^b, at the 15th, 40th, 65th, 85th, 95th and 99th percentiles (kg)
  const FITS = {
    MS: [[6.12, 0.719], [8.34, 0.691], [9.82, 0.682], [10.76, 0.688], [11.05, 0.705], [12.46, 0.703]],
    MB: [[3.82, 0.734], [4.12, 0.757], [4.95, 0.746], [5.78, 0.738], [7.0, 0.72], [9.37, 0.681]],
    MD: [[15.68, 0.547], [23.31, 0.494], [26.8, 0.487], [30.26, 0.482], [34.7, 0.471], [39.8, 0.462]],
    FS: [[11.99, 0.459], [13.41, 0.483], [13.7, 0.514], [14.94, 0.528], [16.73, 0.533], [17.39, 0.556]],
    FB: [[6.43, 0.466], [9.15, 0.431], [11.15, 0.422], [12.18, 0.439], [14.57, 0.435], [15.94, 0.455]],
    FD: [[20.62, 0.385], [24.93, 0.382], [32.75, 0.348], [37.72, 0.343], [40.83, 0.351], [40.47, 0.381]]
  };
  // strength at each age as a share of ages 23–35, at the middle of each age band (15, 17, 19, 21.5, 29, 37.5 … 75)
  const AGES = [15, 17, 19, 21.5, 29, 37.5, 42.5, 47.5, 52.5, 57.5, 62.5, 67.5, 75];
  const AGE_F = {
    MS: [0.724, 0.854, 0.944, 0.985, 1, 0.96, 0.927, 0.893, 0.843, 0.813, 0.729, 0.663, 0.58],
    MB: [0.675, 0.8, 0.892, 0.947, 1, 1, 0.986, 0.967, 0.937, 0.888, 0.844, 0.769, 0.686],
    MD: [0.719, 0.847, 0.932, 0.982, 1, 0.966, 0.932, 0.907, 0.86, 0.834, 0.788, 0.738, 0.657],
    FS: [0.757, 0.852, 0.946, 0.988, 1, 0.951, 0.919, 0.869, 0.815, 0.773, 0.681, 0.627, 0.537],
    FB: [0.752, 0.847, 0.928, 0.969, 1, 0.99, 0.983, 0.955, 0.901, 0.861, 0.791, 0.737, 0.643],
    FD: [0.773, 0.85, 0.932, 0.983, 1, 0.966, 0.95, 0.917, 0.873, 0.847, 0.798, 0.755, 0.68]
  };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  function ageFactor(key, age) {
    if (!(age > 0)) return 1;
    const f = AGE_F[key], a = clamp(age, AGES[0], AGES[AGES.length - 1]);
    if (a >= 23 && a <= 35) return 1;
    let i = 0;
    while (i < AGES.length - 2 && a > AGES[i + 1]) i++;
    const t = (a - AGES[i]) / (AGES[i + 1] - AGES[i]);
    return f[i] + (f[i + 1] - f[i]) * t;
  }

  // ---------- which standard an exercise is measured against ----------
  // ref: S squat, B bench, D deadlift, pull (pull-ups: bodyweight + added) or dip (dips: the same); r: a share of
  // that lift; conf: data (the lift itself), est (a free-weight lift, by a typical ratio) or rough (machines, cables);
  // per: hand (each dumbbell), side (one arm or leg at a time) or total (bodyweight plus added)
  const norm = n => String(n || '').toLowerCase().replace(/\s*v\.\s*\d+|\((back|side) pov\)|в°|°/g, '').replace(/\s+/g, ' ').trim();
  const B = (ref, r, conf, per = '') => ({ ref, r, conf, per });
  const NOT = why => ({ why });
  function basis(ex, pattern) {
    const n = norm(ex.name), eq = ex.eq, k = ex.k;
    const one = !!ex.uni || /single|one[- ]arm|one[- ]leg|one hand|\bs\/a\b|\bsa\b|archer/.test(n);
    const machine = eq === 'machine' || eq === 'sled' || eq === 'smith', cable = eq === 'cable', db = eq === 'dumbbell', bar = eq === 'barbell' || eq === 'ezbar';
    if (/\b(hip )?(adduct|abduct)|calf|calves|crunch|gripper|hand grip|wrist|neck|shrug|\babs?\b|oblique|twist/.test(n) || ['calf', 'crunch', 'legRaise', 'grip', 'shrug', 'hipAdd', 'hipAbd'].includes(pattern)) return NOT('machine');
    if (!['wr', 'bw', 'aw'].includes(k) || ['band', 'medball', 'other', 'suspension'].includes(eq)) return NOT('kind');
    if (/jump|plyo|speed|ball|bosu|swing|pass through|depth|clap|\bhold\b|turkish|get up|jerk|\bclean\b(?!-grip)|throw|\bwalk\b|farmer|with (bicep|tricep)|to (overhead|press)|finger|bowling|stork|lunge .*(curl|extension|press)|(curl|extension|press) .*(lunge|squat)|curl squat|negative|scapula|kipping|isometric|partial/.test(n)) return NOT('kind');
    // bodyweight plus whatever you add (or minus the help an assisted machine gives)
    if (k === 'bw' || k === 'aw') {
      if (/\bdips?\b/.test(n)) return /bench dip|korean/.test(n) ? NOT('kind') : B('dip', 1, 'est', 'total');
      if (/pull-?up|chin-?up|\bchin\b/.test(n) && !one && !/l-pull|rocky|side-to-side|gironda/.test(n)) return B('pull', 1, 'est', 'total');
      return NOT('kind');
    }
    if (/assist/.test(n)) return NOT('kind');
    // squats, lunges and leg presses
    if (/leg press/.test(n)) return one ? B('S', 0.85, 'rough', 'side') : B('S', 1.7, 'rough');
    if (pattern === 'legExt') return one ? B('S', 0.3, 'rough', 'side') : B('S', 0.6, 'rough');
    if (/hack squat/.test(n)) return bar ? B('S', 0.7, 'est') : B('S', 1.15, 'rough');
    if (/pendulum|belt squat/.test(n)) return B('S', 1.1, 'rough');
    if (/split squat|lunge|step-?up|bulgarian|single leg squat|one leg squat|pistol|lateral lunge|cossack/.test(n)) {
      if (db) return B('S', 0.26, 'est', 'hand');
      if (bar) return B('S', 0.55, 'est');
      if (eq === 'smith') return B('S', 0.6, 'rough');
      return NOT('kind');
    }
    if (/goblet|sumo squat/.test(n) && (db || eq === 'kettlebell')) return B('S', 0.42, 'est');
    if (/squat/.test(n)) {
      if (/front|clean-grip|frankenstein/.test(n)) return bar ? B('S', 0.82, 'est') : eq === 'smith' ? B('S', 0.85, 'rough') : NOT('kind');
      if (/zercher/.test(n)) return bar ? B('S', 0.8, 'est') : NOT('kind');
      if (/overhead/.test(n)) return bar ? B('S', 0.6, 'est') : NOT('kind');
      if (/safety bar/.test(n)) return B('S', 0.92, 'est');
      if (bar) return /on knees|jefferson|chest/.test(n) ? NOT('kind') : /pause|box|bench squat/.test(n) ? B('S', 0.92, 'est') : /narrow|wide/.test(n) ? B('S', 0.95, 'est') : B('S', 1, 'data');
      if (eq === 'smith') return /chair|sumo/.test(n) ? NOT('kind') : B('S', 1, 'rough');
      if (db) return B('S', 0.28, 'est', 'hand');
      if (eq === 'landmine') return B('S', 0.5, 'rough');
      return NOT('kind');
    }
    // deadlifts, hinges, hip thrusts and leg curls
    if (/trap bar/.test(n)) return B('D', 1.08, 'est');
    if (/romanian|stiff[- ]leg|straight[- ]leg|\brdl\b/.test(n)) {
      if (bar) return B('D', 0.72, 'est');
      if (eq === 'smith') return B('D', 0.75, 'rough');
      if (db) return one ? B('D', 0.2, 'rough', 'hand') : B('D', 0.32, 'est', 'hand');
      return NOT('kind');
    }
    if (/good ?morning/.test(n)) return bar ? B('D', /seated/.test(n) ? 0.35 : 0.42, 'est') : eq === 'smith' ? B('D', 0.45, 'rough') : NOT('kind');
    if (/deadlift/.test(n)) {
      if (bar) return one || /side/.test(n) ? NOT('kind') : /deficit|paused|snatch-grip/.test(n) ? B('D', 0.88, 'est') : B('D', 1, 'data');
      if (db) return one ? NOT('kind') : B('D', 0.42, 'est', 'hand');
      if (eq === 'kettlebell') return B('D', 0.5, 'rough');
      if (machine) return B('D', 1, 'rough');
      return NOT('kind');
    }
    if (pattern === 'bridge' || /hip thrust|glute bridge/.test(n)) {
      if (one) return NOT('kind');
      if (bar) return B('D', /thrust/.test(n) ? 1.05 : 0.95, 'est');
      if (machine) return B('D', 1, 'rough');
      return NOT('kind');
    }
    if (pattern === 'legCurl') return machine ? (one ? B('D', 0.2, 'rough', 'side') : B('D', 0.4, 'rough')) : NOT('kind');
    if (pattern === 'hinge') return NOT('kind');
    // presses
    if (/push.?up|svend|landmine chest|floor fly/.test(n)) return NOT('kind');
    if (/seated dip machine/.test(n)) return B('B', 0.95, 'rough');
    if (/jm press/.test(n)) return bar ? B('B', 0.7, 'est') : NOT('kind');
    if (pattern === 'pressHorizontal' || /bench press|chest press|floor press/.test(n)) {
      if (bar) {
        if (/guillotine/.test(n)) return B('B', 0.75, 'est');
        if (/incline/.test(n)) return B('B', /reverse/.test(n) ? 0.78 : 0.82, 'est');
        if (/decline/.test(n)) return B('B', 1.03, 'est');
        if (/close[- ]grip/.test(n)) return B('B', 0.9, 'est');
        if (/floor press/.test(n)) return B('B', 0.88, 'est');
        if (/spoto|larsen/.test(n)) return B('B', 0.92, 'est');
        if (/board|pin press/.test(n)) return B('B', 1.05, 'est');
        if (/reverse/.test(n)) return B('B', 0.95, 'est');
        if (/paused/.test(n)) return B('B', 0.96, 'est');
        return B('B', 1, 'data');
      }
      if (db) return B('B', /incline/.test(n) ? 0.36 : /decline/.test(n) ? 0.42 : /floor/.test(n) ? 0.38 : /squeeze|hammer|palm|reverse/.test(n) ? 0.35 : 0.4, 'est', 'hand');
      if (eq === 'smith') return B('B', /incline/.test(n) ? 0.85 : /decline/.test(n) ? 1.05 : /close/.test(n) ? 0.9 : 1, 'rough');
      if (machine || cable) return one ? B('B', 0.5, 'rough', 'side') : B('B', /incline/.test(n) ? 0.85 : /decline/.test(n) ? 1.05 : /inner/.test(n) ? 0.8 : cable ? 0.9 : 1, 'rough');
      return NOT('kind');
    }
    if (pattern === 'fly') {
      if (db) return B('B', 0.17, 'rough', 'hand');
      if (cable) return B('B', 0.17, 'rough', 'side');
      if (machine) return one ? B('B', 0.42, 'rough', 'side') : B('B', 0.85, 'rough');
      return NOT('kind');
    }
    if (pattern === 'pressVertical') {
      if (bar) return /push press/.test(n) ? B('B', 0.78, 'est') : /behind|bradford/.test(n) ? B('B', 0.58, 'est') : /z press/.test(n) ? B('B', 0.55, 'est') : /anti gravity/.test(n) ? NOT('kind') : B('B', /seated/.test(n) ? 0.66 : 0.63, 'est');
      if (db) return /cuban|w-press|scott|alternate side/.test(n) ? NOT('kind') : B('B', /arnold/.test(n) ? 0.24 : 0.27, 'est', 'hand');
      if (eq === 'smith') return B('B', 0.66, 'rough');
      if (machine) return one ? B('B', 0.35, 'rough', 'side') : B('B', 0.7, 'rough');
      if (eq === 'kettlebell') return B('B', 0.24, 'rough', 'hand');
      if (eq === 'landmine') return B('B', 0.4, 'rough', 'side');
      return NOT('kind');
    }
    if (pattern === 'lateral') {
      if (/y-raise|lu raise|to front|full can|landmine/.test(n)) return NOT('kind');
      if (db) return B('B', 0.15, 'rough', 'hand');
      if (cable) return B('B', 0.09, 'rough', 'side');
      if (machine) return one ? B('B', 0.22, 'rough', 'side') : B('B', 0.45, 'rough');
      return NOT('kind');
    }
    // pulls
    if (pattern === 'row') {
      if (/upright|inverted|renegade|gorilla/.test(n)) return NOT('kind');
      if (/t-?bar/.test(n)) return B('B', 0.9, 'rough');
      if (bar) return B('B', /pendlay/.test(n) ? 0.75 : 0.8, 'est');
      if (db) return one ? B('B', 0.45, 'est', 'hand') : B('B', 0.36, 'est', 'hand');
      if (machine || cable) return one ? B('B', 0.43, 'rough', 'side') : B('B', eq === 'smith' ? 0.8 : 0.85, 'rough');
      if (eq === 'kettlebell') return B('B', 0.4, 'rough', 'hand');
      return NOT('kind');
    }
    if (pattern === 'pullVertical') {
      if (/assist/.test(n)) return NOT('kind');
      if (machine || cable) return one ? B('B', 0.43, 'rough', 'side') : B('B', 0.85, 'rough');
      return NOT('kind');
    }
    if (pattern === 'pullover') {
      if (/press|hip|around|ball/.test(n)) return NOT('kind');
      if (machine) return B('B', 0.75, 'rough');
      if (db && !one) return B('B', 0.35, 'rough');
      if (bar) return B('B', 0.4, 'rough');
      return NOT('kind');
    }
    // arms
    if (/^curl/.test(pattern)) {
      const rev = /reverse|pronat/.test(n) ? 0.8 : 1;
      if (/drag|21|zottman|spider|bayesian|waiter|cross body/.test(n) && !db) return NOT('kind');
      if (bar) return B('B', (/preacher|scott/.test(n) ? 0.38 : 0.45) * rev, 'est');
      if (db) return B('B', (/hammer/.test(n) ? 0.22 : /concentration|incline|preacher|spider/.test(n) ? 0.17 : 0.2) * rev, 'est', 'hand');
      if (cable) return one ? B('B', 0.2 * rev, 'rough', 'side') : B('B', 0.45 * rev, 'rough');
      if (machine) return one ? B('B', 0.22 * rev, 'rough', 'side') : B('B', 0.45 * rev, 'rough');
      return NOT('kind');
    }
    if (pattern === 'triLying') return bar ? B('B', 0.38, 'est') : db ? B('B', 0.17, 'est', 'hand') : cable ? B('B', 0.38, 'rough') : NOT('kind');
    if (pattern === 'triOverhead') return db ? (one ? B('B', 0.15, 'est', 'hand') : B('B', 0.3, 'est')) : bar ? B('B', 0.33, 'est') : cable ? (one ? B('B', 0.2, 'rough', 'side') : B('B', 0.4, 'rough')) : machine ? B('B', 0.45, 'rough') : NOT('kind');
    if (pattern === 'triPushdown') return one ? B('B', 0.22, 'rough', 'side') : B('B', 0.45, 'rough');
    return NOT('kind');
  }

  // ---------- the ladder: the least you need for each tier, Wood (0) to Olympian ----------
  // adj: for machines, how they read next to free weights (−1 light, 0, 1 heavy)
  function ladder(b, p, adj = 0) {
    const sex = p.sex === 'F' ? 'F' : 'M', lift = b.ref === 'pull' || b.ref === 'dip' ? 'B' : b.ref, key = sex + lift;
    const bw = clamp(+p.bw || 0, sex === 'F' ? 40 : 45, sex === 'F' ? 130 : 160);
    const cur = FITS[key].map(([a, e]) => a * Math.pow(bw, e));
    for (let i = 1; i < cur.length; i++) cur[i] = Math.max(cur[i], cur[i - 1] * 1.03);
    const body = b.ref === 'pull' ? (sex === 'F' ? 1.35 : 1.05) : b.ref === 'dip' ? (sex === 'F' ? 1.5 : 1.25) : 1;
    const r = b.r * body * ageFactor(key, +p.age) * (adj > 0 ? 1.25 : adj < 0 ? 0.8 : 1);
    return [0, 0.6 * cur[0], 0.8 * cur[0], ...cur].map(v => v * r);
  }
  // where a lift sits: its tier, how far to the next one (0 to 1), and a score (tier + that)
  function place(load, lad) {
    let t = 0;
    while (t < 8 && load >= lad[t + 1]) t++;
    const frac = t === 8 ? 1 : clamp((load - lad[t]) / (lad[t + 1] - lad[t]), 0, 1);
    return { tier: t, frac, score: t + (t === 8 ? 0 : frac), next: t < 8 ? lad[t + 1] : null };
  }

  // ---------- the emblems: a crest in the tier's metal and its symbol; wings and a laurel at the top ----------
  function emblem(i, uid, label) {
    const t = TIERS[i], [hi, mid, lo] = t.c, u = 're' + uid;
    const shield = 'M60 8 L100 22 L100 62 C100 92 83 113 60 128 C37 113 20 92 20 62 L20 22 Z';
    const inner = 'M60 17 L92 28 L92 62 C92 87 78 105 60 118 C42 105 28 87 28 62 L28 28 Z';
    const chev = y => `<path d="M38 ${y} L60 ${y + 11} L82 ${y} L82 ${y + 9} L60 ${y + 20} L38 ${y + 9} Z"/>`;
    const star = (cx, cy, r, k = 0.45) => { let d = ''; for (let n = 0; n < 10; n++) { const a = -Math.PI / 2 + n * Math.PI / 5, rr = n % 2 ? r * k : r; d += `${n ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)} `; } return `<path d="${d}Z"/>`; };
    const sym = [
      `<circle cx="60" cy="64" r="21" fill="none" stroke-width="3.2"/><circle cx="60" cy="64" r="13" fill="none" stroke-width="2.6"/><circle cx="60" cy="64" r="5.5"/><path d="M60 43 L57 52 L62 56" fill="none" stroke-width="2.6"/>`,
      chev(54),
      chev(46) + chev(64),
      chev(64) + chev(80) + star(60, 48, 13),
      `<circle cx="60" cy="64" r="22" fill="none" stroke-width="3.5"/>${star(60, 64, 16)}`,
      `<path d="M42 54 L50 44 L70 44 L78 54 L60 86 Z"/><path d="M42 54 L78 54 M50 44 L56 54 L60 86 M70 44 L64 54 L60 86 M56 54 L60 44 L64 54" fill="none" stroke="${lo}" stroke-opacity=".55" stroke-width="1.6"/>`,
      `<path d="M38 80 L35 50 L48 62 L60 44 L72 62 L85 50 L82 80 Z"/><rect x="38" y="83" width="44" height="7" rx="2"/><circle cx="35" cy="47" r="3.5"/><circle cx="60" cy="41" r="3.5"/><circle cx="85" cy="47" r="3.5"/>`,
      `<path d="M40 86 C38 66 46 52 60 52 C74 52 82 66 80 86 L68 86 L68 74 L52 74 L52 86 Z"/><path d="M44 58 C34 54 30 44 32 34 C37 42 43 46 50 50 Z"/><path d="M76 58 C86 54 90 44 88 34 C83 42 77 46 70 50 Z"/><rect x="58" y="56" width="4" height="16" fill="${lo}" opacity=".5"/>`,
      `<path d="M60 36 C70 46 72 54 66 62 C68 54 64 50 60 46 C58 52 52 54 54 62 C48 56 50 46 60 36 Z"/><path d="M50 64 L70 64 L65 74 L55 74 Z"/><path d="M55 76 L65 76 L62 98 L58 98 Z"/>`
    ][i];
    const leaf = (x, y, a, s) => `<ellipse cx="${x}" cy="${y}" rx="${2.6 * s}" ry="${6 * s}" transform="rotate(${a} ${x} ${y})"/>`;
    const laurel = n => {
      let l = '<path d="M38 128 C12 112 0 84 6 50 M82 128 C108 112 120 84 114 50" fill="none" stroke-width="2.6"/>';
      for (let k = 0; k < n; k++) {
        const deg = 112 + k * 17, a = deg * Math.PI / 180, x = 60 + 60 * Math.cos(a), y = 72 + 60 * Math.sin(a), r = deg - 90 + 35;
        l += leaf(x.toFixed(1), y.toFixed(1), r, 1.6) + leaf((120 - x).toFixed(1), y.toFixed(1), -r, 1.6);
      }
      return l;
    };
    const wings = i === 6 || i === 7 ? `<g fill="url(#${u}m)" stroke="${lo}" stroke-width="1.2" ${i === 7 ? 'transform="translate(60 44) scale(1.22) translate(-60 -44)"' : ''}>
        <path d="M22 40 C8 38 2 30 0 20 C8 26 14 27 22 26 Z"/><path d="M21 54 C6 54 -1 46 -3 37 C6 42 13 43 21 41 Z"/><path d="M22 68 C9 70 2 64 -1 56 C7 59 14 59 22 56 Z"/>
        <path d="M98 40 C112 38 118 30 120 20 C112 26 106 27 98 26 Z"/><path d="M99 54 C114 54 121 46 123 37 C114 42 107 43 99 41 Z"/><path d="M98 68 C111 70 118 64 121 56 C113 59 106 59 98 56 Z"/></g>` : '';
    const rays = i === 8 ? `<g>${Array.from({ length: 18 }, (_, k) => { const a = k * Math.PI / 9, w = k % 2 ? 0.05 : 0.09, r = k % 2 ? 70 : 86; return `<path d="M60 68 L${(60 + r * Math.cos(a - w)).toFixed(1)} ${(68 + r * Math.sin(a - w)).toFixed(1)} L${(60 + r * Math.cos(a + w)).toFixed(1)} ${(68 + r * Math.sin(a + w)).toFixed(1)} Z" fill="url(#${u}r)"/>`; }).join('')}</g>` : '';
    const sparks = i >= 5 ? [[24, 18, 4], [99, 16, 3], [104, 96, 3.4], [16, 92, 2.6]].map(([x, y, r]) => star(x, y, r, 0.28)).join('') : '';
    const wreath = i === 8 ? `<g fill="url(#${u}m)" stroke="${lo}" stroke-width="1">${laurel(7)}</g>` : '';
    return `<svg class="rank-emb" viewBox="-6 -6 132 146" role="img" aria-label="${label || t.name}" overflow="visible">
      <defs>
        <linearGradient id="${u}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".45" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></linearGradient>
        <linearGradient id="${u}e" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".5" stop-color="${lo}"/><stop offset="1" stop-color="${mid}"/></linearGradient>
        <radialGradient id="${u}i" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></radialGradient>
        <radialGradient id="${u}g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${t.glow}" stop-opacity=".75"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>
        <radialGradient id="${u}r" cx="60" cy="68" r="86" gradientUnits="userSpaceOnUse"><stop offset=".35" stop-color="#FFF6CC" stop-opacity="1"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>
        <linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".55"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
        <filter id="${u}d" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#000" flood-opacity=".35"/></filter>
      </defs>
      ${i >= 3 ? `<circle cx="60" cy="68" r="${58 + i * 2}" fill="url(#${u}g)"/>` : ''}${rays}${wings}${wreath}
      <path d="${shield}" fill="url(#${u}e)" stroke="${lo}" stroke-width="1.5"/>
      <path d="${inner}" fill="url(#${u}i)"/>
      ${i === 0 ? `<g fill="none" stroke="${lo}" stroke-opacity=".45" stroke-width="1.3"><path d="M34 34 C44 40 40 60 36 80 C34 92 40 102 46 108"/><path d="M84 34 C76 44 82 62 84 78 C86 92 80 102 74 108"/><path d="M48 22 C52 30 50 38 52 46"/></g>` : ''}
      <path d="${inner}" fill="none" stroke="${hi}" stroke-opacity=".55" stroke-width="1.4"/>
      <g fill="${t.ink}" stroke="${t.ink}" stroke-linejoin="round" filter="url(#${u}d)">${sym}</g>
      <path d="M28 28 L60 17 L92 28 L92 50 C78 58 44 58 28 50 Z" fill="url(#${u}s)" opacity=".55"/>
      ${sparks ? `<g fill="#FFFFFF">${sparks}</g>` : ''}
    </svg>`;
  }
  return { TIERS, FITS, basis, ladder, place, ageFactor, emblem };
})();
