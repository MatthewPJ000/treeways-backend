// models/Data.js
const mongoose = require('mongoose');

// Define schema for each input in the inputs array
const InputSchema = new mongoose.Schema({
  id: { type: Number, required: true }, // Input ID is required
  content: { type: String, default: '' }, // Default value for content
  value: { type: Number, default: 0 }, // New field for the numeric value with a default of 0
  isAdding: { type: Boolean, required: true }, // isAdding must be true or false
});

// Define the main data schema with a category
const DataSchema = new mongoose.Schema({
  title: { type: String, default: '' }, // Title can be an empty string by default
  componentName: { type: String, required: true }, // Include componentName as required
  parentComponentName: { type: String, required: true },
  inputs: [InputSchema], // Array of inputs
  result: {type: Number, required: true},
  TotalResult: {type: Number, required: true},
});

// Function to create a model based on the category
const getModelByCategory = (category) => {
  const collectionName = category.toLowerCase(); // Convert category to lowercase for collection name
  return mongoose.model(collectionName, DataSchema, collectionName);
};

module.exports = getModelByCategory;
