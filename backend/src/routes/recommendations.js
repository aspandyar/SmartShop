const router = require('express').Router();
const {
  getRecommendations,
  saveRecommendations,
} = require('../controllers/recommendationController');

router.get('/:userId', getRecommendations);
router.post('/:userId', saveRecommendations);

module.exports = router;

