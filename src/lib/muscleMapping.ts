/**
 * Detailed Anatomical Muscle Grouping and Exercise Mapping
 * Maps resistance exercises to individual trainable muscles.
 */

export interface DetailedMuscleInfo {
  key: string;
  name: string;
  group: 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core' | 'Neck';
  view: 'front' | 'back' | 'both';
  description: string;
}

export const DETAILED_MUSCLES: DetailedMuscleInfo[] = [
  // Chest
  { key: 'upper_chest', name: 'Upper Chest (Clavicular)', group: 'Chest', view: 'front', description: 'Incline presses & incline flyes' },
  { key: 'mid_chest', name: 'Mid & Lower Chest (Sternal)', group: 'Chest', view: 'front', description: 'Flat bench, dips & chest flyes' },
  { key: 'serratus', name: 'Serratus Anterior', group: 'Chest', view: 'front', description: 'Serratus punches & pullovers' },

  // Back
  { key: 'lats', name: 'Lats (Latissimus Dorsi)', group: 'Back', view: 'back', description: 'Wide & close pulldowns, pull-ups' },
  { key: 'rhomboids', name: 'Rhomboids & Mid Traps', group: 'Back', view: 'back', description: 'Kelso shrugs, horizontal rows & face pulls' },
  { key: 'upper_traps', name: 'Upper Trapezius', group: 'Back', view: 'back', description: 'Barbell & dumbbell shrugs' },
  { key: 'lower_back', name: 'Lower Back (Erector Spinae)', group: 'Back', view: 'back', description: '45° back extensions & deadlifts' },

  // Shoulders
  { key: 'front_delt', name: 'Front Delts (Anterior)', group: 'Shoulders', view: 'front', description: 'Overhead & shoulder presses' },
  { key: 'side_delt', name: 'Side Delts (Lateral)', group: 'Shoulders', view: 'both', description: 'Lateral raises & lateral Y raises' },
  { key: 'rear_delt', name: 'Rear Delts (Posterior)', group: 'Shoulders', view: 'back', description: 'Reverse flyes & face pulls' },

  // Arms & Forearms
  { key: 'biceps', name: 'Biceps Brachii', group: 'Arms', view: 'front', description: 'Incline curls, preacher curls' },
  { key: 'triceps', name: 'Triceps (All Heads)', group: 'Arms', view: 'back', description: 'Pressdowns, overhead extensions, skull crushers' },
  { key: 'forearm_extensors', name: 'Forearms / Extensors', group: 'Arms', view: 'both', description: 'Reverse curls, wrist extensions & brachioradialis' },
  { key: 'forearm_flexors', name: 'Forearm Flexors', group: 'Arms', view: 'front', description: 'Wrist curls' },

  // Legs
  { key: 'quads', name: 'Quads (Quadriceps)', group: 'Legs', view: 'front', description: 'Hack squats, leg press, extensions' },
  { key: 'hamstrings', name: 'Hamstrings', group: 'Legs', view: 'back', description: 'Seated & lying leg curls, RDLs' },
  { key: 'glutes', name: 'Glutes', group: 'Legs', view: 'back', description: 'Squats, deadlifts, hip thrusts' },
  { key: 'calves', name: 'Calves (Gastroc & Soleus)', group: 'Legs', view: 'both', description: 'Standing & seated calf raises' },

  // Core & Neck
  { key: 'abs', name: 'Abs (Rectus Abdominis)', group: 'Core', view: 'front', description: 'Cable crunches, leg raises' },
  { key: 'obliques', name: 'Obliques', group: 'Core', view: 'front', description: 'Side bends, twists, woodchoppers' },
  { key: 'neck_flexors', name: 'Neck Flexors (SCM)', group: 'Neck', view: 'front', description: 'Neck flexion' },
  { key: 'neck_extensors', name: 'Neck Extensors', group: 'Neck', view: 'back', description: 'Neck extension' }
];

export function mapExerciseToDetailedMuscles(exercise: {
  name: string;
  muscle?: string;
  subMuscles?: string[];
  target?: string;
}): string[] {
  const nameL = exercise.name.toLowerCase();
  const subs = (exercise.subMuscles || []).map((s) => s.toLowerCase());
  const target = (exercise.target || '').toLowerCase();
  const combined = `${nameL} ${subs.join(' ')} ${target}`;

  const matched: Set<string> = new Set();

  // 1. Neck
  if (combined.includes('neck flex')) matched.add('neck_flexors');
  if (combined.includes('neck ext')) matched.add('neck_extensors');

  // 2. Chest
  if (combined.includes('serratus')) {
    matched.add('serratus');
  }
  if (combined.includes('incline') && (combined.includes('chest') || combined.includes('press') || combined.includes('fly'))) {
    matched.add('upper_chest');
  } else if (
    combined.includes('chest') ||
    combined.includes('bench') ||
    combined.includes('pec') ||
    combined.includes('dips')
  ) {
    if (!combined.includes('incline')) {
      matched.add('mid_chest');
    }
  }

  // 3. Back & Traps
  if (combined.includes('kelso') || combined.includes('rhomboid')) {
    matched.add('rhomboids');
  }
  if (combined.includes('shrug') && !combined.includes('kelso')) {
    matched.add('upper_traps');
  }
  if (
    combined.includes('pulldown') ||
    combined.includes('lat pull') ||
    combined.includes('pull-up') ||
    combined.includes('pullup') ||
    combined.includes('chin-up') ||
    combined.includes('lats')
  ) {
    matched.add('lats');
  }
  if (combined.includes('row') && !combined.includes('upright')) {
    matched.add('rhomboids');
    matched.add('lats');
  }
  if (combined.includes('back extension') || combined.includes('hyperextension') || combined.includes('erector')) {
    matched.add('lower_back');
  }

  // 4. Shoulders
  if (combined.includes('rear delt') || combined.includes('reverse fly') || combined.includes('face pull')) {
    matched.add('rear_delt');
  }
  if (combined.includes('lateral raise') || combined.includes('y raise') || combined.includes('side delt') || combined.includes('middle delt')) {
    matched.add('side_delt');
  }
  if (combined.includes('shoulder press') || combined.includes('ohp') || combined.includes('overhead press') || combined.includes('military') || combined.includes('front delt')) {
    matched.add('front_delt');
  }

  // 5. Arms & Forearms
  if (combined.includes('reverse curl') || combined.includes('wrist ext') || combined.includes('brachio')) {
    matched.add('forearm_extensors');
  } else if (combined.includes('wrist curl')) {
    matched.add('forearm_flexors');
  }

  if (
    (combined.includes('bicep') || combined.includes('curl')) &&
    !combined.includes('leg curl') &&
    !combined.includes('wrist') &&
    !combined.includes('reverse curl')
  ) {
    matched.add('biceps');
  }

  if (
    (combined.includes('tricep') ||
      combined.includes('pressdown') ||
      combined.includes('pushdown') ||
      combined.includes('skull crusher') ||
      (combined.includes('overhead') && !combined.includes('press') && !combined.includes('squat'))) &&
    !combined.includes('back ext') &&
    !combined.includes('wrist')
  ) {
    matched.add('triceps');
  }

  // 6. Legs
  if (
    combined.includes('hack squat') ||
    combined.includes('leg press') ||
    combined.includes('leg ext') ||
    (combined.includes('squat') && !combined.includes('overhead'))
  ) {
    matched.add('quads');
    if (combined.includes('squat') || combined.includes('press')) {
      matched.add('glutes');
    }
  }
  if (combined.includes('leg curl') || combined.includes('hamstring') || combined.includes('rdl') || combined.includes('romanian')) {
    matched.add('hamstrings');
  }
  if (combined.includes('calf') || combined.includes('calves')) {
    matched.add('calves');
  }

  // 7. Core
  if (combined.includes('crunch') || combined.includes('abs') || combined.includes('leg raise')) {
    matched.add('abs');
  }
  if (combined.includes('oblique') || combined.includes('twist') || combined.includes('woodchopper')) {
    matched.add('obliques');
  }

  // Fallback based on primary muscle if no specific rule matched
  if (matched.size === 0) {
    const m = (exercise.muscle || '').toLowerCase();
    if (m === 'chest') matched.add('mid_chest');
    else if (m === 'back') matched.add('lats');
    else if (m === 'shoulders') matched.add('side_delt');
    else if (m === 'arms') matched.add('biceps');
    else if (m === 'legs') matched.add('quads');
    else if (m === 'core') matched.add('abs');
    else matched.add('mid_chest');
  }

  return Array.from(matched);
}
