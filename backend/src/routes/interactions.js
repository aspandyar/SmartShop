const router = require('express').Router();
const {
  createInteraction,
  listUserInteractions,
} = require('../controllers/interactionController');

router.post('/', createInteraction);
router.get('/:userId', listUserInteractions);

module.exports = router;

