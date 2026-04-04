export const uid = () => Math.random().toString(36).slice(2, 9);
export const todayStr = () => new Date().toISOString().split('T')[0];
export const fmtDate = d => {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); }
  catch { return d; }
};
export const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

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

export const getDailyMessage = () => {
  const idx = new Date().getDate() % UPLIFTING_MESSAGES.length;
  return UPLIFTING_MESSAGES[idx];
};
