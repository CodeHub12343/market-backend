const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middlewares/authMiddleware');

// Base post routes
router
  .route('/')
  .get(postController.getAllPosts)
  .post(authMiddleware.protect, postController.uploadPostMedia, postController.createPost);

// Trending & Popular (before /:id to avoid conflicts)
router.get('/trending', postController.getTrendingPosts);
router.get('/popular', postController.getPopularPosts);

router
  .route('/:id')
  .get(postController.getPost)
  .patch(authMiddleware.protect, postController.uploadPostMedia, postController.updatePost)
  .delete(authMiddleware.protect, postController.deletePost);

// Like / Unlike toggle
router.patch('/:id/like', authMiddleware.protect, postController.toggleLike);

// Bookmarks
router.post('/:id/bookmark', authMiddleware.protect, postController.bookmarkPost);
router.get('/bookmarks/my', authMiddleware.protect, postController.getBookmarkedPosts);

// Sharing
router.post('/:id/share', postController.sharePost);

// Analytics & Views
router.post('/:id/view', postController.incrementPostViews);
router.get('/:id/analytics', authMiddleware.protect, postController.getPostAnalytics);

// Report a post
router.patch('/:id/report', authMiddleware.protect, postController.reportPost);

// Comments
router
  .route('/:postId/comments')
  .get(commentController.getCommentsByPost)
  .post(authMiddleware.protect, commentController.createComment);

router
  .route('/comments/:id')
  .delete(authMiddleware.protect, commentController.deleteComment);

module.exports = router;
