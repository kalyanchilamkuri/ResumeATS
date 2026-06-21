/**
 * jobDescriptionController.js
 * Handles CRUD operations for job descriptions:
 *   GET    /api/job-description/:projectId — retrieve saved JD
 *   POST   /api/job-description            — save/update JD (with keyword extraction)
 *   DELETE /api/job-description/:projectId — remove JD
 */

const JobDescription = require('../models/JobDescription');

/**
 * GET /api/job-description/:projectId
 * Retrieves the saved job description for the given device + project.
 */
async function getJobDescription(req, res, next) {
  try {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
      return res.status(400).json({
        error: 'Missing X-Device-ID header',
        message: 'A device identifier is required'
      });
    }

    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({
        error: 'Missing projectId',
        message: 'projectId parameter is required'
      });
    }

    const jobDesc = await JobDescription.findOne({ deviceId, projectId });
    if (!jobDesc) {
      return res.status(404).json({
        error: 'Not found',
        message: `No job description saved for project "${projectId}"`
      });
    }

    return res.status(200).json(jobDesc);

  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/job-description
 * Saves or updates a job description, extracting keywords in the process.
 * Uses upsert so the same device+project always has exactly one JD.
 */
async function saveJobDescription(req, res, next) {
  try {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
      return res.status(400).json({
        error: 'Missing X-Device-ID header',
        message: 'A device identifier is required'
      });
    }

    const { projectId, jobTitle, jobDescription } = req.body;

    if (!projectId) {
      return res.status(400).json({
        error: 'Missing projectId',
        message: 'projectId is required to associate the job description with an Overleaf project'
      });
    }

    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
      return res.status(400).json({
        error: 'Missing or empty jobDescription',
        message: 'The job description text is required'
      });
    }

    // ── Upsert: create or update the JD for this device+project ──────────
    const savedDoc = await JobDescription.findOneAndUpdate(
      { deviceId, projectId },
      {
        deviceId,
        projectId,
        jobTitle: jobTitle || '',
        jobDescription,
        extractedKeywords: [],
        updatedAt: new Date()
      },
      {
        new: true,      // Return the updated document
        upsert: true,   // Create if it doesn't exist
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    return res.status(200).json(savedDoc);

  } catch (error) {
    // Handle duplicate key errors gracefully (shouldn't happen with upsert, but just in case)
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A job description already exists for this project. Try again.'
      });
    }
    next(error);
  }
}

/**
 * DELETE /api/job-description/:projectId
 * Removes the saved job description for the given device + project.
 */
async function deleteJobDescription(req, res, next) {
  try {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
      return res.status(400).json({
        error: 'Missing X-Device-ID header',
        message: 'A device identifier is required'
      });
    }

    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({
        error: 'Missing projectId',
        message: 'projectId parameter is required'
      });
    }

    const result = await JobDescription.findOneAndDelete({ deviceId, projectId });

    if (!result) {
      return res.status(404).json({
        error: 'Not found',
        message: `No job description found for project "${projectId}"`
      });
    }

    return res.status(200).json({
      message: 'Job description deleted successfully',
      deletedId: result._id
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  getJobDescription,
  saveJobDescription,
  deleteJobDescription
};
