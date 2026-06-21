/**
 * scoreController.js
 * Handles POST /api/score — scores a LaTeX resume against the saved job description.
 */

const ScoreHistory = require('../models/ScoreHistory');
const JobDescription = require('../models/JobDescription');
const { calculateScore } = require('../services/scoringEngine');

const ISSUE_TYPE_ALIASES = {
  weak_verb: 'weak_verb',
  missing_metric: 'missing_metric',
  ats_risk: 'ats_risk',
  missing_section: 'missing_section',
  'keyword/focus mismatch': 'missing_section',
  'formatting/structure': 'ats_risk',
  quantification: 'missing_metric',
  'content gap': 'missing_section',
  'parseability/formatting': 'ats_risk'
};

function normalizeIssueType(type) {
  if (!type) {
    return 'ats_risk';
  }

  const normalized = String(type).trim().toLowerCase();

  if (ISSUE_TYPE_ALIASES[normalized]) {
    return ISSUE_TYPE_ALIASES[normalized];
  }

  if (normalized.includes('verb')) {
    return 'weak_verb';
  }

  if (normalized.includes('metric') || normalized.includes('quant') || normalized.includes('number')) {
    return 'missing_metric';
  }

  if (
    normalized.includes('section') ||
    normalized.includes('keyword') ||
    normalized.includes('focus') ||
    normalized.includes('content') ||
    normalized.includes('skill') ||
    normalized.includes('gap')
  ) {
    return 'missing_section';
  }

  if (
    normalized.includes('format') ||
    normalized.includes('parse') ||
    normalized.includes('structure') ||
    normalized.includes('layout') ||
    normalized.includes('ats')
  ) {
    return 'ats_risk';
  }

  return 'ats_risk';
}

function normalizeIssuesForStorage(issues) {
  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.map(issue => ({
    ...issue,
    type: normalizeIssueType(issue.type)
  }));
}

/**
 * POST /api/score
 * Score a resume's LaTeX source against the stored job description.
 *
 * Headers: X-Device-ID (required)
 * Body: { projectId: string, latexText: string }
 *
 * Returns: { compositeScore, subScores, issues, missingKeywords }
 */
async function scoreResume(req, res, next) {
  try {
    // ── Extract and validate inputs ──────────────────────────────────────
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
      return res.status(400).json({
        error: 'Missing X-Device-ID header',
        message: 'A device identifier is required to look up the saved job description'
      });
    }

    const { projectId, latexText } = req.body;

    if (!projectId) {
      return res.status(400).json({
        error: 'Missing projectId',
        message: 'projectId is required to identify which Overleaf project to score'
      });
    }

    if (!latexText || typeof latexText !== 'string' || latexText.trim().length === 0) {
      return res.status(400).json({
        error: 'Missing or empty latexText',
        message: 'The LaTeX source text is required for scoring'
      });
    }

    // ── Look up saved job description ────────────────────────────────────
    const jobDesc = await JobDescription.findOne({ deviceId, projectId });
    if (!jobDesc) {
      return res.status(404).json({
        error: 'No job description found',
        message: `No job description saved for project "${projectId}". Save a job description first via POST /api/job-description`
      });
    }

    // ── Run the scoring engine ───────────────────────────────────────────
    const result = await calculateScore(latexText, jobDesc.jobDescription);
    const issuesForStorage = normalizeIssuesForStorage(result.issues);

    // ── Save score to history ────────────────────────────────────────────
    const scoreEntry = new ScoreHistory({
      deviceId,
      projectId,
      compositeScore: result.compositeScore,
      subScores: result.subScores,
      missingKeywords: result.missingKeywords,
      issues: issuesForStorage
    });
    await scoreEntry.save();

    // ── Return scoring results ───────────────────────────────────────────
    return res.status(200).json({
      compositeScore: result.compositeScore,
      subScores: result.subScores,
      issues: result.issues,
      missingKeywords: result.missingKeywords
    });

  } catch (error) {
    next(error);
  }
}

module.exports = { scoreResume };
