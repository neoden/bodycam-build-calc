# Bodycam build calculator

English · [Русский](README.ru.md)

A weapon build calculator for Bodycam. To open it: `web/index.html` (just a file in the browser, no server needed).

As a single file: `bodycam-build-calc.html` — built from `web/` with `python3 tools/bundle.py web bodycam-build-calc.html` (and automatically at the end of `update.sh`). Edit the files in `web/`, not this one.

- `web/` — the page (`index.html`, `app.js`, `core.js` — calculation logic without DOM, `i18n.js` — UI strings) and the data (`data.js`, `data.json`).
- The UI language is picked in the page header (English by default, Russian); the choice is remembered in the browser. A new language is one more block in `web/i18n.js`.
- `tools/` — data extraction from the installed game (only reads the `.pak` files):
  `paklist.py`/`pakextract.py` (index and unpacking of pak v11 + Oodle), `uasset.py` (asset header),
  `items.py` (the `DT_WeaponItems` item table), `geparse.py` (GameplayEffect modifiers), `build_data.py` (builds `data.js`).
- `update.sh [path to the game]` — rebuild the data after a patch. Needs a venv: `python3 -m venv .venv && .venv/bin/pip install pyooz`.

## How it is calculated

- Weapon base stats come from `GE_WeaponStat_*`, attachment contributions from `GE_AttachmentStat_*`.
- Multipliers of one stat are summed (as in GAS): `result = base × (1 + Σ(multiplier − 1))`.
- `ADSSpeed`, `SwitchSpeed`, `ReloadTime` are speed multipliers (higher = better): `time = base time ÷ multiplier`.
- Base reload/draw time is the length of the weapon's first-person animations (averaged over the variants).
- Compatibility follows the `attachment → weapon` tags; one attachment per slot.

## What the data lacks / assumptions

- Base ADS time is an estimate: the moment the aim-in motion curve (`*_Aim_In_Loc`, the `Additive_*_Aim_In` set) covers 95% of its path. What exactly the game counts as "aimed", and whether the curve is scaled by the `ADSSpeed` multiplier, cannot be seen in the data; you can enter your own value manually.
- Attachments that are disabled in the game's shop table or not listed in it are hidden by default.
- A slot is available only if the weapon (model skeleton) or an installed part (mesh sockets) has a mounting point named after the slot. There is no receiver mounting data for the SKR-H — no restrictions are applied to it.
- A few attachments have "override the stat with 0" in the game data (looks like placeholders) — they are marked with ⚠ and not counted.
- The parsers are heuristic (assets without a property schema); after a big patch it is worth checking the output of `update.sh`.
