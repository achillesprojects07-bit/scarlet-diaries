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
const CHILD_ID  = "amara";
const APP_NAME  = "The Scarlet Diaries";
const BUILD     = "V2.6.3";
const CIRCLE    = ["Mom", "Dad", "Tita"];
const DEMO_PIN = "1111";
const ROLE_AUTH_ACCOUNTS = {
  amara:{ email:"amara.demo@scarlet-diaries.app", password:"ScarletDemo1111!", displayName:"Amara" },
  mom:  { email:"mom.demo@scarlet-diaries.app",   password:"ScarletDemo1111!", displayName:"Mom" },
  dad:  { email:"dad.demo@scarlet-diaries.app",   password:"ScarletDemo1111!", displayName:"Dad" },
  tita: { email:"tita.demo@scarlet-diaries.app",  password:"ScarletDemo1111!", displayName:"Tita" }
};
const ROLE_LABELS = { amara:"Amara", mom:"Mom", dad:"Dad", tita:"Tita" };


// ── DEFAULT SETTINGS ─────────────────────────────────────────
const DEFAULT_SETTINGS = {
  childName:             "Amara",
  rapidInsulin:          "Apidra",
  basalInsulin:          "Lantus",
  carbRatio:             8,
  doseRounding:          1,
  lowThreshold:          70,
  highThreshold:         180,
  urgentHighThreshold:   300,
  preMealCorrection180:  2,
  preMealCorrection250:  4,
  ketonePromptThreshold: 180,
  insulinStackingHours:  3,
  alertEmails:           ["mom@example.com","dad@example.com","tita@example.com"],
  updatedAt:             null
};

// ── STARTER FOODS (fallback only) ───────────────────────────
const STARTER_FOODS = [
  { name:"White rice",         category:"Rice / Bread / Pasta",    portion:"1 cup cooked",  carbs:45, calories:205, source:"Family starter", confidence:"Medium", hidden:false },
  { name:"Pandesal",           category:"Rice / Bread / Pasta",    portion:"1 piece",       carbs:15, calories:120, source:"Estimate",       confidence:"Low",    hidden:false },
  { name:"Filipino spaghetti", category:"Meals",                   portion:"1 cup",         carbs:43, calories:310, source:"Estimate",       confidence:"Low",    hidden:true  },
  { name:"Adobo sauce",        category:"Sauces / Hidden Carbs",   portion:"2 tbsp",        carbs:4,  calories:35,  source:"Estimate",       confidence:"Low",    hidden:true  },
  { name:"Fried chicken breading", category:"Sauces / Hidden Carbs", portion:"small serving", carbs:8, calories:60, source:"Estimate",      confidence:"Low",    hidden:true  },
  { name:"Sweet sauce / ketchup",  category:"Sauces / Hidden Carbs", portion:"1 tbsp",      carbs:5,  calories:20,  source:"Estimate",      confidence:"Low",    hidden:true  },
  { name:"Juice box",          category:"Drinks",  favorite:true,  portion:"1 box",         carbs:20, calories:90,  source:"Label estimate", confidence:"Medium", hidden:false },
  { name:"Milk",               category:"Drinks",                  portion:"1 cup",         carbs:12, calories:150, source:"Generic",        confidence:"Medium", hidden:false },
  { name:"Banana",             category:"Fruit",                   portion:"1 medium",      carbs:27, calories:105, source:"Generic",        confidence:"Medium", hidden:false },
  { name:"Pita bread",         category:"Rice / Bread / Pasta",    portion:"1 medium",      carbs:33, calories:170, source:"Generic",        confidence:"Medium", hidden:false },
  { name:"Greek yogurt plain", category:"Meal Favorites",          portion:"170g",          carbs:6,  calories:100, source:"Generic",        confidence:"Medium", hidden:false },
  { name:"Honey",              category:"Sauces / Hidden Carbs",   portion:"1 tbsp",        carbs:17, calories:64,  source:"Generic",        confidence:"Medium", hidden:true  },
  { name:"Spanakopita",        category:"Meals",                   portion:"1 piece",       carbs:28, calories:290, source:"Estimate",       confidence:"Low",    hidden:true  },
  { name:"Souvlaki with pita", category:"Meals",                   portion:"1 serving",     carbs:38, calories:420, source:"Estimate",       confidence:"Low",    hidden:true  }
];

// ── BADGE DEFINITIONS ────────────────────────────────────────
const BADGES = [
  // Safety
  { id:"scarlet-sentinel",   section:"Safety",         name:"The Scarlet Sentinel",   subtitle:"You checked before the first bite.",           desc:"You listened to the plan before eating. That is what protection looks like.",       rule:"Log a glucose reading before a meal." },
  { id:"truth-teller",       section:"Safety",         name:"Truth Teller",           subtitle:"The number is data, not identity.",             desc:"You saved the number even when it was hard. That takes real courage.",              rule:"Save any glucose reading honestly." },
  { id:"stormbreaker",       section:"Safety",         name:"Stormbreaker",           subtitle:"You faced the storm instead of hiding.",         desc:"You went through every safety step during a high sugar moment.",                   rule:"Complete high sugar safety steps." },
  { id:"slayer-300",         section:"Safety",         name:"The 300 Slayer",         subtitle:"You called for help before it got worse.",       desc:"Logging a very high reading and asking for help is one of the bravest things.",    rule:"Log glucose 300+ and alert an adult." },
  { id:"no-stack-oath",      section:"Safety",         name:"The No-Stack Oath",      subtitle:"Power is knowing when to wait.",                 desc:"You chose safety over rushing. That is wisdom.",                                   rule:"Avoid correcting again too soon." },
  { id:"crimson-comeback",   section:"Safety",         name:"Crimson Comeback",       subtitle:"You fell low but rose again.",                   desc:"You treated a low and kept going. That is unstoppable.",                           rule:"Treat and recheck a low sugar." },
  { id:"sweet-rescue",       section:"Safety",         name:"Sweet Rescue",           subtitle:"Fast sugar when it was needed.",                 desc:"You chose fast sugar when your body needed it most.",                              rule:"Take fast sugar during a low flow." },
  { id:"safe-choice",        section:"Safety",         name:"Safe Choice",            subtitle:"You chose safety over rushing.",                 desc:"Saving without guessing keeps you protected.",                                     rule:"Save a reading without insulin when unsure." },
  // Food Confidence
  { id:"hidden-carb-hunter", section:"Food Confidence", name:"Hidden Carb Hunter",   subtitle:"You found what hides in sauces and breading.",   desc:"The carbs we forget are often the ones that surprise us most. Not you.",           rule:"Use the hidden carb checklist." },
  { id:"feast-reader",       section:"Food Confidence", name:"The Feast Reader",      subtitle:"You read the plate like a secret map.",          desc:"You completed a full meal calculation. That is real care.",                        rule:"Complete a meal calculation." },
  { id:"plate-whisperer",    section:"Food Confidence", name:"Plate Whisperer",       subtitle:"You listened to the meal before it surprised you.", desc:"Building a full meal with a hidden carb check is expert-level care.",            rule:"Build a full meal with hidden carb check." },
  { id:"brave-pause",        section:"Food Confidence", name:"Brave Pause",           subtitle:"You stopped before guessing insulin.",            desc:"Pausing is not weakness. It is wisdom.",                                           rule:"Save meal without insulin when unsure." },
  // Scarlet Pages (diary)
  { id:"brave-page",         section:"Scarlet Pages",  name:"The Brave Page",        subtitle:"You gave your feelings a place to go.",          desc:"Writing is how brave people tell their own story.",                                rule:"Write a Scarlet Entry." },
  { id:"girl-who-stayed",    section:"Scarlet Pages",  name:"The Girl Who Stayed",   subtitle:"Even on a hard day, you remained.",              desc:"Writing after a hard feeling is one of the most powerful things a person can do.", rule:"Write after choosing a hard feeling." },
  { id:"soft-monster-tamer", section:"Scarlet Pages",  name:"Soft Monster Tamer",    subtitle:"You named the feeling so it got smaller.",       desc:"Feelings named are feelings tamed. You did that.",                                 rule:"Write about a hard feeling." },
  { id:"moonlit-heart",      section:"Scarlet Pages",  name:"The Moonlit Heart",     subtitle:"Even sadness can be held gently.",               desc:"On a sad day you still wrote. That is quiet strength.",                            rule:"Write a Scarlet Entry on a sad day." },
  { id:"vault-keeper",       section:"Scarlet Pages",  name:"Vault Keeper",          subtitle:"You came back to your own story.",               desc:"Reading your own pages takes courage. Your story matters.",                        rule:"Read My Scarlet Pages." },
  // Streaks
  { id:"signal-flame",       section:"Streaks",        name:"Signal Flame",          subtitle:"Your call for help became a light.",             desc:"Every time you asked for help, you made the right choice.",                        rule:"Send any safety alert." },
  { id:"caller-circle",      section:"Streaks",        name:"Caller of the Circle",  subtitle:"You were brave enough to call your guardians.",  desc:"Asking for help is not weakness. It is the right call.",                           rule:"Ask Mom, Dad, or Tita for help." },
  { id:"three-guardians",    section:"Streaks",        name:"The Three Guardians",   subtitle:"Your Circle has been summoned.",                 desc:"You made sure adults knew what was happening. That keeps you safe.",               rule:"Alert the Circle during a high-risk moment." },
  { id:"seven-scarlet-days", section:"Streaks",        name:"Seven Scarlet Days",    subtitle:"Seven days. Seven proofs that you kept going.",  desc:"Seven days of checking in. That is dedication.",                                   rule:"Use the app for 7 days." },
  { id:"steady-spark",       section:"Streaks",        name:"Steady Spark",          subtitle:"You showed up again.",                           desc:"Every log is a mark of care. You keep showing up.",                                rule:"Log five or more meal entries." },
  // Courage
  { id:"grown-up-signal",    section:"Courage",        name:"Grown-Up Signal",       subtitle:"You made sure an adult knew.",                   desc:"Telling an adult is the bravest and smartest thing you can do.",                   rule:"Alert an adult during a high or low reading." },
  { id:"not-my-number",      section:"Courage",        name:"Not My Number",         subtitle:"The number is data, not identity.",              desc:"The glucose number tells you what to do. It does not say who you are.",            rule:"Log a high or low reading and keep going." },
  { id:"ketone-seer",        section:"Courage",        name:"The Ketone Seer",       subtitle:"You read the warning signs.",                    desc:"Checking ketones takes courage. You did it anyway.",                               rule:"Check ketones during a high sugar day." },
  { id:"truth-keeper",       section:"Courage",        name:"The Truth Keeper",      subtitle:"You told the truth and kept yourself safe.",     desc:"Honesty about missing strips means an adult can help. That is wisdom.",            rule:"Log that ketone strips are missing or unavailable." },
  { id:"wall-proof",         section:"Courage",        name:"The Wall of Proof",     subtitle:"The proof was never perfection. It was staying.", desc:"Every badge on this wall is proof that you kept going no matter what.",           rule:"Unlock five or more courage badges." }
];

const CHECKIN_QUESTIONS = [
  "Before we begin — how is your heart today, Amara?",
  "Hey Amara. Sit for one second. What do you feel?",
  "Before anything else — what is your heart carrying right now?",
  "Good to see you. How are you, really?",
  "Before we start — check in with yourself. What is there?",
  "Amara. You showed up. How does that feel today?",
  "One honest word — how is your heart right now?",
  "Before the day begins — what does your body feel?",
  "No right answer here. How are you doing?",
  "This is just for you. How are you feeling today?",
  "Before anything else — what is alive in you right now?",
  "You are here. That matters. How do you feel?",
  "Just between us — how is today treating you so far?",
  "Before we go — what is your heart saying?",
  "Amara, take a moment. What are you feeling right now?",
  "The diary is open. How are you today?",
  "Before the numbers and the meals — how is your heart?",
  "One moment just for you. What do you feel right now?",
  "You made it here. How does that feel today?",
  "Before anything else — are you okay?",
  "Hey. Just checking in. How are you?",
  "The Scarlet Diaries is listening. How are you today?",
  "What is your heart carrying into this moment?",
  "Today is a new page. How are you starting it?",
  "Before the day asks anything of you — how are you?",
  "This moment belongs to you. What do you feel?",
  "Amara — no performance needed here. How are you really?",
  "Before anything else — how is your body feeling today?",
  "Just one honest check — how are you doing right now?",
  "The vault is yours. How are you walking into it today?",
  "Before we go anywhere — what does your heart need to say?",
  "You came back. How are you feeling today?",
  "No wrong answer exists here. How are you?",
  "Before the day takes over — what do you feel right now?",
  "Amara. Be still for a second. What is there?",
  "What is the first feeling that comes when you sit quietly?",
  "Before we begin — what would your heart say if it could talk?",
  "Just you and this screen right now. How are you?",
  "Before anything else — check in with yourself. What is alive?",
  "Today gets to start with you. How are you feeling?",
  "The diary is waiting. How is your heart today?",
  "One moment before the world begins. How are you?",
  "Before the food and the numbers — how is Amara today?",
  "How are you carrying yourself into this day?",
  "Before we begin — what do you wish someone would ask you?",
  "You are safe here. How are you feeling right now?",
  "The Scarlet Diaries sees you. How are you today?",
  "Before anything else — just be still. What do you feel?",
  "Before we begin — what is the truest thing about how you feel right now?",
  "You opened this app. That took something. How are you today?"
];

const CHECKIN_RESPONSES = {
  "brave": [
    "That courage is real. Let's go.",
    "Brave looks good on you today.",
    "That feeling is a gift. Hold onto it.",
    "You are ready. The diary is ready. Let's begin.",
    "Brave is not the absence of fear. It is showing up anyway. You did.",
    "That is the energy. Let's carry it through the day.",
    "Something about today is already working.",
    "Brave Amara. The best kind.",
    "That is your heart speaking clearly. Trust it today.",
    "You brought your whole self. That is everything.",
    "That feeling is earned. You earned it.",
    "Today you start ahead. Let's keep it.",
    "Brave is your default setting. Today it is showing.",
    "That is real. That is yours. Nobody can take that.",
    "Carry that into the day. It will hold you.",
    "The vault recognizes this. So do we.",
    "Whatever today brings — you already have what you need.",
    "That is not small. That is everything.",
    "You walked in brave. Walk through the day the same way.",
    "This is a good beginning.",
    "Today feels like a strong page in your story.",
    "Brave showed up before anything else today. That counts.",
    "That courage does not need to be loud. It just needs to be real. It is.",
    "You are already doing it.",
    "That is the version of you that the world needs today.",
    "Brave and here. That is the whole requirement.",
    "Your heart is clear today. Follow it.",
    "That feeling is a compass. Use it.",
    "You are in a good place to face whatever comes.",
    "Something brave already happened — you opened this app.",
    "Brave is a choice you make before the day begins. You made it.",
    "That is quiet strength. The best kind.",
    "Your heart is pointing forward. That is enough.",
    "That feeling belongs to you. Nobody gave it to you. You built it.",
    "Today has good bones.",
    "The Scarlet Vault sees this. So do the people who love you.",
    "Brave and steady. Let's go.",
    "Today is already starting right.",
    "You showed up with your whole chest. That matters.",
    "That is the feeling that gets you through hard days. Keep it close.",
    "Today you are the version of yourself you want to be. Stay there.",
    "Brave does not always feel like a roar. Sometimes it feels exactly like this.",
    "You are walking in ready. That is a gift to yourself.",
    "Your heart is in good shape today. Let's take care of it.",
    "That is real courage — not because nothing is hard, but because you came anyway.",
    "Today is yours to shape. You are holding the pen.",
    "Brave Amara walked in today. The rest follows.",
    "That feeling is a signal — today you are exactly where you need to be.",
    "You are ahead of yourself in the best way.",
    "Let's honor that by making today a good page."
  ],
  "okay": [
    "Okay is enough. You showed up.",
    "Okay is honest. That already makes it good.",
    "Okay is a whole feeling. It is valid.",
    "Not every day is loud. Some days are just okay. That is fine.",
    "Okay means you are here. That is the whole job.",
    "Steady is underrated. You are steady today.",
    "Okay is not a small thing. It means you are holding.",
    "You are upright and present. That is the requirement.",
    "Okay is where most brave days start.",
    "You are in the middle — and the middle is safe ground.",
    "Okay means nothing broke today yet. That is a win.",
    "Steady and here. That is enough.",
    "Not every day needs to be great. Today can just be okay.",
    "Okay is honest. Honest is brave.",
    "You showed up as exactly what you are. That is right.",
    "Okay today might become something else by tonight. Or it might stay okay. Both are fine.",
    "You are not behind. You are exactly where you are.",
    "Okay is a full answer. Nothing is missing from it.",
    "Some of the best days start as okay.",
    "You are present. That is not nothing.",
    "Okay is not giving up. It is being real.",
    "You are holding steady. That takes something.",
    "Okay and honest beats perfect and pretending.",
    "There is dignity in okay. You are carrying it.",
    "Today does not need to be extraordinary. It just needs to be yours.",
    "Okay is a place to settle from.",
    "You are neither sinking nor flying. You are walking. That works.",
    "Okay is a foundation. You can build from here.",
    "Not every moment is a peak. Most life happens in the okay.",
    "You are functioning and present and honest. That is three things.",
    "Okay means you have room. Room to feel more, or to rest, or to just be.",
    "Steady is strength in disguise.",
    "You came in as you are. That is always the right choice.",
    "Okay and real is better than great and pretend.",
    "You are exactly where you are, and that is allowed.",
    "Some days are just Wednesday. Today might be a Wednesday. That is okay.",
    "You are not broken. You are just okay today. There is a difference.",
    "Okay is a place to land.",
    "You are holding the line. That matters.",
    "Not every feeling needs to be analyzed. Sometimes okay just is.",
    "You are present and accounted for. The diary is glad.",
    "Okay is an honest place to stand.",
    "Sometimes the bravest thing is just existing without drama. You are doing it.",
    "You are enough as you are right now in this okay moment.",
    "The world still turns in okay. So do you.",
    "You showed up without pretending. That is integrity.",
    "Okay is the most common human feeling. You are not alone in it.",
    "You are in the quiet middle. It is safe here.",
    "Okay today. Maybe more tomorrow. Either way, you are here.",
    "Okay is a complete sentence. So is this: you are enough."
  ],
  "tired": [
    "Rest is brave too. We will be gentle today.",
    "Tired is honest. Your body is telling you something true.",
    "You still came. That is not nothing.",
    "Tired means you have been working hard at something. Honor that.",
    "We will take it slow today. No rush.",
    "Being tired and still showing up — that is quiet strength.",
    "Your body deserves to be heard. We hear it.",
    "Tired is not failure. Tired is human.",
    "You do not have to perform today. Just be here.",
    "Even tired, you opened this app. That took something.",
    "Rest when you can. We will be here when you return.",
    "Tired today does not mean tired forever.",
    "Some of the bravest moments happen when we are exhausted. This might be one.",
    "You do not need to be at full power to be worthy of care.",
    "Tired is a signal, not a verdict.",
    "Even running low, you showed up. That counts in the vault.",
    "Let's be easy today. You deserve that.",
    "Tired hearts need gentle handling. We will be gentle.",
    "You carried yourself here on empty. That took strength.",
    "Rest is not giving up. It is resetting.",
    "Today we move slowly and that is exactly right.",
    "Tired is allowed. You do not need permission but here it is anyway.",
    "You are here even when it costs you. That is devotion.",
    "The diary does not require your best today. Just your honest.",
    "Tired means something was felt, something was done, something was carried. That is real.",
    "We will not ask too much of you today.",
    "Exhausted and still here — that is a kind of courage.",
    "Your tiredness is valid. So is your presence despite it.",
    "Even a dim light is still light. You are still here.",
    "Tired today. Rested soon. Both are true.",
    "You do not have to be strong right now. You just have to be here.",
    "The world can wait a moment while you settle.",
    "Tired is not the enemy. Ignoring tired is.",
    "You listened to yourself today. That is a form of wisdom.",
    "Even slow steps move forward.",
    "You showed up tired and that is the whole win today.",
    "Rest when the day allows. The diary will be here.",
    "Tired means real. Real is always welcome here.",
    "A tired heart still beats. Yours is beating. That is everything.",
    "You do not owe anyone energy you do not have.",
    "Tired and honest beats awake and pretending.",
    "Take care of the tired first. Everything else follows.",
    "Even on empty, you came. The vault sees that.",
    "You are allowed to move at whatever pace today requires.",
    "Tired is not permanent. But it is real right now, and that matters.",
    "Being here tired is still being here. It counts the same.",
    "We will not rush you. Today is a slow day and that is okay.",
    "You brought what you had. That is always enough.",
    "Tired is the body asking for kindness. Give it some today.",
    "Even tired, you are still Amara. That is still everything."
  ],
  "sad": [
    "Sadness is not weakness. You are not alone.",
    "Sad is a real feeling. It belongs here.",
    "You are allowed to feel this. Fully and without apology.",
    "Sad means something matters to you. That is not nothing.",
    "The diary holds this with you.",
    "Sad is not forever. But it is real right now and that deserves space.",
    "You named it. That is the first brave thing.",
    "Even in sadness, you showed up. That matters.",
    "This is a safe place for sad. Nothing here will shame you.",
    "Sadness is not a flaw. It is a signal from your heart.",
    "You do not have to fix it right now. Just feel it.",
    "Sad and here is still here. You are not lost.",
    "The weight is real. You do not have to carry it alone.",
    "Your sadness is valid. You do not need a reason that makes sense to anyone else.",
    "Sad days are part of a full life. You are living fully.",
    "You are not too much. Your feelings are not too much.",
    "The vault holds every feeling — especially this one.",
    "Sad is honest. Honest is always welcome here.",
    "You do not have to perform happiness today.",
    "Sad and brave can exist at the same time. You are both right now.",
    "This feeling will not swallow you. You are bigger than it.",
    "Some days are heavy. Today might be one. That is allowed.",
    "You are held, even when it does not feel that way.",
    "The Scarlet Diaries was made for days exactly like this.",
    "Sad is not a problem to be solved. It is a feeling to be felt.",
    "Your heart is speaking. This is a place where it is heard.",
    "You are not broken. You are sad. There is a difference.",
    "Sad days still count. You still count.",
    "Something is heavy today and you are still carrying it. That is strength.",
    "You are seen. Even in this.",
    "Sadness sometimes means you loved something. That is not small.",
    "You do not have to explain your sadness. It is enough that it is real.",
    "The people who built this diary love you on your sad days too.",
    "You brought your real self today. That is always the right choice.",
    "Sad is a color in the full picture of who you are. It belongs.",
    "Even in the hard feeling, you are not alone in this app.",
    "Today we sit with it. We do not rush past it.",
    "Your heart is working through something. Let it.",
    "Sad and still here is a form of resilience.",
    "You feel it deeply because you care deeply. That is not weakness.",
    "The diary was made for this feeling especially.",
    "You are not too sensitive. You are real.",
    "This sadness has a place. Right here. Leave it here.",
    "Even on a sad day, you came back. The vault remembers.",
    "Sad does not mean wrong. It means human.",
    "You are surrounded by more love than you can feel right now. That love is still real.",
    "The feeling is heavy but you are holding it. That is something.",
    "Sad is not the end of anything. It is the middle of something real.",
    "You are brave for feeling this instead of hiding it.",
    "The Scarlet Diaries holds sad days with the same care as brave ones."
  ],
  "angry": [
    "Anger means something matters. That is valid.",
    "Angry is honest. This is a place for honest.",
    "Something is not okay and your heart knows it. That is information.",
    "You are allowed to be angry. Fully.",
    "Angry is not wrong. It is a signal.",
    "The feeling is real. We do not shame it here.",
    "Something pushed back at you and you pushed back at it. That is alive.",
    "Anger is a protector. It shows up when something needs defending.",
    "You do not have to be settled today. You just have to be honest.",
    "Angry and here is still here. The diary sees you.",
    "Something is not sitting right and your body is telling you. Listen to it.",
    "Anger is energy. It means your heart is still fighting.",
    "You named it instead of hiding it. That is brave.",
    "Angry is not a problem. It is a feeling that belongs here.",
    "The Scarlet Diaries does not require you to be pleasant. It requires you to be real.",
    "Something happened or is happening and it is not okay. Your anger is right.",
    "Anger is not the opposite of love. Sometimes it is love defending itself.",
    "You do not owe anyone peace you do not feel.",
    "Angry is a complete and valid way to arrive today.",
    "The vault holds angry days with the same care as brave ones.",
    "You brought your real feeling. That is always the right choice.",
    "Anger is information. What is it telling you?",
    "Something is asking to be addressed. Your anger is pointing at it.",
    "You do not have to fix the anger. Just feel it safely here.",
    "Angry means alive. Alive is good.",
    "You are not too much. Your anger is not too much.",
    "The feeling is real and it belongs here just as much as any other.",
    "Angry and showing up is still showing up.",
    "Something is not right and you know it. That knowing matters.",
    "You are not broken for feeling this. You are honest.",
    "Anger held with awareness is not destructive. It is information.",
    "You can be angry and still be Amara. Both are true.",
    "The diary was built for days like this especially.",
    "Angry days still get recorded in the vault. They still count.",
    "Something deserves to be felt right now. Feel it.",
    "Your anger is a form of caring. It means something mattered enough to fight for.",
    "You are allowed to not be okay with what is not okay.",
    "This feeling is valid. No explanation required.",
    "Anger is often sadness with nowhere to go. Both are welcome here.",
    "You brought the real thing today. That takes guts.",
    "Even angry, you are still worthy of every good thing.",
    "The feeling is loud today and that is allowed.",
    "Angry means your heart has not given up. That is something.",
    "You do not need to perform settled. Just be real.",
    "This is a safe place to put this down for a moment.",
    "Anger is not a character flaw. It is a human response to real things.",
    "You felt it and named it. The first step is always that.",
    "Even in the fire, you are still here. That counts.",
    "The vault sees anger as proof of a heart that still cares.",
    "Whatever sparked this — your feeling about it is valid."
  ],
  "custom": [
    "Whatever it is — it belongs here.",
    "The feeling does not need a name to be real.",
    "You found your own word. That is the bravest kind of honesty.",
    "Whatever lives in that word — the diary holds it.",
    "Your own language is the most accurate one.",
    "That word is yours. No one else could have found it.",
    "Something real that only you could name. The vault holds it.",
    "You went past the list. That takes self-knowledge.",
    "The feeling is real even without a common word for it.",
    "Your version of this feeling is valid.",
    "You named something true. That is the whole point.",
    "Whatever is in that word — we receive it.",
    "Beyond the usual words is where the real stuff lives. You went there.",
    "That is a feeling only you could have found. It belongs here.",
    "The diary was made for exactly this — feelings that do not fit the list.",
    "You found language for something hard to say. That is courage.",
    "Whatever that word carries — it is safe here.",
    "The most honest feelings are often the ones that need new words.",
    "You did not settle for approximate. You found the real one.",
    "That word is a key to something true. Keep it.",
    "Your feeling is not smaller because it is unnamed by others.",
    "You reached past the obvious and found something real. That matters.",
    "Whatever it is — it is seen here.",
    "Your language for your feeling is always more accurate than anyone else's.",
    "That took courage — going past the given options to find the true one.",
    "The diary expands to hold whatever you bring. Even this.",
    "Some feelings do not have common names yet. Yours might be one of them.",
    "You trusted yourself to name it. That is self-knowledge.",
    "The word you chose is the right one. Only you could know that.",
    "Whatever lives in that word — the vault marks it as yours.",
    "Naming your own feeling is one of the most powerful things a person can do.",
    "You went looking for the honest word. You found it.",
    "Your feeling is not less real for being hard to name.",
    "That is your private language for your private truth. It belongs here.",
    "The most important feelings are often the ones that resist easy labels.",
    "You trusted your own knowing today. That is wisdom.",
    "Whatever that is — it is welcome in the Scarlet Diaries.",
    "That word holds something only you fully understand. Respect that.",
    "You went deeper than the list. The diary goes that deep too.",
    "Your own word for your own feeling. That is complete honesty.",
    "Something true that only Amara could have said. The vault holds it.",
    "The feeling is real. Your word for it is real. Both belong here.",
    "You resisted approximation. You found the true thing. That takes courage.",
    "Whatever is in that word — we receive it without judgment.",
    "Your language is always the most accurate language for your experience.",
    "Some of the most important human moments resist common vocabulary. This might be one.",
    "You found your word. Now let the diary hold it.",
    "That is the kind of honesty this app was built for.",
    "Whatever that word means to you — it matters here.",
    "You named something real. That is the whole brave thing."
  ]
};

const CHECKIN_NEXTSTEPS = [
  "Before we start — drink one glass of water.",
  "Shake out your hands. Both of them. Then let's begin.",
  "Put both feet flat on the floor. Feel the ground. Now we go.",
  "Look around and name three things you can see right now.",
  "Roll your shoulders back once. That is enough.",
  "Take three slow blinks. Let your eyes rest for a moment.",
  "Press your hands together for a moment. Then we begin.",
  "Count slowly to ten before we begin. Take your time.",
  "Name one thing in the room that is your favorite color.",
  "Stretch your arms above your head for three seconds. Then we go.",
  "Put one hand on your chest. Feel your heartbeat for a moment.",
  "Look out a window for five seconds. Then come back.",
  "Name something you are grateful for — even something very small.",
  "Wiggle your toes. Both feet. Then we begin.",
  "Let your shoulders drop. Just let them fall. Then we go.",
  "Close your eyes for three seconds. Then open them and we go.",
  "Drink something warm or cold before we start if you can.",
  "Name one thing your body is doing right now — sitting, feeling, existing.",
  "Tap your fingers on something solid near you. Feel the texture.",
  "Count backward from ten to one, slowly.",
  "Think of one person who loves you. Hold that for a second.",
  "Notice how your seat feels beneath you. Be in your body for a moment.",
  "Name one thing that made you smile in the last few days.",
  "Press your feet into the floor and just be still for a moment.",
  "Look at your hands. Then we begin.",
  "Name one color you love. Hold it in your mind for a second.",
  "Blink slowly three times.",
  "Hum quietly for three seconds. Just to yourself.",
  "Name one smell you love. Then we go.",
  "Put both palms flat on a surface near you. Feel it. Then we begin.",
  "Count five things you can feel right now — temperature, texture, pressure.",
  "Let your jaw unclench. Just notice it and let it go.",
  "Think of one place where you feel safe. Hold it for a moment.",
  "Stretch your fingers wide apart. Hold for three seconds. Release.",
  "Name one thing your body did for you today just by existing.",
  "Tap your heart three times gently. Then we go.",
  "Let your face relax. No expression needed right now.",
  "Name one word that describes something good — anything good at all.",
  "Remember — you are allowed to be exactly as you are today.",
  "Look at something far away for five seconds. Then come back.",
  "Name one thing you are looking forward to — today or any day.",
  "Let your hands rest open in your lap for a moment.",
  "Notice one sound you can hear right now.",
  "Think of one food you love. Then we begin.",
  "Say your own name quietly to yourself. Just once.",
  "Roll your wrists in slow circles. Both hands. Then we go.",
  "Name one person who makes you laugh.",
  "Let your shoulders move away from your ears. Just notice them.",
  "Think of your favorite place. Just for a moment.",
  "Notice one thing about today that is different from yesterday."
];

function randItem(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

// ── APP STATE ────────────────────────────────────────────────
let state = {
  user:            null,
  role:            null,
  selectedRole:    "",
  loginInProgress: false,
  firebaseOffline:   false,
  pendingRepair:   null,
  settings:        { ...DEFAULT_SETTINGS },
  foods:           STARTER_FOODS,
  unlockedBadges:  new Set(),
  badgeUnlockDates:{},
  appMode:         "demo",
  view:            "home",
  foodCategory:    "All",
  foodSearch:      "",
  meal: { type:null, glucose:null, items:[], hiddenChecked:false, ketones:null, lastApidra:"unknown" },
  highFlow: { glucose:null, ketones:null, symptoms:[], recentApidra:null },
  lowFlow:  { glucose:null, fastSugar:null, adult:null, recheck:null },
  checkinCheckedToday:false
};

const $app = document.getElementById("app");

// ── UTILITIES ────────────────────────────────────────────────
function esc(str){
  return String(str ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
function toast(msg){
  const old = document.querySelector(".toast");
  if(old) old.remove();
  const div = document.createElement("div");
  div.className = "toast";
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}
function setBusy(btn, text="Saving…"){
  if(!btn) return () => {};
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = text;
  return () => { btn.disabled = false; btn.innerHTML = original; };
}
function scrollUp(){ setTimeout(() => window.scrollTo({ top:0, behavior:"smooth" }), 80); }
function fmtTime(ts){
  if(!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
}
function fmtDate(ts){
  if(!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
}

// ── ROUTER ───────────────────────────────────────────────────
async function render(){
  if(!state.user) return renderLogin();
  if(state.role === "adult") return renderAdult();
  if(state.view === "home" || !state.view){
    if(await maybeRenderDailyCheckin()) return;
  }
  switch(state.view){
    case "meal":    return renderMealStart();
    case "high":    return renderHighSugar();
    case "low":     return renderLowSugar();
    case "insulin": return renderInsulinLog();
    case "feel":    return renderSymptoms();
    case "diary":   return renderDiary();
    case "vault":   return renderVault();
    case "circle":  return renderCircle();
    case "mood":    return renderMoodMirror();
    case "reports": return renderReports();
    case "pages":   return renderScarletPages();
    default:        return renderHome();
  }
}


// ── PIN + FIREBASE ROLE LOGIN HELPERS ───────────────────────
async function sha256(text){
  const bytes = new TextEncoder().encode(String(text));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,"0")).join("");
}

async function getAppModeDoc(){
  try{
    const snap = await getDoc(doc(db,"families",FAMILY_ID,"settings","appMode"));
    if(snap.exists()) return { mode:"demo", livePinsSet:false, pinHashes:{}, ...snap.data() };
  }catch(err){ console.warn("Could not read app mode yet:", err); }
  return { mode:"demo", livePinsSet:false, pinHashes:{} };
}

async function signIntoRoleFirebaseAccount(roleKey){
  const acct = ROLE_AUTH_ACCOUNTS[roleKey] || ROLE_AUTH_ACCOUNTS.amara;
  try{
    return await signInWithEmailAndPassword(auth, acct.email, acct.password);
  }catch(err){
    if(err.code === "auth/user-not-found" || err.code === "auth/invalid-credential"){
      try{
        return await createUserWithEmailAndPassword(auth, acct.email, acct.password);
      }catch(createErr){
        if(createErr.code === "auth/email-already-in-use"){
          return await signInWithEmailAndPassword(auth, acct.email, acct.password);
        }
        throw createErr;
      }
    }
    throw err;
  }
}

async function ensureRoleProfile(user, roleKey){
  const role = roleToStoredRole(roleKey);
  const acct = ROLE_AUTH_ACCOUNTS[roleKey] || ROLE_AUTH_ACCOUNTS.amara;
  await setDoc(doc(db,"users",user.uid),{
    email:acct.email,
    role,
    roleKey,
    familyId:FAMILY_ID,
    displayName:acct.displayName,
    active:true,
    demoRoleAccount:true,
    updatedAt:serverTimestamp()
  },{ merge:true });
  return { role, roleKey };
}

async function verifyPinForMode(pin, roleKey){
  const modeDoc = await getAppModeDoc();
  state.appMode = modeDoc.mode || "demo";
  if((modeDoc.mode || "demo") === "demo"){
    return pin === DEMO_PIN;
  }
  const savedHash = modeDoc.pinHashes?.[roleKey];
  if(!modeDoc.livePinsSet || !savedHash){
    throw new Error("Live PINs are not set. Ask an adult to return to Demo Mode or set live PINs.");
  }
  const enteredHash = await sha256(pin);
  return enteredHash === savedHash;
}

function canUseLocalDemoFallback(pin, roleKey, err){
  // Demo-only fallback so the app can still open during setup.
  // This is not Live Mode security and should not be used for real patient data.
  const msg = String(err?.code || err?.message || "").toLowerCase();
  return pin === DEMO_PIN && (
    msg.includes("operation-not-allowed") ||
    msg.includes("permission") ||
    msg.includes("invalid-credential") ||
    msg.includes("user-not-found") ||
    msg.includes("network") ||
    msg.includes("auth/")
  );
}

async function unlockLocalDemo(roleKey){
  const role = roleToStoredRole(roleKey);
  sessionStorage.setItem("scarletJustLoggedIn","yes");
  state.user = { uid:`local-demo-${roleKey}`, email:`${roleKey}@local.demo` };
  state.role = role;
  state.firebaseOffline = true;
  state.loginInProgress = false;
  state.appMode = "demo";
  localStorage.setItem("scarletRole", role);
  localStorage.setItem("scarletRoleKey", roleKey);
  try{
    const localFoods = await fetch("./foods.json").then(r => r.ok ? r.json() : []);
    if(Array.isArray(localFoods) && localFoods.length) state.foods = localFoods.map(f => ({ active:true, verified:true, ...f }));
  }catch(e){}
  render();
  setTimeout(() => toast("Opened in local demo mode. Firebase is not connected yet."), 200);
}

// ── LOGIN ────────────────────────────────────────────────────
function renderLogin(){
  $app.innerHTML = `
    <section class="screen center">
      <div class="app-wrapper">
        <div class="header brand-header">
          <img class="brand-logo-main" src="./assets/scarlet-diaries-header.png" alt="The Scarlet Diaries" />
          <div class="sr-only">The Scarlet Diaries</div>
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
            <p class="small muted" style="text-align:center;margin-top:14px">Demo PIN for everyone: 1111</p>
          </div>
          <div class="auth-form" id="authForm">
            <div class="form-title" id="formTitle">Enter PIN</div>
            <div class="error-msg" id="errorMsg"></div>
            <input type="password" class="form-input pin-input" id="pinInput" placeholder="4-digit PIN" inputmode="numeric" autocomplete="one-time-code" maxlength="8" />
            <button class="submit-btn" id="loginBtn"><span>🗝</span> Unlock the Diary</button>
            <button class="back-btn" id="backBtn">← Choose a different profile</button>
            <p class="small muted" style="text-align:center;margin-top:8px">For demo: everyone uses 1111. Live Mode uses private PINs per profile.</p>
          </div>
        </div>
        <div class="footer">The Scarlet Diaries · PIN Demo Login</div>
      </div>
    </section>`;

  document.querySelectorAll("[data-role]").forEach(btn => btn.onclick = () => {
    state.selectedRole = btn.dataset.role;
    document.getElementById("roleSelection").style.display = "none";
    document.getElementById("authForm").classList.add("visible");
    document.getElementById("formTitle").textContent = `${roleTitle(state.selectedRole)} PIN`;
    document.getElementById("pinInput").value = "";
    setTimeout(() => document.getElementById("pinInput")?.focus(), 80);
    hideError();
  });
  document.getElementById("backBtn").onclick = () => {
    state.selectedRole = "";
    document.getElementById("roleSelection").style.display = "block";
    document.getElementById("authForm").classList.remove("visible");
    hideError();
  };
  document.getElementById("loginBtn").onclick = () => doLogin(false);
  document.getElementById("pinInput").onkeydown = e => { if(e.key === "Enter") doLogin(false); };
}
function showError(msg){ const el = document.getElementById("errorMsg"); if(!el) return toast(msg); el.textContent = msg; el.classList.add("visible"); }
function hideError(){ const el = document.getElementById("errorMsg"); if(el) el.classList.remove("visible"); }
function roleToStoredRole(r){ return r === "amara" ? "child" : "adult"; }
function roleTitle(r){ return ({amara:"🩸 Welcome, Amara",mom:"🌙 Welcome, Mom",dad:"⚡ Welcome, Dad",tita:"🔮 Welcome, Tita"})[r] || "Enter Your Details"; }

// ── PROFILE REPAIR ───────────────────────────────────────────
function renderProfileRepair(){
  const repair = state.pendingRepair;
  if(!repair){ renderLogin(); return; }
  const roleName = ({amara:"Amara",mom:"Mom",dad:"Dad",tita:"Tita"})[repair.roleKey] || repair.roleKey;
  $app.innerHTML = `
    <section class="screen center">
      <div class="app-wrapper">
        <div class="header brand-header">
          <img class="brand-logo-main" src="./assets/scarlet-diaries-header.png" alt="The Scarlet Diaries" />
          <div class="sr-only">The Scarlet Diaries</div>
          <div class="tagline">Every drop. Every breath. Unstoppable.</div>
          <div class="build-tag">${BUILD}</div>
        </div>
        <div class="login-card">
          <div class="form-title">Profile Repair Needed</div>
          <p class="muted small" style="text-align:center;line-height:1.5">This email can sign in, but it does not yet have a Scarlet profile.</p>
          <div class="card" style="box-shadow:none">
            <div class="kv"><span>Email</span><strong>${esc(repair.email)}</strong></div>
            <div class="kv"><span>Create profile as</span><strong>${esc(roleName)}</strong></div>
          </div>
          <button class="submit-btn" id="repairBtn">Create Scarlet Profile</button>
          <button class="back-btn" id="repairCancel">Cancel and choose another role</button>
        </div>
        <div class="footer">The Scarlet Diaries · Private &amp; Protected</div>
      </div>
    </section>`;

  document.getElementById("repairCancel").onclick = async () => {
    state.pendingRepair = null; state.loginInProgress = false;
    sessionStorage.removeItem("scarletJustLoggedIn");
    await signOut(auth); renderLogin();
  };
  document.getElementById("repairBtn").onclick = async () => {
    const btn = document.getElementById("repairBtn");
    const restore = setBusy(btn, "Creating profile…");
    try{
      const { user, email, role, roleKey } = state.pendingRepair;
      await setDoc(doc(db,"users",user.uid),{
        email, role, roleKey, familyId:FAMILY_ID,
        displayName: role === "child" ? "Amara" : roleKey,
        active:true, repairedAt:serverTimestamp(), updatedAt:serverTimestamp()
      },{ merge:true });
      toast("Scarlet profile created.");
      sessionStorage.setItem("scarletJustLoggedIn","yes");
      state.user = user; state.role = role;
      state.pendingRepair = null; state.loginInProgress = false;
      localStorage.setItem("scarletRole", role);
      localStorage.setItem("scarletRoleKey", roleKey);
      await safeEnsureDefaults(); await loadData(); render();
    }catch(err){
      console.error(err);
      toast(String(err.message||"").toLowerCase().includes("permission")
        ? "Profile repair blocked. Please publish the firestore.rules file."
        : "Could not repair profile yet. Please try again.");
    }finally{ restore(); }
  };
}

// ── DO LOGIN ─────────────────────────────────────────────────
async function doLogin(create=false){
  const pin     = document.getElementById("pinInput")?.value.trim() || "";
  const roleKey = state.selectedRole || "amara";
  const role    = roleToStoredRole(roleKey);

  if(!/^\d{4,8}$/.test(pin)) return showError("Please enter your PIN.");

  const btn = document.getElementById("loginBtn");
  const originalText = btn ? btn.innerHTML : "";
  try{
    state.loginInProgress = true;
    if(btn){ btn.disabled = true; btn.innerHTML = "Unlocking…"; }
    hideError();

    const cred = await signIntoRoleFirebaseAccount(roleKey);
    await ensureRoleProfile(cred.user, roleKey);

    const ok = await verifyPinForMode(pin, roleKey);
    if(!ok){
      await signOut(auth);
      state.loginInProgress = false;
      return showError(state.appMode === "live" ? "Incorrect live PIN for this profile." : "Incorrect demo PIN. Use 1111 for the demo.");
    }

    const userSnap = await getDoc(doc(db,"users",cred.user.uid));
    const profile = userSnap.exists() ? userSnap.data() : {};
    if(profile.active === false){
      await signOut(auth); state.loginInProgress = false;
      return showError("This profile is not active. Please ask an adult to check it.");
    }

    sessionStorage.setItem("scarletJustLoggedIn","yes");
    state.user = cred.user; state.role = role; state.loginInProgress = false;
    localStorage.setItem("scarletRole", role);
    localStorage.setItem("scarletRoleKey", roleKey);
    await safeEnsureDefaults(); await loadData(); render();

  }catch(err){
    console.error(err); state.loginInProgress = false;
    try{ await signOut(auth); }catch(e){}
    if(canUseLocalDemoFallback(pin, roleKey, err)){
      await unlockLocalDemo(roleKey);
      return;
    }
    if(String(err.message||"").includes("Live PINs are not set")) showError(err.message);
    else if(err.code === "auth/operation-not-allowed") showError("Firebase Email/Password sign-in is not enabled yet. Enable it in Firebase Auth, or use local demo fallback.");
    else if(String(err.message||"").toLowerCase().includes("permission")) showError("Firebase permissions blocked login setup. Please publish the firestore.rules file, then try again.");
    else showError(`Could not unlock yet: ${err.code || err.message || "Firebase setup issue"}`);
  }finally{
    if(btn){ btn.disabled = false; btn.innerHTML = originalText; }
  }
}

// ── ENSURE DEFAULTS ──────────────────────────────────────────
async function safeEnsureDefaults(){
  try{ await ensureDefaults(); }
  catch(err){ console.warn("Starter setup skipped or blocked:", err); }
}
async function ensureDefaults(){
  const settingsRef = doc(db,"families",FAMILY_ID,"children",CHILD_ID,"settings","current");
  const snap = await getDoc(settingsRef);
  if(!snap.exists()) await setDoc(settingsRef,{ ...DEFAULT_SETTINGS, updatedAt:serverTimestamp() });

  const foodCheck = await getDocs(query(collection(db,"families",FAMILY_ID,"foodLibrary"), limit(1)));
  if(foodCheck.empty){
    for(const food of STARTER_FOODS){
      const foodId = food.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
      await setDoc(doc(db,"families",FAMILY_ID,"foodLibrary",foodId),{
        ...food, familyId:FAMILY_ID, verified:food.source==="Family starter", favorite:!!food.favorite, active:true, updatedAt:serverTimestamp()
      },{ merge:true });
    }
  }
  const badgeCheck = await getDocs(query(collection(db,"families",FAMILY_ID,"badges"), limit(1)));
  if(badgeCheck.empty){
    for(const badge of BADGES) await setDoc(doc(db,"families",FAMILY_ID,"badges",badge.id), badge, { merge:true });
  }
}

// ── LOAD DATA ────────────────────────────────────────────────
async function loadData(){
  try{
    const settingsSnap = await getDoc(doc(db,"families",FAMILY_ID,"children",CHILD_ID,"settings","current"));
    if(settingsSnap.exists()) state.settings = { ...DEFAULT_SETTINGS, ...settingsSnap.data() };

    try{
      const localFoods = await fetch("./foods.json").then(r => r.ok ? r.json() : []);
      if(Array.isArray(localFoods) && localFoods.length) state.foods = localFoods.map(f => ({ active:true, verified:true, ...f }));
    }catch(e){ console.warn("Local foods.json unavailable, using starter foods.", e); state.foods = STARTER_FOODS; }

    try{
      const firestoreFoodsSnap = await getDocs(query(collection(db,"families",FAMILY_ID,"foodLibrary"), where("active","==",true), limit(120)));
      if(!firestoreFoodsSnap.empty){
        const ffMap = new Map(state.foods.map(f => [f.id||f.name, f]));
        firestoreFoodsSnap.docs.forEach(d => ffMap.set(d.id||d.data().name, { id:d.id, ...d.data() }));
        state.foods = Array.from(ffMap.values());
      }
    }catch(e){ console.warn("Firestore food library unavailable; using local foods.json.", e); }

    try{
      const unlockSnap = await getDocs(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"badgeUnlocks"));
      state.unlockedBadges = new Set(unlockSnap.docs.map(d => d.id));
      state.badgeUnlockDates = {};
      unlockSnap.docs.forEach(d => {
        const dat = d.data();
        if(dat.createdAt) state.badgeUnlockDates[d.id] = dat.createdAt;
      });
    }catch(e){ console.warn("Badge unlocks unavailable yet.", e); state.unlockedBadges = new Set(); }

    try{
      const appModeSnap = await getDoc(doc(db,"families",FAMILY_ID,"settings","appMode"));
      if(appModeSnap.exists()) state.appMode = appModeSnap.data().mode || "demo";
    }catch(e){ state.appMode = "demo"; }

  }catch(err){ console.warn("Data load issue:", err); }
}

// ── LAYOUT WRAPPER (child views) ──────────────────────────────
function layout(content, active="home"){
  $app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="logo-lockup">
          <div class="logo-small brand-mark"><img src="./assets/scarlet-diaries-header.png" alt="The Scarlet Diaries" /></div>
          <div class="topbar-title">
            <strong>The Scarlet Diaries</strong>
            <p class="small muted">Every drop. Every breath. Unstoppable.</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${state.firebaseOffline ? `<span class="build-tag warning-tag">LOCAL DEMO</span>` : ""}<span class="build-tag">${BUILD}</span>
          <button class="btn secondary" data-action="logout">Exit</button>
        </div>
      </div>
      ${content}
      <nav class="nav">
        <button class="${active==="home"?"active":""}" data-view="home">Home</button>
        <button class="${active==="meal"?"active":""}" data-view="meal">Meal</button>
        <button class="${active==="diary"?"active":""}" data-view="diary">Entry</button>
        <button class="${active==="vault"?"active":""}" data-view="vault">Vault</button>
        <button class="${active==="reports"?"active":""}" data-view="reports">Reports</button>
      </nav>
    </div>`;
  bindGlobal();
}
function bindGlobal(){
  document.querySelectorAll("button").forEach(btn => {
    if(btn.dataset.tapBound) return;
    btn.dataset.tapBound = "1";
    btn.addEventListener("pointerdown", () => btn.classList.add("is-pressed"));
    btn.addEventListener("pointerup",   () => setTimeout(() => btn.classList.remove("is-pressed"), 120));
    btn.addEventListener("pointerleave",() => btn.classList.remove("is-pressed"));
  });
  document.querySelectorAll("[data-view]").forEach(btn => btn.onclick = () => { state.view = btn.dataset.view; render(); });
  const logoutBtn = document.querySelector("[data-action='logout']");
  if(logoutBtn) logoutBtn.onclick = () => signOut(auth);
}

// ── FLOW DONE ────────────────────────────────────────────────
function renderFlowDone({ title="Saved", message="", next=[] } = {}){
  layout(`
    <div class="card success">
      <h2>${esc(title)}</h2>
      <p class="muted" style="margin-top:8px">${esc(message)}</p>
    </div>
    <div class="grid single">
      ${next.map(n => `<button class="action ${n.className||""}" data-next="${n.view}"><strong>${esc(n.title)}</strong><span>${esc(n.sub||"")}</span></button>`).join("")}
      <button class="action scarlet" data-next="home"><strong>Back Home</strong><span>Return to Amara's home screen.</span></button>
    </div>`, "home");
  document.querySelectorAll("[data-next]").forEach(btn => btn.onclick = () => { state.view = btn.dataset.next; render(); });
}

// ── HOME ─────────────────────────────────────────────────────

function todayKey(){
  return new Date().toISOString().slice(0,10);
}

async function hasDoneCheckinToday(){
  if(state.firebaseOffline){
    return localStorage.getItem(`scarletDailyCheckin:${todayKey()}`) === "yes";
  }
  try{
    const snap = await getDocs(
      query(
        collection(db,"families",FAMILY_ID,"children",CHILD_ID,"moodLogs"),
        where("source","==","daily-checkin"),
        where("dateKey","==",todayKey()),
        limit(1)
      )
    );
    return !snap.empty;
  }catch(e){
    console.warn("Daily check-in check skipped:", e);
    return true;
  }
}

async function maybeRenderDailyCheckin(){
  if(state.role !== "child") return false;
  if(state.view !== "home") return false;
  if(state.checkinCheckedToday) return false;
  const done = await hasDoneCheckinToday();
  state.checkinCheckedToday = true;
  if(done) return false;
  renderDailyCheckin();
  return true;
}

function renderDailyCheckin(){
  const selectedQuestion = randItem(CHECKIN_QUESTIONS);
  const moods = [
    {key:"brave", label:"Brave", icon:"🗡️"},
    {key:"okay", label:"Okay", icon:"🌙"},
    {key:"tired", label:"Tired", icon:"🕯️"},
    {key:"sad", label:"Sad", icon:"💧"},
    {key:"angry", label:"Angry", icon:"🔥"},
    {key:"custom", label:"Something only I can name", icon:"✒️"}
  ];
  $app.innerHTML = `
    <section class="screen checkin-screen">
      <div class="checkin-wrap">
        <img class="checkin-logo" src="./assets/scarlet-diaries-header.png" alt="The Scarlet Diaries" />
        <div class="checkin-card">
          <p class="checkin-label">just for you</p>
          <h1>${esc(selectedQuestion)}</h1>
          <p class="muted">There is no wrong answer.</p>
          <div class="checkin-mood-grid">
            ${moods.map(m => `<button class="checkin-mood" data-mood="${m.key}"><span>${m.icon}</span><strong>${m.label}</strong></button>`).join("")}
          </div>
          <div id="customCheckinBox" class="custom-checkin-box" style="display:none">
            <div class="field">
              <label>Your own word</label>
              <input id="customCheckinText" placeholder="Write the word only you know" />
            </div>
            <button class="btn scarlet full" id="continueCustomCheckin">Continue</button>
          </div>
          <button class="btn secondary full" style="margin-top:12px" id="skipCheckinToday">Skip for now</button>
        </div>
      </div>
    </section>`;
  bindGlobal();

  async function chooseMood(moodKey, customText=""){
    const selectedResponse = randItem(CHECKIN_RESPONSES[moodKey] || CHECKIN_RESPONSES.custom);
    const selectedNextStep = randItem(CHECKIN_NEXTSTEPS);
    await saveDailyCheckin({ moodKey, customText, selectedQuestion, selectedResponse, selectedNextStep });
    renderDailyCheckinResponse({ moodKey, customText, selectedResponse, selectedNextStep });
  }

  document.querySelectorAll("[data-mood]").forEach(btn => btn.onclick = () => {
    const mood = btn.dataset.mood;
    if(mood === "custom"){
      document.getElementById("customCheckinBox").style.display = "block";
      setTimeout(() => document.getElementById("customCheckinText")?.focus(), 80);
      return;
    }
    chooseMood(mood);
  });

  document.getElementById("continueCustomCheckin").onclick = () => {
    const text = document.getElementById("customCheckinText").value.trim();
    if(!text) return toast("Write one word or short phrase.");
    chooseMood("custom", text);
  };

  document.getElementById("skipCheckinToday").onclick = () => {
    state.checkinCheckedToday = true;
    renderHome();
  };
}

async function saveDailyCheckin({ moodKey, customText, selectedQuestion, selectedResponse, selectedNextStep }){
  const key = todayKey();
  if(state.firebaseOffline){
    localStorage.setItem(`scarletDailyCheckin:${key}`, "yes");
    const logs = JSON.parse(localStorage.getItem("scarletLocalMoodLogs") || "[]");
    logs.unshift({ mood:moodKey, moodCustom:customText || null, source:"daily-checkin", dateKey:key, createdAt:new Date().toISOString() });
    localStorage.setItem("scarletLocalMoodLogs", JSON.stringify(logs.slice(0,100)));
  }else{
    await addDoc(
      collection(db,"families",FAMILY_ID,"children",CHILD_ID,"moodLogs"),{
        mood: moodKey,
        moodCustom: customText || null,
        source: "daily-checkin",
        dateKey: key,
        questionShown: selectedQuestion,
        responseShown: selectedResponse,
        nextStepShown: selectedNextStep,
        createdAt: serverTimestamp(),
        enteredBy: state.user.uid
      }
    );
    if(customText){
      await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"diaryEntries"),{
        mood:"custom",
        prompt:"Daily check-in",
        entry:customText,
        source:"daily-checkin",
        privacy:"private",
        createdAt:serverTimestamp(),
        enteredBy:state.user.uid
      });
    }
  }

  await unlockBadge("steady-spark");
  if(["sad","angry","tired"].includes(moodKey)){
    await unlockBadge("girl-who-stayed");
    await unlockBadge("truth-teller");
  }
  if(["sad","angry"].includes(moodKey)) await unlockBadge("soft-monster-tamer");
  if(moodKey === "sad") await unlockBadge("moonlit-heart");
  if(customText) await unlockBadge("brave-page");
}

function renderDailyCheckinResponse({ moodKey, customText, selectedResponse, selectedNextStep }){
  let wentHome = false;
  $app.innerHTML = `
    <section class="screen checkin-screen">
      <div class="checkin-wrap">
        <img class="checkin-logo" src="./assets/scarlet-diaries-header.png" alt="The Scarlet Diaries" />
        <div class="checkin-card response">
          <p class="checkin-label">${esc(customText || moodKey)}</p>
          <h1>${esc(selectedResponse)}</h1>
          <p class="checkin-next">${esc(selectedNextStep)}</p>
          <div class="grid single" style="margin-top:18px">
            <button class="action scarlet" id="checkinWrite"><strong>Write a Scarlet Entry</strong><span>Put the feeling somewhere safe.</span></button>
            <button class="action" id="checkinHome"><strong>Go home</strong><span>Start the app.</span></button>
          </div>
        </div>
      </div>
    </section>`;
  bindGlobal();
  const goHome = () => {
    if(wentHome) return;
    wentHome = true;
    renderHome();
  };
  document.getElementById("checkinHome").onclick = goHome;
  document.getElementById("checkinWrite").onclick = () => {
    if(wentHome) return;
    wentHome = true;
    state.view = "diary";
    renderDiary();
  };
  setTimeout(goHome, 3000);
}


function renderHome(){
  layout(`
    <div class="card dark">
      <p class="pill">Amara's private safety diary</p>
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
      <button class="action" data-go="feel"><strong>I Don't Feel Well</strong><span>Tell the diary what your body feels.</span></button>
      <button class="action plum" data-go="diary"><strong>Write a Scarlet Entry</strong><span>Give your feelings a place to go.</span></button>
      <button class="action plum" data-go="pages"><strong>My Scarlet Pages</strong><span>Reread the words that prove you kept going.</span></button>
      <button class="action plum" data-go="vault"><strong>Open The Scarlet Vault</strong><span>Proof that you kept going.</span></button>
      <button class="action" data-go="mood"><strong>Mood Mirror</strong><span>See feelings without shame.</span></button>
      <button class="action" data-go="circle"><strong>Call My Circle</strong><span>Mom, Dad, Tita.</span></button>
    </div>`, "home");
  document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { state.view = b.dataset.go; render(); });
}

// ── MEAL FLOW ────────────────────────────────────────────────
function renderMealStart(){
  state.meal = { type:null, glucose:null, items:[], hiddenChecked:false, ketones:null, lastApidra:"unknown" };
  layout(`
    <div class="card">
      <h2>Before I Eat</h2>
      <p class="muted">First, choose what you're having.</p>
    </div>
    <div class="grid">
      ${["Morning Meal","Midday Meal","Evening Meal","Small Bite"].map(m => `
        <button class="action" data-meal="${m}"><strong>${m}</strong><span>Start meal safety steps.</span></button>
      `).join("")}
    </div>`, "meal");
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
    </div>`, "meal");
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
    <div class="card ${g>=state.settings.urgentHighThreshold?"danger":"warning"}">
      <h2>${g>=state.settings.urgentHighThreshold?"Very high sugar":"High sugar before meal"}</h2>
      <p class="muted">High sugar can leave warning signs. Let's check if we can.</p>
      <div class="divider-line"></div>
      <p><strong>Glucose:</strong> ${g} mg/dL</p>
      <p class="small muted" style="margin-top:6px">Please check ketones if strips are available. Tell your Circle now. If there are no strips, log it honestly so adults can help.</p>
    </div>
    <div class="grid single">
      ${["I checked — negative","Trace / small","Moderate / large","No strips","I don't know how","Adult not available"].map(k => `
        <button class="action" data-ketone="${k}"><strong>${k}</strong><span>Save ketone status.</span></button>
      `).join("")}
    </div>`, "meal");
  document.querySelectorAll("[data-ketone]").forEach(btn => btn.onclick = async () => {
    state.meal.ketones = btn.dataset.ketone;
    await addKetoneLog(g, btn.dataset.ketone);
    if(btn.dataset.ketone === "No strips") await unlockBadge("truth-keeper");
    if(btn.dataset.ketone.includes("checked")){ await unlockBadge("ketone-seer"); }
    if(g >= state.settings.urgentHighThreshold) await createAlert("urgent_high","red",`Amara logged glucose ${g}. Ketone status: ${btn.dataset.ketone}.`);
    else await createAlert("high","orange",`Amara logged glucose ${g}. Ketone status: ${btn.dataset.ketone}.`);
    if(btn.dataset.ketone === "Moderate / large") return renderEmergency("Moderate or large ketones need adult help now.");
    if(next === "meal") renderFoodBuilder(); else renderHighSugarSafety();
  });
}

function renderFoodBuilder(){
  const categories = ["All","Breakfast Favorites","Meal Favorites","Meals","Rice / Bread / Pasta","Snacks & Sweets","Drinks","Fruit","Sauces / Hidden Carbs","Search","Add Food"];
  const foodCarbs  = state.meal.items.reduce((s,x) => s + Number(x.carbs||0), 0);
  const hasFood    = state.meal.items.length > 0;

  const itemsHtml = state.meal.items.map((it,i) => `
    <div class="list-item meal-item">
      <div>
        <strong>${esc(it.name)}</strong>
        <span class="small muted">${esc(it.portion)} · ${it.carbs}g carbs</span>
      </div>
      <button class="btn secondary" data-remove="${i}">Remove</button>
    </div>`).join("") || `<p class="muted small">No food added yet. Choose food below.</p>`;

  layout(`
    <div class="card dark">
      <h2>Choose Food</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Tap what is on your plate.</p>
    </div>
    <div class="card" id="mealSoFar">
      <h3>Meal so far</h3>
      <div class="list">${itemsHtml}</div>
      <div class="divider-line"></div>
      <div class="kv"><span>Total food carbs</span><strong>${foodCarbs}g</strong></div>
      ${hasFood ? `
        <div class="btn-row" style="margin-top:10px">
          <button class="btn scarlet" id="goHidden">Continue</button>
          <button class="btn secondary" id="skipHidden">No hidden carbs</button>
        </div>` : `<p class="muted small" style="margin-top:10px">Add food first. The hidden-carb check comes after food is added.</p>`}
    </div>
    <div class="card">
      <h3>Choose a food group</h3>
      <div class="food-category-grid">
        ${categories.map(c => `<button class="food-chip ${state.foodCategory===c?"active":""}" data-food-cat="${c}">${c}</button>`).join("")}
      </div>
      <div class="field">
        <label>Search food by name or first letters</label>
        <input id="foodSearch" value="${esc(state.foodSearch||"")}" placeholder="Try r, rice, milk, pita…" />
      </div>
      <div id="foodResults" class="list food-results"></div>
    </div>`, "meal");

  document.querySelectorAll("[data-food-cat]").forEach(btn => btn.onclick = () => {
    state.foodCategory = btn.dataset.foodCat;
    state.foodSearch = "";
    if(state.foodCategory === "Add Food") renderCustomFoodForm("meal");
    else renderFoodBuilder();
  });
  const searchInput = document.getElementById("foodSearch");
  if(searchInput) searchInput.oninput = () => { state.foodSearch = searchInput.value; drawFoodResults(); };

  function drawFoodResults(){
    const results = document.getElementById("foodResults");
    if(!results) return;
    let foods = state.foods.filter(f => f.active !== false);
    const term = (state.foodSearch||"").toLowerCase().trim();
    if(state.foodCategory === "All" || state.foodCategory === "Search"){
      if(term) foods = foods.filter(f => `${f.name} ${f.category} ${f.tags||""}`.toLowerCase().startsWith(term) || `${f.name} ${f.category} ${f.tags||""}`.toLowerCase().includes(term));
      else if(state.foodCategory === "Search") foods = foods.filter(f => f.favorite).slice(0,20);
    }else{
      foods = foods.filter(f => f.category === state.foodCategory);
      if(term) foods = foods.filter(f => `${f.name} ${f.category} ${f.tags||""}`.toLowerCase().startsWith(term) || `${f.name} ${f.category} ${f.tags||""}`.toLowerCase().includes(term));
    }
    foods = foods.sort((a,b) => Number(!!b.favorite)-Number(!!a.favorite) || String(a.name).localeCompare(String(b.name))).slice(0,40);
    if(!foods.length){ results.innerHTML = `<p class="muted small">No food found. Try All, Search, or Add Food.</p>`; return; }
    results.innerHTML = foods.map((f,i) => `
      <div class="food-card">
        <div>
          <strong>${esc(f.name)}</strong>
          <span class="small muted">${esc(f.usualPortion||f.portion||"serving")} · ${Number(f.usualCarbs??f.carbs??0)}g carbs</span>
          <div class="confidence">${esc(f.category||"Food")}</div>
        </div>
        <button class="btn scarlet" data-choose-food="${i}">Choose</button>
      </div>`).join("");
    results.querySelectorAll("[data-choose-food]").forEach(btn => btn.onclick = () => {
      const restore = setBusy(btn, "Opening…");
      const food = foods[Number(btn.dataset.chooseFood)];
      setTimeout(() => { restore(); renderPortionChooser(food); }, 120);
    });
  }
  drawFoodResults();

  document.querySelectorAll("[data-remove]").forEach(btn => btn.onclick = () => {
    state.meal.items.splice(Number(btn.dataset.remove),1);
    toast("Removed."); renderFoodBuilder();
  });
  const goHidden = document.getElementById("goHidden");
  if(goHidden) goHidden.onclick = () => { if(!state.meal.items.length) return toast("Add at least one food first."); renderHiddenCarbs(); };
  const skipHidden = document.getElementById("skipHidden");
  if(skipHidden) skipHidden.onclick = () => { if(!state.meal.items.length) return toast("Add at least one food first."); state.meal.hiddenChecked = true; renderMealEstimate(); };
  scrollUp();
}

function renderPortionChooser(food){
  const portions = Array.isArray(food.portionOptions) && food.portionOptions.length
    ? food.portionOptions.map(p => ({ label:p.label||p.portion, portion:p.portion||p.label, carbs:Number(p.carbs||0) }))
    : [
      { label:food.smallPortion||"small serving",           portion:food.smallPortion||"small serving",           carbs:Number(food.smallCarbs??Math.round(Number(food.carbs||0)*.5)) },
      { label:food.usualPortion||food.portion||"usual serving", portion:food.usualPortion||food.portion||"usual serving", carbs:Number(food.usualCarbs??food.carbs??0) },
      { label:food.largePortion||"large serving",           portion:food.largePortion||"large serving",           carbs:Number(food.largeCarbs??Math.round(Number(food.carbs||0)*1.5)) }
    ];
  layout(`
    <div class="card dark">
      <button class="btn secondary" id="backToFoodGroups">← Back to Foods</button>
      <h2 style="margin-top:12px">${esc(food.name)}</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Choose the closest measured portion.</p>
    </div>
    <div class="grid single">
      ${portions.map((p,i) => `
        <button class="action" data-portion="${i}">
          <strong>${esc(p.label)}</strong>
          <span>${esc(p.portion)} · ${p.carbs}g carbs</span>
        </button>`).join("")}
      <button class="action" id="customPortionBtn"><strong>Custom carbs</strong><span>Use this if an adult knows the carb count.</span></button>
    </div>`, "meal");
  document.getElementById("backToFoodGroups").onclick = () => renderFoodBuilder();
  document.querySelectorAll("[data-portion]").forEach(btn => btn.onclick = () => {
    const restore = setBusy(btn, "Adding…");
    const p = portions[Number(btn.dataset.portion)];
    state.meal.items.push({ ...food, portion:p.portion, carbs:p.carbs, calories:Math.round(Number(food.calories||0)*(p.carbs/Math.max(Number(food.carbs||food.usualCarbs||p.carbs||1),1))) });
    setTimeout(() => { restore(); toast("Food added."); renderMealAdded(food.name); }, 180);
  });
  document.getElementById("customPortionBtn").onclick = () => renderCustomPortion(food);
  scrollUp();
}

function renderMealAdded(foodName){
  const foodCarbs = state.meal.items.reduce((s,x) => s + Number(x.carbs||0), 0);
  layout(`
    <div class="card success">
      <h2>Added ✓</h2>
      <p class="muted">${esc(foodName)} was added to the meal.</p>
    </div>
    <div class="card">
      <h3>Meal so far</h3>
      <div class="list">
        ${state.meal.items.map((it,i) => `
          <div class="list-item meal-item">
            <div>
              <strong>${esc(it.name)}</strong>
              <span class="small muted">${esc(it.portion)} · ${it.carbs}g carbs</span>
            </div>
            <button class="btn secondary" data-remove="${i}">Remove</button>
          </div>`).join("")}
      </div>
      <div class="divider-line"></div>
      <div class="kv"><span>Total food carbs</span><strong>${foodCarbs}g</strong></div>
    </div>
    <div class="grid single">
      <button class="action" id="addMoreFood"><strong>Add more food</strong><span>Go back to food groups.</span></button>
      <button class="action scarlet" id="continueHidden"><strong>Continue</strong><span>Check sauces, breading, drinks, or hidden carbs.</span></button>
    </div>`, "meal");
  document.querySelectorAll("[data-remove]").forEach(btn => btn.onclick = () => {
    state.meal.items.splice(Number(btn.dataset.remove),1);
    toast("Removed.");
    if(state.meal.items.length) renderMealAdded("Food"); else renderFoodBuilder();
  });
  document.getElementById("addMoreFood").onclick = () => renderFoodBuilder();
  document.getElementById("continueHidden").onclick = () => renderHiddenCarbs();
  scrollUp();
}

function renderCustomPortion(food){
  layout(`
    <div class="card">
      <button class="btn secondary" id="backToPortions">← Back to portions</button>
      <h2 style="margin-top:12px">Custom Carbs</h2>
      <p class="muted">Use this only if an adult or label knows the carb count.</p>
      <div class="field"><label>Portion description</label><input id="customPortionText" placeholder="Example: half plate, 1 pack, 3 pieces" /></div>
      <div class="field"><label>Carbs (grams)</label><input id="customPortionCarbs" type="number" inputmode="numeric" placeholder="grams of carbs" /></div>
      <button class="btn scarlet full" id="addCustomPortion">Add to meal</button>
    </div>`, "meal");
  document.getElementById("backToPortions").onclick = () => renderPortionChooser(food);
  document.getElementById("addCustomPortion").onclick = () => {
    const btn = document.getElementById("addCustomPortion");
    const restore = setBusy(btn, "Adding…");
    const portion = document.getElementById("customPortionText").value.trim() || "custom portion";
    const carbs   = Number(document.getElementById("customPortionCarbs").value);
    if(isNaN(carbs) || carbs < 0){ restore(); return toast("Enter carbs."); }
    state.meal.items.push({ ...food, portion, carbs });
    restore(); toast("Food added."); renderMealAdded(food.name);
  };
  scrollUp();
}

function renderCustomFoodForm(returnTo="meal"){
  layout(`
    <div class="card dark">
      <button class="btn secondary" id="backFromAddFood">← Back to food groups</button>
      <h2 style="margin-top:12px">Add a Food</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Ask an adult to help enter the carb count from a label.</p>
    </div>
    <div class="card">
      <div class="field"><label>Food name</label><input id="cfName" placeholder="Example: Homemade arroz caldo" /></div>
      <div class="field"><label>Portion</label><input id="cfPortion" placeholder="Example: 1 bowl, 1 cup" /></div>
      <div class="field"><label>Carbs (grams)</label><input id="cfCarbs" type="number" inputmode="numeric" placeholder="From label or estimate" /></div>
      <button class="btn scarlet full" id="saveCustomFood">Add this food to meal</button>
    </div>`, "meal");
  document.getElementById("backFromAddFood").onclick = () => { state.foodCategory = "All"; renderFoodBuilder(); };
  document.getElementById("saveCustomFood").onclick = () => {
    const btn = document.getElementById("saveCustomFood");
    const restore = setBusy(btn, "Adding…");
    const name    = document.getElementById("cfName").value.trim();
    const portion = document.getElementById("cfPortion").value.trim() || "1 serving";
    const carbs   = Number(document.getElementById("cfCarbs").value);
    if(!name){ restore(); return toast("Enter a food name."); }
    if(isNaN(carbs) || carbs < 0){ restore(); return toast("Enter carbs."); }
    const food = { name, category:"Meals", portion, carbs, calories:0, source:"Custom - adult entered", confidence:"Low" };
    state.meal.items.push(food);
    restore(); toast("Food added."); renderMealAdded(name);
  };
  scrollUp();
}

function renderHiddenCarbs(){
  const options = [
    { name:"Ketchup / sweet sauce", portions:[["1 tsp",2],["1 tbsp",5],["2 tbsp",10],["1/4 cup",20]] },
    { name:"Gravy",                 portions:[["1 tbsp",2],["1/4 cup",6],["1/2 cup",12]] },
    { name:"Breading",              portions:[["thin coating",5],["usual coating",8],["heavy coating",15]] },
    { name:"Honey / syrup",         portions:[["1 tsp",6],["1 tbsp",17],["2 tbsp",34]] },
    { name:"Sweet drink",           portions:[["1/2 cup",12],["1 cup",25],["1 bottle/can",39]] }
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
    <div class="list" style="margin:0 14px">
      ${options.map((o,i) => `
        <div class="card">
          <h3>${esc(o.name)}</h3>
          <div class="hidden-carb-grid">
            ${o.portions.map((p,j) => `<button class="btn secondary" data-hidden="${i}" data-portion="${j}">${esc(p[0])}<br><span>+${p[1]}g</span></button>`).join("")}
          </div>
        </div>`).join("")}
    </div>
    <div class="grid single">
      <button class="action" id="notSureHidden"><strong>I'm not sure</strong><span>Ask an adult before dosing.</span></button>
      <button class="action scarlet" id="finishHidden"><strong>Continue to suggested Apidra</strong><span>Show the total estimate.</span></button>
    </div>`, "meal");
  document.getElementById("backToMeal").onclick = () => renderMealAdded("Meal");
  document.querySelectorAll("[data-hidden]").forEach(btn => btn.onclick = async () => {
    const restore = setBusy(btn, "Adding…");
    const o = options[Number(btn.dataset.hidden)];
    const p = o.portions[Number(btn.dataset.portion)];
    state.meal.items.push({ name:o.name, category:"Sauces / Hidden Carbs", portion:p[0], carbs:Number(p[1]), calories:0, source:"Hidden carb estimate" });
    state.meal.hiddenChecked = true;
    await unlockBadge("hidden-carb-hunter");
    setTimeout(() => { restore(); btn.classList.add("added"); btn.innerHTML = `Added ✓<br><span>+${p[1]}g</span>`; toast(`Added ${p[1]}g hidden carbs.`); }, 150);
  });
  document.getElementById("notSureHidden").onclick = async () => {
    await createAlert("hidden_carbs_unsure","orange","Amara was not sure about hidden carbs before eating.");
    toast("Adult help note saved.");
  };
  document.getElementById("finishHidden").onclick = async () => {
    const restore = setBusy(document.getElementById("finishHidden"), "Calculating…");
    state.meal.hiddenChecked = true;
    await unlockBadge("plate-whisperer");
    restore(); renderMealEstimate();
  };
  scrollUp();
}

function roundDose(raw){ const u = Number(state.settings.doseRounding||1); return Math.round(raw/u)*u; }
function getCorrection(glucose){
  if(glucose > 250) return Number(state.settings.preMealCorrection250||4);
  if(glucose > 180) return Number(state.settings.preMealCorrection180||2);
  return 0;
}

function renderMealEstimate(){
  const carbs     = state.meal.items.reduce((s,x) => s + Number(x.carbs||0), 0);
  const carbDose  = roundDose(carbs / Number(state.settings.carbRatio||8));
  const correction = getCorrection(Number(state.meal.glucose));
  const estimated  = carbDose + correction;
  layout(`
    <div class="card estimate-hero" id="estimateHero">
      <p class="pill">Suggested only · adult must confirm</p>
      <h2>Suggested Apidra</h2>
      <div class="dose-number">${estimated}</div>
      <p class="dose-unit">units</p>
      <p class="muted small" style="margin-top:8px">ICR: 1 unit per ${state.settings.carbRatio}g carbs · Carb dose: ${carbDose}u · Correction: +${correction}u</p>
      <p class="muted small">Confirm with an adult before injecting.</p>
    </div>
    <div class="card">
      <h3>How this was estimated</h3>
      <div class="kv"><span>Pre-meal glucose</span><strong>${state.meal.glucose} mg/dL</strong></div>
      <div class="kv"><span>Total carbs</span><strong>${carbs}g</strong></div>
      <div class="kv"><span>ICR (carb ratio)</span><strong>1 unit / ${state.settings.carbRatio}g</strong></div>
      <div class="kv"><span>Carb dose rounded</span><strong>${carbDose} units</strong></div>
      <div class="kv"><span>Glucose correction</span><strong>+${correction} units</strong></div>
      <p class="small muted" style="margin-top:10px">Insulin is calculated from carbs plus the saved family correction plan. This is a suggested estimate only — not a dosing order.</p>
    </div>
    <div class="grid single">
      <button class="action scarlet" id="adultConfirmed"><strong>Adult confirmed</strong><span>Save meal and automatically log Apidra.</span></button>
      ${CIRCLE.map(name => `<button class="action" data-call="${name}"><strong>I need ${name}</strong><span>Alert the Circle before dosing.</span></button>`).join("")}
      <button class="action" id="saveNoInsulin"><strong>Save without insulin</strong><span>Save meal only for adult review.</span></button>
      <button class="action" id="backFoodFromEstimate"><strong>Back to food</strong><span>Change or add food.</span></button>
    </div>`, "meal");
  document.getElementById("adultConfirmed").onclick = async () => {
    const btn = document.getElementById("adultConfirmed");
    const restore = setBusy(btn, "Saving meal and insulin…");
    try{ await saveMealLog({ adultConfirmed:true, actualDose:estimated, autoLogInsulin:true }); }
    finally{ restore(); }
  };
  document.querySelectorAll("[data-call]").forEach(b => b.onclick = async () => {
    const restore = setBusy(b, "Sending alert…");
    await createAlert("circle_call","orange",`Amara requested ${b.dataset.call} during meal dosing. Suggested Apidra: ${estimated} units.`);
    await unlockBadge("caller-circle");
    restore(); toast(`${b.dataset.call} alert saved.`);
  });
  document.getElementById("saveNoInsulin").onclick = async () => {
    await unlockBadge("brave-pause");
    saveMealLog({ adultConfirmed:false, actualDose:null, noInsulin:true });
  };
  document.getElementById("backFoodFromEstimate").onclick = () => renderFoodBuilder();
  scrollUp();
}

async function saveMealLog(extra={}){
  const carbs        = state.meal.items.reduce((s,x) => s + Number(x.carbs||0), 0);
  const carbDose     = roundDose(carbs / Number(state.settings.carbRatio||8));
  const correctionDose = getCorrection(Number(state.meal.glucose));
  const estimatedDose  = carbDose + correctionDose;
  const actualDose     = extra.actualDose ?? null;
  await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"mealLogs"),{
    mealType:            state.meal.type,
    glucoseBeforeMeal:   Number(state.meal.glucose),
    items:               state.meal.items.map(x => ({ name:x.name, portion:x.portion, carbs:Number(x.carbs||0), source:x.source||"" })),
    totalCarbs:          carbs,
    carbDose, correctionDose, estimatedDose, actualDose,
    adultConfirmed:      !!extra.adultConfirmed,
    hiddenCarbsChecked:  !!state.meal.hiddenChecked,
    ketones:             state.meal.ketones||null,
    alertLevel:          state.meal.glucose >= state.settings.urgentHighThreshold ? "red" : state.meal.glucose >= state.settings.highThreshold ? "orange" : "green",
    createdAt:           serverTimestamp(),
    enteredBy:           state.user.uid
  });
  await unlockBadge("scarlet-sentinel");
  await unlockBadge("feast-reader");
  if(extra.autoLogInsulin && actualDose){
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"insulinLogs"),{
      insulinType:"Apidra", dose:Number(actualDose),
      reason:"Meal - adult confirmed", linkedMeal:true,
      createdAt:serverTimestamp(), enteredBy:state.user.uid
    });
  }
  toast(extra.autoLogInsulin ? "Meal saved. Insulin logged." : "Meal saved.");
  renderFlowDone({
    title:   extra.autoLogInsulin ? "Meal saved. Insulin logged." : "Meal saved",
    message: extra.autoLogInsulin ? `Adult confirmed. Apidra logged: ${actualDose} unit(s).` : "Meal saved without insulin. Adult should review.",
    next:[
      { view:"diary", title:"Write a Scarlet Entry", sub:"Say how this felt." },
      { view:"pages", title:"My Scarlet Pages",      sub:"Reread your entries." }
    ]
  });
}

// ── HIGH SUGAR FLOW ──────────────────────────────────────────
function renderHighSugar(){
  state.highFlow = { glucose:null, ketones:null, symptoms:[], recentApidra:null };
  layout(`
    <div class="card warning">
      <h2>My Sugar Is High</h2>
      <p class="muted">Let's slow down and be safe.</p>
      <div class="field">
        <label>Current glucose mg/dL</label>
        <input id="highGlucose" type="number" inputmode="numeric" placeholder="Example: 286" />
      </div>
      <button class="btn orange full" id="startHigh">Continue</button>
    </div>`, "home");
  document.getElementById("startHigh").onclick = () => {
    const g = Number(document.getElementById("highGlucose").value);
    if(!g || g < 20 || g > 600) return toast("Please enter a valid glucose number.");
    state.highFlow.glucose = g;
    renderHighKetones();
  };
}

function renderHighKetones(){
  const g = state.highFlow.glucose;
  layout(`
    <div class="card ${g>=state.settings.urgentHighThreshold?"danger":"warning"}">
      <h2>High Sugar: ${g} mg/dL</h2>
      <p class="muted">Check ketones if strips are available. Tell an adult if unsure.</p>
    </div>
    <div class="grid single">
      ${["Ketones negative","Trace / small","Moderate / large","No strips","I don't know how"].map(k => `
        <button class="action" data-ketone-high="${k}"><strong>${k}</strong><span>Save ketone status.</span></button>`).join("")}
    </div>`, "home");
  document.querySelectorAll("[data-ketone-high]").forEach(btn => btn.onclick = async () => {
    state.highFlow.ketones = btn.dataset.ketoneHigh;
    await addKetoneLog(g, btn.dataset.ketoneHigh);
    if(btn.dataset.ketoneHigh === "Moderate / large"){
      await createAlert("ketones_moderate_large","red",`Amara logged high glucose ${g} with moderate/large ketones.`);
      return renderEmergency("Moderate or large ketones need adult help now.");
    }
    if(btn.dataset.ketoneHigh.includes("negative")) await unlockBadge("ketone-seer");
    if(btn.dataset.ketoneHigh === "No strips")       await unlockBadge("truth-keeper");
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
    <div style="margin:0 14px 10px"><button class="btn orange full" id="continueHighSymptoms">Continue</button></div>`, "home");
  const selected = new Set();
  document.querySelectorAll("[data-high-symptom]").forEach(btn => btn.onclick = () => {
    if(btn.dataset.highSymptom === "None of these"){
      selected.clear(); selected.add("None of these");
      document.querySelectorAll("[data-high-symptom]").forEach(b => b.classList.remove("scarlet"));
      btn.classList.add("scarlet"); return;
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
      <button class="action" data-recent="unknown"><strong>I don't know</strong><span>Ask an adult before correction.</span></button>
    </div>`, "home");
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
    </div>`, "home");
  document.querySelectorAll("[data-alert-high]").forEach(btn => btn.onclick = async () => {
    const restore = setBusy(btn, "Sending alert…");
    await createAlert("stacking_warning","red",`Amara is high at ${state.highFlow.glucose} and took Apidra recently or is unsure. Alerted ${btn.dataset.alertHigh}.`);
    await unlockBadge("no-stack-oath");
    restore(); toast(`${btn.dataset.alertHigh} alert saved.`);
  });
  document.getElementById("saveHighNoCorrection").onclick = () => saveHighFlow({ correctionSuggested:null, adultConfirmed:false, correctionLogged:false });
}

function renderHighCorrectionEstimate(){
  const correction = getCorrection(Number(state.highFlow.glucose));
  layout(`
    <div class="card estimate-hero">
      <p class="pill">Suggested only · adult must confirm</p>
      <h2>Suggested Correction</h2>
      <div class="dose-number">${correction}</div>
      <p class="dose-unit">units Apidra</p>
      <p class="muted small">Confirm with an adult before injecting.</p>
    </div>
    <div class="grid single">
      <button class="action scarlet" id="adultConfirmHigh"><strong>Adult confirmed</strong><span>Save and log correction Apidra.</span></button>
      <button class="action" id="saveHighNoInsulin"><strong>Save without insulin</strong><span>Adult should review.</span></button>
      ${CIRCLE.map(n => `<button class="action" data-alert-high="${n}"><strong>Alert ${n}</strong><span>Ask for adult help.</span></button>`).join("")}
    </div>`, "home");
  document.getElementById("adultConfirmHigh").onclick = () => saveHighFlow({ correctionSuggested:correction, adultConfirmed:true, correctionLogged:true });
  document.getElementById("saveHighNoInsulin").onclick = () => saveHighFlow({ correctionSuggested:correction, adultConfirmed:false, correctionLogged:false });
  document.querySelectorAll("[data-alert-high]").forEach(btn => btn.onclick = async () => {
    const restore = setBusy(btn, "Sending alert…");
    await createAlert("high_help","orange",`Amara is high at ${state.highFlow.glucose}. Suggested correction: ${correction} units. Alerted ${btn.dataset.alertHigh}.`);
    restore(); toast(`${btn.dataset.alertHigh} alert saved.`);
  });
}

async function saveHighFlow({ correctionSuggested=null, adultConfirmed=false, correctionLogged=false } = {}){
  const btn = document.querySelector("#adultConfirmHigh, #saveHighNoInsulin, #saveHighNoCorrection");
  const restore = setBusy(btn, "Saving high sugar check…");
  await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"glucoseLogs"),{
    glucose:        Number(state.highFlow.glucose),
    context:        "high_sugar",
    ketones:        state.highFlow.ketones,
    symptoms:       state.highFlow.symptoms||[],
    recentApidra:   state.highFlow.recentApidra,
    correctionSuggested, adultConfirmed, correctionLogged,
    alertLevel:     Number(state.highFlow.glucose)>=state.settings.urgentHighThreshold?"red":"orange",
    createdAt:      serverTimestamp(),
    enteredBy:      state.user.uid
  });
  if(correctionLogged && correctionSuggested){
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"insulinLogs"),{
      insulinType:"Apidra", dose:Number(correctionSuggested),
      reason:"High sugar correction - adult confirmed",
      createdAt:serverTimestamp(), enteredBy:state.user.uid
    });
  }
  if(Number(state.highFlow.glucose)>=state.settings.urgentHighThreshold)
    await createAlert("urgent_high","red",`Amara logged urgent high glucose ${state.highFlow.glucose}. Ketones: ${state.highFlow.ketones}.`);
  await unlockBadge(Number(state.highFlow.glucose)>=300 ? "slayer-300" : "stormbreaker");
  await unlockBadge("not-my-number");
  if(adultConfirmed) await unlockBadge("grown-up-signal");
  restore();
  toast(correctionLogged ? "High sugar check saved. Correction logged." : "High sugar check saved.");
  renderFlowDone({
    title:   correctionLogged ? "High sugar saved. Correction logged." : "High sugar check saved",
    message: correctionLogged ? `Adult confirmed. Apidra correction logged: ${correctionSuggested} unit(s).` : "No correction insulin was logged. Adult should review.",
    next:[
      { view:"circle", title:"Call My Circle",       sub:"Ask an adult to help." },
      { view:"diary",  title:"Write a Scarlet Entry", sub:"Say how this felt." }
    ]
  });
}

// ── LOW SUGAR FLOW ───────────────────────────────────────────
function renderLowSugar(preset=null){
  layout(`
    <div class="card danger">
      <h2>Low Sugar</h2>
      <p><strong>No insulin now.</strong></p>
      <p class="muted">Enter the low reading and follow the steps.</p>
      <div class="field">
        <label>Glucose mg/dL</label>
        <input id="lowGlucose" type="number" inputmode="numeric" value="${preset||""}" placeholder="Example: 65" />
      </div>
      <button class="btn red full" id="startLowFlow">Continue</button>
    </div>`, "home");
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
    </div>`, "home");
  document.querySelectorAll("[data-fast]").forEach(btn => btn.onclick = async () => {
    state.lowFlow.fastSugar = btn.dataset.fast;
    if(btn.dataset.fast === "weak"){
      await createAlert("low_too_weak","red",`Amara is low at ${g} and says she cannot or feels too weak.`);
      return renderLowAdult();
    }
    if(btn.dataset.fast === "not_yet") return renderLowFastSugarChoices();
    await unlockBadge("sweet-rescue");
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
      ${["Juice box","Glucose tablets","Regular soda","Candy","Honey","Other fast sugar"].map(x => `
        <button class="action" data-choice="${x}"><strong>${x}</strong><span>Save this choice.</span></button>`).join("")}
    </div>`, "home");
  document.querySelectorAll("[data-choice]").forEach(btn => btn.onclick = async () => {
    state.lowFlow.fastSugar = btn.dataset.choice;
    await unlockBadge("sweet-rescue");
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
    </div>`, "home");
  document.querySelector("[data-adult='yes']").onclick = () => { state.lowFlow.adult = "adult knows"; renderLowRecheck(); };
  document.querySelectorAll("[data-alert-adult]").forEach(btn => btn.onclick = async () => {
    const restore = setBusy(btn, "Sending alert…");
    await createAlert("low_alert","red",`Amara is low at ${state.lowFlow.glucose}. Fast sugar: ${state.lowFlow.fastSugar||"not recorded"}. Alerted ${btn.dataset.alertAdult}.`);
    await unlockBadge("grown-up-signal");
    restore(); toast(`${btn.dataset.alertAdult} alert saved.`);
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
    </div>`, "home");
  document.getElementById("saveLowNow").onclick  = () => saveLowFlow(null);
  document.getElementById("recheckNow").onclick  = () => renderLowRecheckInput();
  document.getElementById("feelWorse").onclick   = async () => {
    await createAlert("low_feels_worse","red",`Amara feels worse after low sugar ${state.lowFlow.glucose}.`);
    saveLowFlow(null);
  };
}

function renderLowRecheckInput(){
  layout(`
    <div class="card">
      <h2>Recheck Reading</h2>
      <div class="field">
        <label>New glucose mg/dL</label>
        <input id="lowRecheckValue" type="number" inputmode="numeric" placeholder="Example: 82" />
      </div>
      <button class="btn scarlet full" id="saveRecheck">Save recheck</button>
    </div>`, "home");
  document.getElementById("saveRecheck").onclick = () => {
    const r = Number(document.getElementById("lowRecheckValue").value);
    if(!r || r < 20 || r > 600) return toast("Please enter a valid reading.");
    saveLowFlow(r);
  };
}

async function saveLowFlow(recheck){
  const btn = document.querySelector("#saveLowNow, #saveRecheck, #feelWorse");
  const restore = setBusy(btn, "Saving low sugar check…");
  await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"glucoseLogs"),{
    glucose:    Number(state.lowFlow.glucose),
    context:    "low_sugar",
    fastSugar:  state.lowFlow.fastSugar||null,
    adult:      state.lowFlow.adult||null,
    recheck:    recheck||null,
    alertLevel: "red",
    createdAt:  serverTimestamp(),
    enteredBy:  state.user.uid
  });
  if(Number(state.lowFlow.glucose) < state.settings.lowThreshold)
    await createAlert("low","red",`Amara logged low glucose ${state.lowFlow.glucose}. Fast sugar: ${state.lowFlow.fastSugar||"not recorded"}. Adult: ${state.lowFlow.adult||"not recorded"}.`);
  await unlockBadge("crimson-comeback");
  await unlockBadge("truth-teller");
  restore(); toast("Low sugar check saved.");
  renderFlowDone({
    title:   "Low sugar check saved",
    message: recheck ? `Recheck saved: ${recheck} mg/dL. No insulin was logged.` : "No insulin was logged. Recheck based on the family plan.",
    next:[
      { view:"circle", title:"Call My Circle",       sub:"Ask an adult to help." },
      { view:"diary",  title:"Write a Scarlet Entry", sub:"Say how this felt." }
    ]
  });
}

// ── INSULIN LOG ──────────────────────────────────────────────
function renderInsulinLog(){
  layout(`
    <div class="card">
      <h2>I Took Insulin</h2>
      <p class="muted">Log what happened. Honesty protects you.</p>
      <div class="field"><label>Insulin</label><select id="insulinType"><option>Apidra</option><option>Lantus</option></select></div>
      <div class="field"><label>Dose units</label><input id="dose" type="number" inputmode="decimal" placeholder="Example: 6" /></div>
      <div class="field"><label>Reason</label><select id="reason"><option>Meal</option><option>Correction</option><option>Basal</option><option>I am not sure</option></select></div>
      <button class="btn scarlet full" id="saveInsulin">Save insulin log</button>
    </div>`, "home");
  document.getElementById("saveInsulin").onclick = async () => {
    const btn     = document.getElementById("saveInsulin");
    const restore = setBusy(btn, "Saving insulin log…");
    const type    = document.getElementById("insulinType").value;
    const dose    = Number(document.getElementById("dose").value);
    const reason  = document.getElementById("reason").value;
    if(!dose || dose <= 0){ restore(); return toast("Please enter dose."); }
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"insulinLogs"),{ insulinType:type, dose, reason, createdAt:serverTimestamp(), enteredBy:state.user.uid });
    if(type === "Apidra" && reason === "Correction") await createAlert("correction_logged","orange",`Amara logged correction insulin: ${dose} units Apidra.`);
    restore(); toast("Insulin log saved.");
    renderFlowDone({ title:"Insulin log saved", message:"The insulin dose was saved in Amara's record.", next:[{ view:"diary", title:"Write a Scarlet Entry", sub:"Say how today felt." }] });
  };
}

// ── SYMPTOMS ─────────────────────────────────────────────────
function renderSymptoms(){
  const symptoms = ["Tired","Dizzy","Shaky","Hungry","Thirsty","Headache","Stomach pain","Vomiting","Sleepy","Fast breathing","Sad","Angry","Scared","I don't know"];
  layout(`
    <div class="card">
      <h2>I Don't Feel Well</h2>
      <p class="muted">Tell the diary what your body feels.</p>
    </div>
    <div class="grid">
      ${symptoms.map(s => `<button class="action" data-symptom="${s}"><strong>${s}</strong><span>Tap to select.</span></button>`).join("")}
    </div>
    <div style="margin:0 14px 10px"><button class="btn scarlet full" id="saveSymptoms">Save symptoms</button></div>`, "home");
  const selected = new Set();
  document.querySelectorAll("[data-symptom]").forEach(b => b.onclick = () => {
    b.classList.toggle("scarlet");
    selected.has(b.dataset.symptom) ? selected.delete(b.dataset.symptom) : selected.add(b.dataset.symptom);
  });
  document.getElementById("saveSymptoms").onclick = async () => {
    const btn = document.getElementById("saveSymptoms");
    const restore = setBusy(btn, "Saving symptoms…");
    const arr = [...selected];
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"symptomLogs"),{ symptoms:arr, createdAt:serverTimestamp(), enteredBy:state.user.uid });
    const severe = arr.some(x => ["Stomach pain","Vomiting","Sleepy","Fast breathing"].includes(x));
    if(severe){ await createAlert("symptoms","red",`Amara logged symptoms: ${arr.join(", ")}.`); }
    restore(); toast("Symptoms saved.");
    renderFlowDone({
      title:   "Symptoms saved",
      message: severe ? "These symptoms need adult attention. Your Circle has been alerted." : "Your symptoms were saved. Check glucose or tell your Circle if you still feel unwell.",
      next:[ { view:"high",title:"Check High Sugar",sub:"Use this if glucose is high." }, { view:"low",title:"Check Low Sugar",sub:"Use this if glucose is low." }, { view:"circle",title:"Call My Circle",sub:"Tell Mom, Dad, or Tita." } ]
    });
  };
}

// ── DIARY ────────────────────────────────────────────────────
function renderDiary(){
  const moods   = ["Brave","Tired","Angry","Sad","Okay","Proud","Scared","Confused","Strong","Lonely","Annoyed","Hopeful","Something only I can name"];
  const prompts = ["Today my body felt…","One brave thing I did today was…","The hardest part was…","I wish adults understood…","My sugar number did not define me because…","Today I was unstoppable when…","If my body could speak, it would say…","I want to write this my own way…"];
  layout(`
    <div class="card dark">
      <h2>Write a Scarlet Entry</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Give your feelings a place to go.</p>
    </div>
    <div class="card">
      <div class="field"><label>Today I feel…</label><select id="mood">${moods.map(m => `<option>${m}</option>`).join("")}</select></div>
      <div class="field" id="customMoodWrap" style="display:none"><label>Name the feeling your own way</label><input id="customMood" placeholder="Only if the list does not have the right word" /></div>
      <div class="field"><label>Prompt</label><select id="prompt">${prompts.map(p => `<option>${p}</option>`).join("")}</select></div>
      <div class="field"><label>Scarlet Entry</label><textarea id="entry" placeholder="Today my body felt…"></textarea></div>
      <div class="field"><label>Privacy</label><select id="privacy"><option value="private">Private to Amara</option><option value="circle">Share with my Circle</option><option value="safety">Safety note</option></select></div>
      <button class="btn scarlet full" id="saveEntry">Save Scarlet Entry</button>
    </div>`, "diary");
  document.getElementById("prompt").onchange = e => document.getElementById("entry").placeholder = e.target.value;
  document.getElementById("mood").onchange   = e => { document.getElementById("customMoodWrap").style.display = e.target.value === "Something only I can name" ? "flex" : "none"; };
  document.getElementById("saveEntry").onclick = async () => {
    let mood   = document.getElementById("mood").value;
    if(mood === "Something only I can name") mood = document.getElementById("customMood").value.trim() || mood;
    const prompt  = document.getElementById("prompt").value;
    const entry   = document.getElementById("entry").value.trim();
    const privacy = document.getElementById("privacy").value;
    if(!entry) return toast("Write a few words first.");
    const restore = setBusy(document.getElementById("saveEntry"), "Saving entry…");
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"diaryEntries"),{ mood, prompt, entry, privacy, createdAt:serverTimestamp(), enteredBy:state.user.uid });
    await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"moodLogs"),{ mood, privacy, createdAt:serverTimestamp(), enteredBy:state.user.uid });
    await unlockBadge("brave-page");
    if(["Sad","Angry","Scared","Lonely"].includes(mood)){ await unlockBadge("girl-who-stayed"); await unlockBadge("soft-monster-tamer"); }
    if(mood === "Sad" || mood === "Lonely") await unlockBadge("moonlit-heart");
    restore(); toast("Entry saved.");
    renderFlowDone({ title:"Scarlet Entry saved", message:"Your words are now in My Scarlet Pages.", next:[ { view:"pages",title:"Read My Scarlet Pages",sub:"Open your diary archive." }, { view:"vault",title:"Open The Scarlet Vault",sub:"See your courage badges." } ] });
  };
}

// ── MOOD MIRROR ──────────────────────────────────────────────
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
    </div>`, "diary");
  document.getElementById("writeMood").onclick = () => { state.view="diary"; render(); };
  document.getElementById("callCircle").onclick = () => { state.view="circle"; render(); };
}

// ── VAULT ────────────────────────────────────────────────────
function renderVault(){
  const sections = ["Safety","Food Confidence","Scarlet Pages","Streaks","Courage"];
  const grouped  = {};
  sections.forEach(s => grouped[s] = []);
  BADGES.forEach(b => { if(grouped[b.section]) grouped[b.section].push(b); });

  const total     = state.unlockedBadges.size;
  const totalAll  = BADGES.length;

  layout(`
    <div class="vault-summary">
      <div class="vault-count">${total}</div>
      <div class="vault-label">proofs of courage unlocked</div>
      <p class="vault-quote">This is not about perfect numbers.<br>This is proof that you kept going.</p>
      <p class="small muted" style="margin-top:8px">${total} of ${totalAll} marks earned</p>
    </div>

    ${sections.map(section => {
      const badges = grouped[section] || [];
      if(!badges.length) return "";
      return `
        <div class="vault-section-header">${esc(section)}</div>
        <div class="card" style="padding:14px">
          <div class="badge-grid">
            ${badges.map(b => {
              const unlocked = state.unlockedBadges.has(b.id);
              const dateStr  = unlocked && state.badgeUnlockDates[b.id] ? fmtDate(state.badgeUnlockDates[b.id]) : "";
              return `
                <div class="badge-card ${unlocked?"unlocked":"locked"}">
                  <div class="badge-seal"><span>${unlocked?"✦":"◌"}</span></div>
                  <h3>${esc(b.name)}</h3>
                  <p class="badge-desc">${unlocked ? esc(b.subtitle) : "Still sleeping. Waiting for its moment."}</p>
                  ${unlocked ? `<p class="badge-rule">${esc(b.desc)}</p>` : `<p class="badge-rule">Wakes when: ${esc(b.rule)}</p>`}
                  ${dateStr ? `<p class="badge-date">${esc(dateStr)}</p>` : ""}
                </div>`;
            }).join("")}
          </div>
        </div>`;
    }).join("")}
  `, "vault");
  scrollUp();
}

// ── CIRCLE ───────────────────────────────────────────────────
function renderCircle(){
  layout(`
    <div class="card dark">
      <h2>Call My Circle</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Mom. Dad. Tita.</p>
    </div>
    <div class="grid single">
      ${CIRCLE.map(name => `<button class="action" data-person="${name}"><strong>I need ${name}</strong><span>Save alert request to the dashboard and email system.</span></button>`).join("")}
    </div>`, "home");
  document.querySelectorAll("[data-person]").forEach(btn => btn.onclick = async () => {
    const who = btn.dataset.person;
    const restore = setBusy(btn, "Sending alert…");
    await createAlert("circle_call","orange",`Amara asked for ${who}.`);
    await unlockBadge("caller-circle");
    await unlockBadge("signal-flame");
    restore(); toast("Alert saved.");
    renderFlowDone({ title:`${who} alert saved`, message:"Your Circle has been alerted in the adult dashboard.", next:[ { view:"home",title:"Back Home",sub:"" }, { view:"diary",title:"Write a Scarlet Entry",sub:"Say what you need to say." } ] });
  });
}

// ── EMERGENCY ────────────────────────────────────────────────
function renderEmergency(message){
  layout(`
    <div class="card danger">
      <h2>Adult help needed now</h2>
      <p>${esc(message)}</p>
      <p class="muted" style="margin-top:10px">Tell Mom, Dad, or Tita now. If vomiting, stomach pain, very sleepy, confused, or breathing fast/deep, adults should seek urgent medical help.</p>
      <button class="btn red full" id="alertCircle" style="margin-top:14px">Alert My Circle</button>
    </div>`, "home");
  document.getElementById("alertCircle").onclick = async () => {
    const restore = setBusy(document.getElementById("alertCircle"), "Sending…");
    await createAlert("emergency","critical",message);
    await unlockBadge("caller-circle");
    restore(); toast("The Circle has been alerted.");
  };
}

// ── SCARLET PAGES ────────────────────────────────────────────
async function renderScarletPages(){
  layout(`
    <div class="card dark">
      <h2>My Scarlet Pages</h2>
      <p class="tagline" style="text-align:left;margin-top:6px">Your words. Your proof. Your story.</p>
    </div>
    <div class="card" id="pagesContainer">
      <p class="muted small">Loading your entries…</p>
    </div>`, "diary");
  try{
    const snap = await getDocs(query(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"diaryEntries"), orderBy("createdAt","desc"), limit(30)));
    const container = document.getElementById("pagesContainer");
    if(!container) return;
    if(snap.empty){ container.innerHTML = `<div class="empty-state"><p>No entries yet. Write your first Scarlet Entry — your words matter.</p></div>`; return; }
    await unlockBadge("vault-keeper");
    container.innerHTML = snap.docs.map(d => {
      const entry = d.data();
      return `
        <div class="page-entry">
          <span class="mood-tag">${esc(entry.mood||"Feeling")}</span>
          <p class="entry-text">${esc(entry.entry)}</p>
          <p class="entry-date">${fmtDate(entry.createdAt)}</p>
        </div>`;
    }).join("");
  }catch(err){
    console.error(err);
    const container = document.getElementById("pagesContainer");
    if(container) container.innerHTML = `<div class="empty-state"><p>Could not load entries. Check your connection and try again.</p></div>`;
  }
}

// ── REPORTS ──────────────────────────────────────────────────
async function renderReports(){
  if(state.role === "child"){
    layout(`
      <div class="card">
        <h2>Reports</h2>
        <p class="muted">Reports are for adults and doctors. Ask Mom, Dad, or Tita to open the adult dashboard to see the full report.</p>
        <button class="btn secondary full" id="backFromReports" style="margin-top:12px">← Back Home</button>
      </div>`, "reports");
    document.getElementById("backFromReports").onclick = () => { state.view = "home"; render(); };
    return;
  }
  renderReportsData();
}

async function renderReportsData(){
  $app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="logo-lockup">
          <div class="logo-small brand-mark"><img src="./assets/scarlet-diaries-header.png" alt="The Scarlet Diaries" /></div>
          <div class="topbar-title"><strong>Reports</strong><p class="small muted">Adult pattern review</p></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="build-tag">${BUILD}</span>
          <button class="btn secondary" id="backFromAdultReports">← Back</button>
        </div>
      </div>
      <div class="card" id="reportsContent">
        <p class="muted small">Loading reports…</p>
      </div>
    </div>`;
  document.getElementById("backFromAdultReports").onclick = () => renderAdult();

  try{
    const childPath = name => collection(db,"families",FAMILY_ID,"children",CHILD_ID,name);
    const now       = new Date();
    const day7ago   = new Date(now - 7*24*60*60*1000);
    const day14ago  = new Date(now - 14*24*60*60*1000);

    const [gSnap, mSnap, iSnap, dSnap, aSnap, bSnap] = await Promise.all([
      getDocs(query(childPath("glucoseLogs"),  orderBy("createdAt","desc"), limit(200))),
      getDocs(query(childPath("mealLogs"),     orderBy("createdAt","desc"), limit(200))),
      getDocs(query(childPath("insulinLogs"),  orderBy("createdAt","desc"), limit(200))),
      getDocs(query(childPath("diaryEntries"), orderBy("createdAt","desc"), limit(200))),
      getDocs(query(collection(db,"families",FAMILY_ID,"alerts"), orderBy("createdAt","desc"), limit(200))),
      getDocs(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"badgeUnlocks"))
    ]);

    const inWindow = (doc, days) => {
      const ts = doc.data().createdAt;
      if(!ts) return false;
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d >= (days === 7 ? day7ago : day14ago);
    };

    const stats = (snap, days) => snap.docs.filter(d => inWindow(d, days)).length;

    const g7 = stats(gSnap,7), g14 = stats(gSnap,14);
    const m7 = stats(mSnap,7), m14 = stats(mSnap,14);
    const i7 = stats(iSnap,7), i14 = stats(iSnap,14);
    const d7 = stats(dSnap,7), d14 = stats(dSnap,14);
    const a7 = stats(aSnap,7), a14 = stats(aSnap,14);

    const glucoseDocs7 = gSnap.docs.filter(d => inWindow(d,7));
    const lows7  = glucoseDocs7.filter(d => d.data().context === "low_sugar").length;
    const highs7 = glucoseDocs7.filter(d => d.data().context === "high_sugar").length;

    const container = document.getElementById("reportsContent");
    if(!container) return;

    if(gSnap.empty && mSnap.empty && iSnap.empty){
      container.innerHTML = `
        <h3>Reports</h3>
        <div class="empty-state" style="padding:24px 0">
          <p>No report data yet. Use the app for a few logs, then come back.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <h3>7-Day Summary</h3>
      <div class="report-grid" style="margin-top:12px">
        <div class="report-stat"><div class="stat-num">${g7}</div><div class="stat-label">Glucose logs</div></div>
        <div class="report-stat"><div class="stat-num">${m7}</div><div class="stat-label">Meal logs</div></div>
        <div class="report-stat"><div class="stat-num">${i7}</div><div class="stat-label">Insulin logs</div></div>
        <div class="report-stat"><div class="stat-num">${d7}</div><div class="stat-label">Diary entries</div></div>
        <div class="report-stat"><div class="stat-num" style="color:#e74c3c">${lows7}</div><div class="stat-label">Low sugar events</div></div>
        <div class="report-stat"><div class="stat-num" style="color:#e67e22">${highs7}</div><div class="stat-label">High sugar events</div></div>
        <div class="report-stat"><div class="stat-num">${a7}</div><div class="stat-label">Alerts logged</div></div>
        <div class="report-stat"><div class="stat-num" style="color:#c9a84c">${bSnap.size}</div><div class="stat-label">Badges unlocked</div></div>
      </div>
      <div class="divider-line" style="margin-top:16px"></div>
      <h3 style="margin-top:14px">14-Day Summary</h3>
      <div class="report-grid" style="margin-top:12px">
        <div class="report-stat"><div class="stat-num">${g14}</div><div class="stat-label">Glucose logs</div></div>
        <div class="report-stat"><div class="stat-num">${m14}</div><div class="stat-label">Meal logs</div></div>
        <div class="report-stat"><div class="stat-num">${i14}</div><div class="stat-label">Insulin logs</div></div>
        <div class="report-stat"><div class="stat-num">${d14}</div><div class="stat-label">Diary entries</div></div>
        <div class="report-stat"><div class="stat-num">${a14}</div><div class="stat-label">Alerts logged</div></div>
        <div class="report-stat"><div class="stat-num" style="color:#c9a84c">${bSnap.size}</div><div class="stat-label">Total badges</div></div>
      </div>
      <p class="small muted" style="margin-top:14px">Reports are for adult and doctor pattern review. Generated from Firestore logs.</p>`;
  }catch(err){
    console.error(err);
    const container = document.getElementById("reportsContent");
    if(container){
      if(String(err.message||"").toLowerCase().includes("permission")){
        container.innerHTML = `<div class="empty-state"><p>Reports could not load. Check Firestore rules and try again.</p></div>`;
      }else{
        container.innerHTML = `<div class="empty-state"><p>Reports could not load. Check your connection and try again.</p></div>`;
      }
    }
  }
}

// ── FIREBASE HELPERS ─────────────────────────────────────────
async function addKetoneLog(glucose, ketoneResult){
  await addDoc(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"ketoneLogs"),{ glucose, ketoneResult, createdAt:serverTimestamp(), enteredBy:state.user.uid, alertLevel:ketoneResult==="Moderate / large"?"red":"orange" });
}
async function createAlert(type, severity, message){
  if(state.firebaseOffline){
    const localAlerts = JSON.parse(localStorage.getItem("scarletLocalAlerts") || "[]");
    localAlerts.unshift({ type, severity, message, createdAt:new Date().toISOString() });
    localStorage.setItem("scarletLocalAlerts", JSON.stringify(localAlerts.slice(0,50)));
    await unlockBadge("signal-flame");
    if(severity === "red" || severity === "critical") await unlockBadge("three-guardians");
    return;
  }
  await addDoc(collection(db,"families",FAMILY_ID,"alerts"),{
    childId:CHILD_ID, type, severity, message,
    recipients:state.settings.alertEmails||[],
    acknowledged:false, emailStatus:"pending_function_setup",
    createdAt:serverTimestamp(), enteredBy:state.user?.uid||null
  });
  await unlockBadge("signal-flame");
  if(severity === "red" || severity === "critical") await unlockBadge("three-guardians");
}
async function unlockBadge(id){
  if(state.unlockedBadges.has(id)) return;
  const badge = BADGES.find(b => b.id === id);
  if(!badge) return;
  if(!state.firebaseOffline){
    await setDoc(doc(db,"families",FAMILY_ID,"children",CHILD_ID,"badgeUnlocks",id),{ badgeId:id, name:badge.name, desc:badge.desc, subtitle:badge.subtitle||"", createdAt:serverTimestamp() },{ merge:true });
  }else{
    const localBadges = JSON.parse(localStorage.getItem("scarletLocalBadges") || "[]");
    if(!localBadges.includes(id)){
      localBadges.push(id);
      localStorage.setItem("scarletLocalBadges", JSON.stringify(localBadges));
    }
  }
  state.unlockedBadges.add(id);
  if(!state.badgeUnlockDates[id]) state.badgeUnlockDates[id] = { toDate:()=>new Date() };
  // Check wall-of-proof milestone
  if(state.unlockedBadges.size >= 5) await unlockBadge("wall-proof");
  if(state.unlockedBadges.size >= 5) await unlockBadge("steady-spark");
}

// ── DELETE COLLECTION (client-side) ──────────────────────────
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

// ── DEMO RESET ───────────────────────────────────────────────
function renderDemoReset(){
  $app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="logo-lockup">
          <div class="logo-small brand-mark"><img src="./assets/scarlet-diaries-header.png" alt="The Scarlet Diaries" /></div>
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
          <div class="list-item"><div><strong>Badge unlocks and reports</strong><span class="small muted">Demo achievements</span></div></div>
          <div class="list-item"><div><strong>Alerts</strong><span class="small muted">Adult dashboard demo alerts</span></div></div>
        </div>
      </div>
      <div class="card success">
        <h3>This will keep</h3>
        <p class="muted small">User accounts, roles, medical settings, and food library will be kept.</p>
      </div>
      <div class="card">
        <div class="field">
          <label>Type RESET to continue</label>
          <input id="resetConfirm" placeholder="RESET" />
        </div>
        <button class="btn red full" id="confirmResetBtn">Reset Demo Logs</button>
        <button class="btn secondary full" style="margin-top:10px" id="cancelResetBtn">Cancel</button>
      </div>
    </div>`;
  bindGlobal();
  document.getElementById("cancelResetTop").onclick = () => renderAdult();
  document.getElementById("cancelResetBtn").onclick = () => renderAdult();
  document.getElementById("confirmResetBtn").onclick = async () => {
    const text = document.getElementById("resetConfirm").value.trim();
    if(text !== "RESET") return toast("Type RESET to confirm.");
    const btn = document.getElementById("confirmResetBtn");
    const restore = setBusy(btn, "Resetting demo data…");
    try{
      const childPath = name => collection(db,"families",FAMILY_ID,"children",CHILD_ID,name);
      const counts = {};
      counts.mealLogs    = await deleteCollectionClient(childPath("mealLogs"));
      counts.glucoseLogs = await deleteCollectionClient(childPath("glucoseLogs"));
      counts.insulinLogs = await deleteCollectionClient(childPath("insulinLogs"));
      counts.ketoneLogs  = await deleteCollectionClient(childPath("ketoneLogs"));
      counts.symptomLogs = await deleteCollectionClient(childPath("symptomLogs"));
      counts.diaryEntries= await deleteCollectionClient(childPath("diaryEntries"));
      counts.moodLogs    = await deleteCollectionClient(childPath("moodLogs"));
      counts.badgeUnlocks= await deleteCollectionClient(childPath("badgeUnlocks"));
      counts.reports     = await deleteCollectionClient(childPath("reports"));
      counts.alerts      = await deleteCollectionClient(collection(db,"families",FAMILY_ID,"alerts"));
      state.unlockedBadges = new Set();
      state.badgeUnlockDates = {};
      restore(); renderDemoResetDone(counts);
    }catch(err){
      console.error(err); restore();
      toast(String(err.message||"").toLowerCase().includes("permission")
        ? "Reset blocked by Firestore rules. Publish the V2.6.3 rules."
        : "Reset failed. Please try again.");
    }
  };
}

function renderDemoResetDone(counts){
  const total = Object.values(counts||{}).reduce((a,b) => a + Number(b||0), 0);
  $app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="logo-lockup">
          <div class="logo-small brand-mark"><img src="./assets/scarlet-diaries-header.png" alt="The Scarlet Diaries" /></div>
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
          ${Object.entries(counts||{}).map(([k,v]) => `<div class="list-item"><div><strong>${esc(k)}</strong><span class="small muted">${Number(v||0)} deleted</span></div></div>`).join("")}
        </div>
      </div>
      <div class="grid single">
        <button class="action scarlet" id="backAdultAfterReset"><strong>Back to Adult Dashboard</strong><span>Continue testing from a clean demo state.</span></button>
        <button class="action" id="logoutAfterReset"><strong>Exit</strong><span>Return to login.</span></button>
      </div>
    </div>`;
  bindGlobal();
  document.getElementById("backAdultAfterReset").onclick = () => renderAdult();
  document.getElementById("logoutAfterReset").onclick = () => signOut(auth);
}

// ── MEDICAL SETTINGS ─────────────────────────────────────────
function renderMedicalSettings(){
  const s = state.settings;
  $app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="logo-lockup">
          <div class="logo-small brand-mark"><img src="./assets/scarlet-diaries-header.png" alt="The Scarlet Diaries" /></div>
          <div class="topbar-title"><strong>Medical Settings</strong><p class="small muted">Adult only</p></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="build-tag">${BUILD}</span>
          <button class="btn secondary" id="backFromMedical">← Back</button>
        </div>
      </div>
      <div class="card dark">
        <h2>Medical Settings</h2>
        <p class="muted" style="margin-top:6px">Change these only if Amara's doctor or diabetes care team updates the plan.</p>
      </div>
      <div class="card">
        <h3>ICR — Insulin to Carb Ratio</h3>
        <p class="small muted" style="margin-top:6px">ICR means how many grams of carbs are covered by 1 unit of Apidra.</p>
        <div class="medical-field">
          <label>1 unit Apidra per ___ grams of carbs</label>
          <input id="carbRatio" type="number" inputmode="numeric" value="${s.carbRatio||8}" />
        </div>
      </div>
      <div class="card">
        <h3>Glucose Thresholds</h3>
        <div class="medical-field">
          <label>Low sugar threshold (mg/dL)</label>
          <input id="lowThreshold" type="number" inputmode="numeric" value="${s.lowThreshold||70}" />
        </div>
        <div class="medical-field">
          <label>High sugar threshold (mg/dL)</label>
          <input id="highThreshold" type="number" inputmode="numeric" value="${s.highThreshold||180}" />
        </div>
        <div class="medical-field">
          <label>Urgent high threshold (mg/dL)</label>
          <input id="urgentHighThreshold" type="number" inputmode="numeric" value="${s.urgentHighThreshold||300}" />
        </div>
      </div>
      <div class="card">
        <h3>Insulin Stacking Window</h3>
        <div class="medical-field">
          <label>Hours before correcting again</label>
          <input id="insulinStackingHours" type="number" inputmode="numeric" value="${s.insulinStackingHours||3}" />
        </div>
      </div>
      <div class="card">
        <h3>Correction Rules (from family plan)</h3>
        <div class="medical-field">
          <label>Correction dose when glucose 180–250 mg/dL (units)</label>
          <input id="preMealCorrection180" type="number" inputmode="numeric" value="${s.preMealCorrection180||2}" />
        </div>
        <div class="medical-field">
          <label>Correction dose when glucose above 250 mg/dL (units)</label>
          <input id="preMealCorrection250" type="number" inputmode="numeric" value="${s.preMealCorrection250||4}" />
        </div>
      </div>
      <div class="warning-box">
        <p>⚠️ Change these only if Amara's doctor or diabetes care team updates the plan. Insulin doses are suggested estimates only and must always be confirmed by an adult before injection.</p>
      </div>
      <div style="margin:0 14px 10px">
        <button class="btn gold full" id="saveMedical">Save Doctor-Advised Settings</button>
        <button class="btn secondary full" style="margin-top:10px" id="cancelMedical">Cancel</button>
      </div>
    </div>`;
  bindGlobal();
  document.getElementById("backFromMedical").onclick  = () => renderAdult();
  document.getElementById("cancelMedical").onclick    = () => renderAdult();
  document.getElementById("saveMedical").onclick = async () => {
    const btn = document.getElementById("saveMedical");
    const restore = setBusy(btn, "Saving settings…");
    const newSettings = {
      ...state.settings,
      carbRatio:             Number(document.getElementById("carbRatio").value) || 8,
      lowThreshold:          Number(document.getElementById("lowThreshold").value) || 70,
      highThreshold:         Number(document.getElementById("highThreshold").value) || 180,
      urgentHighThreshold:   Number(document.getElementById("urgentHighThreshold").value) || 300,
      insulinStackingHours:  Number(document.getElementById("insulinStackingHours").value) || 3,
      preMealCorrection180:  Number(document.getElementById("preMealCorrection180").value) || 2,
      preMealCorrection250:  Number(document.getElementById("preMealCorrection250").value) || 4,
      updatedAt:             serverTimestamp()
    };
    try{
      await setDoc(doc(db,"families",FAMILY_ID,"children",CHILD_ID,"settings","current"), newSettings, { merge:true });
      state.settings = newSettings;
      restore(); toast("Doctor-advised settings saved.");
      renderAdult();
    }catch(err){
      console.error(err); restore();
      toast(String(err.message||"").toLowerCase().includes("permission")
        ? "Save blocked by Firestore rules. Check your rules file."
        : "Could not save settings. Please try again.");
    }
  };
}

// ── APP MODE SWITCH ───────────────────────────────────────────
async function saveAppMode(mode){
  try{
    await setDoc(doc(db,"families",FAMILY_ID,"settings","appMode"),{ mode, updatedAt:serverTimestamp() },{ merge:true });
    state.appMode = mode;
  }catch(err){ console.error(err); toast("Could not save app mode."); }
}

function renderModeSwitch(){
  const isDemo = state.appMode !== "live";
  $app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="logo-lockup">
          <div class="logo-small brand-mark"><img src="./assets/scarlet-diaries-header.png" alt="The Scarlet Diaries" /></div>
          <div class="topbar-title"><strong>App Mode</strong><p class="small muted">Adult only</p></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="build-tag">${BUILD}</span>
          <button class="btn secondary" id="backFromMode">← Back</button>
        </div>
      </div>
      <div class="mode-card">
        <div class="mode-current">
          <strong>Current Mode</strong>
          <span class="pill ${isDemo?"mode-demo":"mode-live"}">${isDemo?"Demo Mode":"Live Mode"}</span>
        </div>
        ${isDemo ? `
          <div class="card" style="background:rgba(201,168,76,.06);border-color:rgba(201,168,76,.25);margin:0 0 10px">
            <p class="small" style="color:var(--gold)">This is Demo Mode. Everyone can use PIN 1111 for testing.</p>
          </div>
          <div class="mode-btns">
            <button class="btn red" id="goLiveBtn">Go Live / Set Private PINs</button>
            <button class="btn secondary" id="resetDemoFromMode">Reset Demo Data</button>
          </div>` : `
          <div class="card" style="background:var(--green-soft);border-color:rgba(39,174,96,.25);margin:0 0 10px">
            <p class="small" style="color:var(--green)">Live Mode is active. Demo PIN 1111 no longer works. Each profile uses its private PIN.</p>
          </div>
          <div class="mode-btns">
            <button class="btn secondary" id="changeLivePinsBtn">Change Live PINs</button>
            <button class="btn secondary" id="returnToDemoBtn">Return to Demo Mode</button>
          </div>`}
      </div>
    </div>`;
  bindGlobal();
  document.getElementById("backFromMode").onclick = () => renderAdult();
  if(isDemo){
    document.getElementById("goLiveBtn").onclick = () => renderLivePinSetup();
    document.getElementById("resetDemoFromMode").onclick = () => renderDemoReset();
  }else{
    document.getElementById("changeLivePinsBtn").onclick = () => renderLivePinSetup(true);
    document.getElementById("returnToDemoBtn").onclick = () => {
      if(!confirm("Return to Demo Mode? Demo PIN 1111 will work again. Continue?")) return;
      saveAppMode("demo").then(() => { toast("App returned to Demo Mode."); renderAdult(); });
    };
  }
}

function renderLivePinSetup(changeOnly=false){
  $app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="logo-lockup">
          <div class="logo-small brand-mark"><img src="./assets/scarlet-diaries-header.png" alt="The Scarlet Diaries" /></div>
          <div class="topbar-title"><strong>${changeOnly ? "Change Live PINs" : "Go Live"}</strong><p class="small muted">Adult only</p></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="build-tag">${BUILD}</span>
          <button class="btn secondary" id="cancelLivePins">Cancel</button>
        </div>
      </div>
      <div class="card danger">
        <h2>${changeOnly ? "Set new private PINs" : "Set private PINs before going live"}</h2>
        <p class="muted" style="margin-top:8px">Demo PIN 1111 will stop working in Live Mode. Set a private PIN for each profile.</p>
      </div>
      <div class="card">
        <div class="field"><label>Amara PIN</label><input class="form-input" id="pinAmara" type="password" inputmode="numeric" maxlength="8" placeholder="4 to 8 digits" /></div>
        <div class="field"><label>Mom PIN</label><input class="form-input" id="pinMom" type="password" inputmode="numeric" maxlength="8" placeholder="4 to 8 digits" /></div>
        <div class="field"><label>Dad PIN</label><input class="form-input" id="pinDad" type="password" inputmode="numeric" maxlength="8" placeholder="4 to 8 digits" /></div>
        <div class="field"><label>Tita PIN</label><input class="form-input" id="pinTita" type="password" inputmode="numeric" maxlength="8" placeholder="4 to 8 digits" /></div>
        <label class="check-row" style="margin-top:10px">
          <input type="checkbox" id="confirmLivePins" />
          <span>I understand these PINs replace demo PIN 1111 in Live Mode.</span>
        </label>
        <button class="btn red full" style="margin-top:14px" id="saveLivePinsBtn">${changeOnly ? "Save Live PINs" : "Save PINs and Go Live"}</button>
      </div>
    </div>`;
  bindGlobal();
  document.getElementById("cancelLivePins").onclick = () => renderModeSwitch();
  document.getElementById("saveLivePinsBtn").onclick = async () => {
    const pins = {
      amara:document.getElementById("pinAmara").value.trim(),
      mom:document.getElementById("pinMom").value.trim(),
      dad:document.getElementById("pinDad").value.trim(),
      tita:document.getElementById("pinTita").value.trim()
    };
    if(!Object.values(pins).every(p => /^\d{4,8}$/.test(p))) return toast("Each PIN must be 4 to 8 digits.");
    if(Object.values(pins).some(p => p === DEMO_PIN)) return toast("Do not use 1111 for Live Mode.");
    if(!document.getElementById("confirmLivePins").checked) return toast("Please confirm that demo PIN 1111 will be replaced.");

    const btn = document.getElementById("saveLivePinsBtn");
    const restore = setBusy(btn, changeOnly ? "Saving PINs…" : "Going live…");
    try{
      const pinHashes = {};
      for(const [roleKey,pin] of Object.entries(pins)) pinHashes[roleKey] = await sha256(pin);
      await setDoc(doc(db,"families",FAMILY_ID,"settings","appMode"),{
        mode:"live",
        livePinsSet:true,
        pinHashes,
        updatedAt:serverTimestamp()
      },{ merge:true });
      state.appMode = "live";
      toast(changeOnly ? "Live PINs updated." : "Live Mode is now active.");
      renderAdult();
    }catch(err){
      console.error(err);
      toast(String(err.message||"").toLowerCase().includes("permission") ? "Could not save PINs. Check Firestore rules." : "Could not save Live PINs.");
    }finally{ restore(); }
  };
}

// ── ADULT DASHBOARD ───────────────────────────────────────────
function renderAdult(){
  const isDemo = state.appMode !== "live";
  const roleKey = localStorage.getItem("scarletRoleKey") || "adult";
  const roleLabel = ({mom:"Mom",dad:"Dad",tita:"Tita"})[roleKey] || "Adult";

  $app.innerHTML = `
    <div class="screen">
      <div class="adult-header">
        <div class="adult-header-left">
          <strong>Adult Dashboard — ${esc(roleLabel)}</strong>
          <span>The Scarlet Diaries ${BUILD}</span>
        </div>
        <div class="adult-header-right">
          <span class="pill ${isDemo?"mode-demo":"mode-live"}">${isDemo?"Demo":"Live"}</span>
          <button class="btn secondary" id="logoutAdult">Exit</button>
        </div>
      </div>

      <!-- 1. TODAY'S SAFETY SNAPSHOT -->
      <div class="adult-section-label">Today's Safety Snapshot</div>
      <div class="card adult-snapshot" id="snapshotCard">
        <p class="muted small">Loading snapshot…</p>
      </div>

      <!-- 2. NEEDS ADULT ATTENTION -->
      <div class="adult-section-label">Needs Adult Attention</div>
      <div class="card" id="attentionCard">
        <div id="alertsList"><p class="muted small">Loading alerts…</p></div>
      </div>

      <!-- 3. QUICK ACTIONS -->
      <div class="adult-section-label">Quick Actions</div>
      <div class="quick-actions">
        <button class="quick-action-btn" id="openReportsBtn"><span>📊</span><strong>Open Reports</strong></button>
        <button class="quick-action-btn" id="openMedicalBtn"><span>⚕️</span><strong>Medical Settings</strong></button>
        <button class="quick-action-btn" id="openVaultBtn"><span>🔒</span><strong>Scarlet Vault</strong></button>
        <button class="quick-action-btn" id="openModeBtn"><span>⚙️</span><strong>App Mode</strong></button>
      </div>

      <!-- 4. RECENT CARE TIMELINE -->
      <div class="adult-section-label">Recent Care Timeline</div>
      <div class="card" id="timelineCard">
        <p class="muted small">Loading timeline…</p>
      </div>

      <!-- 5. AMARA'S COURAGE -->
      <div class="adult-section-label">Amara's Courage</div>
      <div class="card" id="courageCard">
        <p class="muted small">Loading courage summary…</p>
      </div>

      <!-- 6. PATTERN REVIEW -->
      <div class="adult-section-label">Pattern Review</div>
      <div class="card" id="patternCard">
        <p class="muted small">Loading patterns…</p>
      </div>

      <!-- 7. DEMO TOOLS (bottom) -->
      ${isDemo ? `
        <div class="adult-section-label">Demo Tools</div>
        <div class="card danger">
          <p class="muted small">For demo/testing only. Clears logs, diary, mood, alerts, and badges while keeping accounts and settings.</p>
          <button class="btn red full" style="margin-top:10px" id="resetDemoBtn">Reset Demo Data</button>
        </div>` : ""}

    </div>`;

  bindGlobal();
  document.getElementById("logoutAdult").onclick    = () => signOut(auth);
  document.getElementById("openReportsBtn").onclick = () => renderReportsData();
  document.getElementById("openMedicalBtn").onclick = () => renderMedicalSettings();
  document.getElementById("openVaultBtn").onclick   = () => renderAdultVaultSummary();
  document.getElementById("openModeBtn").onclick    = () => renderModeSwitch();
  const resetBtn = document.getElementById("resetDemoBtn");
  if(resetBtn) resetBtn.onclick = () => renderDemoReset();

  // Live-load alerts
  const alertsRef = collection(db,"families",FAMILY_ID,"alerts");
  onSnapshot(query(alertsRef, orderBy("createdAt","desc"), limit(20)), snap => {
    const card = document.getElementById("attentionCard");
    if(!card) return;
    if(snap.empty){ card.innerHTML = `<div class="alert-item"><div class="alert-item-left"><strong>No alerts</strong><p>Amara has not sent any alerts.</p></div></div>`; return; }

    const unacked = snap.docs.filter(d => !d.data().acknowledged);
    const snapshotCard = document.getElementById("snapshotCard");
    if(snapshotCard){
      let statusClass = "calm", statusText = "Calm — No urgent alerts";
      if(unacked.length > 0){
        const hasRed = unacked.some(d => d.data().severity === "red" || d.data().severity === "critical");
        statusClass  = hasRed ? "urgent" : "review";
        statusText   = hasRed ? `Urgent — ${unacked.length} alert(s) need attention` : `Needs Review — ${unacked.length} alert(s) pending`;
      }
      const lastGlucose = snap.docs.find(d => d.data().type?.includes("high") || d.data().type?.includes("low") || d.data().type?.includes("urgent"));
      snapshotCard.innerHTML = `
        <div class="snapshot-status ${statusClass}">
          <div class="status-dot"></div>
          <p>${esc(statusText)}</p>
        </div>
        <div class="kv"><span>Unacknowledged alerts</span><strong>${unacked.length}</strong></div>
        <div class="kv"><span>Total recent alerts</span><strong>${snap.size}</strong></div>
        <div class="kv"><span>App mode</span><strong>${isDemo?"Demo Mode":"Live Mode"}</strong></div>
        <p class="small muted" style="margin-top:8px">ICR: 1 unit per ${state.settings.carbRatio}g · Low: ${state.settings.lowThreshold} · High: ${state.settings.highThreshold} · Urgent: ${state.settings.urgentHighThreshold}</p>`;
    }

    const list = document.getElementById("alertsList");
    if(!list) return;
    list.innerHTML = snap.docs.map(d => {
      const a = d.data();
      const acked = !!a.acknowledged;
      const sev   = (a.severity==="red"||a.severity==="critical") ? "red" : a.severity==="orange" ? "orange" : "green";
      return `<div class="alert-item ${sev==="red"?"urgent":sev==="orange"?"warning":""}">
        <div class="alert-item-left">
          <strong>${esc(a.type||"alert")}</strong>
          <p>${esc(a.message)}</p>
          ${acked ? `<p class="ack-label">✓ Acknowledged</p>` : `<p style="font-size:11px;color:var(--orange)">Needs adult check</p>`}
          <p style="font-size:11px;color:var(--text-dim)">${fmtDate(a.createdAt)}</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <span class="severity-pill ${sev}">${esc(a.severity||"info").toUpperCase()}</span>
          ${acked ? "" : `<button class="btn secondary" style="font-size:12px;padding:6px 10px" data-ack="${d.id}">I saw this</button>`}
        </div>
      </div>`;
    }).join("");
    list.querySelectorAll("[data-ack]").forEach(btn => btn.onclick = async () => {
      const restore = setBusy(btn, "Acking…");
      await updateDoc(doc(db,"families",FAMILY_ID,"alerts",btn.dataset.ack),{ acknowledged:true, acknowledgedAt:serverTimestamp(), acknowledgedBy:state.user?.uid||null });
      restore(); toast("Alert acknowledged.");
    });
  });

  // Load timeline
  loadRecentTimeline();
  // Load courage summary
  loadCourageSummary();
  // Load pattern summary
  loadPatternSummary();
}

async function loadRecentTimeline(){
  const card = document.getElementById("timelineCard");
  if(!card) return;
  try{
    const childPath = name => collection(db,"families",FAMILY_ID,"children",CHILD_ID,name);
    const [gSnap, mSnap, iSnap, dSnap, aSnap] = await Promise.all([
      getDocs(query(childPath("glucoseLogs"),  orderBy("createdAt","desc"), limit(5))),
      getDocs(query(childPath("mealLogs"),     orderBy("createdAt","desc"), limit(5))),
      getDocs(query(childPath("insulinLogs"),  orderBy("createdAt","desc"), limit(5))),
      getDocs(query(childPath("diaryEntries"), orderBy("createdAt","desc"), limit(5))),
      getDocs(query(collection(db,"families",FAMILY_ID,"alerts"), orderBy("createdAt","desc"), limit(5)))
    ]);

    const events = [];
    gSnap.docs.forEach(d => { const dat = d.data(); events.push({ type:dat.context||"glucose", label:`Glucose logged${dat.glucose?" — "+dat.glucose+" mg/dL":""}`, dot:dat.context==="low_sugar"?"low":dat.context==="high_sugar"?"high":"glucose", ts:dat.createdAt }); });
    mSnap.docs.forEach(d => { const dat = d.data(); events.push({ type:"meal", label:`Meal logged — ${dat.totalCarbs||0}g carbs (${esc(dat.mealType||"meal")})`, dot:"meal", ts:dat.createdAt }); });
    iSnap.docs.forEach(d => { const dat = d.data(); events.push({ type:"insulin", label:`Insulin logged — ${dat.dose} units ${esc(dat.insulinType||"")}`, dot:"insulin", ts:dat.createdAt }); });
    dSnap.docs.forEach(d => { const dat = d.data(); events.push({ type:"diary", label:`Scarlet Entry — mood: ${esc(dat.mood||"")}`, dot:"diary", ts:dat.createdAt }); });
    aSnap.docs.forEach(d => { const dat = d.data(); events.push({ type:"alert", label:`Alert — ${esc(dat.type||"")}`, dot:"alert", ts:dat.createdAt }); });

    events.sort((a,b) => {
      const ta = a.ts?.toDate ? a.ts.toDate() : new Date(0);
      const tb = b.ts?.toDate ? b.ts.toDate() : new Date(0);
      return tb - ta;
    });

    if(!events.length){ card.innerHTML = `<div class="empty-state"><p>No care events logged yet.</p></div>`; return; }
    card.innerHTML = `<div class="list">${events.slice(0,12).map(e => `
      <div class="timeline-item">
        <div class="timeline-dot ${e.dot}"></div>
        <div class="timeline-content">
          <strong>${esc(e.label)}</strong>
          <span>${fmtDate(e.ts)}</span>
        </div>
      </div>`).join("")}</div>`;
  }catch(err){
    console.error(err);
    if(card) card.innerHTML = `<div class="empty-state"><p>Timeline could not load.</p></div>`;
  }
}

async function loadCourageSummary(){
  const card = document.getElementById("courageCard");
  if(!card) return;
  try{
    const childPath = name => collection(db,"families",FAMILY_ID,"children",CHILD_ID,name);
    const [bSnap, dSnap, aSnap, moodSnap] = await Promise.all([
      getDocs(collection(db,"families",FAMILY_ID,"children",CHILD_ID,"badgeUnlocks")),
      getDocs(query(childPath("diaryEntries"), limit(200))),
      getDocs(query(collection(db,"families",FAMILY_ID,"alerts"), limit(200))),
      getDocs(query(childPath("moodLogs"), where("source","==","daily-checkin"), orderBy("createdAt","desc"), limit(200)))
    ]);

    const badgeCount   = bSnap.size;
    const diaryCount   = dSnap.size;
    const checkinCount = moodSnap.size;
    const helpCount    = aSnap.docs.filter(d => d.data().type === "circle_call").length;
    const safetyCount  = aSnap.docs.filter(d => ["low_alert","stacking_warning","high_symptoms","ketones_moderate_large"].includes(d.data().type)).length;

    const latestBadge = bSnap.docs.sort((a,b) => {
      const ta = a.data().createdAt?.toDate ? a.data().createdAt.toDate() : new Date(0);
      const tb = b.data().createdAt?.toDate ? b.data().createdAt.toDate() : new Date(0);
      return tb - ta;
    })[0]?.data();

    const latestCheckin = moodSnap.docs[0]?.data();
    const latestCheckinText = latestCheckin
      ? `Last check-in: ${esc(latestCheckin.moodCustom || latestCheckin.mood || "feeling")} · ${esc(latestCheckin.dateKey || fmtDate(latestCheckin.createdAt))}`
      : "No daily check-ins yet.";

    card.innerHTML = `
      <div class="courage-grid">
        <div class="courage-stat"><div class="n">${badgeCount}</div><div class="l">Badges earned</div></div>
        <div class="courage-stat"><div class="n">${diaryCount}</div><div class="l">Diary entries</div></div>
        <div class="courage-stat"><div class="n">${checkinCount}</div><div class="l">Daily check-ins</div></div>
        <div class="courage-stat"><div class="n">${helpCount}</div><div class="l">Help requests</div></div>
        <div class="courage-stat"><div class="n">${safetyCount}</div><div class="l">Safety steps</div></div>
        <div class="courage-stat" style="grid-column:span 2"><div class="n" style="font-size:14px;color:var(--gold)">${latestBadge ? esc(latestBadge.name) : "No badges yet"}</div><div class="l">Latest badge</div></div>
      </div>
      <p class="small muted" style="margin-top:12px">${latestCheckinText}</p>
      <p class="small muted" style="margin-top:8px;font-style:italic">"Celebrate effort, not perfect glucose."</p>`;
  }catch(err){
    console.error(err);
    if(card) card.innerHTML = `<div class="empty-state"><p>Courage summary could not load.</p></div>`;
  }
}

async function loadPatternSummary(){
  const card = document.getElementById("patternCard");
  if(!card) return;
  try{
    const childPath = name => collection(db,"families",FAMILY_ID,"children",CHILD_ID,name);
    const [gSnap, mSnap, iSnap] = await Promise.all([
      getDocs(query(childPath("glucoseLogs"),  orderBy("createdAt","desc"), limit(100))),
      getDocs(query(childPath("mealLogs"),     orderBy("createdAt","desc"), limit(100))),
      getDocs(query(childPath("insulinLogs"),  orderBy("createdAt","desc"), limit(100)))
    ]);
    const lows  = gSnap.docs.filter(d => d.data().context === "low_sugar").length;
    const highs = gSnap.docs.filter(d => d.data().context === "high_sugar").length;
    card.innerHTML = `
      <div class="report-grid">
        <div class="report-stat"><div class="stat-num">${gSnap.size}</div><div class="stat-label">Total glucose logs</div></div>
        <div class="report-stat"><div class="stat-num">${mSnap.size}</div><div class="stat-label">Total meal logs</div></div>
        <div class="report-stat"><div class="stat-num">${iSnap.size}</div><div class="stat-label">Total insulin logs</div></div>
        <div class="report-stat"><div class="stat-num" style="color:#e74c3c">${lows}</div><div class="stat-label">Low events</div></div>
        <div class="report-stat"><div class="stat-num" style="color:#e67e22">${highs}</div><div class="stat-label">High events</div></div>
      </div>
      <div style="margin-top:12px">
        <button class="btn scarlet full" id="openFullReportsBtn">Open Full Reports</button>
      </div>`;
    const openBtn = document.getElementById("openFullReportsBtn");
    if(openBtn) openBtn.onclick = () => renderReportsData();
  }catch(err){
    if(card) card.innerHTML = `<div class="empty-state"><p>Pattern data could not load.</p></div>`;
  }
}

function renderAdultVaultSummary(){
  $app.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div class="logo-lockup">
          <div class="logo-small brand-mark"><img src="./assets/scarlet-diaries-header.png" alt="The Scarlet Diaries" /></div>
          <div class="topbar-title"><strong>Scarlet Vault</strong><p class="small muted">Amara's courage marks</p></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="build-tag">${BUILD}</span>
          <button class="btn secondary" id="backFromAdultVault">← Back</button>
        </div>
      </div>
      <div class="vault-summary">
        <div class="vault-count">${state.unlockedBadges.size}</div>
        <div class="vault-label">proofs of courage</div>
        <p class="vault-quote">Amara earned every one of these by checking, telling the truth, asking for help, and staying.</p>
      </div>
      <div class="card">
        <h3>All Badges</h3>
        <div class="badge-grid" style="margin-top:12px">
          ${BADGES.map(b => {
            const unlocked = state.unlockedBadges.has(b.id);
            return `
              <div class="badge-card ${unlocked?"unlocked":"locked"}">
                <div class="badge-seal"><span>${unlocked?"✦":"◌"}</span></div>
                <h3>${esc(b.name)}</h3>
                <p class="badge-desc">${unlocked ? esc(b.subtitle) : "Not yet earned"}</p>
                <p class="badge-rule">${esc(b.rule)}</p>
              </div>`;
          }).join("")}
        </div>
      </div>
    </div>`;
  bindGlobal();
  document.getElementById("backFromAdultVault").onclick = () => renderAdult();
}

// ── AUTH STATE LISTENER ───────────────────────────────────────
onAuthStateChanged(auth, async user => {
  const justLoggedIn = sessionStorage.getItem("scarletJustLoggedIn") === "yes";
  if(state.loginInProgress || state.pendingRepair) return;
  if(user && justLoggedIn){
    state.user = user;
    state.role = localStorage.getItem("scarletRole") || "child";
    await loadData();
    render();
  }else{
    if(state.firebaseOffline && state.user) return;
    if(user) await signOut(auth);
    state.user = null; state.role = null;
    renderLogin();
  }
});
