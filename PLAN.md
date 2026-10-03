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

## 2. Per-room custom cleaning

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

## Order of work
1. Verify entity discovery and the camera `rooms` attribute on the real device (blocking for both).
2. Cleaning sequence (smaller, self-contained).
3. Per-room custom cleaning.
4. Real-time camera and map editing, if wanted.
