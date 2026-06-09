import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, setDoc, doc, getDoc, getDocs, query,
  where, orderBy, limit, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const FAMILY_ID = "scarlet-family";
const CHILD_ID = "amara";
const APP_NAME = "The Scarlet Diaries";
const BUILD = "V1.5";
const CIRCLE = ["Mom", "Dad", "Tita"];

const DEFAULT_SETTINGS = {
  childName: "Amara",
  rapidInsulin: "Apidra",
  basalInsulin: "Lantus",
  carbRatio: 8,
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
  { name:"White rice", category:"Filipino", portion:"1 cup cooked", carbs:45, calories:205, source:"Family starter", confidence:"Medium", hidden:false },
  { name:"Pandesal", category:"Filipino", portion:"1 piece", carbs:15, calories:120, source:"Estimate", confidence:"Low", hidden:false },
  { name:"Filipino spaghetti", category:"Filipino", portion:"1 cup", carbs:43, calories:310, source:"Estimate", confidence:"Low", hidden:true },
  { name:"Adobo sauce", category:"Filipino", portion:"2 tbsp", carbs:4, calories:35, source:"Estimate", confidence:"Low", hidden:true },
  { name:"Fried chicken breading", category:"Hidden carbs", portion:"small serving", carbs:8, calories:60, source:"Estimate", confidence:"Low", hidden:true },
  { name:"Sweet sauce / ketchup", category:"Hidden carbs", portion:"1 tbsp", carbs:5, calories:20, source:"Estimate", confidence:"Low", hidden:true },
  { name:"Juice box", category:"Drinks", portion:"1 box", carbs:20, calories:90, source:"Label estimate", confidence:"Medium", hidden:false },
  { name:"Milk", category:"Dairy", portion:"1 cup", carbs:12, calories:150, source:"Generic", confidence:"Medium", hidden:false },
  { name:"Banana", category:"Fruit", portion:"1 medium", carbs:27, calories:105, source:"Generic", confidence:"Medium", hidden:false },
  { name:"Pita bread", category:"Greek", portion:"1 medium", carbs:33, calories:170, source:"Generic", confidence:"Medium", hidden:false },
  { name:"Greek yogurt plain", category:"Greek", portion:"170g", carbs:6, calories:100, source:"Generic", confidence:"Medium", hidden:false },
  { name:"Honey", category:"Greek", portion:"1 tbsp", carbs:17, calories:64, source:"Generic", confidence:"Medium", hidden:true },
  { name:"Spanakopita", category:"Greek", portion:"1 piece", carbs:28, calories:290, source:"Estimate", confidence:"Low", hidden:true },
  { name:"Souvlaki with pita", category:"Greek", portion:"1 serving", carbs:38, calories:420, source:"Estimate", confidence:"Low", hidden:true }
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
  { id:"seven-scarlet-days", section:"The Unstoppable Line", name:"Seven Scarlet Days", desc:"Seven days. Seven proofs that you kept going.", rule:"Use the app for 7 days." }
];

let state = {
  user:null,
  role:null,
  selectedRole:"",
  settings: DEFAULT_SETTINGS,
  foods: STARTER_FOODS,
  unlockedBadges: new Set(),
  view:"home",
  foodTab:"family",
  meal:{ type:null, glucose:null, items:[], hiddenChecked:false, symptoms:[], ketones:null, lastApidra:"unknown" }
};

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

function roleToStoredRole(role){
  return role === "amara" ? "child" : "adult";
}
function roleTitle(role){
  return ({ amara:"🩸 Welcome, Amara", mom:"🌙 Welcome, Mom", dad:"⚡ Welcome, Dad", tita:"🔮 Welcome, Tita" })[role] || "Enter Your Details";
}

function render(){
  if(!state.user) return renderLogin();
  if(state.role === "adult") return renderAdult();
  switch(state.view){
    case "meal": return renderMealStart();
    case "high": return renderHighSugar();
    case "low": return renderLowSugar();
    case "insulin": return renderInsulinLog();
    case "feel": return renderSymptoms();
    case "diary": return renderDiary();
    case "vault": return renderVault();
    case "circle": return renderCircle();
    case "foods": return renderFoodLibrary();
    case "mood": return renderMoodMirror();
    default: return renderHome();
  }
}

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

        <div class="login-card">
          <div id="roleSelection">
            <div class="login-prompt">Who are you?</div>
            <div class="role-buttons">
              <button class="role-btn amara" data-role="amara"><span class="role-icon">🩸</span> I am Amara</button>
              <button class="role-btn circle" data-role="mom"><span class="role-icon">🌙</span> I am Mom</button>
              <button class="role-btn circle" data-role="dad"><span class="role-icon">⚡</span> I am Dad</button>
              <button class="role-btn circle" data-role="tita"><span class="role-icon">🔮</span> I am Tita</button>
            </div>
          </div>

          <div class="auth-form" id="authForm">
            <div class="form-title" id="formTitle">Enter Your Details</div>
            <div class="error-msg" id="errorMsg"></div>
            <input type="email" class="form-input" id="emailInput" placeholder="Email address" autocomplete="email" />
            <input type="password" class="form-input" id="passwordInput" placeholder="Password" autocomplete="current-password" />
            <button class="submit-btn" id="loginBtn"><span>🗝</span> Unlock the Diary</button>
            <button class="back-btn" id="backBtn">← Choose a different role</button>
            <button class="create-small" id="createBtn">Create account</button>
          </div>
        </div>

        <div class="footer">The Scarlet Diaries · Private &amp; Protected</div>
      </div>
    </section>
  `;

  document.querySelectorAll("[data-role]").forEach(btn => btn.onclick = () => {
    state.selectedRole = btn.dataset.role;
    document.getElementById("roleSelection").style.display = "none";
    document.getElementById("authForm").classList.add("visible");
    document.getElementById("formTitle").textContent = roleTitle(state.selectedRole);
    hideError();
  });
  document.getElementById("backBtn").onclick = () => {
    state.selectedRole = "";
    document.getElementById("roleSelection").style.display = "block";
    document.getElementById("authForm").classList.remove("visible");
    hideError();
  };
  document.getElementById("loginBtn").onclick = () => doLogin(false);
  document.getElementById("createBtn").onclick = () => doLogin(true);
  document.getElementById("passwordInput").onkeydown = (e) => {
    if(e.key === "Enter") doLogin(false);
  };
}
function showError(msg){
  const el = document.getElementById("errorMsg");
  if(!el) return toast(msg);
  el.textContent = msg;
  el.classList.add("visible");
}
function hideError(){
  const el = document.getElementById("errorMsg");
  if(el) el.classList.remove("visible");
}

async function doLogin(create=false){
  const email = document.getElementById("emailInput").value.trim();
  const pass = document.getElementById("passwordInput").value;
  const roleKey = state.selectedRole || "amara";
  const role = roleToStoredRole(roleKey);
  if(!email || !pass) return showError("Please enter your email and password.");
  try{
    const cred = create
      ? await createUserWithEmailAndPassword(auth, email, pass)
      : await signInWithEmailAndPassword(auth, email, pass);
    state.role = role;
    localStorage.setItem("scarletRole", role);
    localStorage.setItem("scarletRoleKey", roleKey);
    await setDoc(doc(db,"users",cred.user.uid), {
      email, role, roleKey, familyId:FAMILY_ID, displayName: role === "child" ? "Amara" : roleKey,
      active:true, updatedAt:serverTimestamp()
    }, { merge:true });
    await ensureDefaults();
  }catch(err){
    console.error(err);
    if(err.code === "auth/invalid-email") showError("Please enter a valid email address.");
    else if(err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") showError("Incorrect email or password. Try again.");
    else showError(err.message || "Something went wrong. Please try again.");
  }
}

async function ensureDefaults(){
  const settingsRef = doc(db,"families",FAMILY_ID,"children",CHILD_ID,"settings","current");
  const snap = await getDoc(settingsRef);
  if(!snap.exists()) await setDoc(settingsRef, { ...DEFAULT_SETTINGS, updatedAt: serverTimestamp() });
  for(const food of STARTER_FOODS){
    const foodId = food.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    await setDoc(doc(db,"families",FAMILY_ID,"foodLibrary",foodId), {
      ...food, familyId:FAMILY_ID, verified: food.source === "Family starter", active:true, updatedAt: serverTimestamp()
    }, { merge:true });
  }
  for(const badge of BADGES) await setDoc(doc(db,"families",FAMILY_ID,"badges",badge.id), badge, { merge:true });
}

async function loadData(){
  try{
    const settingsSnap = await getDoc(doc(db,"families",FAMILY_ID,"children",CHILD_ID,"settings","current"));
    if(settingsSnap.exists()) state.settings = { ...DEFAULT_SETTINGS, ...settingsSnap.data() };
    const foodsSnap = await getDocs(query(collection(db,"families",FAMILY_ID,"foodLibrary"), where("active","==",true), limit(120)));
    if(!foodsSnap.empty) state.foods = foodsSnap.docs.map(d => ({ id:d.id, ...d.data() }));
    const unlockSnap = await getDocs(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"badgeUnlocks"));
    state.unlockedBadges = new Set(unlockSnap.docs.map(d => d.id));
  }catch(err){ console.warn("Data load issue:", err); }
}

function layout(content, active="home"){
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
          <button class="btn secondary" data-action="logout">Exit</button>
        </div>
      </div>
      ${content}
      <nav class="nav">
        <button class="${active==="home"?"active":""}" data-view="home">Home</button>
        <button class="${active==="meal"?"active":""}" data-view="meal">Meal</button>
        <button class="${active==="foods"?"active":""}" data-view="foods">Foods</button>
        <button class="${active==="diary"?"active":""}" data-view="diary">Entry</button>
        <button class="${active==="vault"?"active":""}" data-view="vault">Vault</button>
      </nav>
    </div>
  `;
  bindGlobal();
}
function bindGlobal(){
  document.querySelectorAll("[data-view]").forEach(btn => btn.onclick = () => { state.view = btn.dataset.view; render(); });
  const logoutBtn = document.querySelector("[data-action='logout']");
  if(logoutBtn) logoutBtn.onclick = () => signOut(auth);
}

function renderHome(){
  layout(`
    <div class="card dark">
      <p class="pill">Amara’s private safety diary</p>
      <h2 class="hello-title" style="margin-top:12px">Hello, Amara.</h2>
      <p class="tagline" style="text-align:left;margin-top:4px">What does your body need?</p>
    </div>
    <div class="card">
      <h3>Safety first</h3>
      <p class="muted small">This app gives an estimate from the saved family plan. It must never be treated as an order to inject. If unsure, call the Circle.</p>
    </div>
    <div class="grid">
      <button class="action scarlet" data-go="meal"><strong>I’m Eating</strong><span>Check sugar, count carbs, estimate safely.</span></button>
      <button class="action" data-go="high"><strong>My Sugar Is High</strong><span>Slow down, check safety, alert the Circle.</span></button>
      <button class="action" data-go="low"><strong>My Sugar Is Low</strong><span>No insulin now. Protect yourself first.</span></button>
      <button class="action" data-go="insulin"><strong>I Took Insulin</strong><span>Log Apidra or Lantus.</span></button>
      <button class="action" data-go="feel"><strong>I Don’t Feel Well</strong><span>Tell the diary what your body feels.</span></button>
      <button class="action" data-go="foods"><strong>Food & Carb Library</strong><span>Family foods, Filipino, Greek, and database search.</span></button>
      <button class="action plum" data-go="diary"><strong>Write a Scarlet Entry</strong><span>Give your feelings a place to go.</span></button>
      <button class="action plum" data-go="vault"><strong>Open The Scarlet Vault</strong><span>Proof that you kept going.</span></button>
      <button class="action" data-go="mood"><strong>Mood Mirror</strong><span>See feelings without shame.</span></button>
      <button class="action" data-go="circle"><strong>Call My Circle</strong><span>Mom, Dad, Tita.</span></button>
    </div>
  `, "home");
  document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { state.view = b.dataset.go; render(); });
}

function renderMealStart(){
  state.meal = { type:null, glucose:null, items:[], hiddenChecked:false, symptoms:[], ketones:null, lastApidra:"unknown" };
  layout(`
    <div class="card">
      <h2>I’m Eating</h2>
      <p class="muted">First, choose what you’re having.</p>
    </div>
    <div class="grid">
      ${["Morning Meal","Midday Meal","Evening Meal","Small Bite"].map(m => `
        <button class="action" data-meal="${m}"><strong>${m}</strong><span>Start meal safety steps.</span></button>
      `).join("")}
    </div>
  `, "meal");
  document.querySelectorAll("[data-meal]").forEach(btn => btn.onclick = () => renderMealGlucose(btn.dataset.meal));
}

function renderMealGlucose(type){
  state.meal.type = type;
  layout(`
    <div class="card">
      <h2>${esc(type)}</h2>
      <p class="muted">What is your sugar before eating?</p>
      <div class="field">
        <label>Pre-meal glucose mg/dL</label>
        <input id="glucose" type="number" inputmode="numeric" placeholder="Example: 145" />
      </div>
      <button class="btn scarlet full" id="continueMeal">Continue</button>
    </div>
  `, "meal");
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
    if(btn.dataset.ketone.includes("checked")) await unlockBadge("ketone-seer");
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
  const itemsHtml = state.meal.items.map((it,i)=>`
    <div class="list-item">
      <div>
        <strong>${esc(it.name)}</strong>
        <span class="small muted">${esc(it.portion)} · ${it.carbs}g carbs</span>
        <div class="confidence">${esc(foodConfidence(it))}</div>
      </div>
      <button class="btn secondary" data-remove="${i}">Remove</button>
    </div>
  `).join("") || `<p class="muted small">No foods added yet.</p>`;

  const total = state.meal.items.reduce((s,x)=>s + Number(x.carbs||0),0);
  layout(`
    <div class="card">
      <h2>Add Food</h2>
      <p class="muted">Family verified foods appear first. Database search is available for packaged food names.</p>
      <div class="food-source-tabs">
        <button class="tab-btn ${state.foodTab==="family"?"active":""}" data-tab="family">Family/Favorites</button>
        <button class="tab-btn ${state.foodTab==="database"?"active":""}" data-tab="database">Database Search</button>
      </div>
      <div class="field">
        <label>Search food</label>
        <input id="foodSearch" placeholder="rice, pita, juice, cereal…" />
      </div>
      <div id="foodResults" class="list"></div>
      <button class="btn secondary full" id="customFood">Add custom family food</button>
    </div>
    <div class="card">
      <h3>Meal so far</h3>
      <div class="list">${itemsHtml}</div>
      <div class="divider-line"></div>
      <div class="kv"><span>Total carbs</span><strong>${total}g</strong></div>
      <button class="btn scarlet full" id="hiddenCarbs">Check secret carbs</button>
    </div>
  `, "meal");

  document.querySelectorAll("[data-tab]").forEach(btn => btn.onclick = () => { state.foodTab = btn.dataset.tab; renderFoodBuilder(); });
  const input = document.getElementById("foodSearch");
  const results = document.getElementById("foodResults");

  async function draw(){
    const term = input.value.toLowerCase().trim();
    if(state.foodTab === "database" && term.length >= 3){
      results.innerHTML = `<p class="muted small">Searching packaged food database…</p>`;
      const dbFoods = await searchOpenFoodFacts(term);
      if(!dbFoods.length){
        results.innerHTML = `<p class="muted small">No packaged results found. Try a simpler name or add custom family food.</p>`;
        return;
      }
      results.innerHTML = dbFoods.map((f,i)=>foodButtonHtml(f,i)).join("");
      results.querySelectorAll("[data-food]").forEach(btn => btn.onclick = () => { state.meal.items.push(dbFoods[Number(btn.dataset.food)]); renderFoodBuilder(); });
      return;
    }

    const foods = state.foods
      .filter(f => !term || `${f.name} ${f.category}`.toLowerCase().includes(term))
      .sort((a,b) => Number(!!b.verified) - Number(!!a.verified))
      .slice(0,10);
    results.innerHTML = foods.map((f,i)=>foodButtonHtml(f,i)).join("") || `<p class="muted small">No food found. Add custom family food.</p>`;
    results.querySelectorAll("[data-food]").forEach(btn => btn.onclick = () => { state.meal.items.push(foods[Number(btn.dataset.food)]); renderFoodBuilder(); });
  }
  input.oninput = draw; draw();

  document.querySelectorAll("[data-remove]").forEach(btn => btn.onclick = () => { state.meal.items.splice(Number(btn.dataset.remove),1); renderFoodBuilder(); });
  document.getElementById("hiddenCarbs").onclick = renderHiddenCarbs;
  document.getElementById("customFood").onclick = () => renderCustomFoodForm("meal");
}

function foodButtonHtml(f,i){
  return `<button class="action" data-food="${i}">
    <strong>${esc(f.name)}</strong>
    <span>${esc(f.portion || "serving")} · ${Number(f.carbs||0)}g carbs · ${esc(f.calories || 0)} kcal</span>
    <span class="confidence">${esc(foodConfidence(f))}</span>
  </button>`;
}

async function searchOpenFoodFacts(term){
  try{
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=8`;
    const res = await fetch(url);
    if(!res.ok) return [];
    const data = await res.json();
    return (data.products || []).map(p => {
      const n = p.nutriments || {};
      const carbs100 = Number(n.carbohydrates_100g || n.carbohydrates || 0);
      const kcal100 = Number(n["energy-kcal_100g"] || n["energy-kcal"] || 0);
      return {
        name: p.product_name || p.generic_name || "Packaged food",
        category: "Packaged",
        portion: "100g / label estimate",
        carbs: Math.round(carbs100),
        calories: Math.round(kcal100),
        source: "Open Food Facts",
        confidence: "High",
        hidden:false,
        verified:false
      };
    }).filter(f => f.name && f.carbs >= 0);
  }catch(err){
    console.warn("Open Food Facts search failed", err);
    return [];
  }
}

function renderFoodLibrary(){
  layout(`
    <div class="card dark">
      <h2>Food & Carb Library</h2>
      <p class="tagline">Family foods first. Database second.</p>
      <p class="muted small" style="margin-top:8px">Insulin is calculated from total carbs. Calories are shown only for nutrition context.</p>
    </div>
    <div class="card">
      <button class="btn scarlet full" id="addCustomFood">Add custom family food</button>
      <div class="divider-line"></div>
      <div class="list">
        ${state.foods.slice().sort((a,b)=>Number(!!b.verified)-Number(!!a.verified)).slice(0,40).map(f => `
          <div class="list-item">
            <div>
              <strong>${esc(f.name)}</strong>
              <span class="small muted">${esc(f.category)} · ${esc(f.portion)} · ${Number(f.carbs||0)}g carbs</span>
              <div class="confidence">${esc(foodConfidence(f))}</div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `, "foods");
  document.getElementById("addCustomFood").onclick = () => renderCustomFoodForm("library");
}

function renderCustomFoodForm(returnTo="library"){
  layout(`
    <div class="card">
      <h2>Add Family Food</h2>
      <p class="muted">Use this for meals Amara actually eats. These become easier to find next time.</p>
      <div class="field"><label>Food name</label><input id="customName" placeholder="Example: Mom's rice bowl" /></div>
      <div class="field"><label>Category</label><input id="customCategory" placeholder="Filipino, Greek, School snack…" /></div>
      <div class="field"><label>Portion</label><input id="customPortion" placeholder="1 cup, 1 piece, 1 pack…" /></div>
      <div class="field"><label>Total carbs</label><input id="customCarbs" type="number" inputmode="numeric" placeholder="grams" /></div>
      <div class="field"><label>Calories</label><input id="customCalories" type="number" inputmode="numeric" placeholder="optional" /></div>
      <button class="btn scarlet full" id="saveCustomFood">Save as family food</button>
      <button class="btn secondary full" id="cancelCustomFood">Cancel</button>
    </div>
  `, "foods");
  document.getElementById("cancelCustomFood").onclick = () => returnTo === "meal" ? renderFoodBuilder() : renderFoodLibrary();
  document.getElementById("saveCustomFood").onclick = async () => {
    const f = {
      name: document.getElementById("customName").value.trim(),
      category: document.getElementById("customCategory").value.trim() || "Family",
      portion: document.getElementById("customPortion").value.trim() || "1 serving",
      carbs: Number(document.getElementById("customCarbs").value),
      calories: Number(document.getElementById("customCalories").value || 0),
      source: "Family Verified",
      confidence: "High",
      verified:true,
      hidden:false,
      active:true,
      familyId:FAMILY_ID,
      updatedAt: serverTimestamp()
    };
    if(!f.name || isNaN(f.carbs)) return toast("Please enter food name and carbs.");
    const id = f.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") + "-" + Date.now().toString().slice(-5);
    await setDoc(doc(db,"families",FAMILY_ID,"foodLibrary",id), f);
    state.foods.unshift({ id, ...f });
    await unlockBadge("family-food-keeper");
    toast("Family food saved.");
    if(returnTo === "meal"){
      state.meal.items.push(f);
      renderFoodBuilder();
    }else{
      showBadgeModal("family-food-keeper", () => renderFoodLibrary());
    }
  };
}

function renderHiddenCarbs(){
  const secret = ["Sauce","Breading","Gravy","Ketchup","Sweet drink","Milk","Fruit","Dessert","Soup","Corn","Peas","Beans","Restaurant food","Sweet marinade","Flour-thickened sauce","Honey","Yogurt toppings","Juice","Noodles","Rice side","Potatoes","Bread on the side"];
  layout(`
    <div class="card">
      <h2>Any secret carbs hiding here?</h2>
      <p class="muted">Tap anything that might be part of the meal. This helps protect the estimate.</p>
    </div>
    <div class="grid">
      ${secret.map(s=>`<button class="action" data-secret="${s}"><strong>${s}</strong><span>Could add carbs.</span></button>`).join("")}
    </div>
    <button class="btn scarlet full" id="finishHidden">Done checking secret carbs</button>
  `, "meal");
  document.querySelectorAll("[data-secret]").forEach(btn => btn.onclick = () => { btn.classList.toggle("scarlet"); state.meal.hiddenChecked = true; });
  document.getElementById("finishHidden").onclick = async () => { state.meal.hiddenChecked = true; await unlockBadge("hidden-carb-hunter"); renderMealEstimate(); };
}

function roundDose(raw){ const unit = Number(state.settings.doseRounding || 1); return Math.round(raw / unit) * unit; }
function getCorrection(glucose){
  if(glucose > 250) return Number(state.settings.preMealCorrection250 || 4);
  if(glucose > 180) return Number(state.settings.preMealCorrection180 || 2);
  return 0;
}

function renderMealEstimate(){
  const carbs = state.meal.items.reduce((s,x)=>s + Number(x.carbs||0),0);
  const carbDose = roundDose(carbs / Number(state.settings.carbRatio || 8));
  const correction = getCorrection(Number(state.meal.glucose));
  const estimated = carbDose + correction;
  layout(`
    <div class="card dark">
      <p class="pill">Estimated dose, not a command</p>
      <h2 style="margin-top:10px">Estimated Apidra: ${estimated} units</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Show this to your Circle before injecting.</p>
    </div>
    <div class="card">
      <div class="kv"><span>Pre-meal glucose</span><strong>${state.meal.glucose} mg/dL</strong></div>
      <div class="kv"><span>Total carbs</span><strong>${carbs}g</strong></div>
      <div class="kv"><span>Carb ratio</span><strong>1 unit / ${state.settings.carbRatio}g</strong></div>
      <div class="kv"><span>Carb dose rounded</span><strong>${carbDose} units</strong></div>
      <div class="kv"><span>Pre-meal correction</span><strong>+${correction} units</strong></div>
      <div class="kv"><span>Total estimate</span><strong>${estimated} units</strong></div>
      <p class="small muted" style="margin-top:10px">Insulin is calculated from carbs. Calories are for nutrition only.</p>
    </div>
    <div class="grid single">
      <button class="action scarlet" id="adultConfirmed"><strong>Adult confirmed</strong><span>Save meal and insulin estimate.</span></button>
      ${CIRCLE.map(name => `<button class="action" data-call="${name}"><strong>I need ${name}</strong><span>Alert the Circle.</span></button>`).join("")}
      <button class="action" id="alone"><strong>I am alone</strong><span>Send alert and save safety note.</span></button>
      <button class="action" id="injected"><strong>I already injected</strong><span>Log actual insulin and alert adults.</span></button>
    </div>
  `, "meal");
  document.getElementById("adultConfirmed").onclick = () => saveMealLog({ adultConfirmed:true, actualDose:estimated });
  document.querySelectorAll("[data-call]").forEach(b => b.onclick = async () => { await createAlert("circle_call","orange",`Amara requested ${b.dataset.call} during meal dosing. Estimated Apidra: ${estimated} units.`); await unlockBadge("caller-circle"); toast(`${b.dataset.call} alert saved.`); });
  document.getElementById("alone").onclick = async () => { await createAlert("alone","red",`Amara says she is alone during meal dosing. Estimated Apidra: ${estimated} units.`); toast("The Circle has been alerted."); };
  document.getElementById("injected").onclick = () => saveMealLog({ adultConfirmed:false, actualDose:estimated, alreadyInjected:true });
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
    enteredBy: state.user.uid
  });
  await unlockBadge("scarlet-sentinel");
  await unlockBadge("feast-reader");
  if(extra.alreadyInjected) await createAlert("already_injected","orange",`Amara logged that she already injected ${estimatedDose} units Apidra.`);
  showBadgeModal("feast-reader", () => { state.view="home"; render(); });
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
    state.meal.glucose = g;
    if(g >= state.settings.highThreshold) renderKetonePrompt("high");
    else renderHighSugarSafety();
  };
}

function renderHighSugarSafety(){
  const g = state.meal.glucose;
  layout(`
    <div class="card ${g>=state.settings.urgentHighThreshold ? "danger":"warning"}">
      <h2>${g>=state.settings.urgentHighThreshold ? "Very high sugar" : "High sugar"}</h2>
      <p class="muted">Drink water. Tell your Circle. Do not keep injecting again and again.</p>
      <div class="field">
        <label>Did you take Apidra in the last ${state.settings.insulinStackingHours} hours?</label>
        <select id="lastApidra">
          <option value="unknown">I don’t know</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
      <button class="btn orange full" id="saveHigh">Save high sugar check</button>
    </div>
  `, "home");
  document.getElementById("saveHigh").onclick = async () => {
    const last = document.getElementById("lastApidra").value;
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"glucoseLogs"), {
      glucose:g, context:"high_sugar", lastApidra:last, ketones:state.meal.ketones || null,
      alertLevel:g>=state.settings.urgentHighThreshold ? "red":"orange", createdAt:serverTimestamp(), enteredBy:state.user.uid
    });
    if(last === "yes"){
      await unlockBadge("no-stack-oath");
      await createAlert("stacking_risk","red",`Amara logged high glucose ${g} and Apidra within last ${state.settings.insulinStackingHours} hours. Possible stacking risk.`);
    }
    await unlockBadge(g>=300 ? "slayer-300" : "stormbreaker");
    showBadgeModal(g>=300 ? "slayer-300" : "stormbreaker", () => { state.view="home"; render(); });
  };
}

function renderLowSugar(preset=null){
  layout(`
    <div class="card danger">
      <h2>Low Sugar</h2>
      <p><strong>No insulin right now.</strong></p>
      <p class="muted">Tell your Circle. Take fast sugar based on your plan. Recheck. Do not take insulin while low.</p>
      <div class="field"><label>Glucose mg/dL</label><input id="lowGlucose" type="number" inputmode="numeric" value="${preset || ""}" placeholder="Example: 65" /></div>
      <div class="field"><label>What did you do?</label><select id="lowAction"><option>I took fast sugar</option><option>I told an adult</option><option>I rechecked</option><option>I feel worse</option></select></div>
      <button class="btn red full" id="saveLow">Save low sugar check</button>
    </div>
  `, "home");
  document.getElementById("saveLow").onclick = async () => {
    const g = Number(document.getElementById("lowGlucose").value);
    const action = document.getElementById("lowAction").value;
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"glucoseLogs"), { glucose:g, context:"low_sugar", action, alertLevel:"red", createdAt:serverTimestamp(), enteredBy:state.user.uid });
    await createAlert("low","red",`Amara logged low glucose ${g}. Action: ${action}.`);
    await unlockBadge("crimson-comeback");
    showBadgeModal("crimson-comeback", () => { state.view="home"; render(); });
  };
}

function renderInsulinLog(){
  layout(`
    <div class="card">
      <h2>I Took Insulin</h2>
      <p class="muted">Log what happened. Honesty protects you.</p>
      <div class="field"><label>Insulin</label><select id="insulinType"><option>Apidra</option><option>Lantus</option></select></div>
      <div class="field"><label>Dose units</label><input id="dose" type="number" inputmode="decimal" placeholder="Example: 6" /></div>
      <div class="field"><label>Reason</label><select id="reason"><option>Meal</option><option>Correction</option><option>Basal</option><option>I am not sure</option></select></div>
      <button class="btn scarlet full" id="saveInsulin">Save insulin log</button>
    </div>
  `, "home");
  document.getElementById("saveInsulin").onclick = async () => {
    const type = document.getElementById("insulinType").value;
    const dose = Number(document.getElementById("dose").value);
    const reason = document.getElementById("reason").value;
    if(!dose || dose <=0) return toast("Please enter dose.");
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"insulinLogs"), { insulinType:type, dose, reason, createdAt:serverTimestamp(), enteredBy:state.user.uid });
    if(type === "Apidra" && reason === "Correction") await createAlert("correction_logged","orange",`Amara logged correction insulin: ${dose} units Apidra.`);
    toast("Insulin log saved.");
    state.view="home"; render();
  };
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
    const arr = [...selected];
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"symptomLogs"), { symptoms:arr, createdAt:serverTimestamp(), enteredBy:state.user.uid });
    if(arr.some(x => ["Stomach pain","Vomiting","Sleepy","Fast breathing"].includes(x))) await createAlert("symptoms","red",`Amara logged symptoms: ${arr.join(", ")}.`);
    toast("Symptom log saved.");
    state.view="home"; render();
  };
}

function renderDiary(){
  const moods = ["Brave","Tired","Angry","Sad","Okay","Proud","Scared","Confused","Strong","Lonely","Annoyed","Hopeful"];
  const prompts = [
    "Today my body felt…",
    "One brave thing I did today was…",
    "The hardest part was…",
    "I wish adults understood…",
    "My sugar number did not define me because…",
    "Today I was unstoppable when…",
    "If my body could speak, it would say…"
  ];
  layout(`
    <div class="card dark">
      <h2>Write a Scarlet Entry</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Give your feelings a place to go.</p>
    </div>
    <div class="card">
      <div class="field"><label>Today I feel…</label><select id="mood">${moods.map(m=>`<option>${m}</option>`).join("")}</select></div>
      <div class="field"><label>Prompt</label><select id="prompt">${prompts.map(p=>`<option>${p}</option>`).join("")}</select></div>
      <div class="field"><label>Scarlet Entry</label><textarea id="entry" placeholder="Today my body felt…"></textarea></div>
      <div class="field"><label>Privacy</label><select id="privacy"><option value="private">Private to Amara</option><option value="circle">Share with my Circle</option><option value="safety">Safety note</option></select></div>
      <button class="btn scarlet full" id="saveEntry">Save Scarlet Entry</button>
    </div>
  `, "diary");
  document.getElementById("prompt").onchange = e => document.getElementById("entry").placeholder = e.target.value;
  document.getElementById("saveEntry").onclick = async () => {
    const mood = document.getElementById("mood").value;
    const prompt = document.getElementById("prompt").value;
    const entry = document.getElementById("entry").value.trim();
    const privacy = document.getElementById("privacy").value;
    if(!entry) return toast("Write a few words first.");
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"diaryEntries"), { mood, prompt, entry, privacy, createdAt:serverTimestamp(), enteredBy:state.user.uid });
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"moodLogs"), { mood, privacy, createdAt:serverTimestamp(), enteredBy:state.user.uid });
    await unlockBadge("brave-page");
    if(["Sad","Angry","Scared","Lonely"].includes(mood)) await unlockBadge("girl-who-stayed");
    showBadgeModal(["Sad","Angry","Scared","Lonely"].includes(mood) ? "girl-who-stayed" : "brave-page", () => { state.view="vault"; render(); });
  };
}

function renderMoodMirror(){
  layout(`
    <div class="card dark">
      <h2>Mood Mirror</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Your feelings are signals too.</p>
    </div>
    <div class="card">
      <p class="muted">This is not a score. This is a place to notice what your heart has been carrying.</p>
      <div class="divider-line"></div>
      <p><strong>You are more than your numbers.</strong></p>
      <p class="muted small" style="margin-top:8px">If today is hard, write a Scarlet Entry or call your Circle.</p>
      <div class="btn-row" style="margin-top:14px">
        <button class="btn scarlet" id="writeMood">Write a Scarlet Entry</button>
        <button class="btn secondary" id="callCircle">Call My Circle</button>
      </div>
    </div>
  `, "diary");
  document.getElementById("writeMood").onclick = () => { state.view="diary"; render(); };
  document.getElementById("callCircle").onclick = () => { state.view="circle"; render(); };
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
    await createAlert("circle_call","orange",`Amara asked for ${btn.dataset.person}.`);
    await unlockBadge("caller-circle");
    showBadgeModal("caller-circle", () => { state.view="home"; render(); });
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

async function addKetoneLog(glucose, ketoneResult){
  await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"ketoneLogs"), { glucose, ketoneResult, createdAt:serverTimestamp(), enteredBy:state.user.uid, alertLevel: ketoneResult === "Moderate / large" ? "red" : "orange" });
}
async function createAlert(type, severity, message){
  await addDoc(collection(db,"families",FAMILY_ID,"alerts"), { childId:CHILD_ID, type, severity, message, recipients: state.settings.alertEmails || [], acknowledged:false, createdAt:serverTimestamp(), enteredBy: state.user?.uid || null });
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
      <button class="btn scarlet full" style="margin-top:18px" id="closeBadge">Keep going</button>
    </div>`;
  document.body.appendChild(div);
  document.getElementById("closeBadge").onclick = () => { div.remove(); onClose?.(); };
}

function renderAdult(){
  $app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="logo-lockup">
          <div class="logo-small"><span>SD</span></div>
          <div class="topbar-title"><strong>Parent Dashboard</strong><p class="small muted">Mom · Dad · Tita</p></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="build-tag">${BUILD}</span>
          <button class="btn secondary" data-action="logout">Exit</button>
        </div>
      </div>
      <div class="card dark">
        <h2>Amara’s Circle</h2>
        <p class="tagline" style="text-align:left;margin-top:6px">Celebrate effort, not perfect glucose.</p>
      </div>
      <div class="card">
        <h3>Needs Attention</h3>
        <div id="alertsList" class="list"><p class="muted small">Loading alerts…</p></div>
      </div>
      <div class="card">
        <h3>Settings</h3>
        <div class="kv"><span>Carb ratio</span><strong>1 unit / ${state.settings.carbRatio}g</strong></div>
        <div class="kv"><span>Dose rounding</span><strong>Nearest ${state.settings.doseRounding} unit</strong></div>
        <div class="kv"><span>High alert</span><strong>${state.settings.highThreshold}+</strong></div>
        <div class="kv"><span>Urgent high</span><strong>${state.settings.urgentHighThreshold}+</strong></div>
        <p class="small muted" style="margin-top:10px">Settings are locked. Alert records are stored in Firebase; actual email delivery will be connected in the notification phase.</p>
      </div>
    </div>`;
  bindGlobal();
  const alertsRef = collection(db,"families",FAMILY_ID,"alerts");
  onSnapshot(query(alertsRef, orderBy("createdAt","desc"), limit(20)), snap => {
    const list = document.getElementById("alertsList");
    if(!list) return;
    if(snap.empty){ list.innerHTML = `<p class="muted small">No alerts yet.</p>`; return; }
    list.innerHTML = snap.docs.map(d => {
      const a = d.data();
      return `<div class="list-item">
        <div><strong>${esc(a.severity || "alert").toUpperCase()}</strong><span class="small muted">${esc(a.message)}</span></div>
        <span class="pill">${esc(a.type)}</span>
      </div>`;
    }).join("");
  });
}

onAuthStateChanged(auth, async user => {
  state.user = user;
  if(user){
    state.role = localStorage.getItem("scarletRole") || "child";
    await loadData();
  }
  render();
});
