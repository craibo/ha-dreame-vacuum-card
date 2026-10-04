# Plan: cleaning sequence and per-room custom cleaning

Both features need the map camera's `rooms` attribute (a dict keyed by room id). Each room has `x0 y0 x1 y1`, `order`, `cleaning_times`, `suction_level`, `water_volume`, plus `wetness_level`, `cleaning_mode`, `mop_temperature`, `mop_pressure`, `cleaning_route` and `custom_mopping_route` where the model supports them. `_rooms()` already returns this. Model support varies, so every control is shown only when the matching key is present on the room.

## 1. Cleaning sequence (implemented, untested on a device)

**Integration surface**
- Service `dreame_vacuum.vacuum_set_cleaning_sequence` with `cleaning_sequence: [roomId, ...]`. An empty list clears the sequence.
- Per-room `order` select (key `order`) on newer models (`cleaning_sequence_v2`). Older models use the `cleaning_sequence` switch (`custom_order`).
- Editing is only allowed when the robot is not cleaning, a saved map exists, and it is not a scheduled clean or mapping run. The integration enforces this, so the card disables the UI while `vacuum.state` is `cleaning` or `returning`.

**UX (matches the app's "Cleaning Sequence" row)**
1. Add a "Cleaning Sequence" row to the Cleaning Mode sheet. It opens a sequence mode on the map.
2. In sequence mode, rooms show numbered badges. Tapping a room appends it to the sequence and tapping a numbered badge removes it. Badges renumber to match `order`.
3. Reset and Done buttons. Done calls the service with the ordered ids.
4. When the sequence is off, the badges are hidden. Starting a Room clean then uses the order of the selected rooms.

**Work**
- Add a `_sequence` state array and an `_mode === "sequence"` overlay branch in `_drawOverlay`.
- Add `_setSequence(ids)` calling the service, and read the initial order from each room's `order`.
- Detect v1 versus v2 by whether the `cleaning_sequence` switch entity exists. For v1, enable the switch first.
- Add a toggle in the sheet (switch where it exists).

**Open questions to verify on a live device**
- Whether `order` is 0 or null when unset.
- Whether the service accepts a partial list on v2.

## 2. Per-room custom cleaning (implemented, untested on a device)

**Integration surface**
- Switch `customized_cleaning` turns the mode on. The card already toggles it.
- Service `dreame_vacuum.vacuum_set_custom_cleaning` takes parallel arrays. `segment_id`, `suction_level` and `repeats` are required. `water_volume`, `wetness_level`, `cleaning_mode`, `mop_temperature` and `mop_pressure` are optional.
- Value ranges and labels for each setting come from the existing entities' `options`, which are available on the main select entities.

**UX (a per-room settings sheet)**
1. With customized cleaning on and Room mode active, long-pressing a room (or an "edit" icon on the selected-room chip) opens a sheet for that room. A short tap still toggles selection.
2. The sheet reuses the segmented option rows: cleaning mode, suction, water or wetness, repeats and mop options. Controls only appear when the room has the matching key.
3. Changes are collected in a draft and sent with one service call on Save. Sending all rooms in parallel arrays avoids overwriting other rooms' settings, so the draft is seeded from the current values of every room.

**Work**
- Add `_roomDraft` state and a `_roomSheet(roomId)` renderer.
- Map room attributes to the service's numeric codes. Option labels on the main selects come from `options`, so the code is the option's index. This must be checked against `const.py` in the integration for each setting before shipping.
- Build the parallel arrays from all rooms, replacing only the edited room's entries.
- Show a small badge on each room label with its suction and water icons when custom cleaning is on.

**Open questions to verify on a live device**
- The code-to-label mapping for suction and water (the integration's `SUCTION_LEVEL_CODE_TO_NAME` and related maps).
- Whether `wetness_level` replaces `water_volume` on mop-pad-humidity models.

## 3. Map editor (phases 1-3 and 5 implemented, untested on a device; phase 4 deferred)

**Verdict: supported.** The integration registers entity services for most of what the Dreame app's map editor does, and the map camera already exposes the current state of each element. Writes go through `dreame_vacuum.*` services on the vacuum entity, using the same robot coordinates the card already converts with `toVac` / `toImg`.

### What the integration supports

| Area | Service | Current state (camera attribute) |
|---|---|---|
| Virtual walls | `vacuum_set_restricted_zone` (`walls`: `[[x0,y0,x1,y1]]`) | `virtual_walls` (this device has two) |
| No-go zones | `vacuum_set_restricted_zone` (`zones`) | `no_go_areas` |
| No-mop zones | `vacuum_set_restricted_zone` (`no_mops`) | `no_mopping_areas` |
| Carpets | `vacuum_set_carpet_area`, `vacuum_set_carpet_type` | `carpets`, `deleted_carpets`, `detected_carpets` |
| Thresholds | `vacuum_set_virtual_threshold`, `vacuum_set_threshold` | `virtual_thresholds`, `passable_thresholds`, `impassable_thresholds` |
| Merge rooms | `vacuum_merge_segments` (`segments`: ids) | `rooms` |
| Split a room | `vacuum_split_segments` (`segment`, `line`: `[x0,y0,x1,y1]`) | `rooms` |
| Rename room | `vacuum_rename_segment` (`segment_id`, `segment_name`) | `rooms[].name` |
| Room type, hidden rooms, floor material | `vacuum_set_segment_type`, `vacuum_set_hidden_segments`, `vacuum_set_floor_material` | `rooms` |
| Furniture, curtains, router, predefined points | `vacuum_set_furniture`, `vacuum_set_curtain`, `vacuum_set_router_position`, `vacuum_set_predefined_points` | `furnitures`, `curtains`, `router_position`, `predefined_points` |
| Map management | `vacuum_rename_map`, `vacuum_delete_map`, `vacuum_backup_map`, `vacuum_restore_map` | `maps`, `recovery_map` on the vacuum entity |
| New (temporary) map | `vacuum_save_temporary_map`, `vacuum_discard_temporary_map`, `vacuum_replace_temporary_map` | `has_temporary_map` |

Not planned: wall and door geometry (`vacuum_set_walls` takes 11 integers per door), low-lying areas and ramps.

### Constraints from the source
- Edits are refused while the robot is running, and room edits are refused while a temporary map exists.
- Room count is capped (29 or 49 depending on the map version).
- `vacuum_set_restricted_zone` is a full replacement (confirmed in the source): any list you omit is wiped, so the card always sends walls, no-go and no-mop together. The carpet and threshold services are still unverified.
- No-go and no-mop zones are axis-aligned rectangles (`[x0,y0,x1,y1]`; the integration normalises them), so rotation is not a concern for zones.

### UX
- A pencil button enters Edit mode, which replaces the Room/All/Zone bar with a toolbar: **Walls, No-Go, No-Mop, Carpet, Rooms, Done**.
- Changes are staged in a local draft and shown on the map. **Apply** sends them, and **Cancel** discards them.
- Before the first apply, offer to run `vacuum_backup_map`. Destructive operations (merge, split, delete map) need a confirm.
- Existing items can be selected, dragged and resized with corner handles, and deleted with an x button. This extends the zone drawing code, which already converts pointer positions to robot coordinates.

### Phases
1. **Verify on the device (still needed).** Replace-versus-append is settled from the source; the rest is untested. Take a map backup, then test whether `vacuum_set_restricted_zone` replaces or appends, what the extra integers mean, and how rotation (this map reports rotation 90) affects coordinates. Use the smallest map or a restore point.
2. **Restricted zones.** Virtual walls (line tool) and no-go and no-mop zones (rectangle tool): draw, move, resize, delete.
3. **Room operations.** Merge (select two or more adjacent rooms), split (draw a line across a room), rename.
4. **Carpets and thresholds.**
5. **Map management.** Rename, delete, backup and restore, and the temporary-map save / discard / replace flow after a new mapping run.

### Open questions
- Carpet and threshold services: ids, materials and replace-versus-append (phase 4, deferred).
- Whether the backup service finishes before the follow-up edit runs.
- Whether `map_id` needs passing explicitly on multi-floor maps (the room services take an optional `map_id`).

### Not done
Carpets and thresholds (phase 4), moving/resizing existing zones (they can be deleted and redrawn), furniture, curtains and router position.

## 4. Maintenance panel (implemented, untested on a device)

Shows consumable life, base-station status and the reset buttons in one place, like the app's Consumables page. It uses only sibling entities the integration already creates, so no new services are needed.

### Entities (all found by `translation_key` through `_find`, so add them to `ENTITY_KEYS`)

| Row | Life % | Time left | Reset button |
|---|---|---|---|
| Main brush | `main_brush_left` | `main_brush_time_left` | `reset_main_brush` |
| Side brush | `side_brush_left` | `side_brush_time_left` | `reset_side_brush` |
| Filter | `filter_left` | `filter_time_left` | `reset_filter` |
| Mop pad | `mop_pad_left` | `mop_pad_time_left` | `reset_mop_pad` |
| Sensors | `sensor_dirty_left` | `sensor_dirty_time_left` | `reset_sensor` |
| Silver ion | `silver_ion_left` | `silver_ion_time_left` | none |
| Detergent | `detergent_left` | `detergent_time_left` | `reset_detergent` |

Status rows: `dust_collection`, `auto_empty_status`, `self_wash_base_status`, `low_water_warning`, `mop_pad` (installed / not), `error`, plus the `clear_warning` and `water_tank_draining` buttons.

Every row is optional. A row is drawn only when its life sensor exists, which handles models without a base station (no detergent, silver ion or dust rows). The existing fallback `endsWith("_" + tkey)` should resolve all of these; `mop_pad` versus `mop_pad_left` is the one pair to check, since the first must not match the second.

### UX
1. A third side button, "Maintenance", under Self-Cleaning Settings opens a bottom sheet through the existing `_sheet` / `_sheetBody` path, with a new `_maintSheet()` renderer.
2. The sheet has two tabs, matching `_cleanSheet`: **Consumables** and **Base Station**.
3. **Consumables**: one row per part with an icon, name, a progress bar for life %, and "N h left" (or days, from the sensor's `unit_of_measurement`). Bar colour is green above 30%, amber from 10 to 30% and red below 10%. A "Reset" chip on the row asks for confirmation through the existing `_confirm` sheet, then presses the reset button.
4. **Base Station**: status rows with a state chip, a "Start auto-empty" button (already wired as `btn_auto_empty`), "Drain water tank" and "Clear warning". Buttons whose entity is `unavailable` are disabled, which is the case for the last two at the moment.
5. A small red dot on the Maintenance button, and a `.banner` under the header ("Filter is running low"), appear when any part is at or below the threshold. The banner is dismissible and not shown while editing the map or the sequence.

### Config
```yaml
show_maintenance: true          # default true; false hides the button and banner
maintenance_warn_percent: 10    # red threshold (amber is 3x this)
```

### Work
- Add the ENTITY_KEYS above and a `CONSUMABLES` table (key, label, icon, reset key) so rows are data-driven and the sheet is a single `map` over it.
- Add `_maintSheet()` and `_consumableRow(c)`, a `_tab` value for the two tabs, and `_worst()` for the dot and banner.
- Add `data-reset="<key>"` handling in `_wire` that calls `_confirm({... , run: () => this._press(key)})`.
- Add the CSS (progress bar, chips) beside the existing sheet styles, using the `--dv-*` variables so it follows the HA theme.
- Update README (feature list, config) and bump `CARD_VERSION`.

### Verify on the device
- The unit of the `*_time_left` sensors (hours or days). The sheet reads it from the attributes, so this only affects labels.
- That `reset_*` presses change the matching `_left` sensor, and that it refreshes without a reload.
- Whether `dust_collection` can show a "full" state. If not, the bin row says "Ready" or "Needs emptying" from `available` only, and the card avoids implying a fill level.

### Not planned
Push notifications (use an HA automation on the `_left` sensors; there is already an error alert), usage history charts, and a maintenance schedule.

## Order of work
1. Verify entity discovery and the camera `rooms` attribute on the real device (blocking for both).
2. Cleaning sequence (smaller, self-contained).
3. Per-room custom cleaning.
4. Map editor, starting at phase 1 above.
5. Maintenance panel (section 4): data-driven consumable rows first, then the Base Station tab, then the dot and banner.
6. Real-time camera is not feasible with the current integration.
