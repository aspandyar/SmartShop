const router = require('express').Router();
const {
  listUsers,
  getUser,
  createUserEndpoint,
} = require('../controllers/userController');

router.get('/', listUsers);
router.get('/:id', getUser);
router.post('/', createUserEndpoint);

module.exports = router;

