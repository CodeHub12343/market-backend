const express = require('express');
const roommateSearchController = require('../controllers/roommateSearchController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes - no authentication needed
router.get('/suggestions', roommateSearchController.getRoommateSearchSuggestions);
router.get('/popular', roommateSearchController.getPopularRoommateSearches);

// Protected routes - require authentication
router.use(authMiddleware.protect);

router.get('/history', roommateSearchController.getRoommateSearchHistory);
router.post('/save', roommateSearchController.saveRoommateSearch);
router.delete('/history/:id', roommateSearchController.deleteRoommateSearchHistory);
router.delete('/history', roommateSearchController.clearAllRoommateSearchHistory);

module.exports = router;
