const CLAUDE_CONFIG = {
  proxyUrl: "",
  anonKey: "",
  model: "claude-sonnet-4-20250514",
  maxTokens: 1e3
};
async function callClaudeAPI(messages) {
  const body = JSON.stringify({
    model: CLAUDE_CONFIG.model,
    max_tokens: CLAUDE_CONFIG.maxTokens,
    messages: messages
  });
  let url, headers = {
    "Content-Type": "application/json"
  };
  CLAUDE_CONFIG.proxyUrl ? (url = CLAUDE_CONFIG.proxyUrl, CLAUDE_CONFIG.anonKey && (headers.Authorization = "Bearer " + CLAUDE_CONFIG.anonKey)) : url = "https://api.anthropic.com/v1/messages";
  const res = await fetch(url, {
    method: "POST",
    headers: headers,
    body: body
  });
  return await res.json()
}
const AUTH_CONFIG = {
  googleClientId: ""
};
let USER = null,
  STORAGE_OK = !1;
try {
  localStorage.setItem("__mh", "1"), localStorage.removeItem("__mh"), STORAGE_OK = !0
} catch (e) {
  STORAGE_OK = !1
}
const memStore = {};

function storeGet(k) {
  if (STORAGE_OK) try {
    return localStorage.getItem(k)
  } catch (e) {}
  return memStore[k] || null
}

function storeSet(k, v) {
  if (STORAGE_OK) try {
    return void localStorage.setItem(k, v)
  } catch (e) {}
  memStore[k] = v
}

function storeDel(k) {
  if (STORAGE_OK) try {
    localStorage.removeItem(k)
  } catch (e) {}
  delete memStore[k]
}

function decodeJwt(token) {
  const b = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"),
    json = decodeURIComponent(atob(b).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
  return JSON.parse(json)
}

function handleGoogleCredential(response) {
  try {
    const p = decodeJwt(response.credential);
    setUser({
      id: p.sub,
      name: p.name || p.email || "Friend",
      email: p.email || "",
      avatar: p.picture || ""
    })
  } catch (e) {
    console.warn("Google credential parse failed", e)
  }
}
async function loadGoogleSignIn() {
  if (!AUTH_CONFIG.googleClientId) return !1;
  try {
    await new Promise((res, rej) => {
      if (window.google && window.google.accounts) return res();
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client", s.async = !0, s.defer = !0, s.onload = res, s.onerror = () => rej(new Error("gsi load failed")), document.head.appendChild(s)
    }), google.accounts.id.initialize({
      client_id: AUTH_CONFIG.googleClientId,
      callback: handleGoogleCredential
    });
    const c = document.getElementById("gbtnContainer");
    return google.accounts.id.renderButton(c, {
      theme: "filled_blue",
      size: "large",
      shape: "pill",
      width: 300,
      text: "continue_with"
    }), google.accounts.id.prompt(), document.getElementById("customGoogleBtn").classList.add("hidden"), !0
  } catch (e) {
    return console.warn("Google sign-in unavailable", e), !1
  }
}

function signInGoogle() {
  window.google && window.google.accounts && AUTH_CONFIG.googleClientId ? google.accounts.id.prompt() : document.getElementById("authNote").innerHTML = "⚙️ To turn on real Google sign-in, add your Google Client ID in the code (see README) and open the site from your deployed URL. Google sign-in can't run inside this preview sandbox. You can continue without an account for now."
}

function signInGuest() {
  setUser({
    id: "guest",
    name: "Guest",
    email: "",
    avatar: "",
    guest: !0
  })
}

function signOut() {
  try {
    window.google && window.google.accounts && google.accounts.id.disableAutoSelect()
  } catch (e) {}
  USER = null, storeDel("mh_user"), document.getElementById("userChip").classList.add("hidden"), document.getElementById("authOverlay").classList.remove("hidden")
}

function setUser(u) {
  USER = u, u.guest || storeSet("mh_user", JSON.stringify(u));
  const chip = document.getElementById("userChip"),
    initial = (u.name || "?").charAt(0).toUpperCase(),
    av = u.avatar ? `<img src="${u.avatar}" referrerpolicy="no-referrer" alt="">` : initial;
  chip.innerHTML = `<span class="uname">${u.name}</span><span class="user-avatar">${av}</span><button class="signout-btn" onclick="signOut()">Sign out</button>`, chip.classList.remove("hidden"), document.getElementById("authOverlay").classList.add("hidden"), renderHistory(), renderHome()
}
async function initAuth() {
  const saved = storeGet("mh_user");
  if (saved) try {
    const u = JSON.parse(saved);
    u && !u.guest && setUser(u)
  } catch (e) {}
  await loadGoogleSignIn()
}

function histKey() {
  return "mh_history_" + (USER ? USER.id : "guest")
}

function loadHistory() {
  const raw = storeGet(histKey());
  if (!raw) return [];
  try {
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

function saveHistory(arr) {
  storeSet(histKey(), JSON.stringify(arr.slice(0, 50)))
}

function addHistory(entry) {
  const h = loadHistory();
  h.unshift(entry), saveHistory(h)
}

function clearHistory() {
  storeDel(histKey()), renderHistory()
}

function relativeDate(ts) {
  const d = new Date(ts),
    now = new Date,
    days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
  return days <= 0 ? "Today" : 1 === days ? "Yesterday" : days < 7 ? days + " days ago" : d.toLocaleDateString(void 0, {
    month: "short",
    day: "numeric"
  })
}

function renderHistory() {
  const list = document.getElementById("histList");
  if (!list) return;
  const h = loadHistory(),
    clearBtn = document.getElementById("clearHistBtn");
  0 === h.length ? (list.innerHTML = '<div class="hist-empty"><span class="he-icon">🎵</span><span class="he-text">No sessions yet.<br>Start a session and it\'ll appear here once you finish.</span></div>', clearBtn && clearBtn.classList.add("hidden")) : (list.innerHTML = h.map(e => {
    let stressBit = "";
    if (null != e.stressBefore && null != e.stressAfter) {
      const arrow = e.stressAfter < e.stressBefore ? "↓" : e.stressAfter > e.stressBefore ? "↑" : "→";
      stressBit = ` · Stress ${e.stressBefore}${arrow}${e.stressAfter}`
    }
    return `<div class="hi"><div class="hico">${e.icon||"🎵"}</div><div class="hinf"><div class="htitle">${e.sessionLabel} · ${e.trackName} · ${e.instIcon||""} ${e.instrument}</div><div class="hsub">${relativeDate(e.date)} · Mood: ${e.mood}${stressBit}</div></div><div class="hdur">${e.dur} min</div></div>`
  }).join(""), clearBtn && clearBtn.classList.remove("hidden")), drawTrend()
}
const S = {
    mood: "neutral",
    session: "calm",
    stress: 5,
    dur: 20,
    total: 1200,
    playing: !1,
    seconds: 0,
    vol: .7,
    instrument: "piano",
    customParams: null,
    key: "auto",
    activeKey: "D minor",
    trackName: "",
    aiComposition: null,
    aiComposed: !1,
    conditions: [],
    condMods: null
  },
  ADJ = {
    tempo: 60,
    warmth: 6,
    nature: 4,
    reverb: 5
  },
  INST_META = {
    piano: {
      label: "Piano",
      icon: "🎹"
    },
    strings: {
      label: "Strings",
      icon: "🎻"
    },
    flute: {
      label: "Flute",
      icon: "🪈"
    },
    guitar: {
      label: "Guitar",
      icon: "🎸"
    },
    harp: {
      label: "Harp",
      icon: "🪕"
    },
    bowl: {
      label: "Singing Bowl",
      icon: "🔔"
    },
    marimba: {
      label: "Marimba",
      icon: "🪘"
    },
    sitar: {
      label: "Sitar",
      icon: "🎵"
    },
    shakuhachi: {
      label: "Shakuhachi",
      icon: "🎋"
    },
    crystal: {
      label: "Crystal Bowl",
      icon: "💎"
    },
    organ: {
      label: "Organ",
      icon: "🎼"
    },
    kalimba: {
      label: "Kalimba",
      icon: "🎶"
    },
    custom: {
      label: "Custom",
      icon: "✏️"
    }
  };

function showTab(name, btn) {
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.add("hidden"), t.classList.remove("on")
  }), document.querySelectorAll(".nb").forEach(b => b.classList.remove("on")), document.getElementById("tab-" + name).classList.remove("hidden"), document.getElementById("tab-" + name).classList.add("on"), btn && btn.classList.add("on"), "history" === name && setTimeout(renderHistory, 80)
}

function go(id) {
  document.querySelectorAll("#tab-session .screen").forEach(s => s.classList.remove("on")), document.getElementById(id).classList.add("on"), "s-home" === id && renderHome(), window.scrollTo({
    top: 0,
    behavior: "smooth"
  })
}

function renderHome() {
  const g = document.getElementById("homeGreeting");
  if (g) {
    const name = USER && USER.name && !USER.guest ? USER.name.split(" ")[0] : null,
      hr = (new Date).getHours(),
      part = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
    g.textContent = name ? `${part}, ${name}` : "Welcome to Concordia"
  }
  const statsEl = document.getElementById("homeStats");
  if (statsEl) {
    const h = "function" == typeof loadHistory ? loadHistory() : [];
    if (h.length) {
      const total = h.length,
        mins = h.reduce((s, e) => s + (e.dur || 0), 0),
        withAfter = h.filter(e => null != e.stressBefore && null != e.stressAfter),
        avgDrop = withAfter.length ? withAfter.reduce((s, e) => s + (e.stressBefore - e.stressAfter), 0) / withAfter.length : null;
      statsEl.innerHTML = `<div class="home-stat"><div class="hs-n">${total}</div><div class="hs-l">Session${total>1?"s":""}</div></div><div class="home-stat"><div class="hs-n">${mins}</div><div class="hs-l">Minutes</div></div>` + (null != avgDrop ? `<div class="home-stat"><div class="hs-n">${avgDrop>0?"−":""}${Math.abs(avgDrop).toFixed(1)}</div><div class="hs-l">Avg stress drop</div></div>` : "")
    } else statsEl.innerHTML = ""
  }
}

function quickStart(session) {
  S.session = session, document.querySelectorAll(".stb").forEach(b => b.classList.remove("on"));
  const btn = [...document.querySelectorAll(".stb")].find(b => b.getAttribute("onclick") && b.getAttribute("onclick").includes("'" + session + "'"));
  btn && btn.classList.add("on"), go("s-mood")
}

function sel(btn, cls, key, val) {
  document.querySelectorAll(cls).forEach(b => b.classList.remove("on")), btn.classList.add("on"), S[key] = val
}
const CONDITION_PROFILES = {
    anxiety: {
      tempo: -8,
      complexity: .45,
      predict: .7,
      bb: 8,
      note: "slower tempo, smooth low-complexity textures and alpha waves to calm the nervous system"
    },
    depression: {
      tempo: 2,
      complexity: .6,
      predict: .4,
      mode: "major",
      note: "warm, gently brightening melodies that lift mood without forcing it"
    },
    ptsd: {
      tempo: -10,
      complexity: .3,
      predict: .9,
      bb: 7,
      note: "highly predictable, grounding music with no sudden changes, to feel safe"
    },
    insomnia: {
      tempo: -14,
      complexity: .2,
      predict: .85,
      bb: 2,
      note: "very slow, sparse, gradually descending lines with delta waves for sleep"
    },
    adhd: {
      tempo: 4,
      complexity: .75,
      predict: .55,
      bb: 10,
      note: "a steady, engaging pulse with clear structure to gently hold attention"
    },
    autism: {
      tempo: -4,
      complexity: .35,
      predict: .92,
      note: "consistent, predictable patterns with a low, even sensory load"
    },
    ocd: {
      tempo: -4,
      complexity: .4,
      predict: .65,
      bb: 8,
      note: "calming, grounded music that avoids tense or looping repetition"
    },
    bipolar: {
      tempo: -4,
      complexity: .45,
      predict: .7,
      note: "stable, regulated dynamics that avoid over-stimulation"
    },
    dementia: {
      tempo: 0,
      complexity: .5,
      predict: .6,
      bb: 40,
      note: "familiar, song-like melodies with 40 Hz gamma linked to memory"
    },
    pain: {
      tempo: -8,
      complexity: .5,
      predict: .6,
      bb: 6,
      note: "immersive, slow, enveloping sound to ease focus away from pain"
    },
    sensory: {
      tempo: -4,
      complexity: .25,
      predict: .9,
      note: "soft, simple textures with minimal sensory intensity"
    },
    burnout: {
      tempo: -8,
      complexity: .4,
      predict: .7,
      bb: 8,
      note: "slow, restorative music to help you decompress"
    }
  },
  CONDITION_LABELS = {
    anxiety: "Anxiety",
    depression: "Depression",
    ptsd: "PTSD/Trauma",
    insomnia: "Insomnia",
    adhd: "ADHD",
    autism: "Autism",
    ocd: "OCD",
    bipolar: "Bipolar",
    dementia: "Dementia",
    pain: "Chronic pain",
    sensory: "Sensory sensitivity",
    burnout: "Stress/Burnout"
  };

function toggleCond(btn, key) {
  btn.classList.toggle("on");
  const i = S.conditions.indexOf(key);
  i >= 0 ? S.conditions.splice(i, 1) : S.conditions.push(key);
  const noteEl = document.getElementById("condNote");
  if (S.conditions.length) {
    const lines = S.conditions.map(k => `<strong>${CONDITION_LABELS[k]}:</strong> ${CONDITION_PROFILES[k].note}`);
    noteEl.innerHTML = "Concordia will tune the music for — " + lines.join("; ") + ".", noteEl.classList.remove("hidden")
  } else noteEl.classList.add("hidden")
}

function applyConditions() {
  if (!S.conditions.length) return void(S.condMods = null);
  let tempo = 0,
    complexity = [],
    predict = [],
    bb = null,
    mode = null;
  S.conditions.forEach(k => {
    const p = CONDITION_PROFILES[k];
    p && (tempo += p.tempo || 0, complexity.push(null != p.complexity ? p.complexity : .5), predict.push(null != p.predict ? p.predict : .5), null != p.bb && (bb = null == bb ? p.bb : Math.min(bb, p.bb)), p.mode && (mode = p.mode))
  }), S.condMods = {
    tempo: tempo,
    complexity: Math.min(...complexity),
    predict: Math.max(...predict),
    bb: bb,
    mode: mode,
    labels: S.conditions.map(k => CONDITION_LABELS[k])
  }
}

function ptab(btn, panel) {
  document.querySelectorAll(".tbb").forEach(b => b.classList.remove("on")), btn.classList.add("on"), document.querySelectorAll(".panel").forEach(p => p.classList.remove("on")), document.getElementById(panel).classList.add("on")
}

function selInst(btn, inst) {
  document.querySelectorAll("#instGrid .ib").forEach(b => b.classList.remove("on")), btn.classList.add("on"), S.instrument = inst, S.customParams = null, document.getElementById("customWrap").classList.remove("on")
}

function switchInst(btn, inst) {
  document.querySelectorAll("#instGrid2 .ib").forEach(b => b.classList.remove("on")), btn.classList.add("on"), S.instrument = inst, S.customParams = null, stopMusic(), startMusic();
  const m = INST_META[inst];
  document.getElementById("instBadge").querySelector("span").textContent = m.icon + " " + m.label, document.getElementById("instBadgeLabel").textContent = m.label, document.getElementById("iInst").textContent = m.label
}

function adjVal(k, v, u) {
  ADJ[k.toLowerCase()] = parseFloat(v), document.getElementById("v" + k).textContent = v + (u || "")
}

function selKey(btn, key) {
  document.querySelectorAll("#keyGrid .kb").forEach(b => b.classList.remove("on")), btn.classList.add("on"), S.key = key
}

function selKeyLive(btn, key) {
  document.querySelectorAll("#keyGridLive .kb").forEach(b => b.classList.remove("on")), btn.classList.add("on"), S.key = key, S.activeKey = resolveKey(), applyTrackMeta(), S.playing && (stopMusic(), startMusic())
}
let LAST_KEY = null;

function resolveKey() {
  if (S.key && "auto" !== S.key && KEY_ROOTS[S.key]) return S.key;
  const pool = AUTO_KEYS[S.session] || AUTO_KEYS.calm;
  let choice = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1) {
    let tries = 0;
    for (; choice === LAST_KEY && tries < 6;) choice = pool[Math.floor(Math.random() * pool.length)], tries++
  }
  return LAST_KEY = choice, choice
}

function applyTrackMeta() {
  const cfg = CFG[S.session] || CFG.calm,
    pool = NAME_POOLS[S.session] || NAME_POOLS.calm;
  S.trackName && -1 !== S.trackName.indexOf(" in ") ? S.trackName = S.trackName.split(" in ")[0] + " in " + S.activeKey : S.trackName = pool[Math.floor(Math.random() * pool.length)] + " in " + S.activeKey;
  const subBits = [cfg.bpm + " BPM", cfg.bbl + " binaural", S.activeKey];
  cfg.tune && subBits.push(cfg.tune);
  const tt = document.getElementById("trackTitle");
  tt && (tt.textContent = S.trackName);
  const ts = document.getElementById("trackSub");
  ts && (ts.textContent = subBits.join(" · "));
  const ik = document.getElementById("iK");
  ik && (ik.textContent = S.activeKey)
}

function savePro(e) {
  const b = e.target;
  b.textContent = "✓ Saved!", setTimeout(() => b.textContent = "Save Profile →", 2e3)
}
async function createCustomInst() {
  await _createCustom("customInstInput", "customStatus", "instGrid", !0)
}
async function createCustomInst2() {
  await _createCustom("customInstInput2", "customStatus2", "instGrid2", !1)
}
async function _createCustom(inputId, statusId, gridId, selectWrap) {
  const inp = document.getElementById(inputId),
    statusEl = document.getElementById(statusId),
    desc = inp.value.trim();
  if (!desc) return void(statusEl.textContent = "Please describe an instrument first.");
  statusEl.textContent = "🎼 Analysing instrument acoustics…";
  const prompt = `You are an expert audio synthesizer engineer. The user wants to hear "${desc}" as a synthesized instrument in a therapeutic music app using the Web Audio API.\n\nReturn ONLY a valid JSON object (no markdown, no extra text) with these synthesis parameters:\n{\n"label": "short display name (max 20 chars)",\n"icon": "single relevant emoji",\n"oscType": "sine" or "sawtooth" or "triangle" or "square",\n"filterType": "lowpass" or "highpass" or "bandpass",\n"filterFreq": number 100-6000,\n"filterQ": number 0.5-8,\n"attack": number 0.001-0.8,\n"decay": number 0.05-3.0,\n"sustainLevel": number 0.0-0.8,\n"release": number 0.05-4.0,\n"vibrato": number 0.0-0.018,\n"vibratoRate": number 2.0-8.0,\n"detune": number -30 to 30,\n"noise": number 0.0-0.4,\n"noiseFilterFreq": number 200-4000,\n"harmonics": [1.0, 0.5, 0.25, 0.12, 0.06],\n"useKS": false,\n"ksDecay": 0.995,\n"description": "one sentence on why this instrument is therapeutic"\n}`;
  try {
    const data = void 0,
      raw = (await callClaudeAPI([{
        role: "user",
        content: prompt
      }])).content.map(c => c.text || "").join("").replace(/```json|```/g, "").trim(),
      params = JSON.parse(raw);
    S.customParams = params, S.instrument = "custom", document.querySelectorAll(`#${gridId} .ib`).forEach(b => b.classList.remove("on")), selectWrap && document.getElementById("customWrap").classList.add("on"), statusEl.textContent = `✅ ${params.icon} ${params.label} synthesized! ${params.description}`, inp.value = "", selectWrap || (stopMusic(), startMusic(), document.getElementById("instBadgeLabel").textContent = params.label, document.getElementById("iInst").textContent = params.label)
  } catch (e) {
    statusEl.textContent = "❌ Could not parse instrument. Try a different description."
  }
}
const CFG = {
  calm: {
    bpm: 60,
    bb: 6,
    bbl: "6 Hz Theta",
    tune: "432 Hz"
  },
  focus: {
    bpm: 72,
    bb: 10,
    bbl: "10 Hz Alpha",
    tune: ""
  },
  sleep: {
    bpm: 50,
    bb: 2,
    bbl: "2 Hz Delta",
    tune: ""
  },
  mood: {
    bpm: 80,
    bb: 12,
    bbl: "12 Hz Alpha",
    tune: ""
  },
  memory: {
    bpm: 65,
    bb: 40,
    bbl: "40 Hz Gamma",
    tune: ""
  },
  grounding: {
    bpm: 64,
    bb: 5,
    bbl: "5 Hz Theta",
    tune: "Nature"
  }
};

function brainwaveLabel(hz) {
  const band = void 0;
  return hz + " Hz " + (hz < 4 ? "Delta" : hz < 8 ? "Theta" : hz < 13 ? "Alpha" : hz < 30 ? "Beta" : "Gamma")
}
const KEY_ROOTS = {
    "C major": {
      root: 261.63,
      mode: "major"
    },
    "D major": {
      root: 293.66,
      mode: "major"
    },
    "E major": {
      root: 329.63,
      mode: "major"
    },
    "F major": {
      root: 174.61,
      mode: "major"
    },
    "G major": {
      root: 196,
      mode: "major"
    },
    "A major": {
      root: 220,
      mode: "major"
    },
    "Bb major": {
      root: 233.08,
      mode: "major"
    },
    "A minor": {
      root: 220,
      mode: "minor"
    },
    "B minor": {
      root: 246.94,
      mode: "minor"
    },
    "C minor": {
      root: 261.63,
      mode: "minor"
    },
    "D minor": {
      root: 146.83,
      mode: "minor"
    },
    "E minor": {
      root: 164.81,
      mode: "minor"
    },
    "F# minor": {
      root: 184.99,
      mode: "minor"
    },
    "G minor": {
      root: 196,
      mode: "minor"
    }
  },
  MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16],
  MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15],
  MAJOR_CHORD = [0, 5, 7, 9],
  MINOR_CHORD = [0, 5, 7, 8];

function buildScale(root, mode) {
  const s = void 0;
  return ("major" === mode ? MAJOR_STEPS : MINOR_STEPS).map(n => root * Math.pow(2, n / 12))
}

function buildChordRoots(root, mode) {
  const s = void 0;
  return ("major" === mode ? MAJOR_CHORD : MINOR_CHORD).map(n => root * Math.pow(2, n / 12))
}
const AUTO_KEYS = {
    calm: ["D minor", "A minor", "E minor", "G minor", "B minor", "C minor", "F# minor"],
    focus: ["A major", "D major", "G major", "C major", "E major", "Bb major", "F major"],
    sleep: ["F major", "C major", "Bb major", "D minor", "G major", "A minor", "E minor"],
    mood: ["C major", "G major", "D major", "E major", "A major", "F major", "Bb major"],
    memory: ["G major", "C major", "F major", "A major", "D major", "Bb major", "E major"],
    grounding: ["G minor", "D minor", "E minor", "A minor", "C minor", "B minor", "F# minor"]
  },
  NAME_POOLS = {
    calm: ["Ocean Breath", "Quiet Tide", "Still Water", "Gentle Current", "Low Tide Lullaby", "Moonlit Calm", "Soft Horizon", "Drifting Mist"],
    focus: ["Clear Sky", "Crystal Mind", "Bright Meridian", "Open Field", "Lucid Stream", "Sharp Dawn", "Quiet Focus", "Glass Lake"],
    sleep: ["Delta Drift", "Night Garden", "Velvet Dark", "Falling Dusk", "Slow Descent", "Dream Tide", "Hush", "Cradle"],
    mood: ["Morning Light", "Golden Hour", "Rising Sun", "Warm Bloom", "Amber Glow", "Bright Meadow", "First Light", "Sunlit Path"],
    memory: ["Familiar Echoes", "Old Photographs", "Distant Summer", "Remembered Song", "Childhood Window", "Warm Recollection", "Long Ago", "Faded Polaroid"],
    grounding: ["Earth Tone", "Rooted", "Standing Stone", "Deep Forest", "Anchored", "Mountain Base", "Steady Ground", "Old Oak"]
  },
  PROGRESSIONS = {
    calm: [0, 5, 3, 4],
    focus: [0, 3, 4, 0],
    sleep: [0, 5, 3, 0],
    mood: [0, 4, 5, 3],
    memory: [0, 3, 0, 4],
    grounding: [0, 4, 3, 0]
  };
let AI_SECTION_IDX = 0;
const clampInt = (n, lo, hi) => (n = Math.round(Number(n)), isNaN(n) && (n = lo), Math.max(lo, Math.min(hi, n))),
  ENERGY = {
    sleep: .28,
    calm: .55,
    grounding: .55,
    memory: .68,
    focus: .85,
    mood: .9
  },
  PREDICT = {
    sleep: .7,
    calm: .4,
    grounding: .5,
    memory: .4,
    focus: .35,
    mood: .32
  },
  RB_SPARSE = [
    [2, 1, 1],
    [3, 1],
    [1, 3],
    [2, 1.5, .5],
    [1.5, 1.5, 1],
    [2.5, 1.5],
    [1, 2, 1],
    [3, .5, .5]
  ],
  RB_MED = [
    [2, 1, .5, .5],
    [1, .5, .5, 1, 1],
    [.5, .5, 1, 1, 1],
    [1, 1, .5, .5, 1],
    [1.5, .5, 1, 1],
    [2, .5, .5, 1],
    [1, .5, .5, .5, .5, 1],
    [1.5, .5, .5, .5, 1],
    [1, 1.5, .5, 1]
  ],
  RB_ACTIVE = [
    [.5, .5, .5, .5, 1, 1],
    [1, .5, .5, .5, .5, 1],
    [.5, .5, 1, .5, .5, 1],
    [.25, .25, .5, 1, 1, 1],
    [1, .25, .25, .5, .5, .5, .5, .5],
    [.5, .25, .25, .5, .5, 1, 1],
    [.75, .25, 1, .5, .5, 1],
    [1.5, .5, .5, .5, .5, .5],
    [.5, .5, .75, .25, 1, 1]
  ],
  pick = a => a[Math.floor(Math.random() * a.length)],
  nearestChordTone = p => {
    const e = 2 * Math.round(p / 2);
    return Math.max(-4, Math.min(6, e))
  };

function pickRhythm(energy) {
  const r = Math.random();
  return energy < .4 ? pick(r < .78 ? RB_SPARSE : RB_MED).slice() : energy < .72 ? pick(r < .5 ? RB_MED : r < .8 ? RB_SPARSE : RB_ACTIVE).slice() : pick(r < .68 ? RB_ACTIVE : RB_MED).slice()
}

function ornamentNote(off, beats, type) {
  if ("trill" === type && beats >= 1) {
    const hold = Math.min(.5, .35 * beats),
      tb = beats - hold,
      steps = Math.max(2, Math.round(tb / .25)),
      out = [];
    for (let k = 0; k < steps; k++) out.push([off + (k % 2 ? 1 : 0), tb / steps]);
    return out.push([off, hold]), out
  }
  if ("turn" === type && beats >= 1) {
    const u = beats / 4;
    return [
      [off + 1, u],
      [off, u],
      [off - 1, u],
      [off, beats - 3 * u]
    ]
  }
  if ("grace" === type) {
    const g = Math.min(.25, .3 * beats);
    return [
      [off + (Math.random() < .5 ? 1 : 2), g],
      [off, beats - g]
    ]
  }
  if ("mordent" === type && beats >= .5) {
    const m = Math.min(.2, .3 * beats);
    return [
      [off + 1, m],
      [off, Math.max(.1, beats - m)]
    ]
  }
  if ("run" === type && beats >= 1) {
    const n = Math.max(2, Math.round(beats / .5)),
      out = [];
    for (let k = 0; k < n; k++) out.push([off + k, beats / n]);
    return out
  }
  return [
    [off, beats]
  ]
}

function genMelodyCell(root, energy, predict, motif) {
  const ornP = energy * (1 - .5 * predict),
    rhythm = motif && Math.random() < predict ? motif.rhythm.slice() : pickRhythm(energy);
  let pos = motif ? motif.last : pick([0, 2, 4]),
    acc = 0;
  const base = [];
  rhythm.forEach(b => {
    const strong = void 0;
    Math.abs(acc - Math.round(acc)) < .01 && Math.round(acc) % 2 == 0 ? pos = nearestChordTone(pos + pick([-2, -2, 0, 0, 2, 2])) : pos += pick([-2, -1, -1, 1, 1, 2, Math.random() < .18 ? pick([-3, 3, 4]) : 1]), pos = Math.max(-4, Math.min(7, pos)), base.push([pos, b]), acc += b
  });
  const out = [];
  return base.forEach(([off, b]) => {
    const r = Math.random();
    let type = null;
    r < .16 * ornP && b >= 1 ? type = "trill" : r < .28 * ornP && b >= 1 ? type = "turn" : r < .4 * ornP && b >= 1 ? type = "run" : r < .58 * ornP ? type = "grace" : r < .66 * ornP && b >= .5 && (type = "mordent"), out.push(...ornamentNote(off, b, type))
  }), {
    cell: out,
    last: base.length ? base[base.length - 1][0] : pos,
    rhythm: rhythm
  }
}

function genCounterCell(root) {
  const opts = void 0;
  return pick([
    [
      [0, 4]
    ],
    [
      [-3, 2],
      [0, 2]
    ],
    [
      [4, 2],
      [2, 2]
    ],
    [
      [0, 2],
      [-3, 2]
    ],
    [
      [2, 4]
    ]
  ])
}

function varyCell(cell, intensity) {
  const out = [];
  return cell.forEach(([off, b]) => {
    const r = Math.random();
    if (r < .15 * intensity && b >= 1) out.push(...ornamentNote(off, b, "trill"));
    else if (r < .26 * intensity && b >= 1) out.push(...ornamentNote(off, b, "turn"));
    else if (r < .38 * intensity) out.push(...ornamentNote(off, b, "grace"));
    else if (r < .48 * intensity && b >= 2) {
      const h = b / 2;
      out.push([off, h], [off + pick([1, 2, -2]), h])
    } else out.push([off, b])
  }), out
}

function cellToNotes(root, cell, baseVel) {
  let acc = 0;
  const notes = [];
  return (cell && cell.length ? cell : []).forEach(([offset, beats]) => {
    if (acc >= 3.999) return;
    if (notes.length >= 28) return;
    const onBeat = Math.abs(acc - Math.round(acc)) < .01,
      vel = null != baseVel ? baseVel : 0 === acc ? .86 : onBeat ? .8 : .74;
    notes.push({
      atBeat: acc,
      durBeats: beats,
      scaleIdx: Math.max(0, Math.min(9, root + offset)),
      vel: vel
    }), acc += beats
  }), notes
}

function cellToBar(root, melodyCell, counterCell) {
  return {
    root: root,
    notes: cellToNotes(root, melodyCell.length ? melodyCell : [
      [0, 4]
    ]),
    counter: counterCell && counterCell.length ? cellToNotes(root, counterCell, .6) : null
  }
}

function buildSection(session) {
  const cm = S.condMods,
    energyBase = null != ENERGY[session] ? ENERGY[session] : .5,
    energy = cm ? Math.max(.2, Math.min(1, .45 * energyBase + .55 * cm.complexity)) : energyBase,
    predict = cm ? cm.predict : null != PREDICT[session] ? PREDICT[session] : .45,
    comp = S.aiComposition;
  if (comp && comp.sections && comp.sections.length) {
    const prog = comp.progression,
      idx = AI_SECTION_IDX % comp.sections.length,
      cycle = Math.floor(AI_SECTION_IDX / comp.sections.length);
    AI_SECTION_IDX++;
    const sec = comp.sections[idx],
      vIntensity = 0 === cycle ? 0 : Math.min(1, .5 * cycle) * (1 - .6 * predict);
    return prog.map((root, bar) => {
      let mel = sec.melody[bar] || [
        [0, 4]
      ];
      vIntensity > 0 && (mel = varyCell(mel, vIntensity));
      const cnt = void 0;
      return cellToBar(root, mel, sec.counter ? sec.counter[bar] : null)
    })
  }
  const prog = void 0;
  let motif = null;
  return (PROGRESSIONS[session] || PROGRESSIONS.calm).map((root, bar) => {
    const g = genMelodyCell(root, energy, predict, motif);
    0 === bar ? motif = {
      rhythm: g.rhythm,
      last: g.last
    } : motif.last = g.last;
    const cnt = energy > .45 && Math.random() < .55 ? genCounterCell(root) : null;
    return cellToBar(root, g.cell, cnt)
  })
}

function sanitizeComposition(text) {
  try {
    const a = text.indexOf("{"),
      b = text.lastIndexOf("}");
    if (a < 0 || b < 0) return null;
    let json = text.slice(a, b + 1).replace(/([\[,:\s])\.(\d)/g, "$10.$2").replace(/,(\s*[\]}])/g, "$1");
    const obj = JSON.parse(json);
    let prog = (obj.progression || []).map(n => clampInt(n, 0, 6)).slice(0, 4);
    for (; prog.length < 4;) prog.push(0);
    const parseCell = bar => {
        const cell = void 0;
        return (bar || []).map(p => {
          if (!Array.isArray(p) || p.length < 2) return null;
          const off = clampInt(p[0], -5, 7);
          let beats = Number(p[1]);
          return beats > 0 || (beats = 1), beats = Math.min(4, beats), [off, beats]
        }).filter(Boolean)
      },
      sections = (obj.sections || []).map(sec => {
        const melArr = Array.isArray(sec) ? sec : sec.melody || [],
          cntArr = Array.isArray(sec) ? null : sec.counter || null,
          melody = melArr.slice(0, 4).map(b => {
            const c = parseCell(b);
            return c.length ? c : [
              [0, 4]
            ]
          });
        for (; melody.length < 4;) melody.push([
          [0, 4]
        ]);
        let counter = null;
        if (cntArr)
          for (counter = cntArr.slice(0, 4).map(b => parseCell(b)); counter.length < 4;) counter.push([]);
        return {
          melody: melody,
          counter: counter
        }
      }).filter(s => 4 === s.melody.length);
    return sections.length ? {
      progression: prog,
      sections: sections
    } : null
  } catch (e) {
    return null
  }
}
async function composeWithAI() {
  const cfg = CFG[S.session] || CFG.calm,
    keyInfo = KEY_ROOTS[S.activeKey] || KEY_ROOTS["D minor"],
    guidance = {
      calm: "slow, flowing and spacious, with long gentle phrases",
      focus: "steady, clear, mostly even eighth-note motion that aids concentration",
      sleep: "very sparse and minimal, long held notes with lots of space, gradually descending",
      mood: "bright, warm and gently uplifting, with a hint of bounce and syncopation",
      memory: "warm, nostalgic and song-like, easy to hum",
      grounding: "steady, simple and rooted, returning often to the tonic"
    } [S.session] || "gentle and calming",
    seed = Math.random().toString(36).slice(2, 8).toUpperCase(),
    moods = ["contemplative", "tender", "hopeful", "serene", "wistful", "luminous", "quiet", "open", "glowing", "gentle"],
    flavour = moods[Math.floor(Math.random() * moods.length)],
    condLine = S.condMods && S.condMods.labels.length ? `\nThis listener identifies with: ${S.condMods.labels.join(", ")}. Shape the music supportively — ${S.conditions.map(k=>CONDITION_PROFILES[k].note).join("; ")}. Honour these gently.` : "",
    prompt = `You are the music composer inside Concordia, a therapeutic music app. Compose a COMPLETELY NEW, original piece for a "${S.session}" session — do not reuse common or obvious melodies. The listener feels ${S.mood} (stress ${S.stress}/10). Key: ${S.activeKey} (${keyInfo.mode}). Tempo: ${cfg.bpm} BPM. Character: ${guidance}; lean ${flavour} this time. Variation seed: ${seed} (use it to make this piece distinct from any other).${condLine}\n\nReturn ONLY valid JSON (no markdown, no commentary) in exactly this shape:\n{"progression":[r1,r2,r3,r4],"sections":[{"melody":[bar,bar,bar,bar],"counter":[bar,bar,bar,bar]}, ... ]}\n\nRules:\n- progression: 4 chords as diatonic scale-degree roots, integers 0-6 (0 = tonic). Choose an interesting progression that fits the mood.\n- Provide 3 sections so the piece DEVELOPS and never just repeats. Each section has a "melody" (lead voice, 4 bars) and a "counter" (a simpler second voice that harmonises, 4 bars). The counter should be sparser than the melody.\n- Each bar is an array of [offset, beats] pairs:\n• offset = scale-degree distance from THAT bar's chord root. Chord tones are 0, 2, 4; the 7th is 6; passing tones are 1, 3, 5; range -5 to 7.\n• beats = note length (use a rich MIX: 0.5, 1, 1.5, 2, and occasional 0.5+0.5 syncopation). The beats in EACH bar MUST sum to exactly 4.\n- Make the lead melody genuinely musical and a bit complex: combine stepwise motion with expressive leaps, vary the rhythm bar to bar, and make the three sections clearly different from one another. Resolve phrase endings to chord tones (0, 2 or 4).\n- The counter voice should mostly use chord tones and longer notes, weaving gently under the melody.\nOutput JSON only.`;
  try {
    const data = await callClaudeAPI([{
      role: "user",
      content: prompt
    }]);
    if (!data || !Array.isArray(data.content)) return null;
    const text = void 0;
    return sanitizeComposition(data.content.map(c => c.text || "").join(""))
  } catch (e) {
    return null
  }
}
let waveRAF;
async function startAnalysis() {
  S.stress = parseInt(document.getElementById("stressS").value), S.dur = parseInt(document.getElementById("durS").value), S.total = 60 * S.dur, S.activeKey = resolveKey(), applyConditions(), S.aiComposition = null, S.aiComposed = !1, AI_SECTION_IDX = 0;
  const m = "custom" === S.instrument && S.customParams ? S.customParams : INST_META[S.instrument];
  document.getElementById("analysisSubtitle").textContent = `Concordia's AI is composing an original ${m.label||""} piece for you`, document.getElementById("as3txt").textContent = "Concordia AI is composing your melody", ["as1", "as2", "as3", "as4", "as5"].forEach(id => document.getElementById(id).classList.remove("done")), go("s-analysis"), animWave(), ["as1", "as2", "as3", "as4", "as5"].forEach((id, i) => setTimeout(() => document.getElementById(id).classList.add("done"), 850 * (i + 1)));
  const t0 = Date.now();
  let comp = null;
  try {
    comp = await Promise.race([composeWithAI(), new Promise(r => setTimeout(() => r(null), 9e3))])
  } catch (e) {
    comp = null
  }
  S.aiComposition = comp, S.aiComposed = !!comp;
  const minMs = 4800,
    elapsed = Date.now() - t0;
  elapsed < 4800 && await new Promise(r => setTimeout(r, 4800 - elapsed)), cancelAnimationFrame(waveRAF), setupPlayer(), go("s-player"), startMusic(), genInsight()
}

function animWave() {
  const c = document.getElementById("waveC"),
    ctx = c.getContext("2d");
  c.width = 2 * c.offsetWidth, c.height = 170;
  let t = 0;

  function f() {
    ctx.clearRect(0, 0, c.width, c.height), ctx.beginPath();
    for (let x = 0; x < c.width; x++) {
      const y = 85 + 26 * Math.sin((x / c.width * 5 + t) * Math.PI) + 16 * Math.sin((x / c.width * 2 - 1.2 * t) * Math.PI) + 7 * Math.sin((x / c.width * 8 + .6 * t) * Math.PI);
      0 === x ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.strokeStyle = "#1D9E75", ctx.lineWidth = 2.5, ctx.stroke(), t += .035, waveRAF = requestAnimationFrame(f)
  }
  f()
}

function setupPlayer() {
  const cfg = CFG[S.session] || CFG.calm;
  S.seconds = 0, S.activeKey && KEY_ROOTS[S.activeKey] || (S.activeKey = resolveKey());
  const pool = NAME_POOLS[S.session] || NAME_POOLS.calm;
  S.trackName = pool[Math.floor(Math.random() * pool.length)] + " in " + S.activeKey, applyTrackMeta(), document.getElementById("td").textContent = fmt(S.total), document.getElementById("te").textContent = "0:00", document.getElementById("pf").style.width = "0%";
  const tempoOffset = S.condMods ? S.condMods.tempo : 0,
    effBpm = Math.max(44, Math.min(96, cfg.bpm + tempoOffset)),
    effBbl = S.condMods && null != S.condMods.bb ? brainwaveLabel(S.condMods.bb) : cfg.bbl;
  document.getElementById("iT").textContent = effBpm + " BPM", document.getElementById("iB").textContent = effBbl;
  const m = "custom" === S.instrument && S.customParams ? S.customParams : INST_META[S.instrument] || INST_META.piano,
    lbl = m.label,
    ico = m.icon;
  document.getElementById("instBadge").innerHTML = ico + ' <span id="instBadgeLabel">' + lbl + "</span>", document.getElementById("iInst").textContent = lbl;
  const npEl = document.querySelector("#s-player .np");
  npEl && (npEl.textContent = S.aiComposed ? "Now Playing · AI-Composed for You" : "Now Playing · Live Synthesized Music"), ADJ.tempo = effBpm, document.getElementById("adjTempo").value = effBpm, document.getElementById("vTempo").textContent = effBpm + " BPM", syncLiveKeyGrid(), buildViz()
}

function syncLiveKeyGrid() {
  document.querySelectorAll("#keyGridLive .kb").forEach(b => {
    b.classList.toggle("on", b.dataset.key === S.key)
  })
}

function fmt(s) {
  const m = void 0,
    sc = s % 60;
  return Math.floor(s / 60) + ":" + (sc < 10 ? "0" : "") + sc
}

function buildViz() {
  const v = document.getElementById("viz");
  v.innerHTML = "";
  for (let i = 0; i < 46; i++) {
    const b = document.createElement("div");
    b.className = "vb", v.appendChild(b)
  }
}
let vizRAF, vizH = [],
  AC, masterGain, reverbWet, reverbDry, reverbNode, natureGainNode, natureSrc, mTimer, cTimer, bTimer, progressTimer, binL, binR;

function animViz() {
  const bars = document.querySelectorAll(".vb");

  function f() {
    vizH = vizH.map(h => Math.max(3, Math.min(68, h + 10 * (Math.random() - .5)))), bars.forEach((b, i) => b.style.height = vizH[i] + "px"), vizRAF = requestAnimationFrame(f)
  }
  vizH = [], bars.forEach(() => vizH.push(50 * Math.random() + 5)), f()
}

function stopViz() {
  cancelAnimationFrame(vizRAF), document.querySelectorAll(".vb").forEach(b => b.style.height = "3px")
}

function getAC() {
  return AC || (AC = new(window.AudioContext || window.webkitAudioContext)), AC
}

function makeReverb(ac) {
  const input = ac.createGain(),
    out = ac.createGain();
  return out.gain.value = 1, [
    [.0297, .6],
    [.0371, .58],
    [.0411, .56],
    [.0437, .54]
  ].forEach(([dt, g]) => {
    const d = ac.createDelay(.1);
    d.delayTime.value = dt;
    const fb = ac.createGain();
    fb.gain.value = g;
    const damp = ac.createBiquadFilter();
    damp.type = "lowpass", damp.frequency.value = 2800, input.connect(d), d.connect(damp), damp.connect(fb), fb.connect(d), d.connect(out)
  }), {
    input: input,
    output: out
  }
}

function ksBuffer(ac, freq, dur, brightness = .996) {
  const sr = ac.sampleRate,
    period = Math.round(sr / freq),
    total = Math.round(dur * sr),
    out = new Float32Array(total),
    dl = new Float32Array(period);
  for (let i = 0; i < period; i++) dl[i] = 2 * Math.random() - 1;
  for (let i = 0; i < total; i++) {
    const idx = i % period,
      nxt = (i + 1) % period;
    out[i] = dl[idx], dl[idx] = .5 * brightness * (dl[idx] + dl[nxt])
  }
  const buf = ac.createBuffer(1, total, sr);
  return buf.copyToChannel(out, 0), buf
}

function getInstrumentPlayer(inst, ac, cfg) {
  if ("piano" === inst) return (freq, dur, dry, wet, when) => {
    const now = null != when ? when : ac.currentTime,
      env = ac.createGain();
    env.gain.setValueAtTime(0, now), env.gain.linearRampToValueAtTime(.28, now + .003), env.gain.exponentialRampToValueAtTime(.12, now + .18), env.gain.exponentialRampToValueAtTime(.06, now + .7 * dur), env.gain.exponentialRampToValueAtTime(1e-4, now + 1.1 * dur);
    const filt = ac.createBiquadFilter();
    filt.type = "lowpass", filt.frequency.setValueAtTime(5e3, now), filt.frequency.exponentialRampToValueAtTime(900, now + dur), [
      [0, "sawtooth", .5],
      [7, "sawtooth", .3],
      [-5, "triangle", .45]
    ].forEach(([dt, tp, gv]) => {
      const o = ac.createOscillator(),
        g = ac.createGain();
      o.type = tp, o.frequency.value = freq, o.detune.value = dt, g.gain.value = gv, o.connect(g), g.connect(filt), o.start(now), o.stop(now + 1.2 * dur)
    }), filt.connect(env), env.connect(dry), env.connect(wet)
  };
  if ("strings" === inst) return (freq, dur, dry, wet, when) => {
    const now = null != when ? when : ac.currentTime,
      o = ac.createOscillator();
    o.type = "sawtooth", o.frequency.value = freq;
    const filt = ac.createBiquadFilter();
    filt.type = "lowpass", filt.frequency.value = 4 * freq;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 5.2;
    const lfoG = ac.createGain();
    lfoG.gain.value = .012 * freq, lfo.connect(lfoG), lfoG.connect(o.frequency);
    const env = ac.createGain();
    env.gain.setValueAtTime(0, now), env.gain.linearRampToValueAtTime(.22, now + .18), env.gain.setValueAtTime(.19, now + .75 * dur), env.gain.exponentialRampToValueAtTime(1e-4, now + 1.05 * dur), o.connect(filt), filt.connect(env), env.connect(dry), env.connect(wet), lfo.start(now), o.start(now), lfo.stop(now + dur), o.stop(now + 1.1 * dur)
  };
  if ("flute" === inst) return (freq, dur, dry, wet, when) => {
    const now = null != when ? when : ac.currentTime,
      o = ac.createOscillator();
    o.type = "sine", o.frequency.value = freq;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 5.5;
    const lfoG = ac.createGain();
    lfoG.gain.value = .009 * freq, lfo.connect(lfoG), lfoG.connect(o.frequency);
    const env = ac.createGain();
    env.gain.setValueAtTime(0, now), env.gain.linearRampToValueAtTime(.2, now + .08), env.gain.setValueAtTime(.17, now + .8 * dur), env.gain.exponentialRampToValueAtTime(1e-4, now + dur);
    const bsz = ac.sampleRate,
      buf = ac.createBuffer(1, bsz, ac.sampleRate),
      d = buf.getChannelData(0);
    for (let i = 0; i < bsz; i++) d[i] = 2 * Math.random() - 1;
    const ns = ac.createBufferSource();
    ns.buffer = buf, ns.loop = !0;
    const nf = ac.createBiquadFilter();
    nf.type = "bandpass", nf.frequency.value = 1.2 * freq, nf.Q.value = 3;
    const ng = ac.createGain();
    ng.gain.value = .04, ns.connect(nf), nf.connect(ng), ng.connect(dry), ng.connect(wet), o.connect(env), env.connect(dry), env.connect(wet), lfo.start(now), o.start(now), ns.start(now), lfo.stop(now + dur), o.stop(now + dur), ns.stop(now + dur)
  };
  if ("guitar" === inst) return (freq, dur, dry, wet, when) => {
    const now = null != when ? when : ac.currentTime,
      buf = ksBuffer(AC, freq, dur, .994),
      src = ac.createBufferSource();
    src.buffer = buf;
    const env = ac.createGain();
    env.gain.setValueAtTime(.38, now), env.gain.exponentialRampToValueAtTime(1e-4, now + .95 * dur), src.connect(env), env.connect(dry), env.connect(wet), src.start(now), src.stop(now + dur)
  };
  if ("harp" === inst) return (freq, dur, dry, wet, when) => {
    const now = null != when ? when : ac.currentTime,
      buf = ksBuffer(AC, freq, 1.4 * dur, .998),
      src = ac.createBufferSource();
    src.buffer = buf;
    const filt = ac.createBiquadFilter();
    filt.type = "highpass", filt.frequency.value = 200;
    const env = ac.createGain();
    env.gain.setValueAtTime(.32, now), env.gain.exponentialRampToValueAtTime(1e-4, now + 1.3 * dur), src.connect(filt), filt.connect(env), env.connect(dry), env.connect(wet), src.start(now), src.stop(now + 1.4 * dur)
  };
  if ("bowl" === inst) return (freq, dur, dry, wet, when) => {
    const now = null != when ? when : ac.currentTime;
    [
      [1, 0, .24],
      [2.76, 6, .1],
      [5.08, 12, .06],
      [8.9, 18, .04]
    ].forEach(([ratio, dt, gv]) => {
      const o = ac.createOscillator();
      o.type = "sine", o.frequency.value = freq * ratio, o.detune.value = dt;
      const env = ac.createGain();
      env.gain.setValueAtTime(0, now), env.gain.linearRampToValueAtTime(gv, now + .3), env.gain.exponentialRampToValueAtTime(1e-4, now + 2.5 * dur), o.connect(env), env.connect(dry), env.connect(wet), o.start(now), o.stop(now + 2.5 * dur + .1)
    })
  };
  if ("marimba" === inst) return (freq, dur, dry, wet, when) => {
    const now = null != when ? when : ac.currentTime;
    [
      [1, .34],
      [4, .06]
    ].forEach(([ratio, gv]) => {
      const o = ac.createOscillator();
      o.type = "sine", o.frequency.value = freq * ratio;
      const env = ac.createGain();
      env.gain.setValueAtTime(0, now), env.gain.linearRampToValueAtTime(gv, now + .003), env.gain.exponentialRampToValueAtTime(1e-4, now + .65 * dur), o.connect(env), env.connect(dry), env.connect(wet), o.start(now), o.stop(now + .7 * dur)
    })
  };
  if ("sitar" === inst) return (freq, dur, dry, wet, when) => {
    const now = null != when ? when : ac.currentTime,
      ws = ac.createWaveShaper(),
      curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = 2 * i / 256 - 1;
      curve[i] = Math.tanh(2 * x)
    }
    ws.curve = curve, [
      [0, "sawtooth", .2],
      [12, "sawtooth", .1],
      [-7, "sawtooth", .07]
    ].forEach(([dt, tp, gv]) => {
      const o = ac.createOscillator();
      o.type = tp, o.frequency.value = freq, o.detune.value = dt;
      const g = ac.createGain();
      g.gain.value = gv, o.connect(g), g.connect(ws), o.start(now), o.stop(now + dur)
    });
    const env = ac.createGain();
    env.gain.setValueAtTime(0, now), env.gain.linearRampToValueAtTime(.35, now + .01), env.gain.exponentialRampToValueAtTime(.08, now + .3), env.gain.exponentialRampToValueAtTime(1e-4, now + .9 * dur), ws.connect(env), env.connect(dry), env.connect(wet)
  };
  if ("shakuhachi" === inst) return (freq, dur, dry, wet, when) => {
    const now = null != when ? when : ac.currentTime,
      o = ac.createOscillator();
    o.type = "sine", o.frequency.value = freq;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 4;
    const lfoG = ac.createGain();
    lfoG.gain.value = .018 * freq, lfo.connect(lfoG), lfoG.connect(o.frequency);
    const bsz = ac.sampleRate,
      buf = ac.createBuffer(1, bsz, ac.sampleRate),
      bd = buf.getChannelData(0);
    for (let i = 0; i < bsz; i++) bd[i] = 2 * Math.random() - 1;
    const ns = ac.createBufferSource();
    ns.buffer = buf, ns.loop = !0;
    const nf = ac.createBiquadFilter();
    nf.type = "bandpass", nf.frequency.value = freq, nf.Q.value = 1.5;
    const ng = ac.createGain();
    ng.gain.value = .09;
    const tenv = ac.createGain();
    tenv.gain.setValueAtTime(0, now), tenv.gain.linearRampToValueAtTime(.16, now + .12), tenv.gain.setValueAtTime(.13, now + .75 * dur), tenv.gain.exponentialRampToValueAtTime(1e-4, now + dur), ns.connect(nf), nf.connect(ng), ng.connect(tenv), o.connect(tenv), tenv.connect(dry), tenv.connect(wet), lfo.start(now), o.start(now), ns.start(now), lfo.stop(now + dur), o.stop(now + dur), ns.stop(now + dur)
  };
  if ("crystal" === inst) return (freq, dur, dry, wet, when) => {
    const now = null != when ? when : ac.currentTime;
    [
      [1, 0, .22],
      [2, 4, .06],
      [3, 8, .03]
    ].forEach(([ratio, dt, gv]) => {
      const o = ac.createOscillator();
      o.type = "sine", o.frequency.value = freq * ratio, o.detune.value = dt;
      const env = ac.createGain();
      env.gain.setValueAtTime(0, now), env.gain.linearRampToValueAtTime(gv, now + .4), env.gain.exponentialRampToValueAtTime(1e-4, now + 3 * dur), o.connect(env), env.connect(dry), env.connect(wet), o.start(now), o.stop(now + 3 * dur + .1)
    })
  };
  if ("organ" === inst) return (freq, dur, dry, wet, when) => {
    const now = null != when ? when : ac.currentTime,
      ratios = void 0;
    [
      [1, .28],
      [2, .18],
      [3, .1],
      [4, .06],
      [6, .04],
      [8, .03]
    ].forEach(([r, gv]) => {
      const o = ac.createOscillator();
      o.type = "sine", o.frequency.value = freq * r;
      const env = ac.createGain();
      env.gain.setValueAtTime(0, now), env.gain.linearRampToValueAtTime(gv, now + .02), env.gain.setValueAtTime(gv, now + .9 * dur), env.gain.linearRampToValueAtTime(1e-4, now + 1.05 * dur), o.connect(env), env.connect(dry), env.connect(wet), o.start(now), o.stop(now + 1.1 * dur)
    })
  };
  if ("kalimba" === inst) return (freq, dur, dry, wet, when) => {
    const now = null != when ? when : ac.currentTime,
      buf = ksBuffer(AC, freq, dur, .992),
      src = ac.createBufferSource();
    src.buffer = buf;
    const o2 = ac.createOscillator();
    o2.type = "sine", o2.frequency.value = 2.76 * freq;
    const e2 = ac.createGain();
    e2.gain.setValueAtTime(.05, now), e2.gain.exponentialRampToValueAtTime(1e-4, now + .6 * dur), o2.connect(e2), e2.connect(dry), e2.connect(wet);
    const env = ac.createGain();
    env.gain.setValueAtTime(.3, now), env.gain.exponentialRampToValueAtTime(1e-4, now + .85 * dur), src.connect(env), env.connect(dry), env.connect(wet), src.start(now), o2.start(now), src.stop(now + dur), o2.stop(now + dur)
  };
  if ("custom" === inst && S.customParams) {
    const p = S.customParams;
    return (freq, dur, dry, wet, when) => {
      const now = null != when ? when : ac.currentTime,
        filt = ac.createBiquadFilter();
      filt.type = p.filterType || "lowpass", filt.frequency.value = p.filterFreq || 2e3, filt.Q.value = p.filterQ || 1;
      const env = ac.createGain();
      env.gain.setValueAtTime(0, now), env.gain.linearRampToValueAtTime(p.sustainLevel || .2, now + (p.attack || .05)), env.gain.setValueAtTime(p.sustainLevel || .2, now + (p.attack || .05) + (p.decay || .3));
      const sus = Math.max(.6 * p.sustainLevel || .08, 1e-4);
      if (env.gain.exponentialRampToValueAtTime(sus, now + .8 * dur), env.gain.exponentialRampToValueAtTime(1e-4, now + dur + (p.release || .3)), (p.harmonics || [1, .5, .25, .12, .06]).forEach((amp, hi) => {
          if (amp < .01) return;
          const o = ac.createOscillator();
          o.type = p.oscType || "sine", o.frequency.value = freq * (hi + 1), o.detune.value = p.detune || 0;
          const g = ac.createGain();
          if (g.gain.value = amp, p.vibrato > .001) {
            const lfo = ac.createOscillator();
            lfo.frequency.value = p.vibratoRate || 5;
            const lg = ac.createGain();
            lg.gain.value = freq * p.vibrato, lfo.connect(lg), lg.connect(o.frequency), lfo.start(now), lfo.stop(now + dur + (p.release || .3) + .1)
          }
          o.connect(g), g.connect(filt), o.start(now), o.stop(now + dur + (p.release || .3) + .1)
        }), (p.noise || 0) > .01) {
        const bsz = ac.sampleRate,
          buf = ac.createBuffer(1, bsz, ac.sampleRate),
          bd = buf.getChannelData(0);
        for (let i = 0; i < bsz; i++) bd[i] = 2 * Math.random() - 1;
        const ns = ac.createBufferSource();
        ns.buffer = buf, ns.loop = !0;
        const nf = ac.createBiquadFilter();
        nf.type = "bandpass", nf.frequency.value = p.noiseFilterFreq || freq, nf.Q.value = 2;
        const ng = ac.createGain();
        ng.gain.value = p.noise, ns.connect(nf), nf.connect(env), ng.connect(env), ns.start(now), ns.stop(now + dur + (p.release || .3) + .1)
      }
      filt.connect(env), env.connect(dry), env.connect(wet)
    }
  }
  return (freq, dur, dry, wet, when) => {
    const now = null != when ? when : ac.currentTime,
      o = ac.createOscillator();
    o.type = "sine", o.frequency.value = freq;
    const env = ac.createGain();
    env.gain.setValueAtTime(0, now), env.gain.linearRampToValueAtTime(.2, now + .05), env.gain.exponentialRampToValueAtTime(1e-4, now + dur), o.connect(env), env.connect(dry), env.connect(wet), o.start(now), o.stop(now + dur + .1)
  }
}

function startMusic() {
  const ac = getAC();
  "suspended" === ac.state && ac.resume(), masterGain = ac.createGain(), masterGain.gain.value = S.vol;
  const masterLP = ac.createBiquadFilter();
  masterLP.type = "lowpass", masterLP.frequency.value = 5200, masterLP.Q.value = .2;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16, comp.knee.value = 20, comp.ratio.value = 5, comp.attack.value = .004, comp.release.value = .25, masterGain.connect(masterLP), masterLP.connect(comp), comp.connect(ac.destination), reverbNode = makeReverb(ac), reverbDry = ac.createGain(), reverbDry.gain.value = .62, reverbDry.connect(masterGain), reverbWet = ac.createGain(), reverbWet.gain.value = ADJ.reverb / 22, reverbWet.connect(masterGain), reverbNode.output.connect(reverbWet);
  const cfg = CFG[S.session] || CFG.calm;
  S.activeKey && KEY_ROOTS[S.activeKey] || (S.activeKey = resolveKey());
  const keyInfo = KEY_ROOTS[S.activeKey] || KEY_ROOTS["D minor"],
    scale = buildScale(keyInfo.root, keyInfo.mode),
    bpm = void 0,
    beat = 60 / (ADJ.tempo || cfg.bpm),
    STEPS_PER_BAR = 16,
    playNote = getInstrumentPlayer(S.instrument, ac, cfg),
    safe = i => scale[Math.max(0, Math.min(scale.length - 1, i))];

  function playChordBar(bar, when) {
    const now = when,
      dur = 4 * beat;
    [bar.root, bar.root + 2, bar.root + 4].forEach(idx => {
      const f = .5 * safe(idx),
        o = ac.createOscillator(),
        env = ac.createGain();
      o.type = "sine", o.frequency.value = f;
      const v = .04 * (ADJ.warmth / 8 + .12);
      env.gain.setValueAtTime(1e-4, now), env.gain.linearRampToValueAtTime(v, now + .6), env.gain.setValueAtTime(v, now + dur), env.gain.exponentialRampToValueAtTime(1e-4, now + dur + .7), o.connect(env), env.connect(reverbDry), env.connect(reverbNode.input), o.start(now), o.stop(now + dur + .8)
    });
    const bf = .25 * safe(bar.root),
      bo = ac.createOscillator(),
      be = ac.createGain();
    bo.type = "sine", bo.frequency.value = bf;
    const bv = .14 * (ADJ.warmth / 8 + .18);
    be.gain.setValueAtTime(1e-4, now), be.gain.linearRampToValueAtTime(bv, now + .12), be.gain.setValueAtTime(.65 * bv, now + 3 * beat), be.gain.exponentialRampToValueAtTime(1e-4, now + 4 * beat + .2), bo.connect(be), be.connect(reverbDry), bo.start(now), bo.stop(now + 4 * beat + .3)
  }

  function playMelodyNote(n, when) {
    const freq = safe(n.scaleIdx),
      durSec = n.durBeats * beat,
      vd = ac.createGain();
    vd.gain.value = n.vel, vd.connect(reverbDry);
    const vw = ac.createGain();
    vw.gain.value = n.vel, vw.connect(reverbNode.input), playNote(freq, 1.06 * durSec, vd, vw, when)
  }

  function playCounterNote(n, when) {
    if (n.durBeats < 1.5) return;
    const f = .5 * safe(n.scaleIdx),
      durSec = n.durBeats * beat,
      o = ac.createOscillator(),
      env = ac.createGain();
    o.type = "sine", o.frequency.value = f;
    const v = .06;
    env.gain.setValueAtTime(1e-4, when), env.gain.linearRampToValueAtTime(v, when + .12), env.gain.setValueAtTime(.048, when + .7 * durSec), env.gain.exponentialRampToValueAtTime(1e-4, when + 1.1 * durSec), o.connect(env), env.connect(reverbDry), env.connect(reverbNode.input), o.start(when), o.stop(when + 1.2 * durSec)
  }
  const stepDur = beat / 4,
    SCHEDULE_AHEAD = 1.6;
  let stepCount = 0,
    nextStepTime = ac.currentTime + .08,
    section = buildSection(S.session);

  function scheduleStep(step, when) {
    if (step % 16 != 0) return;
    const barNo = Math.floor(step / 16);
    barNo % 4 == 0 && step > 0 && (section = buildSection(S.session));
    const bar = section[barNo % 4];
    playChordBar(bar, when);
    for (const n of bar.notes) playMelodyNote(n, when + n.atBeat * beat);
    if (bar.counter)
      for (const n of bar.counter) playCounterNote(n, when + n.atBeat * beat)
  }

  function scheduler() {
    if (S.playing) {
      for (; nextStepTime < ac.currentTime + 1.6;) scheduleStep(stepCount, nextStepTime), stepCount++, nextStepTime += stepDur;
      mTimer = setTimeout(scheduler, 250)
    }
  }
  const carrier = 264,
    bb = S.condMods && null != S.condMods.bb ? S.condMods.bb : cfg.bb,
    bG = ac.createGain();
  bG.gain.value = .052, binL = ac.createOscillator(), binL.type = "sine", binL.frequency.value = 264, binR = ac.createOscillator(), binR.type = "sine", binR.frequency.value = 264 + bb;
  const panL = ac.createStereoPanner();
  panL.pan.value = -1;
  const panR = ac.createStereoPanner();
  panR.pan.value = 1, binL.connect(panL), panL.connect(bG), binR.connect(panR), panR.connect(bG), bG.connect(masterGain), binL.start(), binR.start();
  const sz = 3 * ac.sampleRate,
    nbuf = ac.createBuffer(1, sz, ac.sampleRate),
    nd = nbuf.getChannelData(0);
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0;
  for (let i = 0; i < sz; i++) {
    const wh = 2 * Math.random() - 1;
    b0 = .99886 * b0 + .0555179 * wh, b1 = .99332 * b1 + .0750759 * wh, b2 = .969 * b2 + .153852 * wh, b3 = .8665 * b3 + .3104856 * wh, b4 = .55 * b4 + .5329522 * wh, nd[i] = .11 * (b0 + b1 + b2 + b3 + b4 + .5362 * wh)
  }
  natureSrc = ac.createBufferSource(), natureSrc.buffer = nbuf, natureSrc.loop = !0;
  const nfilt = ac.createBiquadFilter();
  nfilt.type = "lowpass", nfilt.frequency.value = 500, natureGainNode = ac.createGain(), natureGainNode.gain.value = ADJ.nature / 10 * .025, natureSrc.connect(nfilt), nfilt.connect(natureGainNode), natureGainNode.connect(masterGain), natureSrc.start(), S.playing = !0, document.getElementById("playBtn").textContent = "⏸", animViz(), scheduler(), setupMediaSession(), requestWakeLock(), progressTimer = setInterval(() => {
    S.playing && (S.seconds++, S.seconds >= S.total ? stopMusic() : (document.getElementById("pf").style.width = (S.seconds / S.total * 100).toFixed(1) + "%", document.getElementById("te").textContent = fmt(S.seconds)))
  }, 1e3)
}

function stopMusic() {
  S.playing = !1, clearTimeout(mTimer), clearTimeout(cTimer), clearTimeout(bTimer), clearInterval(progressTimer);
  try {
    binL && binL.stop(), binR && binR.stop()
  } catch (e) {}
  try {
    natureSrc && natureSrc.stop()
  } catch (e) {}
  try {
    masterGain && masterGain.gain.linearRampToValueAtTime(1e-4, AC.currentTime + .4)
  } catch (e) {}
  if (stopViz(), releaseWakeLock(), "mediaSession" in navigator) try {
    navigator.mediaSession.playbackState = "paused"
  } catch (e) {}
  document.getElementById("playBtn").textContent = "▶"
}

function setupMediaSession() {
  if ("mediaSession" in navigator) try {
    const m = "custom" === S.instrument && S.customParams ? S.customParams : INST_META[S.instrument] || INST_META.piano;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: S.trackName || "Therapeutic Session",
      artist: "Concordia",
      album: (SESSION_LABELS[S.session] || "Session") + " · " + (m.label || "")
    }), navigator.mediaSession.playbackState = "playing", navigator.mediaSession.setActionHandler("play", () => {
      S.playing || (AC && "suspended" === AC.state && AC.resume(), startMusic())
    }), navigator.mediaSession.setActionHandler("pause", () => {
      S.playing && stopMusic()
    }), navigator.mediaSession.setActionHandler("stop", () => {
      S.playing && stopMusic()
    })
  } catch (e) {}
}
let _wakeLock = null;
async function requestWakeLock() {
  try {
    "wakeLock" in navigator && (_wakeLock = await navigator.wakeLock.request("screen"))
  } catch (e) {}
}

function releaseWakeLock() {
  try {
    _wakeLock && (_wakeLock.release(), _wakeLock = null)
  } catch (e) {}
}

function togglePlay() {
  S.playing ? stopMusic() : (AC && "suspended" === AC.state && AC.resume(), startMusic())
}

function restart() {
  stopMusic(), S.seconds = 0, document.getElementById("pf").style.width = "0%", document.getElementById("te").textContent = "0:00"
}

function skip30() {
  S.seconds = Math.min(S.seconds + 30, S.total - 1)
}

function setVol(v) {
  S.vol = v / 100, masterGain && (masterGain.gain.value = S.vol), document.getElementById("volV").textContent = v + "%"
}

function seek(e, el) {
  const r = el.getBoundingClientRect();
  S.seconds = Math.floor((e.clientX - r.left) / r.width * S.total)
}

function updateNatureGain(v) {
  natureGainNode && (natureGainNode.gain.value = v / 10 * .025)
}

function updateReverb(v) {
  reverbWet && (reverbWet.gain.value = v / 22)
}

function regen() {
  stopMusic(), setTimeout(startAnalysis, 100)
}
document.addEventListener("visibilitychange", () => {
  "visible" === document.visibilityState && (AC && "suspended" === AC.state && S.playing && AC.resume(), S.playing && requestWakeLock())
});
const SESSION_LABELS = {
    calm: "Deep Calm",
    focus: "Clarity & Focus",
    sleep: "Sleep Prep",
    mood: "Mood Lift",
    memory: "Memory Care",
    grounding: "Grounding"
  },
  SESSION_ICONS = {
    calm: "🌊",
    focus: "🔬",
    sleep: "🌙",
    mood: "☀️",
    memory: "🧠",
    grounding: "🌿"
  };

function endSess() {
  stopMusic();
  const guess = Math.max(1, S.stress - 2),
    es = void 0;
  document.getElementById("endStress").value = guess, document.getElementById("endStressV").textContent = guess, document.getElementById("endModal").classList.remove("hidden")
}

function finishSession(skipped) {
  document.getElementById("endModal").classList.add("hidden");
  const m = "custom" === S.instrument && S.customParams ? S.customParams : INST_META[S.instrument] || INST_META.piano,
    stressAfter = skipped ? null : parseInt(document.getElementById("endStress").value);
  addHistory({
    date: Date.now(),
    session: S.session,
    sessionLabel: SESSION_LABELS[S.session] || "Session",
    icon: SESSION_ICONS[S.session] || "🎵",
    trackName: S.trackName || "Untitled",
    instrument: m.label || "Piano",
    instIcon: m.icon || "🎹",
    dur: S.dur,
    mood: S.mood.charAt(0).toUpperCase() + S.mood.slice(1),
    stressBefore: S.stress,
    stressAfter: stressAfter
  }), renderHistory(), showTab("history"), document.querySelectorAll(".nb").forEach(b => b.classList.remove("on")), document.querySelectorAll(".nb")[2].classList.add("on")
}

function newSess() {
  stopMusic(), go("s-mood"), document.querySelectorAll(".mb,.stb,.ib,.condchip").forEach(b => b.classList.remove("on")), S.customParams = null, S.aiComposition = null, S.aiComposed = !1, S.conditions = [], S.condMods = null;
  const cn = document.getElementById("condNote");
  cn && cn.classList.add("hidden")
}

function instLabel() {
  const m = void 0;
  return ("custom" === S.instrument && S.customParams ? S.customParams : INST_META[S.instrument] || INST_META.piano).label || "piano"
}

function buildFallbackInsight() {
  const cfg = CFG[S.session] || CFG.calm,
    inst = instLabel(),
    k = S.activeKey,
    bpm = cfg.bpm,
    bb = cfg.bbl,
    lines = {
      calm: `This piece in ${k} moves at about ${bpm} beats a minute — close to a calm, resting heartbeat — so your body can gently fall into step with it. As the ${inst} plays over ${bb} waves, let your shoulders soften and try making each out-breath a little longer than each in-breath. There's nothing to do here but arrive; let the stillness come to meet you.`,
      focus: `Set in ${k} at a steady ${bpm} BPM, this music holds a gentle, even pulse designed to settle a busy mind into clear, relaxed attention. The ${inst} keeps a predictable shape on purpose — notice how your thoughts have a little more room when the sound stays calm and uncluttered. Let the ${bb} rhythm hold the background while you bring one thing at a time into focus.`,
      sleep: `This slow piece in ${k} drifts at only ${bpm} BPM, with ${bb} — the deep, restful frequency the brain reaches in true sleep. Let the long, soft ${inst} tones wash over you and resist the urge to follow the melody; simply let each note arrive and fade. As your breathing slows to match the music, allow yourself to sink, knowing you can let go completely.`,
      mood: `Played in the bright key of ${k} at a gently lifting ${bpm} BPM, this music begins where you are and rises with you, rather than forcing brightness on you. Notice the small upward turns in the ${inst} line — let them lift the corners of your attention, even just a little. You don't have to feel better all at once; let the ${bb} warmth carry you one phrase at a time.`,
      memory: `This warm, song-like piece in ${k} uses ${bb} stimulation, which research links to memory and recognition, with familiar melodic shapes on the ${inst}. Let the tune feel comfortable and known — if it brings an image, a place, or a face to mind, simply let it visit. There's no need to reach for anything; the music will do the gentle remembering with you.`,
      grounding: `Rooted in ${k} at a steady ${bpm} BPM, this music returns again and again to a stable home tone, giving your nervous system a safe and predictable anchor. Feel where your body meets the chair or floor, and let the ${inst} and ${bb} waves remind you that, right now, you are here and you are safe. Breathe slowly and let each repeated phrase steady you a little more.`
    };
  return lines[S.session] || lines.calm
}

function buildFallbackAnswer(q) {
  const ql = (q || "").toLowerCase(),
    cfg = CFG[S.session] || CFG.calm;
  return ql.includes("binaural") ? `Binaural beats play a slightly different frequency in each ear — here, tuned to produce ${cfg.bbl} waves. Your brain perceives the difference and gently tends to sync toward that rhythm, a process called entrainment, which can ease the nervous system toward calm. Headphones make the effect work best.` : ql.includes("tempo") || ql.includes("bpm") || ql.includes("key") ? `Your music is in ${S.activeKey} at about ${cfg.bpm} BPM. Slower tempos near a resting heart rate encourage your pulse and breathing to settle, and the key sets the emotional colour — minor keys feel deeper and more introspective, major keys feel brighter and more open.` : ql.includes("dementia") || ql.includes("memory") ? "Music reaches autobiographical memory even when other memory fades, because the brain regions that respond to familiar melodies are among the last affected. Familiar musical shapes and 40 Hz gamma stimulation are used in Memory Care mode to gently activate those networks and ease agitation." : ql.includes("instrument") ? `You're hearing the ${instLabel()}. Instruments with smooth, predictable tones are especially soothing because they avoid sharp sound transients that can trigger a startle response — so the nervous system can relax into the sound rather than bracing against it.` : ql.includes("anx") || ql.includes("panic") || ql.includes("stress") ? "If you're still feeling anxious, that's okay — calm often arrives slowly. Try letting your out-breath stretch a little longer than your in-breath, and rest your attention on the lowest, steadiest tones in the music. You don't have to force anything; just keep breathing and let the sound hold you." : "I can't reach the AI guide right now, but the music is still here for you. Let yourself simply listen — follow one gentle thread of sound, slow your breathing to match it, and let everything else soften for a few minutes."
}
async function genInsight() {
  const el = document.getElementById("aiIns");
  el.innerHTML = '<span class="cur"></span>';
  const cfg = CFG[S.session] || CFG.calm,
    p = `You are Concordia, a compassionate AI therapeutic music companion. You just composed an original piece for this listener. They feel ${S.mood}, stress level ${S.stress}/10, in a ${S.session} session. The piece you composed: "${S.trackName}" — ${cfg.bpm} BPM, ${cfg.bbl} binaural beats, key of ${S.activeKey}, played on ${instLabel()}. Write 3 warm personal sentences (no bullets, no markdown): 1) Why you composed it this way for their current state. 2) A specific thing to notice or feel while listening. 3) A gentle encouraging thought. Speak directly to them.`;
  await streamAI(p, el, buildFallbackInsight())
}
async function doAsk() {
  const inp = document.getElementById("askIn"),
    q = inp.value.trim();
  if (!q) return;
  inp.value = "";
  const el = document.getElementById("aiAsk");
  el.innerHTML = '<span class="cur"></span>';
  const cfg = CFG[S.session] || CFG.calm,
    p = `You are Concordia, a gentle therapeutic music AI. Session: ${S.session}, "${S.trackName}", key of ${S.activeKey}, ${cfg.bbl}, instrument: ${instLabel()}. User asks: "${q}". Answer warmly in 2–4 sentences, grounded in music therapy research where relevant. No bullets, no markdown.`;
  await streamAI(p, el, buildFallbackAnswer(q))
}

function qa(q) {
  document.getElementById("askIn").value = q, doAsk()
}

function typeOut(el, text) {
  el.textContent = "";
  let i = 0;
  const iv = setInterval(() => {
    el.textContent += text[i] || "", i++, i >= text.length && clearInterval(iv)
  }, 15)
}
async function streamAI(prompt, el, fallback) {
  try {
    const data = await callClaudeAPI([{
      role: "user",
      content: prompt
    }]);
    if (!data || !Array.isArray(data.content)) throw new Error("no content");
    const text = data.content.map(c => c.text || "").join("").trim();
    if (!text) throw new Error("empty");
    typeOut(el, text)
  } catch (e) {
    typeOut(el, fallback || "Let the music carry you for a moment — simply listen and breathe.")
  }
}

function drawTrend() {
  const c = document.getElementById("trendC");
  if (!c) return;
  const emptyEl = document.getElementById("trendEmpty"),
    h = loadHistory().filter(e => null != e.stressAfter).slice(0, 7).reverse();
  if (h.length < 2) return c.style.display = "none", void(emptyEl && emptyEl.classList.remove("hidden"));
  c.style.display = "block", emptyEl && emptyEl.classList.add("hidden");
  const data = h.map(e => e.stressAfter),
    labels = h.map(e => relativeDate(e.date));
  c.width = 2 * c.offsetWidth, c.height = 260;
  const ctx = c.getContext("2d"),
    w = c.width,
    hgt = c.height,
    pad = 48;
  ctx.clearRect(0, 0, w, hgt);
  const sx = data.length > 1 ? (w - 96) / (data.length - 1) : 0,
    sy = (hgt - 96) / 10;
  ctx.beginPath(), data.forEach((v, i) => {
    const x = 48 + i * sx,
      y = hgt - 48 - v * sy;
    0 === i ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }), ctx.lineTo(48 + (data.length - 1) * sx, hgt - 48), ctx.lineTo(48, hgt - 48), ctx.closePath(), ctx.fillStyle = "rgba(29,158,117,.1)", ctx.fill(), ctx.beginPath(), data.forEach((v, i) => {
    const x = 48 + i * sx,
      y = hgt - 48 - v * sy;
    0 === i ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }), ctx.strokeStyle = "#1D9E75", ctx.lineWidth = 3, ctx.stroke(), data.forEach((v, i) => {
    const x = 48 + i * sx,
      y = hgt - 48 - v * sy;
    ctx.beginPath(), ctx.arc(x, y, 5, 0, 2 * Math.PI), ctx.fillStyle = "#1D9E75", ctx.fill(), ctx.fillStyle = "#6b7280", ctx.font = "18px DM Sans", ctx.textAlign = "center", ctx.fillText(labels[i], x, hgt - 10), ctx.fillText(v, x, y - 14)
  })
}
initAuth();
