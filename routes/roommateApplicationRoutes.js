const express = require('express')
const roommateApplicationController = require('../controllers/roommateApplicationController')
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router()

// All routes require authentication
router.use(authMiddleware.protect)

// Create application - POST /api/v1/roommate-applications with roommate in body
router.post('/', roommateApplicationController.createApplication)

// Get user's applications
router.get('/', roommateApplicationController.getMyApplications)

// Get application details
router.get('/:id', roommateApplicationController.getApplication)

// Approve application (landlord)
router.patch('/:id/approve', roommateApplicationController.approveApplication)

// Reject application (landlord)
router.patch('/:id/reject', roommateApplicationController.rejectApplication)

// Withdraw application (applicant)
router.delete('/:id', roommateApplicationController.withdrawApplication)

module.exports = router
