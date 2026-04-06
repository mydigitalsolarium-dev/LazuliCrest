// ─── Core helpers ─────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2, 9);
export const todayStr = () => new Date().toISOString().split('T')[0];
export const fmtDate = d => {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
};
export const greet = () => {
  const h = new Date().getHours();
  if (h < 5)  return 'Still awake';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good evening';
};
export const timeAwareGreeting = name => {
  const h = new Date().getHours();
  const n = name || 'Imago';
  if (h >= 22 || h < 5) return `Still awake, ${n}? I'm here if you need to talk through your symptoms or prep for your next appointment. 💜`;
  if (h < 9) return `Good morning, ${n}. How are you feeling as you start your day?`;
  return `${greet()}, ${n}. 💜`;
};

export const getDailyMessage = () => UPLIFTING[new Date().getDate() % UPLIFTING.length];

export const UPLIFTING = [
  'Rest is not giving up — it is how your body heals.',
  'Your symptoms are real. Your pain is valid. You deserve answers.',
  'Every appointment you prepare for is an act of courage.',
  'The goal isn’t just surviving the appointment—it’s being heard in it.',
  'You aren’t a "case" to be solved; you are a person to be understood.',
  'You are not your diagnosis. You are so much more.',
  'Medicine is a practice; your body is the truth. Honor the dialogue between them.',
  'Small steps still move you forward. Always.',
  'Advocating for yourself is one of the bravest things you can do.',
  'Your story matters — and you deserve a doctor who listens.',
  'When a provider doesn’t see you, they might be stuck in their own world. Invite them to cross the bridge into yours.',
  '🥣 Your "living energy" needs maintenance. Have you eaten anything nourishing today?'
  'You deserve a care team that mirrors your value and validates your reality.',
  'Healing is not linear. Be gentle with yourself today.',
  'Advocacy isn’t an attack; it’s a request for a deeper connection to your care.',
  'Your symptoms are your body’s attempt at a conversation. Are you listening, or just trying to fix?',
  'The strength it takes to get through a hard health day is immeasurable.',
  'The Space Between you and your provider is where healing lives. How are you tending to it today?',
  'Chronic illness does not define your worth or your future.',
  "It's okay to ask for help. That's strength, not weakness.",
  'Tracking isn’t about obsessing over illness; it’s about claiming the narrative of your health.',
  'One entry a day is a footprint. A month of entries is a path to an answer.',
  'Don’t track to find what’s "wrong"—track to find the patterns of your power.',
  'You have survived every hard day so far. That matters.',
  'Your body is trying its best. So are you.',
  'If a symptom feels small, track it anyway. The smallest data points often tell the loudest stories.',
  'A diagnosis is a label, not a limit. You are the one who defines the life lived within it.',
  'The most important clinical observation is the one you make in the mirror.',
  'Your boundaries are the "skin" of your soul. Do not let clinical coldness pierce them.',
  'Rest today so you can advocate tomorrow.',
  '💧 Thirsty? Your brain needs fluid to maintain the bridge. Take a sip.',
   'What if your body isn’t working against you, but trying to protect you from something it can’t handle yet?',
  '💧 Hydration is a small act of love for the body that carries you.',
  'Data is the only language some systems speak. Learn to speak it fluently.',
  'Your tracker is a time machine. It lets your future self explain today to a doctor who wasn’t there.',
  'Memory is a filter; data is a mirror. Track to see the reflection clearly.',
  'Don’t just track the "Bad." Track the "Baseline" so you know what a win actually looks like.',
  'When you track, you move from "Patient" to "Principal Investigator" of your own life.',
  'A doctor sees you for fifteen minutes; you see you for fifteen thousand. Your data is the missing piece.',
  'Think of every entry as a brick in the bridge between your lived experience and a clinical solution.',
  'You aren’t "complaining" when you track. You are documenting a biological reality.',
  'My favorite exercise is a cross between a lunge and a crunch. I call it lunch.',
  'I’m not "lazy," my body is just in "Power Saving Mode" today. Check the battery.',
  'If my body were a car, the "Check Engine" light would have been taped over years ago.',
  'Current Status: Investigating the "Space Between" my couch and my snacks.',
  'I don’t have "brain fog," I’m just living in a high-definition cloud. Very atmospheric.',
  'My joints are like a bowl of Rice Krispies: Snap, Crackle, and Pop.',
  '💧 You aren’t "cranky," you’re just a very advanced houseplant with complicated emotions. Drink water.',
  '🥣 If your "Inner Advocate" is hangry, the bridge is closed for repairs. We should find something to eat.',
  'I’m not ignoring my symptoms; we’re just having a "quiet period" in our relationship.',
  'Tracking is basically just Gossip Girl, but the "Gossip" is about my own nervous system.',
  'If you can’t "mirror" your needs today, just mirror a burrito and wrap yourself in a blanket. That always does the trick.',
  'The "Space Between" my appointments is where I pretend to be a functional human. It’s an art form, truly.',
  'If it’s worth feeling, it’s worth filing. Build your case for better care.',
  'The most powerful tool in the exam room isn’t the stethoscope—it’s your logbook.',
  'A doctor sees a 15-minute snapshot. You see the whole movie. Tracking is how you show them the highlights.',
  'Stop trying to remember how you felt three weeks ago. Your brain has enough to do; let the app hold the memories.',
  'If you dont track the "small" stuff, you won’t see the patterns until they become "big" problems.',
  'Tracking is the difference between saying "I feel bad" and saying "I have had a level 7 headache for 4 out of 5 days."',
  'Think of your data as a shield. It protects you from being told "it’s just stress" when the numbers show it isn’t.',
  'You wouldn’t run a business without an accountant. Don’t run a chronic condition without a ledger.',
  'When you have the data, you aren’t asking for help—you’re presenting a project for collaboration.',
  'One bad day is a fluke. Seven bad days in a row is a trend. Trends get treated.',
  'Tracking is how you prove to yourself—and everyone else—that you aren’t imagining things.',
  'Your body is a complex system. Every entry is a sensor reading. Keep the dashboard updated.',
  '💧 Your brain is 75% water. If you’re foggy, you might just be a "dry" engine. Drink up.',
  '🥣 Brain fog can often be a sign of low fuel. Have you actually eaten today, or are you running on fumes?',
  'Your data is a love letter to your future self. It says: "I was listening."',
  'Tracking isn’t about being "sick"; it’s about being "present" with your body.',
  'When you know your patterns, you can stop reacting and start responding.',
  'A symptom is just a sensation looking for a name. Help it find one.',
  'You are the lead architect of your own well-being. Keep the blueprints updated.',
  'Spotted: Your nervous system trying to stage a coup. Good thing you’ve got the data to negotiate.',
  'I’m not "unpredictable," I’m just a high-maintenance mystery novel. Every entry is a new chapter.',
  'Current Status: My "Inner Child" wants a gold star just for getting out of bed. ⭐ Granted.',
  'If my body were a smartphone, I’d be that one that stays at 1% for three hours then just gives up.',
  'I don’t have "mood swings," I have "emotional plot twists." Keep the audience guessing.',
  '💧 Your brain is basically a fancy sponge. Don’t let it get all crunchy—drink some water.',
  'Tracking is just like "Receipts" in a group chat. Don’t let your symptoms gaslight you.',
  'I’m not "avoiding" my to-do list; I’m "prioritizing my relational space" with the sofa.',
  'Advocacy isn’t a battle; it’s a re-introduction. "Hello, world. This is what I actually need."',
  'Your "Inner Advocate" called. She said you’re doing a great job and to please take a nap.',
  'The "Space Between" a bad day and a better one is usually paved with a little bit of data and a lot of grace.',
  'Every entry is a small bridge built toward a day with more "Yes" in it.',
  'Don’t just track the storm; track the moments the sun breaks through.',
  'Your body is a masterpiece in progress. The data is just the brushstrokes.',
  'Relational healing starts with the relationship you have with your own energy.',
  'If you wouldn’t ignore a friend’s pain, don’t ignore your own. Log it and move on.',
  '💧 A hydrated brain is a loud advocate. Take a sip for your voice.',
  'What if your symptoms are just your body asking for a deeper connection?',
  'Spotted: A high-functioning icon taking a rest day. Scandalous? No, essential.',
  'Your body is a luxury brand, and luxury brands require a lot of specialized maintenance.',
  'XOXO, Advocacy Bestie. Tell me everything—did that new med actually work or was it a flop?',
  'I’m not "unproductive," I’m just currently "investing in my internal infrastructure."',
  'If my symptoms were a group chat, I’d have them on "Mute" for at least an hour today.',
  'I don’t have "brain fog," I’m just experiencing some very high-level encryption of my thoughts.',
  '💧 Your brain is the CEO, but it’s currently on a water break. Don’t make it ask twice.',
  '🥣 "Low energy" is just a polite way of your body saying: "The kitchen is open. Feed me."',
  'Tracking is the ultimate "Receipt Archive." Don’t let a 15-minute appointment erase 15 days of data.',
  'I’m not "flaky," my nervous system just has a very exclusive guest list for today’s events.',
  'You aren’t "broken." You’re just a masterpiece that needs a specific climate-controlled gallery.',
  'If your doctor treats your symptoms like "yesterday’s news," it’s time for a new editor.',
  'Documentation is the only way to prove your "vibe" is actually a very specific biological trend.',
  'Advocacy isn’t a battle; it’s a re-branding. "I’m not a patient; I’m the Project Manager."',
  'Your "Inner Advocate" just checked the logs. She says you’re a legend and to drink some water.',
  'The "Space Between" a mystery and a diagnosis is just a few more data points. Stay the course.',
  'Spotted: Someone looking at their data and realizing they were right all along. We love a "told you so" moment.'
];

// ─── Blank data shape ─────────────────────────────────────────
export const BLANK_DATA = {
  profile:      { name: '', conditions: '', goal: '', accountType: 'self', careeName: '' },
  symptoms:     [],
  medications:  [],
  appointments: [],
  infusions:    [],
  documents:    [],
  diary:        [],
  diet:         [],
  dietLogs:     [],
  bodyMap:      [],
  brain:        [],
  labs:         [],
  vitals:       [],
  glucose:      [],
  hydration:    { today: 0, goal: 8, log: [] },
  deletedItems: [],
};

// ─── Symptom list ─────────────────────────────────────────────
export const SYMS = [
  'Fatigue','Pain','Headache','Nausea','Brain fog','Dizziness','Joint pain',
  'Muscle aches','Shortness of breath','Heart palpitations','Insomnia','Anxiety',
  'Swelling','Numbness','Rash','Digestive issues','Fever','Chills',
  'Burning sensation','Stiffness','Weakness','Tingling','Blurred vision',
  'Sensitivity to light','Sensitivity to sound','Memory issues','Confusion',
  'Chest tightness','Night sweats','Hot flashes','Dry eyes','Hair loss',
  'Weight changes','Dry mouth','Difficulty swallowing',
];

// ─── Infusion prep checklist ──────────────────────────────────
export const INFUSION_PREP = [
  { id: 'hydrate',  text: 'Drink 2+ extra glasses of water today and tomorrow' },
  { id: 'clothes',  text: 'Pack comfortable, loose-fitting clothes with easy IV access' },
  { id: 'snack',    text: 'Prepare a gentle snack (crackers, ginger chews, fruit)' },
  { id: 'movie',    text: 'Download a movie or show — something comforting' },
  { id: 'blanket',  text: 'Bring your own soft blanket or pillow' },
  { id: 'meds',     text: 'Take any prescribed pre-medications (anti-histamine, etc.)' },
  { id: 'driver',   text: 'Confirm transportation home is arranged' },
  { id: 'phone',    text: 'Charger and headphones packed' },
  { id: 'journal',  text: 'Bring your ADVY journal or have app open for real-time logging' },
];

// ─── Fridge items ─────────────────────────────────────────────
export const FRIDGE_ITEMS = [
  { id: 'water',        label: 'Water',          emoji: '💧', hydration: 1,   color: '#60a5fa' },
  { id: 'electrolytes', label: 'Electrolytes',   emoji: '⚡', hydration: 1.5, color: '#a78bfa' },
  { id: 'oj',           label: 'Orange Juice',   emoji: '🍊', hydration: 0.8, color: '#fb923c' },
  { id: 'matcha',       label: 'Matcha',         emoji: '🍵', hydration: 0.7, color: '#4ade80' },
  { id: 'coffee',       label: 'Coffee',         emoji: '☕', hydration: 0.5, color: '#92400e' },
  { id: 'green_tea',    label: 'Green Tea',      emoji: '🍵', hydration: 0.8, color: '#6ee7b7' },
  { id: 'chamomile',    label: 'Chamomile',      emoji: '🌼', hydration: 0.9, color: '#fde68a' },
  { id: 'hibiscus',     label: 'Hibiscus Tea',   emoji: '🌺', hydration: 0.9, color: '#f9a8d4' },
  { id: 'broth',        label: 'Bone Broth',     emoji: '🥣', hydration: 1,   color: '#d97706' },
];

// ─── Nav ──────────────────────────────────────────────────────
export const NAV = [
  { id: 'dashboard',    icon: '⬡',  label: 'Home'            },
  { id: 'symptoms',     icon: '◈',  label: 'Symptoms'        },
  { id: 'bodymap',      icon: '◎',  label: 'Body Map'        },
  { id: 'brain',        icon: '🧠', label: 'The Brain'       },
  { id: 'infusions',    icon: '💉', label: 'Infusions'       },
  { id: 'metabolic',    icon: '📊', label: 'Metabolic Lab'   },
  { id: 'medications',  icon: '◉',  label: 'Medications'     },
  { id: 'appointments', icon: '◷',  label: 'Appointments'    },
  { id: 'diary',        icon: '✑',  label: 'My Diary'        },
  { id: 'vault',        icon: '🔐', label: 'Medical Vault'   },
  { id: 'diet',         icon: '✿',  label: 'AI Diet'         },
  { id: 'hydration',    icon: '💧', label: 'Hydration'       },
  { id: 'advocate',     icon: '✦',  label: 'AI Advocate'     },
  { id: 'profile',      icon: '◈',  label: 'My Profile'      },
  { id: 'share',        icon: '⟡',  label: 'Share & Privacy' },
];

// ─── Soft delete helpers ──────────────────────────────────────
export const RECOVERY_DAYS = 7;

export const softDelete = (item, type) => ({
  ...item,
  _deleted: true,
  _deletedAt: new Date().toISOString(),
  _type: type,
});

export const isPermanentlyDeleted = item => {
  if (!item._deleted) return false;
  const age = (Date.now() - new Date(item._deletedAt).getTime()) / (1000 * 60 * 60 * 24);
  return age > RECOVERY_DAYS;
};

// ─── Doctor summary builder ───────────────────────────────────
export const buildDoctorSummary = (data, aiMessages = []) => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const name  = data.profile?.name || 'Imago';
  const conds = data.profile?.conditions || 'Not specified';

  const symptoms = data.symptoms?.slice(0, 7).map(s =>
    `• ${fmtDate(s.date)}: ${s.entries?.map(e => `${e.symptom} (${e.severity}/10)`).join(', ') || '—'}` +
    ` | Pain ${s.pain}/10 · Energy ${s.energy}/10 · Mood ${s.mood}/10`
  ).join('\n') || 'None logged';

  const meds = data.medications?.filter(m => m.active).map(m =>
    `• ${m.name} ${m.dose} (${m.frequency})`
  ).join('\n') || 'None';

  const lastAI = aiMessages.filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';

  return `ADVY HEALTH — PATIENT SUMMARY
Generated: ${today}
Patient: ${name}
Conditions: ${conds}

─── Recent Symptoms ───────────────────────────────────────────
${symptoms}

─── Active Medications ────────────────────────────────────────
${meds}

─── AI Advocate Notes ─────────────────────────────────────────
${lastAI ? lastAI.slice(0, 600) : 'No AI notes yet.'}

─── Note ──────────────────────────────────────────────────────
This is a patient self-report generated by ADVY Health.
Not a clinical document.`.trim();
};

