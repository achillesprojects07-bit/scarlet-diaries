import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, setDoc, doc, getDoc, getDocs, query,
  where, orderBy, limit, serverTimestamp, onSnapshot, updateDoc, deleteDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const FAMILY_ID = "scarlet-family";
const CHILD_ID = "amara";
const APP_NAME = "The Scarlet Diaries";
const BUILD = "V2.4";
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
  loginInProgress:false,
  pendingRepair:null,
  settings: DEFAULT_SETTINGS,
  foods: STARTER_FOODS,
  unlockedBadges: new Set(),
  view:"home",
  foodTab:"Breakfast Favorites",
  foodCategory:"All",
  foodSearch:"",
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

function scrollToTopSoon(){
  setTimeout(() => window.scrollTo({ top:0, behavior:"smooth" }), 80);
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


function renderProfileRepair(){
  const repair = state.pendingRepair;
  if(!repair){
    renderLogin();
    return;
  }

  const roleName = ({ amara:"Amara", mom:"Mom", dad:"Dad", tita:"Tita" })[repair.roleKey] || repair.roleKey;

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
          <div class="form-title">Profile Repair Needed</div>
          <p class="muted small" style="text-align:center;line-height:1.5">
            This email can sign in, but it does not yet have a Scarlet profile.
          </p>
          <div class="card" style="box-shadow:none">
            <div class="kv"><span>Email</span><strong>${esc(repair.email)}</strong></div>
            <div class="kv"><span>Create profile as</span><strong>${esc(roleName)}</strong></div>
          </div>
          <button class="submit-btn" id="repairBtn">Create Scarlet Profile</button>
          <button class="back-btn" id="repairCancel">Cancel and choose another role</button>
        </div>

        <div class="footer">The Scarlet Diaries · Private &amp; Protected</div>
      </div>
    </section>
  `;

  document.getElementById("repairCancel").onclick = async () => {
    state.pendingRepair = null;
    state.loginInProgress = false;
    sessionStorage.removeItem("scarletJustLoggedIn");
    await signOut(auth);
    renderLogin();
  };

  document.getElementById("repairBtn").onclick = async () => {
    const btn = document.getElementById("repairBtn");
    const restore = setBusy(btn, "Creating profile…");
    try{
      const { user, email, role, roleKey } = state.pendingRepair;
      await setDoc(doc(db,"users",user.uid), {
        email,
        role,
        roleKey,
        familyId:FAMILY_ID,
        displayName: role === "child" ? "Amara" : roleKey,
        active:true,
        repairedAt:serverTimestamp(),
        updatedAt:serverTimestamp()
      }, { merge:true });

      toast("Scarlet profile created.");
      sessionStorage.setItem("scarletJustLoggedIn","yes");
      state.user = user;
      state.role = role;
      state.pendingRepair = null;
      state.loginInProgress = false;
      localStorage.setItem("scarletRole", role);
      localStorage.setItem("scarletRoleKey", roleKey);

      await safeEnsureDefaults();
      await loadData();
      render();
    }catch(err){
      console.error(err);
      if(String(err.message || "").toLowerCase().includes("permission")){
        toast("Profile repair blocked. Please publish the V2.0 firestore.rules file.");
      }else{
        toast("Could not repair profile yet. Please try again.");
      }
    }finally{
      restore();
    }
  };
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
    state.loginInProgress = true;
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
      // Existing Firebase Auth account, but missing Firestore profile.
      // Keep the user signed in and ask permission to create the selected profile.
      state.pendingRepair = {
        user: cred.user,
        email,
        role,
        roleKey
      };
      if(btn){ btn.disabled = false; btn.innerHTML = originalText; }
      renderProfileRepair();
      return;
    }

    const profile = userSnap.data();
    if(profile.roleKey !== roleKey || profile.role !== role){
      await signOut(auth);
      state.loginInProgress = false;
      return showError("This account is not assigned to this profile. Please choose the correct profile.");
    }

    if(profile.active === false){
      await signOut(auth);
      state.loginInProgress = false;
      return showError("This account is not active. Please ask an adult to check it.");
    }

    sessionStorage.setItem("scarletJustLoggedIn","yes");
    state.user = cred.user;
    state.role = role;
    state.loginInProgress = false;
    localStorage.setItem("scarletRole", role);
    localStorage.setItem("scarletRoleKey", roleKey);

    await safeEnsureDefaults();
    await loadData();
    render();

  }catch(err){
    console.error(err);
    state.loginInProgress = false;
    if(err.code === "auth/invalid-email") showError("Please enter a valid email address.");
    else if(err.code === "auth/email-already-in-use") showError("This email already has an account. Use Unlock the Diary instead.");
    else if(err.code === "auth/weak-password") showError("Please use a stronger password.");
    else if(err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") showError("Incorrect email or password. Try again.");
    else if(String(err.message || "").toLowerCase().includes("permission")) showError("Firebase permissions blocked setup. Please publish the V2.0 firestore.rules file, then try again.");
    else showError(err.message || "Something went wrong. Please try again.");
  }finally{
    if(!state.pendingRepair && btn){ btn.disabled = false; btn.innerHTML = originalText; }
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
      const localFoods = await fetch("./foods.json").then(r => r.ok ? r.json() : []);
      if(Array.isArray(localFoods) && localFoods.length) state.foods = localFoods.map(f => ({ active:true, verified:true, ...f }));
    }catch(localErr){
      console.warn("Local foods.json unavailable, using starter foods.", localErr);
      state.foods = STARTER_FOODS;
    }
    try{
      const foodsSnap = await getDocs(query(collection(db,"families",FAMILY_ID,"foodLibrary"), where("active","==",true), limit(120)));
      if(!foodsSnap.empty){
        const firestoreFoods = foodsSnap.docs.map(d => ({ id:d.id, ...d.data() }));
        const map = new Map(state.foods.map(f => [f.id || f.name, f]));
        firestoreFoods.forEach(f => map.set(f.id || f.name, f));
        state.foods = Array.from(map.values());
      }
    }catch(foodErr){
      console.warn("Firestore food library unavailable; using local foods.json.", foodErr);
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
  document.querySelectorAll("button").forEach(btn => {
    if(btn.dataset.tapBound) return;
    btn.dataset.tapBound = "1";
    btn.addEventListener("pointerdown", () => btn.classList.add("is-pressed"));
    btn.addEventListener("pointerup", () => setTimeout(()=>btn.classList.remove("is-pressed"), 120));
    btn.addEventListener("pointerleave", () => btn.classList.remove("is-pressed"));
  });
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
    <div class="card estimate-hero" id="estimateHero">
      <p class="pill">Suggested only</p>
      <h2>Suggested Apidra</h2>
      <div class="dose-number">${estimated}</div>
      <p class="dose-unit">units</p>
      <p class="muted small">Confirm with an adult before injecting.</p>
    </div>
    <div class="card">
      <h3>How this was estimated</h3>
      <div class="kv"><span>Pre-meal glucose</span><strong>${state.meal.glucose} mg/dL</strong></div>
      <div class="kv"><span>Total carbs</span><strong>${carbs}g</strong></div>
      <div class="kv"><span>Carb ratio</span><strong>1 unit / ${state.settings.carbRatio}g</strong></div>
      <div class="kv"><span>Carb dose rounded</span><strong>${carbDose} units</strong></div>
      <div class="kv"><span>Glucose correction</span><strong>+${correction} units</strong></div>
      <p class="small muted" style="margin-top:10px">Insulin is calculated from carbs plus the saved family correction plan. Calories are for nutrition only.</p>
    </div>
    <div class="grid single">
      <button class="action scarlet" id="adultConfirmed"><strong>Adult confirmed</strong><span>Save meal and automatically log Apidra.</span></button>
      ${CIRCLE.map(name => `<button class="action" data-call="${name}"><strong>I need ${name}</strong><span>Alert the Circle before dosing.</span></button>`).join("")}
      <button class="action" id="saveNoInsulin"><strong>Save without insulin</strong><span>Save meal only for adult review.</span></button>
      <button class="action" id="backFoodFromEstimate"><strong>Back to food</strong><span>Change or add food.</span></button>
    </div>
  `, "meal");
  document.getElementById("adultConfirmed").onclick = async () => {
    const btn = document.getElementById("adultConfirmed");
    const restore = setBusy(btn, "Saving meal and insulin…");
    try{
      await saveMealLog({ adultConfirmed:true, actualDose:estimated, autoLogInsulin:true });
    }finally{
      restore();
    }
  };
  document.querySelectorAll("[data-call]").forEach(b => b.onclick = async () => {
    const restore = setBusy(b, "Sending alert…");
    await createAlert("circle_call","orange",`Amara requested ${b.dataset.call} during meal dosing. Suggested Apidra: ${estimated} units.`);
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
    enteredBy: state.user.uid
  });
  await unlockBadge("scarlet-sentinel");
  await unlockBadge("feast-reader");
  if(extra.autoLogInsulin && actualDose){
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"insulinLogs"), {
      insulinType:"Apidra",
      dose:Number(actualDose),
      reason:"Meal - adult confirmed",
      linkedMeal:true,
      createdAt:serverTimestamp(),
      enteredBy:state.user.uid
    });
  }
  if(extra.alreadyInjected) await createAlert("already_injected","orange",`Amara logged that she already injected ${estimatedDose} units Apidra.`);
  toast(extra.autoLogInsulin ? "Meal saved. Insulin logged." : "Meal saved.");
  renderFlowDone({
    title: extra.autoLogInsulin ? "Meal saved. Insulin logged." : "Meal saved",
    message: extra.autoLogInsulin ? `Adult confirmed. Apidra logged: ${actualDose} unit(s).` : "Meal saved without insulin. Adult should review.",
    next:[
      {view:"diary",title:"Write a Scarlet Entry",sub:"Say how this felt."},
      {view:"pages",title:"My Scarlet Pages",sub:"Reread your entries."}
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
    enteredBy:state.user.uid
  });
  if(correctionLogged && correctionSuggested){
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"insulinLogs"), {
      insulinType:"Apidra",
      dose:Number(correctionSuggested),
      reason:"High sugar correction - adult confirmed",
      createdAt:serverTimestamp(),
      enteredBy:state.user.uid
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
    enteredBy:state.user.uid
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
  document.getElementById("logoutAfterReset").onclick = () => signOut(auth);
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
        <p class="muted small">7-day and 14-day summaries are available for adult pattern review.</p>
        <button class="btn scarlet full" style="margin-top:12px" id="openReportsBtn">Open Reports</button>
      </div>
      <div class="card danger">
        <h3>Demo Tools</h3>
        <p class="muted small">For demo/testing only. This clears logs, diary entries, mood records, alerts, badges, and reports while keeping accounts and settings.</p>
        <button class="btn red full" style="margin-top:12px" id="resetDemoBtn">Reset Demo Data</button>
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
  const resetBtn = document.getElementById("resetDemoBtn");
  if(resetBtn) resetBtn.onclick = () => renderDemoReset();
  const openReportsBtn = document.getElementById("openReportsBtn");
  if(openReportsBtn) openReportsBtn.onclick = () => renderReports();

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

  // Avoid race condition while signInWithEmailAndPassword is still finishing.
  if(state.loginInProgress || state.pendingRepair){
    return;
  }

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
