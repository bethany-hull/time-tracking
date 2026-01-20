import { getSetting, setSetting } from '../database/settings';
import { getAllCategories } from '../database/categories';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// API key from environment variable (preferred) or database setting as fallback
// EXPO_PUBLIC_ prefix makes it available at runtime in Expo
const ENV_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

let cachedApiKey: string | null = null;

export interface CategorizedActivity {
  summary: string;
  category: string;
  tags: string[];
  duration: number; // minutes spent on activity
}

export interface CategorizedResult {
  activities: CategorizedActivity[];
}

export interface GeminiError {
  message: string;
  code?: string;
}

/**
 * Set the Gemini API key (call this after user enters key in settings)
 */
export async function setGeminiApiKey(apiKey: string): Promise<void> {
  cachedApiKey = apiKey;
  await setSetting('geminiApiKey', apiKey);
}

/**
 * Get the configured API key
 * Priority: 1) Environment variable, 2) Cached, 3) Database setting
 */
async function getApiKey(): Promise<string | null> {
  // Environment variable takes priority (most secure)
  if (ENV_API_KEY && ENV_API_KEY !== 'your_api_key_here') {
    return ENV_API_KEY;
  }
  
  if (cachedApiKey) return cachedApiKey;
  
  // Fallback to database (for backward compatibility)
  const dbKey = await getSetting('geminiApiKey');
  if (dbKey) {
    cachedApiKey = dbKey;
    return dbKey;
  }
  
  return null;
}

/**
 * Check if Gemini API is configured
 */
export async function isGeminiConfigured(): Promise<boolean> {
  const key = await getApiKey();
  return !!key && key !== 'YOUR_API_KEY_HERE';
}

/**
 * Categorize a transcript using Gemini (text-only, much cheaper than audio)
 * Returns an array of activities - Gemini will split multiple activities mentioned in the transcript
 * 
 * @param transcript - The speech transcript to categorize
 * @param defaultDurationMinutes - Default total duration if user doesn't specify (typically the reminder interval)
 */
export async function categorizeTranscript(
  transcript: string,
  defaultDurationMinutes: number = 30
): Promise<CategorizedResult> {
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.');
  }

  // If transcript is empty, return a default
  if (!transcript.trim()) {
    return {
      activities: [{
        summary: 'No speech detected',
        category: 'other',
        tags: [],
        duration: 0,
      }],
    };
  }

  // Fetch the user's categories from the database
  const categories = await getAllCategories();
  const categoryIds = categories.map(c => c.id);
  const categoryList = categories.map(c => `${c.id} (${c.name})`).join(', ');

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a time tracking assistant. Analyze this transcript of someone describing what they've been doing:

"${transcript}"

The user's time tracking interval is set to ${defaultDurationMinutes} minutes. This means approximately ${defaultDurationMinutes} minutes have passed since their last check-in.

Available categories: ${categoryList}

Extract and return the activities as a JSON object with an "activities" array:
{
  "activities": [
    {
      "summary": "A brief 1-sentence summary of the activity",
      "category": "category id from the available categories list",
      "tags": ["array", "of", "relevant", "tags"],
      "duration": duration in minutes (number)
    }
  ]
}

Important rules:
- If the user describes MULTIPLE activities, split them into separate objects in the array
- The sum of all durations should equal ${defaultDurationMinutes} minutes, UNLESS the user explicitly states different total time or specific times for each activity.
- If the user mentions a specific duration for one activity (e.g., "5 minutes making coffee"), use that and allocate the remaining time (${defaultDurationMinutes} - 5 = ${defaultDurationMinutes - 5} minutes) to other activities
- If only one activity is mentioned with no specific time, use ${defaultDurationMinutes} minutes
- Categories MUST be one of: ${categoryIds.join(', ')}. Use "other" if none fit well.
- Tags should be lowercase
- If the transcript is unclear, return a single activity with category "other" and duration ${defaultDurationMinutes}

Examples:
- "I made coffee for 5 minutes then worked on the project" → 2 activities: coffee (5 min, personal), project (${defaultDurationMinutes - 5} min, work)
- "I was in meetings all morning" → 1 activity: meetings (${defaultDurationMinutes} min, work)
- "Spent 2 hours coding" → 1 activity: coding (120 min, work) - user specified time overrides default

Return ONLY the JSON object, no other text.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error('No response from Gemini API');
    }

    // Parse the JSON response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini API');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate and sanitize the response - handle both array and single activity formats
    const activities: CategorizedActivity[] = [];
    
    if (Array.isArray(result.activities)) {
      for (const activity of result.activities) {
        activities.push({
          summary: activity.summary || 'No summary available',
          category: validateCategory(activity.category, categoryIds),
          tags: Array.isArray(activity.tags) ? activity.tags.map((t: string) => t.toLowerCase()) : [],
          duration: typeof activity.duration === 'number' ? activity.duration : 0,
        });
      }
    } else {
      // Fallback for single activity response (backward compatibility)
      activities.push({
        summary: result.summary || 'No summary available',
        category: validateCategory(result.category, categoryIds),
        tags: Array.isArray(result.tags) ? result.tags.map((t: string) => t.toLowerCase()) : [],
        duration: typeof result.duration === 'number' ? result.duration : defaultDurationMinutes,
      });
    }

    return { activities };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

function validateCategory(category: string, validCategories: string[]): string {
  const normalized = category?.toLowerCase() || 'other';
  // Check if the category exists in the user's categories
  if (validCategories.includes(normalized)) {
    return normalized;
  }
  // Fallback to 'other' if it exists, otherwise use the first category
  return validCategories.includes('other') ? 'other' : validCategories[0] || 'other';
}

export async function testGeminiConnection(): Promise<boolean> {
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    return false;
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: 'Say "ok" if you can read this.' }],
          },
        ],
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
