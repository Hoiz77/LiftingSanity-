/* Exercise science for Lifting Sanity: what each exercise does mechanically, how well it suits muscle growth, and why.
   - Every exercise is sorted into a movement pattern from its name, main muscle and equipment.
   - For single-joint patterns a small 2-D model (joint, moving segment, load, line of force) gives the torque the muscle
     has to produce across the range: the resistance profile. Machines with cams are shown as "set by the machine".
   - Ratings are rules of thumb from mechanics, marked as such; where a direct study exists it is cited.
   No app state is used here: analyze(ex) only needs { name, m, eq, sec, uni }. */
window.LS_SCIENCE = (() => {
  // ---------- studies (checked against the papers or their indexed abstracts) ----------
  const REFS = {
    maeo2023: { cite: 'Maeo et al. 2023, Eur J Sport Sci', title: 'Triceps brachii hypertrophy is substantially greater after elbow extension training performed in the overhead versus neutral arm position', url: 'https://pubmed.ncbi.nlm.nih.gov/35819335/', finding: '21 adults, 12 weeks, one arm each way: overhead elbow extensions grew the triceps about 1.4 times as much as the same exercise with the arm at the side.' },
    maeo2021: { cite: 'Maeo et al. 2021, Med Sci Sports Exerc', title: 'Greater hamstrings muscle hypertrophy but similar damage protection after training at long versus short muscle lengths', url: 'https://pubmed.ncbi.nlm.nih.gov/33009197/', finding: 'Seated leg curls (hamstrings stretched at the hip) grew the hamstrings more than lying leg curls: about +14% vs +9% volume in 12 weeks.' },
    pedrosa2022: { cite: 'Pedrosa et al. 2022, Eur J Sport Sci', title: 'Partial range of motion training elicits favorable improvements in muscular adaptations when carried out at long muscle lengths', url: 'https://doi.org/10.1080/17461391.2021.1927199', finding: 'Leg extensions done only in the bent-knee half (quads long) grew the quads at least as well as full reps, and better than the straight-knee half.' },
    pedrosa2023: { cite: 'Pedrosa et al. 2023, Sports', title: 'Training in the initial range of motion promotes greater muscle adaptations than at final in the arm curl', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9960616/', finding: 'Preacher curls in the stretched (arm straighter) half gave more growth near the elbow end of the biceps and more strength than the top half. Untrained young women.' },
    kassiano2023: { cite: 'Kassiano et al. 2023, J Strength Cond Res', title: 'Greater gastrocnemius muscle hypertrophy after partial range of motion training performed at long muscle lengths', url: 'https://pubmed.ncbi.nlm.nih.gov/37015016/', finding: 'Calf raises in the bottom (stretched) half: medial gastrocnemius +15.2%, versus +6.7% for full range and +3.4% for the top half, in 8 weeks.' },
    kinoshita2023: { cite: 'Kinoshita et al. 2023, Front Physiol', title: 'Triceps surae muscle hypertrophy is greater after standing versus seated calf-raise training', url: 'https://doi.org/10.3389/fphys.2023.1272106', finding: 'Standing calf raises grew the gastrocnemius; seated ones (knee bent, gastrocnemius slack) did not. The soleus grew similarly with both.' },
    plotkin2023: { cite: 'Plotkin et al. 2023, Front Physiol', title: 'Hip thrust and back squat training elicit similar gluteus muscle hypertrophy and transfer similarly to the deadlift', url: 'https://doi.org/10.3389/fphys.2023.1279170', finding: 'Nine weeks of hip thrusts or squats grew the glutes about the same; squats also grew the quads and adductors.' },
    larsen2025: { cite: 'Larsen et al. 2025, Front Physiol', title: 'Dumbbell versus cable lateral raises for lateral deltoid hypertrophy: an experimental study', url: 'https://doi.org/10.3389/fphys.2025.1611468', finding: 'Trained lifters, one arm each way for 8 weeks: cable and dumbbell lateral raises grew the side delts about the same (+3 to 5%).' },
    wolf2023: { cite: 'Wolf et al. 2023, Int J Strength Cond', title: 'Partial vs full range of motion resistance training: a systematic review and meta-analysis', url: 'https://doi.org/10.47206/ijsc.v3i1.182', finding: 'Full range is slightly better overall (trivial difference). Partials done at long muscle lengths may be as good or better for growth, though the estimate is uncertain.' },
    schoenfeld2017: { cite: 'Schoenfeld, Ogborn & Krieger 2017, J Sports Sci', title: 'Dose-response relationship between weekly resistance training volume and increases in muscle mass', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Dose-response+relationship+between+weekly+resistance+training+volume+and+increases+in+muscle+mass', finding: 'More weekly sets gave more growth (about +0.37% per extra weekly set); 10 or more sets a week per muscle tended to do best.' },
    pelland2026: { cite: 'Pelland et al. 2026, Sports Med', title: 'The resistance training dose response: meta-regressions exploring the effects of weekly volume and frequency on muscle hypertrophy and strength gain', url: 'https://sportrxiv.org/index.php/server/preprint/view/537', finding: '67 studies: growth keeps rising with weekly sets but with diminishing returns; counting a helper muscle’s sets as half predicted results best. Frequency mattered for strength, hardly for size once sets are equal.' },
    schoenfeld2016f: { cite: 'Schoenfeld, Ogborn & Krieger 2016, Sports Med', title: 'Effects of resistance training frequency on measures of muscle hypertrophy', url: 'https://pubmed.ncbi.nlm.nih.gov/27102172/', finding: 'Training a muscle at least twice a week grew it more than once a week (effect size 0.49 vs 0.30), in studies not matched for volume.' },
    refalo2023: { cite: 'Refalo et al. 2023, Sports Med', title: 'Influence of resistance training proximity-to-failure on skeletal muscle hypertrophy', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Influence+of+Resistance+Training+Proximity-to-Failure+on+Skeletal+Muscle+Hypertrophy', finding: 'Sets to failure were at most trivially better than sets stopped short of it; failure is not required to grow.' },
    robinson2024: { cite: 'Robinson et al. 2024, Sports Med', title: 'Exploring the dose-response relationship between estimated resistance training proximity to failure, strength gain, and muscle hypertrophy', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Exploring+the+Dose-Response+Relationship+Between+Estimated+Resistance+Training+Proximity+to+Failure', finding: 'Growth rose as sets ended closer to failure (fewer reps in reserve); strength barely depended on it.' },
    schoenfeld2016r: { cite: 'Schoenfeld et al. 2016, J Strength Cond Res', title: 'Longer interset rest periods enhance muscle strength and hypertrophy in resistance-trained men', url: 'https://doi.org/10.1519/JSC.0000000000001272', finding: 'Trained men resting 3 minutes between sets gained more muscle and strength than with 1 minute, over 8 weeks.' }
  };

  // ---------- small 2-D mechanics model ----------
  const rad = d => d * Math.PI / 180;
  const at = (o, a, l) => [o[0] + l * Math.cos(rad(a)), o[1] + l * Math.sin(rad(a))];
  const forceDir = (sc, P) => {
    if (sc.force.type === 'gravity') return [0, -1];
    const d = [sc.force.q[0] - P[0], sc.force.q[1] - P[1]], m = Math.hypot(d[0], d[1]) || 1;
    return [d[0] / m, d[1] / m];
  };
  // the load's torque about the joint, counted only while it resists the movement (a cable or weight that helps you counts as 0)
  function torqueAt(sc, a) {
    const P = at(sc.joint, a, sc.load), F = forceDir(sc, P), r = [P[0] - sc.joint[0], P[1] - sc.joint[1]];
    return Math.max(0, -Math.sign(sc.a1 - sc.a0) * (r[0] * F[1] - r[1] * F[0]));
  }
  // relative difficulty through the range, from the start (muscle long) to the end (muscle short)
  function curveOf(sc) {
    if (sc.force.type === 'cam') return null;
    const n = 24, out = [];
    for (let i = 0; i <= n; i++) out.push(torqueAt(sc, sc.a0 + (sc.a1 - sc.a0) * i / n));
    const max = Math.max(...out) || 1;
    return out.map(v => v / max);
  }
  function shapeOf(c) {
    if (!c) return 'machine';
    const third = k => c.slice(Math.round(k * c.length / 3), Math.round((k + 1) * c.length / 3));
    const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
    const s = avg(third(0)), m = avg(third(1)), e = avg(third(2));
    if (Math.max(s, m, e) - Math.min(s, m, e) < 0.2) return 'flat';
    if (m > s * 1.15 && m > e * 1.15) return 'bell';
    return s > e ? 'descending' : 'ascending';
  }
  const SHAPES = {
    descending: ['Descending', 'Hardest at the start, where the muscle is longest, and easier as you finish.'],
    ascending: ['Ascending', 'Easy at the start, where the muscle is longest, and hardest at the end, where it is shortest.'],
    bell: ['Bell-shaped', 'Hardest in the middle of the movement, lighter at both ends.'],
    flat: ['Fairly even', 'About the same effort all the way through.'],
    machine: ['Set by the machine', 'The cam or lever decides where it is hardest. Most selectorised machines aim for a fairly even feel; notice where yours gets heavy.']
  };

  // ---------- scenes: side or front views, y up, upper arm/thigh ~1 unit ----------
  // upper body only: arm exercises read bigger without the legs
  const STAND_SIDE = { head: [0.05, 1.42, 0.2], body: [[0, 1.2, 0, 0.95], [0, 0.95, -0.05, -0.6]] };
  const scenes = {
    pushdown: v => ({ view: 'side', joint: [0, 0], seg: 0.85, load: 0.85, a0: 25, a1: -85, label: 'elbow', fixed: [[0, 0.95, 0, 0]], ...STAND_SIDE,
      force: { type: 'cable', q: [0.5, 2.05] }, attach: v.attach || 'handle', frame: [[0.5, 2.05, 0.5, 2.5]] }),
    overheadCable: v => ({ view: 'side', joint: [0, 0], seg: 0.85, load: 0.85, a0: 222, a1: 80, label: 'elbow', fixed: [[-0.2, -0.95, 0, 0]],
      head: [0.12, -0.72, 0.19], body: [[-0.2, -0.95, -0.45, -2.4]], force: { type: 'cable', q: [-0.85, -2.7] }, attach: v.attach || 'rope', frame: [[-0.85, -2.7, -0.85, -2.95]] }),
    overheadFree: v => ({ view: 'side', joint: [0, 0], seg: 0.85, load: 0.85, a0: 230, a1: 82, label: 'elbow', fixed: [[-0.05, -0.95, 0, 0]],
      head: [0.2, -0.75, 0.19], body: [[-0.05, -0.95, -0.1, -2.4], [-0.1, -2.4, -0.05, -3.2]], force: { type: 'gravity' }, attach: v.attach || 'dumbbell' }),
    lyingExt: v => ({ view: 'side', joint: [0, 0], seg: 0.85, load: 0.85, a0: 196, a1: 90, label: 'elbow', fixed: [[0, -0.95, 0, 0]],
      head: [-0.3, -0.98, 0.19], body: [[0, -0.95, 1.6, -0.95], [1.6, -0.95, 2.3, -1.6]], bench: [-0.5, -1.25, 2.2, 0.18], force: { type: 'gravity' }, attach: v.attach || 'bar' }),
    kickback: v => ({ view: 'side', joint: [0, 0], seg: 0.85, load: 0.85, a0: -90, a1: 0, label: 'elbow', fixed: [[-0.95, 0.05, 0, 0]],
      head: [-1.25, 0.25, 0.19], body: [[-0.95, 0.05, 0.6, -0.15], [0.6, -0.15, 0.7, -1.2]],
      force: v.cable ? { type: 'cable', q: [1.3, -1.5] } : { type: 'gravity' }, attach: v.cable ? 'handle' : 'dumbbell' }),
    curl: v => ({ view: 'side', joint: [0, 0], seg: 0.85, load: 0.85, a0: -88, a1: 52, label: 'elbow', fixed: [[0, 0.95, 0, 0]], ...STAND_SIDE,
      force: v.cable ? { type: 'cable', q: [1.2, -2.6] } : { type: 'gravity' }, attach: v.attach || (v.cable ? 'bar' : 'dumbbell'), frame: v.cable ? [[1.2, -2.6, 1.2, -2.9]] : null }),
    inclineCurl: v => ({ view: 'side', joint: [0, 0], seg: 0.85, load: 0.85, a0: -90, a1: 45, label: 'elbow', fixed: [[0, 0.95, 0, 0]],
      head: [-0.75, 1.75, 0.19], body: [[0, 0.95, -0.55, 1.55], [0, 0.95, 0.75, -0.2], [0.75, -0.2, 1.45, -0.3]], bench: null, incline: [[0.35, 0.35, -0.8, 1.85]],
      force: { type: 'gravity' }, attach: 'dumbbell' }),
    preacher: v => ({ view: 'side', joint: [0, 0], seg: 0.85, load: 0.85, a0: -42, a1: 95, label: 'elbow', fixed: [[-0.68, 0.68, 0, 0]],
      head: [-0.6, 1.5, 0.19], body: [[-0.68, 0.68, -0.8, 1.1], [-0.8, 1.1, -0.95, -0.35], [-0.95, -0.35, -0.1, -0.4], [-0.1, -0.4, -0.05, -1.3]], pad: [[-0.85, 0.62, 0.12, -0.35]],
      force: v.machine ? { type: 'cam' } : { type: 'gravity' }, attach: v.machine ? 'pad' : v.attach || 'dumbbell' }),
    lateral: v => ({ view: 'front', joint: [0, 0], seg: 0.95, load: 0.95, a0: -95, a1: 5, label: 'shoulder', fixed: [[-0.75, 0, 0, 0]],
      head: [-0.375, 0.45, 0.2], body: [[-0.375, 0.25, -0.375, -1.2], [-0.75, 0, -0.85, -0.95]],
      force: v.cable ? { type: 'cable', q: [-1.05, -1.75] } : v.machine ? { type: 'cam' } : { type: 'gravity' }, attach: v.machine ? 'pad' : v.cable ? 'cuff' : 'dumbbell' }),
    flyFree: v => ({ view: 'end', joint: [0, 0], seg: 0.95, load: 0.95, a0: -12, a1: 90, label: 'shoulder', fixed: [[-0.7, 0, 0, 0]],
      head: [-0.35, -0.02, 0.2], body: [[-0.7, 0, -1.65, 0.0]], bench: [-1.05, -0.32, 0.7, 0.2], force: { type: 'gravity' }, attach: 'dumbbell', mirror: true }),
    flyCable: v => ({ view: 'top', joint: [0, 0], seg: 0.95, load: 0.95, a0: -22, a1: 88, label: 'shoulder', fixed: [[-0.7, 0, 0, 0]],
      head: [-0.35, 0.05, 0.2], body: [], force: { type: 'cable', q: [1.7, -0.3] }, attach: 'handle', frame: [[1.7, -0.3, 1.7, 0.3]] }),
    flyMachine: v => ({ view: 'top', joint: [0, 0], seg: 0.95, load: 0.95, a0: -15, a1: 88, label: 'shoulder', fixed: [[-0.7, 0, 0, 0]],
      head: [-0.35, 0.05, 0.2], body: [], force: { type: 'cam' }, attach: 'pad' }),
    pulloverFree: v => ({ view: 'side', joint: [0, 0], seg: 1.0, load: 1.0, a0: 192, a1: 92, label: 'shoulder', fixed: [],
      head: [-0.3, -0.05, 0.19], body: [[0, 0, 1.5, 0], [1.5, 0, 2.2, -0.65]], bench: [-0.45, -0.3, 2.0, 0.18], force: { type: 'gravity' }, attach: 'dumbbell' }),
    pulloverMachine: v => ({ view: 'side', joint: [0, 0], seg: 0.95, load: 0.75, a0: 112, a1: -78, label: 'shoulder', fixed: [],
      head: [0.1, 0.4, 0.19], body: [[0, 0, -0.1, -1.35], [-0.1, -1.35, 0.75, -1.4], [0.75, -1.4, 0.8, -2.2]], force: { type: 'cam' }, attach: 'pad' }),
    legExt: v => ({ view: 'side', joint: [0, 0], seg: 1.0, load: 0.9, a0: -100, a1: -2, label: 'knee', fixed: [[-1.05, 0, 0, 0]],
      head: [-1.1, 1.75, 0.19], body: [[-1.05, 0, -1.1, 1.5]], seat: [[-1.25, -0.12, 0.05, -0.12], [-1.3, -0.1, -1.4, 1.5]], force: { type: 'cam' }, attach: 'roller' }),
    legCurlSeated: v => ({ view: 'side', joint: [0, 0], seg: 1.0, load: 0.9, a0: -5, a1: -118, label: 'knee', fixed: [[-1.05, 0, 0, 0]],
      head: [-1.1, 1.75, 0.19], body: [[-1.05, 0, -1.1, 1.5]], seat: [[-1.25, -0.12, 0.05, -0.12], [-1.3, -0.1, -1.4, 1.5]], force: { type: 'cam' }, attach: 'roller' }),
    legCurlLying: v => ({ view: 'side', joint: [0, 0], seg: 1.0, load: 0.9, a0: 2, a1: 125, label: 'knee', fixed: [[-1.05, 0, 0, 0]],
      head: [-2.75, 0.12, 0.19], body: [[-1.05, 0, -2.55, 0.05]], bench: [-2.7, -0.3, 2.9, 0.18], force: { type: 'cam' }, attach: 'roller' }),
    hipAdd: v => ({ view: 'top', joint: [0, 0], seg: 1.0, load: 0.75, a0: 38, a1: 2, label: 'hip', fixed: [[-0.5, 0, 0, 0]],
      head: null, body: [[-0.5, 0, -1.0, 0.0]], force: { type: 'cam' }, attach: 'pad', note: 'seen from above' }),
    hipAbd: v => ({ view: 'top', joint: [0, 0], seg: 1.0, load: 0.75, a0: 2, a1: 40, label: 'hip', fixed: [[-0.5, 0, 0, 0]],
      head: null, body: [[-0.5, 0, -1.0, 0.0]], force: { type: 'cam' }, attach: 'pad', note: 'seen from above' }),
    crunch: v => ({ view: 'side', joint: [0, 0], seg: 1.2, load: 1.0, a0: 102, a1: 52, label: 'spine', fixed: [],
      head: null, body: [[0, 0, 1.0, 0.0], [1.0, 0, 1.05, -0.95]], seat: [[-0.35, -0.12, 1.1, -0.12]], force: v.machine ? { type: 'cam' } : { type: 'cable', q: [-0.2, 2.3] }, attach: v.machine ? 'pad' : 'rope', headOnSeg: true })
  };

  // ---------- patterns ----------
  // r: L = load at long muscle lengths 0-3, S = stability 0-2, P = tension through the range 0-2, F = focus / low fatigue 0-2, G = easy to add load 0-1
  const has = (n, re) => re.test(n);
  const P = [];
  const add = (id, test, build) => P.push({ id, test, build });
  const cableEq = ex => ex.eq === 'cable', machEq = ex => ex.eq === 'machine' || ex.eq === 'smith', freeEq = ex => ['dumbbell', 'barbell', 'ezbar', 'kettlebell', 'plate', 'trapbar', 'landmine', 'medball'].includes(ex.eq);

  // triceps
  add('triOverhead', (ex, n) => (ex.m === 'triceps' || /tricep/.test(n)) && has(n, /overhead|french press|behind (the )?(neck|head)|above head/) && !has(n, /press$|bench/), (ex, n) => ({
    title: 'Elbow extension with the arm overhead', joints: ['Elbow extension (shoulder held in flexion)'],
    movers: 'Triceps, all three heads. With the arm overhead the long head, which also crosses the shoulder, is stretched hard.',
    scene: cableEq(ex) ? scenes.overheadCable({ attach: /rope/.test(n) ? 'rope' : /cuff/.test(n) ? 'cuff' : 'handle' }) : scenes.overheadFree({ attach: /barbell|ez/.test(n) ? 'bar' : 'dumbbell' }),
    moment: cableEq(ex) ? 'With the pulley set low behind you (the cable comes up over your shoulder), it pulls your hands back and down, so its moment arm about the elbow is longest while the elbow is deeply bent and the triceps is stretched. With the pulley high, the deepest part of the rep is actually unloaded: the cable lines up with the forearm.' : 'Gravity pulls straight down, so the moment arm about the elbow is longest when your forearm is horizontal (about 90° of bend) and shrinks near full extension.',
    r: cableEq(ex) ? { L: 3, S: 2, P: 2, F: 2, G: 1 } : /barbell|ez/.test(n) ? { L: 3, S: 1, P: 1, F: 1, G: 1 } : { L: 3, S: 1, P: 1, F: 2, G: 1 },
    evidence: [['maeo2023', 'This is the arm position that grew the triceps about 1.4 times more than arm-at-side extensions.']],
    tips: [cableEq(ex) ? 'Set the pulley low and face away from it, so the cable loads the bottom of the rep.' : 'Let the elbow bend fully behind your head before each rep; that stretch is the point of the exercise.', 'Keep the upper arm still and pointing up; only the forearm moves.']
  }));
  add('triLying', (ex, n) => (ex.m === 'triceps' || /tricep/.test(n)) && has(n, /skull|lying.*(tricep|extension)|(tricep|extension).*lying|jm press|tate/), (ex, n) => ({
    title: 'Elbow extension lying, upper arm pointing up', joints: ['Elbow extension (shoulder flexed about 90°)'],
    movers: 'Triceps, all three heads; the long head is moderately stretched because the arm is raised.',
    scene: scenes.lyingExt({ attach: /dumbbell/.test(n) ? 'dumbbell' : 'bar' }),
    moment: 'With the upper arm vertical, the forearm is near horizontal at the bottom, so the weight’s moment arm about the elbow is longest exactly where the triceps is longest. It fades to almost nothing at lockout.',
    r: { L: 2, S: 1, P: 2, F: 1, G: 1 },
    evidence: [['maeo2023', 'Raising the arm lengthens the long head, the same idea that made overhead extensions grow more than arm-at-side ones.']],
    tips: ['Lower toward the forehead or just behind it; letting the upper arm drift back a little adds more stretch.', 'Stop a rep short of lockout to keep tension on the triceps.']
  }));
  add('triKickback', (ex, n) => (ex.m === 'triceps' || /tricep/.test(n)) && has(n, /kickback|kick back/), (ex, n) => ({
    title: 'Elbow extension with the upper arm back', joints: ['Elbow extension (shoulder extended)'],
    movers: 'Triceps, mostly the lateral and medial heads; the long head is shortened at the shoulder.',
    scene: scenes.kickback({ cable: cableEq(ex) }),
    moment: cableEq(ex) ? 'A low cable from in front keeps some tension when the elbow is bent, then the moment arm grows toward lockout.' : 'With a dumbbell the forearm hangs straight down at the start, so the moment arm (and the effort) is close to zero where the triceps is longest. It is hardest at lockout.',
    r: cableEq(ex) ? { L: 1, S: 2, P: 1, F: 2, G: 1 } : { L: 0, S: 1, P: 0, F: 2, G: 1 },
    evidence: [], tips: ['A cable from low in front fixes the dead start of the dumbbell version.']
  }));
  add('triPushdown', (ex, n) => (ex.m === 'triceps' || /tricep/.test(n)) && has(n, /push ?down|press ?down|pushdown/) && !has(n, /straight.?arm/), (ex, n) => {
    const one = has(n, /one.?arm|single|s\/a|\bsa\b/) || ex.uni, att = /cuff/.test(n) ? 'cuff' : /rope/.test(n) ? 'rope' : one ? 'handle' : 'bar';
    return {
      title: `Elbow extension with the arm at your side${one ? ', one arm' : ''}`, joints: ['Elbow extension (shoulder neutral)'],
      movers: 'Triceps: the lateral and medial heads do most of the work; the long head works too but is not stretched with the arm down.',
      scene: scenes.pushdown({ attach: att }),
      moment: `The cable runs up to the high pulley, so its moment arm about the elbow is longest around 90° of bend and drops near lockout. ${att === 'cuff' ? 'A cuff on the wrist moves the load to the end of the forearm and lets the hand relax, so grip doesn’t limit the set.' : ''}${one ? ' One arm at a time lets you stand slightly to the side and line the cable up with your forearm.' : ''}`,
      r: { L: 1, S: 2, P: 1, F: 2, G: 1 },
      evidence: [['maeo2023', 'The arm-at-side position grew the triceps less than overhead extensions; keep this, but pair it with an overhead or lying extension.']],
      tips: ['Lean forward a little and let the forearm come up past 90° each rep to load the triceps longer.', 'Pin the elbow to your side; if it drifts forward the lats and chest help out.']
    };
  });
  // biceps & elbow flexors
  const flexMovers = (n, ex) => /reverse|pronat/.test(n) ? 'Brachioradialis and brachialis lead with the palm down; the biceps helps less because it is also a supinator.'
    : /hammer|neutral|rope/.test(n) ? 'Brachialis and brachioradialis get a big share with the thumb up; the biceps still works.'
      : 'Biceps (both heads) with the brachialis and brachioradialis.';
  add('curlPreacher', (ex, n) => /curl|preacher/.test(n) && has(n, /preacher|scott|leco/), (ex, n) => ({
    title: 'Elbow flexion with the upper arm on a pad, in front of you', joints: ['Elbow flexion (shoulder flexed)'],
    movers: flexMovers(n, ex) + ' With the arm in front, the biceps long head is a little shorter at the shoulder.',
    scene: scenes.preacher({ machine: machEq(ex), attach: /barbell|ez/.test(n) ? 'bar' : 'dumbbell' }),
    moment: machEq(ex) ? 'The pad tilts your upper arm forward, and the machine’s cam sets the resistance. On most preacher machines it stays fairly even, so the straight-arm part is well loaded.' : 'Because the pad tilts the upper arm forward, the forearm is close to horizontal early in the rep: the moment arm is longest near the bottom, where the elbow flexors are longest, and almost zero at the top.',
    r: machEq(ex) ? { L: 3, S: 2, P: 2, F: 2, G: 1 } : { L: 3, S: 2, P: 2, F: 2, G: 1 },
    evidence: [['pedrosa2023', 'Training this exercise in its stretched half grew the lower biceps more than the top half.']],
    tips: ['Go all the way down with control each rep; the bottom is where this exercise earns its rating.', 'If you run out of full reps, finish with a few partials in the bottom half.']
  }));
  add('curlIncline', (ex, n) => /curl/.test(n) && has(n, /incline|bayesian|behind/) && !has(n, /prone|spider/), (ex, n) => ({
    title: 'Elbow flexion with the arm behind the body', joints: ['Elbow flexion (shoulder extended)'],
    movers: flexMovers(n, ex) + ' With the arm behind you the biceps long head is stretched at the shoulder.',
    scene: cableEq(ex) ? { ...scenes.curl({ cable: true, attach: 'handle' }), fixed: [[0.3, 0.9, 0, 0]], force: { type: 'cable', q: [1.6, -0.6] } } : scenes.inclineCurl({}),
    moment: cableEq(ex) ? 'A cable from behind you keeps tension near the bottom, where the biceps is at its longest.' : 'The arm hangs straight down, so like any dumbbell curl it is hardest with the forearm horizontal. The difference is muscle length: with the arm behind the body, the biceps is longer through the whole rep.',
    r: cableEq(ex) ? { L: 3, S: 1, P: 2, F: 2, G: 1 } : { L: 3, S: 1, P: 1, F: 2, G: 1 },
    evidence: [], tips: ['Let the shoulders sit back and the arms hang; don’t bring the elbows forward as you curl.']
  }));
  add('curlShort', (ex, n) => /curl/.test(n) && has(n, /spider|concentration|prone incline|drag/), (ex, n) => ({
    title: 'Elbow flexion with the arm forward or pinned', joints: ['Elbow flexion'],
    movers: flexMovers(n, ex), scene: null,
    moment: 'With the upper arm angled forward or vertical against the leg, the forearm reaches horizontal late in the rep: the load is heaviest near the top, where the biceps is shortest.',
    r: { L: 1, S: 2, P: 1, F: 2, G: 1 }, evidence: [], tips: ['Good for a strong squeeze; pair it with a curl that loads the stretch, such as preacher or incline.']
  }));
  add('curl', (ex, n) => /curl/.test(n) && !/leg|hamstring|wrist|nordic|lying leg|ham|crunch/.test(n) && ['biceps', 'forearms'].includes(ex.m), (ex, n) => {
    const cable = cableEq(ex);
    return {
      title: `Elbow flexion standing${/reverse|pronat/.test(n) ? ', palms down' : /hammer|neutral/.test(n) ? ', thumbs up' : ''}`, joints: ['Elbow flexion'],
      movers: flexMovers(n, ex),
      scene: scenes.curl({ cable, attach: cable ? (/rope/.test(n) ? 'rope' : ex.uni || /one|single/.test(n) ? 'handle' : 'bar') : /barbell|ez/.test(n) ? 'bar' : 'dumbbell' }),
      moment: cable ? 'Standing close to a low pulley, the cable runs almost straight up along the forearm at the bottom, so the first part of the rep is light; standing a step or two back angles the cable and loads the bottom more. It is hardest a little past 90°.' : 'Gravity pulls straight down, so the moment arm about the elbow is longest with the forearm horizontal (about 90°) and near zero with the arm straight, where the flexors are longest.',
      r: cable ? { L: 1, S: 1, P: 2, F: 2, G: 1 } : { L: 1, S: 1, P: 1, F: 2, G: 1 },
      evidence: [], tips: cable ? ['Stand a step or two back from the pulley so the cable angles toward it; that puts tension on the bottom of the rep.'] : ['Lower all the way to a straight arm; swing less, and stop when the elbows drift forward.']
    };
  });
  // shoulders
  add('lateral', (ex, n) => !has(n, /rear|bent.?over|reverse|prone/) && (has(n, /lateral raise|side lateral|lat raise|side raise|lateral standing|y.?raise/) || (ex.m === 'sidedelts' && /raise/.test(n))), (ex, n) => {
    const cable = cableEq(ex), mach = machEq(ex);
    return {
      title: `Shoulder abduction${ex.uni || /one|single|standing/.test(n) && mach ? ', one arm' : ''}`, joints: ['Shoulder abduction (arm out to the side)'],
      movers: 'Side delts, with the front delts and supraspinatus helping; upper traps join above shoulder height.',
      scene: scenes.lateral({ cable, machine: mach }),
      moment: cable ? 'The cable comes across from the low pulley on the other side, so its moment arm about the shoulder is already long with the arm down, where the side delt is longest. Effort stays fairly even.' : mach ? 'The lever pad sits on the upper arm and the machine sets the resistance. Most lateral raise machines keep it fairly even, so the bottom of the rep is loaded better than with dumbbells.' : 'With a dumbbell the weight hangs straight under the shoulder at the bottom: almost no moment arm, so almost no load where the side delt is longest. It is hardest at shoulder height.',
      r: cable || mach ? { L: 2, S: mach ? 2 : 1, P: 2, F: 2, G: 1 } : { L: 0, S: 1, P: 1, F: 2, G: 1 },
      evidence: [['larsen2025', 'Mechanics favour cables in the stretch, yet a direct trial found cable and dumbbell lateral raises grew the side delts about the same. Any version you push hard works.']],
      tips: ['Lead with the elbow and stop around shoulder height.', 'Lean slightly away from the cable or machine to start the rep with the arm a little across the body.']
    };
  });
  add('frontRaise', (ex, n) => has(n, /front raise/), (ex, n) => ({
    title: 'Shoulder flexion (front raise)', joints: ['Shoulder flexion'], movers: 'Front delts, with the upper chest and serratus.',
    scene: null, moment: 'Free weights hang straight down at the start, so it is hardest at shoulder height and nearly unloaded at the bottom.',
    r: cableEq(ex) ? { L: 1, S: 1, P: 1, F: 2, G: 1 } : { L: 0, S: 1, P: 1, F: 1, G: 1 }, evidence: [],
    tips: ['Front delts already get a lot of work from presses; most people need few or no front raises.']
  }));
  add('rearDelt', (ex, n) => has(n, /rear delt|reverse fly|rear fly|reverse pec|face pull|rear lateral|bent.?over (lateral|raise)/), (ex, n) => {
    const even = cableEq(ex) || machEq(ex) || ex.eq === 'band';
    return {
      title: 'Shoulder horizontal abduction', joints: ['Shoulder horizontal abduction', /face pull/.test(n) ? 'External rotation' : null].filter(Boolean),
      movers: 'Rear delts, with the mid traps, rhomboids and rotator cuff.', scene: null,
      moment: even ? 'A cable or machine keeps tension from the start, with the arms in front where the rear delts are longest.' : 'Bent over with dumbbells, the weights hang straight down at the start, so the load is lightest where the rear delts are longest and heaviest with the arms out to the sides.',
      r: even ? { L: 2, S: 2, P: 2, F: 2, G: 1 } : { L: 0, S: 1, P: 1, F: 2, G: 1 }, evidence: [],
      tips: ['Think "arms out wide", not "squeeze the shoulder blades"; that keeps it on the rear delts.']
    };
  });
  add('pressVertical', (ex, n) => (ex.m === 'frontdelts' || ex.m === 'sidedelts') && has(n, /press|push press|jerk/), (ex, n) => ({
    title: 'Overhead press', joints: ['Shoulder flexion and abduction', 'Elbow extension', 'Scapular upward rotation'],
    movers: 'Front delts and triceps lead; side delts, upper chest and upper traps help.', scene: null,
    moment: machEq(ex) ? 'A machine guides the path and sets the resistance; the bottom, where the delts are longest, is usually well loaded.' : 'Free weights are hardest near the bottom, where the elbows are bent and the bar is furthest in front of the shoulder line, and lighter near lockout.',
    r: machEq(ex) ? { L: 2, S: 2, P: 1, F: 1, G: 1 } : ex.eq === 'dumbbell' ? { L: 2, S: 1, P: 1, F: 1, G: 1 } : { L: 2, S: 0, P: 1, F: 0, G: 1 }, evidence: [],
    tips: ['Lower until the hands are about at chin height to keep the delts loaded in the stretch.']
  }));
  // chest
  add('fly', (ex, n) => (ex.m === 'chest' || /pec/.test(n)) && has(n, /fly|flye|pec deck|butterfly|crossover|cross over/), (ex, n) => {
    const cable = cableEq(ex), mach = machEq(ex);
    return {
      title: 'Shoulder horizontal adduction (fly)', joints: ['Shoulder horizontal adduction'],
      movers: 'Chest (both the upper and lower parts), with the front delts.',
      scene: mach ? scenes.flyMachine({}) : cable ? scenes.flyCable({}) : scenes.flyFree({}),
      moment: mach ? 'The machine arms rotate around a point near your shoulder and the cam sets the load, so tension stays fairly even, including the open, stretched position.' : cable ? 'The cables pull out to the sides, so the moment arm is decent in the stretch and stays useful as the hands come together.' : 'Lying with dumbbells, the arms are horizontal at the bottom: the longest moment arm, exactly where the chest is most stretched. It drops to almost zero with the arms vertical.',
      r: mach ? { L: 2, S: 2, P: 2, F: 2, G: 1 } : cable ? { L: 2, S: 1, P: 2, F: 2, G: 1 } : { L: 3, S: 1, P: 1, F: 2, G: 1 },
      evidence: [], tips: ['Open up until you feel a good stretch across the chest, without letting the shoulders roll forward.', 'Keep a slight, fixed bend in the elbows.']
    };
  });
  add('pressHorizontal', (ex, n) => ex.m === 'chest' && has(n, /press|push.?up|dip|bench/), (ex, n) => {
    const kind = machEq(ex) ? 'machine' : /push.?up/.test(n) ? 'push' : /dip/.test(n) ? 'dip' : ex.eq === 'dumbbell' ? 'db' : 'bb';
    return {
      title: kind === 'dip' ? 'Dip' : 'Horizontal press', joints: ['Shoulder horizontal adduction and flexion', 'Elbow extension'],
      movers: 'Chest and front delts, with the triceps.', scene: null,
      moment: kind === 'machine' ? 'The machine sets the path and resistance; the bottom, where the chest is stretched, is usually well loaded.' : 'Free-weight presses are hardest near the bottom, with the elbows bent and the chest stretched, and get easier toward lockout.',
      r: { machine: { L: 2, S: 2, P: 1, F: 1, G: 1 }, db: { L: 3, S: 1, P: 1, F: 1, G: 1 }, bb: { L: 2, S: 1, P: 1, F: 1, G: 1 }, push: { L: 2, S: 1, P: 1, F: 1, G: 0 }, dip: { L: 3, S: 1, P: 1, F: 1, G: 1 } }[kind],
      evidence: [], tips: ['Lower under control to a deep, comfortable stretch; that part does the most for growth.']
    };
  });
  // back
  add('pullover', (ex, n) => has(n, /pullover|pull over|pull-over/), (ex, n) => {
    const mach = machEq(ex);
    return {
      title: 'Shoulder extension from overhead (pullover)', joints: ['Shoulder extension'],
      movers: 'Lats, with the long head of the triceps, the chest (sternal part) and teres major.',
      scene: mach ? scenes.pulloverMachine({}) : scenes.pulloverFree({}),
      moment: mach ? 'A pullover machine rotates around the shoulder and its cam keeps resistance with the arms overhead, where the lats are longest. One of very few lat exercises that loads the lats without the biceps.' : 'Lying with a dumbbell, the arm is near horizontal behind your head at the start: longest moment arm, with the lats fully stretched. It fades as the arm comes up over the chest.',
      r: mach ? { L: 3, S: 2, P: 2, F: 2, G: 1 } : { L: 3, S: 1, P: 1, F: 1, G: 1 }, evidence: [],
      tips: ['Let the arms travel well back overhead each rep; that stretch is what you are paying for.']
    };
  });
  add('straightArm', (ex, n) => has(n, /straight.?arm/), (ex, n) => ({
    title: 'Shoulder extension with straight arms', joints: ['Shoulder extension'], movers: 'Lats and teres major, with the long head of the triceps.', scene: null,
    moment: 'The cable from above pulls the arms up, keeping tension from overhead (lats long) down to the thighs.', r: { L: 2, S: 1, P: 1, F: 2, G: 1 }, evidence: [],
    tips: ['Hinge forward a little and start with the arms high to load the stretch.']
  }));
  add('pullVertical', (ex, n) => ['lats', 'upperback', 'biceps', 'fullbody'].includes(ex.m) && has(n, /pull ?down|pull.?up|chin.?up|chins?\b|pulldown/) && !has(n, /tuck|straight.?arm/), (ex, n) => {
    const free = /pull.?up|chin/.test(n) && !machEq(ex) && ex.eq !== 'cable';
    return {
      title: 'Vertical pull', joints: ['Shoulder adduction and extension', 'Elbow flexion', 'Scapular depression and downward rotation'],
      movers: 'Lats and teres major lead; the biceps, brachialis, rear delts and lower traps help.', scene: null,
      moment: free ? 'Bodyweight pulling is hardest from the hang, with the arms overhead and the lats stretched.' : 'A cable or lever keeps tension with the arms overhead, where the lats are longest, and lets you add small amounts of weight.',
      r: free ? { L: 2, S: 1, P: 2, F: 1, G: 0 } : { L: 2, S: 2, P: 2, F: 1, G: 1 }, evidence: [],
      tips: ['Let the shoulders rise fully at the top of each rep before pulling again.', 'Drive the elbows down toward your hips rather than pulling with the hands.']
    };
  });
  add('row', (ex, n) => has(n, /row/) && !has(n, /upright/), (ex, n) => {
    const sup = /chest.?supported|seal|machine|lever|seated/.test(n) || machEq(ex), bent = /bent|pendlay|yates|t.?bar/.test(n) && !sup;
    return {
      title: 'Horizontal pull (row)', joints: ['Shoulder extension', 'Elbow flexion', 'Scapular retraction'],
      movers: 'Lats, mid traps, rhomboids and rear delts, with the biceps.', scene: null,
      moment: 'Resistance pulls the arms forward; reaching forward at the start stretches the lats and upper back, and the end position squeezes the mid back.',
      r: sup ? { L: 2, S: 2, P: 1, F: 1, G: 1 } : bent ? { L: 1, S: 0, P: 1, F: 0, G: 1 } : cableEq(ex) ? { L: 2, S: 1, P: 2, F: 1, G: 1 } : { L: 2, S: 1, P: 1, F: 1, G: 1 },
      evidence: [], tips: sup ? ['Let the shoulder blades travel forward at the start of every rep.'] : ['Brace hard; the lower back limits how heavy the bent-over versions can go.']
    };
  });
  add('shrug', (ex, n) => has(n, /shrug/), (ex, n) => {
    const horiz = /horizontal|retract|seated cable/.test(n);
    return {
      title: horiz ? 'Scapular retraction (horizontal shrug)' : 'Scapular elevation (shrug)', joints: [horiz ? 'Scapular retraction' : 'Scapular elevation'],
      movers: horiz ? 'Mid traps and rhomboids, with the lower traps; no shoulder or elbow movement.' : 'Upper traps and levator scapulae.', scene: null,
      moment: horiz ? 'The cable pulls the shoulder blades forward; you only move them back and together. A short movement, but the cable keeps the tension even and lets the blades travel fully forward into the stretch.' : 'The load hangs down; the range is short and fairly even in effort.',
      r: horiz ? { L: 2, S: 2, P: 2, F: 2, G: 1 } : { L: 1, S: 2, P: 1, F: 2, G: 1 }, evidence: [],
      tips: horiz ? ['Keep the arms straight and let the shoulders get pulled forward before each squeeze back.'] : ['Pause briefly at the top; don’t roll the shoulders.']
    };
  });
  // legs
  // sissy squats extend the knee like a leg extension, but with body weight and the hips kept straight
  add('sissy', (ex, n) => has(n, /sissy/), () => ({
    title: 'Knee extension with the hips straight (sissy squat)', joints: ['Knee extension', 'Hips held straight'],
    movers: 'Quads, all four heads. Keeping the hips straight while the knees travel forward puts the rectus femoris, which also crosses the hip, at a very long length at the bottom.',
    scene: null,
    moment: 'Your body weight (and any plate you hold) acts at your centre of mass. As the knees travel forward its moment arm about the knee grows, so it is hardest at the bottom, where the quads are longest, and easier as you rise.',
    r: { L: 3, S: 1, P: 1, F: 2, G: 1 },
    evidence: [['pedrosa2022', 'In leg extensions, reps in the deep, bent-knee half grew the quads at least as well as full reps. Sissy squats are hardest in that same range.']],
    tips: ['Hold on to something for balance and keep knees, hips and shoulders in one line as the knees go forward.', 'Go as deep as your knees are comfortable with; hold a plate to your chest once 15 or more reps are easy.']
  }));
  add('legExt', (ex, n) => has(n, /leg extension|knee extension/), (ex, n) => ({
    title: 'Knee extension', joints: ['Knee extension'],
    movers: 'Quads, all four heads. The rectus femoris also crosses the hip, so sitting upright (hip bent) keeps it short; leaning back lengthens it.',
    scene: scenes.legExt({}),
    moment: 'The roller sits on the lower shin and the machine sets the resistance. The quads are longest with the knee bent at the start.',
    r: { L: 2, S: 2, P: 1, F: 2, G: 1 },
    evidence: [['pedrosa2022', 'Reps in the bent-knee half grew the quads as well as or better than full reps; partials near lockout grew them least.']],
    tips: ['Start each rep from a deep bend. When full reps run out, keep going with partials in the bottom half.', 'If the seat back reclines, leaning back lengthens the rectus femoris.']
  }));
  add('legCurl', (ex, n) => has(n, /leg curl|hamstring curl|nordic|glute.?ham/), (ex, n) => {
    const seated = /seated|sitting/.test(n), nordic = /nordic|glute.?ham/.test(n), lying = /lying|prone/.test(n) || (!seated && !nordic && !/standing/.test(n));
    return {
      title: `Knee flexion${seated ? ', seated' : lying ? ', lying' : nordic ? ', bodyweight' : ', standing'}`, joints: ['Knee flexion'],
      movers: `Hamstrings (biceps femoris, semitendinosus, semimembranosus), with the calves helping. ${seated ? 'Sitting bends the hip, which stretches the three hamstring heads that cross the hip.' : lying ? 'Lying flat keeps the hip straight, so the hamstrings are shorter than when seated.' : ''}`,
      scene: seated ? scenes.legCurlSeated({}) : lying ? scenes.legCurlLying({}) : null,
      moment: nordic ? 'Your body is the load; it is hardest near the floor, with the knees straight and the hamstrings longest.' : 'The roller is behind the ankle and the machine sets the resistance; the hamstrings are longest with the knee straight at the start.',
      r: seated ? { L: 3, S: 2, P: 2, F: 2, G: 1 } : nordic ? { L: 3, S: 1, P: 1, F: 1, G: 0 } : { L: 1, S: 2, P: 2, F: 2, G: 1 },
      evidence: [['maeo2021', seated ? 'This seated version grew the hamstrings more than the lying version (about +14% vs +9%).' : 'Seated leg curls grew the hamstrings more than lying ones; if you have the choice, prefer seated.']],
      tips: ['Lean forward slightly in the seat to stretch the hamstrings more.', 'Control the way back to a straight knee every rep.'].slice(seated ? 0 : 1)
    };
  });
  add('hipAdd', (ex, n) => has(n, /adduct/), (ex, n) => ({
    title: 'Hip adduction', joints: ['Hip adduction'], movers: 'Adductors (magnus, longus, brevis) with the gracilis. Sitting with hips bent puts more stretch on the adductor magnus.',
    scene: machEq(ex) ? scenes.hipAdd({}) : null, moment: 'The pads push the knees apart and the machine sets the resistance; the adductors are longest with the legs wide at the start.',
    r: machEq(ex) || cableEq(ex) ? { L: 2, S: 2, P: 2, F: 2, G: 1 } : { L: 1, S: 1, P: 1, F: 2, G: 0 },
    evidence: [['plotkin2023', 'Deep squats also grew the adductors, more than hip thrusts did.']], tips: ['Set the start as wide as you comfortably can; that stretched start is the valuable part.']
  }));
  add('hipAbd', (ex, n) => has(n, /abduct|clamshell|fire hydrant|lateral walk|monster walk/), (ex, n) => ({
    title: 'Hip abduction', joints: ['Hip abduction'], movers: 'Glute medius and minimus with the upper glute max and TFL. Seated with the hips bent, the upper glute max does more.',
    scene: machEq(ex) ? scenes.hipAbd({}) : null, moment: 'The pads push the knees together and the machine sets the resistance; the abductors are longest with the knees together at the start.',
    r: machEq(ex) || cableEq(ex) ? { L: 1, S: 2, P: 2, F: 2, G: 1 } : { L: 0, S: 1, P: 1, F: 2, G: 0 },
    evidence: [], tips: ['Leaning forward from the hips shifts more of the work to the glute max.']
  }));
  add('calf', (ex, n) => has(n, /calf|calves|heel raise/), (ex, n) => {
    const bent = /seated|squat calf|sitting/.test(n), donkey = /donkey/.test(n);
    return {
      title: `Ankle plantar flexion${bent ? ', knee bent' : ', knee straight'}`, joints: ['Ankle plantar flexion'],
      movers: bent ? 'Mostly the soleus. With the knee bent, the gastrocnemius (which crosses the knee) goes slack and does little.' : `Gastrocnemius and soleus.${donkey ? ' Bending at the hip doesn’t change the calves much, but the straight knee keeps the gastrocnemius long.' : ''}`,
      scene: null, moment: 'The load acts through the leg on the ball of the foot; the moment arm is the foot’s length in front of the ankle, so effort is fairly even. The calves are longest with the heel dropped at the bottom.',
      r: bent ? { L: 2, S: 2, P: 2, F: 2, G: 1 } : { L: 3, S: 2, P: 2, F: 2, G: 1 },
      evidence: [['kinoshita2023', bent ? 'Seated calf raises did not grow the gastrocnemius; standing ones did. Keep this for the soleus and add a straight-knee version.' : 'Standing calf raises grew the gastrocnemius; seated ones didn’t.'], ['kassiano2023', 'Reps in the bottom, stretched half grew the calves about twice as much as full reps.']],
      tips: ['Drop the heel as deep as you can and pause there for a second.', 'When full reps run out, keep going with bottom-half partials.']
    };
  });
  add('bridge', (ex, n) => has(n, /hip thrust|glute bridge|bridge/) && ex.m === 'glutes', (ex, n) => ({
    title: 'Hip extension (bridge / thrust)', joints: ['Hip extension'], movers: 'Glute max, with the hamstrings and adductor magnus.', scene: null,
    moment: 'The load sits on the hips, so it is hardest at the top, with the hips straight and the glutes short; the bottom, where the glutes are long, is light.',
    r: { L: 0, S: 2, P: 1, F: 2, G: 1 },
    evidence: [['plotkin2023', 'Despite being hardest in the shortened position, hip thrusts grew the glutes about as much as squats.']],
    tips: ['Lower until the hips are well bent, and pause briefly at the top.']
  }));
  add('squat', (ex, n) => has(n, /squat|leg press|hack|lunge|split|step.?up|pistol/), (ex, n) => {
    const mach = machEq(ex) || /leg press|hack/.test(n), uni = /lunge|split|step|pistol|bulgarian/.test(n);
    return {
      title: uni ? 'Single-leg squat pattern' : 'Squat pattern', joints: ['Knee extension', 'Hip extension', 'Ankle dorsiflexion'],
      movers: 'Quads and glutes, with the adductors (adductor magnus) and calves.', scene: null,
      moment: 'Hardest at the bottom, where the knees and hips are bent and the quads and glutes are longest. Easier toward the top.',
      r: mach ? { L: 3, S: 2, P: 1, F: 1, G: 1 } : uni ? { L: 3, S: 1, P: 1, F: 1, G: 1 } : { L: 3, S: 1, P: 1, F: 0, G: 1 },
      evidence: [['plotkin2023', 'Squats grew the glutes as much as hip thrusts, and the quads and adductors more.']],
      tips: ['Go as deep as you can while keeping position; depth is where the stretch is.']
    };
  });
  add('hinge', (ex, n) => has(n, /deadlift|rdl|romanian|good morning|stiff|hyperextension|back extension|pull.?through|swing/), (ex, n) => {
    const rdl = /romanian|rdl|stiff|good morning/.test(n), ext = /hyperextension|back extension/.test(n);
    return {
      title: 'Hip hinge', joints: ['Hip extension', ext ? 'Spinal extension (if you round)' : null].filter(Boolean),
      movers: 'Hamstrings, glutes and spinal erectors, with the adductor magnus.', scene: null,
      moment: 'With the torso tipped forward, the load’s moment arm about the hip is longest at the bottom, where the hamstrings and glutes are stretched.',
      r: ext ? { L: 2, S: 2, P: 1, F: 2, G: 1 } : rdl ? { L: 3, S: 1, P: 2, F: 0, G: 1 } : { L: 2, S: 1, P: 1, F: 0, G: 1 },
      evidence: [], tips: ['Push the hips back until you feel the hamstrings stretch, then stand up by driving the hips forward.']
    };
  });
  add('crunch', (ex, n) => (has(n, /crunch|sit.?up/) || (ex.m === 'abs' && machEq(ex))) && !has(n, /roll.?out|ab roll|wheel/), (ex, n) => {
    const mach = machEq(ex), cable = cableEq(ex);
    return {
      title: 'Spinal flexion (crunch)', joints: ['Trunk flexion'], movers: 'Rectus abdominis, with the obliques.',
      scene: mach || cable ? scenes.crunch({ machine: mach }) : null,
      moment: mach ? 'You curl the trunk against a pad and the machine sets the resistance, so you can load abs like any other muscle and add weight in small steps.' : cable ? 'The cable from above keeps tension as you curl down, including at the start, where the abs are lengthened.' : 'Bodyweight crunches are hardest with the trunk near flat; they are hard to load progressively.',
      r: mach || cable ? { L: 2, S: 2, P: 2, F: 2, G: 1 } : { L: 1, S: 2, P: 1, F: 2, G: 0 }, evidence: [],
      tips: ['Curl the ribs toward the pelvis; don’t just bend at the hips.', 'Start each rep from a tall, slightly arched position for more stretch.']
    };
  });
  add('legRaise', (ex, n) => has(n, /leg raise|knee raise|toes to bar|knee tuck/), (ex, n) => ({
    title: 'Hip flexion with pelvic tilt', joints: ['Hip flexion', 'Posterior pelvic tilt'], movers: 'Hip flexors, with the lower part of the rectus abdominis when the pelvis curls up.', scene: null,
    moment: 'The legs are the load; straighter legs mean a longer moment arm and a harder rep.', r: { L: 1, S: 1, P: 1, F: 1, G: 0 }, evidence: [],
    tips: ['Curl the pelvis up at the top; just lifting the legs mostly trains the hip flexors.']
  }));
  add('grip', (ex, n) => ex.m === 'forearms' && has(n, /gripper|grip|wrist|plate pinch|pinch|hang/), (ex, n) => ({
    title: /wrist/.test(n) && !/roller/.test(n) ? 'Wrist flexion or extension' : 'Finger and thumb flexion (grip)', joints: [/wrist/.test(n) ? 'Wrist flexion / extension' : 'Finger flexion'],
    movers: 'Forearm flexors (flexor digitorum superficialis and profundus) and the small hand muscles.', scene: null,
    moment: 'A short lever; machines and grippers keep effort fairly even. The forearm flexors are longest with the fingers or wrist opened back.',
    r: machEq(ex) ? { L: 1, S: 2, P: 1, F: 2, G: 1 } : { L: 1, S: 2, P: 1, F: 2, G: 1 }, evidence: [],
    tips: ['Open the hand fully between reps.']
  }));

  const GENERIC = {
    title: 'General', joints: [], movers: '', scene: null, moment: '', r: null, evidence: [], tips: []
  };
  function genericFor(ex) {
    const stable = ex.eq === 'machine' || ex.eq === 'cable' || ex.eq === 'smith';
    const kind = ex.m === 'cardio' ? 'cardio' : ex.m === 'mobility' ? 'mobility' : ex.m === 'fullbody' ? 'full' : 'other';
    return {
      ...GENERIC,
      title: kind === 'cardio' ? 'Conditioning' : kind === 'mobility' ? 'Mobility and stretching' : kind === 'full' ? 'Whole-body movement' : 'Accessory movement',
      movers: '', moment: kind === 'cardio' || kind === 'mobility' ? '' : 'No detailed model for this one yet. As with any exercise: controlled reps through a full, comfortable range, taken close to failure, are what make it work.',
      r: kind === 'cardio' || kind === 'mobility' ? null : { L: 1, S: stable ? 2 : 1, P: 1, F: 1, G: 1 }
    };
  }

  const FIBERS = 'Taken within about 0 to 3 reps of failure, any exercise recruits essentially all motor units in the working muscle (the size principle: the biggest, fastest-growing units come in last, as the set gets hard). What differs between exercises is not "fiber recruitment" but which muscles and heads carry the tension, and at what length.';
  const RATE_NAMES = { L: 'Loads the stretch', S: 'Stable and controllable', P: 'Tension through the range', F: 'Hits the target, little extra fatigue', G: 'Easy to add load' };
  const RATE_MAX = { L: 3, S: 2, P: 2, F: 2, G: 1 };
  const cache = new Map();
  function analyze(ex) {
    if (!ex) return null;
    const key = ex.id + '|' + ex.name + '|' + ex.m + '|' + ex.eq;
    if (cache.has(key)) return cache.get(key);
    const n = (ex.name || '').toLowerCase();
    const p = P.find(x => x.test(ex, n));
    const out = p ? { pattern: p.id, ...p.build(ex, n) } : { pattern: 'generic', ...genericFor(ex) };
    const curve = out.scene ? curveOf(out.scene) : null;
    out.curve = curve;
    out.shape = out.scene ? shapeOf(curve) : null;
    out.score = out.r ? Object.values(out.r).reduce((a, b) => a + b, 0) : null;
    out.fibers = out.r ? FIBERS : '';
    cache.set(key, out);
    return out;
  }
  const verdict = s => s == null ? '' : s >= 9 ? 'Excellent for growth' : s >= 7 ? 'Very good' : s >= 5 ? 'Good' : 'Fine, with trade-offs';

  // ---------- drawing: the setup as a simple diagram, plus the resistance curve ----------
  // the drawing's frame, worked out once per exercise: it fits every position of the rep, so the moving parts stay inside
  const frames = new WeakMap();
  function frameOf(a) {
    if (frames.has(a)) return frames.get(a);
    const sc = a.scene, J = sc.joint, segAt = ang => at(J, ang, sc.seg), loadAt = ang => at(J, ang, sc.load);
    // the position where it is hardest (for machines: the middle)
    let hard = (sc.a0 + sc.a1) / 2;
    if (a.curve) { const k = a.curve.indexOf(Math.max(...a.curve)); hard = sc.a0 + (sc.a1 - sc.a0) * k / (a.curve.length - 1); }
    const pts = [];
    const line = (x1, y1, x2, y2) => { pts.push([x1, y1], [x2, y2]); };
    for (const b of sc.body || []) line(...b);
    for (const f of sc.fixed || []) line(...f);
    for (const f of sc.frame || []) line(...f);
    if (sc.head) { pts.push([sc.head[0] - sc.head[2], sc.head[1] - sc.head[2]], [sc.head[0] + sc.head[2], sc.head[1] + sc.head[2]]); }
    if (sc.force.q) pts.push(sc.force.q);
    if (sc.bench) pts.push([sc.bench[0], sc.bench[1]], [sc.bench[0] + sc.bench[2], sc.bench[1] + sc.bench[3]]);
    for (let i = 0; i <= 12; i++) {
      const ang = sc.a0 + (sc.a1 - sc.a0) * i / 12, E = segAt(ang), Pl = loadAt(ang);
      line(J[0], J[1], E[0], E[1]);
      if (sc.force.type === 'gravity') pts.push([Pl[0], Pl[1] - 0.75]);
    }
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const pad = 0.35, x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
    // drawn at 100 px per unit so text and strokes have ordinary sizes
    const K = 100, W = (x1 - x0) * K, H = (y1 - y0) * K;
    const X = x => ((x - x0) * K).toFixed(1), Y = y => ((y1 - y) * K).toFixed(1);
    const L = (x1_, y1_, x2_, y2_, cls) => `<line class="${cls}" x1="${X(x1_)}" y1="${Y(y1_)}" x2="${X(x2_)}" y2="${Y(y2_)}"/>`;
    const f = { sc, J, segAt, loadAt, hard, K, W, H, X, Y, L };
    frames.set(a, f);
    return f;
  }
  // the parts that move with the rep, drawn at one angle: line of force, moment arm, the moving segment and what it holds
  function liveAt(a, ang) {
    const { sc, J, segAt, loadAt, X, Y, L } = frameOf(a);
    const E = segAt(ang), Pl = loadAt(ang), F = sc.force.type === 'cam' ? null : forceDir(sc, Pl);
    let s = '';
    if (sc.force.type === 'cable') s += L(Pl[0], Pl[1], sc.force.q[0], sc.force.q[1], 'sci-force');
    else if (sc.force.type === 'gravity') s += L(Pl[0], Pl[1], Pl[0], Pl[1] - 0.7, 'sci-force') + `<path class="sci-arrow" d="M${X(Pl[0] - 0.07)} ${Y(Pl[1] - 0.6)} L${X(Pl[0])} ${Y(Pl[1] - 0.72)} L${X(Pl[0] + 0.07)} ${Y(Pl[1] - 0.6)}"/>`;
    if (F) {
      const t = (J[0] - Pl[0]) * F[0] + (J[1] - Pl[1]) * F[1], foot = [Pl[0] + F[0] * t, Pl[1] + F[1] * t];
      s += L(Pl[0], Pl[1], foot[0], foot[1], 'sci-force-ext') + L(J[0], J[1], foot[0], foot[1], 'sci-moment');
    }
    return s + L(J[0], J[1], E[0], E[1], 'sci-seg') + equip(sc.attach, Pl, ang, X, Y);
  }
  // p: 0 = start (muscle long) … 1 = end (muscle short)
  const live = (a, p) => liveAt(a, a.scene.a0 + (a.scene.a1 - a.scene.a0) * p);
  // how hard it is at that point, 0 to 1, from the resistance curve (null for machines)
  function effortAt(a, p) {
    const c = a && a.curve;
    if (!c) return null;
    const x = Math.min(1, Math.max(0, p)) * (c.length - 1), i = Math.min(c.length - 2, Math.floor(x));
    return c[i] + (c[i + 1] - c[i]) * (x - i);
  }
  function diagram(a) {
    const sc = a && a.scene;
    if (!sc) return '';
    const { J, segAt, hard, K, W, H, X, Y, L } = frameOf(a);
    // text sized to the drawing so every diagram reads the same once scaled to fit
    let s = `<svg class="sci-fig" style="--fs:${(Math.max(W, H * 0.75) / 15).toFixed(0)}px" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" role="img" aria-label="${a.title}: diagram of the joint, the moving part and the line of force">`;
    if (sc.bench) s += `<rect class="sci-bench" x="${X(sc.bench[0])}" y="${Y(sc.bench[1] + sc.bench[3])}" width="${(sc.bench[2] * K).toFixed(1)}" height="${(sc.bench[3] * K).toFixed(1)}" rx="4"/>`;
    for (const sl of sc.seat || []) s += L(...sl, 'sci-bench-l');
    for (const sl of sc.incline || []) s += L(...sl, 'sci-bench-l');
    for (const sl of sc.pad || []) s += L(...sl, 'sci-pad');
    for (const f of sc.frame || []) s += L(...f, 'sci-frame');
    for (const b of sc.body || []) s += L(...b, 'sci-body');
    if (sc.head) s += `<circle class="sci-head" cx="${X(sc.head[0])}" cy="${Y(sc.head[1])}" r="${sc.head[2] * K}"/>`;
    for (const f of sc.fixed || []) s += L(...f, 'sci-body');
    // range of motion arc, with the hardest point marked on it
    const R = sc.seg * 0.42, arc = [];
    for (let i = 0; i <= 20; i++) { const p = at(J, sc.a0 + (sc.a1 - sc.a0) * i / 20, R); arc.push(`${X(p[0])},${Y(p[1])}`); }
    s += `<polyline class="sci-arc" points="${arc.join(' ')}"/>`;
    // start and end ghosts; the moving parts are drawn at the hardest position (and animated from there by the app)
    for (const [ang, cls] of [[sc.a0, 'sci-ghost start'], [sc.a1, 'sci-ghost end']]) { const e = segAt(ang); s += L(J[0], J[1], e[0], e[1], cls); }
    if (a.curve) { const h = at(J, hard, R); s += `<circle class="sci-hard" cx="${X(h[0])}" cy="${Y(h[1])}" r="6"/>`; }
    s += `<g class="sci-live">${liveAt(a, hard)}</g>`;
    if (sc.force.type === 'cable') s += `<circle class="sci-pulley" cx="${X(sc.force.q[0])}" cy="${Y(sc.force.q[1])}" r="9"/>`;
    s += `<circle class="sci-joint" cx="${X(J[0])}" cy="${Y(J[1])}" r="7.5"/>`;
    s += `<text class="sci-t" x="${X(J[0] - 0.08)}" y="${Y(J[1] - 0.22)}" text-anchor="end">${sc.label}</text>`;
    const st = segAt(sc.a0), en = segAt(sc.a1);
    const tip = (p, k) => [J[0] + (p[0] - J[0]) * k, J[1] + (p[1] - J[1]) * k];
    const ts = tip(st, 1.22), te = tip(en, 1.22);
    s += `<text class="sci-t g" x="${X(ts[0])}" y="${Y(ts[1])}" text-anchor="middle" dominant-baseline="middle">start</text><text class="sci-t g" x="${X(te[0])}" y="${Y(te[1])}" text-anchor="middle" dominant-baseline="middle">end</text>`;
    if (sc.note) s += `<text class="sci-t g" x="10" y="${(H - 10).toFixed(1)}">${sc.note}</text>`;
    return s + '</svg>';
  }
  // the thing in the hand (or on the limb), drawn across the segment
  function equip(kind, p, ang, X, Y) {
    const n = [Math.cos(rad(ang + 90)), Math.sin(rad(ang + 90))], d = [Math.cos(rad(ang)), Math.sin(rad(ang))];
    const seg = (a, b, cls) => `<line class="${cls}" x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(b[0])}" y2="${Y(b[1])}"/>`;
    const off = (o, k, v) => [o[0] + v[0] * k, o[1] + v[1] * k];
    if (kind === 'cuff') {
      const c = off(p, -0.06, d);
      // named in the legend: a label here would run into "start" or "end" as the arm moves
      return seg(off(c, -0.11, n), off(c, 0.11, n), 'sci-cuff') + `<circle class="sci-ring" cx="${X(off(c, 0.16, n)[0])}" cy="${Y(off(c, 0.16, n)[1])}" r="5"/>`;
    }
    if (kind === 'dumbbell') return seg(off(p, -0.16, n), off(p, 0.16, n), 'sci-db') + seg(off(off(p, -0.16, n), -0.08, d), off(off(p, -0.16, n), 0.08, d), 'sci-plate') + seg(off(off(p, 0.16, n), -0.08, d), off(off(p, 0.16, n), 0.08, d), 'sci-plate');
    if (kind === 'bar') return seg(off(p, -0.22, n), off(p, 0.22, n), 'sci-db');
    if (kind === 'rope') return seg(p, off(off(p, 0.12, d), 0.1, n), 'sci-rope') + seg(p, off(off(p, 0.12, d), -0.1, n), 'sci-rope');
    if (kind === 'pad' || kind === 'roller') return `<circle class="sci-padc" cx="${X(p[0])}" cy="${Y(p[1])}" r="11"/>`;
    return seg(off(p, -0.11, n), off(p, 0.11, n), 'sci-handle');
  }
  function curveSvg(a) {
    const c = a && a.curve;
    if (!c) return '';
    const W = 100, H = 40, pts = c.map((v, i) => `${(i / (c.length - 1) * W).toFixed(2)},${(H - v * (H - 4)).toFixed(2)}`);
    return `<svg class="sci-curve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polygon class="sci-curve-a" points="0,${H} ${pts.join(' ')} ${W},${H}"/><polyline class="sci-curve-l" points="${pts.join(' ')}"/></svg>`;
  }

  return { analyze, diagram, live, effortAt, curveSvg, REFS, SHAPES, RATE_NAMES, RATE_MAX, verdict };
})();
