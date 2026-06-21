/**
 * routes/jobDescription.js
 * Express router for job description CRUD endpoints.
 *
 * GET    /api/job-description/:projectId — Retrieve saved JD
 * POST   /api/job-description            — Save/update JD (with keyword extraction)
 * DELETE /api/job-description/:projectId — Remove JD
 */

const express = require('express');
const router = express.Router();
const {
  getJobDescription,
  saveJobDescription,
  deleteJobDescription
} = require('../controllers/jobDescriptionController');

// GET /:projectId — Retrieve saved JD for a device + project
router.get('/:projectId', getJobDescription);

// POST / — Save or update a job description
router.post('/', saveJobDescription);

// DELETE /:projectId — Remove a saved job description
router.delete('/:projectId', deleteJobDescription);

module.exports = router;
