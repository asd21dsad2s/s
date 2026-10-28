/**
 * GymLite - Ultra-Fast Local-First IndexedDB Engine
 * Zero external database dependencies, 100% offline, persistent on Android & Web.
 */

export interface WorkoutSet {
  id: string;
  setNumber: number;
  weight: string;
  reps: string;
  completed: boolean;
  rpe?: number;
}

export interface WorkoutExercise {
  id: string;
  rawId?: string;
  name: string;
  muscle: string;
  subMuscles?: string[];
  equipment?: string;
  supersetGroupId?: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  name: string;
  startTime: string; // ISO string
  endTime?: string;   // ISO string
  status: 'active' | 'completed';
  exercises: WorkoutExercise[];
  notes?: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  category: string;
  exercises: { name: string; muscle: string; defaultSets?: number; supersetGroupId?: string }[];
}

export interface ExerciseItem {
  id: string;
  rawId?: string;
  name: string;
  muscle: 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core' | 'Full Body';
  subMuscles?: string[];
  equipment?: string;
  target?: string;
  isCustom?: boolean;
}

let _cachedCatalog: ExerciseItem[] | null = null;

export async function getOpenGymExercises(): Promise<ExerciseItem[]> {
  if (_cachedCatalog) return _cachedCatalog;
  try {
    const mod = await import('../data/openGymExercises.json');
    _cachedCatalog = (mod.default || mod) as ExerciseItem[];
  } catch (err) {
    console.error('Failed to lazy load exercise catalog:', err);
    _cachedCatalog = DEFAULT_EXERCISES;
  }
  return _cachedCatalog;
}

export const OPEN_GYM_EXERCISES: ExerciseItem[] = [];

export interface AppSettings {
  unit: 'KG';
  defaultRestSeconds: number; // Defaults to 165s (2:45)
  soundAlert: boolean;
  soundType: 'chime' | 'boxing' | 'pulse' | 'high_beep';
  autoStartTimer: boolean;
  soundVolume: number;
  exerciseRestDefaults: Record<string, number>; // Custom rest timer per exercise
}

export const DEFAULT_SETTINGS: AppSettings = {
  unit: 'KG',
  defaultRestSeconds: 165, // 2 minutes 45 seconds
  soundAlert: true,
  soundType: 'chime',
  autoStartTimer: true,
  soundVolume: 0.8,
  exerciseRestDefaults: {}
};

export const DEFAULT_EXERCISES: ExerciseItem[] = [
  // Full Body Routine Exercises
  { id: 'ex_fb_1', name: 'Lat Pulldown (Wide grip)', muscle: 'Back', equipment: 'Cable' },
  { id: 'ex_fb_2', name: 'Lat Pulldown (close grip)', muscle: 'Back', equipment: 'Cable' },
  { id: 'ex_fb_3', name: 'Wide-Grip Row +Kelso SS', muscle: 'Back', equipment: 'Cable' },
  { id: 'ex_fb_4', name: 'Kelso Shrug', muscle: 'Back', equipment: 'Barbell' },
  { id: 'ex_fb_5', name: 'Rear Delt Reverse Fly', muscle: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'ex_fb_6', name: 'Shrug', muscle: 'Back', equipment: 'Dumbbell' },
  { id: 'ex_fb_7', name: 'Seated Lateral Raise', muscle: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'ex_fb_8', name: 'Lateral Y Raise', muscle: 'Shoulders', equipment: 'Cable' },
  { id: 'ex_fb_9', name: 'Shoulder Press', muscle: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'ex_fb_10', name: 'Seated Incline Curl', muscle: 'Arms', equipment: 'Dumbbell' },
  { id: 'ex_fb_11', name: 'Preacher Curl', muscle: 'Arms', equipment: 'Machine' },
  { id: 'ex_fb_12', name: 'EZ-Bar Reverse Curl', muscle: 'Arms', equipment: 'Barbell' },
  { id: 'ex_fb_13', name: 'Triceps Pressdown', muscle: 'Arms', equipment: 'Cable' },
  { id: 'ex_fb_14', name: 'Overhead Triceps Extension', muscle: 'Arms', equipment: 'Cable' },
  { id: 'ex_fb_15', name: 'Wrist Curl', muscle: 'Arms', equipment: 'Barbell' },
  { id: 'ex_fb_16', name: 'Wrist Extension', muscle: 'Arms', equipment: 'Barbell' },

  // Chest & Misc Routine Exercises
  { id: 'ex_cm_1', name: 'Chest Fly', muscle: 'Chest', equipment: 'Cable' },
  { id: 'ex_cm_2', name: 'Incline Chest Fly', muscle: 'Chest', equipment: 'Dumbbell' },
  { id: 'ex_cm_3', name: 'Barbell Serratus Punch', muscle: 'Chest', equipment: 'Barbell' },
  { id: 'ex_cm_4', name: 'Cable Crunch', muscle: 'Core', equipment: 'Cable' },
  { id: 'ex_cm_5', name: 'Seated Leg Curl', muscle: 'Legs', equipment: 'Machine' },
  { id: 'ex_cm_6', name: 'Hack Squat', muscle: 'Legs', equipment: 'Machine' },
  { id: 'ex_cm_7', name: 'Standing Calf Raise', muscle: 'Legs', equipment: 'Machine' },
  { id: 'ex_cm_8', name: 'Seated Calf Raise', muscle: 'Legs', equipment: 'Machine' },
  { id: 'ex_cm_9', name: '45° Back Extension', muscle: 'Back', equipment: 'Machine' },
  { id: 'ex_cm_10', name: 'Neck Flexion', muscle: 'Full Body', equipment: 'Machine' },
  { id: 'ex_cm_11', name: 'Neck Extension', muscle: 'Full Body', equipment: 'Machine' }
];

export const DEFAULT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'tmpl_full_body',
    name: 'FULL BODY',
    category: 'Routines',
    exercises: [
      { name: 'Lat Pulldown (Wide grip)', muscle: 'Back', defaultSets: 1 },
      { name: 'Lat Pulldown (close grip)', muscle: 'Back', defaultSets: 1 },
      { name: 'Wide-Grip Row +Kelso SS', muscle: 'Back', defaultSets: 1, supersetGroupId: 'ss_row_kelso' },
      { name: 'Kelso Shrug', muscle: 'Back', defaultSets: 1, supersetGroupId: 'ss_row_kelso' },
      { name: 'Rear Delt Reverse Fly', muscle: 'Shoulders', defaultSets: 1 },
      { name: 'Shrug', muscle: 'Back', defaultSets: 1 },
      { name: 'Seated Lateral Raise', muscle: 'Shoulders', defaultSets: 1 },
      { name: 'Lateral Y Raise', muscle: 'Shoulders', defaultSets: 1 },
      { name: 'Shoulder Press', muscle: 'Shoulders', defaultSets: 1 },
      { name: 'Seated Incline Curl', muscle: 'Arms', defaultSets: 1 },
      { name: 'Preacher Curl', muscle: 'Arms', defaultSets: 1 },
      { name: 'EZ-Bar Reverse Curl', muscle: 'Arms', defaultSets: 2 },
      { name: 'Triceps Pressdown', muscle: 'Arms', defaultSets: 1 },
      { name: 'Overhead Triceps Extension', muscle: 'Arms', defaultSets: 1 },
      { name: 'Wrist Curl', muscle: 'Arms', defaultSets: 2 },
      { name: 'Wrist Extension', muscle: 'Arms', defaultSets: 2 }
    ]
  },
  {
    id: 'tmpl_chest_misc',
    name: 'CHEST & MISC',
    category: 'Routines',
    exercises: [
      { name: 'Chest Fly', muscle: 'Chest', defaultSets: 1 },
      { name: 'Incline Chest Fly', muscle: 'Chest', defaultSets: 1 },
      { name: 'Barbell Serratus Punch', muscle: 'Chest', defaultSets: 2 },
      { name: 'Cable Crunch', muscle: 'Core', defaultSets: 3 },
      { name: 'Seated Leg Curl', muscle: 'Legs', defaultSets: 2 },
      { name: 'Hack Squat', muscle: 'Legs', defaultSets: 2 },
      { name: 'Standing Calf Raise', muscle: 'Legs', defaultSets: 2 },
      { name: 'Seated Calf Raise', muscle: 'Legs', defaultSets: 1 },
      { name: '45° Back Extension', muscle: 'Back', defaultSets: 2 },
      { name: 'Neck Flexion', muscle: 'Full Body', defaultSets: 3 },
      { name: 'Neck Extension', muscle: 'Full Body', defaultSets: 3 }
    ]
  }
];

const DB_NAME = 'gymlite_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // Workouts Store
      if (!db.objectStoreNames.contains('workouts')) {
        const workoutStore = db.createObjectStore('workouts', { keyPath: 'id' });
        workoutStore.createIndex('by_status', 'status', { unique: false });
        workoutStore.createIndex('by_startTime', 'startTime', { unique: false });
      }

      // Templates Store
      if (!db.objectStoreNames.contains('templates')) {
        db.createObjectStore('templates', { keyPath: 'id' });
      }

      // Exercises Store
      if (!db.objectStoreNames.contains('exercises')) {
        db.createObjectStore('exercises', { keyPath: 'id' });
      }

      // Settings Store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = async () => {
      const db = request.result;
      await seedDefaultsIfEmpty(db);
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

async function seedDefaultsIfEmpty(db: IDBDatabase): Promise<void> {
  // Check exercises
  const tx = db.transaction(['exercises', 'templates', 'settings'], 'readwrite');
  const exStore = tx.objectStore('exercises');
  const tmplStore = tx.objectStore('templates');
  const setStore = tx.objectStore('settings');

  const countReq = exStore.count();
  countReq.onsuccess = () => {
    if (countReq.result === 0) {
      DEFAULT_EXERCISES.forEach((ex) => exStore.put(ex));
    }
  };

  // Always ensure routines are synced to FULL BODY and CHEST & MISC
  const tmplReq = tmplStore.getAll();
  tmplReq.onsuccess = () => {
    const existing: WorkoutTemplate[] = tmplReq.result || [];
    const hasOldPush = existing.some((t) => t.id === 'tmpl_push' || t.name.includes('Push ('));
    const hasFullBody = existing.some((t) => t.name === 'FULL BODY');
    const hasChestMisc = existing.some((t) => t.name === 'CHEST & MISC');

    if (existing.length === 0 || hasOldPush || !hasFullBody || !hasChestMisc) {
      tmplStore.clear();
      DEFAULT_TEMPLATES.forEach((tmpl) => tmplStore.put(tmpl));
    }
  };

  const settingsReq = setStore.get('app_config');
  settingsReq.onsuccess = () => {
    if (!settingsReq.result) {
      setStore.put({ key: 'app_config', value: DEFAULT_SETTINGS });
    }
  };
}

// ------------------- WORKOUTS API -------------------

export async function getActiveWorkout(): Promise<WorkoutSession | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workouts', 'readonly');
    const store = tx.objectStore('workouts');
    const index = store.index('by_status');
    const req = index.get('active');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveActiveWorkout(workout: WorkoutSession): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workouts', 'readwrite');
    const store = tx.objectStore('workouts');
    const req = store.put(workout);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function finishWorkout(workout: WorkoutSession): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workouts', 'readwrite');
    const store = tx.objectStore('workouts');
    workout.status = 'completed';
    workout.endTime = new Date().toISOString();
    const req = store.put(workout);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function discardWorkout(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workouts', 'readwrite');
    const store = tx.objectStore('workouts');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCompletedWorkouts(): Promise<WorkoutSession[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workouts', 'readonly');
    const store = tx.objectStore('workouts');
    const req = store.getAll();
    req.onsuccess = () => {
      const all: WorkoutSession[] = req.result || [];
      const completed = all
        .filter((w) => w.status === 'completed')
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      resolve(completed);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getLastExercisePerformance(exerciseName: string): Promise<WorkoutSet[] | null> {
  const history = await getCompletedWorkouts();
  for (const session of history) {
    const ex = session.exercises.find((e) => e.name.toLowerCase() === exerciseName.toLowerCase());
    if (ex && ex.sets.length > 0) {
      const completedSets = ex.sets.filter((s) => s.completed);
      if (completedSets.length > 0) {
        return completedSets;
      }
    }
  }
  return null;
}

// ------------------- TEMPLATES API -------------------

export async function getAllTemplates(): Promise<WorkoutTemplate[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readonly');
    const store = tx.objectStore('templates');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTemplate(template: WorkoutTemplate): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readwrite');
    const store = tx.objectStore('templates');
    const req = store.put(template);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readwrite');
    const store = tx.objectStore('templates');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ------------------- EXERCISES API -------------------

export async function getAllExercises(includeFullCatalog: boolean = true): Promise<ExerciseItem[]> {
  const db = await getDB();
  const customOnes = await new Promise<ExerciseItem[]>((resolve) => {
    const tx = db.transaction('exercises', 'readonly');
    const store = tx.objectStore('exercises');
    const req = store.getAll();
    req.onsuccess = () => {
      const dbExercises: ExerciseItem[] = req.result || [];
      resolve(dbExercises.filter((e) => e.isCustom));
    };
    req.onerror = () => resolve([]);
  });

  if (!includeFullCatalog) {
    return [...customOnes, ...DEFAULT_EXERCISES];
  }

  const catalog = await getOpenGymExercises();
  return [...customOnes, ...catalog];
}

export async function addCustomExercise(
  name: string,
  muscle: ExerciseItem['muscle'],
  subMuscle?: string
): Promise<ExerciseItem> {
  const db = await getDB();
  const newEx: ExerciseItem = {
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    muscle,
    subMuscles: subMuscle ? [subMuscle] : undefined,
    isCustom: true
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('exercises', 'readwrite');
    const store = tx.objectStore('exercises');
    const req = store.put(newEx);
    req.onsuccess = () => resolve(newEx);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCustomExercise(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('exercises', 'readwrite');
    const store = tx.objectStore('exercises');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ------------------- SETTINGS API -------------------

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get('app_config');
    req.onsuccess = () => {
      if (req.result && req.result.value) {
        resolve({ ...DEFAULT_SETTINGS, ...req.result.value });
      } else {
        resolve(DEFAULT_SETTINGS);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const merged = { ...current, ...newSettings };
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.put({ key: 'app_config', value: merged });
    req.onsuccess = () => resolve(merged);
    req.onerror = () => reject(req.error);
  });
}

// ------------------- BACKUP / EXPORT / IMPORT API -------------------

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const [workouts, templates, exercises, settings] = await Promise.all([
    new Promise<WorkoutSession[]>((res) => {
      const tx = db.transaction('workouts', 'readonly');
      tx.objectStore('workouts').getAll().onsuccess = (e: any) => res(e.target.result || []);
    }),
    new Promise<WorkoutTemplate[]>((res) => {
      const tx = db.transaction('templates', 'readonly');
      tx.objectStore('templates').getAll().onsuccess = (e: any) => res(e.target.result || []);
    }),
    new Promise<ExerciseItem[]>((res) => {
      const tx = db.transaction('exercises', 'readonly');
      tx.objectStore('exercises').getAll().onsuccess = (e: any) => res(e.target.result || []);
    }),
    getSettings()
  ]);

  const backup = {
    app: 'GymLite',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    settings,
    exercises,
    templates,
    workouts
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Exports complete workout history into standard CSV format
 * Suitable for Excel, Google Sheets, Python/Pandas, or custom analysis.
 */
export async function exportWorkoutHistoryCSV(): Promise<string> {
  const workouts = await getCompletedWorkouts();
  
  // Sort chronologically ascending
  const sorted = [...workouts].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const headers = [
    'Date',
    'Workout Name',
    'Duration (minutes)',
    'Exercise Name',
    'Muscle Group',
    'Equipment',
    'Set Order',
    'Weight (kg)',
    'Reps',
    'Volume (kg)',
    'Completed',
    'RPE',
    'Workout Notes'
  ];

  const escapeCSV = (val: string | number | boolean | undefined | null) => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows: string[] = [headers.join(',')];

  for (const w of sorted) {
    const dateFormatted = new Date(w.startTime).toISOString().replace('T', ' ').slice(0, 19);
    let durationMin = '';
    if (w.endTime) {
      const diffSecs = Math.max(
        0,
        Math.floor((new Date(w.endTime).getTime() - new Date(w.startTime).getTime()) / 1000)
      );
      durationMin = Math.round(diffSecs / 60).toString();
    }

    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        const weightNum = parseFloat(s.weight) || 0;
        const repsNum = parseInt(s.reps, 10) || 0;
        const volume = s.completed ? Math.round(weightNum * repsNum * 10) / 10 : 0;

        const row = [
          escapeCSV(dateFormatted),
          escapeCSV(w.name),
          escapeCSV(durationMin),
          escapeCSV(ex.name),
          escapeCSV(ex.muscle),
          escapeCSV(ex.equipment || ''),
          escapeCSV(s.setNumber),
          escapeCSV(s.weight || '0'),
          escapeCSV(s.reps || '0'),
          escapeCSV(volume),
          escapeCSV(s.completed ? 'true' : 'false'),
          escapeCSV(s.rpe ?? ''),
          escapeCSV(w.notes ?? '')
        ];
        rows.push(row.join(','));
      }
    }
  }

  return rows.join('\r\n');
}

export async function importAllData(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.workouts || !Array.isArray(data.workouts)) {
      return { success: false, message: 'Invalid file format: missing workout records' };
    }

    const db = await getDB();
    const tx = db.transaction(['workouts', 'templates', 'exercises', 'settings'], 'readwrite');

    if (data.settings) {
      tx.objectStore('settings').put({ key: 'app_config', value: { ...DEFAULT_SETTINGS, ...data.settings } });
    }

    if (Array.isArray(data.exercises)) {
      const exStore = tx.objectStore('exercises');
      data.exercises.forEach((ex: ExerciseItem) => exStore.put(ex));
    }

    if (Array.isArray(data.templates)) {
      const tmplStore = tx.objectStore('templates');
      data.templates.forEach((tmpl: WorkoutTemplate) => tmplStore.put(tmpl));
    }

    if (Array.isArray(data.workouts)) {
      const wStore = tx.objectStore('workouts');
      data.workouts.forEach((w: WorkoutSession) => wStore.put(w));
    }

    return new Promise((resolve) => {
      tx.oncomplete = () => {
        resolve({ success: true, message: `Imported ${data.workouts.length} workouts and ${data.templates?.length || 0} templates successfully!` });
      };
      tx.onerror = () => {
        resolve({ success: false, message: 'Transaction error during import.' });
      };
    });
  } catch (err: any) {
    return { success: false, message: `Failed to parse backup JSON: ${err.message}` };
  }
}

// ------------------- BATCH HIGH-SPEED INITIAL DATA LOADER -------------------

export async function getInitialAppData(): Promise<{
  activeWorkout: WorkoutSession | null;
  templates: WorkoutTemplate[];
  exercises: ExerciseItem[];
  history: WorkoutSession[];
  settings: AppSettings;
}> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['workouts', 'templates', 'exercises', 'settings'], 'readonly');
    const workoutsStore = tx.objectStore('workouts');
    const templatesStore = tx.objectStore('templates');
    const exercisesStore = tx.objectStore('exercises');
    const settingsStore = tx.objectStore('settings');

    const reqWorkouts = workoutsStore.getAll();
    const reqTemplates = templatesStore.getAll();
    const reqExercises = exercisesStore.getAll();
    const reqSettings = settingsStore.get('app_config');

    tx.oncomplete = () => {
      const allWorkouts: WorkoutSession[] = reqWorkouts.result || [];
      const activeWorkout = allWorkouts.find((w) => w.status === 'active') || null;
      const history = allWorkouts
        .filter((w) => w.status === 'completed')
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      const templates = reqTemplates.result || [];
      const customExs = reqExercises.result || [];
      const exercises = [...customExs, ...DEFAULT_EXERCISES];
      const settings = reqSettings.result && reqSettings.result.value
        ? { ...DEFAULT_SETTINGS, ...reqSettings.result.value }
        : DEFAULT_SETTINGS;

      resolve({ activeWorkout, templates, exercises, history, settings });
    };

    tx.onerror = () => reject(tx.error);
  });
}

