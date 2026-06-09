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
  { name:"Fried chicken breading", category:"Hidden carbs", portion:"small serving", carbs:8, calories:60, source:"Estimate", confidence:"Low", hidden:true },
  { name:"Sweet sauce / ketchup", category:"Hidden carbs", portion:"1 tbsp", carbs:5, calories:20, source:"Estimate", confidence:"Low", hidden:true },
  { name:"Juice box", category:"Drinks", portion:"1 box", carbs:20, calories:90, source:"Label estimate", confidence:"Medium", hidden:false },
  { name:"Milk", category:"Dairy", portion:"1 cup", carbs:12, calories:150, source:"Generic", confidence:"Medium", hidden:false },
  { name:"Banana", category:"Fruit", portion:"1 medium", carbs:27, calories:105, source:"Generic", confidence:"Medium", hidden:false },
  { name:"Pita bread", category:"Greek", portion:"1 medium", carbs:33, calories:170, source:"Generic", confidence:"Medium", hidden:false },
  { name:"Greek yogurt plain", category:"Greek", portion:"170g", carbs:6, calories:100, source:"Generic", confidence:"Medium", hidden:false },
  { name:"Honey", category:"Greek", portion:"1 tbsp", carbs:17, calories:64, source:"Generic", confidence:"Medium", hidden:true },
  { name:"Spanakopita", category:"Greek", portion:"1 piece", carbs:28, calories:290, source:"Estimate", confidence:"Low", hidden:true },
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
  settings: DEFAULT_SETTINGS,
  foods: STARTER_FOODS,
  unlockedBadges: new Set(),
  view:"home",
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
  setTimeout(()=>div.remove(), 2800);
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
    default: return renderHome();
  }
}

function layout(content, active="home"){
  $app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="logo-lockup">
          <div class="logo-small">SD</div>
          <div>
            <strong>${APP_NAME}</strong>
            <p class="small muted">Every drop. Every breath. Unstoppable.</p>
          </div>
        </div>
        <button class="btn secondary" data-action="logout">Exit</button>
      </div>
      ${content}
      <nav class="nav">
        <button class="${active==="home"?"active":""}" data-view="home">Home</button>
        <button class="${active==="meal"?"active":""}" data-view="meal">Meal</button>
        <button class="${active==="diary"?"active":""}" data-view="diary">Entry</button>
        <button class="${active==="vault"?"active":""}" data-view="vault">Vault</button>
      </nav>
    </div>
  `;
  bindGlobal();
}

function bindGlobal(){
  document.querySelectorAll("[data-view]").forEach(btn => btn.onclick = () => {
    state.view = btn.dataset.view;
    render();
  });
  const logoutBtn = document.querySelector("[data-action='logout']");
  if(logoutBtn) logoutBtn.onclick = () => signOut(auth);
}

function renderLogin(){
  $app.innerHTML = `
    <section class="screen center">
      <div class="brand-mark">SD</div>
      <h1>The Scarlet Diaries</h1>
      <p class="tagline">Every drop. Every breath. Unstoppable.</p>
      <div class="card" style="width:100%;text-align:left">
        <h2>Enter the diary</h2>
        <p class="muted small">Use Firebase email/password accounts. Create test accounts first in Firebase Authentication or use “Create account.”</p>
        <div class="field">
          <label>Email</label>
          <input id="email" type="email" placeholder="amara@example.com" autocomplete="email" />
        </div>
        <div class="field">
          <label>Password</label>
          <input id="password" type="password" placeholder="Password" autocomplete="current-password" />
        </div>
        <div class="field">
          <label>Who is using this?</label>
          <select id="role">
            <option value="child">Amara</option>
            <option value="adult">Mom / Dad / Tita</option>
          </select>
        </div>
        <div class="btn-row">
          <button class="btn scarlet" id="loginBtn">Sign in</button>
          <button class="btn secondary" id="createBtn">Create account</button>
        </div>
      </div>
      <p class="small muted">Phase 1 build. Medical settings must be reviewed by an adult.</p>
    </section>
  `;
  document.getElementById("loginBtn").onclick = async () => doLogin(false);
  document.getElementById("createBtn").onclick = async () => doLogin(true);
}

async function doLogin(create=false){
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("password").value;
  const role = document.getElementById("role").value;
  if(!email || !pass) return toast("Please enter email and password.");
  try{
    const cred = create
      ? await createUserWithEmailAndPassword(auth, email, pass)
      : await signInWithEmailAndPassword(auth, email, pass);
    state.role = role;
    localStorage.setItem("scarletRole", role);
    await setDoc(doc(db,"users",cred.user.uid), {
      email, role, familyId:FAMILY_ID, displayName: role==="child" ? "Amara" : "Adult Circle",
      active:true, updatedAt:serverTimestamp()
    }, { merge:true });
    await ensureDefaults();
  }catch(err){
    console.error(err);
    toast(err.message || "Login failed.");
  }
}

async function ensureDefaults(){
  const settingsRef = doc(db,"families",FAMILY_ID,"children",CHILD_ID,"settings","current");
  const snap = await getDoc(settingsRef);
  if(!snap.exists()){
    await setDoc(settingsRef, { ...DEFAULT_SETTINGS, updatedAt: serverTimestamp() });
  }
  for(const food of STARTER_FOODS){
    const foodId = food.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    await setDoc(doc(db,"families",FAMILY_ID,"foodLibrary",foodId), {
      ...food, familyId:FAMILY_ID, verified:false, active:true, updatedAt: serverTimestamp()
    }, { merge:true });
  }
  for(const badge of BADGES){
    await setDoc(doc(db,"families",FAMILY_ID,"badges",badge.id), badge, { merge:true });
  }
}

async function loadData(){
  try{
    const settingsSnap = await getDoc(doc(db,"families",FAMILY_ID,"children",CHILD_ID,"settings","current"));
    if(settingsSnap.exists()) state.settings = { ...DEFAULT_SETTINGS, ...settingsSnap.data() };

    const foodsSnap = await getDocs(query(collection(db,"families",FAMILY_ID,"foodLibrary"), where("active","==",true), limit(80)));
    if(!foodsSnap.empty) state.foods = foodsSnap.docs.map(d => ({ id:d.id, ...d.data() }));

    const unlockSnap = await getDocs(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"badgeUnlocks"));
    state.unlockedBadges = new Set(unlockSnap.docs.map(d => d.id));
  }catch(err){
    console.warn("Data load issue:", err);
  }
}

function renderHome(){
  layout(`
    <div class="card dark">
      <p class="pill">Amara’s private safety diary</p>
      <h2 style="margin-top:12px">Hello, Amara.</h2>
      <p class="tagline" style="color:var(--gold-soft)">What does your body need?</p>
    </div>
    <div class="grid">
      <button class="action scarlet" data-go="meal"><strong>I’m Eating</strong><span>Check sugar, count carbs, estimate safely.</span></button>
      <button class="action" data-go="high"><strong>My Sugar Is High</strong><span>Slow down, check safety, alert the Circle.</span></button>
      <button class="action" data-go="low"><strong>My Sugar Is Low</strong><span>No insulin now. Protect yourself first.</span></button>
      <button class="action" data-go="insulin"><strong>I Took Insulin</strong><span>Log Apidra or Lantus.</span></button>
      <button class="action" data-go="feel"><strong>I Don’t Feel Well</strong><span>Tell the diary what your body feels.</span></button>
      <button class="action plum" data-go="diary"><strong>Write a Scarlet Entry</strong><span>Give your feelings a place to go.</span></button>
      <button class="action plum" data-go="vault"><strong>Open The Scarlet Vault</strong><span>Proof that you kept going.</span></button>
      <button class="action" data-go="circle"><strong>Call My Circle</strong><span>Mom, Dad, Tita.</span></button>
    </div>
  `, "home");
  document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => {
    state.view = b.dataset.go;
    render();
  });
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
      <div class="divider"></div>
      <p><strong>Glucose:</strong> ${g} mg/dL</p>
      <p class="small muted">Please check ketones if strips are available. Tell your Circle.</p>
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

function renderFoodBuilder(){
  const itemsHtml = state.meal.items.map((it,i)=>`
    <div class="list-item">
      <div><strong>${esc(it.name)}</strong><span class="small muted">${esc(it.portion)} · ${it.carbs}g carbs</span></div>
      <button class="btn secondary" data-remove="${i}">Remove</button>
    </div>
  `).join("") || `<p class="muted small">No foods added yet.</p>`;

  const total = state.meal.items.reduce((s,x)=>s + Number(x.carbs||0),0);
  layout(`
    <div class="card">
      <h2>Add Food</h2>
      <p class="muted">Choose from the starter Filipino, Greek, and family food list. Database search comes in Phase 3.</p>
      <div class="field">
        <label>Search food</label>
        <input id="foodSearch" placeholder="rice, pita, juice…" />
      </div>
      <div id="foodResults" class="list"></div>
    </div>
    <div class="card">
      <h3>Meal so far</h3>
      <div class="list">${itemsHtml}</div>
      <div class="divider"></div>
      <div class="kv"><span>Total carbs</span><strong>${total}g</strong></div>
      <button class="btn scarlet full" id="hiddenCarbs">Check secret carbs</button>
    </div>
  `, "meal");

  const input = document.getElementById("foodSearch");
  const results = document.getElementById("foodResults");
  const draw = () => {
    const term = input.value.toLowerCase().trim();
    const foods = state.foods.filter(f => !term || `${f.name} ${f.category}`.toLowerCase().includes(term)).slice(0,8);
    results.innerHTML = foods.map((f,i)=>`
      <button class="action" data-food="${i}">
        <strong>${esc(f.name)}</strong>
        <span>${esc(f.portion)} · ${Number(f.carbs||0)}g carbs · ${esc(f.confidence || "Estimate")}</span>
      </button>
    `).join("");
    results.querySelectorAll("[data-food]").forEach(btn => btn.onclick = () => {
      state.meal.items.push(foods[Number(btn.dataset.food)]);
      renderFoodBuilder();
    });
  };
  input.oninput = draw; draw();

  document.querySelectorAll("[data-remove]").forEach(btn => btn.onclick = () => {
    state.meal.items.splice(Number(btn.dataset.remove),1);
    renderFoodBuilder();
  });
  document.getElementById("hiddenCarbs").onclick = renderHiddenCarbs;
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
  document.querySelectorAll("[data-secret]").forEach(btn => btn.onclick = () => {
    btn.classList.toggle("scarlet");
    state.meal.hiddenChecked = true;
  });
  document.getElementById("finishHidden").onclick = async () => {
    state.meal.hiddenChecked = true;
    await unlockBadge("hidden-carb-hunter");
    renderMealEstimate();
  };
}

function roundDose(raw){
  const unit = Number(state.settings.doseRounding || 1);
  return Math.round(raw / unit) * unit;
}

function getCorrection(glucose){
  if(glucose > 250) return Number(state.settings.preMealCorrection250 || 4);
  if(glucose > 180) return Number(state.settings.preMealCorrection180 || 2);
  return 0;
}

function renderMealEstimate(){
  const carbs = state.meal.items.reduce((s,x)=>s + Number(x.carbs||0),0);
  const rawCarbDose = carbs / Number(state.settings.carbRatio || 8);
  const carbDose = roundDose(rawCarbDose);
  const correction = getCorrection(Number(state.meal.glucose));
  const estimated = carbDose + correction;
  layout(`
    <div class="card dark">
      <p class="pill">Estimated dose, not a command</p>
      <h2 style="margin-top:10px">Estimated Apidra: ${estimated} units</h2>
      <p class="tagline" style="color:var(--gold-soft)">Show this to your Circle before injecting.</p>
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
  document.querySelectorAll("[data-call]").forEach(b => b.onclick = async () => {
    await createAlert("circle_call","orange",`Amara requested ${b.dataset.call} during meal dosing. Estimated Apidra: ${estimated} units.`);
    await unlockBadge("caller-circle");
    toast(`${b.dataset.call} alert saved.`);
  });
  document.getElementById("alone").onclick = async () => {
    await createAlert("alone","red",`Amara says she is alone during meal dosing. Estimated Apidra: ${estimated} units.`);
    toast("The Circle has been alerted.");
  };
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
    items: state.meal.items.map(x => ({ name:x.name, portion:x.portion, carbs:Number(x.carbs||0) })),
    totalCarbs: carbs,
    carbDose,
    correctionDose,
    estimatedDose,
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
  if(extra.alreadyInjected){
    await createAlert("already_injected","orange",`Amara logged that she already injected ${estimatedDose} units Apidra.`);
  }
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
      <p class="muted">Tell your Circle. Take fast sugar based on your plan. Recheck.</p>
      <div class="field">
        <label>Glucose mg/dL</label>
        <input id="lowGlucose" type="number" inputmode="numeric" value="${preset || ""}" placeholder="Example: 65" />
      </div>
      <div class="field">
        <label>What did you do?</label>
        <select id="lowAction">
          <option>I took fast sugar</option>
          <option>I told an adult</option>
          <option>I rechecked</option>
          <option>I feel worse</option>
        </select>
      </div>
      <button class="btn red full" id="saveLow">Save low sugar check</button>
    </div>
  `, "home");
  document.getElementById("saveLow").onclick = async () => {
    const g = Number(document.getElementById("lowGlucose").value);
    const action = document.getElementById("lowAction").value;
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"glucoseLogs"), {
      glucose:g, context:"low_sugar", action, alertLevel:"red", createdAt:serverTimestamp(), enteredBy:state.user.uid
    });
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
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"insulinLogs"), {
      insulinType:type, dose, reason, createdAt:serverTimestamp(), enteredBy:state.user.uid
    });
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
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"symptomLogs"), {
      symptoms:arr, createdAt:serverTimestamp(), enteredBy:state.user.uid
    });
    if(arr.some(x => ["Stomach pain","Vomiting","Sleepy","Fast breathing"].includes(x))){
      await createAlert("symptoms","red",`Amara logged symptoms: ${arr.join(", ")}.`);
    }
    toast("Symptom log saved.");
    state.view="home"; render();
  };
}

function renderDiary(){
  const moods = ["Brave","Tired","Angry","Sad","Okay","Proud","Scared","Confused","Strong","Lonely","Annoyed","Hopeful"];
  layout(`
    <div class="card dark">
      <h2>Write a Scarlet Entry</h2>
      <p class="tagline" style="color:var(--gold-soft)">Give your feelings a place to go.</p>
    </div>
    <div class="card">
      <div class="field">
        <label>Today I feel…</label>
        <select id="mood">${moods.map(m=>`<option>${m}</option>`).join("")}</select>
      </div>
      <div class="field">
        <label>Scarlet Entry</label>
        <textarea id="entry" placeholder="Today my body felt…"></textarea>
      </div>
      <div class="field">
        <label>Privacy</label>
        <select id="privacy">
          <option value="private">Private to Amara</option>
          <option value="circle">Share with my Circle</option>
          <option value="safety">Safety note</option>
        </select>
      </div>
      <button class="btn scarlet full" id="saveEntry">Save Scarlet Entry</button>
    </div>
  `, "diary");
  document.getElementById("saveEntry").onclick = async () => {
    const mood = document.getElementById("mood").value;
    const entry = document.getElementById("entry").value.trim();
    const privacy = document.getElementById("privacy").value;
    if(!entry) return toast("Write a few words first.");
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"diaryEntries"), {
      mood, entry, privacy, createdAt:serverTimestamp(), enteredBy:state.user.uid
    });
    await unlockBadge("brave-page");
    if(["Sad","Angry","Scared","Lonely"].includes(mood)) await unlockBadge("girl-who-stayed");
    showBadgeModal(["Sad","Angry","Scared","Lonely"].includes(mood) ? "girl-who-stayed" : "brave-page", () => { state.view="vault"; render(); });
  };
}

function renderVault(){
  const grouped = BADGES.reduce((acc,b)=>{ (acc[b.section] ||= []).push(b); return acc; }, {});
  layout(`
    <div class="card dark">
      <h2>The Scarlet Vault</h2>
      <p class="tagline" style="color:var(--gold-soft)">Proof that you kept going.</p>
      <p class="small" style="margin-top:10px;color:rgba(255,247,234,.8)">These are not prizes for perfect numbers. These are marks of courage — for checking, telling the truth, asking for help, and staying.</p>
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
                <div class="badge-seal">${unlocked ? "✦" : "◌"}</div>
                <h3>${esc(b.name)}</h3>
                <p>${unlocked ? esc(b.desc) : "Still sleeping. Waiting for its moment."}</p>
                <p><strong>${unlocked ? "Unlocked" : "Wakes when:"}</strong> ${esc(b.rule)}</p>
              </div>
            `;
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
      <p class="tagline" style="color:var(--gold-soft)">Mom. Dad. Tita.</p>
    </div>
    <div class="grid single">
      ${CIRCLE.map(name => `
        <button class="action" data-person="${name}">
          <strong>I need ${name}</strong>
          <span>Save alert request to the dashboard and email system.</span>
        </button>
      `).join("")}
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
  await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"ketoneLogs"), {
    glucose, ketoneResult, createdAt:serverTimestamp(), enteredBy:state.user.uid,
    alertLevel: ketoneResult === "Moderate / large" ? "red" : "orange"
  });
}

async function createAlert(type, severity, message){
  await addDoc(collection(db,"families",FAMILY_ID,"alerts"), {
    childId:CHILD_ID, type, severity, message,
    recipients: state.settings.alertEmails || [],
    acknowledged:false,
    createdAt:serverTimestamp(),
    enteredBy: state.user?.uid || null
  });
  // Phase 1: alerts are stored in Firestore and visible in Parent Dashboard.
  // Actual email delivery requires the Cloud Function/email provider.
}

async function unlockBadge(id){
  if(state.unlockedBadges.has(id)) return;
  const badge = BADGES.find(b => b.id === id);
  if(!badge) return;
  await setDoc(doc(db,"families",FAMILY_ID,"children",CHILD_ID,"badgeUnlocks",id), {
    badgeId:id, name:badge.name, desc:badge.desc, createdAt:serverTimestamp()
  }, { merge:true });
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
      <div class="badge-seal" style="margin-top:16px">✦</div>
      <h2>${esc(b.name)}</h2>
      <p class="tagline">${esc(b.desc)}</p>
      <p class="muted small" style="margin-top:10px">${esc(b.rule)}</p>
      <button class="btn scarlet full" style="margin-top:18px" id="closeBadge">Keep going</button>
    </div>
  `;
  document.body.appendChild(div);
  document.getElementById("closeBadge").onclick = () => {
    div.remove();
    onClose?.();
  };
}

function renderAdult(){
  $app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="logo-lockup">
          <div class="logo-small">SD</div>
          <div><strong>Parent Dashboard</strong><p class="small muted">Mom · Dad · Tita</p></div>
        </div>
        <button class="btn secondary" data-action="logout">Exit</button>
      </div>
      <div class="card dark">
        <h2>Amara’s Circle</h2>
        <p class="tagline" style="color:var(--gold-soft)">Celebrate effort, not perfect glucose.</p>
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
        <p class="small muted" style="margin-top:10px">Settings are locked in this first build. Edit in Firestore only after adult review.</p>
      </div>
    </div>
  `;
  bindGlobal();
  const alertsRef = collection(db,"families",FAMILY_ID,"alerts");
  onSnapshot(query(alertsRef, orderBy("createdAt","desc"), limit(20)), snap => {
    const list = document.getElementById("alertsList");
    if(!list) return;
    if(snap.empty){
      list.innerHTML = `<p class="muted small">No alerts yet.</p>`;
      return;
    }
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
