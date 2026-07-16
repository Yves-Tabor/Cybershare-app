const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getSavedItems, saveItem, unsaveItem } = require('../controllers/savedItemsController');

router.get('/', authMiddleware, getSavedItems);
router.post('/', authMiddleware, saveItem);
router.delete('/', authMiddleware, unsaveItem);

module.exports = router;
