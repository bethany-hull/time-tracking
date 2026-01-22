const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini with API key from environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'time-tracking-api' });
});

// Health check for Cloud Run
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

/**
 * POST /categorize
 * Categorize a transcript using Gemini
 * 
 * Body: {
 *   transcript: string,
 *   defaultDurationMinutes: number,
 *   categories: Array<{ id: string, name: string }>
 * }
 */
app.post('/categorize', async (req, res) => {
  try {
    const { transcript, defaultDurationMinutes = 30, categories = [] } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.json({
        activities: [{
          summary: 'No speech detected',
          category: 'other',
          tags: [],
          duration: 0,
        }],
      });
    }

    const categoryIds = categories.map(c => c.id);
    const categoryList = categories.map(c => `${c.id} (${c.name})`).join(', ');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a time tracking assistant. Analyze this transcript of someone describing what they've been doing:

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

Return ONLY the JSON object, no other text.`;

    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    const textContent = result.response.text();

    if (!textContent) {
      throw new Error('No response from Gemini API');
    }

    // Parse the JSON response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini API');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and sanitize the response
    const activities = [];

    if (Array.isArray(parsed.activities)) {
      for (const activity of parsed.activities) {
        activities.push({
          summary: activity.summary || 'No summary available',
          category: validateCategory(activity.category, categoryIds),
          tags: Array.isArray(activity.tags) ? activity.tags.map(t => t.toLowerCase()) : [],
          duration: typeof activity.duration === 'number' ? activity.duration : 0,
        });
      }
    } else {
      // Fallback for single activity response
      activities.push({
        summary: parsed.summary || 'No summary available',
        category: validateCategory(parsed.category, categoryIds),
        tags: Array.isArray(parsed.tags) ? parsed.tags.map(t => t.toLowerCase()) : [],
        duration: typeof parsed.duration === 'number' ? parsed.duration : defaultDurationMinutes,
      });
    }

    res.json({ activities });

  } catch (error) {
    console.error('Categorize error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to categorize transcript',
      code: 'CATEGORIZE_ERROR'
    });
  }
});

/**
 * POST /test-connection
 * Test if Gemini API is working
 */
app.post('/test-connection', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent('Say "ok" if you can read this.');
    
    if (result.response.text()) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.error('Test connection error:', error);
    res.json({ success: false, error: error.message });
  }
});

function validateCategory(category, validCategories) {
  const normalized = category?.toLowerCase() || 'other';
  if (validCategories.includes(normalized)) {
    return normalized;
  }
  return validCategories.includes('other') ? 'other' : validCategories[0] || 'other';
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
