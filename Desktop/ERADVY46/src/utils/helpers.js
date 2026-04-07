// src/utils/helpers.js

export const uid = () => Math.random().toString(36).substring(2, 9);
export const todayStr = () => new Date().toISOString().split('T')[0];
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const greet = () => {
  const hrs = new Date().getHours();
  if (hrs < 12) return 'Good Morning';
  if (hrs < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export const getDailyMessage = () => "Your health journey is a marathon, not a sprint. 💜";
export const getProactiveGreeting = () => "Ready to log your vitals today?";
export const buildDoctorSummary = (data) => `Patient Summary: ${data.profile.name || 'User'}`;

// Data Constants required for BodyMap and BrainSection
export const FRONT_MUSCLES = ['Traps', 'Deltoids', 'Pectorals', 'Abdominals', 'Quads'];
export const BACK_MUSCLES = ['Upper Back', 'Lower Back', 'Glutes', 'Hamstrings'];
export const getMuscleBaseColor = () => '#2A2438';
export const BODY_PAIN_TYPES = ['Aching', 'Sharp', 'Burning', 'Numbness'];
export const BODY_PART_GROUPS = { 'Torso': ['Chest', 'Abdomen'], 'Legs': ['Upper', 'Lower'] };

export const BRAIN_LOBES = ['Frontal', 'Parietal', 'Temporal', 'Occipital'];
export const BRAIN_SYMPTOMS = { 'Frontal': ['Executive Function', 'Motor Control'] };