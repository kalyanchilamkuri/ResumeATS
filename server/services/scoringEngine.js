/**
 * scoringEngine.js
 * LLM-based ATS Scoring Engine using Groq API (OpenAI-compatible).
 */

const { stripLatex } = require('./latexStripper');
const OpenAI = require('openai');

/**
 * Runs the full scoring pipeline on a LaTeX resume against the raw JD.
 * @param {string} rawLatex - Raw LaTeX source from Overleaf
 * @param {string} jobDescription - Full job description text
 * @returns {Promise<{ compositeScore: number, subScores: object, issues: object[], missingKeywords: object[] }>}
 */
async function calculateScore(rawLatex, jobDescription) {
  // Strip LaTeX to plain text to save tokens and improve LLM focus
  const { plainText } = stripLatex(rawLatex);

  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is missing.');
  }

  const openai = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
  });

  const prompt = `
You are an expert Applicant Tracking System (ATS) and Technical Recruiter.
Analyze the following resume against the provided job description.
Score the resume precisely based on these four criteria:
1. Keyword Match (40% weight): Does the resume contain the necessary skills and keywords from the JD?
2. Quantification (25% weight): Are achievements quantified with numbers, metrics, and strong action verbs?
3. Section Coverage (20% weight): Does the resume have standard sections (Experience, Education, Skills)?
4. Parseability (15% weight): Is the formatting simple and readable?

Compute a composite score out of 100 based on these weights.
Identify up to 5 critical issues (severity: "high", "medium", or "low").
Identify up to 5 missing keywords (weight: 1.0 to 3.0).

You MUST output your response in EXACTLY this JSON structure. Do not output any markdown formatting, do not output \`\`\`json, just output the raw JSON object:
{
  "compositeScore": 85,
  "subScores": {
    "keywordMatch": 80,
    "quantification": 90,
    "sectionCoverage": 100,
    "parseability": 70
  },
  "issues": [
    {
      "type": "missing_metric",
      "severity": "medium",
      "message": "Missing quantification",
      "context": "Bullet point lacks metrics",
      "suggestion": "Add metrics"
    }
  ],
  "missingKeywords": [
    { "term": "React", "weight": 2.5 }
  ]
}

--- JOB DESCRIPTION ---
${jobDescription}

--- RESUME TEXT ---
${plainText}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.0,
      response_format: { type: 'json_object' }
    });

    let jsonString = response.choices[0].message.content;
    // Strip markdown if the model hallucinated it despite instructions
    if (jsonString.startsWith('\`\`\`json')) {
      jsonString = jsonString.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '');
    }

    const parsed = JSON.parse(jsonString);
    return parsed;

  } catch (error) {
    console.error('LLM Scoring Error:', error);
    throw new Error(`LLM Error: ${error.message || 'Failed to generate ATS score'}`);
  }
}

module.exports = { calculateScore };
