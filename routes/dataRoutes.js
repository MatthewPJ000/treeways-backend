const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

// Routes for CRUD operations
router.post('/:selectedCategory', dataController.saveData);
router.get('/:selectedCategory/allcomponents', dataController.getAllComponentsByCategory);
router.get('/:selectedCategory/:componentName', dataController.getComponentByName);
router.delete('/:selectedCategory/:componentName', dataController.deleteComponentByName);

module.exports = router;
