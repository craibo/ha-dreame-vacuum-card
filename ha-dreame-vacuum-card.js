/**
 * Dreame Vacuum Card — a from-scratch Lovelace card for the dreame_vacuum
 * integration (Tasshack/dreame-vacuum). Uses only the integration's public
 * entities, attributes and services. No build step.
 *
 * Layout mirrors the Dreame app: header + stats, map with overlay, Room/All/Zone
 * mode switch, start/pause button, and bottom sheets for cleaning mode and
 * self-cleaning (wash / dry / auto-empty).
 */

const CARD_VERSION = "0.3.0";
const DOMAIN = "dreame_vacuum";

// Consumable parts shown in the maintenance sheet. Each one looks up
// `<id>_left` (% life) and `<id>_time_left` sensors plus a `reset_<id>` button
// (or `reset`, when the button is named differently). Rows without a life sensor are hidden.
const CONSUMABLES = [
  { id: "main_brush", label: "Main brush", icon: "mdi:broom" },
  { id: "side_brush", label: "Side brush", icon: "mdi:fan" },
  { id: "filter", label: "Filter", icon: "mdi:air-filter" },
  { id: "mop_pad", label: "Mop pad", icon: "mdi:water-outline" },
  { id: "sensor_dirty", label: "Sensors", icon: "mdi:eye-outline", reset: "reset_sensor" },
  { id: "silver_ion", label: "Silver ion", icon: "mdi:shield-star-outline", reset: null },
  { id: "detergent", label: "Detergent", icon: "mdi:bottle-tonic-outline" },
];

// Entities are auto-discovered on the vacuum's device by translation_key.
// Override any of them via `entities:` in the card config.
const ENTITY_KEYS = {
  cleaning_mode: ["select", "cleaning_mode"],
  suction_level: ["select", "suction_level"],
  water_volume: ["select", "water_volume"],
  mop_pad_humidity: ["select", "mop_pad_humidity"],
  cleaning_times: ["select", "cleaning_times"],
  customized_cleaning: ["switch", "customized_cleaning"],
  self_clean: ["switch", "self_clean"],
  self_clean_frequency: ["select", "self_clean_frequency"], // not on every model
  self_clean_area: ["number", "self_clean_area"],
  selected_map: ["select", "selected_map"],
  cleaning_sequence: ["switch", "cleaning_sequence"], // legacy (v1) models only
  mop_wash_level: ["select", "mop_wash_level"],
  auto_drying: ["switch", "auto_drying"],
  drying_time: ["select", "drying_time"],
  auto_dust_collecting: ["switch", "auto_dust_collecting"],
  auto_empty_frequency: ["select", "auto_empty_frequency"],
  btn_self_clean: ["button", "self_clean"],
  btn_manual_drying: ["button", "manual_drying"],
  btn_auto_empty: ["button", "start_auto_empty"],
  battery: ["sensor", "battery_level"],
  cleaned_area: ["sensor", "cleaned_area"],
  cleaning_time: ["sensor", "cleaning_time"],
  status: ["sensor", "status"],
  dust_collection: ["sensor", "dust_collection"],
  auto_empty_status: ["sensor", "auto_empty_status"],
  self_wash_base_status: ["sensor", "self_wash_base_status"],
  low_water_warning: ["sensor", "low_water_warning"],
  mop_pad_state: ["sensor", "mop_pad"],
  error: ["sensor", "error"],
  btn_water_tank_draining: ["button", "water_tank_draining"],
  btn_clear_warning: ["button", "clear_warning"],
};

// Base-station status rows: [entity key, label, state values that are fine].
const BASE_STATUS = [
  ["dust_collection", "Dust collection", ["available"]],
  ["auto_empty_status", "Auto-empty", ["idle"]],
  ["self_wash_base_status", "Wash base", ["idle"]],
  ["low_water_warning", "Water", ["no_warning"]],
  ["mop_pad_state", "Mop pad", ["installed"]],
  ["error", "Error", ["no_error"]],
];
for (const c of CONSUMABLES) {
  ENTITY_KEYS[`${c.id}_left`] = ["sensor", `${c.id}_left`];
  ENTITY_KEYS[`${c.id}_time_left`] = ["sensor", `${c.id}_time_left`];
  if (c.reset !== null) ENTITY_KEYS[`reset_${c.id}`] = ["button", c.reset || `reset_${c.id}`];
}

const ROOM_COLORS = ["#f7df7e", "#a9c7f7", "#b7d98b", "#9ed8f7", "#c9b6f2", "#f7b99a"];

const CSS = `
:host { display:block; --dv-accent:#3d6bff; --dv-accent2:#4a8bff; --dv-bg:var(--ha-card-background, var(--card-background-color, #fff)); --dv-fg:var(--primary-text-color,#222); --dv-dim:var(--secondary-text-color,#888); --dv-chip:var(--secondary-background-color,#f2f3f7); }
ha-card { overflow:hidden; position:relative; padding:0 0 12px; }
.hdr { text-align:center; padding:14px 48px 4px; }
.hdr .name { font-size:1.3em; font-weight:500; }
.hdr .state { color:var(--dv-dim); }
.stats { display:flex; justify-content:space-around; padding:10px 8px; }
.stat { text-align:center; }
.stat b { font-size:1.9em; font-weight:400; }
.stat small { font-size:.9em; margin-left:2px; }
.stat div { color:var(--dv-dim); font-size:.85em; }
.mapwrap { position:relative; margin:0 12px; min-height:240px; user-select:none; touch-action:none; }
.mapwrap img { width:100%; display:block; pointer-events:none; }
.mapwrap svg { position:absolute; inset:0; width:100%; height:100%; }
.side { position:absolute; right:0; top:8px; display:flex; flex-direction:column; gap:14px; }
.sidebtn, .leftbtn { display:flex; flex-direction:column; align-items:center; font-size:.75em; cursor:pointer; text-align:center; width:76px; color:var(--dv-fg); }
.sidebtn .ic, .leftbtn .ic { width:46px; height:46px; border-radius:14px; background:var(--dv-chip); display:flex; align-items:center; justify-content:center; box-shadow:0 1px 4px #0002; margin-bottom:4px; font-weight:500; font-size:1.5em; }
.left { position:absolute; left:0; bottom:8px; display:flex; flex-direction:column; gap:10px; }
.seg { display:flex; margin:10px auto; width:max-content; background:var(--dv-chip); border-radius:999px; padding:3px; }
.seg button { border:0; background:none; color:var(--dv-dim); padding:8px 22px; border-radius:999px; font:inherit; cursor:pointer; }
.seg button.on { background:var(--dv-bg); color:var(--dv-fg); box-shadow:0 1px 5px #0003; }
.bar { display:flex; align-items:center; justify-content:space-around; padding:6px 8px 0; }
.bar .item { display:flex; flex-direction:column; align-items:center; gap:2px; min-width:96px; text-align:center; cursor:pointer; }
.bar ha-icon { --mdc-icon-size:32px; }
.go { width:76px; height:76px; border-radius:50%; border:0; cursor:pointer; background:linear-gradient(135deg,var(--dv-accent),var(--dv-accent2)); color:#fff; box-shadow:0 6px 16px #3d6bff55; display:flex; align-items:center; justify-content:center; }
.go ha-icon { --mdc-icon-size:38px; }
.sheet-bg { position:absolute; inset:0; background:#0006; z-index:5; display:flex; align-items:flex-end; }
.sheet { background:var(--dv-bg); width:100%; border-radius:26px 26px 0 0; padding:18px 20px 22px; max-height:85%; overflow:auto; box-sizing:border-box; }
.sheet h4 { margin:14px 0 2px; font-size:1.05em; }
.sheet .val { color:var(--dv-accent); margin-bottom:8px; }
.sheet .desc { color:var(--dv-dim); font-size:.85em; }
.opts { display:flex; background:var(--dv-chip); border-radius:999px; padding:0; overflow:hidden; }
.opts button { flex:1; border:0; background:none; padding:12px 4px; cursor:pointer; color:var(--dv-fg); font:inherit; font-size:.85em; }
.opts button.on { background:linear-gradient(135deg,var(--dv-accent),var(--dv-accent2)); color:#fff; border-radius:999px; }
.row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 0; }
.tabs { display:flex; gap:22px; border-bottom:1px solid var(--divider-color,#0002); margin-bottom:8px; }
.tabs div { padding:8px 0; cursor:pointer; color:var(--dv-dim); border-bottom:3px solid transparent; }
.tabs div.on { color:var(--dv-fg); border-color:var(--dv-accent); }
.radios { display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap; margin:10px 0; }
.radios label { display:flex; gap:6px; align-items:center; cursor:pointer; }
.cta { width:100%; border:0; border-radius:999px; padding:15px; color:#fff; font:inherit; font-size:1.05em; cursor:pointer; background:var(--dv-accent); margin-top:12px; }
.cta.orange { background:#ff7a00; }
.seqbar { display:flex; gap:12px; padding:6px 16px 0; }
.seqbar .cta { margin-top:6px; }
.cta.ghost { background:var(--dv-chip); color:var(--dv-fg); }
.editbtn { position:absolute; right:10px; top:10px; width:36px; height:36px; border-radius:50%; background:var(--dv-chip); display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:2; }
.banner { display:flex; justify-content:space-between; align-items:center; gap:8px; margin:6px 12px; padding:8px 12px; border-radius:12px; background:var(--dv-chip); font-size:.9em; }
.banner button { border:0; background:var(--dv-accent); color:#fff; border-radius:999px; padding:5px 10px; margin-left:4px; font:inherit; font-size:.85em; cursor:pointer; }
.tools { display:flex; gap:6px; padding:10px 12px 0; overflow-x:auto; }
.tool { flex:0 0 auto; display:flex; flex-direction:column; align-items:center; font-size:.72em; padding:6px 10px; border-radius:12px; background:var(--dv-chip); cursor:pointer; color:var(--dv-fg); min-width:52px; }
.tool.on { background:linear-gradient(135deg,var(--dv-accent),var(--dv-accent2)); color:#fff; }
.tool.off { opacity:.4; pointer-events:none; }
.sidebtn .ic { position:relative; }
.sidebtn .dot { position:absolute; top:-3px; right:-3px; width:12px; height:12px; border-radius:50%; background:#e53935; border:2px solid var(--dv-bg); box-sizing:border-box; }
.cons { padding:10px 0; }
.cons .top { display:flex; align-items:center; gap:10px; }
.cons .top .nm { flex:1; }
.cons .top small { color:var(--dv-dim); }
.prog { height:8px; border-radius:99px; background:var(--dv-chip); overflow:hidden; margin-top:6px; }
.prog div { height:100%; border-radius:99px; }
.lvl-ok { background:#43a047; } .lvl-warn { background:#ffa000; } .lvl-low { background:#e53935; }
.rchip { border:0; border-radius:999px; padding:5px 12px; background:var(--dv-chip); color:var(--dv-fg); font:inherit; font-size:.8em; cursor:pointer; }
.cta[disabled] { opacity:.45; cursor:default; }
.err { padding:16px; color:var(--error-color,#c00); }
`;

class DreameVacuumCard extends HTMLElement {
  setConfig(config) {
    if (!config || !config.entity) throw new Error("`entity` (the vacuum entity) is required");
    this._config = { show_name: true, show_maintenance: true, maintenance_warn_percent: 10, ...config };
    this._mode = "all"; // room | all | zone
    this._selectedRooms = new Set();
    this._zones = [];
    this._editMode = false; this._tool = "select"; this._draft = null; this._dirty = false; this._editSel = null;
    this._editRooms = new Set(); this._splitRoom = null; this._splitLine = null; this._backedUp = false;
    this._cf = null; this._input = null; this._list = null; this._error = null;
    this._img = null; this._mapUrl = null; this._pending = null; this._sig = null; this._card = null; this._camId = undefined;
    this._roomEdit = null; // {id, draft} while the per-room settings sheet is open
    this._repeats = 1; // 1-3; the integration only has per-room cleaning_times selects
    this._seqEdit = false; // editing the cleaning sequence on the map
    this._sequence = []; // ordered room ids while editing
    this._sheet = null; // null | "mode" | "clean"
    this._tab = "wash";
    this._maintDismissed = new Set(); // part ids whose banner was dismissed this session
    this._mtab = "cons"; // maintenance sheet tab: cons | base
    this._cache = {};
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
  }

  getCardSize() { return 10; }
  static getConfigElement() { return document.createElement("dreame-vacuum-card-editor"); }
  static getStubConfig(hass) {
    const v = Object.keys(hass.states).find((e) => e.startsWith("vacuum.") && hass.entities?.[e]?.platform === DOMAIN);
    return { entity: v || "vacuum.dreame" };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    if (this._dragging) return; // don't re-render mid-drag
    if (this._sheet === "input") return; // don't clobber text being typed
    // HA replaces state objects on change, so reference equality tells us what moved.
    const cam = this._hass.states[this._camera()];
    const others = [this._vac(), ...Object.keys(ENTITY_KEYS).map((k) => this._st(k))];
    const prev = this._sig;
    this._sig = { cam, others };
    if (prev && others.every((o, i) => o === prev.others[i])) {
      // Only the map camera changed (the common case while cleaning): update the map
      // in place instead of rebuilding the card, so sheets/sliders/scroll are untouched.
      if (cam !== prev.cam) this._updateMapOnly(cam);
      return;
    }
    this._render();
  }

  // Keep one <img> for the card's lifetime and swap its source only after the next
  // frame has loaded, so the old map stays visible until the new one is ready.
  _ensureImg(url) {
    if (!this._img) { this._img = new Image(); this._img.src = url; this._mapUrl = url; return; }
    if (url === this._mapUrl || url === this._pending) return;
    this._pending = url;
    const pre = new Image();
    pre.onload = () => {
      if (this._pending !== url) return;
      this._pending = null; this._mapUrl = url; this._img.src = url; this._redrawOverlay();
    };
    pre.onerror = () => { if (this._pending === url) this._pending = null; };
    pre.src = url;
  }
  _redrawOverlay() { if (this._card && this._card.isConnected !== false) this._drawOverlay(this._card); }
  _updateMapOnly(cam) {
    const pic = cam?.attributes?.entity_picture;
    if (pic && pic !== this._mapUrl) this._ensureImg(pic); // overlay redraws once the frame loads
    else this._redrawOverlay(); // same image, but rooms/calibration may have changed
  }

  // ---------- entity helpers ----------
  _vac() { return this._hass.states[this._config.entity]; }
  _find(key) {
    const override = this._config.entities?.[key];
    if (override) return override;
    if (this._cache[key] !== undefined) return this._cache[key];
    if (!ENTITY_KEYS[key]) return null;
    const [domain, tkey] = ENTITY_KEYS[key];
    const dev = this._hass.entities?.[this._config.entity]?.device_id;
    // Per-room selects (select.<x>_room_<n>_<key>) share translation keys with the
    // device-level ones, so they must be excluded.
    const cands = Object.entries(this._hass.entities || {}).filter(
      ([id, e]) => e.device_id === dev && id.startsWith(domain + ".") && !/_room_\d+_/.test(id)
    );
    const found = (cands.find(([, e]) => e.translation_key === tkey) || cands.find(([id]) => id.endsWith("_" + tkey)) || [])[0] || null;
    this._cache[key] = found;
    return found;
  }
  _st(key) { const id = this._find(key); return id ? this._hass.states[id] : null; }
  _camera() {
    if (this._config.camera) return this._config.camera;
    if (this._camId) return this._camId;
    const dev = this._hass.entities?.[this._config.entity]?.device_id;
    this._camId = Object.keys(this._hass.entities || {}).find(
      (id) => id.startsWith("camera.") && this._hass.entities[id].device_id === dev && !/map_data|map_\d|history|wifi|obstacle|recovery/.test(id)
    );
    return this._camId;
  }
  _call(domain, service, data, entity_id) {
    return this._hass.callService(domain, service, { entity_id, ...data });
  }
  _press(key) { const id = this._find(key); if (id) this._hass.callService("button", "press", { entity_id: id }); }
  _toggle(key) { const id = this._find(key); if (id) this._hass.callService("homeassistant", "toggle", { entity_id: id }); }
  _select(key, option) { const id = this._find(key); if (id) this._hass.callService("select", "select_option", { entity_id: id, option }); }

  // ---------- map geometry ----------
  _calibration() {
    const cam = this._hass.states[this._camera()];
    const pts = cam?.attributes?.calibration_points;
    if (!pts || pts.length < 3) return null;
    // vacuum (0,0),(1000,0),(0,1000) -> image px; solve affine img = A*vac + t
    const [p0, p1, p2] = pts;
    const a = (p1.map.x - p0.map.x) / 1000, b = (p1.map.y - p0.map.y) / 1000;
    const c = (p2.map.x - p0.map.x) / 1000, d = (p2.map.y - p0.map.y) / 1000;
    const det = a * d - b * c;
    if (!det) return null;
    const toImg = (x, y) => ({ x: p0.map.x + a * (x - p0.vacuum.x) + c * (y - p0.vacuum.y), y: p0.map.y + b * (x - p0.vacuum.x) + d * (y - p0.vacuum.y) });
    const toVac = (X, Y) => {
      const dx = X - p0.map.x, dy = Y - p0.map.y;
      return { x: p0.vacuum.x + (d * dx - c * dy) / det, y: p0.vacuum.y + (-b * dx + a * dy) / det };
    };
    return { toImg, toVac };
  }
  // Rooms with geometry come from the map camera (dict keyed by room id, with
  // x0/y0/x1/y1, order and per-room settings). The vacuum entity's `rooms`
  // attribute has names only, so it is used as a name fallback.
  _rooms() {
    const camRooms = this._hass.states[this._camera()]?.attributes?.rooms;
    if (!camRooms) return [];
    const vacAll = this._vac()?.attributes?.rooms || {};
    const vacList = Object.values(vacAll).flat();
    return Object.entries(camRooms).map(([key, r]) => {
      const id = Number(r.room_id ?? r.id ?? key);
      const v = vacList.find((x) => x.id === id);
      return { ...r, id, name: r.name ?? v?.name ?? `Room ${id}` };
    });
  }

  // ---------- actions ----------
  _start() {
    const id = this._config.entity;
    const state = this._vac().state;
    if (state === "cleaning") return this._call("vacuum", "pause", {}, id);
    const times = this._repeats;
    if (this._mode === "room" && this._selectedRooms.size) {
      return this._call(DOMAIN, "vacuum_clean_segment", { segments: [...this._selectedRooms], repeats: times }, id);
    }
    if (this._mode === "zone" && this._zones.length) {
      return this._call(DOMAIN, "vacuum_clean_zone", { zone: this._zones, repeats: times }, id);
    }
    return this._call("vacuum", "start", {}, id);
  }

  // ---------- cleaning sequence ----------
  _seqLocked() { return ["cleaning", "returning", "paused"].includes(this._vac().state); }
  _enterSequence() {
    const attr = this._vac().attributes.cleaning_sequence;
    this._sequence = Array.isArray(attr) && attr.length
      ? [...attr]
      : this._rooms().filter((r) => r.order > 0).sort((a, b) => a.order - b.order).map((r) => r.id);
    this._seqEdit = true; this._sheet = null; this._mode = "all"; this._render();
  }
  _toggleSequenceRoom(id) {
    const i = this._sequence.indexOf(id);
    if (i >= 0) this._sequence.splice(i, 1); else this._sequence.push(id);
    this._render();
  }
  async _saveSequence() {
    let seq = [...this._sequence];
    // Legacy (v1) models keep every room in the sequence, so append the rooms the user left out.
    if (seq.length && this._find("cleaning_sequence")) {
      const rest = this._rooms().map((r) => r.id).filter((id) => !seq.includes(id));
      seq = seq.concat(rest);
    }
    await this._call(DOMAIN, "vacuum_set_cleaning_sequence", { cleaning_sequence: seq }, this._config.entity);
    this._seqEdit = false; this._render();
  }

  // ---------- per-room custom cleaning ----------
  // Codes follow the integration: suction 0-3, water 1-3, repeats 1-3, mode 0-2.
  _openRoom(id) {
    const r = this._rooms().find((x) => x.id === id);
    if (!r) return;
    this._roomEdit = { id, draft: {
      cleaning_mode: r.cleaning_mode, suction_level: r.suction_level ?? 1, water_volume: r.water_volume ?? 1,
      cleaning_times: r.cleaning_times ?? 1, mop_temperature: r.mop_temperature, mop_pressure: r.mop_pressure,
    } };
    this._sheet = "room"; this._render();
  }
  async _saveRoom() {
    const { id, draft } = this._roomEdit;
    // The service takes parallel arrays; send every room so none are reset.
    const rooms = this._rooms().map((r) => (r.id === id ? { ...r, ...draft } : r));
    const col = (k, dflt) => rooms.map((r) => r[k] ?? dflt);
    const data = {
      segment_id: rooms.map((r) => r.id),
      suction_level: col("suction_level", 1),
      water_volume: col("water_volume", 1),
      repeats: col("cleaning_times", 1),
    };
    for (const [k, svc] of [["cleaning_mode", "cleaning_mode"], ["mop_temperature", "mop_temperature"], ["mop_pressure", "mop_pressure"]]) {
      if (rooms.every((r) => r[k] !== undefined && r[k] !== null)) data[svc] = rooms.map((r) => r[k]);
    }
    await this._call(DOMAIN, "vacuum_set_custom_cleaning", data, this._config.entity);
    this._roomEdit = null; this._sheet = null; this._render();
  }
  _roomSheet() {
    const { id, draft } = this._roomEdit;
    const r = this._rooms().find((x) => x.id === id) || {};
    const locked = this._seqLocked();
    const humidity = !!this._find("mop_pad_humidity");
    const row = (title, field, opts) => `<h4>${title}</h4><div class="opts">${opts.map(([v, l]) => `<button data-rd="${field}" data-v="${v}" class="${String(draft[field]) === String(v) ? "on" : ""}">${l}</button>`).join("")}</div>`;
    const sweepOnly = draft.cleaning_mode === 0;
    const mopOnly = draft.cleaning_mode === 1;
    return `<h4 style="margin:0 0 4px;font-size:1.2em">${r.name || "Room"}</h4>
      <div class="desc">${this._st("customized_cleaning")?.state === "on" ? "Settings used whenever this room is cleaned." : "Turn on Customized Cleaning in Cleaning Mode for these to apply."}</div>
      ${locked ? `<div class="desc" style="color:var(--error-color,#c00)">Can't be changed while the robot is running.</div>` : ""}
      ${draft.cleaning_mode !== undefined && draft.cleaning_mode !== null ? row("Cleaning Mode", "cleaning_mode", [[0, "Sweeping"], [1, "Mopping"], [2, "Sweep & Mop"]]) : ""}
      ${mopOnly ? "" : row("Suction", "suction_level", [[0, "Quiet"], [1, "Standard"], [2, "Strong"], [3, "Turbo"]])}
      ${sweepOnly ? "" : row(humidity ? "Mop Pad Humidity" : "Water Volume", "water_volume", humidity ? [[1, "Slightly dry"], [2, "Moist"], [3, "Wet"]] : [[1, "Low"], [2, "Medium"], [3, "High"]])}
      ${row("Cleaning Times", "cleaning_times", [[1, "x1"], [2, "x2"], [3, "x3"]])}
      ${draft.mop_temperature !== undefined && draft.mop_temperature !== null ? row("Mop Temperature", "mop_temperature", [[0, "Normal"], [1, "Warm"]]) : ""}
      ${draft.mop_pressure !== undefined && draft.mop_pressure !== null ? row("Mop Pressure", "mop_pressure", [[0, "Light"], [2, "Normal"]]) : ""}
      <div class="seqbar" style="padding:0"><button class="cta ghost" data-a="rcancel">Cancel</button><button class="cta" data-a="rsave" ${locked ? "disabled style=\"opacity:.5\"" : ""}>Save</button></div>`;
  }

  // ---------- map editor ----------
  // Writes go through the integration's services. vacuum_set_restricted_zone REPLACES
  // walls, no-go and no-mop zones together (an omitted list is wiped), so all three are
  // always sent. Rooms/maps services are single operations.
  _hasTemp() { return !!this._vac().attributes.has_temporary_map; }
  _camAttrs() { return this._hass.states[this._camera()]?.attributes || {}; }
  _curMap() { const a = this._vac().attributes; return (a.maps || []).find((m) => m.id === a.selected_map_id); }
  _bbox(it) {
    const xs = [], ys = [];
    for (const k of Object.keys(it)) { if (/^x\d$/.test(k)) xs.push(it[k]); else if (/^y\d$/.test(k)) ys.push(it[k]); }
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(Math.round);
  }
  _enterEdit() {
    if (this._seqLocked()) return;
    const a = this._camAttrs();
    this._draft = {
      walls: (a.virtual_walls || []).map((w) => [w.x0, w.y0, w.x1, w.y1].map(Math.round)),
      zones: (a.no_go_areas || []).map((z) => this._bbox(z)),
      no_mops: (a.no_mopping_areas || []).map((z) => this._bbox(z)),
    };
    Object.assign(this, { _editMode: true, _tool: "select", _editSel: null, _dirty: false, _backedUp: false, _mode: "all", _splitRoom: null, _splitLine: null });
    this._editRooms = new Set();
    this._render();
  }
  _exitEdit() { this._editMode = false; this._draft = null; this._editSel = null; this._editRooms = new Set(); this._splitRoom = null; this._splitLine = null; this._render(); }
  _setTool(t) { this._tool = t; this._editSel = null; this._editRooms = new Set(); this._splitRoom = null; this._splitLine = null; this._render(); }
  _finishShape(t, a, b) {
    const r = Math.round;
    const stray = Math.hypot(b.x - a.x, b.y - a.y) < 150; // under 15 cm: ignore stray taps
    if (!stray) {
      if (t === "wall") { this._draft.walls.push([r(a.x), r(a.y), r(b.x), r(b.y)]); this._dirty = true; }
      else if (t === "split") this._splitLine = [r(a.x), r(a.y), r(b.x), r(b.y)];
      else if (Math.abs(b.x - a.x) >= 150 && Math.abs(b.y - a.y) >= 150) {
        (t === "nogo" ? this._draft.zones : this._draft.no_mops).push([r(Math.min(a.x, b.x)), r(Math.min(a.y, b.y)), r(Math.max(a.x, b.x)), r(Math.max(a.y, b.y))]);
        this._dirty = true;
      }
    }
    this._render();
  }
  _deleteSel() {
    const sel = this._editSel; if (!sel) return;
    this._draft[sel.k].splice(sel.i, 1); this._editSel = null; this._dirty = true; this._render();
  }
  _editRoomTap(id) {
    const t = this._tool;
    if (t === "merge") { this._editRooms.has(id) ? this._editRooms.delete(id) : this._editRooms.add(id); this._render(); }
    else if (t === "split") { this._splitRoom = id; this._splitLine = null; this._render(); }
    else if (t === "rename") {
      const room = this._rooms().find((x) => x.id === id);
      this._input = { title: "Rename room", value: room?.name || "", run: (v) => this._call(DOMAIN, "vacuum_rename_segment", { segment_id: id, segment_name: v }, this._config.entity) };
      this._sheet = "input"; this._render();
    }
  }
  _toolbarAction() {
    const t = this._tool, eid = this._config.entity;
    if (t === "merge" && this._editRooms.size >= 2) {
      const ids = [...this._editRooms];
      this._confirm({ title: `Merge ${ids.length} rooms?`, body: "The rooms become one room. This can't be undone exactly.", verb: "Merge", backup: true,
        run: async () => { await this._call(DOMAIN, "vacuum_merge_segments", { segments: ids, map_id: this._vac().attributes.selected_map_id }, eid); this._editRooms = new Set(); } });
    } else if (t === "split" && this._splitRoom && this._splitLine) {
      const seg = this._splitRoom, line = this._splitLine;
      this._confirm({ title: "Split this room?", body: "The room is divided along the line you drew.", verb: "Split", backup: true,
        run: async () => { await this._call(DOMAIN, "vacuum_split_segments", { segment: seg, line, map_id: this._vac().attributes.selected_map_id }, eid); this._splitRoom = null; this._splitLine = null; } });
    } else if (this._dirty && !["merge", "split", "rename"].includes(t)) {
      const d = this._draft;
      this._confirm({ title: "Apply map changes?", body: "Replaces this map's virtual walls, no-go zones and no-mop zones.", verb: "Apply", backup: true,
        run: async () => { await this._call(DOMAIN, "vacuum_set_restricted_zone", { walls: d.walls, zones: d.zones, no_mops: d.no_mops }, eid); this._exitEditSilently(); } });
    }
  }
  _exitEditSilently() { this._editMode = false; this._draft = null; this._editSel = null; }
  _editBar() {
    const t = this._tool, locked = this._seqLocked(), temp = this._hasTemp();
    const tools = [["select", "Select", "mdi:cursor-default"], ["wall", "Wall", "mdi:vector-line"], ["nogo", "No-Go", "mdi:cancel"], ["nomop", "No-Mop", "mdi:water-off"], ["merge", "Merge", "mdi:call-merge"], ["split", "Split", "mdi:call-split"], ["rename", "Rename", "mdi:rename-box-outline"]];
    const hint = {
      select: "Tap a wall or zone to select it, then Delete.", wall: "Drag to draw a virtual wall.", nogo: "Drag to draw a no-go zone.", nomop: "Drag to draw a no-mop zone.",
      merge: "Tap two or more neighbouring rooms.", split: this._splitRoom ? "Now drag a line across the room." : "Tap the room to split.", rename: "Tap a room to rename it.",
    }[t];
    let action = "";
    if (t === "merge") action = `<button class="cta" data-a="eapply" ${this._editRooms.size >= 2 && !locked ? "" : "disabled"}>Merge${this._editRooms.size ? ` (${this._editRooms.size})` : ""}</button>`;
    else if (t === "split") action = `<button class="cta" data-a="eapply" ${this._splitRoom && this._splitLine && !locked ? "" : "disabled"}>Split</button>`;
    else if (t !== "rename") action = `<button class="cta" data-a="eapply" ${this._dirty && !locked ? "" : "disabled"}>Apply</button>`;
    return `<div class="tools">${tools.map(([k, l, i]) => {
        const off = temp && ["merge", "split", "rename"].includes(k);
        return `<div class="tool ${t === k ? "on" : ""} ${off ? "off" : ""}" data-tool="${k}"><ha-icon icon="${i}"></ha-icon>${l}</div>`;
      }).join("")}</div>
      <div class="desc" style="text-align:center;margin:6px 16px 0">${locked ? "Robot is running — editing is disabled." : temp && ["merge", "split", "rename"].includes(t) ? "Save or discard the new map first." : hint}</div>
      <div class="seqbar"><button class="cta ghost" data-a="eexit">Cancel</button>${this._editSel ? `<button class="cta ghost" data-a="edelete">Delete</button>` : ""}${action}</div>`;
  }
  _editSvg(cal, w, fs) {
    const sw = w / 200, rc = (z) => { const a = cal.toImg(z[0], z[1]), b = cal.toImg(z[2], z[3]); return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }; };
    const pick = this._tool === "select" ? "pointer-events:auto;cursor:pointer" : "pointer-events:none";
    const sel = (k, i) => this._editSel && this._editSel.k === k && this._editSel.i === i;
    let o = "";
    const rect = (k, list, fill, stroke) => list.forEach((z, i) => {
      const r = rc(z);
      o += `<rect data-ek="${k}" data-ei="${i}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${fill}" stroke="${sel(k, i) ? "#ffd400" : stroke}" stroke-width="${sel(k, i) ? sw * 2 : sw}" stroke-dasharray="${w / 80}" style="${pick}"/>`;
    });
    rect("no_mops", this._draft.no_mops, "#2f80ed33", "#2f80ed");
    rect("zones", this._draft.zones, "#e5393555", "#e53935");
    this._draft.walls.forEach((l, i) => {
      const a = cal.toImg(l[0], l[1]), b = cal.toImg(l[2], l[3]);
      o += `<g data-ek="walls" data-ei="${i}" style="${pick}"><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="transparent" stroke-width="${w / 30}"/><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${sel("walls", i) ? "#ffd400" : "#e53935"}" stroke-width="${sel("walls", i) ? sw * 2.5 : sw * 1.6}" stroke-linecap="round"/></g>`;
    });
    if (["merge", "split", "rename"].includes(this._tool)) {
      this._rooms().forEach((r, i) => {
        const c = cal.toImg((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2);
        const on = this._editRooms.has(r.id) || this._splitRoom === r.id;
        o += `<g data-er="${r.id}" style="cursor:pointer"><rect x="${c.x - fs * 3}" y="${c.y - fs * 0.9}" width="${fs * 6}" height="${fs * 1.8}" rx="${fs * 0.9}" fill="${on ? "#3d6bff" : ROOM_COLORS[i % ROOM_COLORS.length]}" opacity="0.92"/><text x="${c.x}" y="${c.y + fs * 0.35}" text-anchor="middle" font-size="${fs}" fill="${on ? "#fff" : "#345"}">${r.name}</text></g>`;
      });
    }
    if (this._splitLine) {
      const a = cal.toImg(this._splitLine[0], this._splitLine[1]), b = cal.toImg(this._splitLine[2], this._splitLine[3]);
      o += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#3d6bff" stroke-width="${sw * 2}" stroke-dasharray="${w / 60}" style="pointer-events:none"/>`;
    }
    return o;
  }
  _bindEditDrawing(svg, cal, size) {
    const t = this._tool;
    if (!["wall", "nogo", "nomop", "split"].includes(t)) return;
    const NS = "http://www.w3.org/2000/svg", line = t === "wall" || t === "split";
    const pt = (ev) => { const r = svg.getBoundingClientRect(); return { x: ((ev.clientX - r.left) / r.width) * size.w, y: ((ev.clientY - r.top) / r.height) * size.h }; };
    let start = null;
    svg.addEventListener("pointerdown", (ev) => { if (ev.target.closest?.("[data-er]")) return; start = pt(ev); this._dragging = true; svg.setPointerCapture(ev.pointerId); });
    svg.addEventListener("pointermove", (ev) => {
      if (!start) return;
      const p = pt(ev);
      let el = svg.querySelector(".draft");
      if (!el) { el = document.createElementNS(NS, line ? "line" : "rect"); el.setAttribute("class", "draft"); el.setAttribute("stroke", t === "nomop" ? "#2f80ed" : t === "split" ? "#3d6bff" : "#e53935"); el.setAttribute("fill", line ? "none" : "#ffffff33"); el.setAttribute("stroke-width", size.w / 200); svg.appendChild(el); }
      if (line) { el.setAttribute("x1", start.x); el.setAttribute("y1", start.y); el.setAttribute("x2", p.x); el.setAttribute("y2", p.y); }
      else { el.setAttribute("x", Math.min(start.x, p.x)); el.setAttribute("y", Math.min(start.y, p.y)); el.setAttribute("width", Math.abs(p.x - start.x)); el.setAttribute("height", Math.abs(p.y - start.y)); }
    });
    svg.addEventListener("pointerup", (ev) => {
      if (!start) return;
      const s = start, p = pt(ev); start = null; this._dragging = false;
      this._finishShape(t, cal.toVac(s.x, s.y), cal.toVac(p.x, p.y));
    });
    svg.addEventListener("pointercancel", () => { start = null; this._dragging = false; });
  }

  // ---------- confirm / input / list sheets, error handling ----------
  _confirm(c) { this._cf = c; this._sheet = "confirm"; this._render(); }
  async _try(fn) {
    try { await fn(); this._error = null; }
    catch (e) { this._error = e?.message || String(e); }
    this._sheet = null; this._cf = null; this._input = null; this._list = null;
    this._render();
  }
  _backup() { return this._call(DOMAIN, "vacuum_backup_map", { map_id: this._vac().attributes.selected_map_id }, this._config.entity); }
  _confirmSheet() {
    const c = this._cf; if (!c) return "";
    const verb = c.verb || "Continue", rec = c.backup && !this._backedUp;
    return `<h4 style="margin:0 0 6px;font-size:1.2em">${c.title}</h4><div class="desc">${c.body || ""}</div>
      ${rec ? `<div class="desc" style="margin-top:8px">Backing up the map first is recommended.</div>` : ""}
      <div class="seqbar" style="padding:0;flex-direction:column">
        ${rec ? `<button class="cta" data-cf="backup">Back up &amp; ${verb.toLowerCase()}</button><button class="cta ghost" data-cf="go">${verb} without backup</button>` : `<button class="cta" data-cf="go">${verb}</button>`}
        <button class="cta ghost" data-cf="cancel">Cancel</button></div>`;
  }
  _inputSheet() {
    const i = this._input; if (!i) return "";
    return `<h4 style="margin:0 0 10px;font-size:1.2em">${i.title}</h4>
      <input data-inp value="${String(i.value).replace(/"/g, "&quot;")}" style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--divider-color,#0003);background:var(--dv-chip);color:var(--dv-fg);font:inherit;box-sizing:border-box">
      <div class="seqbar" style="padding:0"><button class="cta ghost" data-in="cancel">Cancel</button><button class="cta" data-in="save">Save</button></div>`;
  }
  _listSheet() {
    const l = this._list; if (!l) return "";
    return `<h4 style="margin:0 0 8px;font-size:1.2em">${l.title}</h4>${l.items.map((it, n) => `<div class="row" data-li="${n}" style="cursor:pointer"><span>${it.label}</span><ha-icon icon="mdi:chevron-right"></ha-icon></div>`).join("")}`;
  }
  _sheetBody(hasCustom) {
    switch (this._sheet) {
      case "mode": return this._modeSheet(hasCustom);
      case "room": return this._roomEdit ? this._roomSheet() : "";
      case "maps": return this._mapsSheet();
      case "confirm": return this._confirmSheet();
      case "input": return this._inputSheet();
      case "list": return this._listSheet();
      case "maint": return this._maintSheet();
      default: return this._cleanSheet();
    }
  }
  _mapAction(kind) {
    const info = this._curMap(); if (!info) return;
    const eid = this._config.entity, nm = (info.custom_name || info.name || "").replace(/_/g, " ");
    if (kind === "rename") {
      this._input = { title: "Rename map", value: info.custom_name || info.name, run: (v) => this._call(DOMAIN, "vacuum_rename_map", { map_id: info.id, map_name: v }, eid) };
      this._sheet = "input"; this._render();
    } else if (kind === "backup") {
      this._confirm({ title: `Back up ${nm}?`, body: "Saves a recovery copy of this map on the robot.", verb: "Back up", run: () => this._backup() });
    } else if (kind === "restore") {
      const items = (info.recovery_map || []).map((label) => ({ label, idx: Number((label.match(/Map(\d+)/) || [])[1]) })).filter((x) => x.idx);
      this._list = { title: "Restore from…", items: items.map((x) => ({ label: x.label, run: () => this._confirm({ title: "Restore this map?", body: `Replaces ${nm} with: ${x.label}`, verb: "Restore", backup: true, run: () => this._call(DOMAIN, "vacuum_restore_map", { recovery_map_index: x.idx, map_id: info.id }, eid) }) })) };
      this._sheet = "list"; this._render();
    } else if (kind === "delete") {
      this._confirm({ title: `Delete ${nm}?`, body: "This removes the map from the robot.", verb: "Delete", backup: true, run: () => this._call(DOMAIN, "vacuum_delete_map", { map_id: info.id }, eid) });
    }
  }
  _tempAction(kind) {
    const eid = this._config.entity;
    if (kind === "save") this._confirm({ title: "Save the new map?", body: "Adds it as a saved map.", verb: "Save", run: () => this._call(DOMAIN, "vacuum_save_temporary_map", {}, eid) });
    else if (kind === "discard") this._confirm({ title: "Discard the new map?", body: "The new map is deleted.", verb: "Discard", run: () => this._call(DOMAIN, "vacuum_discard_temporary_map", {}, eid) });
    else {
      const maps = this._vac().attributes.maps || [];
      this._list = { title: "Replace which map?", items: maps.map((m) => ({ label: (m.custom_name || m.name).replace(/_/g, " "), run: () => this._confirm({ title: "Replace this map?", body: "The saved map is overwritten by the new one.", verb: "Replace", run: () => this._call(DOMAIN, "vacuum_replace_temporary_map", { map_id: m.id }, eid) }) })) };
      this._sheet = "list"; this._render();
    }
  }

  // ---------- zone drawing ----------
  _bindZoneDrawing(wrap, svg, cal, size) {
    const pt = (ev) => {
      const r = svg.getBoundingClientRect();
      return { x: ((ev.clientX - r.left) / r.width) * size.w, y: ((ev.clientY - r.top) / r.height) * size.h };
    };
    let start = null;
    svg.addEventListener("pointerdown", (ev) => {
      if (this._mode !== "zone" || this._seqEdit || this._editMode) return;
      start = pt(ev); this._dragging = true; svg.setPointerCapture(ev.pointerId);
    });
    svg.addEventListener("pointermove", (ev) => {
      if (!start) return;
      const p = pt(ev);
      let r = svg.querySelector(".draft");
      if (!r) { r = document.createElementNS("http://www.w3.org/2000/svg", "rect"); r.setAttribute("class", "draft"); r.setAttribute("fill", "#3d6bff33"); r.setAttribute("stroke", "#3d6bff"); r.setAttribute("stroke-width", size.w / 200); svg.appendChild(r); }
      r.setAttribute("x", Math.min(start.x, p.x)); r.setAttribute("y", Math.min(start.y, p.y));
      r.setAttribute("width", Math.abs(p.x - start.x)); r.setAttribute("height", Math.abs(p.y - start.y));
    });
    svg.addEventListener("pointerup", (ev) => {
      if (!start) return;
      const p = pt(ev), s = start; start = null; this._dragging = false;
      if (Math.abs(p.x - s.x) > 8 && Math.abs(p.y - s.y) > 8) {
        const a = cal.toVac(s.x, s.y), b = cal.toVac(p.x, p.y);
        this._zones.push([
          Math.round(Math.min(a.x, b.x)), Math.round(Math.min(a.y, b.y)),
          Math.round(Math.max(a.x, b.x)), Math.round(Math.max(a.y, b.y)),
        ]);
      }
      this._render();
    });
  }

  // ---------- rendering ----------
  _render() {
    const root = this.shadowRoot;
    const vac = this._vac();
    if (!vac) { root.innerHTML = `<ha-card><div class="err">Entity not found: ${this._config.entity}</div></ha-card>`; return; }
    const a = vac.attributes;
    const name = this._config.name || a.friendly_name || "Vacuum";
    const stateTxt = this._hass.formatEntityState ? this._hass.formatEntityState(vac) : vac.state;
    const area = this._st("cleaned_area")?.state ?? a.cleaned_area ?? "–";
    const time = this._st("cleaning_time")?.state ?? a.cleaning_time ?? "–";
    const batt = this._st("battery")?.state ?? a.battery_level ?? "–";
    const cleaning = vac.state === "cleaning";
    const camId = this._camera();
    const cam = camId && this._hass.states[camId];
    const pic = cam?.attributes?.entity_picture;
    const hasCustom = this._st("customized_cleaning")?.state === "on";
    const maint = this._hasMaint(), low = maint ? this._low() : [];

    const style = document.createElement("style"); style.textContent = CSS;
    const card = document.createElement("ha-card");
    card.innerHTML = `
      ${!this._editMode && !this._seqEdit && cam ? `<div class="editbtn" data-a="edit" title="Edit map"><ha-icon icon="mdi:pencil-outline"></ha-icon></div>` : ""}
      ${this._error ? `<div class="err" data-a="clearerr" style="cursor:pointer">${this._error}</div>` : ""}
      ${this._config.show_name ? `<div class="hdr"><div class="name">${name}</div><div class="state">${stateTxt}</div></div>` : ""}
      ${this._hasTemp() ? `<div class="banner">New map ready <span><button data-a="tmpsave">Save</button><button data-a="tmpreplace">Replace</button><button data-a="tmpdiscard">Discard</button></span></div>` : ""}
      ${maint ? this._maintBanner(low) : ""}
      <div class="stats">
        <div class="stat"><b>${area}</b><small>m²</small><div>Cleaning Area</div></div>
        <div class="stat"><b>${time}</b><small>min</small><div>Runtime</div></div>
        <div class="stat"><b>${batt}</b><small>%</small><div>Battery</div></div>
      </div>
      <div class="mapwrap">
        ${pic ? `<img data-map>` : `<div class="err">No map camera found</div>`}
        <svg class="ov"></svg>
        <div class="side">
          <div class="sidebtn" data-a="mode"><div class="ic"><ha-icon icon="mdi:tune-variant"></ha-icon></div>Cleaning Mode</div>
          <div class="sidebtn" data-a="clean"><div class="ic"><ha-icon icon="mdi:rotate-3d-variant"></ha-icon></div>Self-Cleaning Settings</div>
          ${maint ? `<div class="sidebtn" data-a="maint"><div class="ic"><ha-icon icon="mdi:wrench-outline"></ha-icon>${low.length ? `<span class="dot"></span>` : ""}</div>Maintenance</div>` : ""}
        </div>
        <div class="left">
          ${this._mode === "room" && hasCustom && this._selectedRooms.size ? `<div class="leftbtn" data-a="roomsettings"><div class="ic"><ha-icon icon="mdi:cog-outline"></ha-icon></div>Room Settings</div>` : ""}
          ${this._mode === "zone" ? `<div class="leftbtn" data-a="clearzones"><div class="ic"><ha-icon icon="mdi:vector-square-remove"></ha-icon></div>Clear Zones</div>` : ""}
          ${this._mode !== "all" ? `<div class="leftbtn" data-a="times"><div class="ic">x${this._repeats}</div>Cleaning Times</div>` : ""}
        </div>
      </div>
      ${this._editMode ? this._editBar() : this._seqEdit ? `
      <div class="desc" style="text-align:center;margin:10px 16px 0">Tap rooms in the order you want them cleaned.</div>
      <div class="seqbar"><button class="cta ghost" data-a="seqreset">Reset</button><button class="cta" data-a="seqdone">Done${this._sequence.length ? ` (${this._sequence.length})` : ""}</button></div>` : `
      <div class="seg">${["room", "all", "zone"].map((m) => `<button data-m="${m}" class="${this._mode === m ? "on" : ""}">${m[0].toUpperCase() + m.slice(1)}</button>`).join("")}</div>
      <div class="bar">
        <div class="item" data-a="maps"><ha-icon icon="mdi:layers"></ha-icon>Map</div>
        <button class="go" data-a="go"><ha-icon icon="mdi:${cleaning ? "pause" : "play"}"></ha-icon></button>
        <div class="item" data-a="dock"><ha-icon icon="mdi:${vac.state === "docked" ? "lightning-bolt" : "home-import-outline"}"></ha-icon>${vac.state === "docked" ? stateTxt : "Return to dock"}</div>
      </div>`}
      ${this._sheet ? `<div class="sheet-bg" data-a="closesheet"><div class="sheet" data-stop="1">${this._sheetBody(hasCustom)}</div></div>` : ""}
    `;
    if (pic) { this._ensureImg(pic); card.querySelector("img[data-map]").replaceWith(this._img); }
    this._card = card;
    root.replaceChildren(style, card);
    this._drawOverlay(card);
    this._wire(card);
  }

  _hasMaint() { return this._config.show_maintenance !== false && CONSUMABLES.some((c) => this._st(`${c.id}_left`)); }
  // Parts at or below the warning threshold. Also forgets dismissals for parts that recovered (e.g. after a reset).
  _low() {
    const warn = this._config.maintenance_warn_percent;
    const low = CONSUMABLES.filter((c) => {
      const st = this._st(`${c.id}_left`), n = Number(st?.state);
      return st && st.state !== "unavailable" && st.state !== "unknown" && Number.isFinite(n) && n <= warn;
    });
    for (const id of [...this._maintDismissed]) if (!low.some((c) => c.id === id)) this._maintDismissed.delete(id);
    return low;
  }
  _maintBanner(low) {
    const fresh = low.filter((c) => !this._maintDismissed.has(c.id));
    if (!fresh.length || this._editMode || this._seqEdit) return "";
    const names = fresh.map((c) => c.label);
    const txt = names.length === 1 ? `${names[0]} is` : names.length === 2 ? `${names[0]} and ${names[1].toLowerCase()} are` : `${names.length} parts are`;
    return `<div class="banner">${txt} running low <span><button data-a="maint">View</button><button data-a="maintdismiss">Dismiss</button></span></div>`;
  }
  _consumableRow(c) {
    const life = this._st(`${c.id}_left`);
    if (!life) return "";
    const pct = Number(life.state), ok = life.state !== "unavailable" && life.state !== "unknown" && Number.isFinite(pct);
    const warn = this._config.maintenance_warn_percent;
    const lvl = !ok ? "" : pct <= warn ? "lvl-low" : pct <= warn * 3 ? "lvl-warn" : "lvl-ok";
    const t = this._st(`${c.id}_time_left`);
    const left = t && t.state !== "unavailable" && t.state !== "unknown"
      ? (this._hass.formatEntityState ? this._hass.formatEntityState(t) : `${t.state} ${t.attributes.unit_of_measurement || ""}`.trim()) + " left"
      : "";
    const rid = c.reset !== null && this._find(`reset_${c.id}`);
    const canReset = rid && this._hass.states[rid]?.state !== "unavailable";
    return `<div class="cons"><div class="top"><ha-icon icon="${c.icon}"></ha-icon><div class="nm">${c.label}<br><small>${left}</small></div>
      <b>${ok ? Math.round(pct) + "%" : "–"}</b>${canReset ? `<button class="rchip" data-reset="${c.id}">Reset</button>` : ""}</div>
      <div class="prog"><div class="${lvl}" style="width:${ok ? Math.max(0, Math.min(100, pct)) : 0}%"></div></div></div>`;
  }
  _hasBase() { return BASE_STATUS.some(([k]) => this._st(k)) || ["btn_auto_empty", "btn_water_tank_draining", "btn_clear_warning"].some((k) => this._find(k)); }
  _pretty(st) {
    if (this._hass.formatEntityState) return this._hass.formatEntityState(st);
    const t = String(st.state).replace(/_/g, " ");
    return t[0].toUpperCase() + t.slice(1);
  }
  _baseButton(key, label, cls, confirm) {
    const id = this._find(key);
    if (!id) return "";
    const off = this._hass.states[id]?.state === "unavailable";
    return `<button class="cta ${cls}" ${off ? "disabled" : ""} ${confirm ? `data-cpress="${key}" data-label="${label}"` : `data-press="${key}"`}>${label}</button>`;
  }
  _baseTab() {
    const rows = BASE_STATUS.map(([k, label, ok]) => {
      const st = this._st(k);
      if (!st) return "";
      const bad = st.state !== "unavailable" && st.state !== "unknown" && !ok.includes(st.state);
      return `<div class="row"><span>${label}</span><b style="${bad ? "color:#e53935" : ""}">${this._pretty(st)}</b></div>`;
    }).join("");
    return `${rows}${this._baseButton("btn_auto_empty", "Start auto-empty", "")}
      ${this._baseButton("btn_water_tank_draining", "Drain water tank", "ghost", true)}
      ${this._baseButton("btn_clear_warning", "Clear warning", "ghost")}`;
  }
  _maintSheet() {
    const tabs = [["cons", "Consumables"], ["base", "Base Station"]].filter(([k]) => k === "cons" || this._hasBase());
    const tab = tabs.some(([k]) => k === this._mtab) ? this._mtab : "cons";
    const body = tab === "base" ? this._baseTab() : CONSUMABLES.map((c) => this._consumableRow(c)).join("");
    return `<div class="tabs">${tabs.map(([k, l]) => `<div data-mtab="${k}" class="${tab === k ? "on" : ""}">${l}</div>`).join("")}</div>${body}`;
  }

  _optionsRow(key) {
    const s = this._st(key);
    if (!s) return "";
    const opts = s.attributes.options || [];
    return `<div class="opts">${opts.map((o) => `<button data-sel="${key}" data-opt="${o}" class="${o === s.state ? "on" : ""}">${this._hass.formatEntityState ? this._hass.formatEntityState(s, o) : o}</button>`).join("")}</div>`;
  }
  _section(title, key) {
    const s = this._st(key);
    if (!s) return "";
    const cur = this._hass.formatEntityState ? this._hass.formatEntityState(s) : s.state;
    return `<h4>${title}:</h4><div class="val">${cur}</div>${this._optionsRow(key)}`;
  }
  _modeSheet(hasCustom) {
    const cm = this._st("cleaning_mode")?.state || "";
    const showWater = !/sweeping$/i.test(cm) || !cm;
    const showSuction = !/^mopping$/i.test(cm);
    return `
      ${this._section("Cleaning Mode", "cleaning_mode")}
      ${showSuction ? this._section("Suction Settings", "suction_level") : ""}
      ${showWater ? this._section("Dampness of Mop Pad", this._st("mop_pad_humidity") ? "mop_pad_humidity" : "water_volume") : ""}
      <div class="row" data-a="${this._seqLocked() ? "" : "seqedit"}" style="cursor:pointer;${this._seqLocked() ? "opacity:.5" : ""}"><h4 style="margin:0">Cleaning Sequence</h4><ha-icon icon="mdi:chevron-right"></ha-icon></div>
      ${this._st("customized_cleaning") ? `<div class="row"><div><h4 style="margin:0">Customized Cleaning</h4><div class="desc">After enabled, personalized suction power and water volume can be set for each area.</div></div><ha-switch data-sw="customized_cleaning" ${hasCustom ? "checked" : ""}></ha-switch></div>` : ""}`;
  }
  _radios(key) {
    const s = this._st(key);
    if (!s) return "";
    return `<div class="radios">${(s.attributes.options || []).map((o) => `<label><input type="radio" name="${key}" data-sel="${key}" data-opt="${o}" ${o === s.state ? "checked" : ""}>${this._hass.formatEntityState ? this._hass.formatEntityState(s, o) : o}</label>`).join("")}</div>`;
  }
  _switchRow(key, title, desc) {
    const s = this._st(key);
    if (!s) return "";
    return `<div class="row"><div><h4 style="margin:0">${title}</h4><div class="desc">${desc}</div></div><ha-switch data-sw="${key}" ${s.state === "on" ? "checked" : ""}></ha-switch></div>`;
  }
  _mapsSheet() {
    const s = this._st("selected_map");
    if (!s) return "";
    const locked = this._seqLocked();
    const label = (o) => o.replace(/_/g, " ");
    return `<h4 style="margin:0 0 8px;font-size:1.2em">Select Map</h4>
      ${locked ? `<div class="desc" style="color:var(--error-color,#c00)">Can't switch maps while the robot is running.</div>` : ""}
      ${(s.attributes.options || []).map((o) => `<div class="row" data-map="${o}" style="cursor:pointer;${locked ? "opacity:.5;pointer-events:none" : ""}"><span>${label(o)}</span>${o === s.state ? `<ha-icon icon="mdi:check" style="color:var(--dv-accent)"></ha-icon>` : ""}</div>`).join("")}
      <h4 style="margin:18px 0 6px">Manage this map</h4>
      <div class="opts" style="${locked ? "opacity:.5;pointer-events:none" : ""}"><button data-mm="rename">Rename</button><button data-mm="backup">Back up</button><button data-mm="restore">Restore</button><button data-mm="delete" style="color:var(--error-color,#c00)">Delete</button></div>`;
  }
  _areaRow() {
    const n = this._st("self_clean_area");
    if (!n) return "";
    const a = n.attributes;
    return `<h4>Frequency for returning to self-clean</h4><div class="val">By Area ${n.state} m²</div>
      <input type="range" data-area min="${a.min ?? 10}" max="${a.max ?? 30}" step="${a.step ?? 1}" value="${n.state}" style="width:100%">`;
  }
  _cleanSheet() {
    const tab = this._tab;
    const tabs = [["wash", "Clean Mop Pad"], ["dry", "Dry Mop Pad"], ["empty", "Auto-Empty"]];
    let body = "";
    if (tab === "wash") {
      body = `${this._switchRow("self_clean", "Self-Clean", "After disabled, the robot performs dry mopping. It will return to the base station to have the mop pad cleaned when the cleaning task is complete.")}
        ${this._st("self_clean_frequency") ? `<h4>Frequency for returning to self-clean</h4>${this._optionsRow("self_clean_frequency")}` : this._areaRow()}
        ${this._st("mop_wash_level") ? `<h4>Water amount for washing mop pad</h4>${this._radios("mop_wash_level")}` : ""}
        <button class="cta" data-press="btn_self_clean">Clean Mop Pad</button>`;
    } else if (tab === "dry") {
      body = `${this._switchRow("auto_drying", "Automatic mop-pad drying", "Switch on/off auto drying after washing")}
        ${this._st("drying_time") ? `<h4>Drying Time</h4>${this._radios("drying_time")}` : ""}
        <button class="cta orange" data-press="btn_manual_drying">Start Drying</button>`;
    } else {
      body = `${this._switchRow("auto_dust_collecting", "Automatic dust collecting", "If disabled, the auto-empty process will not start after the robot completes a cleaning task.")}
        ${this._st("auto_empty_frequency") ? `<h4>Auto-Empty Frequency</h4><div class="desc">Auto-empty after the designated number of cleaning tasks</div>${this._radios("auto_empty_frequency")}` : ""}
        <button class="cta" data-press="btn_auto_empty">Start auto-empty</button>`;
    }
    return `<div class="tabs">${tabs.map(([k, l]) => `<div data-tab="${k}" class="${tab === k ? "on" : ""}">${l}</div>`).join("")}</div>${body}`;
  }

  _drawOverlay(card) {
    let svg = card.querySelector("svg.ov");
    const img = card.querySelector(".mapwrap img");
    const cal = this._calibration();
    if (!svg || !img || !cal) return;
    // Fresh svg each draw: drops listeners from the previous draw (no duplicate zone handlers).
    const fresh = svg.cloneNode(false); svg.replaceWith(fresh); svg = fresh;
    const draw = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      if (!w) return;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const fs = w / 28;
      let out = "";
      const custom = this._st("customized_cleaning")?.state === "on";
      if (this._editMode) {
        out += this._editSvg(cal, w, fs);
      } else if (this._seqEdit) {
        this._rooms().forEach((r, i) => {
          const c = cal.toImg((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2);
          const n = this._sequence.indexOf(r.id) + 1;
          out += `<g data-seq="${r.id}" style="cursor:pointer"><rect x="${c.x - fs * 3}" y="${c.y - fs * 0.9}" width="${fs * 6}" height="${fs * 1.8}" rx="${fs * 0.9}" fill="${n ? "#3d6bff" : ROOM_COLORS[i % ROOM_COLORS.length]}" opacity="0.9"/><text x="${c.x}" y="${c.y + fs * 0.35}" text-anchor="middle" font-size="${fs}" fill="${n ? "#fff" : "#345"}">${r.name}</text>${n ? `<circle cx="${c.x - fs * 3}" cy="${c.y - fs * 0.9}" r="${fs * 0.9}" fill="#fff" stroke="#3d6bff" stroke-width="${fs / 10}"/><text x="${c.x - fs * 3}" y="${c.y - fs * 0.55}" text-anchor="middle" font-size="${fs * 1.1}" font-weight="600" fill="#3d6bff">${n}</text>` : ""}</g>`;
        });
      } else if (this._mode === "room") {
        this._rooms().forEach((r, i) => {
          const c = cal.toImg((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2);
          const on = this._selectedRooms.has(r.id);
          out += `<g data-room="${r.id}" style="cursor:pointer"><rect x="${c.x - fs * 3}" y="${c.y - fs * 0.9}" width="${fs * 6}" height="${fs * 1.8}" rx="${fs * 0.9}" fill="${on ? "#3d6bff" : ROOM_COLORS[i % ROOM_COLORS.length]}" opacity="${on ? 0.95 : 0.8}"/><text x="${c.x}" y="${c.y + fs * 0.35}" text-anchor="middle" font-size="${fs}" fill="${on ? "#fff" : "#345"}">${r.name ?? r.id}</text>${custom ? `<text x="${c.x}" y="${c.y + fs * 1.9}" text-anchor="middle" font-size="${fs * 0.75}" fill="#345">${["Quiet", "Std", "Strong", "Turbo"][r.suction_level] ?? ""} · x${r.cleaning_times ?? 1}</text>` : ""}</g>`;
        });
      }
      for (const z of (this._editMode ? [] : this._zones)) {
        const a = cal.toImg(z[0], z[1]), b = cal.toImg(z[2], z[3]);
        out += `<rect x="${Math.min(a.x, b.x)}" y="${Math.min(a.y, b.y)}" width="${Math.abs(b.x - a.x)}" height="${Math.abs(b.y - a.y)}" fill="#3d6bff33" stroke="#3d6bff" stroke-width="${w / 200}" stroke-dasharray="${w / 60}"/>`;
      }
      svg.innerHTML = out;
      svg.querySelectorAll("[data-room]").forEach((g) => {
        // long-press a room (customized cleaning on) to edit its settings
        let t = null;
        g.addEventListener("pointerdown", () => {
          if (!custom) return;
          t = setTimeout(() => { t = null; this._lp = true; this._openRoom(Number(g.dataset.room)); }, 500);
        });
        for (const ev of ["pointerup", "pointerleave", "pointercancel"]) g.addEventListener(ev, () => { if (t) { clearTimeout(t); t = null; } });
      });
      svg.querySelectorAll("[data-room]").forEach((g) => g.addEventListener("click", () => {
        if (this._lp) { this._lp = false; return; }
        const id = Number(g.dataset.room);
        this._selectedRooms.has(id) ? this._selectedRooms.delete(id) : this._selectedRooms.add(id);
        this._render();
      }));
      svg.querySelectorAll("[data-seq]").forEach((g) => g.addEventListener("click", () => this._toggleSequenceRoom(Number(g.dataset.seq))));
      svg.style.pointerEvents = this._mode === "all" && !this._seqEdit && !this._editMode ? "none" : "auto";
      if (this._editMode) {
        svg.querySelectorAll("[data-ek]").forEach((el) => el.addEventListener("click", (ev) => {
          ev.stopPropagation(); this._editSel = { k: el.dataset.ek, i: Number(el.dataset.ei) }; this._render();
        }));
        svg.querySelectorAll("[data-er]").forEach((g) => g.addEventListener("click", () => this._editRoomTap(Number(g.dataset.er))));
        this._bindEditDrawing(svg, cal, { w, h });
      } else this._bindZoneDrawing(card, svg, cal, { w, h });
    };
    img.complete ? draw() : img.addEventListener("load", draw, { once: true });
  }

  _wire(card) {
    card.querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => { this._mode = b.dataset.m; this._render(); }));
    card.querySelectorAll("[data-a]").forEach((el) => el.addEventListener("click", (ev) => {
      const act = el.dataset.a;
      if (act === "closesheet") { if (ev.target === el) { this._sheet = null; this._render(); } return; }
      if (act === "mode" || act === "clean" || act === "maint") { this._sheet = act; this._render(); }
      else if (act === "maintdismiss") { this._low().forEach((c) => this._maintDismissed.add(c.id)); this._render(); }
      else if (act === "edit") this._enterEdit();
      else if (act === "eexit") this._exitEdit();
      else if (act === "eapply") this._toolbarAction();
      else if (act === "edelete") this._deleteSel();
      else if (act === "clearerr") { this._error = null; this._render(); }
      else if (act === "tmpsave") this._tempAction("save");
      else if (act === "tmpdiscard") this._tempAction("discard");
      else if (act === "tmpreplace") this._tempAction("replace");
      else if (act === "roomsettings") this._openRoom([...this._selectedRooms].pop());
      else if (act === "rsave") this._saveRoom();
      else if (act === "rcancel") { this._roomEdit = null; this._sheet = null; this._render(); }
      else if (act === "seqedit") this._enterSequence();
      else if (act === "seqreset") { this._sequence = []; this._render(); }
      else if (act === "seqdone") this._saveSequence();
      else if (act === "go") this._start();
      else if (act === "dock") this._call("vacuum", "return_to_base", {}, this._config.entity);
      else if (act === "clearzones") { this._zones = []; this._render(); }
      else if (act === "times") { this._repeats = (this._repeats % 3) + 1; this._render(); }
      else if (act === "maps") { if (this._st("selected_map")) { this._sheet = "maps"; this._render(); } }
    }));
    card.querySelectorAll("[data-tool]").forEach((el) => el.addEventListener("click", () => { if (!el.classList.contains("off")) this._setTool(el.dataset.tool); }));
    card.querySelectorAll("[data-mm]").forEach((el) => el.addEventListener("click", () => this._mapAction(el.dataset.mm)));
    card.querySelectorAll("[data-cf]").forEach((el) => el.addEventListener("click", () => {
      const c = this._cf, k = el.dataset.cf;
      if (k === "cancel" || !c) { this._cf = null; this._sheet = null; this._render(); return; }
      this._try(async () => { if (k === "backup") { await this._backup(); this._backedUp = true; } await c.run(); });
    }));
    card.querySelectorAll("[data-li]").forEach((el) => el.addEventListener("click", () => this._list?.items[Number(el.dataset.li)]?.run()));
    card.querySelectorAll("[data-inp]").forEach((el) => el.addEventListener("input", () => { if (this._input) this._input.value = el.value; }));
    card.querySelectorAll("[data-in]").forEach((el) => el.addEventListener("click", () => {
      const i = this._input;
      if (el.dataset.in === "cancel" || !i || !String(i.value).trim()) { this._input = null; this._sheet = null; this._render(); return; }
      this._try(() => i.run(String(i.value).trim()));
    }));
    card.querySelectorAll("[data-map]").forEach((el) => el.addEventListener("click", () => {
      this._select("selected_map", el.dataset.map); this._sheet = null; this._render();
    }));
    card.querySelectorAll("[data-rd]").forEach((el) => el.addEventListener("click", () => {
      if (!this._roomEdit) return;
      this._roomEdit.draft[el.dataset.rd] = Number(el.dataset.v); this._render();
    }));
    card.querySelectorAll("[data-sel]").forEach((el) => el.addEventListener("click", () => this._select(el.dataset.sel, el.dataset.opt)));
    card.querySelectorAll("[data-sw]").forEach((el) => el.addEventListener("change", () => this._toggle(el.dataset.sw)));
    card.querySelectorAll("[data-press]").forEach((el) => el.addEventListener("click", () => this._press(el.dataset.press)));
    card.querySelectorAll("[data-area]").forEach((el) => el.addEventListener("change", () => {
      const id = this._find("self_clean_area");
      if (id) this._hass.callService("number", "set_value", { entity_id: id, value: Number(el.value) });
    }));
    card.querySelectorAll("[data-reset]").forEach((el) => el.addEventListener("click", () => {
      const c = CONSUMABLES.find((x) => x.id === el.dataset.reset), id = this._find(`reset_${c.id}`);
      if (!id) return;
      this._confirm({ title: `Reset ${c.label.toLowerCase()}?`, body: "Only do this after replacing or cleaning the part. It restarts the life counter.", verb: "Reset",
        run: () => this._hass.callService("button", "press", { entity_id: id }) });
    }));
    card.querySelectorAll("[data-mtab]").forEach((el) => el.addEventListener("click", () => { this._mtab = el.dataset.mtab; this._render(); }));
    card.querySelectorAll("[data-cpress]").forEach((el) => el.addEventListener("click", () => {
      const id = this._find(el.dataset.cpress);
      if (id) this._confirm({ title: `${el.dataset.label}?`, body: "The base station runs this now.", verb: "Continue", run: () => this._hass.callService("button", "press", { entity_id: id }) });
    }));
    card.querySelectorAll("[data-tab]").forEach((el) => el.addEventListener("click", () => { this._tab = el.dataset.tab; this._render(); }));
  }
}

class DreameVacuumCardEditor extends HTMLElement {
  setConfig(config) { this._config = config; this._draw(); }
  set hass(hass) { this._hass = hass; this._draw(); }
  _draw() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => ({ entity: "Vacuum", camera: "Map camera (optional)", name: "Name (optional)", show_name: "Show header" }[s.name] || s.name);
      this._form.addEventListener("value-changed", (ev) => {
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: ev.detail.value }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = this._config;
    this._form.schema = [
      { name: "entity", required: true, selector: { entity: { domain: "vacuum", integration: DOMAIN } } },
      { name: "camera", selector: { entity: { domain: "camera", integration: DOMAIN } } },
      { name: "name", selector: { text: {} } },
      { name: "show_name", selector: { boolean: {} } },
    ];
  }
}

customElements.define("dreame-vacuum-card", DreameVacuumCard);
customElements.define("dreame-vacuum-card-editor", DreameVacuumCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "dreame-vacuum-card",
  name: "Dreame Vacuum Card",
  description: "App-style control card for the dreame_vacuum integration",
});
console.info(`%c DREAME-VACUUM-CARD %c v${CARD_VERSION} `, "background:#3d6bff;color:#fff", "");
