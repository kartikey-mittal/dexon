if (!import.meta.env.VITE_GEMINI_API_KEY) {
  throw new Error('Missing Gemini API key');
}

export async function analyzeSpeech(text: string) {
  try {
    const prompt = `Analyze the following speech and return ONLY a JSON object with this exact structure:
    {
      "mood": "happy|sad|angry|neutral|scared",
      "threatLevel": {
        "score": 0-100,
        "reason": "brief explanation"
      }
    }
    
    The mood should be exactly one word from the given options.
    The threat level score should be 0-100 where:
    0-20: Safe
    21-40: Mild concern
    41-60: Moderate concern
    61-80: High concern
    81-100: Severe threat
    
    Speech text: "${text}"`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Gemini API');
    }

    // Extract the JSON from the response text which might be wrapped in markdown code blocks
    const jsonText = data.candidates[0].content.parts[0].text.replace(/```json\n?|\n?```/g, '');
    const analysis = JSON.parse(jsonText);

    // Convert the analysis to our application format
    return {
      sentiment: {
        emotion: analysis.mood,
        intensity: analysis.threatLevel.score / 100,
        confidence: 0.9
      },
      contentFlags: {
        profanity: analysis.threatLevel.score > 40,
        harmful: analysis.threatLevel.score > 60,
        threatening: analysis.threatLevel.score > 80
      },
      summary: analysis.threatLevel.reason
    };
  } catch (error) {
    console.error('Error analyzing speech:', error);
    return null;
  }
}