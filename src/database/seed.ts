import { getDatabase } from './index';

// Generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Sample entries for realistic time tracking data
// Durations are in MINUTES here, will be converted to seconds when inserting
const SAMPLE_ENTRIES = [
  // Work entries
  { category: 'work', summary: 'Team standup meeting', tags: ['meetings', 'team'], duration: 15 },
  { category: 'work', summary: 'Code review for authentication feature', tags: ['code-review', 'auth'], duration: 45 },
  { category: 'work', summary: 'Fixed bug in payment processing', tags: ['bugfix', 'payments'], duration: 90 },
  { category: 'work', summary: 'Sprint planning session', tags: ['meetings', 'planning'], duration: 60 },
  { category: 'work', summary: 'Wrote unit tests for API endpoints', tags: ['testing', 'api'], duration: 75 },
  { category: 'work', summary: 'Deployed new feature to staging', tags: ['deployment', 'devops'], duration: 30 },
  { category: 'work', summary: 'Client call to discuss requirements', tags: ['meetings', 'client'], duration: 45 },
  { category: 'work', summary: 'Documentation for new API', tags: ['documentation', 'api'], duration: 60 },
  { category: 'work', summary: 'Refactored database queries', tags: ['refactoring', 'database'], duration: 120 },
  { category: 'work', summary: 'Performance optimization', tags: ['performance', 'optimization'], duration: 90 },
  
  // Personal entries
  { category: 'personal', summary: 'Paid bills and budgeting', tags: ['finance', 'admin'], duration: 30 },
  { category: 'personal', summary: 'Grocery shopping', tags: ['errands', 'shopping'], duration: 45 },
  { category: 'personal', summary: 'Called mom', tags: ['family', 'calls'], duration: 25 },
  { category: 'personal', summary: 'Organized closet', tags: ['cleaning', 'organizing'], duration: 60 },
  { category: 'personal', summary: 'Car maintenance appointment', tags: ['errands', 'car'], duration: 90 },
  
  // Health entries
  { category: 'health', summary: 'Morning run in the park', tags: ['running', 'cardio'], duration: 35 },
  { category: 'health', summary: 'Yoga session', tags: ['yoga', 'stretching'], duration: 45 },
  { category: 'health', summary: 'Weight training at gym', tags: ['gym', 'strength'], duration: 60 },
  { category: 'health', summary: 'Meal prep for the week', tags: ['nutrition', 'cooking'], duration: 90 },
  { category: 'health', summary: 'Evening walk', tags: ['walking', 'relaxation'], duration: 30 },
  { category: 'health', summary: 'Meditation session', tags: ['meditation', 'mindfulness'], duration: 20 },
  
  // Learning entries
  { category: 'learning', summary: 'Online course on machine learning', tags: ['courses', 'ml'], duration: 60 },
  { category: 'learning', summary: 'Reading technical blog posts', tags: ['reading', 'tech'], duration: 30 },
  { category: 'learning', summary: 'Practicing Spanish on Duolingo', tags: ['languages', 'spanish'], duration: 20 },
  { category: 'learning', summary: 'Watched conference talk on React', tags: ['videos', 'react'], duration: 45 },
  { category: 'learning', summary: 'Reading book on system design', tags: ['reading', 'architecture'], duration: 40 },
  
  // Social entries
  { category: 'social', summary: 'Coffee with friend', tags: ['friends', 'coffee'], duration: 60 },
  { category: 'social', summary: 'Dinner party at home', tags: ['hosting', 'dinner'], duration: 180 },
  { category: 'social', summary: 'Video call with college friends', tags: ['friends', 'calls'], duration: 45 },
  { category: 'social', summary: 'Networking event', tags: ['networking', 'professional'], duration: 120 },
  
  // Rest entries
  { category: 'rest', summary: 'Watched movie on Netflix', tags: ['movies', 'streaming'], duration: 120 },
  { category: 'rest', summary: 'Reading fiction book', tags: ['reading', 'relaxation'], duration: 45 },
  { category: 'rest', summary: 'Playing video games', tags: ['gaming', 'fun'], duration: 90 },
  { category: 'rest', summary: 'Nap', tags: ['sleep', 'rest'], duration: 30 },
  { category: 'rest', summary: 'Listening to podcast', tags: ['podcasts', 'audio'], duration: 40 },
];

/**
 * Seed the database with two weeks of dummy data
 * @param force - If true, clears existing entries and reseeds
 */
export async function seedDummyData(force: boolean = false): Promise<void> {
  const db = await getDatabase();
  
  if (force) {
    await db.runAsync('DELETE FROM entries');
  }
  
  // Check if we already have entries
  const entryCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM entries'
  );
  
  if (entryCount && entryCount.count > 5) {
    return;
  }
  
  const now = Math.floor(Date.now() / 1000); // Unix seconds
  const twoWeeksSec = 14 * 24 * 60 * 60;
  const entries: Array<{
    id: string;
    recorded_at: number;
    duration: number;
    transcript: string;
    summary: string;
    category_id: string;
    tags: string;
    processed: number;
  }> = [];
  
  // Generate 3-6 entries per day for the past 14 days
  for (let day = 0; day < 14; day++) {
    const dayOffset = day * 24 * 60 * 60;
    const dayStart = now - twoWeeksSec + dayOffset;
    
    // Random number of entries per day (3-6)
    const entriesPerDay = 3 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < entriesPerDay; i++) {
      // Pick a random sample entry
      const sample = SAMPLE_ENTRIES[Math.floor(Math.random() * SAMPLE_ENTRIES.length)];
      
      // Random time during the day (8am - 10pm) in seconds
      const hourOffset = (8 + Math.floor(Math.random() * 14)) * 60 * 60;
      const minuteOffset = Math.floor(Math.random() * 60) * 60;
      const recordedAt = dayStart + hourOffset + minuteOffset;
      
      // Vary duration slightly (+/- 20%)
      const durationVariance = 0.8 + Math.random() * 0.4;
      const durationMinutes = Math.round(sample.duration * durationVariance);
      
      entries.push({
        id: generateId(),
        recorded_at: recordedAt,
        duration: durationMinutes, // Duration stored in minutes
        transcript: `I spent about ${durationMinutes} minutes on ${sample.summary.toLowerCase()}.`,
        summary: sample.summary,
        category_id: sample.category,
        tags: JSON.stringify(sample.tags),
        processed: 1,
      });
    }
  }
  
  // Sort by recorded_at
  entries.sort((a, b) => a.recorded_at - b.recorded_at);
  
  // Insert all entries
  for (const entry of entries) {
    await db.runAsync(
      `INSERT INTO entries (id, recorded_at, duration, transcript, summary, category_id, tags, processed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.recorded_at,
        entry.duration,
        entry.transcript,
        entry.summary,
        entry.category_id,
        entry.tags,
        entry.processed,
      ]
    );
  }
  
  console.log(`Seeded ${entries.length} dummy entries`);
}

/**
 * Clear all entries (for testing)
 */
export async function clearAllEntries(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM entries');
  console.log('Cleared all entries');
}
