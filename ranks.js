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
   - REFS and SOURCES: the studies and data behind all this, grouped by what they support, each with what it found;
     an exercise's own ratio names its studies in `src`.
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

  // ---------- the studies and data behind the ranks ----------
  // each with a link where there's one to give; SOURCES groups them by what they support, with what each one found
  const REFS = {
    opl: { cite: 'OpenPowerlifting', title: 'Public-domain powerlifting meet records', url: 'https://www.openpowerlifting.org' },
    vandenhoek2024: { cite: 'van den Hoek et al. 2024, J Sci Med Sport', title: 'Normative data for the squat, bench press and deadlift exercises in powerlifting: data from 809,986 competition entries', url: 'https://doi.org/10.1016/j.jsams.2024.07.005' },
    vandenhoek2026: { cite: 'van den Hoek et al. 2026, J Strength Cond Res', title: 'The evolution of normative strength values in powerlifting from 2000 to 2024', url: 'https://doi.org/10.1519/JSC.0000000000005294' },
    vandenhoekPart: { cite: 'van den Hoek et al. 2024, Int J Sports Sci Coach', title: 'Powerlifting participation and engagement across all ages: a retrospective, longitudinal, population analysis with comparison to community strength norms', url: 'https://acuresearchbank.acu.edu.au/item/91x58/powerlifting-participation-and-engagement-across-all-ages-a-retrospective-longitudinal-population-analysis-with-comparison-to-community-strength-norms' },
    kilgore: { cite: 'Rippetoe & Kilgore, Practical Programming; Kilgore, ExRx', title: 'Strength standards, untrained to elite, by bodyweight', url: 'https://exrx.net/Testing/WeightLifting/StrengthStandards' },
    strengthlevel: { cite: 'Strength Level', title: 'Strength standards from self-reported lifts', url: 'https://strengthlevel.com/strength-standards' },
    acsm: { cite: 'ACSM’s Guidelines for Exercise Testing and Prescription', title: 'General-population strength norms (Cooper Institute)', url: '' },
    jaric2002: { cite: 'Jaric 2002, Sports Med', title: 'Muscle strength testing: use of normalisation for body size', url: 'https://doi.org/10.2165/00007256-200232100-00002' },
    batterham1997: { cite: 'Batterham & George 1997, J Appl Physiol', title: 'Allometric modeling does not determine a dimensionless power function ratio for maximal muscular function', url: 'https://doi.org/10.1152/jappl.1997.83.6.2158' },
    vanderburgh1999: { cite: 'Vanderburgh & Batterham 1999, Med Sci Sports Exerc', title: 'Validation of the Wilks powerlifting formula', url: 'https://doi.org/10.1097/00005768-199912000-00027' },
    dooman2000: { cite: 'Dooman & Vanderburgh 2000, J Strength Cond Res', title: 'Allometric modeling of the bench press and squat: who is the strongest regardless of body mass?', url: '' },
    cleather2006: { cite: 'Cleather 2006, J Strength Cond Res', title: 'Adjusting powerlifting performances for differences in body mass', url: '' },
    markovic2006: { cite: 'Marković & Sekulić 2006, Coll Antropol', title: 'Modeling the influence of body size on weightlifting and powerlifting performance', url: 'https://hrcak.srce.hr/en/27582' },
    ford2000: { cite: 'Ford et al. 2000, J Appl Physiol', title: 'Gender- and height-related limits of muscle strength in world weightlifting champions', url: 'https://doi.org/10.1152/jappl.2000.89.3.1061' },
    ferland2020: { cite: 'Ferland et al. 2020, Int J Exerc Sci', title: 'Efficiency of the Wilks and IPF formulas at comparing maximal strength regardless of bodyweight through analysis of the Open Powerlifting database', url: 'https://digitalcommons.wku.edu/ijes/vol13/iss4/12' },
    ipf: { cite: 'International Powerlifting Federation', title: 'IPF Points proposal (the federation’s bodyweight formula)', url: 'https://www.powerlifting.sport/fileadmin/ipf/data/ipf-formula/IPF_Points_Proposal.pdf' },
    latella2024: { cite: 'Latella et al. 2024, Sports Med', title: 'Using powerlifting athletes to determine strength adaptations across ages in males and females: a longitudinal growth modelling approach', url: 'https://doi.org/10.1007/s40279-023-01962-6' },
    anton2004: { cite: 'Anton et al. 2004, Med Sci Sports Exerc', title: 'Age-related declines in anaerobic muscular performance: weightlifting and powerlifting', url: 'https://doi.org/10.1249/01.MSS.0000106283.34742.BE' },
    solberg2019: { cite: 'Solberg et al. 2019, Int J Sports Physiol Perform', title: 'Peak age and performance progression in world-class weightlifting and powerlifting athletes', url: 'https://doi.org/10.1123/ijspp.2019-0093' },
    lindle1997: { cite: 'Lindle et al. 1997, J Appl Physiol', title: 'Age and gender comparisons of muscle strength in 654 women and men aged 20–93 yr', url: 'https://doi.org/10.1152/jappl.1997.83.5.1581' },
    nuzzo2023: { cite: 'Nuzzo 2023, J Strength Cond Res', title: 'Narrative review of sex differences in muscle strength, endurance, activation, size, fiber type, and strength training participation rates, preferences, motivations, injuries, and neuromuscular adaptations', url: 'https://doi.org/10.1519/JSC.0000000000004329' },
    miller1993: { cite: 'Miller et al. 1993, Eur J Appl Physiol', title: 'Gender differences in strength and muscle fiber characteristics', url: 'https://doi.org/10.1007/BF00235103' },
    epley1985: { cite: 'Epley 1985, Boyd Epley Workout', title: 'Poundage chart', url: '' },
    brzycki1993: { cite: 'Brzycki 1993, J Phys Educ Recreat Dance', title: 'Strength testing: predicting a one-rep max from reps-to-fatigue', url: 'https://doi.org/10.1080/07303084.1993.10606684' },
    lesuer1997: { cite: 'LeSuer et al. 1997, J Strength Cond Res', title: 'The accuracy of prediction equations for estimating 1-RM performance in the bench press, squat, and deadlift', url: '' },
    reynolds2006: { cite: 'Reynolds et al. 2006, J Strength Cond Res', title: 'Prediction of one repetition maximum strength from multiple repetition maximum testing and anthropometry', url: 'https://www.unm.edu/~rrobergs/478RMStrengthPrediction.pdf' },
    rodriguez2020: { cite: 'Rodríguez-Ridao et al. 2020, Int J Environ Res Public Health', title: 'Effect of five bench inclinations on the electromyographic activity of the pectoralis major, anterior deltoid, and triceps brachii during the bench press exercise', url: 'https://doi.org/10.3390/ijerph17197339' },
    saeterbakken2017: { cite: 'Saeterbakken et al. 2017, J Hum Kinet', title: 'The effects of bench press variations in competitive athletes on muscle activity and performance', url: 'https://doi.org/10.1515/hukin-2017-0047' },
    saeterbakken2011: { cite: 'Saeterbakken et al. 2011, J Sports Sci', title: 'A comparison of muscle activity and 1-RM strength of three chest-press exercises with different stability requirements', url: '' },
    saeterbakken2013: { cite: 'Saeterbakken & Fimland 2013, J Strength Cond Res', title: 'Effects of body position and loading modality on muscle activity and strength in shoulder presses', url: '' },
    swinton2011: { cite: 'Swinton et al. 2011, J Strength Cond Res', title: 'A biomechanical analysis of straight and hexagonal barbell deadlifts using submaximal loads', url: 'https://doi.org/10.1519/JSC.0b013e3181e73f87' },
    camara2016: { cite: 'Camara et al. 2016, J Strength Cond Res', title: 'An examination of muscle activation and power characteristics while performing the deadlift exercise with straight and hexagonal barbells', url: 'https://doi.org/10.1519/JSC.0000000000001352' },
    sanchez2017: { cite: 'Sánchez-Moreno et al. 2017, Int J Sports Physiol Perform', title: 'Movement velocity as indicator of relative intensity and level of effort attained during the set in pull-up exercise', url: 'https://doi.org/10.1123/ijspp.2016-0791' },
    cotterman2005: { cite: 'Cotterman et al. 2005, J Strength Cond Res', title: 'Comparison of muscle force production using the Smith machine and free weights for bench press and squat exercises', url: 'https://doi.org/10.1519/14433.1' },
    haugen2023: { cite: 'Haugen et al. 2023, BMC Sports Sci Med Rehabil', title: 'Effect of free-weight vs. machine-based strength training on maximal strength, hypertrophy and jump performance: a systematic review and meta-analysis', url: 'https://doi.org/10.1186/s13102-023-00713-4' }
  };
  const SOURCES = [
    ['Where the standards come from', [
      ['opl', 'Career-best squat, bench press and deadlift of raw lifters in ten federations: the data the standards are fitted to.'],
      ['vandenhoek2024', 'Percentile norms by sex, age and bodyweight from 809,986 entries in drug-tested, unequipped meets: the same kind of data, and the same use of percentiles, as the ranks.'],
      ['vandenhoek2026', 'Norms moved little from 2000 to 2024 (the median man’s bench press barely changed), so standards from these records stay current.'],
      ['vandenhoekPart', 'Competitors sit far above community strength norms: why Gold, the bottom 15% of them, is already a strong gym lifter.'],
      ['kilgore', 'The classic five-level standards by bodyweight, untrained to elite: a ladder of levels like the ranks.'],
      ['strengthlevel', 'Percentile standards from tens of millions of self-reported lifts: a cross-check, though not verified like meet results.'],
      ['acsm', 'General-population norms for 1RM per bodyweight: the everyday end of the scale, below competitors.']]],
    ['Your bodyweight', [
      ['jaric2002', 'Strength grows with about bodyweight to the power 0.67, not in proportion to it, so dividing by bodyweight is unfair to heavier lifters. The ranks use curves of the form a × bodyweight^b.'],
      ['batterham1997', 'One power of bodyweight doesn’t fit every size, so each lift and each rank gets its own fitted curve.'],
      ['dooman2000', 'Bench press and squat records scale with about bodyweight^0.57 and ^0.60; the deadlift fit less well.'],
      ['cleather2006', 'Across world championships the best fit was a curve that flattens at heavier bodyweights, different for each lift and sex.'],
      ['markovic2006', 'Simple bodyweight scaling tends to favour the middle weight classes.'],
      ['vanderburgh1999', 'The Wilks formula was fair for the bench press and total, but biased against heavier lifters in the deadlift.'],
      ['ferland2020', 'Wilks and the IPF formula each compared only about half of all weight-class pairs fairly: one formula struggles across every size.'],
      ['ipf', 'The federation’s own bodyweight formula, replacing Wilks in 2019.'],
      ['ford2000', 'Among world champions, weight lifted rose with height squared, through muscle size, which your bodyweight already carries: why height isn’t used.']]],
    ['Age', [
      ['latella2024', 'Lifters gain most in their first year and can keep gaining for a decade; women over 59 still improved, while men over 69 lost about 0.35% a year.'],
      ['anton2004', 'Powerlifting records fall steadily with age, at similar rates for the bench press and the squat.'],
      ['solberg2019', 'When world-class powerlifters reach their best, and how they progress on the way.'],
      ['lindle1997', 'In 654 adults aged 20 to 93, strength fell with age at similar rates in women and men.']]],
    ['Women and men', [
      ['nuzzo2023', 'Men are stronger mainly through bigger muscles, more so in the upper body: why women have their own standards.'],
      ['miller1993', 'Strength for the size of the muscle was alike in women and men; the bigger upper-body gap follows how lean mass is spread.']]],
    ['Your estimated 1RM', [
      ['epley1985', 'The formula the app uses: weight × (1 + reps / 30).'],
      ['brzycki1993', 'The other common formula: about 10 reps can be done with 75% of a max.'],
      ['lesuer1997', 'Predicted and tested maxes agreed closely, but every formula underestimated the deadlift.'],
      ['reynolds2006', 'Sets of about 5 reps predicted a max best, higher reps less well: why only sets of 1 to 12 reps count.']]],
    ['Other exercises', [
      ['rodriguez2020', 'The bench press max fell as the bench tilted up: 88% of flat at 15°, 78% at 30°, 71% at 45°. The app uses 82% for an incline.'],
      ['saeterbakken2017', 'Compared the loads competitive bench pressers manage with other grips, on an incline and on a decline.'],
      ['saeterbakken2011', 'A dumbbell press max was 17% below the barbell’s, about 41% of it in each hand (the app uses 40%), and a Smith machine’s 3% below.'],
      ['saeterbakken2013', 'Shoulder press maxes seated and standing, with a barbell and dumbbells: standing with dumbbells, the least steady way, gave the lowest.'],
      ['kilgore', 'A press is about 60 to 67% of a bench press in these standards; the app uses 63%.'],
      ['strengthlevel', 'The average shoulder press is about 65% of the average bench press here.'],
      ['swinton2011', 'Powerlifters lifted 8% more with a hex bar than a straight bar (265 against 245 kg): the app’s trap bar ratio.'],
      ['camara2016', 'Here the hex and straight bar maxes didn’t differ, so the trap bar ratio is an estimate.'],
      ['sanchez2017', 'Pull-up strength measured as the whole load pulled, your bodyweight included, the way the ranks count pull-ups.']]],
    ['Machines', [
      ['cotterman2005', 'Maxes on a Smith machine and with free weights differed (a heavier squat for women, a lighter bench on the Smith): why machine ranks are rough.'],
      ['haugen2023', 'Strength shows most on the kind of equipment you train with, so a machine’s number doesn’t carry over exactly.']]]
  ];

  // ---------- which standard an exercise is measured against ----------
  // ref: S squat, B bench, D deadlift, pull (pull-ups: bodyweight + added) or dip (dips: the same); r: a share of
  // that lift; conf: data (the lift itself), est (a free-weight lift, by a typical ratio) or rough (machines, cables);
  // per: hand (each dumbbell), side (one arm or leg at a time) or total (bodyweight plus added)
  const norm = n => String(n || '').toLowerCase().replace(/\s*v\.\s*\d+|\((back|side) pov\)|в°|°/g, '').replace(/\s+/g, ' ').trim();
  // src: the studies behind this exercise's own ratio (machines and the big three get theirs in the app)
  const B = (ref, r, conf, per = '', src) => ({ ref, r, conf, per, ...(src ? { src } : {}) });
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
      if (/pull-?up|chin-?up|\bchin\b/.test(n) && !one && !/l-pull|rocky|side-to-side|gironda/.test(n)) return B('pull', 1, 'est', 'total', ['sanchez2017']);
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
      if (eq === 'smith') return /chair|sumo/.test(n) ? NOT('kind') : B('S', 1, 'rough', '', ['cotterman2005']);
      if (db) return B('S', 0.28, 'est', 'hand');
      if (eq === 'landmine') return B('S', 0.5, 'rough');
      return NOT('kind');
    }
    // deadlifts, hinges, hip thrusts and leg curls
    if (/trap bar/.test(n)) return B('D', 1.08, 'est', '', ['swinton2011', 'camara2016']);
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
        if (/incline/.test(n)) return B('B', /reverse/.test(n) ? 0.78 : 0.82, 'est', '', ['rodriguez2020']);
        if (/decline/.test(n)) return B('B', 1.03, 'est');
        if (/close[- ]grip/.test(n)) return B('B', 0.9, 'est');
        if (/floor press/.test(n)) return B('B', 0.88, 'est');
        if (/spoto|larsen/.test(n)) return B('B', 0.92, 'est');
        if (/board|pin press/.test(n)) return B('B', 1.05, 'est');
        if (/reverse/.test(n)) return B('B', 0.95, 'est');
        if (/paused/.test(n)) return B('B', 0.96, 'est');
        return B('B', 1, 'data');
      }
      if (db) return B('B', /incline/.test(n) ? 0.36 : /decline/.test(n) ? 0.42 : /floor/.test(n) ? 0.38 : /squeeze|hammer|palm|reverse/.test(n) ? 0.35 : 0.4, 'est', 'hand', /incline/.test(n) ? ['saeterbakken2011', 'rodriguez2020'] : ['saeterbakken2011']);
      if (eq === 'smith') return B('B', /incline/.test(n) ? 0.85 : /decline/.test(n) ? 1.05 : /close/.test(n) ? 0.9 : 1, 'rough', '', ['saeterbakken2011']);
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
      if (bar) return /push press/.test(n) ? B('B', 0.78, 'est') : /behind|bradford/.test(n) ? B('B', 0.58, 'est') : /z press/.test(n) ? B('B', 0.55, 'est') : /anti gravity/.test(n) ? NOT('kind') : B('B', /seated/.test(n) ? 0.66 : 0.63, 'est', '', ['kilgore', 'strengthlevel', 'saeterbakken2013']);
      if (db) return /cuban|w-press|scott|alternate side/.test(n) ? NOT('kind') : B('B', /arnold/.test(n) ? 0.24 : 0.27, 'est', 'hand', ['saeterbakken2013']);
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

  // ---------- the emblems: each rank has its own shape, a bevelled metal rim, a brushed face, an embossed symbol, and from
  // Gold up a gem and a glow; the top ranks get wings, crystals, a laurel and rays. `small` leaves out what turns to noise
  // at list sizes ----------
  const f1 = v => +v.toFixed(1);
  function star(cx, cy, r, k = 0.45, n = 5) {
    let d = '';
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * k : r; d += `${i ? 'L' : 'M'}${f1(cx + rr * Math.cos(a))} ${f1(cy + rr * Math.sin(a))}`; }
    return d + 'Z';
  }
  // a four-point glint
  const glint = (x, y, r) => `M${x} ${y - r}Q${x + r * 0.16} ${y - r * 0.16} ${x + r} ${y}Q${x + r * 0.16} ${y + r * 0.16} ${x} ${y + r}Q${x - r * 0.16} ${y + r * 0.16} ${x - r} ${y}Q${x - r * 0.16} ${y - r * 0.16} ${x} ${y - r}Z`;
  // the silhouettes, one per tier, on a 120 × 134 face centred at x = 60
  const FRAME = [
    'M60 9Q84 10 99 21L99 61C99 90 83 111 60 126C37 111 21 90 21 61L21 21Q36 10 60 9Z', // wood: a rounded board
    'M60 7L100 20L100 61C100 92 83 113 60 128C37 113 20 92 20 61L20 20Z', // bronze: the heater shield
    'M60 6L90 15L101 26L101 61C101 92 84 113 60 128C36 113 19 92 19 61L19 26L30 15Z', // silver: notched shoulders
    'M60 0L69 10L101 20L101 61C101 92 84 114 60 129C36 114 19 92 19 61L19 20L51 10Z', // gold: a crest at the top
    'M60 4L98 16L108 10L103 28L102 61C102 93 84 114 60 129C36 114 18 93 18 61L17 28L12 10L22 16Z', // platinum: flared shoulders
    'M60 2L99 18L106 56L60 132L14 56L21 18Z', // diamond: a cut gem
    'M60 7L100 20L100 61C100 92 83 113 60 128C37 113 20 92 20 61L20 20Z', // champion: the shield, crowned
    'M60 4L84 10L104 6L100 26L102 62C101 92 84 114 60 130C36 114 19 92 18 62L20 26L16 6L36 10Z', // titan: spiked
    'M60 10A56 56 0 1 1 59.9 10Z' // olympian: a medallion
  ];
  const CENTRE = [[60, 66], [60, 66], [60, 66], [60, 66], [60, 66], [60, 62], [60, 66], [60, 66], [60, 66]];
  // the symbols, as before but redrawn a little finer
  function chev(y, w = 22, h = 11, t = 9) { return `M${60 - w} ${y}L60 ${y + h}L${60 + w} ${y}L${60 + w} ${y + t}L60 ${y + h + t}L${60 - w} ${y + t}Z`; }
  const SYM = [
    `<circle cx="60" cy="66" r="20" fill="none" stroke-width="3.4"/><circle cx="60" cy="66" r="12" fill="none" stroke-width="2.8"/><circle cx="60" cy="66" r="5"/>`,
    `<path d="${chev(55, 25, 14, 11)}"/>`,
    `<path d="${chev(48)}"/><path d="${chev(66)}"/>`,
    `<path d="${star(60, 47, 13)}"/><path d="${chev(64, 21, 10, 8)}"/><path d="${chev(79, 21, 10, 8)}"/>`,
    `<circle cx="60" cy="66" r="22" fill="none" stroke-width="3.6"/><path d="${star(60, 66, 15.5)}"/>`,
    `<path d="M39 55L48 42L72 42L81 55L60 90Z"/><path d="M39 55L81 55M48 42L55 55L60 90M72 42L65 55L60 90M55 55L60 42L65 55" fill="none" stroke="#1A44B8" stroke-opacity=".45" stroke-width="1.4"/>`,
    `<path d="M44 46L76 46L75 60C74 72 68 78 60 79C52 78 46 72 45 60Z"/><path d="M44 50C34 50 33 64 46 67M76 50C86 50 87 64 74 67" fill="none" stroke-width="3.4"/><path d="M56 79L64 79L65 87L55 87Z"/><rect x="47" y="87" width="26" height="7" rx="2"/>`,
    `<path d="M40 88C38 67 46 53 60 53C74 53 82 67 80 88L68 88L68 75L52 75L52 88Z"/><path d="M44 59C33 55 29 44 31 33C36 42 43 46 50 51Z"/><path d="M76 59C87 55 91 44 89 33C84 42 77 46 70 51Z"/>`,
    `<path d="M60 36C71 46 73 55 66 63C68 55 64 51 60 47C58 53 51 55 54 63C47 57 49 46 60 36Z"/><path d="M49 65L71 65L66 75L54 75Z"/><path d="M55 77L65 77L62 100L58 100Z"/>`
  ];
  // facet lines on the diamond's face and its symbol
  const FACETS = `<path d="M21 18L60 34L99 18M14 56L60 34L106 56M60 34L60 132" fill="none" stroke-width="1"/>`;
  // gems: [x, y, r, colour]
  const GEM = { 3: [60, 9, 5.2, '#E8204F'], 4: [60, 12, 5, '#F2FFFC'], 5: [60, 20, 5.5, '#7FD0FF'], 6: [60, 23, 5.5, '#FF2459'], 7: [60, 18, 6, '#B076FF'], 8: [60, 22, 6.5, '#FFF3B0'] };
  function gem(u, x, y, r, c) {
    return `<g><path d="M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z" fill="url(#${u}gm)" stroke="#00000066" stroke-width=".8"/>
      <path d="M${x} ${y - r}L${x + r} ${y}L${x} ${y}Z" fill="#FFFFFF" opacity=".45"/><path d="M${x - r} ${y}L${x} ${y + r}L${x} ${y}Z" fill="#000000" opacity=".22"/>
      <circle cx="${f1(x - r * 0.3)}" cy="${f1(y - r * 0.35)}" r="${f1(r * 0.22)}" fill="#FFFFFF"/></g>`;
  }
  // fx: a sweep of light across it, for the rank-up screen
  function emblem(i, uid, label, small, fx) {
    const t = TIERS[i], [hi, mid, lo] = t.c, u = 're' + uid, F = FRAME[i], [cx, cy] = CENTRE[i];
    const inset = (s) => `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`;
    const defs = `<defs>
      <linearGradient id="${u}rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".28" stop-color="${mid}"/><stop offset=".5" stop-color="${lo}"/><stop offset=".72" stop-color="${mid}"/><stop offset="1" stop-color="${hi}"/></linearGradient>
      <linearGradient id="${u}bev" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".85"/><stop offset=".45" stop-color="#FFFFFF" stop-opacity=".08"/><stop offset="1" stop-color="#000000" stop-opacity=".35"/></linearGradient>
      <radialGradient id="${u}face" cx=".5" cy=".28" r=".85"><stop offset="0" stop-color="${mid}"/><stop offset=".55" stop-color="${mixc(mid, lo, 0.55)}"/><stop offset="1" stop-color="${mixc(lo, '#000000', 0.35)}"/></radialGradient>
      <linearGradient id="${u}sym" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="${t.ink}"/><stop offset="1" stop-color="${mixc(hi, mid, 0.35)}"/></linearGradient>
      <linearGradient id="${u}gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".6"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
      <radialGradient id="${u}aura" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${t.glow}" stop-opacity=".8"/><stop offset=".6" stop-color="${t.glow}" stop-opacity=".22"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>
      <radialGradient id="${u}ray" cx="60" cy="66" r="92" gradientUnits="userSpaceOnUse"><stop offset=".3" stop-color="#FFF8D6"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>
      <linearGradient id="${u}wing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".5" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></linearGradient>
      <radialGradient id="${u}gm" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".35" stop-color="${(GEM[i] || [])[3] || hi}"/><stop offset="1" stop-color="${mixc((GEM[i] || [])[3] || lo, '#000000', 0.5)}"/></radialGradient>
      <clipPath id="${u}cl"><path d="${F}" transform="${inset(0.84)}"/></clipPath>${fx ? `<clipPath id="${u}fr"><path d="${F}"/></clipPath><linearGradient id="${u}sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset=".5" stop-color="#FFFFFF" stop-opacity=".9"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>` : ''}
      <filter id="${u}emb" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.1" flood-color="#000" flood-opacity=".55"/></filter>
    </defs>`;
    let back = '';
    if (!small && i >= 3) back += `<circle cx="60" cy="66" r="${62 + i * 3}" fill="url(#${u}aura)"/>`;
    if (!small && i === 8) back += `<g>${Array.from({ length: 20 }, (_, k) => { const a = k * Math.PI / 10, w = k % 2 ? 0.045 : 0.085, r = k % 2 ? 78 : 94; return `<path d="M60 66L${f1(60 + r * Math.cos(a - w))} ${f1(66 + r * Math.sin(a - w))}L${f1(60 + r * Math.cos(a + w))} ${f1(66 + r * Math.sin(a + w))}Z" fill="url(#${u}ray)"/>`; }).join('')}</g>`;
    // wings for Champion, Titan (bigger) and Olympian (spread behind the medallion)
    if (i === 6 || i === 7 || (i === 8 && !small)) {
      const s = i === 7 ? 1.18 : i === 8 ? 1.1 : 1, wy = i === 8 ? 66 : 50;
      const feather = (k, side) => { const y = wy - 22 + k * 12, len = 30 - k * 4.5, x0 = side < 0 ? 26 : 94; return `<path d="M${x0} ${y + 8}C${x0 + side * len * 0.5} ${y + 6} ${x0 + side * len} ${y - 2} ${x0 + side * (len + 4)} ${y - 10}C${x0 + side * (len - 6)} ${y - 4} ${x0 + side * len * 0.4} ${y} ${x0} ${y}Z"/>`; };
      let w = '';
      for (let k = 0; k < 4; k++) w += feather(k, -1) + feather(k, 1);
      back += `<g fill="url(#${u}wing)" stroke="${lo}" stroke-width="1" stroke-linejoin="round" transform="translate(60 ${wy}) scale(${s}) translate(-60 ${-wy})">${w}</g>`;
    }
    // crystal shards behind Platinum and Diamond
    if (!small && (i === 4 || i === 5)) back += `<g fill="url(#${u}wing)" stroke="${lo}" stroke-width=".8" opacity=".9"><path d="M22 40L6 20L18 46Z"/><path d="M98 40L114 20L102 46Z"/><path d="M24 74L4 70L22 82Z"/><path d="M96 74L116 70L98 82Z"/></g>`;
    // the laurel around the Olympian medallion
    if (i === 8) {
      const leaf = (x, y, a) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="3.2" ry="7.4" transform="rotate(${f1(a)} ${f1(x)} ${f1(y)})"/>`;
      let l = '';
      for (let k = 0; k < 8; k++) { const deg = 100 + k * 18, a = deg * Math.PI / 180, x = 60 + 63 * Math.cos(a), y = 70 + 63 * Math.sin(a), r = deg - 90 + 32; l += leaf(x, y, r) + leaf(120 - x, y, -r); }
      back += `<g fill="url(#${u}wing)" stroke="${lo}" stroke-width=".9">${l}</g>`;
    }
    // the crown on Champion's shield
    const crown = i === 6 ? `<g fill="url(#${u}rim)" stroke="${lo}" stroke-width="1"><path d="M38 20L36 4L48 13L60 0L72 13L84 4L82 20Z"/></g>` : '';
    // the rim, its bevel, the face, its brushed lines, a shadow inside the rim
    let body = `<path d="${F}" fill="url(#${u}rim)" stroke="${mixc(lo, '#000000', 0.4)}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="${F}" fill="none" stroke="url(#${u}bev)" stroke-width="2.4" transform="${inset(0.955)}" stroke-linejoin="round"/>
      <path d="${F}" fill="url(#${u}face)" transform="${inset(0.84)}"/>`;
    if (!small) body += `<g clip-path="url(#${u}cl)" stroke="#FFFFFF" stroke-opacity=".07" stroke-width="1">${Array.from({ length: 16 }, (_, k) => `<path d="M${-20 + k * 10} 0L${20 + k * 10} 140"/>`).join('')}</g>`;
    body += `<path d="${F}" fill="none" stroke="#000000" stroke-opacity=".35" stroke-width="3" transform="${inset(0.84)}" clip-path="url(#${u}cl)"/>
      <path d="${F}" fill="none" stroke="${hi}" stroke-opacity=".7" stroke-width="1" transform="${inset(0.84)}"/>`;
    if (i === 5) body += `<g stroke="${hi}" stroke-opacity=".35" clip-path="url(#${u}cl)">${FACETS}</g>`;
    if (i === 0) body += `<g fill="none" stroke="${lo}" stroke-opacity=".5" stroke-width="1.2" clip-path="url(#${u}cl)"><path d="M36 30C44 40 40 60 37 80C35 92 40 102 46 110"/><path d="M84 30C76 44 82 62 84 78C86 92 80 104 74 110"/><path d="M50 18C53 28 51 38 53 46"/></g>`;
    // rivets on the lower tiers
    if (i <= 2) body += `<g fill="url(#${u}rim)" stroke="${mixc(lo, '#000000', 0.4)}" stroke-width=".6">${[[29, 27], [91, 27], [60, 117]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6"/><circle cx="${f1(x - 0.8)}" cy="${f1(y - 0.8)}" r=".9" fill="#FFFFFF" stroke="none" opacity=".8"/>`).join('')}</g>`;
    // the symbol, embossed
    const sym = `<g fill="url(#${u}sym)" stroke="url(#${u}sym)" stroke-linejoin="round" filter="url(#${u}emb)">${SYM[i]}</g>`;
    const gloss = `<path d="M28 26L60 15L92 26L92 46C76 55 44 55 28 46Z" fill="url(#${u}gloss)" opacity=".45" clip-path="url(#${u}cl)"/>`;
    const g = GEM[i] ? gem(u, ...GEM[i]) : '';
    const sparks = !small && i >= 5 ? `<g fill="#FFFFFF">${[[18, 14, 5], [103, 12, 4], [108, 100, 4.4], [12, 96, 3.4]].map(([x, y, r]) => `<path d="${glint(x, y, r)}"/>`).join('')}</g>` : '';
    const shine = fx ? `<g clip-path="url(#${u}fr)"><rect class="emb-shine" x="-40" y="-10" width="34" height="160" fill="url(#${u}sh)"/></g>` : '';
    return `<svg class="rank-emb" viewBox="-6 -6 132 146" role="img" aria-label="${label || t.name}" overflow="visible">${defs}${back}${crown}${body}${sym}${gloss}${shine}${g}${sparks}</svg>`;
  }
  function mixc(a, b, t) { const p = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, k) => Math.round(v * (1 - t) + B[k] * t).toString(16).padStart(2, '0')).join(''); }
  return { TIERS, FITS, REFS, SOURCES, basis, ladder, place, ageFactor, emblem };
})();
