import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, setDoc, doc, getDoc, getDocs, query,
  where, orderBy, limit, serverTimestamp, onSnapshot, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const FAMILY_ID = "scarlet-family";
const CHILD_ID = "amara";
const APP_NAME = "The Scarlet Diaries";
const BUILD = "V1.9";
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
  user:null,
  role:null,
  selectedRole:"",
  settings: DEFAULT_SETTINGS,
  foods: STARTER_FOODS,
  unlockedBadges: new Set(),
  view:"home",
  foodTab:"Favorites",
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
    case "reports": return renderReports();
    case "pages": return renderScarletPages();
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
            <button class="create-small" id="createBtn">Create account</button><p class="small muted" style="text-align:center;margin-top:2px">Already created? Use Unlock the Diary above.</p>
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

  const btn = create ? document.getElementById("createBtn") : document.getElementById("loginBtn");
  const originalText = btn ? btn.innerHTML : "";

  try{
    if(btn){ btn.disabled = true; btn.innerHTML = create ? "Creating account…" : "Unlocking…"; }
    hideError();

    const cred = create
      ? await createUserWithEmailAndPassword(auth, email, pass)
      : await signInWithEmailAndPassword(auth, email, pass);

    const userRef = doc(db,"users",cred.user.uid);
    let userSnap = await getDoc(userRef);

    if(create){
      // First-time bootstrap: users can create only their own profile under the Firestore rules.
      await setDoc(userRef, {
        email,
        role,
        roleKey,
        familyId:FAMILY_ID,
        displayName: role === "child" ? "Amara" : roleKey,
        active:true,
        createdAt:serverTimestamp(),
        updatedAt:serverTimestamp()
      }, { merge:true });
      userSnap = await getDoc(userRef);
      toast("Account created. Unlocking diary…");
    }

    if(!userSnap.exists()){
      await signOut(auth);
      return showError("Account created in Firebase Auth, but no Scarlet profile exists yet. Please tap Create account for the correct role.");
    }

    const profile = userSnap.data();
    if(profile.roleKey !== roleKey || profile.role !== role){
      await signOut(auth);
      return showError("This account is not assigned to this profile. Please choose the correct profile.");
    }

    if(profile.active === false){
      await signOut(auth);
      return showError("This account is not active. Please ask an adult to check it.");
    }

    sessionStorage.setItem("scarletJustLoggedIn","yes");
    state.user = cred.user;
    state.role = role;
    localStorage.setItem("scarletRole", role);
    localStorage.setItem("scarletRoleKey", roleKey);

    await safeEnsureDefaults();
    await loadData();
    render();

  }catch(err){
    console.error(err);
    if(err.code === "auth/invalid-email") showError("Please enter a valid email address.");
    else if(err.code === "auth/email-already-in-use") showError("This email already has an account. Use Unlock the Diary instead.");
    else if(err.code === "auth/weak-password") showError("Please use a stronger password.");
    else if(err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") showError("Incorrect email or password. Try again.");
    else if(String(err.message || "").toLowerCase().includes("permission")) showError("Firebase permissions blocked setup. Please publish the V1.9 firestore.rules file, then try again.");
    else showError(err.message || "Something went wrong. Please try again.");
  }finally{
    if(btn){ btn.disabled = false; btn.innerHTML = originalText; }
  }
}

async function safeEnsureDefaults(){
  try{
    await ensureDefaults();
  }catch(err){
    console.warn("Starter setup skipped or blocked:", err);
    // Do not block login just because starter food/badge seeding failed.
    // The app can still open, and adults can publish rules or add data later.
  }
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
        ...food, familyId:FAMILY_ID, verified: food.source === "Family starter", favorite: !!food.favorite, active:true, updatedAt: serverTimestamp()
      }, { merge:true });
    }
  }

  const badgeCheck = await getDocs(query(collection(db,"families",FAMILY_ID,"badges"), limit(1)));
  if(badgeCheck.empty){
    for(const badge of BADGES) await setDoc(doc(db,"families",FAMILY_ID,"badges",badge.id), badge, { merge:true });
  }
}

async function loadData(){
  try{
    const settingsSnap = await getDoc(doc(db,"families",FAMILY_ID,"children",CHILD_ID,"settings","current"));
    if(settingsSnap.exists()) state.settings = { ...DEFAULT_SETTINGS, ...settingsSnap.data() };
    try{
      const foodsSnap = await getDocs(query(collection(db,"families",FAMILY_ID,"foodLibrary"), where("active","==",true), limit(120)));
      if(!foodsSnap.empty) state.foods = foodsSnap.docs.map(d => ({ id:d.id, ...d.data() }));
    }catch(foodErr){
      console.warn("Food library unavailable, using starter foods.", foodErr);
      state.foods = STARTER_FOODS;
    }
    try{
      const unlockSnap = await getDocs(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"badgeUnlocks"));
      state.unlockedBadges = new Set(unlockSnap.docs.map(d => d.id));
    }catch(badgeErr){
      console.warn("Badge unlocks unavailable yet.", badgeErr);
      state.unlockedBadges = new Set();
    }
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
        <button class="${active==="reports"?"active":""}" data-view="reports">Reports</button>
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
      <button class="action scarlet" data-go="meal"><strong>Before I Eat</strong><span>Check sugar, choose food, then see a suggested dose.</span></button>
      <button class="action" data-go="high"><strong>My Sugar Is High</strong><span>Slow down, check safety, alert the Circle.</span></button>
      <button class="action" data-go="low"><strong>My Sugar Is Low</strong><span>No insulin now. Protect yourself first.</span></button>
      <button class="action" data-go="insulin"><strong>I Took Insulin</strong><span>Log Apidra or Lantus.</span></button>
      <button class="action" data-go="feel"><strong>I Don’t Feel Well</strong><span>Tell the diary what your body feels.</span></button>
      <button class="action" data-go="foods"><strong>Food & Carb Library</strong><span>Favorites, saved foods, packaged foods, and the big food database.</span></button>
      <button class="action plum" data-go="diary"><strong>Write a Scarlet Entry</strong><span>Give your feelings a place to go.</span></button>
      <button class="action plum" data-go="pages"><strong>My Scarlet Pages</strong><span>Reread the words that prove you kept going.</span></button>
      <button class="action plum" data-go="vault"><strong>Open The Scarlet Vault</strong><span>Proof that you kept going.</span></button>
      <button class="action" data-go="mood"><strong>Mood Mirror</strong><span>See feelings without shame.</span></button>
      <button class="action" data-go="reports"><strong>Reports</strong><span>7-day and 14-day summaries for adults and doctors.</span></button>
      <button class="action" data-go="circle"><strong>Call My Circle</strong><span>Mom, Dad, Tita.</span></button>
    </div>
  `, "home");
  document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { state.view = b.dataset.go; render(); });
}

function renderMealStart(){
  state.meal = { type:null, glucose:null, items:[], hiddenChecked:false, symptoms:[], ketones:null, lastApidra:"unknown" };
  layout(`
    <div class="card">
      <h2>Before I Eat</h2>
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
      <div class="food-source-tabs wide-tabs">
        ${["Favorites","Saved Foods","Meals","Rice, Bread & Grains","Snacks & Sweets","Fruits","Drinks","Hidden Carbs","Packaged Foods","Big Food Database"].map(t => `<button class="tab-btn ${state.foodTab===t ? "active":""}" data-tab="${t}">${t}</button>`).join("")}
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

    if(state.foodTab === "Big Food Database"){
      results.innerHTML = `<p class="muted small">The large USDA FoodData Central search needs an API key setup before it can search live. Use Packaged Foods for label foods, or add a custom family food.</p>`;
      return;
    }

    if(state.foodTab === "Packaged Foods" && term.length >= 3){
      results.innerHTML = `<p class="muted small">Searching packaged food database…</p>`;
      const dbFoods = await searchOpenFoodFacts(term);
      if(!dbFoods.length){
        results.innerHTML = `<p class="muted small">No packaged results found. Try a simpler name or add custom family food.</p>`;
        return;
      }
      results.innerHTML = dbFoods.map((f,i)=>foodButtonHtml(f,i)).join("");
      results.querySelectorAll("[data-food]").forEach(btn => btn.onclick = () => {
        state.meal.items.push(dbFoods[Number(btn.dataset.food)]);
        toast("Food added.");
        renderFoodBuilder();
      });
      return;
    }

    let foods = state.foods.slice();
    if(state.foodTab === "Favorites") foods = foods.filter(f => f.favorite || f.verified);
    else if(state.foodTab === "Saved Foods") foods = foods.filter(f => f.verified || f.source === "Family Verified" || f.source === "Family starter");
    else if(state.foodTab !== "Packaged Foods") foods = foods.filter(f => f.category === state.foodTab);

    if(term) foods = foods.filter(f => `${f.name} ${f.category} ${f.tags || ""}`.toLowerCase().includes(term));

    foods = foods.sort((a,b) => Number(!!b.favorite) - Number(!!a.favorite) || Number(!!b.verified) - Number(!!a.verified)).slice(0,12);
    results.innerHTML = foods.map((f,i)=>foodButtonHtml(f,i)).join("") || `<p class="muted small">No food found here. Try another category or add custom family food.</p>`;
    results.querySelectorAll("[data-food]").forEach(btn => btn.onclick = () => {
      state.meal.items.push(foods[Number(btn.dataset.food)]);
      toast("Food added.");
      renderFoodBuilder();
    });
  }
  input.oninput = draw; draw();

  document.querySelectorAll("[data-remove]").forEach(btn => btn.onclick = () => { state.meal.items.splice(Number(btn.dataset.remove),1); renderFoodBuilder(); });
  document.getElementById("hiddenCarbs").onclick = renderHiddenCarbs;
  document.getElementById("customFood").onclick = () => renderCustomFoodForm("meal");
}

function foodButtonHtml(f,i){
  return `<div class="list-item">
    <div>
      <strong>${esc(f.name)}</strong>
      <span class="small muted">${esc(f.portion || "serving")} · ${Number(f.carbs||0)}g carbs · ${esc(f.calories || 0)} kcal</span>
      <div class="confidence">${esc(foodConfidence(f))}</div>
    </div>
    <button class="btn scarlet" data-food="${i}">Add</button>
  </div>`;
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
  const categories = ["Favorites","Saved Foods","Meals","Rice, Bread & Grains","Snacks & Sweets","Fruits","Drinks","Hidden Carbs","Packaged Foods","Big Food Database"];
  const active = state.foodTab || "Favorites";
  let foods = state.foods.slice();
  if(active === "Favorites") foods = foods.filter(f => f.favorite || f.verified);
  else if(active === "Saved Foods") foods = foods.filter(f => f.verified || f.source === "Family Verified" || f.source === "Family starter");
  else if(active === "Big Food Database") foods = [];
  else if(active === "Packaged Foods") foods = [];
  else foods = foods.filter(f => f.category === active);

  layout(`
    <div class="card dark">
      <h2>Food & Carb Library</h2>
      <p class="tagline">Find carbs before insulin is estimated.</p>
      <p class="muted small" style="margin-top:8px">Filipino and Greek should be tags, not main categories. Categories follow how Amara actually eats.</p>
    </div>
    <div class="card">
      <div class="food-source-tabs wide-tabs">
        ${categories.map(t => `<button class="tab-btn ${active===t ? "active":""}" data-food-tab="${t}">${t}</button>`).join("")}
      </div>
      <button class="btn scarlet full" id="addCustomFood">Add custom family food</button>
      <div class="divider-line"></div>
      ${active === "Big Food Database" ? `<p class="muted small">USDA FoodData Central needs API-key setup before live search can be enabled. This will be connected in the database integration build.</p>` : ""}
      ${active === "Packaged Foods" ? `<p class="muted small">Packaged food search appears inside Before I Eat. Search by food name after choosing Packaged Foods.</p>` : ""}
      <div class="list">
        ${foods.slice().sort((a,b)=>Number(!!b.favorite)-Number(!!a.favorite)||Number(!!b.verified)-Number(!!a.verified)).slice(0,60).map(f => `
          <div class="list-item">
            <div>
              <strong>${esc(f.name)}</strong>
              <span class="small muted">${esc(f.category)} · ${esc(f.portion)} · ${Number(f.carbs||0)}g carbs</span>
              <div class="confidence">${esc(foodConfidence(f))}</div>
            </div>
            <button class="btn secondary" data-edit-food="${esc(f.id || "")}">Edit</button>
          </div>
        `).join("") || (active === "Big Food Database" || active === "Packaged Foods" ? "" : `<p class="muted small">No foods in this category yet.</p>`)}
      </div>
    </div>
  `, "foods");
  document.querySelectorAll("[data-food-tab]").forEach(btn => btn.onclick = () => { state.foodTab = btn.dataset.foodTab; renderFoodLibrary(); });
  document.getElementById("addCustomFood").onclick = () => renderCustomFoodForm("library");
  document.querySelectorAll("[data-edit-food]").forEach(btn => btn.onclick = () => {
    const food = state.foods.find(f => f.id === btn.dataset.editFood);
    if(food) renderEditFoodForm(food);
  });
}

function renderEditFoodForm(food){
  layout(`
    <div class="card">
      <h2>Edit Food</h2>
      <p class="muted">Adjust the carb count, portion, or category if the family learns a better estimate.</p>
      <div class="field"><label>Food name</label><input id="editName" value="${esc(food.name || "")}" /></div>
      <div class="field"><label>Category</label><select id="editCategory">${["Favorites","Saved Foods","Meals","Rice, Bread & Grains","Snacks & Sweets","Fruits","Drinks","Hidden Carbs","Packaged Foods"].map(c => `<option ${food.category===c ? "selected":""}>${c}</option>`).join("")}</select></div>
      <div class="field"><label>Portion</label><input id="editPortion" value="${esc(food.portion || "")}" /></div>
      <div class="field"><label>Carbs</label><input id="editCarbs" type="number" inputmode="numeric" value="${Number(food.carbs||0)}" /></div>
      <div class="field"><label>Calories</label><input id="editCalories" type="number" inputmode="numeric" value="${Number(food.calories||0)}" /></div>
      <div class="field"><label>Tags</label><input id="editTags" value="${esc(food.tags || "")}" placeholder="Home, School, Greek, Filipino, Favorite…" /></div>
      <div class="field"><label>Favorite?</label><select id="editFavorite"><option value="false">No</option><option value="true" ${food.favorite ? "selected":""}>Yes</option></select></div>
      <button class="btn scarlet full" id="saveFoodEdit">Save changes</button>
      <button class="btn secondary full" id="cancelFoodEdit">Cancel</button>
    </div>
  `, "foods");
  document.getElementById("cancelFoodEdit").onclick = () => renderFoodLibrary();
  document.getElementById("saveFoodEdit").onclick = async () => {
    const restore = setBusy(document.getElementById("saveFoodEdit"), "Saving changes…");
    const updates = {
      name: document.getElementById("editName").value.trim(),
      category: document.getElementById("editCategory").value,
      portion: document.getElementById("editPortion").value.trim(),
      carbs: Number(document.getElementById("editCarbs").value),
      calories: Number(document.getElementById("editCalories").value || 0),
      tags: document.getElementById("editTags").value.trim(),
      favorite: document.getElementById("editFavorite").value === "true",
      updatedAt: serverTimestamp()
    };
    if(!updates.name || isNaN(updates.carbs)){ restore(); return toast("Food name and carbs are required."); }
    await updateDoc(doc(db,"families",FAMILY_ID,"foodLibrary",food.id), updates);
    Object.assign(food, updates);
    restore();
    toast("Food saved.");
    renderFoodLibrary();
  };
}

function renderCustomFoodForm(returnTo="library"){
  layout(`
    <div class="card">
      <h2>Add Family Food</h2>
      <p class="muted">Use this for meals Amara actually eats. These become easier to find next time.</p>
      <div class="field"><label>Food name</label><input id="customName" placeholder="Example: Mom's rice bowl" /></div>
      <div class="field"><label>Category</label><select id="customCategory"><option>Meals</option><option>Rice, Bread & Grains</option><option>Snacks & Sweets</option><option>Fruits</option><option>Drinks</option><option>Hidden Carbs</option><option>Saved Foods</option></select></div>
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
      category: document.getElementById("customCategory").value || "Saved Foods",
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
    const restore = setBusy(document.getElementById("saveCustomFood"), "Adding food…");
    const id = f.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") + "-" + Date.now().toString().slice(-5);
    await setDoc(doc(db,"families",FAMILY_ID,"foodLibrary",id), f);
    restore();
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
  document.getElementById("finishHidden").onclick = async () => { state.meal.hiddenChecked = true; await unlockBadge("hidden-carb-hunter");
    await unlockBadge("plate-whisperer");
    renderMealEstimate(); };
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
      <h2 style="margin-top:10px">Suggested Apidra: ${estimated} units</h2>
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
  document.querySelectorAll("[data-call]").forEach(b => b.onclick = async () => { await createAlert("circle_call","orange",`Amara requested ${b.dataset.call} during meal dosing. Suggested Apidra: ${estimated} units.`); await unlockBadge("caller-circle"); toast(`${b.dataset.call} alert saved.`); });
  document.getElementById("alone").onclick = async () => { await createAlert("alone","red",`Amara says she is alone during meal dosing. Suggested Apidra: ${estimated} units.`); toast("The Circle has been alerted."); };
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
  toast("Meal and suggested insulin saved.");
  renderFlowDone({
    title:"Meal saved",
    message:"Your food, carbs, glucose, and suggested Apidra estimate were saved. Confirm with an adult before injecting.",
    next:[
      {view:"insulin",title:"Log Insulin",sub:"Use this after adult confirmation."},
      {view:"pages",title:"My Scarlet Pages",sub:"Reread your entries."},
      {view:"vault",title:"Open The Scarlet Vault",sub:"See your courage badges."}
    ]
  });
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
    const btn = document.getElementById("saveHigh");
    const restore = setBusy(btn, "Saving high sugar check…");
    const last = document.getElementById("lastApidra").value;
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"glucoseLogs"), {
      glucose:g, context:"high_sugar", lastApidra:last, ketones:state.meal.ketones || null,
      alertLevel:g>=state.settings.urgentHighThreshold ? "red":"orange", createdAt:serverTimestamp(), enteredBy:state.user.uid
    });
    const correction = getCorrection(g);
    if(last === "yes"){
      await unlockBadge("no-stack-oath");
      await createAlert("stacking_risk","red",`Amara logged high glucose ${g} and Apidra within last ${state.settings.insulinStackingHours} hours. Possible stacking risk.`);
    }
    await unlockBadge(g>=300 ? "slayer-300" : "stormbreaker");
    restore();
    toast("High sugar check saved.");
    renderFlowDone({
      title:"High sugar check saved",
      message:`Suggested correction from saved family plan: ${correction} unit(s). Confirm with an adult before injecting. Drink water and do not stack insulin.`,
      next:[
        {view:"circle",title:"Call My Circle",sub:"Tell Mom, Dad, or Tita."},
        {view:"insulin",title:"Log Insulin",sub:"Only after adult confirmation."},
        {view:"diary",title:"Write a Scarlet Entry",sub:"Say how this felt."}
      ]
    });
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
    const btn = document.getElementById("saveLow");
    const restore = setBusy(btn, "Saving low sugar check…");
    const g = Number(document.getElementById("lowGlucose").value);
    const action = document.getElementById("lowAction").value;
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"glucoseLogs"), { glucose:g, context:"low_sugar", action, alertLevel:"red", createdAt:serverTimestamp(), enteredBy:state.user.uid });
    await createAlert("low","red",`Amara logged low glucose ${g}. Action: ${action}.`);
    await unlockBadge("crimson-comeback");
    restore();
    toast("Low sugar check saved.");
    renderFlowDone({
      title:"Low sugar check saved",
      message:"No insulin while low. Take fast sugar based on the family plan, tell an adult, and recheck.",
      next:[
        {view:"circle",title:"Call My Circle",sub:"Ask an adult to help."},
        {view:"low",title:"Recheck Low Sugar",sub:"Log the next reading."},
        {view:"diary",title:"Write a Scarlet Entry",sub:"Say how this felt."}
      ]
    });
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
    renderFlowDone({
      title:"Insulin log saved",
      message:"The insulin dose was saved in Amara’s record.",
      next:[
        {view:"reports",title:"Reports",sub:"See summaries later."},
        {view:"diary",title:"Write a Scarlet Entry",sub:"Say how today felt."}
      ]
    });
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
    const btn = document.getElementById("saveSymptoms");
    const restore = setBusy(btn, "Saving symptoms…");
    const arr = [...selected];
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"symptomLogs"), { symptoms:arr, createdAt:serverTimestamp(), enteredBy:state.user.uid });
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
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"diaryEntries"), { mood, prompt, entry, privacy, createdAt:serverTimestamp(), enteredBy:state.user.uid });
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"moodLogs"), { mood, privacy, createdAt:serverTimestamp(), enteredBy:state.user.uid });
    await unlockBadge("brave-page");
    if(["Sad","Angry","Scared","Lonely"].includes(mood)) { await unlockBadge("girl-who-stayed"); await unlockBadge("soft-monster-tamer"); }
    if(mood === "Sad" || mood === "Lonely") await unlockBadge("moonlit-heart");
    doneBusy();
    toast("Entry saved.");
    renderFlowDone({ title:"Scarlet Entry saved", message:"Your words are now in My Scarlet Pages.", next:[{view:"pages",title:"Read My Scarlet Pages",sub:"Open your diary archive."},{view:"vault",title:"Open The Scarlet Vault",sub:"See your courage badges."}] });
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
        {view:"high",title:"Log Glucose",sub:"Use this if sugar is high."},
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

async function addKetoneLog(glucose, ketoneResult){
  await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"ketoneLogs"), { glucose, ketoneResult, createdAt:serverTimestamp(), enteredBy:state.user.uid, alertLevel: ketoneResult === "Moderate / large" ? "red" : "orange" });
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
    enteredBy: state.user?.uid || null
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
        <h3>Reports</h3>
        <p class="muted small">7-day and 14-day summaries are now available from the Reports tab. Use them for checkups and pattern review.</p>
      </div>
      <div class="card">
        <h3>Notification Status</h3>
        <p class="muted small">Phase 6 adds Firebase alert records, adult acknowledgement, and backend email function files. Email sending activates after deploying the included Firebase Functions setup.</p>
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
        acknowledgedBy:state.user?.uid || null
      });
      toast("Alert acknowledged.");
    });
  });
}

onAuthStateChanged(auth, async user => {
  const justLoggedIn = sessionStorage.getItem("scarletJustLoggedIn") === "yes";
  if(user && justLoggedIn){
    state.user = user;
    state.role = localStorage.getItem("scarletRole") || "child";
    await loadData();
    render();
  }else{
    if(user) await signOut(auth);
    state.user = null;
    state.role = null;
    renderLogin();
  }
});
