// src/utils/helpers.js — single source of truth for all utilities + static data

export const uid = () => Math.random().toString(36).slice(2, 9);
export const todayStr = () => new Date().toISOString().split('T')[0];
export const fmtDate = d => {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); }
  catch { return d; }
};
export const greet = () => {
  const h = new Date().getHours();
  if (h >= 23 || h < 4) return 'You\'re up late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};
export function getDailyMessage() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun,6=Sat
  const hour = now.getHours();

  if (day === 1) return "Is it a flare or just 'Monday'? Either way, we've got the data to prove it.";

  const allQuotes = [
    "Data is the new black. And you, darling, are wearing it well.",
    "High standards, higher clarity. Let's make this appointment count.",
    "Your story is the most important one in the room. Let's tell it clearly.",
    "Healing isn't a race; it's a rhythm. Find yours today.",
    "You are the expert on your own experience.",
    "Rest is a strategic decision. Take it when you need it.",
    "Hydrate like you're preparing for a red carpet. Your cells will thank you.",
    "Every entry is a bridge to a better conversation with your team.",
    "The most important voice in this room is yours. We're just here to amplify it.",
    "Your body is a masterpiece in progress. Every log is a brushstroke.",
    "Take a breath. You are seen.",
    "Quiet strength is still strength. Honor your pace today.",
    "You aren't just a chart number; you're the CEO of this journey.",
    "Think of your doctor as a consultant — you're the one running the board meeting.",
    "Evidence is the antidote to uncertainty. Keep building your case.",
    "They'll call it 'difficult.' We call it 'discerning.'",
    "Brain fog is just your mind being in Airplane Mode. Let's land safely together.",
    "Your energy is the ultimate currency. Spend it wisely.",
    "They call it 'medical history.' I call it 'the receipts.' We're keeping every one.",
    "Your data is a love letter to your future self. It says: 'I was listening.'",
    "A symptom is just a sensation looking for a name. Help it find one.",
    "Don't just track the storm; track the moments the sun breaks through.",
    "Your sensitivity isn't a symptom — it's your soul staying awake to the world.",
    "The strength it takes to get through a hard health day is immeasurable.",
    "You are not your diagnosis. You are so much more.",
    "Flares do not erase your progress.",
    "Your body is doing its absolute best.",
    "You are worthy of compassionate, thoughtful care.",
    "One bad day is a fluke. Seven in a row is a trend. Trends get treated.",
    "You wouldn't run a business without an accountant. Don't run a chronic condition without a ledger.",
  ];

  if (hour < 10) {
    const morningQuotes = [
      "Good morning, CEO. Your body's boardroom is open. Let's check in.",
      "Morning check: have you had water yet? Your cells are already in a group chat about it.",
      "The most productive thing you can do right now is take your meds and drink something. In that order.",
    ];
    return morningQuotes[day % morningQuotes.length];
  }
  if (hour >= 20) {
    const eveningQuotes = [
      "Whatever today was, you got through it. That is enough.",
      "Before you sleep — did you log today? Your future self will thank you.",
      "Rest is not giving up. Rest is how you survive to fight another day.",
    ];
    return eveningQuotes[day % eveningQuotes.length];
  }

  return allQuotes[Math.floor(Math.random() * allQuotes.length)];
}

export const UPLIFTING_MESSAGES = [
  'Rest is not giving up — it is how your body heals.',
  'Your symptoms are real. Your pain is valid. You deserve answers.',
  'Every appointment you prepare for is an act of courage.',
  'You are not your diagnosis. You are so much more.',
  'Small steps still move you forward. Always.',
  'Advocating for yourself is one of the bravest things you can do.',
  'Your story matters — and you deserve a doctor who listens to it.',
  'Healing is not linear. Be gentle with yourself today.',
  'The strength it takes to get through a hard health day is immeasurable.',
  'You are doing better than you think.',
  'Chronic illness does not define your worth or your future.',
  'It\'s okay to ask for help. That\'s strength, not weakness.',
];

// ── Proactive greeting based on time of day ───────────────────
export const getProactiveGreeting = (name, appointments = []) => {
  const now  = new Date();
  const h    = now.getHours();
  const n    = name ? `, ${name}` : '';

  // Check for infusion in next 48 hours
  const soon = appointments.find(a => {
    if (!a.isInfusion) return false;
    const apptDate = new Date(a.date + 'T09:00:00');
    const diff = (apptDate - now) / (1000 * 60 * 60);
    return diff > 0 && diff <= 48;
  });
  if (soon) return `I know your ${soon.provider || 'infusion'} is coming up soon${n}. It's okay to feel a little tired or anxious right now — that's completely valid. I'm right here with you. Should we go over your prep checklist together?`;

  if (h >= 23 || h < 4) return `Still awake${n}? I'm here if you need to talk through your symptoms, vent about your day, or prep for an upcoming appointment. You don't have to do this alone.`;
  if (h < 7)  return `Early start${n}. How are you feeling this morning? Sometimes the hardest part is just getting up. You're already doing it. 💜`;
  if (h < 12) return `Good morning${n}. Let's start the day gently — how are you feeling right now?`;
  if (h < 17) return `Afternoon${n}. Checking in — how has your energy been today?`;
  if (h < 21) return `Good evening${n}. How did today treat you? I'm here to listen.`;
  return `Getting late${n}. How are you feeling before bed? Any symptoms worth noting?`;
};

// ── Body map data ─────────────────────────────────────────────
export const BODY_PAIN_TYPES = ['Aching','Sharp','Burning','Throbbing','Stabbing','Cramping','Stiffness','Tingling','Numbness','Pressure','Shooting','Tenderness'];

export const BODY_PART_GROUPS = {
  'Both Hands':['Left Hand','Right Hand'],
  'Both Feet':['Left Foot','Right Foot'],
  'Both Knees':['Left Knee','Right Knee'],
  'Both Shoulders':['Left Shoulder','Right Deltoid'],
  'Both Hips':['Left Hip','Right Hip'],
  'Both Ankles':['Left Ankle','Right Ankle'],
  'Both Elbows':['Left Elbow','Right Elbow'],
  'Both Wrists':['Left Wrist','Right Wrist'],
  'Full Back':['Upper Back','Mid Back','Lower Back'],
};

export const getMuscleBaseColor = id => {
  if (id.includes('head')||id.includes('neck'))      return {fill:'rgba(180,140,120,.15)',stroke:'rgba(180,140,120,.45)'};
  if (id.includes('trap')||id.includes('deltoid'))   return {fill:'rgba(123,47,190,.12)',stroke:'rgba(150,80,210,.4)'};
  if (id.includes('pec')||id.includes('rhomboid'))   return {fill:'rgba(100,60,180,.12)',stroke:'rgba(120,80,200,.38)'};
  if (id.includes('lat')||id.includes('erector'))    return {fill:'rgba(80,50,160,.14)',stroke:'rgba(100,70,190,.42)'};
  if (id.includes('abs')||id.includes('oblique'))    return {fill:'rgba(90,55,170,.13)',stroke:'rgba(110,70,195,.4)'};
  if (id.includes('bicep')||id.includes('tricep'))   return {fill:'rgba(110,65,185,.13)',stroke:'rgba(130,80,200,.42)'};
  if (id.includes('forearm'))                         return {fill:'rgba(100,60,175,.12)',stroke:'rgba(120,75,195,.4)'};
  if (id.includes('wrist')||id.includes('hand'))     return {fill:'rgba(130,90,160,.12)',stroke:'rgba(150,100,180,.38)'};
  if (id.includes('glute')||id.includes('hip'))      return {fill:'rgba(140,60,180,.13)',stroke:'rgba(155,75,195,.42)'};
  if (id.includes('quad')||id.includes('hamstring')) return {fill:'rgba(90,50,175,.14)',stroke:'rgba(110,65,195,.44)'};
  if (id.includes('knee'))                            return {fill:'rgba(160,100,180,.12)',stroke:'rgba(175,115,195,.4)'};
  if (id.includes('shin')||id.includes('calf'))      return {fill:'rgba(80,45,165,.13)',stroke:'rgba(100,60,185,.42)'};
  if (id.includes('ankle'))                           return {fill:'rgba(150,95,175,.12)',stroke:'rgba(165,110,190,.4)'};
  if (id.includes('foot')||id.includes('heel'))      return {fill:'rgba(120,75,165,.12)',stroke:'rgba(140,90,185,.38)'};
  return {fill:'rgba(100,60,170,.12)',stroke:'rgba(120,75,190,.38)'};
};

export const FRONT_MUSCLES = [
  {id:'head',label:'Head',d:'M120,8 C100,6 83,18 82,36 C81,50 88,62 100,68 C106,71 114,73 120,73 C126,73 134,71 140,68 C152,62 159,50 158,36 C157,18 140,6 120,8 Z'},
  {id:'neck',label:'Neck',d:'M108,73 L108,92 Q120,96 132,92 L132,73 Q126,76 120,76 Q114,76 108,73 Z'},
  {id:'l_deltoid',label:'Left Shoulder',d:'M87,92 C75,90 61,96 54,108 C49,118 50,130 57,136 C63,141 73,140 80,134 L88,118 L88,95 Z'},
  {id:'r_deltoid',label:'Right Deltoid',d:'M153,92 C165,90 179,96 186,108 C191,118 190,130 183,136 C177,141 167,140 160,134 L152,118 L152,95 Z'},
  {id:'l_pec',label:'Left Pectoral',d:'M108,92 L88,95 L80,134 L96,140 Q108,136 114,128 L114,92 Z'},
  {id:'r_pec',label:'Right Pectoral',d:'M132,92 L152,95 L160,134 L144,140 Q132,136 126,128 L126,92 Z'},
  {id:'l_oblique',label:'Left Oblique',d:'M96,140 L80,134 L76,168 L86,176 Q98,172 104,162 L108,148 Z'},
  {id:'r_oblique',label:'Right Oblique',d:'M144,140 L160,134 L164,168 L154,176 Q142,172 136,162 L132,148 Z'},
  {id:'upper_abs',label:'Upper Abs',d:'M108,128 L114,128 Q120,130 126,128 L132,128 L132,148 Q124,152 116,152 L108,148 Z'},
  {id:'lower_abs',label:'Lower Abs',d:'M108,148 L116,152 Q120,153 124,152 L132,148 L132,170 Q124,175 116,175 L108,170 Z'},
  {id:'l_hip_flexor',label:'Left Hip',d:'M86,176 L76,168 L74,192 L84,204 Q96,206 106,200 L108,186 L104,162 Z'},
  {id:'r_hip_flexor',label:'Right Hip',d:'M154,176 L164,168 L166,192 L156,204 Q144,206 134,200 L132,186 L136,162 Z'},
  {id:'groin',label:'Groin / Pelvis',d:'M108,170 L108,186 Q114,188 120,188 Q126,188 132,186 L132,170 Q124,175 116,175 Z'},
  {id:'l_bicep',label:'Left Bicep',d:'M57,136 L50,140 L44,178 Q46,188 55,192 L62,188 L64,164 L80,134 Z'},
  {id:'r_bicep',label:'Right Bicep',d:'M183,136 L190,140 L196,178 Q194,188 185,192 L178,188 L176,164 L160,134 Z'},
  {id:'l_forearm_front',label:'Left Forearm',d:'M44,178 L38,200 L36,224 Q40,234 50,236 L56,232 L62,208 L62,188 L55,192 Z'},
  {id:'r_forearm_front',label:'Right Forearm',d:'M196,178 L202,200 L204,224 Q200,234 190,236 L184,232 L178,208 L178,188 L185,192 Z'},
  {id:'l_wrist_front',label:'Left Wrist',d:'M36,224 L34,238 Q38,246 46,246 L54,244 L56,232 L50,236 Z'},
  {id:'r_wrist_front',label:'Right Wrist',d:'M204,224 L206,238 Q202,246 194,246 L186,244 L184,232 L190,236 Z'},
  {id:'l_hand',label:'Left Hand',d:'M30,238 L28,256 Q30,270 40,278 Q50,284 58,278 Q64,268 64,256 L54,244 L46,246 Z'},
  {id:'r_hand',label:'Right Hand',d:'M210,238 L212,256 Q210,270 200,278 Q190,284 182,278 Q176,268 176,256 L186,244 L194,246 Z'},
  {id:'l_quad',label:'Left Quad',d:'M84,204 L74,192 L68,228 L66,268 L70,286 L84,290 Q96,288 100,278 L102,256 L106,220 L106,200 Z'},
  {id:'r_quad',label:'Right Quad',d:'M156,204 L166,192 L172,228 L174,268 L170,286 L156,290 Q144,288 140,278 L138,256 L134,220 L134,200 Z'},
  {id:'l_inner_thigh',label:'Left Inner Thigh',d:'M108,186 L106,200 L106,220 L102,256 Q108,262 114,262 L114,200 Q112,194 108,186 Z'},
  {id:'r_inner_thigh',label:'Right Inner Thigh',d:'M132,186 L134,200 L134,220 L138,256 Q132,262 126,262 L126,200 Q128,194 132,186 Z'},
  {id:'l_knee',label:'Left Knee',d:'M66,268 L70,286 L84,290 L96,288 L100,278 L102,256 L96,260 Q84,268 76,268 Z'},
  {id:'r_knee',label:'Right Knee',d:'M174,268 L170,286 L156,290 L144,288 L140,278 L138,256 L144,260 Q156,268 164,268 Z'},
  {id:'l_shin',label:'Left Shin',d:'M70,286 L68,314 L66,344 L72,358 L84,362 L88,350 L86,318 L84,290 Z'},
  {id:'r_shin',label:'Right Shin',d:'M170,286 L172,314 L174,344 L168,358 L156,362 L152,350 L154,318 L156,290 Z'},
  {id:'l_peroneal',label:'Left Calf',d:'M84,290 L86,318 L88,350 L84,362 Q82,374 80,382 L88,386 Q100,384 106,374 L104,354 L100,316 L96,288 Z'},
  {id:'r_peroneal',label:'Right Calf',d:'M156,290 L154,318 L152,350 L156,362 Q158,374 160,382 L152,386 Q140,384 134,374 L136,354 L140,316 L144,288 Z'},
  {id:'l_ankle',label:'Left Ankle',d:'M66,344 L64,358 Q64,368 70,374 Q78,378 84,374 Q88,370 88,362 L84,362 L72,358 Z'},
  {id:'r_ankle',label:'Right Ankle',d:'M174,344 L176,358 Q176,368 170,374 Q162,378 156,374 Q152,370 152,362 L156,362 L168,358 Z'},
  {id:'l_foot',label:'Left Foot',d:'M60,370 L56,382 L52,396 Q52,408 60,414 Q70,420 82,416 Q92,410 96,398 Q98,386 94,376 L80,382 Q72,382 64,374 Z'},
  {id:'r_foot',label:'Right Foot',d:'M180,370 L184,382 L188,396 Q188,408 180,414 Q170,420 158,416 Q148,410 144,398 Q142,386 146,376 L160,382 Q168,382 176,374 Z'},
];

export const BACK_MUSCLES = [
  {id:'b_head',label:'Back of Head',d:'M120,8 C100,6 83,18 82,36 C81,50 88,62 100,68 C106,71 114,73 120,73 C126,73 134,71 140,68 C152,62 159,50 158,36 C157,18 140,6 120,8 Z'},
  {id:'b_neck',label:'Back of Neck',d:'M108,73 L108,92 Q120,96 132,92 L132,73 Q126,76 120,76 Q114,76 108,73 Z'},
  {id:'b_l_trap',label:'Left Trapezius',d:'M108,92 L87,92 L72,100 L66,114 L74,124 L88,118 L96,116 Z'},
  {id:'b_r_trap',label:'Right Trapezius',d:'M132,92 L153,92 L168,100 L174,114 L166,124 L152,118 L144,116 Z'},
  {id:'b_l_deltoid',label:'Left Deltoid (back)',d:'M87,92 C75,90 61,96 54,108 C49,118 50,130 57,136 L62,130 L68,120 L80,108 L88,100 L88,92 Z'},
  {id:'b_r_deltoid',label:'Right Deltoid (back)',d:'M153,92 C165,90 179,96 186,108 C191,118 190,130 183,136 L178,130 L172,120 L160,108 L152,100 L152,92 Z'},
  {id:'b_rhomboid',label:'Rhomboids',d:'M96,116 L88,118 L86,136 L96,140 L120,144 L144,140 L154,136 L152,118 L144,116 L120,120 Z'},
  {id:'b_l_lat',label:'Left Lat',d:'M86,136 L57,136 L54,160 L60,180 L72,190 L84,188 L90,174 L96,156 L96,140 Z'},
  {id:'b_r_lat',label:'Right Lat',d:'M154,136 L183,136 L186,160 L180,180 L168,190 L156,188 L150,174 L144,156 L144,140 Z'},
  {id:'b_l_erector',label:'Left Erector Spinae',d:'M114,120 L108,134 L106,164 L108,188 L114,192 L120,194 L120,120 Z'},
  {id:'b_r_erector',label:'Right Erector Spinae',d:'M126,120 L132,134 L134,164 L132,188 L126,192 L120,194 L120,120 Z'},
  {id:'b_l_tricep',label:'Left Tricep',d:'M57,136 L50,140 L44,178 Q46,188 55,192 L64,188 L68,168 L66,148 L60,140 Z'},
  {id:'b_r_tricep',label:'Right Tricep',d:'M183,136 L190,140 L196,178 Q194,188 185,192 L176,188 L172,168 L174,148 L180,140 Z'},
  {id:'b_l_forearm',label:'Left Forearm (back)',d:'M55,192 L44,178 L38,200 L36,224 Q40,234 50,236 L56,232 L62,208 L64,188 Z'},
  {id:'b_r_forearm',label:'Right Forearm (back)',d:'M185,192 L196,178 L202,200 L204,224 Q200,234 190,236 L184,232 L178,208 L176,188 Z'},
  {id:'upper_back',label:'Upper Back',d:'M86,136 L154,136 L156,160 Q138,165 120,166 Q102,165 84,160 Z'},
  {id:'mid_back',label:'Mid Back',d:'M84,160 Q102,165 120,166 Q138,165 156,160 L158,190 Q138,196 120,197 Q102,196 82,190 Z'},
  {id:'lower_back',label:'Lower Back',d:'M82,190 Q102,196 120,197 Q138,196 158,190 L156,210 Q136,218 120,219 Q104,218 84,210 Z'},
  {id:'b_l_glute',label:'Left Glute',d:'M84,210 L72,190 L66,208 L68,230 L80,244 Q94,250 106,244 L108,226 L108,210 Z'},
  {id:'b_r_glute',label:'Right Glute',d:'M156,210 L168,190 L174,208 L172,230 L160,244 Q146,250 134,244 L132,226 L132,210 Z'},
  {id:'b_l_hamstring',label:'Left Hamstring',d:'M68,230 L66,268 L72,292 L82,298 L94,294 L100,276 L106,252 L106,244 Q94,250 80,244 Z'},
  {id:'b_r_hamstring',label:'Right Hamstring',d:'M172,230 L174,268 L168,292 L158,298 L146,294 L140,276 L134,252 L134,244 Q146,250 160,244 Z'},
  {id:'b_l_knee',label:'Left Knee (back)',d:'M72,292 L70,308 L76,318 L86,320 L96,316 L100,302 L100,276 L94,294 Z'},
  {id:'b_r_knee',label:'Right Knee (back)',d:'M168,292 L170,308 L164,318 L154,320 L144,316 L140,302 L140,276 L146,294 Z'},
  {id:'b_l_calf',label:'Left Calf (back)',d:'M76,318 L72,344 L72,368 Q76,378 84,380 Q92,380 96,372 L96,348 L96,316 L86,320 Z'},
  {id:'b_r_calf',label:'Right Calf (back)',d:'M164,318 L168,344 L168,368 Q164,378 156,380 Q148,380 144,372 L144,348 L144,316 L154,320 Z'},
  {id:'b_l_ankle',label:'Left Achilles',d:'M72,368 L68,382 Q68,394 76,398 Q84,400 90,394 L96,380 L96,372 Q92,380 84,380 Z'},
  {id:'b_r_ankle',label:'Right Achilles',d:'M168,368 L172,382 Q172,394 164,398 Q156,400 150,394 L144,380 L144,372 Q148,380 156,380 Z'},
  {id:'b_l_foot',label:'Left Heel',d:'M60,390 L58,408 Q60,420 72,422 Q84,422 92,414 L90,398 Q84,400 76,398 Q68,394 68,382 Z'},
  {id:'b_r_foot',label:'Right Heel',d:'M180,390 L182,408 Q180,420 168,422 Q156,422 148,414 L150,398 Q156,400 164,398 Q172,394 172,382 Z'},
];

// ── Brain lobe data ───────────────────────────────────────────
export const BRAIN_LOBES = [
  {id:'frontal',label:'Frontal Lobe',desc:'Emotion, decision-making, organization',d:'M90,46 C72,44 52,52 40,68 C30,80 28,98 34,112 C40,124 52,132 66,136 L82,134 L90,118 L94,100 L96,80 L96,58 Z',color:'#b8a830',labelPos:{x:58,y:90}},
  {id:'prefrontal',label:'Prefrontal Cortex',desc:'Short-term memory, attention',d:'M96,58 L96,80 L94,100 L90,118 L96,130 L104,132 L110,118 L112,100 L110,78 L106,60 Z',color:'#c8a020',labelPos:{x:103,y:97}},
  {id:'motor',label:'Motor Cortex',desc:'Movement and coordination',d:'M110,78 L112,100 L110,118 L116,132 L124,136 L132,132 L136,116 L136,96 L130,78 L120,72 Z',color:'#d4661a',labelPos:{x:123,y:106}},
  {id:'somatosensory',label:'Somatosensory',desc:'Processing sensations',d:'M130,78 L136,96 L136,116 L132,132 L138,138 L148,140 L156,134 L158,116 L156,94 L148,78 Z',color:'#c03010',labelPos:{x:144,y:110}},
  {id:'parietal',label:'Parietal Lobe',desc:'Sensory info, spatial awareness',d:'M148,78 L156,94 L158,116 L156,134 L164,136 L174,130 L180,118 L180,96 L174,78 L162,70 Z',color:'#7040b0',labelPos:{x:165,y:106}},
  {id:'temporal',label:'Temporal Lobe',desc:'Long-term memory, language, hearing',d:'M34,112 C28,126 28,146 34,160 C40,172 52,180 66,182 L78,178 L86,166 L90,148 L88,132 L82,134 L66,136 Z',color:'#6a7820',labelPos:{x:54,y:154}},
  {id:'occipital',label:'Occipital Lobe',desc:'Visual processing',d:'M164,136 L174,130 L180,118 L182,138 L180,156 L170,168 L156,172 L144,168 L138,156 L138,138 L148,140 L156,134 Z',color:'#2060b0',labelPos:{x:161,y:153}},
  {id:'cerebellum',label:'Cerebellum',desc:'Skill memory, movement coordination',d:'M86,166 L78,178 L66,182 L68,196 L80,208 L96,214 L112,216 L128,214 L142,208 L152,196 L152,180 L142,170 L130,168 L118,166 L104,164 Z',color:'#148888',labelPos:{x:109,y:196}},
  {id:'brainstem',label:'Brain Stem',desc:'Heart rate, breathing, alertness, sleep',d:'M104,164 L118,166 L130,168 L134,182 L132,196 L128,214 L116,218 L104,218 L96,214 L96,198 L98,182 Z',color:'#20a898',labelPos:{x:115,y:200}},
];

export const BRAIN_SYMPTOMS = [
  {id:'migraine',label:'Migraine / Headache',icon:'⚡',anim:'lightning'},
  {id:'pressure',label:'Pressure / Tension',icon:'🔴',anim:'heatmap'},
  {id:'brain_fog',label:'Brain Fog',icon:'☁️',anim:'fog'},
  {id:'fatigue',label:'Mental Fatigue',icon:'💤',anim:'fatigue'},
  {id:'tingling',label:'Tingling / Numbness',icon:'✦',anim:'pulse'},
  {id:'confusion',label:'Confusion / Disorientation',icon:'◎',anim:'spin'},
];

// ── Doctor summary builder ────────────────────────────────────
export const buildDoctorSummary = (data, aiMessages = []) => {
  const today = new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const name  = data.profile?.name || 'Patient';
  const conds = data.profile?.conditions || 'Not specified';

  const symptoms = data.symptoms?.slice(0,7).map(s =>
    `• ${fmtDate(s.date)}: ${s.entries?.map(e=>`${e.symptom}(${e.severity}/10)`).join(', ')||'—'} | Pain ${s.pain}/10 · Energy ${s.energy}/10 · Mood ${s.mood}/10${s.notes?'\n  '+s.notes:''}`
  ).join('\n') || 'None logged';

  const meds = data.medications?.filter(m=>m.active).map(m=>`• ${m.name} ${m.dose} (${m.frequency})`).join('\n') || 'None';
  const bodyPain = (data.bodyMap||[]).sort((a,b)=>b.severity-a.severity).slice(0,8).map(b=>`• ${b.label}: ${b.severity}/10${b.types?.length?' — '+b.types.join(', '):''}`).join('\n') || 'None';
  const brainLogs = (data.brain||[]).slice(0,5).map(b=>`• ${fmtDate(b.date)}: ${b.symptomLabel} — ${b.regionLabels?.join(', ')} (intensity ${b.intensity}/10)`).join('\n') || 'None';
  const lastAI = aiMessages.filter(m=>m.role==='assistant').slice(-1)[0]?.content||'';
  const aiSection = lastAI ? `\n─── AI Advocate Summary ─────────────────────\n${lastAI.slice(0,600)}${lastAI.length>600?'…':''}` : '';

  return `ADVY HEALTH — PATIENT SUMMARY\nGenerated: ${today}\nPatient: ${name}\nConditions: ${conds}\n\n─── Recent Symptoms ──────────────────────────\n${symptoms}\n\n─── Active Medications ───────────────────────\n${meds}\n\n─── Body Pain Map ────────────────────────────\n${bodyPain}\n\n─── Neurological Logs ────────────────────────\n${brainLogs}${aiSection}\n\nGenerated by Advy Health. Self-report only — not a clinical document.`.trim();
};
