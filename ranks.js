/* Lift ranks for Lifting Sanity: Wood to Olympian, from how much you lift for your bodyweight (and age, if you give it).
   - The standards come from OpenPowerlifting (public domain, openpowerlifting.org): every raw lifter's best squat,
     bench press and deadlift in the meet records of ten federations (USAPL, USPA, CPU, BP, RPS, IPF, SPF, APU, NZPF,
     WRPF), 659,000 lifter-lifts. For each sex and lift, curves of the form a × bodyweight^b were fitted to the 15th,
     40th, 65th, 85th, 95th and 99th percentiles in bodyweight bands: those are Gold, Platinum, Diamond, Champion,
     Titan and Olympian. Competitors are a strong crowd, so the bottom 15% of them is already a solid gym lifter.
     Below that, Silver starts at 80% of Gold and Bronze at 60% (rules of thumb); anything less is Wood.
   - Age: from the same records, the median lifter at each age compared with ages 23 to 35 (masters and teens lift
     less). Used only if you give your age; the standards are lowered to match.
   - Twenty-nine common exercises (machine fly, chest press, pulldown, leg press, leg extension, curls, lateral raises…)
     are set against the nearest of the three lifts from what lifters log on Strength Level: for each, the lift that
     5%, 20%, 50%, 80% and 95% of its users beat, matched against the same users' squat, bench or deadlift. Machines
     measured this way are marked "logs" (you can still say how yours reads); free-weight lifts "estimated".
   - The rest are ranked by a typical ratio (an incline bench is about 82% of a flat one). Those are rules of thumb,
     marked "estimated", and machines and cables without logged data "rough".
   - REFS and SOURCES: the studies and data behind all this, grouped by what they support, each with what it found;
     an exercise's own ratio names its studies in `src`.
   No app state is used here: basis(ex, pattern) needs { name, eq, k, uni }, and ladder() a profile { sex, bw, age }. */
window.LS_RANKS = (() => {
  const TIERS = [
    { id: 'wood', sym: 'Seedling', mean: 'everyone starts here', name: 'Wood', c: ['#C7A982', '#7E5B3A', '#3F2A18'], ink: '#F3E3CC', glow: '#9C7650' },
    { id: 'bronze', sym: 'Anvil', mean: 'strength being forged', name: 'Bronze', c: ['#FFCFA3', '#E07B34', '#7A3510'], ink: '#FFF3E8', glow: '#F08A40' },
    { id: 'silver', sym: 'Barbell', mean: 'at home under the bar', name: 'Silver', c: ['#FFFFFF', '#B9C3CE', '#5F6B78'], ink: '#FFFFFF', glow: '#C9D6E3' },
    { id: 'gold', sym: 'Flame', mean: 'the fire’s lit, strong enough to compete', name: 'Gold', c: ['#FFF6B8', '#F5BE16', '#946100'], ink: '#FFFBEA', glow: '#FFC93C' },
    { id: 'platinum', sym: 'Summit', mean: 'the peak in sight, mid-pack among competitors', name: 'Platinum', c: ['#E9FFFB', '#5ED6C6', '#156E68'], ink: '#F2FFFD', glow: '#5EE0CF' },
    { id: 'diamond', sym: 'Diamond', mean: 'made under pressure, ahead of most competitors', name: 'Diamond', c: ['#E8F8FF', '#5AB8FF', '#1A44B8'], ink: '#F3FBFF', glow: '#61B8FF' },
    { id: 'champion', sym: 'Trophy', mean: 'you’d place, top 15% of competitors', name: 'Champion', c: ['#FFD3E0', '#FF3D6E', '#7D0A33'], ink: '#FFF0F4', glow: '#FF4F7E' },
    { id: 'titan', sym: 'Atlas', mean: 'carrying what few can, top 5% of competitors', name: 'Titan', c: ['#EBDDFF', '#9A5BFF', '#3A138C'], ink: '#F7F0FF', glow: '#A970FF' },
    { id: 'olympian', sym: 'Temple of Olympus', mean: 'among the gods, top 1% of competitors', name: 'Olympian', c: ['#FFFFFF', '#FFE27A', '#E08A00'], ink: '#FFFFFF', glow: '#FFD84D' }
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
  // strength at each age as a share of ages 23–35, at the middle of each age band (15, 17, 19, 21.5, 37.5 … 75), with
  // the flat 23–35 stretch as two points of its own so the curve has no step on a 23rd or 36th birthday
  const AGES = [15, 17, 19, 21.5, 23, 35, 37.5, 42.5, 47.5, 52.5, 57.5, 62.5, 67.5, 75];
  const AGE_F = {
    MS: [0.724, 0.854, 0.944, 0.985, 1, 1, 0.96, 0.927, 0.893, 0.843, 0.813, 0.729, 0.663, 0.58],
    MB: [0.675, 0.8, 0.892, 0.947, 1, 1, 1, 0.986, 0.967, 0.937, 0.888, 0.844, 0.769, 0.686],
    MD: [0.719, 0.847, 0.932, 0.982, 1, 1, 0.966, 0.932, 0.907, 0.86, 0.834, 0.788, 0.738, 0.657],
    FS: [0.757, 0.852, 0.946, 0.988, 1, 1, 0.951, 0.919, 0.869, 0.815, 0.773, 0.681, 0.627, 0.537],
    FB: [0.752, 0.847, 0.928, 0.969, 1, 1, 0.99, 0.983, 0.955, 0.901, 0.861, 0.791, 0.737, 0.643],
    FD: [0.773, 0.85, 0.932, 0.983, 1, 1, 0.966, 0.95, 0.917, 0.873, 0.847, 0.798, 0.755, 0.68]
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
      ['strengthlevel', 'Logged lifts for 29 common exercises (4.7 million dumbbell bench presses, 2.7 million leg presses, 2 million lat pulldowns, 488,000 machine flys…). Each is matched level for level against the same community’s squat, bench press or deadlift, and that is carried over to the competition standards. Self-reported, so a guide rather than a record.'],
      ['strengthlevel', 'The average shoulder press is about 65% of the average bench press here.'],
      ['swinton2011', 'Powerlifters lifted 8% more with a hex bar than a straight bar (265 against 245 kg): the app’s trap bar ratio.'],
      ['camara2016', 'Here the hex and straight bar maxes didn’t differ, so the trap bar ratio is an estimate.'],
      ['sanchez2017', 'Pull-up strength measured as the whole load pulled, your bodyweight included, the way the ranks count pull-ups.']]],
    ['Machines', [
      ['cotterman2005', 'Maxes on a Smith machine and with free weights differed (a heavier squat for women, a lighter bench on the Smith): why machine ranks are rough.'],
      ['haugen2023', 'Strength shows most on the kind of equipment you train with, so a machine’s number doesn’t carry over exactly.']]]
  ];

  // ---------- what lifters log: Strength Level's community standards (1RM, kg) ----------
  // For each exercise, the lift that 5%, 20%, 50%, 80% and 95% of the site's users beat (its Beginner, Novice,
  // Intermediate, Advanced and Elite), men then women, read in November 2026; n: how many logged lifts they rest on,
  // where the site says. They're self-reported and its users aren't everyone, so they aren't used as they stand:
  // an exercise is set against the SAME community's squat, bench press or deadlift (ref), level for level, and that
  // share is applied to the competition standards for your sex and bodyweight. So a machine fly "is 76% of the bench
  // for a beginner and 96% for an elite lifter" comes from what people log, not from a guess. mach: a machine or
  // cable, where the same number still reads differently from one model to the next.
  const SL = {
    B: { M: [49, 70, 96, 127, 160], F: [17, 31, 51, 74, 101] },
    S: { M: [66, 95, 131, 173, 219], F: [32, 51, 76, 105, 137], n: 24988444 },
    D: { M: [80, 113, 154, 202, 253], F: [41, 63, 91, 124, 160], n: 22978599 },
    frontSquat: { ref: 'S', M: [54, 77, 105, 137, 172], F: [31, 45, 63, 83, 104] },
    ohp: { ref: 'B', M: [29, 44, 62, 84, 107], F: [13, 21, 33, 46, 61] },
    dbBench: { ref: 'B', M: [17, 26, 38, 53, 69], F: [7, 13, 20, 30, 40], n: 4734253 },
    dbShoulder: { ref: 'B', M: [13, 21, 30, 42, 55], F: [6, 10, 15, 21, 28], n: 2100000 },
    dbLateral: { ref: 'B', M: [4, 9, 16, 24, 34], F: [3, 6, 9, 13, 18] },
    dbCurl: { ref: 'B', M: [7, 13, 21, 31, 42], F: [3, 8, 13, 21, 31] },
    barCurl: { ref: 'B', M: [19, 30, 45, 62, 82], F: [8, 15, 24, 36, 50] },
    rdl: { ref: 'D', M: [58, 87, 122, 164, 210], F: [31, 48, 68, 93, 120], n: 1151417 },
    chestPress: { ref: 'B', mach: 1, M: [34, 56, 86, 121, 161], F: [11, 22, 37, 57, 79], n: 822882 },
    machineFly: { ref: 'B', mach: 1, M: [37, 58, 85, 118, 154], F: [13, 24, 40, 59, 80], n: 487945 },
    machineShoulder: { ref: 'B', mach: 1, M: [25, 45, 73, 108, 148], F: [8, 18, 31, 49, 70] },
    machineLateral: { ref: 'B', mach: 1, M: [22, 37, 58, 84, 113], F: [9, 17, 28, 42, 58], n: 100000 },
    cableLateral: { ref: 'B', mach: 1, M: [3, 8, 15, 26, 39], F: [2, 6, 11, 18, 26] },
    reverseFly: { ref: 'B', mach: 1, M: [25, 42, 64, 90, 120], F: [11, 19, 30, 44, 59] },
    latPulldown: { ref: 'B', mach: 1, M: [42, 60, 82, 107, 134], F: [23, 34, 47, 63, 80], n: 2011718 },
    cableRow: { ref: 'B', mach: 1, M: [41, 60, 84, 112, 142], F: [22, 33, 48, 65, 84] },
    pushdown: { ref: 'B', mach: 1, M: [19, 34, 54, 79, 107], F: [9, 18, 30, 45, 62] },
    machineCurl: { ref: 'B', mach: 1, M: [22, 37, 55, 78, 103], F: [9, 17, 27, 40, 55], n: 237643 },
    cableCurl: { ref: 'B', mach: 1, M: [17, 31, 49, 71, 97], F: [8, 15, 25, 38, 53] },
    oneCableCurl: { ref: 'B', mach: 1, M: [6, 14, 25, 40, 57], F: [3, 7, 14, 23, 33] },
    legPress: { ref: 'S', mach: 1, M: [96, 153, 227, 316, 414], F: [52, 94, 151, 222, 302], n: 2660000 },
    hackSquat: { ref: 'S', mach: 1, M: [58, 99, 152, 217, 289], F: [26, 53, 92, 142, 200], n: 564866 },
    legExt: { ref: 'S', mach: 1, M: [39, 65, 97, 138, 183], F: [20, 36, 60, 88, 120] },
    seatedLegCurl: { ref: 'D', mach: 1, M: [35, 55, 80, 110, 143], F: [20, 32, 49, 69, 92], n: 457839 },
    lyingLegCurl: { ref: 'D', mach: 1, M: [26, 43, 63, 89, 116], F: [15, 25, 37, 53, 70] },
    calfRaise: { ref: 'S', mach: 1, M: [43, 82, 137, 205, 284], F: [22, 49, 89, 140, 200], n: 350435 },
    seatedCalf: { ref: 'S', mach: 1, M: [28, 54, 91, 137, 190], F: [15, 35, 66, 106, 154] },
    hipAbd: { ref: 'S', mach: 1, M: [34, 59, 92, 132, 178], F: [27, 46, 71, 102, 136] },
    hipAdd: { ref: 'S', mach: 1, M: [38, 64, 99, 142, 190], F: [23, 42, 67, 98, 133] }
  };
  // what a lifter who does `v` kg on the reference lift does on this exercise, matching percentiles in that
  // community: between its five levels in a straight line, and beyond them at the share the end level has
  function slMap(key, sex, v) {
    const e = SL[key], x = SL[e.ref][sex], y = e[sex];
    if (v <= x[0]) return v * y[0] / x[0];
    if (v >= x[4]) return v * y[4] / x[4];
    let i = 0;
    while (v > x[i + 1]) i++;
    return y[i] + (y[i + 1] - y[i]) * (v - x[i]) / (x[i + 1] - x[i]);
  }

  // ---------- which standard an exercise is measured against ----------
  // ref: S squat, B bench, D deadlift, pull (pull-ups: bodyweight + added) or dip (dips: the same); r: a share of
  // that lift; conf: data (the lift itself), est (a free-weight lift, by a typical ratio) or rough (machines, cables);
  // per: hand (each dumbbell), side (one arm or leg at a time) or total (bodyweight plus added)
  const norm = n => String(n || '').toLowerCase().replace(/\s*v\.\s*\d+|\((back|side) pov\)|в°|°/g, '').replace(/\s+/g, ' ').trim();
  // src: the studies behind this exercise's own ratio (machines and the big three get theirs in the app)
  const B = (ref, r, conf, per = '', src) => ({ ref, r, conf, per, ...(src ? { src } : {}) });
  const NOT = why => ({ why });
  // from what lifters log (SL): k scales it for a close variation (then it's an estimate again); conf: logs for a
  // machine or cable measured this way, est for a free-weight lift, rough for a scaled machine
  const L = (key, per = '', k = 1, more = []) => ({ ref: SL[key].ref, r: SL[key].M[2] / SL[SL[key].ref].M[2] * k, sl: key, ...(k !== 1 ? { k } : {}), conf: SL[key].mach ? (k === 1 ? 'logs' : 'rough') : 'est', per, src: ['strengthlevel', ...more] });
  function basis(ex, pattern) {
    const n = norm(ex.name), eq = ex.eq, k = ex.k;
    const one = !!ex.uni || /single|one[- ]arm|one[- ]leg|one hand|\bs\/a\b|\bsa\b|archer/.test(n);
    const machine = eq === 'machine' || eq === 'sled' || eq === 'smith', cable = eq === 'cable', db = eq === 'dumbbell', bar = eq === 'barbell' || eq === 'ezbar';
    if (machine && !one && ['wr'].includes(k)) {
      if (pattern === 'calf' || /calf raise/.test(n)) { if (!/donkey|leg press|squat|hack|smith/.test(n)) return L(/seated/.test(n) ? 'seatedCalf' : 'calfRaise'); }
      else if (pattern === 'hipAbd' || /hip abduct/.test(n)) return L('hipAbd');
      else if (pattern === 'hipAdd' || /hip adduct/.test(n)) return L('hipAdd');
    }
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
    if (/leg press/.test(n)) return one ? L('legPress', 'side', 0.5) : /horizontal|seated|vertical/.test(n) ? L('legPress', '', 0.9) : L('legPress');
    if (pattern === 'legExt') return one ? L('legExt', 'side', 0.5) : L('legExt');
    if (/hack squat/.test(n)) return bar ? B('S', 0.7, 'est') : L('hackSquat');
    if (/pendulum|belt squat/.test(n)) return B('S', 1.1, 'rough');
    if (/split squat|lunge|step-?up|bulgarian|single leg squat|one leg squat|pistol|lateral lunge|cossack/.test(n)) {
      if (db) return B('S', 0.26, 'est', 'hand');
      if (bar) return B('S', 0.55, 'est');
      if (eq === 'smith') return B('S', 0.6, 'rough');
      return NOT('kind');
    }
    if (/goblet|sumo squat/.test(n) && (db || eq === 'kettlebell')) return B('S', 0.42, 'est');
    if (/squat/.test(n)) {
      if (/front|clean-grip|frankenstein/.test(n)) return bar ? L('frontSquat') : eq === 'smith' ? B('S', 0.85, 'rough') : NOT('kind');
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
      if (bar) return /romanian|\brdl\b/.test(n) ? L('rdl') : B('D', 0.75, 'est');
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
    if (pattern === 'legCurl') { const key = /seated/.test(n) ? 'seatedLegCurl' : 'lyingLegCurl'; return machine ? (one ? L(key, 'side', 0.5) : L(key)) : NOT('kind'); }
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
      if (db) return L('dbBench', 'hand', /incline/.test(n) ? 0.9 : /decline/.test(n) ? 1.05 : /floor/.test(n) ? 0.95 : /squeeze|hammer|palm|reverse/.test(n) ? 0.88 : 1, /incline/.test(n) ? ['saeterbakken2011', 'rodriguez2020'] : ['saeterbakken2011']);
      if (eq === 'smith') return B('B', /incline/.test(n) ? 0.85 : /decline/.test(n) ? 1.05 : /close/.test(n) ? 0.9 : 1, 'rough', '', ['saeterbakken2011']);
      if (machine || cable) return one ? L('chestPress', 'side', 0.5) : L('chestPress', '', /incline/.test(n) ? 0.85 : /decline/.test(n) ? 1.05 : /inner/.test(n) ? 0.8 : cable ? 0.9 : 1);
      return NOT('kind');
    }
    if (/reverse fl|rear delt|rear deltoid|reverse pec deck/.test(n)) return machine && !one ? L('reverseFly') : NOT('kind');
    if (pattern === 'fly') {
      if (db) return B('B', 0.17, 'rough', 'hand');
      if (cable) return B('B', 0.17, 'rough', 'side');
      if (machine) return one ? L('machineFly', 'side', 0.5) : L('machineFly');
      return NOT('kind');
    }
    if (pattern === 'pressVertical') {
      if (bar) return /push press/.test(n) ? B('B', 0.78, 'est') : /behind|bradford/.test(n) ? B('B', 0.58, 'est') : /z press/.test(n) ? B('B', 0.55, 'est') : /anti gravity/.test(n) ? NOT('kind') : L('ohp', '', /seated/.test(n) ? 1.04 : 1, ['kilgore', 'saeterbakken2013']);
      if (db) return /cuban|w-press|scott|alternate side/.test(n) ? NOT('kind') : L('dbShoulder', 'hand', /arnold/.test(n) ? 0.9 : 1, ['saeterbakken2013']);
      if (eq === 'smith') return B('B', 0.66, 'rough');
      if (machine) return one ? L('machineShoulder', 'side', 0.5) : L('machineShoulder');
      if (eq === 'kettlebell') return B('B', 0.24, 'rough', 'hand');
      if (eq === 'landmine') return B('B', 0.4, 'rough', 'side');
      return NOT('kind');
    }
    if (pattern === 'lateral') {
      if (/y-raise|lu raise|to front|full can|landmine/.test(n)) return NOT('kind');
      if (db) return L('dbLateral', 'hand');
      if (cable) return L('cableLateral', 'side');
      if (machine) return one ? L('machineLateral', 'side', 0.5) : L('machineLateral');
      return NOT('kind');
    }
    // pulls
    if (pattern === 'row') {
      if (/upright|inverted|renegade|gorilla/.test(n)) return NOT('kind');
      if (/t-?bar/.test(n)) return B('B', 0.9, 'rough');
      if (bar) return B('B', /pendlay/.test(n) ? 0.75 : 0.8, 'est');
      if (db) return one ? B('B', 0.45, 'est', 'hand') : B('B', 0.36, 'est', 'hand');
      if (machine || cable) return one ? L('cableRow', 'side', 0.5) : eq === 'smith' ? B('B', 0.8, 'rough') : cable ? L('cableRow') : L('cableRow', '', 0.97);
      if (eq === 'kettlebell') return B('B', 0.4, 'rough', 'hand');
      return NOT('kind');
    }
    if (pattern === 'pullVertical') {
      if (/assist/.test(n)) return NOT('kind');
      if (machine || cable) return one ? L('latPulldown', 'side', 0.5) : L('latPulldown');
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
      if (bar) return L('barCurl', '', (/preacher|scott/.test(n) ? 0.85 : 1) * rev);
      if (db) return L('dbCurl', 'hand', (/hammer/.test(n) ? 1.1 : /concentration|incline|preacher|spider/.test(n) ? 0.85 : 1) * rev);
      if (cable) return one ? L('oneCableCurl', 'side', rev) : L('cableCurl', '', rev);
      if (machine) return one ? L('machineCurl', 'side', 0.5 * rev) : L('machineCurl', '', rev);
      return NOT('kind');
    }
    if (pattern === 'triLying') return bar ? B('B', 0.38, 'est') : db ? B('B', 0.17, 'est', 'hand') : cable ? B('B', 0.38, 'rough') : NOT('kind');
    if (pattern === 'triOverhead') return db ? (one ? B('B', 0.15, 'est', 'hand') : B('B', 0.3, 'est')) : bar ? B('B', 0.33, 'est') : cable ? (one ? B('B', 0.2, 'rough', 'side') : B('B', 0.4, 'rough')) : machine ? B('B', 0.45, 'rough') : NOT('kind');
    if (pattern === 'triPushdown') return one ? L('pushdown', 'side', 0.5) : L('pushdown');
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
    const f = body * ageFactor(key, +p.age) * (adj > 0 ? 1.25 : adj < 0 ? 0.8 : 1);
    const base = [0, 0.6 * cur[0], 0.8 * cur[0], ...cur];
    if (!b.sl) return base.map(v => v * b.r * f);
    // from lifters' logs: each rank's standard on the reference lift, carried over to this exercise
    const out = base.map(v => slMap(b.sl, sex, v * body) * (b.k || 1) * f / body);
    for (let i = 2; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] * 1.03);
    return out;
  }
  // an exercise's Gold standard as a share of its reference lift's, for a profile ("about 88% of the bench press")
  const share = (b, p) => ladder(b, p)[3] / ladder({ ref: b.ref, r: 1 }, p)[3];
  // where a lift sits: its tier, how far to the next one (0 to 1), and a score (tier + that)
  function place(load, lad) {
    let t = 0;
    while (t < 8 && load >= lad[t + 1]) t++;
    const frac = t === 8 ? 1 : clamp((load - lad[t]) / (lad[t + 1] - lad[t]), 0, 1);
    return { tier: t, frac, score: t + (t === 8 ? 0 : frac), next: t < 8 ? lad[t + 1] : null };
  }

  const f1 = v => +v.toFixed(1);
  function star(cx, cy, r, k = 0.45, n = 5) {
    let d = '';
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * k : r; d += `${i ? 'L' : 'M'}${f1(cx + rr * Math.cos(a))} ${f1(cy + rr * Math.sin(a))}`; }
    return d + 'Z';
  }
  // a four-point glint
  const glint = (x, y, r) => `M${x} ${y - r}Q${x + r * 0.16} ${y - r * 0.16} ${x + r} ${y}Q${x + r * 0.16} ${y + r * 0.16} ${x} ${y + r}Q${x - r * 0.16} ${y + r * 0.16} ${x - r} ${y}Q${x - r * 0.16} ${y - r * 0.16} ${x} ${y - r}Z`;
  // the silhouettes, one per tier, on a 120 × 134 face centred at x = 60
  // ---------- the emblems: faceted crests with depth. Planes of metal lit from the upper left, with thickness, bevels,
  // rivets and a sunk panel; a brilliant-cut gem in a setting at the heart, and a silhouette that climbs with the rank: a plain plaque, then chevrons (the
  // working ranks), stars (the precious ones), then wings, a crown, horns, and at the top a sun and laurels ----------
  const P = pts => pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L');
  const poly = (pts, fill, extra = '') => `<path d="M${P(pts)}Z" fill="${fill}"${extra}/>`;
  const mirror = pts => pts.map(([x, y]) => [120 - x, y]);
  // the right half of each body, top centre to bottom tip; [half-width scale, gem's height, gem's size, gem's sides]
  const BODY = [
    [[60, 26], [80, 26], [90, 36], [90, 84], [80, 96], [60, 102]],
    [[60, 17], [91, 25], [93, 63], [84, 97], [60, 119]],
    [[60, 13], [83, 18], [96, 29], [96, 65], [85, 100], [60, 122]],
    [[60, 9], [70, 18], [97, 25], [97, 66], [86, 102], [60, 125]],
    [[60, 9], [80, 14], [97, 20], [96, 64], [85, 101], [60, 126]],
    [[60, 6], [90, 24], [99, 54], [60, 132]],
    [[60, 17], [93, 25], [95, 65], [84, 101], [60, 125]],
    [[60, 14], [79, 20], [97, 15], [96, 37], [99, 65], [86, 103], [60, 129]],
    // Olympian: a round hoplite shield (an aspis)
    Array.from({ length: 25 }, (_, k) => { const a = (-90 + k * 7.5) * Math.PI / 180; return [60 + 44 * Math.cos(a), 66 + 44 * Math.sin(a)]; })
  ];
  // [half-width scale, the symbol's centre height, the symbol's size, the sides of the gem on the frame]
  const SHAPE = [[1, 64, 0.64, 0], [1, 67, 0.7, 0], [1, 66, 0.72, 0], [1, 70, 0.7, 5], [0.86, 65, 0.62, 6], [0.9, 62, 0.62, 8], [0.78, 71, 0.64, 5], [0.76, 72, 0.65, 6], [1, 66, 0.66, 8]];
  // What each rank stands for, cast in relief on its crest, on the way up: a seedling (everyone starts by growing),
  // an anvil (strength being forged), a barbell (at home under the bar), a flame (the fire's lit), a summit (the peak in
  // sight), a diamond (made under pressure), a trophy (you'd place), Atlas with the sky on his shoulders (carrying what
  // few can) and the temple of Olympus, the home of the gods. Drawn on a 120 x 134 grid around (60, 66): [the solid shapes,
  // lines cut into them]; {d} is the rank's dark shade
  const SYMBOLS = [
    [`<path d="M58.2 98L58.2 66Q60 63.5 61.8 66L61.8 98Z"/><path d="M60 77C45 78 35 68 33 52C48 51 58 61 60 77Z"/><path d="M60 67C61 51 71 42 86 41C87 56 77 66 60 67Z"/><path d="M42 100Q60 89 78 100Z"/>`,
     `<path d="M58 75C50 71 42 63 37 55M62 65C67 58 74 50 81 45" fill="none" stroke="{d}" stroke-opacity=".55" stroke-width="1.5" stroke-linecap="round"/>`],
    [`<path d="M25 55L39 48L88 48L88 59C77 59 71 63 70 71L70 77L83 88L83 96L37 96L37 88L50 77L50 71C49 65 41 61 25 59Z"/><path d="${glint(76, 34, 8)}"/><path d="${glint(60, 37, 4)}"/><path d="${glint(88, 40, 3.2)}"/>`,
     `<path d="M37 88L83 88M39 54L86 54" fill="none" stroke="{d}" stroke-opacity=".5" stroke-width="1.5"/>`],
    [`<rect x="25" y="63" width="70" height="6" rx="2.4"/><rect x="38" y="43" width="10" height="46" rx="3.4"/><rect x="72" y="43" width="10" height="46" rx="3.4"/><rect x="29.5" y="51" width="7" height="30" rx="2.8"/><rect x="83.5" y="51" width="7" height="30" rx="2.8"/>`,
     `<path d="M43 48L43 84M77 48L77 84" fill="none" stroke="{d}" stroke-opacity=".4" stroke-width="1.8"/>`],
    [`<path d="M60 32C63 45 75 52 80 64C86 79 78 95 60 99C42 95 34 80 40 66C43 58 49 55 51 46C56 53 55 60 57 64C58 53 55 43 60 32Z"/>`,
     `<path d="M60 61C64 69 71 74 70 84C69 91 64 95 60 95C54 95 49 90 50 83C51 76 56 74 57 69C59 72 60 75 61 78C62 72 61 67 60 61Z" fill="{d}" stroke="none" opacity=".42"/>`],
    [`<path d="M26 96L42 66L50 76L60 47L70 76L78 66L94 96Z"/><path d="${star(60, 33, 7.5)}"/>`,
     `<path d="M60 47L70 76L66 96L60 96Z" fill="{d}" stroke="none" opacity=".32"/><path d="M54 61L57 64.5L60 61L63 64.5L66 61M38.5 72L41 74.5L43.5 72L46 75M74 75L76.5 72L79 74.5L81.5 72" fill="none" stroke="{d}" stroke-opacity=".55" stroke-width="1.4" stroke-linejoin="round"/>`],
    [`<path d="M36 55L46 40L74 40L84 55L60 94Z"/>`,
     `<path d="M36 55L84 55M46 40L54 55L60 94M74 40L66 55L60 94M54 55L60 40L66 55" fill="none" stroke="{d}" stroke-opacity=".5" stroke-width="1.5" stroke-linejoin="round"/>`],
    [`<path d="M42 42L78 42L77 58C76 72 69 79 60 80C51 79 44 72 43 58Z"/><path d="M42 47C31 47 30 63 45 67M78 47C89 47 90 63 75 67" fill="none" stroke-width="4"/><path d="M55.5 80L64.5 80L65.5 89L54.5 89Z"/><rect x="45" y="89" width="30" height="8" rx="2.2"/>`,
     `<path d="${star(60, 58, 7.2)}" fill="{d}" stroke="none" opacity=".5"/><path d="M46 46L74 46" fill="none" stroke="{d}" stroke-opacity=".4" stroke-width="1.3"/>`],
    [`<circle cx="60" cy="49" r="17"/><path d="M34 99C33 84 38 75 46 71L39 59L46 55L54 68L66 68L74 55L81 59L74 71C82 75 87 84 86 99L74 99C74 90 71 84 66 82L54 82C49 84 46 90 46 99Z"/>`,
     `<g fill="none" stroke="{d}" stroke-opacity=".5" stroke-width="1.4"><ellipse cx="60" cy="49" rx="7.2" ry="17"/><path d="M43 49L77 49M45.5 41L74.5 41M45.5 57L74.5 57"/></g>`],
    [`<path d="M60 29L96 49L24 49Z"/><rect x="22" y="50.5" width="76" height="4.6" rx=".8"/><rect x="25.5" y="56.3" width="69" height="3.8" rx=".6"/>${[34, 51.3, 68.7, 86].map(x => `<rect x="${x - 5}" y="61.2" width="10" height="3" rx=".6"/><rect x="${x - 3.5}" y="64.2" width="7" height="25" rx=".8"/><rect x="${x - 5}" y="89.2" width="10" height="2.6" rx=".6"/>`).join('')}<rect x="23" y="92.6" width="74" height="4" rx=".7"/><rect x="18" y="97.6" width="84" height="4.4" rx=".8"/>`,
     `<path d="M60 34.5L87 48.5L33 48.5Z" fill="none" stroke="{d}" stroke-opacity=".5" stroke-width="1.1" stroke-linejoin="round"/><path d="M62.2 36.8L56 43.8L59.6 43.8L57.4 48L64.3 41.2L60.7 41.2L63 36.8Z" fill="{d}" opacity=".7"/><path d="${[34, 51.3, 68.7, 86].map(x => `M${x - 1.6} 65.5V88M${x + 1.6} 65.5V88`).join('')}M22 55.3H98M25.5 60.3H94.5" fill="none" stroke="{d}" stroke-opacity=".45" stroke-width=".8"/>`]
  ];

  // a brilliant-cut stone in a metal setting: a bezel, two rings of facets (each as light as it faces the light, the
  // inner ring turned half a step), a bright table, and glints
  function gemCut(u, x, y, r, n, base, rot, metal, small) {
    const pt = (k, rr, off = 0) => { const a = (rot + (k + off) * 360 / n) * Math.PI / 180; return [x + rr * Math.cos(a), y + rr * Math.sin(a)]; };
    const ring = rr => Array.from({ length: n }, (_, k) => pt(k, rr));
    const shade = (ang, k = 1) => { const lit = 0.5 + 0.5 * Math.cos(ang + Math.PI * 0.75); return lit > 0.5 ? mixc(base, '#FFFFFF', (lit - 0.5) * 1.25 * k) : mixc(base, '#000000', (0.5 - lit) * 1.35 * k); };
    let out = '';
    if (!small) out += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 1.7)}" fill="url(#${u}gg)"/>`;
    // the setting: a dark seat, a bevelled collar
    out += poly(ring(r + 4.2), metal[2], ` stroke="${mixc(metal[2], '#000000', 0.55)}" stroke-width="1" stroke-linejoin="round"`) + poly(ring(r + 3.2), `url(#${u}L)`) + poly(ring(r + 1.5), mixc(metal[2], '#000000', 0.6));
    for (let k = 0; k < n; k++) {
      const mid = (rot + (k + 0.5) * 360 / n) * Math.PI / 180;
      out += poly([pt(k, r), pt(k + 1, r), pt(k, r * 0.7, 0.5)], shade(mid));
      out += poly([pt(k, r), pt(k, r * 0.7, 0.5), pt(k, r * 0.7, -0.5)], shade((rot + k * 360 / n) * Math.PI / 180, 0.7));
      out += poly([pt(k, r * 0.7, 0.5), pt(k, r * 0.7, -0.5), pt(k, r * 0.4)], shade((rot + k * 360 / n) * Math.PI / 180 + 0.5, 0.55));
      out += poly([pt(k, r * 0.7, 0.5), pt(k, r * 0.4), pt(k + 1, r * 0.4)], shade(mid + 0.4, 0.85));
    }
    out += poly(ring(r * 0.4), `url(#${u}gt)`) + `<path d="M${P(ring(r))}Z" fill="none" stroke="${mixc(base, '#000000', 0.65)}" stroke-width=".8" stroke-linejoin="round"/>`;
    out += `<path d="M${P([pt(0, r * 0.4), pt(1, r * 0.4), pt(0, r * 0.7, 0.5)])}Z" fill="#FFFFFF" opacity=".55"/><path d="${glint(f1(x - r * 0.3), f1(y - r * 0.34), f1(r * 0.36))}" fill="#FFFFFF"/>`;
    if (!small) out += `<path d="${glint(f1(x + r * 0.42), f1(y + r * 0.3), f1(r * 0.16))}" fill="#FFFFFF" opacity=".85"/>`;
    return out;
  }
  function emblem(i, uid, label, small, fx) {
    const t = TIERS[i], [hi, mid, lo] = t.c, u = 're' + uid, deep = mixc(lo, '#000000', 0.55), pit = mixc(lo, '#000000', 0.78), [sx, gy, gr, gn] = SHAPE[i];
    const R = BODY[i].map(([x, y]) => [60 + (x - 60) * sx, y]), L = mirror(R), top = R[0], tip = R[R.length - 1], cy = (top[1] + tip[1]) / 2;
    const full = [...R, ...L.slice(1, -1).reverse()], inset = (pts, s) => pts.map(([x, y]) => [60 + (x - 60) * s, cy + (y - cy) * s]);
    const ring = s => [...inset(R, s), ...inset(L, s).slice(1, -1).reverse()], dFull = `M${P(full)}Z`;
    const lg = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${u}${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
    const gem = i <= 2 ? mid : t.glow;
    const defs = `<defs>${lg('L', [[0, mixc(hi, '#FFFFFF', 0.45)], [0.35, hi], [1, mid]])}${lg('R', [[0, mid], [0.55, lo], [1, mixc(lo, '#000000', 0.4)]])}${lg('rf', [[0, '#FFFFFF'], [1, hi]])}${lg('bev', [[0, '#FFFFFF', 0.95], [0.45, '#FFFFFF', 0.1], [0.55, '#000000', 0.1], [1, '#000000', 0.6]], 1, 1)}${lg('gl', [[0, '#FFFFFF', 0.55], [1, '#FFFFFF', 0]])}${lg('wf', [[0, mixc(hi, '#FFFFFF', 0.5)], [0.5, hi], [1, mid]])}${lg('wd', [[0, lo], [1, mixc(lo, '#000000', 0.5)]])}
      <radialGradient id="${u}pan" cx=".62" cy=".7" r=".9"><stop offset="0" stop-color="${mixc(lo, '#000000', 0.3)}"/><stop offset=".6" stop-color="${mixc(lo, '#000000', 0.62)}"/><stop offset="1" stop-color="${pit}"/></radialGradient>
      <radialGradient id="${u}gg"><stop offset="0" stop-color="${gem}" stop-opacity=".7"/><stop offset="1" stop-color="${gem}" stop-opacity="0"/></radialGradient>
      <radialGradient id="${u}gt" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="${mixc(gem, '#FFFFFF', 0.55)}"/><stop offset="1" stop-color="${gem}"/></radialGradient>
      <linearGradient id="${u}sg" gradientUnits="userSpaceOnUse" x1="40" y1="34" x2="80" y2="102"><stop offset="0" stop-color="${mixc(hi, '#FFFFFF', 0.55)}"/><stop offset=".45" stop-color="${hi}"/><stop offset="1" stop-color="${mixc(mid, hi, 0.25)}"/></linearGradient>
      ${small ? '' : `<filter id="${u}rel" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.4" result="b"/><feSpecularLighting in="b" surfaceScale="2.6" specularConstant="1" specularExponent="18" lighting-color="#FFFFFF" result="s"><feDistantLight azimuth="225" elevation="40"/></feSpecularLighting><feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/><feComposite in="SourceGraphic" in2="s2" operator="arithmetic" k1="0" k2="1" k3=".9" k4="0"/></filter>`}
      <radialGradient id="${u}aura" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${t.glow}" stop-opacity=".75"/><stop offset=".6" stop-color="${t.glow}" stop-opacity=".2"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>
      <clipPath id="${u}cb"><path d="${dFull}"/></clipPath><clipPath id="${u}cp"><path d="M${P(ring(0.74))}Z"/></clipPath>
      ${small ? '' : `<filter id="${u}ds" x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="0" dy="3.2" stdDeviation="2.6" flood-color="#000" flood-opacity=".5"/></filter>`}
      ${fx ? `<clipPath id="${u}fr"><path d="${dFull}"/></clipPath>${lg('sh', [[0, '#FFFFFF', 0], [0.5, '#FFFFFF', 0.9], [1, '#FFFFFF', 0]], 1, 0)}` : ''}</defs>`;
    const edge = ` stroke="${deep}" stroke-width="1.1" stroke-linejoin="round"`;
    let back = '', body = '', front = '';
    if (!small && i >= 3) back += `<circle cx="60" cy="66" r="${60 + i * 3}" fill="url(#${u}aura)"/>`;
    // Olympian: a glory of rays behind the shield
    if (i === 8) {
      let rays = '';
      for (let k = 0; k < 32; k++) { const a = k * Math.PI / 16, w = k % 2 ? 0.05 : 0.075, r1 = k % 4 === 0 ? 70 : k % 2 ? 58 : 64; rays += `M${f1(60 + 46 * Math.cos(a - w))} ${f1(66 + 46 * Math.sin(a - w))}L${f1(60 + r1 * Math.cos(a))} ${f1(66 + r1 * Math.sin(a))}L${f1(60 + 46 * Math.cos(a + w))} ${f1(66 + 46 * Math.sin(a + w))}Z`; }
      back += `<path d="${rays}" fill="url(#${u}wf)" stroke="${lo}" stroke-width=".6" stroke-linejoin="round"/>`;
    }
    // wings: feathers swept up and back from the shoulders, longest at the top; each casts a shadow on the one below,
    // is lit above its spine and in shade below, and carries a quill. Diamond's are straight shards of crystal
    const WING = { 4: [3, 36, -58, 21, 9], 5: [3, 33, -46, 26, 7.5], 6: [4, 47, -62, 18, 11], 7: [5, 51, -64, 16, 11.5] }[i];
    if (WING) {
      const [n, len, a0, step, w] = WING, dx = 27 * sx + 3, y0 = top[1] + 24, crystal = i === 5;
      for (let k = n - 1; k >= 0; k--) {
        const a = (a0 + k * step) * Math.PI / 180, l = len * (1 - k * 0.14), ry = y0 + k * 9, tx = dx + l * Math.cos(a), ty = ry + l * Math.sin(a);
        const c1 = [dx + l * 0.55 * Math.cos(a - (crystal ? 0 : 0.42)), ry + l * 0.55 * Math.sin(a - (crystal ? 0 : 0.42)) - w * 0.35], c2 = [dx + l * 0.5 * Math.cos(a + (crystal ? 0 : 0.3)), ry + l * 0.5 * Math.sin(a + (crystal ? 0 : 0.3)) + w * 0.3];
        for (const sgn of [1, -1]) {
          const X = v => f1(60 + sgn * v), whole = `M${X(dx - 4)} ${f1(ry - w * 0.7)}Q${X(c1[0])} ${f1(c1[1])} ${X(tx)} ${f1(ty)}Q${X(c2[0])} ${f1(c2[1])} ${X(dx - 4)} ${f1(ry + w * 0.7)}Z`;
          if (!small) back += `<path d="${whole}" transform="translate(${sgn * 1.2} 3)" fill="#000000" opacity=".35"/>`;
          back += `<path d="${whole}" fill="url(#${u}wd)"${edge}/><path d="M${X(dx - 4)} ${f1(ry - w * 0.7)}Q${X(c1[0])} ${f1(c1[1])} ${X(tx)} ${f1(ty)}L${X(dx - 4)} ${f1(ry + 0.5)}Z" fill="url(#${u}wf)"/><path d="M${X(dx - 3)} ${f1(ry + 0.3)}L${X(tx)} ${f1(ty)}" fill="none" stroke="#FFFFFF" stroke-opacity=".65" stroke-width=".8" stroke-linecap="round"/>`;
          if (!small && !crystal) back += `<path d="M${X(dx + l * 0.3 * Math.cos(a))} ${f1(ry + l * 0.3 * Math.sin(a))}L${X(c1[0] * 0.55 + (dx + l * 0.3 * Math.cos(a)) * 0.45)} ${f1(c1[1] * 0.55 + (ry + l * 0.3 * Math.sin(a)) * 0.45)}M${X(dx + l * 0.6 * Math.cos(a))} ${f1(ry + l * 0.6 * Math.sin(a))}L${X((c1[0] + tx) / 2)} ${f1((c1[1] + ty) / 2 + 1)}" fill="none" stroke="${lo}" stroke-opacity=".55" stroke-width=".7"/>`;
        }
      }
    }
    // horns (Titan): curved, ridged
    if (i === 7) for (const sgn of [1, -1]) { const X = v => f1(60 + sgn * v); back += `<path d="M${X(13)} 23Q${X(30)} 16 ${X(40)} -5Q${X(41)} 16 ${X(31)} 31Z" fill="url(#${u}wd)"${edge}/><path d="M${X(13)} 23Q${X(30)} 16 ${X(40)} -5Q${X(33)} 12 ${X(22)} 27Z" fill="url(#${u}wf)"/><path d="M${X(22)} 19L${X(27)} 28M${X(29)} 13L${X(34)} 22M${X(35)} 5L${X(38)} 12" fill="none" stroke="${deep}" stroke-opacity=".7" stroke-width="1"/>`; }
    // Champion's crown: a band of points with a gem on each, lit on the left
    if (i === 6) {
      const c = [[41, 25], [38, 8], [50, 16], [60, 1], [70, 16], [82, 8], [79, 25]];
      back += poly(c.map(([x, y]) => [x, y + 2.5]), pit) + poly(c, `url(#${u}R)`, edge) + poly(c.filter(([x]) => x <= 60).concat([[60, c[0][1]]]), `url(#${u}L)`) + `<path d="M${P(c.slice(1, -1))}" fill="none" stroke="#FFFFFF" stroke-opacity=".7" stroke-width=".8" stroke-linejoin="round"/><path d="M${c[0][0] + 1} ${c[0][1] - 4}H${c[c.length - 1][0] - 1}" stroke="${deep}" stroke-opacity=".6" stroke-width="1"/>`;
      back += c.filter((_, k) => k % 2 === 1).map(([x, y]) => `<circle cx="${x}" cy="${f1(y - 1)}" r="2.6" fill="${t.glow}" stroke="${deep}" stroke-width=".8"/><circle cx="${f1(x - 0.8)}" cy="${f1(y - 1.9)}" r=".9" fill="#FFFFFF"/>`).join('');
    }
    // the body: its thickness below it, a lit half and a shaded half, a bright roof, a ridge down the middle, a bevel
    // all round, rivets and an engraved line on the frame, then a sunk panel with the rim's shadow inside it
    const roof = [top, R[1], [60, R[1][1] + 13], L[1]];
    body += `<path d="${dFull}" transform="translate(0 4.2)" fill="${pit}" stroke="${pit}" stroke-width="2.6" stroke-linejoin="round"/><path d="${dFull}" fill="${deep}" stroke="${deep}" stroke-width="2.6" stroke-linejoin="round"/>`;
    body += poly([...L], `url(#${u}L)`) + poly([...R], `url(#${u}R)`) + (i === 8 ? `<ellipse cx="48" cy="46" rx="30" ry="22" fill="#FFFFFF" opacity=".16" clip-path="url(#${u}cb)"/>` : poly(roof, `url(#${u}rf)`) + poly([top, R[1], [60, R[1][1] + 13]], mixc(hi, mid, 0.5)));
    body += `${i === 8 ? '' : `<path d="M60 ${f1(R[1][1] + 13)}L60 ${f1(tip[1])}" stroke="#FFFFFF" stroke-opacity=".3" stroke-width=".9"/>`}<path d="M${P(ring(0.95))}Z" fill="none" stroke="url(#${u}bev)" stroke-width="2.2" stroke-linejoin="round"/>`;
    if (!small) {
      body += `<path d="M${P(ring(0.855))}Z" fill="none" stroke="${deep}" stroke-opacity=".55" stroke-width=".9" stroke-linejoin="round"/><path d="M${P(ring(0.835))}Z" fill="none" stroke="#FFFFFF" stroke-opacity=".22" stroke-width=".7" stroke-linejoin="round"/>`;
      // Olympian's rim: a Greek key running all the way round, cut in (a dark line with a lit edge below it)
      if (i === 8) {
        const N = 18, r2 = 40.2, r1 = 34.6, at = (u, v) => { const a = (-90 + u * 360 / N) * Math.PI / 180, r = r2 - v * (r2 - r1); return `${f1(60 + r * Math.cos(a))} ${f1(66 + r * Math.sin(a))}`; };
        let d = '';
        for (let k = 0; k < N; k++) d += `M${at(k, 1)}L${at(k, 0)}L${at(k + 0.78, 0)}L${at(k + 0.78, 0.75)}L${at(k + 0.3, 0.75)}L${at(k + 0.3, 0.38)}L${at(k + 0.54, 0.38)}M${at(k, 1)}L${at(k + 1, 1)}`;
        body += `<path d="${d}" transform="translate(.35 .5)" fill="none" stroke="#FFFFFF" stroke-opacity=".35" stroke-width=".9" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${deep}" stroke-opacity=".8" stroke-width=".9" stroke-linejoin="round"/>`;
      }
      const rv = i === 8 ? [] : inset([R[1], R[R.length - 2]], 0.87);
      body += [...rv, ...mirror(rv)].map(([x, y]) => `<circle cx="${f1(x)}" cy="${f1(y + 0.6)}" r="2.1" fill="${pit}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="1.9" fill="url(#${u}L)" stroke="${deep}" stroke-width=".6"/><circle cx="${f1(x - 0.6)}" cy="${f1(y - 0.6)}" r=".6" fill="#FFFFFF"/>`).join('');
    }
    body += poly(ring(0.74), `url(#${u}pan)`, ` stroke="${deep}" stroke-width="1.3" stroke-linejoin="round"`);
    body += `<g clip-path="url(#${u}cp)"><path d="M${P(inset(L, 0.74))}" fill="none" stroke="#000000" stroke-opacity=".6" stroke-width="5" stroke-linejoin="round"/><path d="M${P(inset(L, 0.74).slice(0, 3))}" transform="translate(0 2)" fill="none" stroke="#000000" stroke-opacity=".35" stroke-width="6"/></g><path d="M${P(inset(R, 0.74).slice(1))}" fill="none" stroke="${hi}" stroke-opacity=".8" stroke-width="1" stroke-linejoin="round"/>`;
    body += `<path d="M${P(ring(0.6))}Z" fill="none" stroke="${hi}" stroke-opacity=".22" stroke-width=".8" stroke-linejoin="round"/>`;
    if (i === 0) body += `<path d="M44 40C47 56 43 74 46 92M74 38C71 54 76 70 73 90M52 34C54 44 51 52 53 60" fill="none" stroke="${hi}" stroke-opacity=".28" stroke-width="1.1"/>`;
    if (i === 5) { const a = inset(R, 0.74), b = inset(L, 0.74); body += `<path d="M${P([a[0], [60, gy - 6], a[2]])}M${P([b[1], [60, gy - 6], b[2]])}M${P([[60, gy - 6], a[3]])}" fill="none" stroke="${hi}" stroke-opacity=".3" stroke-width=".9"/>`; }
    // polished metal: a soft light across the upper part
    if (!small) body += `<path d="M-10 -10H130V${f1(cy - 14)}C92 ${f1(cy + 2)} 34 ${f1(cy - 30)} -10 ${f1(cy - 8)}Z" fill="url(#${u}gl)" opacity=".36" clip-path="url(#${u}cb)"/>`;
    // the symbol, cast in relief: its shadow on the panel, a dark edge, the metal (lit from the upper left), then the
    // lines cut into it
    const [base, lines] = SYMBOLS[i], tr = `translate(60 ${gy}) scale(${gr}) translate(-60 -66)`;
    front += `<g transform="translate(0.6 ${small ? 1.4 : 2.4}) ${tr}" fill="#000000" stroke="#000000" stroke-width="2" opacity=".6">${base}</g>`;
    front += `<g transform="${tr}" fill="${deep}" stroke="${deep}" stroke-width="${small ? 3.2 : 2.6}" stroke-linejoin="round">${base}</g>`;
    front += `<g${small ? '' : ` filter="url(#${u}rel)"`}><g transform="${tr}" fill="url(#${u}sg)" stroke="url(#${u}sg)" stroke-width=".6" stroke-linejoin="round">${base}</g></g>`;
    if (!small) front += `<g transform="${tr}">${lines.replace(/\{d\}/g, deep)}</g>`;
    // Olympian's olive wreath, the crown of a victor at the ancient Games: two branches round the shield, with olives,
    // tied at the foot with a ribbon
    if (i === 8) {
      let stem = '', leaves = '', olives = '';
      for (const sgn of [1, -1]) {
        const X = x => f1(sgn > 0 ? x : 120 - x), r = 50;
        stem += `M${X(60 + r * Math.cos(84 * Math.PI / 180))} ${f1(66 + r * Math.sin(84 * Math.PI / 180))}A${r} ${r} 0 0 0 ${X(60 + r * Math.cos(-44 * Math.PI / 180))} ${f1(66 + r * Math.sin(-44 * Math.PI / 180))}`;
        for (let k = 0; k < 9; k++) {
          const th = (80 - k * 14.5) * Math.PI / 180, sx_ = 60 + r * Math.cos(th), sy = 66 + r * Math.sin(th), tx = Math.sin(th), ty = -Math.cos(th), sc = 1 - k * 0.045;
          for (const side of [1, -1]) {
            const cx = sx_ + tx * 3.4 * sc + Math.cos(th) * side * 3.6 * sc, cyy = sy + ty * 3.4 * sc + Math.sin(th) * side * 3.6 * sc;
            const ang = Math.atan2(ty, tx) * 180 / Math.PI - 90 + side * 30;
            leaves += `<ellipse cx="${X(cx)}" cy="${f1(cyy)}" rx="${f1(2.3 * sc)}" ry="${f1(6.6 * sc)}" transform="rotate(${f1(sgn > 0 ? ang : -ang)} ${X(cx)} ${f1(cyy)})"/>`;
          }
          if (k % 3 === 1) olives += `<circle cx="${X(sx_ + Math.cos(th) * 6.5)}" cy="${f1(sy + Math.sin(th) * 6.5)}" r="1.9"/>`;
        }
      }
      back += `<path d="${stem}" fill="none" stroke="${deep}" stroke-width="2.4" stroke-linecap="round"/><path d="${stem}" fill="none" stroke="${mid}" stroke-width="1.2" stroke-linecap="round"/>`;
      back += `<g fill="url(#${u}R)" stroke="${deep}" stroke-width=".6">${leaves}</g><g fill="${mixc(mid, lo, 0.5)}" stroke="${deep}" stroke-width=".5">${olives}</g>`;
      back += `<path d="M60 113L49 127L53 128L57 123L60 128L63 123L67 128L71 127Z" fill="url(#${u}R)" stroke="${deep}" stroke-width=".8" stroke-linejoin="round"/><ellipse cx="60" cy="114.5" rx="5" ry="3.4" fill="url(#${u}L)" stroke="${deep}" stroke-width=".8"/>`;
    }
    // from Gold up, a cut gem set in the frame above the panel
    if (gn) front += gemCut(u, 60, top[1] + (i === 5 ? 12 : 10.5), i === 5 ? 6.6 : 6, gn, gem, -90, t.c, small);
    const sparks = !small && i >= 5 ? `<g fill="#FFFFFF">${[[16, 16, 4.6], [105, 10, 3.8], [110, 104, 4.2], [10, 98, 3.2]].map(([x, y, r]) => `<path d="${glint(x, y, r)}"/>`).join('')}</g>` : '';
    const shine = fx ? `<g clip-path="url(#${u}fr)"><rect class="emb-shine" x="-40" y="-10" width="34" height="160" fill="url(#${u}sh)"/></g>` : '';
    return `<svg class="rank-emb" viewBox="-6 -6 132 146" role="img" aria-label="${label || t.name}" overflow="visible" data-shape="${i}">${defs}${back}<g${small ? '' : ` filter="url(#${u}ds)"`}>${body}${front}</g>${shine}${sparks}</svg>`;
  }
  function mixc(a, b, t) { const p = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, k) => Math.round(v * (1 - t) + B[k] * t).toString(16).padStart(2, '0')).join(''); }
  return { TIERS, FITS, REFS, SOURCES, SL, share, basis, ladder, place, ageFactor, emblem };
})();
