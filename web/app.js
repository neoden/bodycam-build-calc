(function () {
  const { fmt, pct } = Core;
  const { t, tx } = I18N;
  const C = Core.init(window.BODYCAM_DATA), D = C.D;
  const $ = id => document.getElementById(id);
  const el = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v != null) e.setAttribute(k, v);
    }
    for (const k of kids) if (k != null) e.append(k);
    return e;
  };
  const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
                  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  I18N.setLang(store.get('lang', I18N.DEFAULT));

  // Goals are picked as chips: click cycles off → important → top priority. Each goal covers the attributes the game shows as one stat.
  const GOALS = [
    ['ads', ['ADSSpeed']], ['draw', ['SwitchSpeed']], ['reload', ['ReloadTime']],
    ['vrec', ['VerticalRecoil', 'CameraRecoilStepVertical']], ['hrec', ['HorizontalRecoil', 'CameraRecoilStepHorizontal']],
    ['kick', ['KickUp', 'KickHip']], ['hip', ['SpreadHipX']], ['mag', ['AmmoCapacity']],
  ];
  const LEVEL_W = [0, 1, 3];
  const PRESETS = {
    maxAds: { ads: 2 }, minRecoil: { vrec: 2, hrec: 2, kick: 1 }, runner: { ads: 2, draw: 2, reload: 1 },
    hipfire: { hip: 2, kick: 1, draw: 1 }, balance: { ads: 1, vrec: 1, hrec: 1, reload: 1 },
  };
  const goalFromLevels = lv => GOALS.filter(([k]) => lv[k]).map(([k, attrs]) => ({ attrs, w: LEVEL_W[lv[k]] }));

  const S = { w: null, build: {}, slot: null, lvl: store.get('goalLvl', {}), goal: [], sort: { key: 'score', dir: -1 }, q: '', saved: store.get('saved', []), base: null };
  const slotName = s => tx('slot', s) || s;
  const goalActive = () => S.goal.length > 0;

  // ---------- URL hash <-> state
  function saveHash() {
    const p = new URLSearchParams(); p.set('w', S.w.id);
    const st = C.stockBuild(S.w);
    for (const [s, id] of Object.entries(S.build)) if (id !== st[s]) p.set(s, id || '-');
    history.replaceState(null, '', '#' + p.toString());
  }
  // A link with a build in its hash wins; without one the last state kept in localStorage is restored.
  function loadHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const st = p.has('w') ? null : store.get('state', null);
    const w = C.weapon[p.get('w')] || (st && C.weapon[st.w]) || D.weapons.find(x => x.id === 'M4A1') || D.weapons[0];
    // a shared build may use attachments the game hides: show them, otherwise they would silently drop out of the build
    if (!C.opt.showHidden && [...p.values()].some(v => C.att[v] && C.att[v].avail === false)) $('showHidden').checked = C.opt.showHidden = true;
    setWeapon(w, false);
    const saved = st && st.w === w.id && st.build || null;
    for (const s of C.slots(w)) {
      let v;
      if (saved) { if (!(s.slot in saved)) continue; v = saved[s.slot]; }
      else { if (!p.has(s.slot)) continue; v = p.get(s.slot) === '-' ? null : p.get(s.slot); }
      if (v === null) S.build[s.slot] = null; else if (s.options.some(a => a.id === v)) S.build[s.slot] = v;
    }
  }
  // ---------- localStorage: everything needed to reopen the page as it was left
  function persist() {
    store.set('state', { w: S.w.id, build: S.build, slot: S.slot, sort: S.sort, base: S.base,
      showCos: $('showCos').checked, showHidden: $('showHidden').checked, allSlots: $('allSlots').checked });
  }
  function restoreUi() {                 // options that must be in place before the build is loaded
    const st = store.get('state', null) || {};
    $('showCos').checked = !!st.showCos; $('showHidden').checked = C.opt.showHidden = !!st.showHidden; $('allSlots').checked = !!st.allSlots;
    if (st.sort && typeof st.sort.key === 'string' && (st.sort.dir === 1 || st.sort.dir === -1)) S.sort = { key: st.sort.key, dir: st.sort.dir };
    if (S.saved.some(b => b.id === st.base)) S.base = st.base;
    return st;
  }

  function setWeapon(w, render = true) {
    S.w = w; S.build = C.stockBuild(w);
    const sl = C.slots(w).filter(s => s.hasStats);
    S.slot = sl.length ? sl[0].slot : null;
    $('weapon').value = w.id; $('adsBase').value = store.get('ads:' + w.id, '') || '';
    if (render) renderAll();
  }

  // ---------- slots panel
  function renderSlots() {
    const box = $('slots'); box.replaceChildren();
    const showCos = $('showCos').checked;
    const en = C.enabled(S.w, S.build);
    for (const s of C.slots(S.w)) {
      if (!s.hasStats && !s.needed && !showCos) continue;
      const prov = en[s.slot] ? [] : [...new Set(C.providers(S.w, s.slot).map(p => slotName(p.slot)))];
      if (!en[s.slot] && !prov.length) continue;          // this weapon can never mount it
      const id = S.build[s.slot], a = id && C.att[id];
      const row = el('div', { class: 'slot' + (s.slot === S.slot ? ' active' : '') + (en[s.slot] ? '' : ' off'),
        title: en[s.slot] ? '' : t('noMountTitle', { slots: prov.join(', ') }), onclick: () => { S.slot = s.slot; $('allSlots').checked = false; renderAll(); } },
        el('span', { class: 'sn' }, `${slotName(s.slot)} · ${s.options.length}`, en[s.slot] ? null : el('span', { class: 'warn' }, t('noMount', { slots: prov.join(', ') }))),
        el('span', { class: 'an' + (a ? '' : ' empty') }, a ? a.name : t('empty'), a && id === s.def ? el('span', { class: 'tagc' }, '  ' + t('stockTag')) : null),
        id !== s.def ? el('button', { class: 'x', title: t('revert'), onclick: e => { e.stopPropagation(); S.build[s.slot] = s.def; renderAll(); } }, '↺') : el('span'));
      box.append(row);
    }
  }

  // ---------- attachments table
  function renderAtts() {
    const all = $('allSlots').checked, slots = C.slots(S.w);
    const stockCap = C.absOf(C.compute(S.w, C.stockBuild(S.w)), 'AmmoCapacity');
    let rows = [];
    for (const s of slots) {
      if (!all && s.slot !== S.slot) continue;
      if (all && !s.hasStats && !s.needed) continue;
      for (const a of s.options) rows.push({ a, s, score: C.score(a, S.goal, stockCap) });
    }
    const known = new Set(slots.filter(s => s.hasStats).map(s => s.slot));   // sockets worth showing: slots that matter for stats
    const en = C.enabled(S.w, S.build), note = $('slotNote');
    if (!all && S.slot && en[S.slot] === false) {
      const pv = C.providers(S.w, S.slot);
      note.textContent = t('slotNote', { slot: slotName(S.slot), list:
        [...new Set(pv.map(p => slotName(p.slot)))].map(sn => `${sn} (${pv.filter(p => slotName(p.slot) === sn).map(p => p.a.name).slice(0, 8).join(', ')}${pv.filter(p => slotName(p.slot) === sn).length > 8 ? '…' : ''})`).join('; ') });
      note.hidden = false;
    } else note.hidden = true;
    const q = S.q.trim().toLowerCase();
    if (q) rows = rows.filter(r => (r.a.name + ' ' + r.a.id + ' ' + r.a.names.join(' ')).toLowerCase().includes(q));
    if ($('dedupe').checked) {          // fold options with identical stats and mounting points into one row
      const groups = new Map();
      for (const r of rows) {
        const k = r.s.slot + '|' + JSON.stringify(r.a.mods.map(m => [m.a, m.op, m.v]).sort()) + '|' + (r.a.sockets || []).join(',');
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(r);
      }
      rows = [...groups.values()].map(g => {
        g.sort((x, y) => x.a.name.localeCompare(y.a.name));
        const lead = g.find(r => S.build[r.s.slot] === r.a.id) || g.find(r => r.a.id === r.s.def) || g[0];
        return { ...lead, same: g.filter(r => r !== lead).map(r => r.a) };
      });
    }
    const attrs = C.cols.filter(c => rows.some(r => C.modOf(r.a, c))).map(c => c.key);
    const val = (a, k) => {            // sortable numeric contribution of attachment a to column k
      const m = C.modOf(a, C.colOf[k]); if (!m) return null;
      return m.op === 'mul' ? m.v - 1 : m.v;
    };
    const useScore = goalActive();
    let { key, dir } = S.sort;
    if (key === 'score' && !useScore) { key = 'name'; dir = 1; }
    if (key !== 'name' && key !== 'score' && key !== 'slot' && !attrs.includes(key)) { key = useScore ? 'score' : 'name'; dir = useScore ? -1 : 1; }
    rows.sort((x, y) => {
      if (key === 'name') return dir * x.a.name.localeCompare(y.a.name);
      if (key === 'slot') return dir * x.s.slot.localeCompare(y.s.slot) || x.a.name.localeCompare(y.a.name);
      const vx = key === 'score' ? x.score : val(x.a, key), vy = key === 'score' ? y.score : val(y.a, key);
      if (vx == null && vy == null) return x.a.name.localeCompare(y.a.name);
      if (vx == null) return 1; if (vy == null) return -1;
      return dir * (vx - vy) || x.a.name.localeCompare(y.a.name);
    });
    const th = (k, text, title) => el('th', { class: k === key ? 'sorted' : '', title, onclick: () => {
      S.sort = S.sort.key === k ? { key: k, dir: -S.sort.dir } : { key: k, dir: k === 'name' || k === 'slot' ? 1 : (C.lowerBetter(k) ? 1 : -1) };
      renderAtts(); persist(); } }, text + (k === key ? (dir > 0 ? ' ▲' : ' ▼') : ''));
    const head = el('tr', {}, th('name', t('thAtt')));
    if (all) head.append(th('slot', t('thSlot')));
    if (useScore) head.append(th('score', t('thScore'), t('scoreTitle')));
    for (const k of attrs) head.append(th(k, short(k), C.label(k) + ' — ' + (C.colOf[k].hidden ? t('notShown') : t('inGame', { name: C.colOf[k].name })) + `\n${C.colOf[k].attrs.join(' + ')}`));
    $('atts').tHead.replaceChildren(head);
    const body = $('atts').tBodies[0]; body.replaceChildren();
    for (const r of rows) {
      const a = r.a, cur = S.build[r.s.slot] === a.id;
      const tr = el('tr', { class: (cur ? 'sel ' : '') + (a.id === r.s.def ? 'def' : ''), title: a.id + (a.names.length > 1 ? '\n' + t('skins', { list: a.names.join(', ') }) : '') + (r.same && r.same.length ? '\n' + t('sameStats', { list: r.same.map(x => x.name).join(', ') }) : ''),
        onclick: () => { S.build[r.s.slot] = cur ? r.s.def : a.id; if (cur && r.s.def === a.id) S.build[r.s.slot] = a.id; renderAll(); } },
        el('td', {}, (cur ? '● ' : '') + a.name, a.avail === false ? el('span', { class: 'aka warn' }, t('hiddenInGame')) : null,
          r.same && r.same.length ? el('span', { class: 'same' }, ' = ' + r.same.slice(0, 5).map(x => x.name).join(', ') + (r.same.length > 5 ? t('andMore', { n: r.same.length - 5 }) : '')) : null,
          (a.sockets || []).some(k => known.has(k)) ? el('span', { class: 'aka sock' }, ' + ' + a.sockets.filter(k => known.has(k)).map(slotName).join(', ')) : null, aka(a)));
      if (all) tr.append(el('td', { class: 'muted' }, slotName(r.s.slot)));
      if (useScore) tr.append(el('td', { class: r.score > 1e-9 ? 'good' : r.score < -1e-9 ? 'bad' : 'muted' }, (r.score * 100).toFixed(1)));
      for (const k of attrs) {
        const m = C.modOf(a, C.colOf[k]);
        if (!m) { tr.append(el('td', { class: 'muted' }, '')); continue; }
        if (m.op === 'mul') {
          const better = (m.v > 1) !== C.lowerBetter(k);
          tr.append(el('td', { class: m.v === 1 ? 'muted' : better ? 'good' : 'bad' }, pct(m.v)));
        } else if (m.op === 'override' && m.v === 0) tr.append(el('td', { class: 'warn', title: t('zeroOverride') }, '⚠ =0'));
        else tr.append(el('td', {}, (m.op === 'add' ? '+' : '=') + fmt(m.v)));
      }
      body.append(tr);
    }
    const total = rows.reduce((n, r) => n + 1 + (r.same ? r.same.length : 0), 0);
    $('attTitle').textContent = (all ? t('allAtts') : slotName(S.slot || '')) + ` · ${rows.length}` + (total > rows.length ? t('ofTotal', { n: total }) : '');
  }
  const short = k => tx('short', k) || k;
  const SPEED = new Set(['ADSSpeed', 'SwitchSpeed', 'ReloadTime']);
  // other in-game names (skins) of the same item — same stats, different name in the game's list
  const aka = a => { const o = a.names.filter(n => n !== a.name); return o.length ? el('span', { class: 'aka' }, ' · ' + o.join(', ')) : null; };

  // ---------- result panel
  function renderStats() {
    // baseline: the stock build of this weapon, or a saved build (possibly of another weapon)
    const ref = S.saved.find(b => b.id === S.base), bw = ref ? C.weapon[ref.w] : S.w;
    const bName = ref ? t('quote', { name: ref.name }) : t('stockTag'), bBuild = ref ? { ...C.stockBuild(bw), ...ref.build } : C.stockBuild(S.w);
    const stock = C.compute(bw, C.effective(bw, bBuild)), cur = C.compute(S.w, C.effective(S.w, S.build));
    const ads = parseFloat($('adsBase').value) || null;
    const ds = C.derived(bw, stock, ref ? parseFloat(store.get('ads:' + bw.id, '')) || null : ads), dc = C.derived(S.w, cur, ads);
    $('thBase').textContent = ref ? ref.name : t('thStock'); $('thDelta').textContent = ref ? t('effectVsIt') : t('effectVsStock');
    const diff = $('diff'); diff.replaceChildren();
    if (ref) {
      diff.append(el('div', { class: 'small muted' }, t('compareWith', { b: bName, w: bw.name })));
      if (bw === S.w) for (const s of C.slots(S.w)) {
        const x = bBuild[s.slot] || null, y = S.build[s.slot] || null;
        if (x !== y && (s.hasStats || s.needed)) diff.append(el('div', { class: 'small' }, `${slotName(s.slot)}: `, el('span', { class: 'muted' }, x ? C.att[x].name : t('emptyWord')), ' → ', y ? C.att[y].name : t('emptyWord')));
      }
    }
    const cards = $('cards'); cards.replaceChildren();
    for (const d of dc) {
      const s = ds.find(x => x.k === d.k), diff = s ? d.v - s.v : 0;
      const cls = Math.abs(diff) < 1e-9 ? 'muted' : (diff * d.better > 0 ? 'good' : 'bad');
      cards.append(el('div', { class: 'card', title: d.range ? t('animRange', { a: fmt(d.range[0]), b: fmt(d.range[1]), n: d.n }) : d.ads ? t('adsTip', { curve: d.ads.curve, t90: fmt(d.ads.t90), len: fmt(d.ads.len) }) : '' },
        el('div', { class: 'l' }, d.label),
        el('div', { class: 'v' }, fmt(d.v), ' ', el('span', { class: 'u' }, d.unit)),
        el('div', { class: 'd ' + cls }, !s ? '' : Math.abs(diff) < 1e-9 ? t('sameAs', { b: bName }) : `${diff > 0 ? '+' : ''}${fmt(diff)} ${ref ? t('vsName', { b: bName }) : t('vsStock')} (${fmt(s.v)})`)));
    }
    const body = $('stats').tBodies[0]; body.replaceChildren();
    const keys = C.cols.filter(c => C.merged(stock, c) || C.merged(cur, c)).map(c => c.key);
    const show = x => !x ? '±0%' : x.abs != null ? fmt(x.abs) : pct(x.mult) + (x.add ? ` +${fmt(x.add)}` : '');
    for (const k of keys) {
      const a = C.merged(stock, C.colOf[k]), b = C.merged(cur, C.colOf[k]);
      let delta = '', cls = 'muted';
      const va = a ? (a.abs != null ? a.abs : a.mult) : 1, vb = b ? (b.abs != null ? b.abs : b.mult) : 1;
      if (Math.abs(vb - va) > 1e-9) {
        const absolute = (a && a.abs != null) || (b && b.abs != null);
        // real effect vs stock: for speed stats the time changes by 1/ratio, for the rest the value changes by ratio
        delta = absolute ? `${vb > va ? '+' : ''}${fmt(vb - va)} (${pct(vb / va)})`
          : SPEED.has(k) ? t('timeDelta', { p: pct(va / vb) }) : t('valueDelta', { p: pct(vb / va) });
        cls = (vb > va) !== C.lowerBetter(k) ? 'good' : 'bad';
      }
      body.append(el('tr', { title: C.colOf[k].attrs.join(' + ') + (C.colOf[k].hidden ? '\n' + t('notShown') : '') }, el('td', {}, C.label(k)), el('td', { class: 'muted' }, show(a)), el('td', {}, show(b)), el('td', { class: cls }, delta)));
    }
    const wb = $('warns'); wb.replaceChildren();
    if (cur.warn.length) wb.append(el('div', { class: 'warnbox warn' },
      t('zeroWarn', { list: [...new Set(cur.warn.map(x => `${x.att.name} (${C.label(x.attr)})`))].join('; ') })));
  }

  // ---------- goal
  function renderGoal() {
    S.goal = goalFromLevels(S.lvl);
    const g = $('goal'); g.replaceChildren();
    for (const [k, attrs] of GOALS) {
      const lv = S.lvl[k] || 0;
      g.append(el('button', { class: 'chip lv' + lv, title: attrs.map(a => C.label(a)).join(' + ') + '\n' + t('chipTip'),
        onclick: () => setLevels({ ...S.lvl, [k]: (lv + 1) % 3 }) }, tx('goal', k) + (lv === 2 ? ' ★' : '')));
    }
  }
  function setLevels(lv) {
    S.lvl = Object.fromEntries(Object.entries(lv).filter(([, v]) => v)); store.set('goalLvl', S.lvl);
    S.sort = { key: 'score', dir: -1 }; renderGoal(); renderAtts();
  }

  // ---------- saved builds (localStorage) and comparison baseline
  function renderSaved() {
    const box = $('saved'); box.replaceChildren();
    if (!S.saved.length) box.append(el('div', { class: 'small muted' }, t('nothingYet')));
    for (const b of S.saved) {
      const w = C.weapon[b.w]; if (!w) continue;
      box.append(el('div', { class: 'savedrow' + (S.base === b.id ? ' base' : '') },
        el('span', { class: 'an', title: t('openBuild'), onclick: () => { setWeapon(w, false); S.build = { ...C.stockBuild(w), ...b.build }; renderAll(); } }, b.name, el('span', { class: 'muted small' }, ' · ' + w.name)),
        el('button', { class: 'x', title: t('compareTip'), onclick: () => { S.base = S.base === b.id ? null : b.id; renderSaved(); renderStats(); persist(); } }, S.base === b.id ? t('baselineOn') : t('compare')),
        el('button', { class: 'x', title: t('del'), onclick: () => { S.saved = S.saved.filter(x => x !== b); if (S.base === b.id) S.base = null; store.set('saved', S.saved); renderSaved(); renderStats(); persist(); } }, '×')));
    }
  }
  function saveBuild() {
    const name = $('saveName').value.trim() || `${S.w.name} #${S.saved.filter(b => b.w === S.w.id).length + 1}`;
    S.saved.push({ id: Date.now().toString(36), name, w: S.w.id, build: { ...S.build } });
    store.set('saved', S.saved); $('saveName').value = ''; renderSaved();
  }

  function renderAll() { renderSlots(); renderAtts(); renderStats(); saveHash(); persist(); }

  // ---------- language: static texts are marked in the HTML with data-i18n / data-i18n-title / data-i18n-placeholder
  function renderStatic() {
    document.documentElement.lang = I18N.lang; document.title = t('title');
    for (const e of document.querySelectorAll('[data-i18n]')) e.textContent = t(e.dataset.i18n);
    for (const e of document.querySelectorAll('[data-i18n-title]')) e.title = t(e.dataset.i18nTitle);
    for (const e of document.querySelectorAll('[data-i18n-placeholder]')) e.placeholder = t(e.dataset.i18nPlaceholder);
    document.documentElement.style.setProperty('--stock-tag', JSON.stringify(' · ' + t('stockTag')));
    $('presets').replaceChildren(...Object.entries(PRESETS).map(([k, goal]) => el('button', { onclick: () => setLevels(goal) }, tx('preset', k))));
    $('ver').textContent = t('ver', { w: D.weapons.length, a: D.attachments.length }) + (D.build ? t('verBuild', { b: D.build }) : '');
  }

  // ---------- init
  const sel = $('weapon'); let grp = null, og = null;
  for (const w of D.weapons) {
    const g = w.tag.split('.')[2];
    if (g !== grp) { grp = g; og = el('optgroup', { label: g }); sel.append(og); }
    og.append(el('option', { value: w.id }, w.name === w.id ? w.name : `${w.name} (${w.id})`));
  }
  sel.addEventListener('change', () => setWeapon(C.weapon[sel.value]));
  for (const [k, name] of Object.entries(I18N.LANGS)) $('lang').append(el('option', { value: k }, name));
  $('lang').value = I18N.lang;
  $('lang').addEventListener('change', e => { store.set('lang', I18N.setLang(e.target.value)); renderStatic(); renderGoal(); renderSaved(); renderAll(); });
  $('stock').addEventListener('click', () => { S.build = C.stockBuild(S.w); renderAll(); });
  $('share').addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); $('share').textContent = t('copied'); } catch { prompt(t('linkPrompt'), location.href); } setTimeout(() => $('share').textContent = t('share'), 1500); });
  $('showCos').addEventListener('change', () => { renderSlots(); persist(); });
  $('showHidden').addEventListener('change', e => { C.opt.showHidden = e.target.checked; renderAll(); });
  $('allSlots').addEventListener('change', () => { renderAtts(); persist(); });
  $('dedupe').checked = store.get('dedupe', true);
  $('dedupe').addEventListener('change', e => { store.set('dedupe', e.target.checked); renderAtts(); });
  $('q').addEventListener('input', e => { S.q = e.target.value; renderAtts(); });
  $('adsBase').addEventListener('input', e => { store.set('ads:' + S.w.id, e.target.value); renderStats(); });
  $('apply').addEventListener('click', () => {
    if (!goalActive()) { alert(t('pickGoal')); return; }
    S.build = C.recommend(S.w, S.goal, S.build).build; renderAll();
  });
  $('clearGoal').addEventListener('click', () => setLevels({}));
  $('saveBtn').addEventListener('click', saveBuild);
  $('saveName').addEventListener('keydown', e => { if (e.key === 'Enter') saveBuild(); });
  const st0 = restoreUi();
  renderStatic(); renderGoal(); loadHash();
  if (st0.w === S.w.id && C.slots(S.w).some(s => s.slot === st0.slot)) S.slot = st0.slot;
  renderSaved(); renderAll();
  window.addEventListener('hashchange', () => { loadHash(); renderAll(); });
})();
