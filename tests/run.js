// Runs every test file, one after another, and sums up. `npm test`, or `node tests/run.js quick` to skip the slow
// ones (layout at three widths in two styles, and the random-tapping stress run), or name files: `node tests/run.js logging`
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const SLOW = ['layout', 'stress'];
const args = process.argv.slice(2), quick = args.includes('quick'), only = args.filter(a => a !== 'quick');
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js'))
  .filter(f => !only.length || only.some(o => f.startsWith(o)))
  .filter(f => !quick || !SLOW.some(s => f.startsWith(s)));
const results = [];
const t0 = Date.now();
for (const f of files) {
  const t = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit', env: process.env });
  results.push([f, r.status, Math.round((Date.now() - t) / 1000)]);
}
console.log('\n' + results.map(([f, s, sec]) => `${s === 0 ? '✓' : '✗'} ${f.replace('.test.js', '')} (${sec}s)`).join('\n'));
const failed = results.filter(([, s]) => s !== 0);
console.log(`\n${results.length - failed.length} of ${results.length} test files passed in ${Math.round((Date.now() - t0) / 1000)}s`);
process.exit(failed.length ? 1 : 0);
