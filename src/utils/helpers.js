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
  'You are not your diagnosis. You are so much more.',
  'Small steps still move you forward. Always.',
  'Advocating for yourself is one of the bravest things you can do.',
  'Your story matters — and you deserve a doctor who listens.',
  'Healing is not linear. Be gentle with yourself today.',
  'The strength it takes to get through a hard health day is immeasurable.',
  'You are doing better than you think.',
  'Chronic illness does not define your worth or your future.',
  "It's okay to ask for help. That's strength, not weakness.",
  'You have survived every hard day so far. That matters.',
  'Your body is trying its best. So are you.',
  'Rest today so you can advocate tomorrow.',
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