/**
 * routes/score.js
 * Express router for resume scoring endpoints.
 *
 * POST /api/score — Score a LaTeX resume against the saved job description
 */

const express = require('express');
const router = express.Router();
const { scoreResume } = require('../controllers/scoreController');

// POST / — Score a resume
// Headers: X-Device-ID (required)
// Body: { projectId: string, latexText: string }
router.post('/', scoreResume);

module.exports = router;
