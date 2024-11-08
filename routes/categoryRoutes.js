// routes/categoryRoutes.js
const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");

router.get("/collections", categoryController.getCollectionNames);
router.delete('/categories/:categoryId', categoryController.deleteCategory);
router.post("/categories/add", categoryController.addData);

module.exports = router;
