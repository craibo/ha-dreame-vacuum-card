# Dreame Vacuum Card

<p align="center"><img src="brand/icon.png" width="96" alt="Dreame Vacuum Card"></p>

<p align="center"><img src="docs/screenshot.png" width="360" alt="Dreame Vacuum Card screenshot"></p>

A Lovelace card for the [`dreame_vacuum`](https://github.com/Tasshack/dreame-vacuum) integration, laid out like the Dreame app. It uses only the integration's public entities, attributes and services, and has no build step.

- Header with state, plus cleaning area, runtime and battery
- Live map from the integration's camera, with room labels and drag-to-draw zones
- Room / All / Zone modes, cleaning times, start / pause, return to dock
- Cleaning Mode sheet: mode, suction, mop dampness, customized cleaning
- Cleaning sequence: Cleaning Mode sheet → Cleaning Sequence, tap rooms in order, Done
- Per-room custom cleaning: with Customized Cleaning on, long-press a room (or select it and tap Room Settings) to set mode, suction, water, repeats
- Self-Cleaning sheet: clean mop pad, dry mop pad, auto-empty

## Install

### HACS (custom repository)

1. HACS → ⋮ → Custom repositories → add `https://github.com/craibo/ha-dreame-vacuum-card`, type **Dashboard**.
2. Install **Dreame Vacuum Card** and reload the browser.

### Manual

1. Copy `ha-dreame-vacuum-card.js` to `config/www/`.
2. Add it as a dashboard resource: `/local/ha-dreame-vacuum-card.js` (type: JavaScript module).

## Config

```yaml
type: custom:dreame-vacuum-card
entity: vacuum.l10s_ultra
# optional
camera: camera.l10s_ultra_map
name: L10s Ultra
entities:            # override auto-discovery of any sibling entity
  suction_level: select.l10s_ultra_suction_level
```

Sibling entities (selects, switches, buttons, sensors) are found automatically on the vacuum's device by `translation_key`. Keys you can override are listed in `ENTITY_KEYS` in the JS file.

## Services used

`dreame_vacuum.vacuum_clean_segment` (rooms), `dreame_vacuum.vacuum_clean_zone` (zones), plus the standard `vacuum.start`, `vacuum.pause`, `vacuum.return_to_base`, `select.select_option`, `button.press` and `homeassistant.toggle`.

## Not yet implemented

Real-time camera and the map editor. See `PLAN.md`.
