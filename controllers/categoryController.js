// controllers/categoryController.js
const mongoose = require("mongoose");
const getModelByCategory = require('../models/Data'); 

// Fetch all collection names
exports.getCollectionNames = async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map((collection) => collection.name);
    res.status(200).json(collectionNames);
  } catch (error) {
    console.error("Error fetching collection names:", error);
    res.status(500).json({ message: "Failed to fetch collection names", error });
  }
};


exports.deleteCategory = async (req, res) => {
  const { categoryId } = req.params; // Get the category ID from the URL parameter

  try {
    const category = await getModelByCategory(categoryId);
    await category.collection.drop();
    if (!category) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting Project:", error);
    res.status(500).json({ message: "Server error" });
  }
};



exports.addData = async (req, res) => {
  const { Category } = req.body;

  try {
    // Use getModelByCategory to get or create the model based on the category
    const DataModel = getModelByCategory(Category);

    // Check if a document with the same category already exists
    const existingData = await DataModel.findOne({ componentName: '1' });
    if (existingData) {
      return res.status(409).json({ message: `Data for Project ${Category} already exists`, data: existingData });
    }

    // Create a new document with default values if no existing document is found
    const newData = new DataModel({
      title: 'Initial',                    // Empty title
      componentName: '1',           // Set componentName as '1'
      parentComponentName: 'root',  // Set parentComponentName as 'root'
      inputs: [
        {
          id: 1,
          content: 'Cost($)',
          value: 0,
          isAdding: false,
        },
        {
          id: 2,
          content: 'Prob(%)',
          value: 0,
          isAdding: true,
        }
      ],
      result: 0,                    // Default result
      TotalResult: 0                // Default TotalResult
    });

    // Save the document to the collection
    const savedData = await newData.save();

    res.status(201).json({ message: `Data added to ${Category} collection successfully`, data: savedData });
  } catch (error) {
    console.error("Error adding data:", error);
    res.status(500).json({ message: "Failed to add data", error });
  }
};
