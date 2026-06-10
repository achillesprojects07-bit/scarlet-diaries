import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, addDoc, setDoc, doc, getDoc, getDocs, query,
  where, orderBy, limit, serverTimestamp, onSnapshot, updateDoc, deleteDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FAMILY_ID = "scarlet-family";
const CHILD_ID = "amara";
const APP_NAME = "The Scarlet Diaries";
const BUILD = "V4.1";
const CIRCLE = ["Mom", "Dad", "Tita"];

// ── PASSCODE SYSTEM ──────────────────────────────
// Passcodes are hashed before storing — never plain text
async function hashCode(str){
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

const ROLES = {
  amara: { label:"Amara",  icon:"🩸", type:"child" },
  mom:   { label:"Mom",    icon:"🌙", type:"adult" },
  dad:   { label:"Dad",    icon:"⚡", type:"adult" },
  tita:  { label:"Tita",   icon:"🔮", type:"adult" }
};

async function verifyPasscode(roleKey, code){
  try {
    const hashed = await hashCode(code.trim());
    const snap = await getDoc(doc(db,"families",FAMILY_ID,"passcodes",roleKey));
    if(!snap.exists()) return false;
    return snap.data().hash === hashed;
  } catch(e) {
    console.error("Passcode verify error:", e);
    return false;
  }
}

async function savePasscode(roleKey, code){
  const hashed = await hashCode(code.trim());
  await setDoc(doc(db,"families",FAMILY_ID,"passcodes",roleKey), {
    hash: hashed,
    updatedAt: serverTimestamp()
  });
}

async function ensurePasscodes(){
  // Seeds default passcodes if they don't exist yet
  const defaults = { amara:"Amara16", mom:"Neri01", dad:"George13", tita:"Aileen07" };
  for(const [role, code] of Object.entries(defaults)){
    const snap = await getDoc(doc(db,"families",FAMILY_ID,"passcodes",role));
    if(!snap.exists()){
      await savePasscode(role, code);
    }
  }
}

const DEFAULT_SETTINGS = {
  childName: "Amara",
  rapidInsulin: "Apidra",
  basalInsulin: "Lantus",
  carbRatio: 8,
  targetGlucose: 120,
  correctionFactor: 50,
  lantusMorningDose: 20,
  lantusNightDose: 8,
  lantusMorningStart: "06:00",
  lantusMorningEnd: "10:00",
  lantusNightStart: "19:00",
  lantusNightEnd: "22:00",
  doseRounding: 1,
  lowThreshold: 70,
  highThreshold: 250,
  urgentHighThreshold: 300,
  preMealCorrection180: 2,
  preMealCorrection250: 4,
  ketonePromptThreshold: 250,
  insulinStackingHours: 3,
  alertEmails: ["mom@example.com", "dad@example.com", "tita@example.com"],
  updatedAt: null
};

const STARTER_FOODS = [
  { name:"White rice", category:"Rice, Bread & Grains", portion:"1 cup cooked", carbs:45, calories:205, source:"Family starter", confidence:"Medium", hidden:false },
  { name:"Pandesal", category:"Rice, Bread & Grains", portion:"1 piece", carbs:15, calories:120, source:"Estimate", confidence:"Low", hidden:false },
  { name:"Filipino spaghetti", category:"Meals", portion:"1 cup", carbs:43, calories:310, source:"Estimate", confidence:"Low", hidden:true },
  { name:"Adobo sauce", category:"Meals", portion:"2 tbsp", carbs:4, calories:35, source:"Estimate", confidence:"Low", hidden:true },
  { name:"Fried chicken breading", category:"Hidden Carbs", portion:"small serving", carbs:8, calories:60, source:"Estimate", confidence:"Low", hidden:true },
  { name:"Sweet sauce / ketchup", category:"Hidden Carbs", portion:"1 tbsp", carbs:5, calories:20, source:"Estimate", confidence:"Low", hidden:true },
  { name:"Juice box", category:"Drinks", favorite:true, portion:"1 box", carbs:20, calories:90, source:"Label estimate", confidence:"Medium", hidden:false },
  { name:"Milk", category:"Drinks", portion:"1 cup", carbs:12, calories:150, source:"Generic", confidence:"Medium", hidden:false },
  { name:"Banana", category:"Fruits", portion:"1 medium", carbs:27, calories:105, source:"Generic", confidence:"Medium", hidden:false },
  { name:"Pita bread", category:"Rice, Bread & Grains", portion:"1 medium", carbs:33, calories:170, source:"Generic", confidence:"Medium", hidden:false },
  { name:"Greek yogurt plain", category:"Meals", portion:"170g", carbs:6, calories:100, source:"Generic", confidence:"Medium", hidden:false },
  { name:"Honey", category:"Meals", portion:"1 tbsp", carbs:17, calories:64, source:"Generic", confidence:"Medium", hidden:true },
  { name:"Spanakopita", category:"Meals", portion:"1 piece", carbs:28, calories:290, source:"Estimate", confidence:"Low", hidden:true },
  { name:"Souvlaki with pita", category:"Meals", portion:"1 serving", carbs:38, calories:420, source:"Estimate", confidence:"Low", hidden:true }
];

const BADGES = [
  { id:"scarlet-sentinel", section:"The Blood Watch", name:"The Scarlet Sentinel", desc:"You listened before the first bite.", rule:"Log a glucose reading before a meal." },
  { id:"keeper-drop", section:"The Blood Watch", name:"Keeper of the Drop", desc:"You told the truth. The number became a signal.", rule:"Log any glucose reading honestly." },
  { id:"stormbreaker", section:"Storm & Flame", name:"Stormbreaker", desc:"You faced the storm instead of hiding from it.", rule:"Complete high sugar safety steps." },
  { id:"slayer-300", section:"Storm & Flame", name:"The 300 Slayer", desc:"You called for help before the storm got stronger.", rule:"Log glucose 300+ and alert an adult." },
  { id:"no-stack-oath", section:"Storm & Flame", name:"The No-Stack Oath", desc:"Power is knowing when to wait.", rule:"Avoid correcting again too soon." },
  { id:"crimson-comeback", section:"The Lowlight", name:"The Crimson Comeback", desc:"You fell low, but you rose again.", rule:"Treat and recheck a low sugar." },
  { id:"hidden-carb-hunter", section:"Secrets of the Plate", name:"The Hidden Carb Hunter", desc:"You found what the meal tried to hide.", rule:"Use the secret carbs checklist." },
  { id:"feast-reader", section:"Secrets of the Plate", name:"The Feast Reader", desc:"You read the plate like a secret map.", rule:"Complete a meal calculation." },
  { id:"family-food-keeper", section:"Secrets of the Plate", name:"The Family Food Keeper", desc:"You saved a food your real life understands.", rule:"Save a custom family food." },
  { id:"ketone-seer", section:"The Dark Signals", name:"The Ketone Seer", desc:"You read the warning signs.", rule:"Check ketones during a high sugar day." },
  { id:"truth-keeper", section:"The Dark Signals", name:"The Truth Keeper", desc:"You told the truth, and the Circle can help.", rule:"Log that ketone strips are missing or unavailable." },
  { id:"caller-circle", section:"The Circle", name:"Caller of the Circle", desc:"You were brave enough to call your guardians.", rule:"Ask Mom, Dad, or Tita for help." },
  { id:"brave-page", section:"The Written Heart", name:"The Brave Page", desc:"You gave your feelings a place to go.", rule:"Write a Scarlet Entry." },
  { id:"girl-who-stayed", section:"The Written Heart", name:"The Girl Who Stayed", desc:"Even on a hard day, you remained.", rule:"Write after choosing sad, angry, or scared." },
  { id:"seven-scarlet-days", section:"The Unstoppable Line", name:"Seven Scarlet Days", desc:"Seven days. Seven proofs that you kept going.", rule:"Use the app for 7 days." },
  { id:"three-guardians", section:"The Circle", name:"The Three Guardians", desc:"Your Circle has been summoned.", rule:"Alert the Circle during a high-risk moment." },
  { id:"signal-flame", section:"The Circle", name:"The Signal Flame", desc:"Your call for help became a light in the dark.", rule:"Send any safety alert." },
  { id:"scarlet-crown", section:"The Unstoppable Line", name:"The Crimson Crown", desc:"A mark for every brave thing you kept doing.", rule:"Reach a major care milestone." },
  { id:"wall-proof", section:"The Unstoppable Line", name:"The Wall of Proof", desc:"The proof was never perfection. It was staying.", rule:"Unlock several courage badges." },
  { id:"soft-monster-tamer", section:"The Written Heart", name:"The Soft Monster Tamer", desc:"You named the feeling, so it became less alone.", rule:"Write about a hard feeling." },
  { id:"moonlit-heart", section:"The Written Heart", name:"The Moonlit Heart", desc:"Even sadness can be held gently.", rule:"Write a Scarlet Entry on a sad day." },
  { id:"plate-whisperer", section:"Secrets of the Plate", name:"The Plate Whisperer", desc:"You listened to the meal before it surprised you.", rule:"Build a full meal with food and hidden carb check." },
  { id:"dark-signal-reader", section:"The Dark Signals", name:"The Dark Signal Reader", desc:"You noticed the warning signs before they became louder.", rule:"Log ketones or symptoms during a high sugar moment." }
];

let state = {
  role:null,
  roleKey:"",
  authenticated:false,
  settings: DEFAULT_SETTINGS,
  foods: STARTER_FOODS,
  unlockedBadges: new Set(),
  view:"home",
  foodTab:"Breakfast Favorites",
  foodCategory:"All",
  foodSearch:"",
  meal:{ type:null, glucose:null, items:[], hiddenChecked:false, symptoms:[], ketones:null, lastApidra:"unknown" },
  moodCheckedThisSession:false
};

let lastHiddenAt = null;
let activeTimerInterval = null;
let audioUnlocked = false;

const $app = document.getElementById("app");

function esc(str){
  return String(str ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function toast(msg){
  const old = document.querySelector(".toast");
  if(old) old.remove();
  const div = document.createElement("div");
  div.className = "toast";
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(()=>div.remove(), 3000);
}

function setBusy(btn, text="Saving…"){
  if(!btn) return () => {};
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = text;
  return () => {
    btn.disabled = false;
    btn.innerHTML = original;
  };
}

function scrollToTopSoon(){
  setTimeout(() => window.scrollTo({ top:0, behavior:"smooth" }), 80);
}

function unlockAudio(){
  audioUnlocked = true;
  try{
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if(AudioContext && !window.__scarletAudioContext){
      window.__scarletAudioContext = new AudioContext();
      if(window.__scarletAudioContext.state === "suspended") window.__scarletAudioContext.resume();
    }
  }catch(e){}
}

function playDiaryChime(){
  try{
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if(!AudioContext) return;
    const ctx = window.__scarletAudioContext || new AudioContext();
    window.__scarletAudioContext = ctx;
    if(ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.16, now + idx * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.16 + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.16);
      osc.stop(now + idx * 0.16 + 0.45);
    });
  }catch(err){
    console.warn("Chime unavailable:", err);
  }
}

function inTimeWindow(now, start, end){
  const [sh, sm] = String(start || "00:00").split(":").map(Number);
  const [eh, em] = String(end || "23:59").split(":").map(Number);
  const current = now.getHours() * 60 + now.getMinutes();
  const s = sh * 60 + (sm || 0);
  const e = eh * 60 + (em || 0);
  if(s <= e) return current >= s && current <= e;
  return current >= s || current <= e;
}

function getLantusPeriod(){
  const now = new Date();
  if(inTimeWindow(now, state.settings.lantusMorningStart, state.settings.lantusMorningEnd)) return "morning";
  if(inTimeWindow(now, state.settings.lantusNightStart, state.settings.lantusNightEnd)) return "night";
  return now.getHours() < 12 ? "morning_outside_window" : "night_outside_window";
}

function maybeStartChildMoodCheck(reason="open"){
  if(state.role !== "child") return false;
  if(state.view === "mood") return false;
  const now = Date.now();
  const lastMoodAt = Number(sessionStorage.getItem("scarletLastMoodAt") || 0);
  const dueByResume = reason === "resume" && (!lastMoodAt || now - lastMoodAt > 10 * 60 * 1000);
  const dueByOpen = reason === "open" && !state.moodCheckedThisSession;
  if(dueByOpen || dueByResume){
    state.view = "mood";
    render();
    return true;
  }
  return false;
}

function returnToDashboard(){
  state.view = "home";
  render();
}


function renderFlowDone({title="Saved", message="", next=[]} = {}){
  layout(`
    <div class="card success">
      <h2>${esc(title)}</h2>
      <p class="muted" style="margin-top:8px">${esc(message)}</p>
    </div>
    <div class="grid single">
      ${next.map(n => `<button class="action ${n.className || ""}" data-next="${n.view}"><strong>${esc(n.title)}</strong><span>${esc(n.sub || "")}</span></button>`).join("")}
      <button class="action scarlet" data-next="home"><strong>Back Home</strong><span>Return to Amara’s home screen.</span></button>
    </div>
  `, "home");
  document.querySelectorAll("[data-next]").forEach(btn => btn.onclick = () => {
    state.view = btn.dataset.next;
    render();
  });
}

// ── ROLE HELPERS ─────────────────────────────────
function roleType(roleKey){
  return roleKey === "amara" ? "child" : "adult";
}

// ── RENDER ENTRY POINT ───────────────────────────
function render(){
  if(!state.authenticated) return renderLogin();
  if(state.role === "adult") return renderAdult();
  switch(state.view){
    case "meal":    return renderMealStart();
    case "high":    return renderHighSugar();
    case "low":     return renderLowSugar();
    case "lantus":  return renderLantusLog();
    case "insulin": return renderLantusLog();
    case "feel":    return renderSymptoms();
    case "diary":   return renderDiary();
    case "vault":   return renderVault();
    case "circle":  return renderCircle();
    case "foods":   return renderFoodLibrary();
    case "mood":    return renderHowIFeel();
    case "reports": return renderReports();
    case "pages":   return renderScarletPages();
    default:        return renderHome();
  }
}

// ── LOGIN SCREEN ─────────────────────────────────
function renderLogin(){
  $app.innerHTML = `
    <section class="screen center">
      <div class="app-wrapper">

        <div class="header">
          <div class="scarlet-drop"></div>
          <div class="app-title">The Scarlet <span>Diaries</span></div>
          <div class="divider"></div>
          <div class="tagline">Every drop. Every breath. Unstoppable.</div>
          <div class="build-tag">${BUILD}</div>
        </div>

        <div class="login-card" id="loginCard">

          <!-- STEP 1: ROLE SELECTION -->
          <div id="roleStep">
            <div class="login-prompt">Who are you?</div>
            <div class="role-buttons">
              <button class="role-btn amara" data-role="amara">
                <span class="role-icon">🩸</span>
                <span>I am Amara</span>
              </button>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                <button class="role-btn circle" data-role="mom"><span class="role-icon">🌙</span> Mom</button>
                <button class="role-btn circle" data-role="dad"><span class="role-icon">⚡</span> Dad</button>
              </div>
              <button class="role-btn circle" data-role="tita">
                <span class="role-icon">🔮</span>
                <span>I am Tita</span>
              </button>
            </div>
          </div>

          <!-- STEP 2: PASSCODE -->
          <div id="passcodeStep" style="display:none">
            <div class="form-title" id="passcodeTitle">Enter your code</div>
            <div class="error-msg" id="passcodeError"></div>
            <div style="position:relative;margin:8px 0">
              <input
                type="password"
                class="form-input"
                id="passcodeInput"
                placeholder="Your personal code"
                autocomplete="current-password"
                style="padding-right:48px"
              />
              <button id="togglePasscode" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--ash);font-size:18px;cursor:pointer;padding:4px">👁</button>
            </div>
            <button class="submit-btn" id="passcodeBtn">
              <span>🗝</span>
              <span>Unlock the Diary</span>
            </button>
            <button class="back-btn" id="backToRoles" style="margin-top:12px">← Choose a different role</button>
          </div>

          <!-- STEP 3: CHANGE PIN (from settings) -->
          <div id="changePinStep" style="display:none">
            <div class="form-title">Change Your Code</div>
            <div class="error-msg" id="changePinError"></div>
            <input type="password" class="form-input" id="currentPin" placeholder="Current code" autocomplete="current-password" style="margin-bottom:10px" />
            <input type="password" class="form-input" id="newPin" placeholder="New code" autocomplete="new-password" style="margin-bottom:10px" />
            <input type="password" class="form-input" id="confirmPin" placeholder="Confirm new code" autocomplete="new-password" style="margin-bottom:10px" />
            <button class="submit-btn" id="savePinBtn">Save New Code</button>
            <button class="back-btn" id="cancelChangePin" style="margin-top:10px">← Cancel</button>
          </div>

        </div>

        <div class="footer">The Scarlet Diaries · Private &amp; Protected</div>
      </div>
    </section>
  `;

  // Role selection
  document.querySelectorAll("[data-role]").forEach(btn => btn.onclick = () => {
    state.roleKey = btn.dataset.role;
    document.getElementById("roleStep").style.display = "none";
    document.getElementById("passcodeStep").style.display = "block";
    const labels = { amara:"🩸 Hello Amara", mom:"🌙 Hello Mom", dad:"⚡ Hello Dad", tita:"🔮 Hello Tita" };
    document.getElementById("passcodeTitle").textContent = labels[state.roleKey] || "Enter your code";
    document.getElementById("passcodeInput").focus();
    clearPasscodeError();
  });

  // Back to role selection
  document.getElementById("backToRoles").onclick = () => {
    state.roleKey = "";
    document.getElementById("roleStep").style.display = "block";
    document.getElementById("passcodeStep").style.display = "none";
    document.getElementById("passcodeInput").value = "";
    clearPasscodeError();
  };

  // Show/hide passcode
  document.getElementById("togglePasscode").onclick = () => {
    const inp = document.getElementById("passcodeInput");
    inp.type = inp.type === "password" ? "text" : "password";
  };

  // Enter key on passcode
  document.getElementById("passcodeInput").onkeydown = e => {
    if(e.key === "Enter") attemptLogin();
  };

  // Unlock button
  document.getElementById("passcodeBtn").onclick = () => attemptLogin();
}

function clearPasscodeError(){
  const el = document.getElementById("passcodeError");
  if(el){ el.textContent = ""; el.classList.remove("visible"); }
}
function showPasscodeError(msg){
  const el = document.getElementById("passcodeError");
  if(!el) return toast(msg);
  el.textContent = msg;
  el.classList.add("visible");
}

async function attemptLogin(){
  const code = document.getElementById("passcodeInput")?.value?.trim();
  const roleKey = state.roleKey;
  if(!code) return showPasscodeError("Please enter your code.");
  if(!roleKey) return showPasscodeError("Please select your role first.");

  const btn = document.getElementById("passcodeBtn");
  const restore = setBusy(btn, "Checking…");
  clearPasscodeError();

  try {
    // First time: seed passcodes if not yet in Firestore
    await ensurePasscodes();

    const valid = await verifyPasscode(roleKey, code);
    if(!valid){
      restore();
      showPasscodeError("That code is not right. Please try again.");
      document.getElementById("passcodeInput").value = "";
      document.getElementById("passcodeInput").focus();
      return;
    }

    // Authenticated
    state.authenticated = true;
    state.roleKey = roleKey;
    state.role = roleType(roleKey);
    localStorage.setItem("scarletRoleKey", roleKey);
    localStorage.setItem("scarletRole", state.role);

    await safeEnsureDefaults();
    await loadData();
    state.moodCheckedThisSession = false;
    if(!maybeStartChildMoodCheck("open")) render();

  } catch(err){
    console.error("Login error:", err);
    restore();
    if(String(err.message||"").toLowerCase().includes("permission")){
      showPasscodeError("Firebase rules need to be published. Please update firestore.rules first.");
    } else {
      showPasscodeError("Something went wrong. Please try again.");
    }
  }
}

// ── CHANGE PIN ────────────────────────────────────
async function showChangePin(){
  // Show change pin step inside login card
  const card = document.getElementById("loginCard");
  if(!card) return;
  document.getElementById("roleStep") && (document.getElementById("roleStep").style.display = "none");
  document.getElementById("passcodeStep") && (document.getElementById("passcodeStep").style.display = "none");
  document.getElementById("changePinStep").style.display = "block";

  document.getElementById("savePinBtn").onclick = async () => {
    const current = document.getElementById("currentPin").value.trim();
    const newP = document.getElementById("newPin").value.trim();
    const confirm = document.getElementById("confirmPin").value.trim();
    const errEl = document.getElementById("changePinError");

    const showErr = msg => { errEl.textContent = msg; errEl.classList.add("visible"); };
    errEl.classList.remove("visible");

    if(!current) return showErr("Please enter your current code.");
    if(!newP || newP.length < 4) return showErr("New code must be at least 4 characters.");
    if(newP !== confirm) return showErr("New codes do not match.");

    const btn = document.getElementById("savePinBtn");
    const restore = setBusy(btn, "Saving…");

    const valid = await verifyPasscode(state.roleKey, current);
    if(!valid){ restore(); return showErr("Current code is incorrect."); }

    await savePasscode(state.roleKey, newP);
    restore();
    toast("Your code has been updated.");
    render();
  };

  document.getElementById("cancelChangePin").onclick = () => render();
}

// ── LOGOUT ────────────────────────────────────────
function logout(){
  state.authenticated = false;
  state.role = null;
  state.roleKey = "";
  localStorage.removeItem("scarletRole");
  localStorage.removeItem("scarletRoleKey");
  renderLogin();
}

// ── ENSURE DEFAULTS ───────────────────────────────
async function safeEnsureDefaults(){
  try{ await ensureDefaults(); }
  catch(err){ console.warn("Starter setup skipped:", err); }
}

async function ensureDefaults(){
  const settingsRef = doc(db,"families",FAMILY_ID,"children",CHILD_ID,"settings","current");
  const snap = await getDoc(settingsRef);
  if(!snap.exists()) await setDoc(settingsRef, { ...DEFAULT_SETTINGS, updatedAt: serverTimestamp() });

  const foodCheck = await getDocs(query(collection(db,"families",FAMILY_ID,"foodLibrary"), limit(1)));
  if(foodCheck.empty){
    for(const food of STARTER_FOODS){
      const foodId = food.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
      await setDoc(doc(db,"families",FAMILY_ID,"foodLibrary",foodId), {
        ...food, familyId:FAMILY_ID, verified: food.source === "Family starter",
        favorite: !!food.favorite, active:true, updatedAt: serverTimestamp()
      }, { merge:true });
    }
  }

  const badgeCheck = await getDocs(query(collection(db,"families",FAMILY_ID,"badges"), limit(1)));
  if(badgeCheck.empty){
    for(const badge of BADGES) await setDoc(doc(db,"families",FAMILY_ID,"badges",badge.id), badge, { merge:true });
  }
}

// ── LOAD DATA ─────────────────────────────────────
async function loadData(){
  try{
    const settingsSnap = await getDoc(doc(db,"families",FAMILY_ID,"children",CHILD_ID,"settings","current"));
    if(settingsSnap.exists()) state.settings = { ...DEFAULT_SETTINGS, ...settingsSnap.data() };
    try{
      const localFoods = await fetch("./foods.json").then(r => r.ok ? r.json() : []);
      if(Array.isArray(localFoods) && localFoods.length) state.foods = localFoods.map(f => ({ active:true, verified:true, ...f }));
    }catch(e){ state.foods = STARTER_FOODS; }
    try{
      const foodsSnap = await getDocs(query(collection(db,"families",FAMILY_ID,"foodLibrary"), where("active","==",true), limit(120)));
      if(!foodsSnap.empty){
        const firestoreFoods = foodsSnap.docs.map(d => ({ id:d.id, ...d.data() }));
        const map = new Map(state.foods.map(f => [f.id || f.name, f]));
        firestoreFoods.forEach(f => map.set(f.id || f.name, f));
        state.foods = Array.from(map.values());
      }
    }catch(e){ console.warn("Firestore foods unavailable.", e); }
    try{
      const unlockSnap = await getDocs(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"badgeUnlocks"));
      state.unlockedBadges = new Set(unlockSnap.docs.map(d => d.id));
    }catch(e){ state.unlockedBadges = new Set(); }
  }catch(err){ console.warn("Data load issue:", err); }
}

// ── LAYOUT ────────────────────────────────────────
function layout(content, active="home"){
  const hour = new Date().getHours();
  document.body.classList.toggle("night-theme", hour >= 19 || hour < 6);
  $app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="logo-lockup">
          <div class="logo-small"><span>SD</span></div>
          <div class="topbar-title">
            <strong>The Scarlet Diaries</strong>
            <p class="small muted">Every drop. Every breath. Unstoppable.</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="build-tag">${BUILD}</span>
          <button class="btn secondary" id="logoutBtn">Exit</button>
        </div>
      </div>
      ${content}
      <nav class="nav">
        <button class="${active==="home"?"active":""}" data-view="home">Home</button>
        <button class="${active==="meal"?"active":""}" data-view="meal">Meal</button>
        <button class="${active==="foods"?"active":""}" data-view="foods">Foods</button>
        <button class="${active==="diary"?"active":""}" data-view="diary">Entry</button>
        <button class="${active==="vault"?"active":""}" data-view="vault">Vault</button>
        <button class="${active==="reports"?"active":""}" data-view="reports">Reports</button>
      </nav>
    </div>
  `;
  bindGlobal();
}

function bindGlobal(){
  document.querySelectorAll("button").forEach(btn => {
    if(btn.dataset.tapBound) return;
    btn.dataset.tapBound = "1";
    btn.addEventListener("pointerdown", () => btn.classList.add("is-pressed"));
    btn.addEventListener("pointerup", () => setTimeout(()=>btn.classList.remove("is-pressed"),120));
    btn.addEventListener("pointerleave", () => btn.classList.remove("is-pressed"));
  });
  document.querySelectorAll("[data-view]").forEach(btn => btn.onclick = () => { state.view = btn.dataset.view; render(); });
  const logoutBtn = document.getElementById("logoutBtn");
  if(logoutBtn) logoutBtn.onclick = () => logout();
}


function renderHome(){
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  layout(`
    <div class="card dark" style="padding:22px 20px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <div class="scarlet-drop" style="width:34px;height:34px;margin-bottom:0;flex-shrink:0"></div>
        <div>
          <p class="small" style="color:var(--ash);letter-spacing:1px;text-transform:uppercase;font-size:10px">${greeting}</p>
          <h2 class="hello-title" style="font-size:24px">Hello, Amara.</h2>
        </div>
      </div>
      <p class="tagline" style="text-align:left;font-size:11px;letter-spacing:2.5px">What do you need now?</p>
      <div class="divider-line" style="margin-top:14px"></div>
      <p class="small" style="color:var(--ash);line-height:1.6;margin-top:10px">Apidra and Lantus are separate. If you are unsure, ask Mom, Dad, or Tita.</p>
    </div>

    <p class="small section-label">Safety</p>
    <div class="grid">
      <button class="action action-meal" data-go="meal" style="grid-column:1/-1;min-height:82px">
        <strong style="font-size:17px">Before I Eat</strong>
        <span>Choose meal · Check sugar · Add food · Adult checks dose</span>
      </button>
      <button class="action action-low" data-go="low">
        <strong>My Sugar Is Low</strong>
        <span>No insulin now. Help your body first.</span>
      </button>
      <button class="action action-high" data-go="high">
        <strong>My Sugar Is High</strong>
        <span>Check active Apidra before any correction.</span>
      </button>
      <button class="action action-lantus" data-go="lantus">
        <strong>My Lantus</strong>
        <span>Long-acting insulin only.</span>
      </button>
      <button class="action" data-go="feel">
        <strong>I Don’t Feel Well</strong>
        <span>Tell the diary what your body feels.</span>
      </button>
    </div>

    <p class="small section-label">Your Diary</p>
    <div class="grid">
      <button class="action action-diary" data-go="diary" style="grid-column:1/-1">
        <strong>Scarlet Entry</strong>
        <span>Write what you want to remember, release, or say.</span>
      </button>
      <button class="action action-diary" data-go="pages">
        <strong>Scarlet Pages</strong>
        <span>Your saved entries.</span>
      </button>
      <button class="action action-vault" data-go="vault">
        <strong>The Scarlet Vault</strong>
        <span>Your courage marks and badges.</span>
      </button>
    </div>

    <p class="small section-label">More</p>
    <div class="grid">
      <button class="action" data-go="foods">
        <strong>Food Library</strong>
        <span>Favorites, portions, and saved foods.</span>
      </button>
      <button class="action" data-go="mood">
        <strong>How I Feel</strong>
        <span>Check in without shame.</span>
      </button>
      <button class="action" data-go="reports">
        <strong>Reports</strong>
        <span>7 and 14-day summaries.</span>
      </button>
      <button class="action" data-go="circle">
        <strong>Call My Circle</strong>
        <span>Mom · Dad · Tita</span>
      </button>
    </div>

    <div class="card" style="padding:14px;background:rgba(122,0,18,0.06)">
      <p class="small" style="color:var(--ash);line-height:1.6">Badges, Scarlet Entry, Scarlet Pages, food library, reports, and safety alerts are preserved in this integrated build.</p>
    </div>
  `, "home");
  document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { unlockAudio(); state.view = b.dataset.go; render(); });
}


function renderMealStart(){
  state.meal = { type:null, glucose:null, items:[], hiddenChecked:false, symptoms:[], ketones:null, lastApidra:"unknown" };
  layout(`
    <div class="card">
      <button class="btn secondary" id="backFromMealStart" style="margin-bottom:12px">← Back Home</button>
      <h2>Before I Eat</h2>
      <p class="muted">First, choose the meal. Then we check sugar, add food, and show the Apidra estimate on its own page.</p>
    </div>
    <div class="grid">
      ${["Breakfast","Lunch","Dinner","Snack"].map(m => `
        <button class="action action-meal" data-meal="${m}"><strong>${m}</strong><span>Start meal safety steps.</span></button>
      `).join("")}
    </div>
  `, "meal");
  document.getElementById("backFromMealStart").onclick = returnToDashboard;
  document.querySelectorAll("[data-meal]").forEach(btn => btn.onclick = () => renderMealGlucose(btn.dataset.meal));
}

function renderMealGlucose(type){
  state.meal.type = type;
  layout(`
    <div class="card">
      <button class="btn secondary" id="backToMealType" style="margin-bottom:12px">← Back to meals</button>
      <h2>${esc(type)}</h2>
      <p class="muted">What is your sugar right now, before eating?</p>
      <div class="field">
        <label>Current sugar mg/dL</label>
        <input id="glucose" type="number" inputmode="numeric" placeholder="Example: 145" />
      </div>
      <button class="btn scarlet full" id="continueMeal">Continue to food</button>
    </div>
  `, "meal");
  document.getElementById("backToMealType").onclick = renderMealStart;
  document.getElementById("continueMeal").onclick = () => {
    const g = Number(document.getElementById("glucose").value);
    if(!g || g < 20 || g > 600) return toast("Please enter a valid glucose number.");
    state.meal.glucose = g;
    if(g < state.settings.lowThreshold) return renderLowSugar(g);
    if(g >= state.settings.highThreshold) return renderKetonePrompt("meal");
    renderFoodBuilder();
  };
}

function renderKetonePrompt(next="meal"){
  const g = state.meal.glucose;
  layout(`
    <div class="card ${g>=state.settings.urgentHighThreshold ? "danger":"warning"}">
      <h2>${g>=state.settings.urgentHighThreshold ? "Very high sugar" : "High sugar"}</h2>
      <p class="muted">High sugar can leave warning signs. Let’s check if we can.</p>
      <div class="divider-line"></div>
      <p><strong>Glucose:</strong> ${g} mg/dL</p>
      <p class="small muted">Please check ketones if strips are available. Tell your Circle now. If there are no strips, log it honestly so adults can help.</p>
    </div>
    <div class="grid single">
      ${["I checked — negative","Trace / small","Moderate / large","No strips","I don’t know how","Adult not available"].map(k => `
        <button class="action" data-ketone="${k}"><strong>${k}</strong><span>Save ketone status.</span></button>
      `).join("")}
    </div>
  `, "meal");
  document.querySelectorAll("[data-ketone]").forEach(btn => btn.onclick = async () => {
    state.meal.ketones = btn.dataset.ketone;
    await addKetoneLog(g, btn.dataset.ketone);
    if(btn.dataset.ketone === "No strips") await unlockBadge("truth-keeper");
    if(btn.dataset.ketone.includes("checked")) { await unlockBadge("ketone-seer"); await unlockBadge("dark-signal-reader"); }
    if(g >= state.settings.urgentHighThreshold) await createAlert("urgent_high", "red", `Amara logged glucose ${g}. Ketone status: ${btn.dataset.ketone}.`);
    else await createAlert("high", "orange", `Amara logged glucose ${g}. Ketone status: ${btn.dataset.ketone}.`);
    if(btn.dataset.ketone === "Moderate / large") return renderEmergency("Moderate or large ketones need adult help now.");
    if(next === "meal") renderFoodBuilder(); else renderHighSugarSafety();
  });
}

function foodConfidence(f){
  if(f.verified || f.source === "Family Verified") return "High confidence";
  if((f.source || "").includes("Open Food Facts") || (f.source || "").includes("Label")) return "High confidence";
  if((f.source || "").includes("Generic")) return "Medium confidence";
  return `${f.confidence || "Low"} confidence`;
}

function renderFoodBuilder(){
  const categories = ["All","Breakfast Favorites","Meal Favorites","Meals","Rice / Bread / Pasta","Snacks & Sweets","Drinks","Fruit","Sauces / Hidden Carbs","Search","Add Food"];
  const foodCarbs = state.meal.items.reduce((s,x)=>s + Number(x.carbs||0),0);
  const hasFood = state.meal.items.length > 0;
  const itemsHtml = state.meal.items.map((it,i)=>`
    <div class="list-item meal-item">
      <div>
        <strong>${esc(it.name)}</strong>
        <span class="small muted">${esc(it.portion)} · ${it.carbs}g carbs</span>
        <div class="confidence">${esc(it.source || "Food list")}</div>
      </div>
      <button class="btn secondary" data-remove="${i}">Remove</button>
    </div>
  `).join("") || `<p class="muted small">No food added yet. Choose food below.</p>`;

  layout(`
    <div class="card dark">
      <h2>Choose Food</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Tap what is on your plate.</p>
    </div>

    <div class="card meal-summary-sticky" id="mealSoFar">
      <h3>Meal so far</h3>
      <div class="list">${itemsHtml}</div>
      <div class="divider-line"></div>
      <div class="kv"><span>Total food carbs</span><strong>${foodCarbs}g</strong></div>
      ${hasFood ? `
        <div class="btn-row" style="margin-top:10px">
          <button class="btn scarlet" id="goHidden">Continue</button>
          <button class="btn secondary" id="skipHidden">No hidden carbs</button>
        </div>
      ` : `<p class="muted small" style="margin-top:10px">Add food first. The hidden-carb check comes after food is added.</p>`}
    </div>

    <div class="card" id="foodGroupsCard">
      <h3>Choose a food group</h3>
      <div class="food-category-grid">
        ${categories.map(c => `<button class="food-chip ${state.foodCategory===c ? "active":""}" data-food-cat="${c}">${c}</button>`).join("")}
      </div>
      <div class="field">
        <label>Search food by name or first letters</label>
        <input id="foodSearch" value="${esc(state.foodSearch || "")}" placeholder="Try r, rice, milk, pita…" />
      </div>
      <div id="foodResults" class="list food-results"></div>
    </div>
  `, "meal");

  document.querySelectorAll("[data-food-cat]").forEach(btn => btn.onclick = () => {
    btn.classList.add("selected-flash");
    state.foodCategory = btn.dataset.foodCat;
    state.foodSearch = "";
    if(state.foodCategory === "Add Food") renderCustomFoodForm("meal");
    else renderFoodBuilder();
  });

  const searchInput = document.getElementById("foodSearch");
  if(searchInput){
    searchInput.oninput = () => {
      state.foodSearch = searchInput.value;
      drawFoodResults();
    };
  }

  function drawFoodResults(){
    const results = document.getElementById("foodResults");
    let foods = state.foods.filter(f => f.active !== false);
    const term = (state.foodSearch || "").toLowerCase().trim();

    if(state.foodCategory === "All"){
      if(term){
        foods = foods.filter(f => `${f.name} ${f.category} ${f.tags || ""}`.toLowerCase().startsWith(term) || `${f.name} ${f.category} ${f.tags || ""}`.toLowerCase().includes(term));
      }
    }else if(state.foodCategory === "Search"){
      if(term){
        foods = foods.filter(f => `${f.name} ${f.category} ${f.tags || ""}`.toLowerCase().startsWith(term) || `${f.name} ${f.category} ${f.tags || ""}`.toLowerCase().includes(term));
      }else{
        foods = foods.filter(f => f.favorite).slice(0,20);
      }
    }else{
      foods = foods.filter(f => f.category === state.foodCategory);
      if(term){
        foods = foods.filter(f => `${f.name} ${f.category} ${f.tags || ""}`.toLowerCase().startsWith(term) || `${f.name} ${f.category} ${f.tags || ""}`.toLowerCase().includes(term));
      }
    }

    foods = foods.sort((a,b)=>Number(!!b.favorite)-Number(!!a.favorite) || String(a.name).localeCompare(String(b.name))).slice(0,40);

    if(!foods.length){
      results.innerHTML = `<p class="muted small">No food found. Try All, Search, or Add Food.</p>`;
      return;
    }

    results.innerHTML = foods.map((f,i)=>`
      <div class="food-card">
        <div>
          <strong>${esc(f.name)}</strong>
          <span class="small muted">${esc(f.usualPortion || f.portion || "serving")} · ${Number(f.usualCarbs ?? f.carbs ?? 0)}g carbs</span>
          <div class="confidence">${esc(f.category || "Food")}</div>
        </div>
        <button class="btn scarlet" data-choose-food="${i}">Choose</button>
      </div>
    `).join("");

    results.querySelectorAll("[data-choose-food]").forEach(btn => btn.onclick = () => {
      const restore = setBusy(btn, "Opening…");
      const food = foods[Number(btn.dataset.chooseFood)];
      setTimeout(() => {
        restore();
        renderPortionChooser(food);
      }, 120);
    });
  }

  drawFoodResults();

  document.querySelectorAll("[data-remove]").forEach(btn => btn.onclick = () => {
    state.meal.items.splice(Number(btn.dataset.remove),1);
    toast("Removed.");
    renderFoodBuilder();
  });

  const goHidden = document.getElementById("goHidden");
  if(goHidden) goHidden.onclick = () => {
    if(!state.meal.items.length) return toast("Add at least one food first.");
    renderHiddenCarbs();
  };
  const skipHidden = document.getElementById("skipHidden");
  if(skipHidden) skipHidden.onclick = () => {
    if(!state.meal.items.length) return toast("Add at least one food first.");
    state.meal.hiddenChecked = true;
    renderMealEstimate();
  };
  scrollToTopSoon();
}

function renderPortionChooser(food){
  const portions = Array.isArray(food.portionOptions) && food.portionOptions.length
    ? food.portionOptions.map(p => ({ label:p.label || p.portion, portion:p.portion || p.label, carbs:Number(p.carbs || 0) }))
    : [
      { label:food.smallPortion || "small serving", portion: food.smallPortion || "small serving", carbs:Number(food.smallCarbs ?? Math.round(Number(food.carbs || 0) * .5)) },
      { label:food.usualPortion || food.portion || "usual serving", portion: food.usualPortion || food.portion || "usual serving", carbs:Number(food.usualCarbs ?? food.carbs ?? 0) },
      { label:food.largePortion || "large serving", portion: food.largePortion || "large serving", carbs:Number(food.largeCarbs ?? Math.round(Number(food.carbs || 0) * 1.5)) }
    ];

  layout(`
    <div class="card dark">
      <button class="btn secondary" id="backToFoodGroups">← Back to Foods</button>
      <h2 style="margin-top:12px">${esc(food.name)}</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Choose the closest measured portion.</p>
    </div>
    <div class="grid single">
      ${portions.map((p,i)=>`
        <button class="action" data-portion="${i}">
          <strong>${esc(p.label)}</strong>
          <span>${esc(p.portion)} · ${p.carbs}g carbs</span>
        </button>
      `).join("")}
      <button class="action" id="customPortionBtn"><strong>Custom carbs</strong><span>Use this if an adult knows the carb count.</span></button>
    </div>
  `, "meal");

  document.getElementById("backToFoodGroups").onclick = () => renderFoodBuilder();
  document.querySelectorAll("[data-portion]").forEach(btn => btn.onclick = () => {
    const restore = setBusy(btn, "Adding…");
    const p = portions[Number(btn.dataset.portion)];
    state.meal.items.push({
      ...food,
      portion: p.portion,
      carbs: p.carbs,
      calories: Math.round(Number(food.calories || 0) * (p.carbs / Math.max(Number(food.carbs || food.usualCarbs || p.carbs || 1),1)))
    });
    setTimeout(() => {
      restore();
      btn.classList.add("added");
      toast("Food added.");
      renderMealAdded(food.name);
    }, 180);
  });

  document.getElementById("customPortionBtn").onclick = () => renderCustomPortion(food);
  scrollToTopSoon();
}

function renderMealAdded(foodName){
  const foodCarbs = state.meal.items.reduce((s,x)=>s + Number(x.carbs||0),0);
  layout(`
    <div class="card success">
      <h2>Added ✓</h2>
      <p class="muted">${esc(foodName)} was added to the meal.</p>
    </div>
    <div class="card" id="mealSoFar">
      <h3>Meal so far</h3>
      <div class="list">
        ${state.meal.items.map((it,i)=>`
          <div class="list-item meal-item">
            <div>
              <strong>${esc(it.name)}</strong>
              <span class="small muted">${esc(it.portion)} · ${it.carbs}g carbs</span>
            </div>
            <button class="btn secondary" data-remove="${i}">Remove</button>
          </div>
        `).join("")}
      </div>
      <div class="divider-line"></div>
      <div class="kv"><span>Total food carbs</span><strong>${foodCarbs}g</strong></div>
    </div>
    <div class="grid single">
      <button class="action" id="addMoreFood"><strong>Add more food</strong><span>Go back to food groups.</span></button>
      <button class="action scarlet" id="continueHidden"><strong>Continue</strong><span>Check sauces, breading, drinks, or hidden carbs.</span></button>
    </div>
  `, "meal");
  document.querySelectorAll("[data-remove]").forEach(btn => btn.onclick = () => {
    state.meal.items.splice(Number(btn.dataset.remove),1);
    toast("Removed.");
    if(state.meal.items.length) renderMealAdded("Food"); else renderFoodBuilder();
  });
  document.getElementById("addMoreFood").onclick = () => renderFoodBuilder();
  document.getElementById("continueHidden").onclick = () => renderHiddenCarbs();
  scrollToTopSoon();
}

function renderCustomPortion(food){
  layout(`
    <div class="card">
      <button class="btn secondary" id="backToPortions">← Back to portions</button>
      <h2 style="margin-top:12px">Custom Carbs</h2>
      <p class="muted">Use this only if an adult or label knows the carb count.</p>
      <div class="field"><label>Portion description</label><input id="customPortionText" placeholder="Example: half plate, 1 pack, 3 pieces" /></div>
      <div class="field"><label>Carbs</label><input id="customPortionCarbs" type="number" inputmode="numeric" placeholder="grams of carbs" /></div>
      <button class="btn scarlet full" id="addCustomPortion">Add to meal</button>
    </div>
  `, "meal");

  document.getElementById("backToPortions").onclick = () => renderPortionChooser(food);
  document.getElementById("addCustomPortion").onclick = () => {
    const btn = document.getElementById("addCustomPortion");
    const restore = setBusy(btn, "Adding…");
    const portion = document.getElementById("customPortionText").value.trim() || "custom portion";
    const carbs = Number(document.getElementById("customPortionCarbs").value);
    if(isNaN(carbs)){ restore(); return toast("Enter carbs."); }
    state.meal.items.push({ ...food, portion, carbs });
    restore();
    toast("Food added.");
    renderMealAdded(food.name);
  };
  scrollToTopSoon();
}

function renderHiddenCarbs(){
  const options = [
    {name:"Ketchup / sweet sauce", portions:[["1 tsp",2],["1 tbsp",5],["2 tbsp",10],["1/4 cup",20]]},
    {name:"Gravy", portions:[["1 tbsp",2],["1/4 cup",6],["1/2 cup",12]]},
    {name:"Breading", portions:[["thin coating",5],["usual coating",8],["heavy coating",15]]},
    {name:"Honey / syrup", portions:[["1 tsp",6],["1 tbsp",17],["2 tbsp",34]]},
    {name:"Sweet drink", portions:[["1/2 cup",12],["1 cup",25],["1 bottle/can",39]]}
  ];

  layout(`
    <div class="card dark">
      <button class="btn secondary" id="backToMeal">← Back to Meal</button>
      <h2 style="margin-top:12px">Check Hidden Carbs</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Any sauces, breading, or sweet drinks?</p>
    </div>
    <div class="card">
      <p class="muted small">Add only what might be hiding in the meal. If none, continue.</p>
    </div>
    <div class="list">
      ${options.map((o,i)=>`
        <div class="card">
          <h3>${esc(o.name)}</h3>
          <div class="hidden-carb-grid">
            ${o.portions.map((p,j)=>`<button class="btn secondary" data-hidden="${i}" data-portion="${j}">${esc(p[0])}<br><span>+${p[1]}g</span></button>`).join("")}
          </div>
        </div>
      `).join("")}
    </div>
    <div class="grid single">
      <button class="action" id="notSureHidden"><strong>I’m not sure</strong><span>Ask an adult before dosing.</span></button>
      <button class="action scarlet" id="finishHidden"><strong>Continue to suggested Apidra</strong><span>Show the total estimate.</span></button>
    </div>
  `, "meal");

  document.getElementById("backToMeal").onclick = () => renderMealAdded("Meal");
  document.querySelectorAll("[data-hidden]").forEach(btn => btn.onclick = async () => {
    const restore = setBusy(btn, "Adding…");
    const o = options[Number(btn.dataset.hidden)];
    const p = o.portions[Number(btn.dataset.portion)];
    state.meal.items.push({
      name:o.name,
      category:"Sauces / Hidden Carbs",
      portion:p[0],
      carbs:Number(p[1]),
      calories:0,
      source:"Hidden carb estimate"
    });
    state.meal.hiddenChecked = true;
    await unlockBadge("hidden-carb-hunter");
    setTimeout(() => {
      restore();
      btn.classList.add("added");
      btn.innerHTML = `Added ✓<br><span>+${p[1]}g</span>`;
      toast(`Added ${p[1]}g hidden carbs.`);
    }, 150);
  });

  document.getElementById("notSureHidden").onclick = async () => {
    await createAlert("hidden_carbs_unsure","orange","Amara was not sure about hidden carbs before eating.");
    toast("Adult help note saved.");
  };
  document.getElementById("finishHidden").onclick = async () => {
    const restore = setBusy(document.getElementById("finishHidden"), "Calculating…");
    state.meal.hiddenChecked = true;
    await unlockBadge("plate-whisperer");
    restore();
    renderMealEstimate();
  };
  scrollToTopSoon();
}

function roundDose(raw){ const unit = Number(state.settings.doseRounding || 1); return Math.round(raw / unit) * unit; }
function getCorrection(glucose){
  const g = Number(glucose || 0);
  const target = Number(state.settings.targetGlucose || 0);
  const factor = Number(state.settings.correctionFactor || 0);
  if(target > 0 && factor > 0 && g > target){
    return roundDose((g - target) / factor);
  }
  if(g > 250) return Number(state.settings.preMealCorrection250 || 4);
  if(g > 180) return Number(state.settings.preMealCorrection180 || 2);
  return 0;
}

function renderMealEstimate(){
  const carbs = state.meal.items.reduce((s,x)=>s + Number(x.carbs||0),0);
  const carbDose = roundDose(carbs / Number(state.settings.carbRatio || 8));
  const correction = getCorrection(Number(state.meal.glucose));
  const estimated = carbDose + correction;
  layout(`
    <div class="card estimate-hero" id="estimateHero">
      <p class="pill">Adult check required</p>
      <h2>Estimated Apidra</h2>
      <div class="dose-number">${estimated}</div>
      <p class="dose-unit">units</p>
      <p class="muted small">This is an estimate. Show this page to Mom, Dad, or Tita before injecting.</p>
    </div>
    <div class="card">
      <h3>How this was estimated</h3>
      <div class="kv"><span>Meal</span><strong>${esc(state.meal.type || "Meal")}</strong></div>
      <div class="kv"><span>Current sugar</span><strong>${state.meal.glucose} mg/dL</strong></div>
      <div class="kv"><span>Total food carbs</span><strong>${carbs}g</strong></div>
      <div class="kv"><span>ICR — Insulin-to-Carbohydrate Ratio</span><strong>1 unit / ${state.settings.carbRatio}g</strong></div>
      <div class="kv"><span>Food dose</span><strong>${carbDose} units</strong></div>
      <div class="kv"><span>Correction dose</span><strong>+${correction} units</strong></div>
      <div class="kv"><span>Target glucose</span><strong>${state.settings.targetGlucose || "—"} mg/dL</strong></div>
      <p class="small muted" style="margin-top:10px">Calories are for nutrition only. Dose estimate uses parent-set medical settings.</p>
    </div>
    <div class="card">
      <h3>Adult check</h3>
      <p class="muted small">An adult can confirm the estimate, change the dose, or choose no insulin right now.</p>
      <div class="field">
        <label>Final Apidra dose confirmed by adult</label>
        <input id="adultFinalDose" type="number" inputmode="decimal" value="${estimated}" />
      </div>
      <div class="grid single">
        <button class="action scarlet" id="adultConfirmed"><strong>Confirm dose</strong><span>Save meal, log Apidra, then start the 15-minute wait timer.</span></button>
        <button class="action" id="saveNoInsulin"><strong>No insulin right now</strong><span>Save meal only for adult review.</span></button>
        ${CIRCLE.map(name => `<button class="action" data-call="${name}"><strong>I need ${name}</strong><span>Alert the Circle before dosing.</span></button>`).join("")}
        <button class="action" id="backFoodFromEstimate"><strong>Back to food</strong><span>Change or add food.</span></button>
      </div>
    </div>
  `, "meal");
  document.getElementById("adultConfirmed").onclick = async () => {
    const btn = document.getElementById("adultConfirmed");
    const finalDose = Number(document.getElementById("adultFinalDose").value);
    if(!finalDose || finalDose <= 0 || finalDose > 30) return toast("Please enter the adult-confirmed Apidra dose.");
    const restore = setBusy(btn, "Saving and starting timer…");
    try{
      await saveMealLog({ adultConfirmed:true, actualDose:finalDose, autoLogInsulin:true, startTimer:true });
    }finally{
      restore();
    }
  };
  document.querySelectorAll("[data-call]").forEach(b => b.onclick = async () => {
    const restore = setBusy(b, "Sending alert…");
    await createAlert("circle_call","orange",`Amara requested ${b.dataset.call} during meal dosing. Estimated Apidra: ${estimated} units.`);
    await unlockBadge("caller-circle");
    restore();
    toast(`${b.dataset.call} alert saved.`);
  });
  document.getElementById("saveNoInsulin").onclick = () => saveMealLog({ adultConfirmed:false, actualDose:null, noInsulin:true });
  document.getElementById("backFoodFromEstimate").onclick = () => renderFoodBuilder();
  scrollToTopSoon();
}

async function saveMealLog(extra={}){
  const carbs = state.meal.items.reduce((s,x)=>s + Number(x.carbs||0),0);
  const carbDose = roundDose(carbs / Number(state.settings.carbRatio || 8));
  const correctionDose = getCorrection(Number(state.meal.glucose));
  const estimatedDose = carbDose + correctionDose;
  const alertLevel = state.meal.glucose >= state.settings.urgentHighThreshold ? "red" : state.meal.glucose >= state.settings.highThreshold ? "orange" : "green";
  await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"mealLogs"), {
    mealType: state.meal.type,
    glucoseBeforeMeal: Number(state.meal.glucose),
    items: state.meal.items.map(x => ({ name:x.name, portion:x.portion, carbs:Number(x.carbs||0), source:x.source || "" })),
    totalCarbs: carbs,
    carbDose, correctionDose, estimatedDose,
    actualDose: extra.actualDose ?? null,
    adultConfirmed: !!extra.adultConfirmed,
    hiddenCarbsChecked: !!state.meal.hiddenChecked,
    ketones: state.meal.ketones || null,
    alreadyInjected: !!extra.alreadyInjected,
    alertLevel,
    createdAt: serverTimestamp(),
    enteredBy: state.roleKey
  });
  await unlockBadge("scarlet-sentinel");
  await unlockBadge("feast-reader");
  const actualDose = extra.actualDose ?? estimatedDose;
  if(extra.autoLogInsulin && actualDose){
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"insulinLogs"), {
      insulinType:"Apidra",
      dose:Number(actualDose),
      reason:"Meal - adult confirmed",
      linkedMeal:true,
      createdAt:serverTimestamp(),
      enteredBy:state.roleKey
    });
  }
  if(extra.alreadyInjected) await createAlert("already_injected","orange",`Amara logged that she already injected ${estimatedDose} units Apidra.`);
  toast(extra.autoLogInsulin ? "Meal saved. Apidra logged." : "Meal saved.");
  if(extra.autoLogInsulin && extra.startTimer){
    return renderApidraWaitTimer(actualDose);
  }
  renderFlowDone({
    title: extra.autoLogInsulin ? "Meal saved. Apidra logged." : "Meal saved",
    message: extra.autoLogInsulin ? `Adult confirmed. Apidra logged: ${actualDose} unit(s).` : "Meal saved without insulin. Adult should review.",
    next:[
      {view:"diary",title:"Scarlet Entry",sub:"Say how this felt."},
      {view:"pages",title:"Scarlet Pages",sub:"Reread your entries."}
    ]
  });
}


function renderApidraWaitTimer(dose){
  const totalSeconds = 15 * 60;
  let remaining = totalSeconds;
  clearInterval(activeTimerInterval);
  layout(`
    <div class="card estimate-hero">
      <p class="pill">Apidra saved</p>
      <h2>Wait before eating</h2>
      <div class="dose-number timer-number" id="timerText">15:00</div>
      <p class="dose-unit">minutes</p>
      <p class="muted small">Dose logged: ${dose} unit(s) Apidra. Wait 15 minutes, then eat.</p>
    </div>
    <div class="grid single">
      <button class="action scarlet" id="startedEating"><strong>I started eating</strong><span>Save timer completion and return home.</span></button>
      <button class="action danger-action" id="feelLowDuringTimer"><strong>I feel low</strong><span>Go to low sugar help now.</span></button>
      <button class="action" id="needHelpTimer"><strong>I need help</strong><span>Call Mom, Dad, or Tita.</span></button>
    </div>
  `, "meal");

  const update = () => {
    const el = document.getElementById("timerText");
    if(!el) return clearInterval(activeTimerInterval);
    const m = Math.floor(remaining / 60);
    const sec = String(remaining % 60).padStart(2,"0");
    el.textContent = `${m}:${sec}`;
    if(remaining <= 0){
      clearInterval(activeTimerInterval);
      playDiaryChime();
      toast("Time to eat, Amara.");
      el.textContent = "Time";
      addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"timerLogs"), {
        type:"apidra_wait",
        dose:Number(dose),
        status:"finished",
        createdAt:serverTimestamp(),
        enteredBy:state.roleKey
      }).catch(console.warn);
    }
    remaining -= 1;
  };
  update();
  activeTimerInterval = setInterval(update, 1000);

  document.getElementById("startedEating").onclick = async () => {
    clearInterval(activeTimerInterval);
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"timerLogs"), {
      type:"apidra_wait",
      dose:Number(dose),
      status:"started_eating",
      createdAt:serverTimestamp(),
      enteredBy:state.roleKey
    });
    renderFlowDone({ title:"Timer saved", message:"Time to eat was saved.", next:[{view:"reports",title:"Reports",sub:"See logs later."}] });
  };
  document.getElementById("feelLowDuringTimer").onclick = () => {
    clearInterval(activeTimerInterval);
    state.view = "low";
    renderLowSugar();
  };
  document.getElementById("needHelpTimer").onclick = () => { state.view = "circle"; render(); };
}


function renderHighSugar(){
  layout(`
    <div class="card warning">
      <h2>My Sugar Is High</h2>
      <p class="muted">Let’s slow down and be safe.</p>
      <div class="field">
        <label>Current glucose mg/dL</label>
        <input id="highGlucose" type="number" inputmode="numeric" placeholder="Example: 286" />
      </div>
      <button class="btn orange full" id="startHigh">Continue</button>
    </div>
  `, "home");
  document.getElementById("startHigh").onclick = () => {
    const g = Number(document.getElementById("highGlucose").value);
    if(!g || g < 20 || g > 600) return toast("Please enter a valid glucose number.");
    state.highFlow = { glucose:g, ketones:null, symptoms:[], recentApidra:null };
    renderHighKetones();
  };
}

function renderHighKetones(){
  const g = state.highFlow.glucose;
  layout(`
    <div class="card ${g >= state.settings.urgentHighThreshold ? "danger":"warning"}">
      <h2>High Sugar: ${g} mg/dL</h2>
      <p class="muted">Check ketones if strips are available. Tell an adult if unsure.</p>
    </div>
    <div class="grid single">
      ${["Ketones negative","Trace / small","Moderate / large","No strips","I don’t know how"].map(k => `<button class="action" data-ketone-high="${k}"><strong>${k}</strong><span>Save ketone status.</span></button>`).join("")}
    </div>
  `, "home");
  document.querySelectorAll("[data-ketone-high]").forEach(btn => btn.onclick = async () => {
    state.highFlow.ketones = btn.dataset.ketoneHigh;
    await addKetoneLog(g, btn.dataset.ketoneHigh);
    if(btn.dataset.ketoneHigh === "Moderate / large"){
      await createAlert("ketones_moderate_large","red",`Amara logged high glucose ${g} with moderate/large ketones.`);
      return renderEmergency("Moderate or large ketones need adult help now.");
    }
    renderHighSymptoms();
  });
}

function renderHighSymptoms(){
  const symptomList = ["Vomiting","Stomach pain","Very sleepy","Fast/deep breathing","Very thirsty","Confused","None of these"];
  layout(`
    <div class="card warning">
      <h2>Any warning signs?</h2>
      <p class="muted">Tap any that apply.</p>
    </div>
    <div class="grid">
      ${symptomList.map(s => `<button class="action" data-high-symptom="${s}"><strong>${s}</strong><span>Tap to select.</span></button>`).join("")}
    </div>
    <button class="btn orange full" id="continueHighSymptoms">Continue</button>
  `, "home");
  const selected = new Set();
  document.querySelectorAll("[data-high-symptom]").forEach(btn => btn.onclick = () => {
    if(btn.dataset.highSymptom === "None of these"){
      selected.clear();
      selected.add("None of these");
      document.querySelectorAll("[data-high-symptom]").forEach(b => b.classList.remove("scarlet"));
      btn.classList.add("scarlet");
      return;
    }
    selected.delete("None of these");
    btn.classList.toggle("scarlet");
    selected.has(btn.dataset.highSymptom) ? selected.delete(btn.dataset.highSymptom) : selected.add(btn.dataset.highSymptom);
  });
  document.getElementById("continueHighSymptoms").onclick = async () => {
    state.highFlow.symptoms = [...selected];
    const severe = state.highFlow.symptoms.some(s => ["Vomiting","Stomach pain","Very sleepy","Fast/deep breathing","Confused"].includes(s));
    if(severe){
      await createAlert("high_symptoms","red",`Amara logged high glucose ${state.highFlow.glucose} with symptoms: ${state.highFlow.symptoms.join(", ")}.`);
      return renderEmergency("High sugar with these symptoms needs adult help now.");
    }
    renderRecentApidra();
  };
}

function renderRecentApidra(){
  layout(`
    <div class="card warning">
      <h2>Recent Apidra?</h2>
      <p class="muted">Did you take Apidra in the last ${state.settings.insulinStackingHours} hours?</p>
    </div>
    <div class="grid single">
      <button class="action" data-recent="yes"><strong>Yes</strong><span>Possible insulin stacking. No normal correction suggestion.</span></button>
      <button class="action scarlet" data-recent="no"><strong>No</strong><span>Show suggested correction from family plan.</span></button>
      <button class="action" data-recent="unknown"><strong>I don’t know</strong><span>Ask an adult before correction.</span></button>
    </div>
  `, "home");
  document.querySelectorAll("[data-recent]").forEach(btn => btn.onclick = () => {
    state.highFlow.recentApidra = btn.dataset.recent;
    if(btn.dataset.recent === "no") renderHighCorrectionEstimate();
    else renderHighStackingWarning();
  });
}

function renderHighStackingWarning(){
  layout(`
    <div class="card danger">
      <h2>Possible insulin stacking</h2>
      <p class="muted">Do not correct again without an adult or doctor guidance. Drink water. Tell your Circle. Recheck based on the family plan.</p>
    </div>
    <div class="grid single">
      ${CIRCLE.map(n => `<button class="action" data-alert-high="${n}"><strong>Alert ${n}</strong><span>Ask for adult help.</span></button>`).join("")}
      <button class="action scarlet" id="saveHighNoCorrection"><strong>Save high sugar check</strong><span>No correction dose suggested.</span></button>
    </div>
  `, "home");
  document.querySelectorAll("[data-alert-high]").forEach(btn => btn.onclick = async () => {
    const restore = setBusy(btn, "Sending alert…");
    await createAlert("stacking_warning","red",`Amara is high at ${state.highFlow.glucose} and took Apidra recently or is unsure. Alerted ${btn.dataset.alertHigh}.`);
    restore();
    toast(`${btn.dataset.alertHigh} alert saved.`);
  });
  document.getElementById("saveHighNoCorrection").onclick = () => saveHighFlow({ correctionSuggested:null, adultConfirmed:false, correctionLogged:false });
}

function renderHighCorrectionEstimate(){
  const correction = getCorrection(Number(state.highFlow.glucose));
  layout(`
    <div class="card estimate-hero">
      <p class="pill">Suggested only</p>
      <h2>Suggested Correction</h2>
      <div class="dose-number">${correction}</div>
      <p class="dose-unit">units</p>
      <p class="muted small">Confirm with an adult before injecting.</p>
    </div>
    <div class="grid single">
      <button class="action scarlet" id="adultConfirmHigh"><strong>Adult confirmed</strong><span>Save and log correction Apidra.</span></button>
      <button class="action" id="saveHighNoInsulin"><strong>Save without insulin</strong><span>Adult should review.</span></button>
      ${CIRCLE.map(n => `<button class="action" data-alert-high="${n}"><strong>Alert ${n}</strong><span>Ask for adult help.</span></button>`).join("")}
    </div>
  `, "home");
  document.getElementById("adultConfirmHigh").onclick = () => saveHighFlow({ correctionSuggested:correction, adultConfirmed:true, correctionLogged:true });
  document.getElementById("saveHighNoInsulin").onclick = () => saveHighFlow({ correctionSuggested:correction, adultConfirmed:false, correctionLogged:false });
  document.querySelectorAll("[data-alert-high]").forEach(btn => btn.onclick = async () => {
    const restore = setBusy(btn, "Sending alert…");
    await createAlert("high_help","orange",`Amara is high at ${state.highFlow.glucose}. Suggested correction shown: ${correction} units. Alerted ${btn.dataset.alertHigh}.`);
    restore();
    toast(`${btn.dataset.alertHigh} alert saved.`);
  });
}

async function saveHighFlow({ correctionSuggested=null, adultConfirmed=false, correctionLogged=false } = {}){
  const btn = document.querySelector("#adultConfirmHigh, #saveHighNoInsulin, #saveHighNoCorrection");
  const restore = setBusy(btn, "Saving high sugar check…");
  await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"glucoseLogs"), {
    glucose:Number(state.highFlow.glucose),
    context:"high_sugar",
    ketones:state.highFlow.ketones,
    symptoms:state.highFlow.symptoms || [],
    recentApidra:state.highFlow.recentApidra,
    correctionSuggested,
    adultConfirmed,
    correctionLogged,
    alertLevel:Number(state.highFlow.glucose)>=state.settings.urgentHighThreshold ? "red":"orange",
    createdAt:serverTimestamp(),
    enteredBy:state.roleKey
  });
  if(correctionLogged && correctionSuggested){
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"insulinLogs"), {
      insulinType:"Apidra",
      dose:Number(correctionSuggested),
      reason:"High sugar correction - adult confirmed",
      createdAt:serverTimestamp(),
      enteredBy:state.roleKey
    });
  }
  if(Number(state.highFlow.glucose) >= state.settings.urgentHighThreshold){
    await createAlert("urgent_high","red",`Amara logged urgent high glucose ${state.highFlow.glucose}. Ketones: ${state.highFlow.ketones}.`);
  }
  await unlockBadge(Number(state.highFlow.glucose)>=300 ? "slayer-300" : "stormbreaker");
  restore();
  toast(correctionLogged ? "High sugar check saved. Correction logged." : "High sugar check saved.");
  renderFlowDone({
    title: correctionLogged ? "High sugar saved. Correction logged." : "High sugar check saved",
    message: correctionLogged ? `Adult confirmed. Apidra correction logged: ${correctionSuggested} unit(s).` : "No correction insulin was logged. Adult should review.",
    next:[
      {view:"circle",title:"Call My Circle",sub:"Ask an adult to help."},
      {view:"diary",title:"Write a Scarlet Entry",sub:"Say how this felt."}
    ]
  });
}

function renderLowSugar(preset=null){
  layout(`
    <div class="card danger">
      <h2>Low Sugar</h2>
      <p><strong>No insulin now.</strong></p>
      <p class="muted">Enter the low reading and follow the steps.</p>
      <div class="field"><label>Glucose mg/dL</label><input id="lowGlucose" type="number" inputmode="numeric" value="${preset || ""}" placeholder="Example: 65" /></div>
      <button class="btn red full" id="startLowFlow">Continue</button>
    </div>
  `, "home");
  document.getElementById("startLowFlow").onclick = () => {
    const g = Number(document.getElementById("lowGlucose").value);
    if(!g || g < 20 || g > 600) return toast("Please enter a valid glucose number.");
    state.lowFlow = { glucose:g, fastSugar:null, adult:null, recheck:null };
    renderLowFastSugar();
  };
}

function renderLowFastSugar(){
  const g = state.lowFlow?.glucose;
  layout(`
    <div class="card danger">
      <h2>Low Sugar: ${g} mg/dL</h2>
      <p><strong>No insulin now.</strong></p>
      <p class="muted">Take fast sugar based on the family plan. Tell an adult.</p>
    </div>
    <div class="grid single">
      <button class="action scarlet" data-fast="yes"><strong>Yes, I took fast sugar</strong><span>Juice, glucose tablets, candy, or plan-approved fast sugar.</span></button>
      <button class="action" data-fast="not_yet"><strong>Not yet</strong><span>Show fast sugar choices.</span></button>
      <button class="action danger-action" data-fast="weak"><strong>I cannot / I feel too weak</strong><span>Alert my Circle now.</span></button>
    </div>
  `, "home");
  document.querySelectorAll("[data-fast]").forEach(btn => btn.onclick = async () => {
    state.lowFlow.fastSugar = btn.dataset.fast;
    if(btn.dataset.fast === "weak"){
      await createAlert("low_too_weak","red",`Amara is low at ${g} and says she cannot or feels too weak.`);
      return renderLowAdult();
    }
    if(btn.dataset.fast === "not_yet") return renderLowFastSugarChoices();
    renderLowAdult();
  });
}

function renderLowFastSugarChoices(){
  layout(`
    <div class="card danger">
      <h2>Fast Sugar</h2>
      <p class="muted">Choose what you took or will take based on the family plan.</p>
    </div>
    <div class="grid">
      ${["Juice box","Glucose tablets","Regular soda","Candy","Honey","Other fast sugar"].map(x => `<button class="action" data-choice="${x}"><strong>${x}</strong><span>Save this choice.</span></button>`).join("")}
    </div>
  `, "home");
  document.querySelectorAll("[data-choice]").forEach(btn => btn.onclick = () => {
    state.lowFlow.fastSugar = btn.dataset.choice;
    renderLowAdult();
  });
}

function renderLowAdult(){
  layout(`
    <div class="card danger">
      <h2>Tell an Adult</h2>
      <p class="muted">An adult should know about a low sugar reading.</p>
    </div>
    <div class="grid single">
      <button class="action scarlet" data-adult="yes"><strong>Adult knows</strong><span>Continue to recheck step.</span></button>
      ${CIRCLE.map(n => `<button class="action" data-alert-adult="${n}"><strong>Alert ${n}</strong><span>Send alert to adult dashboard.</span></button>`).join("")}
    </div>
  `, "home");
  document.querySelector("[data-adult='yes']").onclick = () => {
    state.lowFlow.adult = "adult knows";
    renderLowRecheck();
  };
  document.querySelectorAll("[data-alert-adult]").forEach(btn => btn.onclick = async () => {
    const restore = setBusy(btn, "Sending alert…");
    await createAlert("low_alert","red",`Amara is low at ${state.lowFlow.glucose}. Fast sugar: ${state.lowFlow.fastSugar || "not recorded"}. Alerted ${btn.dataset.alertAdult}.`);
    restore();
    toast(`${btn.dataset.alertAdult} alert saved.`);
    state.lowFlow.adult = `alerted ${btn.dataset.alertAdult}`;
    renderLowRecheck();
  });
}

function renderLowRecheck(){
  layout(`
    <div class="card danger">
      <h2>Recheck</h2>
      <p class="muted">Recheck after fast sugar based on the family plan. If she feels worse, alert an adult now.</p>
    </div>
    <div class="grid single">
      <button class="action scarlet" id="saveLowNow"><strong>Save low sugar check</strong><span>Save now and recheck later.</span></button>
      <button class="action" id="recheckNow"><strong>I rechecked now</strong><span>Enter the new reading.</span></button>
      <button class="action danger-action" id="feelWorse"><strong>I feel worse</strong><span>Alert the Circle.</span></button>
    </div>
  `, "home");
  document.getElementById("saveLowNow").onclick = () => saveLowFlow(null);
  document.getElementById("recheckNow").onclick = () => renderLowRecheckInput();
  document.getElementById("feelWorse").onclick = async () => {
    await createAlert("low_feels_worse","red",`Amara feels worse after low sugar ${state.lowFlow.glucose}.`);
    saveLowFlow(null);
  };
}

function renderLowRecheckInput(){
  layout(`
    <div class="card">
      <h2>Recheck Reading</h2>
      <div class="field"><label>New glucose mg/dL</label><input id="lowRecheckValue" type="number" inputmode="numeric" placeholder="Example: 82" /></div>
      <button class="btn scarlet full" id="saveRecheck">Save recheck</button>
    </div>
  `, "home");
  document.getElementById("saveRecheck").onclick = () => {
    const r = Number(document.getElementById("lowRecheckValue").value);
    if(!r || r < 20 || r > 600) return toast("Please enter a valid reading.");
    saveLowFlow(r);
  };
}

async function saveLowFlow(recheck){
  const btn = document.querySelector("#saveLowNow, #saveRecheck, #feelWorse");
  const restore = setBusy(btn, "Saving low sugar check…");
  await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"glucoseLogs"), {
    glucose:Number(state.lowFlow.glucose),
    context:"low_sugar",
    fastSugar:state.lowFlow.fastSugar || null,
    adult:state.lowFlow.adult || null,
    recheck:recheck || null,
    alertLevel:"red",
    createdAt:serverTimestamp(),
    enteredBy:state.roleKey
  });
  if(Number(state.lowFlow.glucose) < state.settings.lowThreshold){
    await createAlert("low","red",`Amara logged low glucose ${state.lowFlow.glucose}. Fast sugar: ${state.lowFlow.fastSugar || "not recorded"}. Adult: ${state.lowFlow.adult || "not recorded"}.`);
  }
  await unlockBadge("crimson-comeback");
  restore();
  toast("Low sugar check saved.");
  renderFlowDone({
    title:"Low sugar check saved",
    message: recheck ? `Recheck saved: ${recheck} mg/dL. No insulin was logged.` : "No insulin was logged. Recheck based on the family plan.",
    next:[
      {view:"circle",title:"Call My Circle",sub:"Ask an adult to help."},
      {view:"diary",title:"Write a Scarlet Entry",sub:"Say how this felt."}
    ]
  });
}

function renderLantusLog(){
  const period = getLantusPeriod();
  const isNight = period.startsWith("night");
  const isMorning = period.startsWith("morning");
  const outsideWindow = period.includes("outside");
  const usualDose = isNight ? Number(state.settings.lantusNightDose || 8) : Number(state.settings.lantusMorningDose || 20);
  const label = isNight ? "Tonight’s Lantus" : "Morning Lantus";
  const timeNote = outsideWindow ? "This is outside the saved usual Lantus time. Ask an adult before continuing." : "Check the pen carefully before saving.";
  layout(`
    <div class="card ${outsideWindow ? "warning" : "dark"}">
      <button class="btn secondary" id="backFromLantus" style="margin-bottom:12px">← Back Home</button>
      <h2>My Lantus</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Long-acting insulin only.</p>
      <div class="divider-line"></div>
      <div class="kv"><span>${label}</span><strong>${usualDose} units</strong></div>
      <p class="muted small" style="margin-top:10px">${esc(timeNote)}</p>
    </div>
    <div class="card">
      <h3>Record Lantus</h3>
      <div class="field">
        <label>How many units does the pen show?</label>
        <input id="lantusDose" type="number" inputmode="decimal" placeholder="Example: ${usualDose}" />
      </div>
      <div class="field">
        <label>Adult check</label>
        <select id="lantusAdult">
          <option value="">Choose adult</option>
          <option>Mom</option>
          <option>Dad</option>
          <option>Tita</option>
        </select>
      </div>
      <button class="btn scarlet full" id="checkLantus">Check Lantus dose</button>
    </div>
  `, "home");

  document.getElementById("backFromLantus").onclick = returnToDashboard;
  document.getElementById("checkLantus").onclick = () => {
    const dose = Number(document.getElementById("lantusDose").value);
    const adult = document.getElementById("lantusAdult").value;
    if(!dose || dose <= 0 || dose > 80) return toast("Please enter the Lantus dose.");
    if(!adult) return toast("Please choose which adult checked.");
    renderLantusConfirm({ dose, adult, period, usualDose, outsideWindow });
  };
}

function renderInsulinLog(){
  return renderLantusLog();
}

function renderLantusConfirm({ dose, adult, period, usualDose, outsideWindow }){
  const isNight = period.startsWith("night");
  const looksLikeMorningAtNight = isNight && Math.round(dose) === Math.round(Number(state.settings.lantusMorningDose || 20));
  const overNightGuard = isNight && dose > Number(state.settings.lantusNightDose || 8) + 2;
  const unusual = outsideWindow || Math.abs(dose - usualDose) > 1 || looksLikeMorningAtNight || overNightGuard;
  const hardStop = looksLikeMorningAtNight || overNightGuard;
  const title = hardStop ? "Stop and ask an adult" : unusual ? "Adult check needed" : "Confirm Lantus";
  const message = looksLikeMorningAtNight
    ? `This looks like the morning dose. Tonight’s usual Lantus is ${state.settings.lantusNightDose || 8} units.`
    : unusual
      ? `This is different from the usual ${usualDose} units for this time.`
      : `You are about to save ${dose} units of Lantus.`;

  layout(`
    <div class="card ${hardStop ? "danger" : unusual ? "warning" : "success"}">
      <h2>${esc(title)}</h2>
      <p class="muted">${esc(message)}</p>
      <div class="divider-line"></div>
      <div class="kv"><span>Insulin</span><strong>Lantus</strong></div>
      <div class="kv"><span>Time type</span><strong>${period.startsWith("night") ? "Night" : "Morning"}</strong></div>
      <div class="kv"><span>Usual dose</span><strong>${usualDose} units</strong></div>
      <div class="kv"><span>Entered dose</span><strong>${dose} units</strong></div>
      <div class="kv"><span>Adult</span><strong>${esc(adult)}</strong></div>
    </div>
    ${hardStop ? `
      <div class="card danger">
        <h3>Adult unlock required</h3>
        <p class="muted small">This dose will not be saved unless an adult enters their code.</p>
        <div class="field"><label>Adult code</label><input id="adultUnlockCode" type="password" placeholder="Adult code" /></div>
        <button class="btn red full" id="unlockAndSaveLantus">Adult unlock and save</button>
      </div>
    ` : ""}
    <div class="grid single">
      ${hardStop ? "" : `<button class="action scarlet" id="saveLantusNow"><strong>Yes, save Lantus</strong><span>I checked the pen and the adult checked.</span></button>`}
      ${CIRCLE.map(n => `<button class="action" data-alert-lantus="${n}"><strong>Alert ${n}</strong><span>Ask for adult help.</span></button>`).join("")}
      <button class="action" id="backLantusEdit"><strong>No, go back</strong><span>Change the dose.</span></button>
    </div>
  `, "home");

  const save = async (override=false) => {
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"insulinLogs"), {
      insulinType:"Lantus",
      dose:Number(dose),
      reason: period.startsWith("night") ? "Night long-acting" : "Morning long-acting",
      adultCheckedBy:adult,
      period,
      unusualDose:unusual,
      hardStopOverride:override,
      createdAt:serverTimestamp(),
      enteredBy:state.roleKey
    });
    if(unusual){
      await createAlert("lantus_guardrail", hardStop ? "red" : "orange", `Lantus guardrail: ${dose} units entered for ${period}. Usual dose: ${usualDose}. Adult: ${adult}.`);
    }
    toast("Lantus saved.");
    renderFlowDone({
      title:"Lantus saved",
      message:`Saved ${dose} units of Lantus. ${unusual ? "Adult review alert was saved." : "Dose matched the usual setting."}`,
      next:[{view:"reports",title:"Reports",sub:"See insulin logs."}]
    });
  };

  const saveBtn = document.getElementById("saveLantusNow");
  if(saveBtn) saveBtn.onclick = () => save(false);

  const unlockBtn = document.getElementById("unlockAndSaveLantus");
  if(unlockBtn) unlockBtn.onclick = async () => {
    const code = document.getElementById("adultUnlockCode").value || "";
    const adultKey = String(adult).toLowerCase();
    const ok = await verifyPasscode(adultKey, code);
    if(!ok) return toast("Adult code is not correct.");
    await save(true);
  };

  document.querySelectorAll("[data-alert-lantus]").forEach(btn => btn.onclick = async () => {
    const restore = setBusy(btn, "Sending alert…");
    await createAlert("lantus_help", hardStop ? "red" : "orange", `Amara needs help with Lantus. Entered ${dose} units. Usual ${usualDose}. Alerted ${btn.dataset.alertLantus}.`);
    restore();
    toast(`${btn.dataset.alertLantus} alert saved.`);
  });
  document.getElementById("backLantusEdit").onclick = renderLantusLog;
}

function renderSymptoms(){
  const symptoms = ["Tired","Dizzy","Shaky","Hungry","Thirsty","Headache","Stomach pain","Vomiting","Sleepy","Fast breathing","Sad","Angry","Scared","I don’t know"];
  layout(`
    <div class="card">
      <h2>I Don’t Feel Well</h2>
      <p class="muted">Tell the diary what your body feels.</p>
    </div>
    <div class="grid">
      ${symptoms.map(s => `<button class="action" data-symptom="${s}"><strong>${s}</strong><span>Tap to select.</span></button>`).join("")}
    </div>
    <button class="btn scarlet full" id="saveSymptoms">Save symptoms</button>
  `, "home");
  const selected = new Set();
  document.querySelectorAll("[data-symptom]").forEach(b => b.onclick = () => {
    b.classList.toggle("scarlet");
    selected.has(b.dataset.symptom) ? selected.delete(b.dataset.symptom) : selected.add(b.dataset.symptom);
  });
  document.getElementById("saveSymptoms").onclick = async () => {
    const btn = document.getElementById("saveSymptoms");
    const restore = setBusy(btn, "Saving symptoms…");
    const arr = [...selected];
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"symptomLogs"), { symptoms:arr, createdAt:serverTimestamp(), enteredBy:state.roleKey });
    const severe = arr.some(x => ["Stomach pain","Vomiting","Sleepy","Fast breathing"].includes(x));
    if(severe) { await unlockBadge("dark-signal-reader"); await createAlert("symptoms","red",`Amara logged symptoms: ${arr.join(", ")}.`); }
    restore();
    toast("Symptoms saved.");
    renderFlowDone({
      title:"Symptoms saved",
      message: severe ? "These symptoms need adult attention. Your Circle has been alerted." : "Your symptoms were saved. Next, check glucose or tell your Circle if you still feel unwell.",
      next:[
        {view:"high",title:"Check High Sugar",sub:"Use this if glucose is high."},
        {view:"low",title:"Check Low Sugar",sub:"Use this if glucose is low."},
        {view:"circle",title:"Call My Circle",sub:"Tell Mom, Dad, or Tita."}
      ]
    });
  };
}

function renderDiary(){
  const moods = ["Brave","Tired","Angry","Sad","Okay","Proud","Scared","Confused","Strong","Lonely","Annoyed","Hopeful","Something only I can name"];
  const prompts = [
    "Today my body felt…",
    "One brave thing I did today was…",
    "The hardest part was…",
    "I wish adults understood…",
    "My sugar number did not define me because…",
    "Today I was unstoppable when…",
    "If my body could speak, it would say…",
    "I want to write this my own way…"
  ];
  layout(`
    <div class="card dark">
      <h2>Write a Scarlet Entry</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Give your feelings a place to go.</p>
    </div>
    <div class="card">
      <div class="field"><label>Today I feel…</label><select id="mood">${moods.map(m=>`<option>${m}</option>`).join("")}</select></div><div class="field" id="customMoodWrap" style="display:none"><label>Name the feeling your own way</label><input id="customMood" placeholder="Only if the list does not have the right word" /></div>
      <div class="field"><label>Prompt</label><select id="prompt">${prompts.map(p=>`<option>${p}</option>`).join("")}</select></div>
      <div class="field"><label>Scarlet Entry</label><textarea id="entry" placeholder="Today my body felt…"></textarea></div>
      <div class="field"><label>Privacy</label><select id="privacy"><option value="private">Private to Amara</option><option value="circle">Share with my Circle</option><option value="safety">Safety note</option></select></div>
      <button class="btn scarlet full" id="saveEntry">Save Scarlet Entry</button>
    </div>
  `, "diary");
  document.getElementById("prompt").onchange = e => document.getElementById("entry").placeholder = e.target.value;
  document.getElementById("mood").onchange = e => { document.getElementById("customMoodWrap").style.display = e.target.value === "Something only I can name" ? "flex" : "none"; };
  document.getElementById("saveEntry").onclick = async () => {
    let mood = document.getElementById("mood").value;
    if(mood === "Something only I can name") mood = document.getElementById("customMood").value.trim() || mood;
    const prompt = document.getElementById("prompt").value;
    const entry = document.getElementById("entry").value.trim();
    const privacy = document.getElementById("privacy").value;
    if(!entry) return toast("Write a few words first.");
    const doneBusy = setBusy(document.getElementById("saveEntry"), "Saving entry…");
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"diaryEntries"), { mood, prompt, entry, privacy, createdAt:serverTimestamp(), enteredBy:state.roleKey });
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"moodLogs"), { mood, privacy, createdAt:serverTimestamp(), enteredBy:state.roleKey });
    await unlockBadge("brave-page");
    if(["Sad","Angry","Scared","Lonely"].includes(mood)) { await unlockBadge("girl-who-stayed"); await unlockBadge("soft-monster-tamer"); }
    if(mood === "Sad" || mood === "Lonely") await unlockBadge("moonlit-heart");
    doneBusy();
    toast("Entry saved.");
    renderFlowDone({ title:"Scarlet Entry saved", message:"Your words are now in My Scarlet Pages.", next:[{view:"pages",title:"Read My Scarlet Pages",sub:"Open your diary archive."},{view:"vault",title:"Open The Scarlet Vault",sub:"See your courage badges."}] });
  };
}

const MOTIVATION_NUGGETS = [
  "You can do this one step at a time.",
  "You do not have to do this alone.",
  "Your number is just information.",
  "A high number is not your fault.",
  "A low number means we help your body now.",
  "Small steps count.",
  "Let’s take care of you now.",
  "You are safe to ask for help.",
  "You are not in trouble.",
  "Checking your sugar helps keep you safe.",
  "You are more than your sugar number.",
  "No need to rush. Let’s do this carefully.",
  "You can tell the truth here.",
  "Ask Mom, Dad, or Tita if you feel unsure.",
  "Being safe is the goal.",
  "You are doing a hard thing.",
  "We can fix the next step together.",
  "One check, then one next step.",
  "I’m proud of you for checking in.",
  "You can pause and start again.",
  "Let’s make this moment smaller.",
  "One tiny step is still a step.",
  "You are allowed to need help.",
  "Today does not have to be perfect.",
  "You are learning every day.",
  "You are loved in every number.",
  "We only need the next safe step.",
  "You can be honest here.",
  "You are brave for trying."
];

const FEELING_SUPPORT = {
  Good: {
    messages: ["I’m glad you feel good.", "Good is a nice signal.", "I like that you feel good right now."],
    actions: ["Go to dashboard.", "Before I Eat.", "Check sugar if it is time."]
  },
  Okay: {
    messages: ["Okay is enough.", "Okay counts.", "You do not have to feel amazing to keep going."],
    actions: ["Go to dashboard.", "Choose the next safe step.", "Check sugar if it is time."]
  },
  Tired: {
    messages: ["Tired is not bad. It means your body needs care.", "It’s okay to feel tired.", "Tired is a signal. Let’s check what you need."],
    actions: ["Check your sugar.", "Drink some water.", "Ask someone to stay with you.", "Hold your pillow or blanket.", "Choose the easiest next step.", "Tell someone: “I feel tired.”"]
  },
  Scared: {
    messages: ["Scared is not bad. It means your body wants support.", "It’s okay to feel scared. We can make the moment smaller.", "A scared feeling is a signal, not a problem."],
    actions: ["Name 3 things you can see.", "Hold your favorite thing.", "Put both feet on the floor.", "Look for 3 red things near you.", "Say: “I need help.”", "Stay close to a trusted adult.", "Write the scary thought in Scarlet Entry."]
  },
  Sad: {
    messages: ["Sad is not bad. It means something feels heavy.", "It’s okay to feel sad. You are not doing anything wrong.", "A sad feeling is a signal, not a problem.", "You don’t have to get rid of the sadness right away."],
    actions: ["Hug your pillow.", "Drink some water.", "Sit next to someone you trust.", "Write one line in Scarlet Entry.", "Wrap yourself in a blanket.", "Hold your favorite thing.", "Draw how the feeling looks.", "Say: “I feel sad and I need company.”", "Listen to one comforting song."]
  },
  Angry: {
    messages: ["Angry is not bad. It means something feels too much, unfair, or frustrating.", "It’s okay to feel angry. We can help it move safely.", "Angry feelings are signals too.", "Angry does not mean you are bad."],
    actions: ["Hold your pillow tight.", "Scribble hard on paper.", "Count 10 things in the room.", "Stamp your feet 10 times.", "Write the angry words in Scarlet Entry.", "Tear scrap paper.", "Draw the feeling as a shape or color.", "Stay near someone you trust.", "Say: “I’m angry and I need help.”"]
  },
  "I don’t know": {
    messages: ["That’s okay. Sometimes feelings are mixed.", "Not knowing is allowed.", "You do not have to name it perfectly.", "Sometimes the feeling is blurry. We can still help you."],
    actions: ["Check your sugar.", "Pick the closest feeling.", "Write “I don’t know yet” in Scarlet Entry.", "Choose one body clue: weird / heavy / annoyed / tired.", "Ask for help.", "Pick one small thing to do next."]
  }
};

function pickRandomFromPool(pool, key, count=1){
  const recentKey = `scarletRecent_${key}`;
  const recent = JSON.parse(sessionStorage.getItem(recentKey) || "[]");
  const available = pool.filter(x => !recent.includes(x));
  const source = available.length >= count ? available : pool.slice();
  const picked = [];
  while(picked.length < count && source.length){
    const idx = Math.floor(Math.random() * source.length);
    picked.push(source.splice(idx,1)[0]);
  }
  sessionStorage.setItem(recentKey, JSON.stringify([...picked, ...recent].slice(0, 6)));
  return count === 1 ? picked[0] : picked;
}

function renderHowIFeel(selectedMood=null){
  if(!selectedMood){
    const nugget = pickRandomFromPool(MOTIVATION_NUGGETS, "motivation", 1);
    layout(`
      <div class="card dark">
        <h2>Hi Amara.</h2>
        <p class="muted" style="margin-top:8px">${esc(nugget)}</p>
      </div>
      <div class="card">
        <h3>How do you feel right now?</h3>
        <p class="muted small" style="margin-top:6px">Feelings are not good or bad. They are messages from your heart and body.</p>
      </div>
      <div class="grid">
        ${["Good","Okay","Tired","Scared","Sad","Angry","I don’t know"].map(m => `
          <button class="action action-feeling" data-mood="${esc(m)}"><strong>${esc(m)}</strong><span>Tell the diary.</span></button>
        `).join("")}
      </div>
    `, "home");
    document.querySelectorAll("[data-mood]").forEach(btn => btn.onclick = () => renderHowIFeel(btn.dataset.mood));
    return;
  }

  const support = FEELING_SUPPORT[selectedMood] || FEELING_SUPPORT["I don’t know"];
  const message = pickRandomFromPool(support.messages, `msg_${selectedMood}`, 1);
  const actions = pickRandomFromPool(support.actions, `act_${selectedMood}`, 3);
  layout(`
    <div class="card dark">
      <h2>${esc(selectedMood)}</h2>
      <p class="muted" style="margin-top:8px">${esc(message)}</p>
    </div>
    <div class="card">
      <h3>Feelings are not good or bad.</h3>
      <p class="muted">They are messages from your heart and body. Let’s listen, then choose one safe next step.</p>
    </div>
    <div class="card">
      <h3>Choose one for right now:</h3>
      <div class="grid single" style="margin-top:12px">
        ${actions.map(a => `<button class="action" data-feel-action="${esc(a)}"><strong>${esc(a)}</strong></button>`).join("")}
      </div>
    </div>
    <div class="grid single">
      <button class="action scarlet" id="openEntryFromMood"><strong>Open Scarlet Entry</strong><span>Write what you want to say.</span></button>
      <button class="action" id="helpFromMood"><strong>I need help</strong><span>Go to Mom, Dad, and Tita.</span></button>
      <button class="action" id="moodGoHome"><strong>Go to dashboard</strong><span>Continue to the app.</span></button>
    </div>
  `, "home");

  const finishMood = async (nextView="home", action="") => {
    state.moodCheckedThisSession = true;
    sessionStorage.setItem("scarletLastMoodAt", String(Date.now()));
    try{
      await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"moodLogs"), {
        mood:selectedMood,
        supportMessage:message,
        chosenAction:action || null,
        createdAt:serverTimestamp(),
        enteredBy:state.roleKey
      });
      if(["Sad","Angry","Scared"].includes(selectedMood)) await unlockBadge("girl-who-stayed");
    }catch(err){ console.warn("Mood log skipped:", err); }
    state.view = nextView;
    render();
  };

  document.querySelectorAll("[data-feel-action]").forEach(btn => btn.onclick = () => finishMood("home", btn.dataset.feelAction));
  document.getElementById("openEntryFromMood").onclick = () => finishMood("diary", "Open Scarlet Entry");
  document.getElementById("helpFromMood").onclick = () => finishMood("circle", "I need help");
  document.getElementById("moodGoHome").onclick = () => finishMood("home", "Go to dashboard");
}

function renderMoodMirror(){
  return renderHowIFeel();
}

function renderVault(){
  const grouped = BADGES.reduce((acc,b)=>{ (acc[b.section] ||= []).push(b); return acc; }, {});
  layout(`
    <div class="card dark">
      <h2>The Scarlet Vault</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Proof that you kept going.</p>
      <p class="small muted" style="margin-top:10px">These are not prizes for perfect numbers. These are marks of courage — for checking, telling the truth, asking for help, and staying.</p>
    </div>
    <div class="card">
      <h3>The Wall of Proof</h3>
      <p class="muted small">Amara is still here. Amara is learning. Amara is unstoppable.</p>
      <div class="divider-line"></div>
      <p class="small muted">Unlocked courage marks: <strong>${state.unlockedBadges.size}</strong></p>
      <p class="small muted" style="margin-top:6px">A high is not a failure. A low is not a defeat. Every honest log is a brave page.</p>
    </div>
    ${Object.entries(grouped).map(([section,badges]) => `
      <div class="card">
        <h3>${esc(section)}</h3>
        <div class="badge-grid" style="margin-top:12px">
          ${badges.map(b => {
            const unlocked = state.unlockedBadges.has(b.id);
            return `
              <div class="badge-card ${unlocked ? "" : "locked"}">
                <div class="badge-seal"><span>${unlocked ? "✦" : "◌"}</span></div>
                <h3>${esc(b.name)}</h3>
                <p>${unlocked ? esc(b.desc) : "Still sleeping. Waiting for its moment."}</p>
                <p><strong>${unlocked ? "Unlocked" : "Wakes when:"}</strong> ${esc(b.rule)}</p>
              </div>`;
          }).join("")}
        </div>
      </div>
    `).join("")}
  `, "vault");
}

function renderCircle(){
  layout(`
    <div class="card dark">
      <h2>Call My Circle</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Mom. Dad. Tita.</p>
    </div>
    <div class="grid single">
      ${CIRCLE.map(name => `<button class="action" data-person="${name}"><strong>I need ${name}</strong><span>Save alert request to the dashboard and email system.</span></button>`).join("")}
    </div>
  `, "home");
  document.querySelectorAll("[data-person]").forEach(btn => btn.onclick = async () => {
    const who = btn.dataset.person;
    const restore = setBusy(btn, "Sending alert…");
    await createAlert("circle_call","orange",`Amara asked for ${who}.`);
    await unlockBadge("caller-circle");
    await unlockBadge("signal-flame");
    restore();
    toast("Alert saved.");
    renderFlowDone({
      title:`${who} alert saved`,
      message:"Your Circle has been alerted in the adult dashboard.",
      next:[
        {view:"home",title:"Back Home",sub:"Return to the main screen."},
        {view:"high",title:"Check My Sugar",sub:"Use this if you need to log a reading."},
        {view:"diary",title:"Write a Scarlet Entry",sub:"Say what you need to say."}
      ]
    });
  });
}

function renderEmergency(message){
  layout(`
    <div class="card danger">
      <h2>Adult help needed now</h2>
      <p>${esc(message)}</p>
      <p class="muted" style="margin-top:10px">Tell Mom, Dad, or Tita now. If vomiting, stomach pain, very sleepy, confused, or breathing fast/deep, adults should seek urgent medical help.</p>
      <button class="btn red full" id="alertCircle">Alert My Circle</button>
    </div>
  `, "home");
  document.getElementById("alertCircle").onclick = async () => {
    await createAlert("emergency","critical",message);
    await unlockBadge("caller-circle");
    toast("The Circle has been alerted.");
  };
}

/* ═══════════════════════════════════════════════
   FOOD LIBRARY SCREEN
   ═══════════════════════════════════════════════ */
function renderFoodLibrary(){
  const categories = ["All","Breakfast Favorites","Meal Favorites","Meals","Rice / Bread / Pasta","Snacks & Sweets","Drinks","Fruit","Sauces / Hidden Carbs"];
  layout(`
    <div class="card dark">
      <button class="btn secondary" id="backFromFoods" style="margin-bottom:12px">← Back Home</button>
      <h2>Food Library</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Browse, search, or add family foods.</p>
    </div>

    <div class="card">
      <h3>Choose a food group</h3>
      <div class="food-category-grid" style="margin-top:12px">
        ${categories.map(c => `<button class="food-chip ${state.foodCategory===c?"active":""}" data-cat="${c}">${c}</button>`).join("")}
      </div>
      <div class="field" style="margin-top:10px">
        <label>Search by name</label>
        <input id="libSearch" value="${esc(state.foodSearch || "")}" placeholder="Try: rice, pita, juice, sinigang…" />
      </div>
      <div id="libResults" class="food-results" style="margin-top:10px"></div>
    </div>

    <div class="card">
      <h3>Add a Family Food</h3>
      <p class="muted small" style="margin-top:6px">Add foods Amara eats often. Adults can confirm carb counts.</p>
      <div class="field"><label>Food name</label><input id="newFoodName" placeholder="Example: Mom's adobo" /></div>
      <div class="field"><label>Usual portion</label><input id="newFoodPortion" placeholder="Example: 1 cup" /></div>
      <div class="field"><label>Carbs (grams)</label><input id="newFoodCarbs" type="number" inputmode="numeric" placeholder="Example: 32" /></div>
      <div class="field"><label>Calories (optional)</label><input id="newFoodCals" type="number" inputmode="numeric" placeholder="Example: 180" /></div>
      <div class="field">
        <label>Category</label>
        <select id="newFoodCat">
          ${["Meals","Breakfast Favorites","Meal Favorites","Rice / Bread / Pasta","Snacks & Sweets","Drinks","Fruit","Sauces / Hidden Carbs"].map(c=>`<option>${c}</option>`).join("")}
        </select>
      </div>
      <button class="btn scarlet full" id="addFoodBtn" style="margin-top:6px">Save to Family Library</button>
    </div>
  `, "foods");

  document.getElementById("backFromFoods").onclick = () => { state.view = "home"; render(); };

  document.querySelectorAll("[data-cat]").forEach(btn => btn.onclick = () => {
    state.foodCategory = btn.dataset.cat;
    state.foodSearch = "";
    renderFoodLibrary();
  });

  const searchEl = document.getElementById("libSearch");
  if(searchEl){
    searchEl.oninput = () => { state.foodSearch = searchEl.value; drawLibResults(); };
  }

  function drawLibResults(){
    const results = document.getElementById("libResults");
    if(!results) return;
    let foods = state.foods.filter(f => f.active !== false);
    const term = (state.foodSearch || "").toLowerCase().trim();

    if(state.foodCategory && state.foodCategory !== "All"){
      foods = foods.filter(f => f.category === state.foodCategory);
    }
    if(term){
      foods = foods.filter(f => `${f.name} ${f.category} ${f.tags||""}`.toLowerCase().includes(term));
    }
    foods = foods.sort((a,b) => Number(!!b.verified) - Number(!!a.verified) || String(a.name).localeCompare(String(b.name))).slice(0,50);

    if(!foods.length){
      results.innerHTML = `<p class="muted small">No foods found. Try a different search or add one below.</p>`;
      return;
    }
    results.innerHTML = foods.map(f => `
      <div class="food-card">
        <div>
          <strong>${esc(f.name)}</strong>
          <span class="small muted">${esc(f.usualPortion || f.portion || "serving")} · ${Number(f.usualCarbs ?? f.carbs ?? 0)}g carbs</span>
          <div class="confidence">${esc(f.category || "Food")} · ${f.verified ? "Family verified" : (f.source || "Library")}</div>
        </div>
        <span class="pill">${Number(f.usualCarbs ?? f.carbs ?? 0)}g</span>
      </div>
    `).join("");
  }
  drawLibResults();

  document.getElementById("addFoodBtn").onclick = async () => {
    const btn = document.getElementById("addFoodBtn");
    const name = document.getElementById("newFoodName").value.trim();
    const portion = document.getElementById("newFoodPortion").value.trim();
    const carbs = Number(document.getElementById("newFoodCarbs").value);
    const calories = Number(document.getElementById("newFoodCals").value) || 0;
    const category = document.getElementById("newFoodCat").value;
    if(!name) return toast("Please enter a food name.");
    if(!carbs || carbs <= 0) return toast("Please enter the carb amount.");
    const restore = setBusy(btn, "Saving…");
    try {
      const newFood = { name, usualPortion:portion, usualCarbs:carbs, carbs, portion, calories, category, source:"Family Verified", verified:true, active:true, createdAt:serverTimestamp(), addedBy:state.roleKey };
      await addDoc(collection(db,"families",FAMILY_ID,"foodLibrary"), newFood);
      state.foods.push(newFood);
      toast(`${name} saved to the family library.`);
      document.getElementById("newFoodName").value = "";
      document.getElementById("newFoodPortion").value = "";
      document.getElementById("newFoodCarbs").value = "";
      document.getElementById("newFoodCals").value = "";
      drawLibResults();
    } catch(err) {
      toast("Could not save food. Please try again.");
    } finally {
      restore();
    }
  };
}

/* ═══════════════════════════════════════════════
   REPORTS SCREEN
   ═══════════════════════════════════════════════ */
async function renderReports(){
  layout(`
    <div class="card dark">
      <button class="btn secondary" id="backFromReports" style="margin-bottom:12px">← Back</button>
      <h2>Reports</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Patterns for adults and doctors.</p>
    </div>
    <div class="card" id="reportContent">
      <p class="muted small">Loading reports…</p>
    </div>
  `, state.role === "child" ? "home" : "adult");

  document.getElementById("backFromReports").onclick = () => {
    state.view = state.role === "child" ? "home" : "adult";
    render();
  };

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [glucoseSnap, mealSnap, insulinSnap, moodSnap] = await Promise.all([
      getDocs(query(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"glucoseLogs"), orderBy("createdAt","desc"), limit(100))),
      getDocs(query(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"mealLogs"), orderBy("createdAt","desc"), limit(100))),
      getDocs(query(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"insulinLogs"), orderBy("createdAt","desc"), limit(100))),
      getDocs(query(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"moodLogs"), orderBy("createdAt","desc"), limit(30)))
    ]);

    const glucoseLogs = glucoseSnap.docs.map(d => d.data());
    const mealLogs = mealSnap.docs.map(d => d.data());
    const insulinLogs = insulinSnap.docs.map(d => d.data());
    const moodLogs = moodSnap.docs.map(d => d.data());

    const inDays = (logs, days) => {
      const since = Date.now() - days * 24 * 60 * 60 * 1000;
      return logs.filter(l => l.createdAt?.toDate?.()?.getTime?.() > since || true);
    };

    const g7 = glucoseLogs.slice(0, Math.min(glucoseLogs.length, 30));
    const avgGlucose = g7.length ? Math.round(g7.reduce((s,l) => s + (Number(l.glucose)||0), 0) / g7.length) : null;
    const highs = g7.filter(l => Number(l.glucose) >= (state.settings.highThreshold||250)).length;
    const lows = g7.filter(l => Number(l.glucose) < (state.settings.lowThreshold||70)).length;
    const meals7 = mealLogs.slice(0, 21);
    const avgCarbs = meals7.length ? Math.round(meals7.reduce((s,m) => s + (Number(m.totalCarbs)||0), 0) / meals7.length) : null;
    const insulinCount = insulinLogs.slice(0,21).length;
    const moods7 = moodLogs.slice(0,14);
    const moodCounts = moods7.reduce((acc,m) => { acc[m.mood] = (acc[m.mood]||0)+1; return acc; }, {});
    const topMoods = Object.entries(moodCounts).sort((a,b)=>b[1]-a[1]).slice(0,4);

    const reportEl = document.getElementById("reportContent");
    if(!reportEl) return;
    reportEl.innerHTML = `
      <h3>7-Day Summary</h3>
      <div style="margin-top:12px">
        ${avgGlucose !== null ? `<div class="kv"><span>Average glucose</span><strong>${avgGlucose} mg/dL</strong></div>` : ""}
        <div class="kv"><span>High readings</span><strong>${highs} reading${highs!==1?"s":""}</strong></div>
        <div class="kv"><span>Low readings</span><strong>${lows} reading${lows!==1?"s":""}</strong></div>
        <div class="kv"><span>Meals logged</span><strong>${meals7.length}</strong></div>
        ${avgCarbs !== null ? `<div class="kv"><span>Avg carbs per meal</span><strong>${avgCarbs}g</strong></div>` : ""}
        <div class="kv"><span>Insulin doses logged</span><strong>${insulinCount}</strong></div>
      </div>
      <div class="divider-line" style="margin:14px 0"></div>
      <h3>Mood Pattern</h3>
      <div style="margin-top:12px">
        ${topMoods.length ? topMoods.map(([mood,count]) => `
          <div class="kv"><span>${esc(mood)}</span><strong>${count}×</strong></div>
        `).join("") : `<p class="muted small">No mood entries yet.</p>`}
      </div>
      <div class="divider-line" style="margin:14px 0"></div>
      <h3>Recent Glucose Readings</h3>
      <div class="list" style="margin-top:10px">
        ${g7.slice(0,10).map(l => {
          const g = Number(l.glucose);
          const color = g >= (state.settings.urgentHighThreshold||300) ? "var(--danger2)" : g >= (state.settings.highThreshold||250) ? "var(--warn)" : g < (state.settings.lowThreshold||70) ? "var(--danger2)" : "var(--gold)";
          const ts = l.createdAt?.toDate?.()?.toLocaleString?.() || "—";
          return `<div class="list-item">
            <div>
              <strong style="color:${color}">${g} mg/dL</strong>
              <span class="small muted">${esc(l.context || "glucose check")} · ${ts}</span>
            </div>
            <span class="pill" style="font-size:11px">${g >= (state.settings.highThreshold||250) ? "High" : g < (state.settings.lowThreshold||70) ? "Low" : "OK"}</span>
          </div>`;
        }).join("") || `<p class="muted small">No glucose logs yet.</p>`}
      </div>
      <div class="divider-line" style="margin:14px 0"></div>
      <p class="small muted">PDF export and full 14-day report coming in a future phase.</p>
    `;
  } catch(err) {
    const reportEl = document.getElementById("reportContent");
    if(reportEl) reportEl.innerHTML = `<p class="muted small">Could not load reports. Check your connection and try again.</p><p class="small" style="color:var(--danger2);margin-top:8px">${esc(err.message || "")}</p>`;
  }
}

/* ═══════════════════════════════════════════════
   MY SCARLET PAGES — Diary Archive
   ═══════════════════════════════════════════════ */
async function renderScarletPages(){
  layout(`
    <div class="card dark">
      <button class="btn secondary" id="backFromPages" style="margin-bottom:12px">← Back Home</button>
      <h2>My Scarlet Pages</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Every word you wrote is proof you kept going.</p>
    </div>
    <div id="pagesContent">
      <div class="card"><p class="muted small">Loading your entries…</p></div>
    </div>
  `, "diary");

  document.getElementById("backFromPages").onclick = () => { state.view = "home"; render(); };

  try {
    const snap = await getDocs(query(
      collection(db,"families",FAMILY_ID,"children",CHILD_ID,"diaryEntries"),
      orderBy("createdAt","desc"),
      limit(50)
    ));

    const el = document.getElementById("pagesContent");
    if(!el) return;

    if(snap.empty){
      el.innerHTML = `
        <div class="card" style="text-align:center;padding:28px 20px">
          <p style="font-family:var(--font-serif);font-size:20px;color:var(--scarlet);font-style:italic">The pages are waiting.</p>
          <p class="small muted" style="margin-top:8px;line-height:1.6">When you write a Scarlet Entry, it will live here forever.</p>
          <button class="btn scarlet full" style="margin-top:16px" id="writeFirstEntry">Write Your First Entry</button>
        </div>`;
      const btn = document.getElementById("writeFirstEntry");
      if(btn) btn.onclick = () => { state.view = "diary"; render(); };
      return;
    }

    el.innerHTML = snap.docs.map(d => {
      const entry = d.data();
      const ts = entry.createdAt?.toDate?.()?.toLocaleDateString?.("en-PH", { year:"numeric", month:"long", day:"numeric" }) || "—";
      const isPrivate = entry.privacy === "private";
      const moodColor = ["Sad","Angry","Scared","Lonely"].includes(entry.mood) ? "var(--scarlet)" : ["Brave","Proud","Strong","Hopeful"].includes(entry.mood) ? "var(--gold)" : "var(--dust)";
      return `
        <div class="card" style="border-left:3px solid ${moodColor};margin-bottom:0">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px">
            <div>
              <p class="small" style="color:${moodColor};font-weight:700;letter-spacing:0.5px">${esc(entry.mood || "")}</p>
              <p class="small muted">${ts}</p>
            </div>
            ${isPrivate ? `<span class="pill" style="font-size:10px;opacity:0.7">Private</span>` : `<span class="pill" style="font-size:10px;background:rgba(201,168,76,0.12);color:var(--gold)">Shared</span>`}
          </div>
          ${entry.prompt && entry.prompt !== "I want to write this my own way…" ? `<p class="small" style="color:var(--ash);font-style:italic;margin-bottom:8px">${esc(entry.prompt)}</p>` : ""}
          <p style="line-height:1.7;color:var(--cream);font-family:var(--font-serif);font-size:16px">${esc(entry.entry || "")}</p>
        </div>`;
    }).join("");

  } catch(err) {
    const el = document.getElementById("pagesContent");
    if(el) el.innerHTML = `<div class="card"><p class="muted small">Could not load diary entries. Check your connection.</p></div>`;
  }
}

async function addKetoneLog(glucose, ketoneResult){
  await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"ketoneLogs"), { glucose, ketoneResult, createdAt:serverTimestamp(), enteredBy:state.roleKey, alertLevel: ketoneResult === "Moderate / large" ? "red" : "orange" });
}
async function createAlert(type, severity, message){
  await addDoc(collection(db,"families",FAMILY_ID,"alerts"), {
    childId:CHILD_ID,
    type,
    severity,
    message,
    recipients: state.settings.alertEmails || [],
    acknowledged:false,
    emailStatus:"pending_function_setup",
    createdAt:serverTimestamp(),
    enteredBy: state.roleKey || null
  });
  await unlockBadge("signal-flame");
  if(severity === "red" || severity === "critical") await unlockBadge("three-guardians");
}
async function unlockBadge(id){
  if(state.unlockedBadges.has(id)) return;
  const badge = BADGES.find(b => b.id === id);
  if(!badge) return;
  await setDoc(doc(db,"families",FAMILY_ID,"children",CHILD_ID,"badgeUnlocks",id), { badgeId:id, name:badge.name, desc:badge.desc, createdAt:serverTimestamp() }, { merge:true });
  state.unlockedBadges.add(id);
}
function showBadgeModal(id, onClose){
  const b = BADGES.find(x => x.id === id);
  if(!b){ onClose?.(); return; }
  const div = document.createElement("div");
  div.className = "modal-backdrop";
  div.innerHTML = `
    <div class="modal">
      <p class="pill">Badge Unlocked</p>
      <div class="badge-seal" style="margin-top:16px"><span>✦</span></div>
      <h2>${esc(b.name)}</h2>
      <p class="tagline" style="text-align:left;margin-top:8px">${esc(b.desc)}</p>
      <p class="muted small" style="margin-top:10px">${esc(b.rule)}</p>
      <button class="btn scarlet full" style="margin-top:18px" id="closeBadge">Continue</button>
      <button class="btn secondary full" style="margin-top:10px" id="homeBadge">Back Home</button>
    </div>`;
  document.body.appendChild(div);
  const close = () => { div.remove(); onClose?.(); };
  document.getElementById("closeBadge").onclick = close;
  document.getElementById("homeBadge").onclick = () => { div.remove(); state.view="home"; render(); };
}


async function deleteCollectionClient(colRef, batchSize=200){
  let total = 0;
  while(true){
    const snap = await getDocs(query(colRef, limit(batchSize)));
    if(snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
    if(snap.size < batchSize) break;
  }
  return total;
}

function renderDemoReset(){
  $app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="logo-lockup">
          <div class="logo-small"><span>SD</span></div>
          <div class="topbar-title"><strong>Reset Demo Data</strong><p class="small muted">Adult-only demo cleanup</p></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="build-tag">${BUILD}</span>
          <button class="btn secondary" id="cancelResetTop">Cancel</button>
        </div>
      </div>

      <div class="card danger">
        <h2>Reset Demo Data</h2>
        <p class="muted" style="margin-top:8px">This will erase demo logs and saved activity so you can test the app again from a clean state.</p>
      </div>

      <div class="card">
        <h3>This will erase</h3>
        <div class="list" style="margin-top:10px">
          <div class="list-item"><div><strong>Meal, glucose, insulin, ketone, and symptom logs</strong><span class="small muted">All demo health logs</span></div></div>
          <div class="list-item"><div><strong>Scarlet Entries and mood logs</strong><span class="small muted">Demo diary and mood records</span></div></div>
          <div class="list-item"><div><strong>Badge unlocks and reports</strong><span class="small muted">Demo achievements and saved reports</span></div></div>
          <div class="list-item"><div><strong>Alerts</strong><span class="small muted">Adult dashboard demo alerts</span></div></div>
        </div>
      </div>

      <div class="card success">
        <h3>This will keep</h3>
        <p class="muted small">User accounts, roles, settings, and food library will be kept. This avoids breaking login or setup.</p>
      </div>

      <div class="card">
        <div class="field">
          <label>Type RESET to continue</label>
          <input id="resetConfirm" placeholder="RESET" />
        </div>
        <button class="btn red full" id="confirmResetBtn">Reset Demo Logs</button>
        <button class="btn secondary full" style="margin-top:10px" id="cancelResetBtn">Cancel</button>
      </div>
    </div>
  `;

  document.getElementById("cancelResetTop").onclick = () => renderAdult();
  document.getElementById("cancelResetBtn").onclick = () => renderAdult();
  document.getElementById("confirmResetBtn").onclick = async () => {
    const text = document.getElementById("resetConfirm").value.trim();
    if(text !== "RESET") return toast("Type RESET to confirm.");
    const btn = document.getElementById("confirmResetBtn");
    const restore = setBusy(btn, "Resetting demo data…");

    try{
      const childBase = collection(db,"families",FAMILY_ID,"children",CHILD_ID,"mealLogs");
      const childPath = (name) => collection(db,"families",FAMILY_ID,"children",CHILD_ID,name);

      const counts = {};
      counts.mealLogs = await deleteCollectionClient(childPath("mealLogs"));
      counts.glucoseLogs = await deleteCollectionClient(childPath("glucoseLogs"));
      counts.insulinLogs = await deleteCollectionClient(childPath("insulinLogs"));
      counts.ketoneLogs = await deleteCollectionClient(childPath("ketoneLogs"));
      counts.symptomLogs = await deleteCollectionClient(childPath("symptomLogs"));
      counts.diaryEntries = await deleteCollectionClient(childPath("diaryEntries"));
      counts.moodLogs = await deleteCollectionClient(childPath("moodLogs"));
      counts.badgeUnlocks = await deleteCollectionClient(childPath("badgeUnlocks"));
      counts.reports = await deleteCollectionClient(childPath("reports"));
      counts.alerts = await deleteCollectionClient(collection(db,"families",FAMILY_ID,"alerts"));

      state.unlockedBadges = new Set();

      restore();
      renderDemoResetDone(counts);
    }catch(err){
      console.error(err);
      restore();
      if(String(err.message || "").toLowerCase().includes("permission")){
        toast("Reset blocked by Firestore rules. Publish the V2.1 rules.");
      }else{
        toast("Reset failed. Please try again.");
      }
    }
  };
}

function renderDemoResetDone(counts){
  const total = Object.values(counts || {}).reduce((a,b)=>a+Number(b||0),0);
  $app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="logo-lockup">
          <div class="logo-small"><span>SD</span></div>
          <div class="topbar-title"><strong>Demo Reset Complete</strong><p class="small muted">The Scarlet Diaries</p></div>
        </div>
        <span class="build-tag">${BUILD}</span>
      </div>

      <div class="card success">
        <h2>Demo reset complete</h2>
        <p class="muted" style="margin-top:8px">${total} demo record(s) were cleared.</p>
      </div>

      <div class="card">
        <h3>Cleared records</h3>
        <div class="list" style="margin-top:10px">
          ${Object.entries(counts || {}).map(([k,v]) => `<div class="list-item"><div><strong>${esc(k)}</strong><span class="small muted">${Number(v || 0)} deleted</span></div></div>`).join("")}
        </div>
      </div>

      <div class="grid single">
        <button class="action scarlet" id="backAdultAfterReset"><strong>Back to Adult Dashboard</strong><span>Continue testing from a clean demo state.</span></button>
        <button class="action" id="logoutAfterReset"><strong>Exit</strong><span>Return to login.</span></button>
      </div>
    </div>
  `;
  document.getElementById("backAdultAfterReset").onclick = () => renderAdult();
  document.getElementById("logoutAfterReset").onclick = () => logout();
}

async function saveAdultMedicalSettings(){
  const next = {
    carbRatio:Number(document.getElementById("setCarbRatio").value || state.settings.carbRatio || 8),
    targetGlucose:Number(document.getElementById("setTargetGlucose").value || state.settings.targetGlucose || 120),
    correctionFactor:Number(document.getElementById("setCorrectionFactor").value || state.settings.correctionFactor || 50),
    insulinStackingHours:Number(document.getElementById("setActiveHours").value || state.settings.insulinStackingHours || 3),
    doseRounding:Number(document.getElementById("setDoseRounding").value || state.settings.doseRounding || 1),
    lantusMorningDose:Number(document.getElementById("setLantusMorning").value || state.settings.lantusMorningDose || 20),
    lantusNightDose:Number(document.getElementById("setLantusNight").value || state.settings.lantusNightDose || 8),
    highThreshold:Number(document.getElementById("setHighThreshold").value || state.settings.highThreshold || 250),
    urgentHighThreshold:Number(document.getElementById("setUrgentHigh").value || state.settings.urgentHighThreshold || 300),
    lowThreshold:Number(document.getElementById("setLowThreshold").value || state.settings.lowThreshold || 70),
    updatedAt:serverTimestamp(),
    updatedBy:state.roleKey
  };
  await setDoc(doc(db,"families",FAMILY_ID,"children",CHILD_ID,"settings","current"), next, { merge:true });
  state.settings = { ...state.settings, ...next };
  await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"settingsLogs"), {
    type:"medical_settings_update",
    settings:{...next, updatedAt:null},
    createdAt:serverTimestamp(),
    enteredBy:state.roleKey
  });
  toast("Medical settings saved.");
  renderAdult();
}

function renderAdult(){
  const roleKey = localStorage.getItem("scarletRoleKey") || "adult";
  const roleNames = { mom:"Mom", dad:"Dad", tita:"Tita" };
  const roleName = roleNames[roleKey] || "Circle";
  $app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="logo-lockup">
          <div class="logo-small"><span>SD</span></div>
          <div class="topbar-title">
            <strong>The Circle</strong>
            <p class="small muted">Amara's Guardian Dashboard</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="build-tag">${BUILD}</span>
          <button class="btn secondary" data-action="logout">Exit</button>
        </div>
      </div>

      <div class="card dark" style="padding:22px 20px">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="scarlet-drop" style="width:34px;height:34px;margin-bottom:0;flex-shrink:0"></div>
          <div>
            <p class="small" style="color:var(--ash);letter-spacing:1px;text-transform:uppercase;font-size:10px">Welcome back</p>
            <h2 style="font-family:var(--font-serif);font-size:22px;font-weight:400">${esc(roleName)}</h2>
          </div>
        </div>
        <div class="divider-line" style="margin-top:14px"></div>
        <p class="small" style="color:var(--ash);line-height:1.6;margin-top:10px;font-style:italic">"Celebrate effort, not perfect glucose."</p>
      </div>

      <div class="card">
        <h3>Needs Attention</h3>
        <div id="alertsList" class="list" style="margin-top:10px"><p class="muted small">Loading alerts...</p></div>
      </div>

      <div class="grid" style="margin-top:0">
        <button class="action scarlet" id="openReportsBtn">
          <strong>Open Reports</strong>
          <span>7-day and 14-day summaries</span>
        </button>
        <button class="action plum" id="openVaultAdult">
          <strong>Scarlet Vault</strong>
          <span>Amara's courage marks and badges</span>
        </button>
      </div>

      <div class="card">
        <h3>Medical Settings</h3>
        <p class="muted small" style="margin-top:6px">Only change these if Amara’s doctor or care plan changed.</p>

        <div class="field"><label>ICR — Insulin-to-Carbohydrate Ratio</label><input id="setCarbRatio" type="number" inputmode="decimal" value="${esc(state.settings.carbRatio || 8)}" /><p class="small muted">1 unit Apidra covers this many grams of carbs.</p></div>
        <div class="field"><label>Correction Factor</label><input id="setCorrectionFactor" type="number" inputmode="decimal" value="${esc(state.settings.correctionFactor || 50)}" /><p class="small muted">1 unit Apidra lowers glucose by this many mg/dL.</p></div>
        <div class="field"><label>Target Glucose</label><input id="setTargetGlucose" type="number" inputmode="numeric" value="${esc(state.settings.targetGlucose || 120)}" /></div>
        <div class="field"><label>Rapid Insulin Active Time</label><input id="setActiveHours" type="number" inputmode="decimal" value="${esc(state.settings.insulinStackingHours || 3)}" /><p class="small muted">Apidra may still be active during this window.</p></div>
        <div class="field"><label>Dose Rounding</label><input id="setDoseRounding" type="number" inputmode="decimal" value="${esc(state.settings.doseRounding || 1)}" /></div>

        <div class="divider-line"></div>
        <h3>Lantus / Long-Acting Insulin</h3>
        <div class="field"><label>Morning usual Lantus dose</label><input id="setLantusMorning" type="number" inputmode="decimal" value="${esc(state.settings.lantusMorningDose || 20)}" /></div>
        <div class="field"><label>Night usual Lantus dose</label><input id="setLantusNight" type="number" inputmode="decimal" value="${esc(state.settings.lantusNightDose || 8)}" /></div>

        <div class="divider-line"></div>
        <h3>Safety Thresholds</h3>
        <div class="field"><label>Low threshold</label><input id="setLowThreshold" type="number" inputmode="numeric" value="${esc(state.settings.lowThreshold || 70)}" /></div>
        <div class="field"><label>High threshold</label><input id="setHighThreshold" type="number" inputmode="numeric" value="${esc(state.settings.highThreshold || 250)}" /></div>
        <div class="field"><label>Urgent high threshold</label><input id="setUrgentHigh" type="number" inputmode="numeric" value="${esc(state.settings.urgentHighThreshold || 300)}" /></div>

        <button class="btn scarlet full" id="saveMedicalSettings">Save Medical Settings</button>
      </div>

      <div class="card">
        <h3>Alert Emails</h3>
        <p class="muted small" style="margin-top:6px;line-height:1.6">Alert records are saved in Firebase. Email delivery activates after deploying Firebase Functions.</p>
      </div>

      <div class="card danger">
        <h3>Demo Tools</h3>
        <p class="muted small">Clears all logs, diary, alerts, and badges. Keeps accounts and settings intact.</p>
        <button class="btn red full" style="margin-top:12px" id="resetDemoBtn">Reset Demo Data</button>
      </div>
    </div>`;
  bindGlobal();
  const resetBtn = document.getElementById("resetDemoBtn");
  if(resetBtn) resetBtn.onclick = () => renderDemoReset();
  const openReportsBtn = document.getElementById("openReportsBtn");
  if(openReportsBtn) openReportsBtn.onclick = () => renderReports();
  const openVaultAdult = document.getElementById("openVaultAdult");
  if(openVaultAdult) openVaultAdult.onclick = () => renderVault();
  const saveSettingsBtn = document.getElementById("saveMedicalSettings");
  if(saveSettingsBtn) saveSettingsBtn.onclick = async () => {
    const restore = setBusy(saveSettingsBtn, "Saving settings…");
    try{ await saveAdultMedicalSettings(); } finally{ restore(); }
  };

  const alertsRef = collection(db,"families",FAMILY_ID,"alerts");
  onSnapshot(query(alertsRef, orderBy("createdAt","desc"), limit(20)), snap => {
    const list = document.getElementById("alertsList");
    if(!list) return;
    if(snap.empty){ list.innerHTML = `<p class="muted small">No alerts yet.</p>`; return; }
    list.innerHTML = snap.docs.map(d => {
      const a = d.data();
      const acknowledged = !!a.acknowledged;
      return `<div class="list-item">
        <div>
          <strong>${esc(a.severity || "alert").toUpperCase()}</strong>
          <span class="small muted">${esc(a.message)}</span>
          <div class="confidence">${acknowledged ? "Acknowledged" : "Needs adult check"}</div>
          <div class="confidence">${esc(a.emailStatus || "stored in Firebase")}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
          <span class="pill">${esc(a.type)}</span>
          ${acknowledged ? "" : `<button class="btn secondary" data-ack="${d.id}">I saw this</button>`}
        </div>
      </div>`;
    }).join("");
    list.querySelectorAll("[data-ack]").forEach(btn => btn.onclick = async () => {
      await updateDoc(doc(db,"families",FAMILY_ID,"alerts",btn.dataset.ack), {
        acknowledged:true,
        acknowledgedAt:serverTimestamp(),
        acknowledgedBy:state.roleKey || null
      });
      toast("Alert acknowledged.");
    });
  });
}

// Auth handled by passcode system

// ── SESSION RESTORE ON APP LOAD ──────────────────
(async function init(){
  const savedRole = localStorage.getItem("scarletRoleKey");
  const savedRoleType = localStorage.getItem("scarletRole");
  if(savedRole && savedRoleType){
    // Restore session from localStorage
    state.authenticated = true;
    state.roleKey = savedRole;
    state.role = savedRoleType;
    await safeEnsureDefaults();
    await loadData();
    state.moodCheckedThisSession = false;
    if(!maybeStartChildMoodCheck("open")) render();
  } else {
    renderLogin();
  }
})();

document.addEventListener("visibilitychange", () => {
  if(document.visibilityState === "hidden"){
    lastHiddenAt = Date.now();
  }
  if(document.visibilityState === "visible" && state.authenticated && state.role === "child"){
    const hiddenLongEnough = lastHiddenAt && (Date.now() - lastHiddenAt > 10 * 60 * 1000);
    if(hiddenLongEnough){
      state.moodCheckedThisSession = false;
      maybeStartChildMoodCheck("resume");
    }
  }
});