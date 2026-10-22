/* Lifting Sanity in more than one language: English, as written in the app, and Arabic (ar.js).
   The language is settled here, before the page draws, so Arabic starts right-to-left with no flash.
   T('Text with {name}', { name }) gives the text in the chosen language; TN(n, '{n} set', '{n} sets') picks the
   right plural form (Arabic has six). Anything without a translation shows in English. */
(function () {
  const KEY = 'liftingsanity:lang';
  let lang = null;
  try { lang = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
  if (lang !== 'ar' && lang !== 'en') {
    // first time on this device: follow the phone's language (a log that's already here stays as it was)
    let saved = null;
    try { saved = localStorage.getItem('liftingsanity:data:v1'); } catch (e) { /* storage blocked */ }
    lang = !saved && /^ar\b/i.test(navigator.language || '') ? 'ar' : 'en';
  }
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  const plural = lang === 'ar' && window.Intl && Intl.PluralRules ? new Intl.PluralRules('ar') : null;
  const fill = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)) : s);
  const dict = () => (lang === 'ar' && window.LS_AR) || null;
  window.LANG = lang;
  window.RTL = lang === 'ar';
  // two more choices in Arabic (Settings), both off to start: exercise names in Arabic, and units and gym terms
  // (kg, RIR, 1RM, set letters…) in Arabic; off, they look the way they do in gyms and videos
  const pref = k => { try { return localStorage.getItem('liftingsanity:' + k) === '1'; } catch (e) { return false; } };
  window.AR_NAMES = lang === 'ar' && pref('arNames');
  window.AR_TERMS = lang === 'ar' && pref('arTerms');
  // with Arabic terms, a few sentences have a version without the English terms in them
  const full = () => (window.AR_TERMS && window.LS_AR_FULL) || null;
  // dates and times in the language, always with 0–9 digits (the same digits you type weights in)
  window.LOC = lang === 'ar' ? 'ar-u-nu-latn' : undefined;
  window.T = (s, v) => { const f = full(), d = dict(), t = f && typeof f[s] === 'string' ? f[s] : d && typeof d[s] === 'string' ? d[s] : s; return fill(t, v); };
  // a word that needs a different translation in one place (a narrow column heading): TC('Set', 'column')
  window.TC = (s, ctx, v) => { const d = dict(), t = d && d[s + '|' + ctx]; return typeof t === 'string' ? fill(t, v) : window.T(s, v); };
  window.TN = (n, one, other, v) => {
    const vars = Object.assign({ n }, v), f = full(), d = dict(), forms = (f && f[one]) || (d && d[one]);
    if (forms && typeof forms === 'object' && plural) return fill(forms[plural.select(n)] || forms.other, vars);
    return fill(n === 1 ? one : other, vars);
  };
  window.setLang = l => { try { localStorage.setItem(KEY, l); } catch (e) { /* storage blocked */ } };
  window.setPref = (k, on) => { try { localStorage.setItem('liftingsanity:' + k, on ? '1' : '0'); } catch (e) { /* storage blocked */ } };
})();
