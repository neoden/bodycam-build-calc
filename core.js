// Pure build logic (no DOM) — shared by the page and by node tests.
(function (root) {
  const I18N = typeof module !== 'undefined' ? require('./i18n.js') : root.I18N;
  const t = I18N.t;
  const ORDER = ['ADSSpeed', 'SwitchSpeed', 'ReloadTime', 'Speed', 'VerticalRecoil', 'HorizontalRecoil',
    'CameraRecoilStepVertical', 'CameraRecoilStepHorizontal', 'CameraRecoilStep', 'RecoilRecoverySpeed', 'KickUp', 'KickHip',
    'Instability', 'SpreadHipX', 'SpreadHipY', 'SpreadAimX', 'SpreadAimY', 'MagnifiedKickHip', 'MagnifiedMaxKickHip',
    'AmmoCapacity', 'Damage', 'FireRate', 'PelletCount', 'MagAmount'];
  const HIDDEN = new Set(['RagdollForce']);
  const SLOT_ORDER = ['Barrel', 'Threaded Barrel', 'Slide', 'Muzzle', 'Forearm', 'Pump', 'Underbarrel', 'Bipod', 'Grip', 'Stock',
    'Magazine', 'Cylinder', 'Ammo', 'Trigger', 'Hammer', 'Bolt Handle', 'Optic', 'Optic Mount', 'Canted Optic', 'Upperbarrel', 'Siderail', 'Side Mount'];

  function init(D) {
    const att = Object.fromEntries(D.attachments.map(a => [a.id, a]));
    const weapon = Object.fromEntries(D.weapons.map(w => [w.id, w]));
    const lowerBetter = a => !!(D.stats[a] && D.stats[a].lowerBetter);
    const label = a => I18N.tx('stat', a) || (D.stats[a] && D.stats[a].name) || a;

    const opt = { showHidden: false };
    // Columns as the game shows them: attributes sharing one in-game name (weapon recoil + camera recoil → "Vertical Recoil",
    // KickUp + KickHip → "Weapon Kick") are one stat whose percent is the SUM of the parts. Attributes the game hides
    // (flags 2/3 in its UI table: SpreadHipY, Instability…) stay separate. A column's key is its first attribute.
    const gameHidden = a => !D.stats[a] || !!(D.stats[a].flags[2] || D.stats[a].flags[3]);
    const cols = [];
    for (const a of ORDER) {
      if (HIDDEN.has(a)) continue;
      const nm = D.stats[a] && D.stats[a].name;
      const c = !gameHidden(a) && cols.find(c => !c.hidden && c.name === nm);
      if (c) c.attrs.push(a); else cols.push({ key: a, name: nm, attrs: [a], hidden: gameHidden(a) });
    }
    const colOf = Object.fromEntries(cols.map(c => [c.key, c]));
    // one attachment's contribution to a column: summed percent for 'mul', else the first other modifier
    function modOf(a, c) {
      let sum = 0, n = 0, other = null;
      for (const m of a.mods) {
        if (!c.attrs.includes(m.a) || m.v == null) continue;
        if (m.op === 'mul') { sum += m.v - 1; n++; } else other = other || m;
      }
      return n ? { op: 'mul', v: 1 + sum } : other;
    }
    // a build's value for a column (same shape as compute().stats[attr])
    function merged(r, c) {
      if (c.attrs.length === 1) return r.stats[c.key];
      const xs = c.attrs.map(a => r.stats[a]).filter(Boolean);
      return xs.length ? { mult: 1 + xs.reduce((s, x) => s + x.mult - 1, 0), add: 0, ovr: null, base: null, abs: null } : undefined;
    }

    const fits = (w, a) => (opt.showHidden || a.avail !== false) && a.compat.some(c => w.tag === c || w.tag.startsWith(c + '.'));

    // slots available on a weapon: {slot: {options:[att], def: id|null}}
    function slots(w) {
      const out = {};
      const add = (a, isDef) => {
        const s = out[a.slot] || (out[a.slot] = { slot: a.slot, options: [], def: null });
        if (!s.options.includes(a)) s.options.push(a);
        if (isDef) s.def = a.id;
      };
      for (const a of D.attachments) if (fits(w, a)) add(a, false);
      for (const id of w.defaults) if (att[id]) add(att[id], true);
      for (const s of Object.values(out)) {
        s.hasStats = s.options.some(a => a.mods.length);
      }
      // slots without stats of their own still matter if their parts add a mounting point for a slot that has stats
      const statSlots = new Set(Object.values(out).filter(s => s.hasStats).map(s => s.slot));
      for (const s of Object.values(out)) {
        s.needed = !s.hasStats && s.options.some(a => (a.sockets || []).some(k => statSlots.has(k)));
        s.options.sort((x, y) => x.name.localeCompare(y.name));
      }
      const idx = s => { const i = SLOT_ORDER.indexOf(s); return i < 0 ? 99 : i; };
      return Object.values(out).sort((x, y) => idx(x.slot) - idx(y.slot) || x.slot.localeCompare(y.slot));
    }

    function stockBuild(w) {
      const b = {};
      for (const s of slots(w)) b[s.slot] = s.def;
      return b;
    }

    // base attribute values set by the weapon itself
    function baseOf(w) {
      const b = {};
      for (const m of w.mods) b[m.a] = m.op === 'add' ? (b[m.a] || 0) + m.v : m.v;
      return b;
    }

    // Aggregate like GAS: ((base + Σadd) × (1 + Σ(mul − 1))), override replaces everything.
    // Zero overrides in attachment data look like placeholders → not applied, reported in `warn`.
    function compute(w, build, stacking) {
      const base = baseOf(w), agg = {}, warn = [];
      const g = a => agg[a] || (agg[a] = { mul: 0, prod: 1, add: 0, ovr: null });
      for (const id of Object.values(build)) {
        const a = id && att[id]; if (!a) continue;
        for (const m of a.mods) {
          if (m.v == null) continue;
          if (m.op === 'mul') { g(m.a).mul += m.v - 1; g(m.a).prod *= m.v; }
          else if (m.op === 'add') g(m.a).add += m.v;
          else if (m.op === 'override') { if (m.v === 0) warn.push({ att: a, attr: m.a }); else g(m.a).ovr = m.v; }
        }
      }
      const out = {};
      for (const a of new Set([...Object.keys(base), ...Object.keys(agg)])) {
        const x = agg[a] || { mul: 0, prod: 1, add: 0, ovr: null };
        const mult = stacking === 'mul' ? x.prod : Math.max(0, 1 + x.mul);
        const hasBase = base[a] != null || x.ovr != null;
        out[a] = { mult, add: x.add, ovr: x.ovr, base: base[a] ?? null,
          abs: x.ovr != null ? x.ovr : (base[a] != null ? (base[a] + x.add) * mult : null), hasBase };
      }
      return { stats: out, warn };
    }

    const multOf = (r, a) => (r.stats[a] ? r.stats[a].mult : 1);
    const absOf = (r, a) => (r.stats[a] ? r.stats[a].abs : null);

    // Derived absolute numbers. adsBase: user-calibrated base ADS time (s) or null.
    function derived(w, r, adsBase) {
      const d = [];
      const dmg = absOf(r, 'Damage'), pel = absOf(r, 'PelletCount') || 1, fr = absOf(r, 'FireRate');
      if (dmg != null) d.push({ k: 'dmg', label: pel > 1 ? t('dmgPellets', { n: pel, d: fmt(dmg) }) : t('dmgShot'), v: dmg * pel, unit: '', better: 1 });
      if (fr) d.push({ k: 'rpm', label: t('rpm'), v: 60 / fr, unit: t('rpmUnit'), better: 1 });
      if (dmg != null && fr) d.push({ k: 'dps', label: t('dps'), v: dmg * pel / fr, unit: '', better: 1 });
      const cap = absOf(r, 'AmmoCapacity');
      if (cap != null) d.push({ k: 'cap', label: t('mag'), v: cap, unit: t('rounds'), better: 1 });
      const A = w.anim || {}, rs = multOf(r, 'ReloadTime'), ss = multOf(r, 'SwitchSpeed');
      const tm = (k, sp) => { if (A[k]) d.push({ k, label: t(k), v: A[k].avg / sp, unit: t('sec'), better: -1, range: [A[k].min / sp, A[k].max / sp], n: A[k].n }); };
      for (const k of ['reloadEmpty', 'reloadPartial', 'reload', 'reloadStart', 'reloadLoop', 'reloadEnd']) tm(k, rs);
      tm('draw', ss); tm('equip', ss);
      if (adsBase) d.push({ k: 'ads', label: t('adsMeasured'), v: adsBase / multOf(r, 'ADSSpeed'), unit: t('sec'), better: -1 });
      else if (A.ads) d.push({ k: 'ads', label: t('adsAnim'), v: A.ads.t95 / multOf(r, 'ADSSpeed'), unit: t('sec'), better: -1, ads: A.ads });
      return d;
    }

    // Score of one attachment for a goal = [{attrs, w}]; positive = better.
    // A goal covers the attributes the game shows as one stat (weapon recoil + camera recoil); like the game's own
    // number, the part's contribution is the SUM of their percents.
    function score(a, goal, stockCap) {
      let s = 0;
      for (const g of goal) {
        let sum = 0, n = 0;
        for (const m of a.mods) {
          if (!g.attrs.includes(m.a) || m.v == null) continue;
          if (m.op === 'mul') { sum += (lowerBetter(m.a) ? -1 : 1) * (m.v - 1); n++; }
          else if (m.op === 'override' && m.v !== 0 && m.a === 'AmmoCapacity' && stockCap) { sum += (m.v - stockCap) / stockCap; n++; }
        }
        if (n) s += g.w * sum;
      }
      return s;
    }

    // ---- mounting points. A slot exists only if the receiver or an installed part has a socket for it.
    // Returns {slot: true|false}. Weapons without socket data (receiver mesh has none) are left unconstrained.
    function enabled(w, build) {
      const sl = slots(w), res = {};
      if (!w.sockets || !w.sockets.length) { for (const s of sl) res[s.slot] = true; return res; }
      const have = new Set(w.sockets);
      for (let changed = true; changed;) {
        changed = false;
        for (const s of sl) {
          if (res[s.slot] || !have.has(s.slot)) continue;
          res[s.slot] = true; changed = true;
          const a = build[s.slot] && att[build[s.slot]];
          if (a) for (const k of a.sockets || []) have.add(k);
        }
      }
      for (const s of sl) res[s.slot] = !!res[s.slot];
      return res;
    }
    // which parts (of this weapon) could provide a socket for `slot`
    function providers(w, slot) {
      const out = [];
      for (const s of slots(w)) for (const a of s.options) if ((a.sockets || []).includes(slot)) out.push({ slot: s.slot, a });
      return out;
    }
    // drop parts sitting in slots that currently have no mounting point
    function effective(w, build) {
      const en = enabled(w, build), b = {};
      for (const [k, v] of Object.entries(build)) b[k] = en[k] === false ? null : v;
      return b;
    }

    // Percent stacking is additive per attribute, so without mounting constraints the best build is the best option per slot.
    // Parts that add sockets (barrels, mounts…) couple slots together → coordinate ascent over those "provider" slots,
    // refilling all other slots with their best option each time.
    function recommend(w, goal, current) {
      const stockCap = absOf(compute(w, stockBuild(w)), 'AmmoCapacity');
      const sl = slots(w), sc = a => (a ? score(a, goal, stockCap) : 0);
      const bestOf = s => {
        let best = s.def, bs = sc(att[s.def]);
        const cur = current && current[s.slot];
        if (cur !== undefined && cur !== s.def && (cur || !s.def) && sc(att[cur]) >= bs) { best = cur; bs = sc(att[cur]); }
        for (const a of s.options) if (sc(a) > bs + 1e-9) { best = a.id; bs = sc(a); }
        if (!s.def && bs < -1e-9) best = null;
        return best;
      };
      const isProv = s => s.options.some(a => (a.sockets || []).length);
      const fill = fixed => {                      // fixed: choices for provider slots
        const b = {};
        for (const s of sl) b[s.slot] = isProv(s) ? fixed[s.slot] : bestOf(s);
        const en = enabled(w, b); let total = 0;
        for (const s of sl) { if (en[s.slot]) total += sc(att[b[s.slot]]); else b[s.slot] = s.def && en[s.slot] ? s.def : null; }
        return { b, total };
      };
      const fixed = {};
      for (const s of sl) if (isProv(s)) fixed[s.slot] = bestOf(s);
      let best = fill(fixed);
      for (let pass = 0, improved = true; pass < 5 && improved; pass++) {
        improved = false;
        for (const s of sl) {
          if (!isProv(s)) continue;
          const cands = s.options.map(a => a.id); if (!s.def) cands.push(null);
          for (const id of cands) {
            const r = fill({ ...fixed, [s.slot]: id });
            if (r.total > best.total + 1e-9) { best = r; fixed[s.slot] = id; improved = true; }
          }
        }
      }
      return { build: best.b, total: best.total };
    }

    return { cols, colOf, modOf, merged, opt, enabled, providers, effective, D, att, weapon, lowerBetter, label, fits, slots, stockBuild, baseOf, compute, derived, score, recommend, multOf, absOf };
  }

  function fmt(v, digits) {
    if (v == null) return '—';
    const d = digits != null ? digits : (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2);
    return (+v.toFixed(d)).toString();
  }
  const pct = m => { const p = (m - 1) * 100; return (p > 0 ? '+' : '') + (+p.toFixed(1)) + '%'; };

  const api = { init, fmt, pct, ORDER, HIDDEN, SLOT_ORDER };
  if (typeof module !== 'undefined') module.exports = api; else root.Core = api;
})(typeof window !== 'undefined' ? window : globalThis);
