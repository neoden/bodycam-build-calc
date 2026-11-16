// UI strings (no DOM). English is the default language; add a language by adding a block to STR and a name to LANGS.
(function (root) {
  const LANGS = { en: 'English', ru: 'Русский' };
  const STR = {
    en: {
      title: 'Bodycam Build Calculator — weapon attachments & stats', h1: 'Bodycam · build calculator', language: 'Language', source: 'Source code', about: 'About', openCalc: 'Open the calculator', aboutPageTitle: 'About — Bodycam Build Calculator',
      aboutHow: 'How it is calculated',
      stockBtn: 'Stock', share: 'Copy link', copied: 'Copied ✓', linkPrompt: 'Build link:',
      build: 'Build', showCos: 'slots that don\'t affect stats', showHidden: 'attachments hidden in game',
      showHiddenTitle: 'Attachments that exist in the game files but are disabled in the shop or not listed there',
      savedBuilds: 'Saved builds', namePh: 'name', save: 'Save',
      goalTitle: 'Optimization goal', orPreset: 'or a preset:', apply: 'Find the best build', clearGoal: 'Clear goal',
      goalNote: 'Click a chip: off → important → top priority (★, weighs three times more). The attachment table is immediately sorted by score for the selected goals.',
      attachments: 'Attachments', searchPh: 'search by name…', dedupe: 'merge identical',
      dedupeTitle: 'Show attachments of one slot that have identical stats and mounting points as a single row', allSlots: 'all slots',
      attNote: 'Click a row to equip / remove. Click a header to sort. Percentages are the contribution of a single attachment, in the same stats and with the same numbers as in game; green = better. Blue "+ …" shows which mounting points the part adds (for example, a barrel with a rail for an underbarrel). Grey text after the name lists other variants (skins) of the same attachment with the same stats; search finds them too.',
      result: 'Build result', adsBaseLabel: 'Your own base ADS time, s (optional — replaces the animation estimate):',
      thStat: 'Stat', thStock: 'Stock', thBuild: 'Build', effectVsStock: 'Effect vs stock', effectVsIt: 'Effect vs baseline',
      aboutSummary: 'Where the data comes from and how it is calculated',
      about1: 'The data is extracted from the game files (the item table + a GameplayEffect for every weapon and attachment). Multipliers of one stat are summed as in GAS: result = base × (1 + Σ(multiplier − 1)), so −10% and −10% give −20%, not −19%.',
      about2: '"Reload / ADS / equip speed" are speed multipliers: time = base time ÷ multiplier. Base reload and draw times are the lengths of the game\'s animations (averaged over the calm/stressed variants); the weapon may actually become ready slightly before the animation ends. Base ADS time comes from the curve that moves the weapon into the sights: the moment 95% of the path is covered (the rest is fine settling).',
      about3: 'Compatibility follows the game\'s tags (attachment ↔ weapon). A slot is available only if the weapon or an installed part has a mounting point for it (model sockets from the game files); parts in unavailable slots are not counted.',

      aboutTitle: 'About the Bodycam build calculator',
      aboutSite: 'Bodycam Build Calculator is a free, unofficial weapon build planner for Bodycam, the multiplayer FPS game by Reissad Studio. Pick a weapon, try attachments — barrels, muzzles, grips, stocks, magazines, optics — and see how they change recoil, ADS speed, reload time, equip speed, hip fire spread and damage. It can also find the best build for a goal such as minimum recoil or fastest ADS, save builds, compare them and share a build as a link. All stats are extracted from the game files.',

      noMountTitle: 'The current build has no mounting point for this slot. Some parts in these slots provide it: {slots}',
      noMount: ' · no mount (provided by: {slots})', empty: '— empty —', emptyWord: 'empty', stockTag: 'stock', revert: 'revert to stock',
      slotNote: 'There is nowhere to mount this right now — no part in the build has a "{slot}" mounting point. It is provided by: {list}. Anything selected here is not counted.',
      thAtt: 'Attachment', thSlot: 'Slot', thScore: 'Score', scoreTitle: 'sum of "weight × % change" over the optimization goal',
      notShown: 'not shown in game', inGame: 'in game: "{name}"', skins: 'skins: {list}', sameStats: 'same stats: {list}',
      hiddenInGame: ' · hidden in game', andMore: ' and {n} more',
      zeroOverride: 'the game data says "override with 0" — looks like a placeholder, not counted',
      allAtts: 'All attachments', ofTotal: ' (of {n})',
      quote: '"{name}"', compareWith: 'Compared with {b} · {w}',
      animRange: 'animation variants: {a}–{b} s ({n})',
      adsTip: 'The moment the weapon covers 95% of the path to the aimed position (curve {curve}).\n90% of the path: {t90} s, the whole curve with settling: {len} s — for stock, without the multiplier.',
      sameAs: 'same as {b}', vsStock: 'vs stock', vsName: 'vs {b}', timeDelta: 'time {p}', valueDelta: 'value {p}',
      zeroWarn: '⚠ The game data says "override with 0" for these attachments — they look like placeholders and are not counted: {list}. Check in game.',
      chipTip: 'click: off → important → top priority',
      nothingYet: 'nothing yet', openBuild: 'open this build', compareTip: 'compare the current build with this one',
      baselineOn: '✓ baseline', compare: 'compare', del: 'delete',
      pickGoal: 'Pick a goal first: click one or more chips.',
      ver: '{w} weapons · {a} attachments', verBuild: ' · game build {b}',

      dmgPellets: 'Damage ({n}×{d})', dmgShot: 'Damage per shot', rpm: 'Rate of fire', rpmUnit: 'rpm', dps: 'DPS (no misses)',
      mag: 'Magazine', rounds: 'rds', sec: 's',
      reloadEmpty: 'Reload (empty)', reloadPartial: 'Reload (partial)', reload: 'Reload',
      reloadStart: 'Reload: start', reloadLoop: 'Reload: 1 round', reloadEnd: 'Reload: end',
      draw: 'Draw', equip: 'First equip',
      adsMeasured: 'ADS time (from your measurement)', adsAnim: 'ADS time (≈ from animation)',

      stat: {
        Damage: 'Damage', FireRate: 'Shot interval', AmmoCapacity: 'Mag capacity', MagAmount: 'Spare mags',
        PelletCount: 'Pellets per shot', ADSSpeed: 'ADS speed', SwitchSpeed: 'Equip speed',
        ReloadTime: 'Reload speed', Speed: 'Movement speed',
        VerticalRecoil: 'Vertical recoil', HorizontalRecoil: 'Horizontal recoil',
        CameraRecoilStepVertical: 'Vertical recoil (camera)', CameraRecoilStepHorizontal: 'Horizontal recoil (camera)',
        RecoilRecoverySpeed: 'Recoil recovery', KickUp: 'Weapon Kick', KickHip: 'Weapon Kick (KickHip)',
        Instability: 'Instability', SpreadHipX: 'Hip fire spread', SpreadHipY: 'Hip fire spread Y',
        SpreadAimX: 'ADS spread', SpreadAimY: 'ADS spread Y',
        MagnifiedKickHip: 'Magnified kick', MagnifiedMaxKickHip: 'Max magnified kick',
        CameraRecoilStep: 'Camera recoil', RagdollForce: 'Ragdoll force',
      },
      short: {
        ADSSpeed: 'ADS', SwitchSpeed: 'Equip', ReloadTime: 'Reload', Speed: 'Move', VerticalRecoil: 'V.recoil', HorizontalRecoil: 'H.recoil',
        KickUp: 'Kick', SpreadHipX: 'Hip', SpreadAimX: 'Aim', CameraRecoilStepVertical: 'Cam.V', CameraRecoilStepHorizontal: 'Cam.H',
        CameraRecoilStep: 'Cam.', RecoilRecoverySpeed: 'Recovery', KickHip: 'KickHip', Instability: 'Instab.', SpreadHipY: 'Hip Y',
        SpreadAimY: 'Aim Y', AmmoCapacity: 'Mag', Damage: 'Damage', FireRate: 'Interval', PelletCount: 'Pellets', MagAmount: 'Spare',
        MagnifiedKickHip: 'Magn.kick', MagnifiedMaxKickHip: 'Magn.max',
      },
      slot: {             // slots not listed here are shown under the game's own name
        Siderail: 'Side Rail', Upperbarrel: 'Top Rail', 'Reticle Magnified': 'Reticle (magnified)', 'Reticle Canted': 'Reticle (canted)',
      },
      goal: {
        ads: 'Fast ADS', draw: 'Fast equip', reload: 'Fast reload', vrec: 'Less vertical recoil', hrec: 'Less horizontal recoil',
        kick: 'Less kick', hip: 'Better hip fire', mag: 'Bigger magazine',
      },
      preset: { maxAds: 'Max ADS', minRecoil: 'Min recoil', runner: 'Runner', hipfire: 'Hip fire', balance: 'Balanced' },
    },

    ru: {
      title: 'Bodycam — калькулятор билдов', h1: 'Bodycam · калькулятор билдов', language: 'Язык', source: 'Исходный код', about: 'О проекте', openCalc: 'Открыть калькулятор', aboutPageTitle: 'О проекте — Bodycam Build Calculator',
      aboutHow: 'Как считается',
      stockBtn: 'Сток', share: 'Скопировать ссылку', copied: 'Скопировано ✓', linkPrompt: 'Ссылка на билд:',
      build: 'Билд', showCos: 'слоты без влияния на статы', showHidden: 'обвесы, скрытые в игре',
      showHiddenTitle: 'Обвесы, которые есть в файлах игры, но отключены в магазине или не выставлены в нём',
      savedBuilds: 'Сохранённые билды', namePh: 'название', save: 'Сохранить',
      goalTitle: 'Цель подбора', orPreset: 'или готовый набор:', apply: 'Собрать лучший билд', clearGoal: 'Сбросить цель',
      goalNote: 'Клик по плашке: не важно → важно → главное (★, втрое весомее). Таблица обвесов сразу сортируется по оценке под выбранные цели.',
      attachments: 'Обвесы', searchPh: 'поиск по названию…', dedupe: 'склеивать одинаковые',
      dedupeTitle: 'Обвесы одного слота с одинаковыми статами и креплениями показывать одной строкой', allSlots: 'все слоты',
      attNote: 'Клик по строке — поставить / снять. Клик по заголовку — сортировка. Проценты — вклад одного обвеса, в тех же параметрах и с теми же числами, что в игре; зелёный = лучше. Синим «+ …» — какие крепления эта деталь добавляет (например, ствол с планкой под подствольное). Серым после названия — другие варианты (скины) того же обвеса с теми же статами; поиск их тоже находит.',
      result: 'Итог билда', adsBaseLabel: 'Своё базовое время ADS, с (необязательно — заменит оценку по анимации):',
      thStat: 'Параметр', thStock: 'Сток', thBuild: 'Билд', effectVsStock: 'Эффект к стоку', effectVsIt: 'Эффект к нему',
      aboutSummary: 'Откуда данные и как считается',
      about1: 'Данные вынуты из файлов игры (таблица предметов + GameplayEffect на каждое оружие и обвес). Множители одного параметра складываются как в GAS: итог = база × (1 + Σ(множитель − 1)), то есть −10% и −10% дают −20%, а не −19%.',
      about2: '«Скорость перезарядки / ADS / доставания» — множители скорости: время = базовое время ÷ множитель. Базовое время перезарядки и доставания — длительность анимаций из игры (среднее по вариантам calm/stressed); реальный момент готовности может наступать чуть раньше конца анимации. Базовое время ADS — по кривой движения оружия в прицел: момент, когда пройдено 95% пути (дальше идёт мелкая доводка).',
      about3: 'Совместимость — по тегам игры (обвес ↔ оружие). Слот доступен, только если у оружия или у установленной детали есть для него крепление (сокеты моделей из файлов игры); детали в недоступных слотах в расчёт не входят.',

      aboutTitle: 'О калькуляторе билдов Bodycam',
      aboutSite: 'Bodycam Build Calculator — бесплатный неофициальный калькулятор билдов оружия для Bodycam, сетевого шутера от Reissad Studio. Выбери оружие, примерь обвесы — стволы, дульные устройства, рукоятки, приклады, магазины, прицелы — и посмотри, как они меняют отдачу, скорость прицеливания (ADS), перезарядку, доставание, разброс от бедра и урон. Калькулятор умеет подбирать лучший билд под цель (минимальная отдача, самый быстрый ADS), сохранять билды, сравнивать их и делиться билдом по ссылке. Все статы вынуты из файлов игры.',

      noMountTitle: 'В текущем билде для этого слота нет крепления. Его дают некоторые детали в слотах: {slots}',
      noMount: ' · нет крепления (даёт: {slots})', empty: '— пусто —', emptyWord: 'пусто', stockTag: 'сток', revert: 'вернуть сток',
      slotNote: 'Сейчас это поставить некуда — в билде нет детали с креплением «{slot}». Крепление дают: {list}. Выбранное здесь в расчёт не входит.',
      thAtt: 'Обвес', thSlot: 'Слот', thScore: 'Оценка', scoreTitle: 'сумма «вес × изменение %» по цели подбора',
      notShown: 'в игре не показывается', inGame: 'в игре «{name}»', skins: 'скины: {list}', sameStats: 'такие же статы: {list}',
      hiddenInGame: ' · скрыт в игре', andMore: ' и ещё {n}',
      zeroOverride: 'в данных игры стоит «заменить на 0» — похоже на заглушку, в расчёте не учитывается',
      allAtts: 'Все обвесы', ofTotal: ' (из {n})',
      quote: '«{name}»', compareWith: 'Сравнение с {b} · {w}',
      animRange: 'варианты анимации: {a}–{b} с ({n} шт.)',
      adsTip: 'Момент, когда оружие доходит до 95% пути в положение прицеливания (кривая {curve}).\n90% пути: {t90} с, вся кривая с доводкой: {len} с — для стока, без множителя.',
      sameAs: 'как {b}', vsStock: 'к стоку', vsName: 'к {b}', timeDelta: 'время {p}', valueDelta: 'значение {p}',
      zeroWarn: '⚠ В данных игры у этих обвесов стоит «заменить на 0» — похоже на заглушки, в расчёт не включены: {list}. Проверь в игре.',
      chipTip: 'клик: не важно → важно → главное',
      nothingYet: 'пока пусто', openBuild: 'открыть этот билд', compareTip: 'сравнивать текущий билд с этим',
      baselineOn: '✓ эталон', compare: 'сравнить', del: 'удалить',
      pickGoal: 'Сначала выбери цель: нажми на одну или несколько плашек.',
      ver: '{w} оружий · {a} обвесов', verBuild: ' · сборка игры {b}',

      dmgPellets: 'Урон ({n}×{d})', dmgShot: 'Урон за выстрел', rpm: 'Скорострельность', rpmUnit: 'выстр/мин', dps: 'DPS (без промахов)',
      mag: 'Магазин', rounds: 'патр.', sec: 'с',
      reloadEmpty: 'Перезарядка (пустой)', reloadPartial: 'Перезарядка (неполный)', reload: 'Перезарядка',
      reloadStart: 'Перезарядка: начало', reloadLoop: 'Перезарядка: 1 патрон', reloadEnd: 'Перезарядка: конец',
      draw: 'Доставание (draw)', equip: 'Первое взятие (equip)',
      adsMeasured: 'Время ADS (от твоего замера)', adsAnim: 'Время ADS (≈ по анимации)',

      stat: {
        Damage: 'Урон', FireRate: 'Интервал между выстрелами', AmmoCapacity: 'Ёмкость магазина', MagAmount: 'Запасных магазинов',
        PelletCount: 'Дробин в выстреле', ADSSpeed: 'Скорость прицеливания (ADS)', SwitchSpeed: 'Скорость доставания',
        ReloadTime: 'Скорость перезарядки', Speed: 'Скорость передвижения',
        VerticalRecoil: 'Верт. отдача', HorizontalRecoil: 'Гориз. отдача',
        CameraRecoilStepVertical: 'Верт. отдача (камера)', CameraRecoilStepHorizontal: 'Гориз. отдача (камера)',
        RecoilRecoverySpeed: 'Возврат после отдачи', KickUp: 'Подброс оружия (Weapon Kick)', KickHip: 'Подброс оружия (KickHip)',
        Instability: 'Нестабильность', SpreadHipX: 'Разброс от бедра', SpreadHipY: 'Разброс от бедра Y',
        SpreadAimX: 'Разброс в прицеле', SpreadAimY: 'Разброс в прицеле Y',
        MagnifiedKickHip: 'Подброс с увеличением', MagnifiedMaxKickHip: 'Макс. подброс с увеличением',
        CameraRecoilStep: 'Отдача камеры', RagdollForce: 'Сила рэгдолла',
      },
      short: {
        ADSSpeed: 'ADS', SwitchSpeed: 'Достав.', ReloadTime: 'Перезар.', Speed: 'Движ.', VerticalRecoil: 'Отд.верт', HorizontalRecoil: 'Отд.гор',
        KickUp: 'Подброс', SpreadHipX: 'Бедро', SpreadAimX: 'Прицел', CameraRecoilStepVertical: 'Кам.верт', CameraRecoilStepHorizontal: 'Кам.гор',
        CameraRecoilStep: 'Кам.', RecoilRecoverySpeed: 'Возврат', KickHip: 'KickHip', Instability: 'Нестаб.', SpreadHipY: 'Бедро Y',
        SpreadAimY: 'Прицел Y', AmmoCapacity: 'Магазин', Damage: 'Урон', FireRate: 'Интервал', PelletCount: 'Дробь', MagAmount: 'Запас',
        MagnifiedKickHip: 'Увел.kick', MagnifiedMaxKickHip: 'Увел.max',
      },
      slot: {
        Barrel: 'Ствол', Muzzle: 'Дульное устройство', Optic: 'Прицел', Magazine: 'Магазин', Grip: 'Рукоятка', Stock: 'Приклад',
        Underbarrel: 'Подствольное', Trigger: 'Спуск', Ammo: 'Боеприпас', Slide: 'Затвор', Siderail: 'Боковая планка',
        'Threaded Barrel': 'Ствол (резьба)', Forearm: 'Цевьё', 'Optic Mount': 'Крепление прицела', Upperbarrel: 'Верхняя планка',
        Hammer: 'Курок', 'Side Mount': 'Боковое крепление', Pump: 'Помпа', Bipod: 'Сошки', Cylinder: 'Барабан',
        'Bolt Handle': 'Рукоять затвора', Reticle: 'Сетка', 'Reticle Magnified': 'Сетка (увелич.)', 'Reticle Canted': 'Сетка (наклон.)',
        'Canted Optic': 'Наклонный прицел', Misc: 'Прочее',
      },
      goal: {
        ads: 'Быстрый ADS', draw: 'Быстрое доставание', reload: 'Быстрая перезарядка', vrec: 'Меньше верт. отдачи', hrec: 'Меньше гориз. отдачи',
        kick: 'Меньше подброса', hip: 'Точнее от бедра', mag: 'Больше магазин',
      },
      preset: { maxAds: 'Макс. ADS', minRecoil: 'Мин. отдача', runner: 'Раннер', hipfire: 'От бедра', balance: 'Баланс' },
    },
  };

  const DEFAULT = 'en';
  let lang = DEFAULT;
  // plain string by key, with {name} placeholders filled from p
  function t(key, p) {
    let s = STR[lang][key]; if (typeof s !== 'string') s = STR[DEFAULT][key];
    if (typeof s !== 'string') return key;
    return p ? s.replace(/\{(\w+)\}/g, (m, k) => (k in p ? p[k] : m)) : s;
  }
  // name from a group (stat, short, slot, goal, preset); undefined when the group has no entry for the key
  const tx = (group, key) => (STR[lang][group] || {})[key];

  const api = { t, tx, LANGS, DEFAULT, STR, get lang() { return lang; }, setLang(l) { lang = STR[l] ? l : DEFAULT; return lang; } };
  if (typeof module !== 'undefined') module.exports = api; else root.I18N = api;
})(typeof window !== 'undefined' ? window : globalThis);
