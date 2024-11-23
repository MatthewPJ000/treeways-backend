const getModelByCategory = require('../models/Data'); // Adjust the path as needed


async function updateMinAbsTotalResultFlag(DataModel) {
  // Reset isMaxAbsResult for all documents
  await DataModel.updateMany({}, { isMaxAbsResult: false });

  // Find the document with the minimum absolute TotalResult, considering only finalChild = true
  const minAbsResultDoc = await DataModel.aggregate([
    { $match: { finalChild: true } }, // Filter only documents where finalChild is true
    { $addFields: { absTotalResult: { $abs: "$TotalResult" } } },
    { $sort: { absTotalResult: 1 } }, // Sort in ascending order to find the min abs value
    { $limit: 1 }
  ]);

  if (minAbsResultDoc.length > 0) {
    // Update isMaxAbsResult (or rename as needed) for the document with the smallest absolute TotalResult
    await DataModel.updateOne(
      { _id: minAbsResultDoc[0]._id },
      { isMaxAbsResult: true } // Rename to isMinAbsResult if more meaningful
    );
  }
}


exports.saveData = async (req, res) => {
  const { title, inputs, componentName, result } = req.body;

  const category = req.params.selectedCategory;

  if (!category) {
    return res.status(400).json({ message: 'Category is required' });
  }

  let parentComponentName = 'root';
  if (componentName.includes('>')) {
    const parts = componentName.split('>');
    parentComponentName = parts.slice(0, parts.length - 1).join('>');
  }

  const DataModel = getModelByCategory(category);

  try {
    // Find existing document
    const existingDocument = await DataModel.findOne({ componentName });

    // Get parent's TotalResult
    let parentTotalResult = 0;
    if (parentComponentName !== 'root') {
      const parentComponent = await DataModel.findOne({ componentName: parentComponentName });
      parentTotalResult = parentComponent ? parentComponent.TotalResult : 0;
    }

    const currentTotalResult = parentTotalResult - result;

    let updatedDocument;
    if (existingDocument) {
      existingDocument.title = title || existingDocument.title;
      existingDocument.inputs = inputs.map(input => ({
        id: input.id,
        content: input.content || '',
        value: input.value || null,
        isAdding: input.isAdding,
      }));
      existingDocument.parentComponentName = parentComponentName;
      existingDocument.result = result;
      existingDocument.TotalResult = Math.round(currentTotalResult * 100) / 100;

      updatedDocument = await existingDocument.save();
    } else {
      const newData = new DataModel({
        title: title || '',
        componentName: componentName || '',
        inputs: inputs.map(input => ({
          id: input.id,
          content: input.content || 'cost',
          value: input.value || null,
          isAdding: input.isAdding,
        })),
        parentComponentName,
        result,
        TotalResult: Math.round(currentTotalResult * 100) / 100,
        finalChild: true, // New components are assumed to be final children initially
      });

      updatedDocument = await newData.save();
    }

    // Update parent's totalChild field
    if (parentComponentName !== 'root') {
      const parentComponent = await DataModel.findOne({ componentName: parentComponentName });
      if (parentComponent) {
        parentComponent.finalChild = false;
        await parentComponent.save();
      }
      console.log("parentComponent",parentComponent)
    }

    // Update isMaxAbsResult for the document with the maximum absolute TotalResult
    await updateMinAbsTotalResultFlag(DataModel);

    // Update child components' TotalResult if any
    const childComponents = await DataModel.find({ componentName: { $regex: `^${componentName}>` } });
    for (const child of childComponents) {
      child.TotalResult = Math.round((updatedDocument.TotalResult - child.result) * 100) / 100;
      await child.save();
    }

    return res.status(200).json({
      message: `Component ${componentName} saved successfully`,
      data: updatedDocument,
    });
  } catch (error) {
    console.error('Error saving data:', error);
    return res.status(500).json({ message: 'Failed to save data', error });
  }
};





exports.getAllComponentsByCategory = async (req, res) => {
  const category = req.params.selectedCategory; // Get category from request parameters (URL)

  if (!category) {
    return res.status(400).json({ message: 'Category is required' });
  }

  // Get the model for the specified category
  const DataModel = getModelByCategory(category);

  try {
    // Fetch all components for the specified category
    const components = await DataModel.find({}); // Fetch all documents in the collection
    res.status(200).json({
      components,
    });

    // console.log("components", components)
  } catch (error) {
    console.error('Error fetching components for category:', error);
    return res.status(500).json({ message: 'Failed to fetch components', error });
  }
};

exports.getComponentByName = async (req, res) => {
  const category = req.params.selectedCategory;
  const componentName = req.params.componentName;

  if (!category || !componentName) {
    return res.status(400).json({ message: 'Category and componentName are required' });
  }

  const DataModel = getModelByCategory(category);

  try {
    const component = await DataModel.findOne({ componentName }); 

    // Handle the case when the component is not found
    if (!component) {
      return res.status(404).json({ message: `Component '${componentName}' not found in category '${category}'` });
    }

    const response = {
      title: component.title,
      inputs: component.inputs.map(input => ({
        content: input.content,
        value: input.value, // Include the value field
      }))
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching component:', error);
    res.status(500).json({ message: 'Failed to fetch component', error: error.message });
  }
};


exports.deleteComponentByName = async (req, res) => {
  const category = req.params.selectedCategory; // Get category from request parameters
  const componentName = req.params.componentName; // Get componentName from request parameters

  if (!category || !componentName) {
    return res.status(400).json({ message: 'Category and componentName are required' });
  }

  // Get the model for the specified category
  const DataModel = getModelByCategory(category);

  try {
    // Create a regular expression to match all component names that start with the specified prefix
    const regex = new RegExp(`^${componentName}`);

    // Delete all components where componentName starts with the specified prefix
    const result = await DataModel.deleteMany({ componentName: { $regex: regex } });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No components found with the specified prefix' });
    }

    // Extract parent component name from the given componentName
    let parentComponentName = 'root';
    if (componentName.includes('>')) {
      const parts = componentName.split('>');
      parentComponentName = parts.slice(0, parts.length - 1).join('>');
    }

    if (parentComponentName !== 'root') {
      // Check if the parent component still has any child components
      const hasChildren = await DataModel.exists({
        componentName: { $regex: `^${parentComponentName}>` }
      });

      if (!hasChildren) {
        // If no children exist, update finalChild of the parent component to true
        await DataModel.updateOne(
          { componentName: parentComponentName },
          { finalChild: true }
        );
      }
    }

    return res.status(200).json({ message: `${result.deletedCount} component(s) deleted successfully` });
  } catch (error) {
    console.error('Error deleting components:', error);
    return res.status(500).json({ message: 'Failed to delete components', error });
  }
};



exports.deleteCategory = async (req, res) => {
  const category = req.params.category;

  // Ensure category parameter is provided
  if (!category) {
    return res.status(400).json({ message: 'Category is required' });
  }

  // Get the data model for the category
  const DataModel = getModelByCategory(category);

  try {
    // Check if the collection exists before attempting to drop it
    const collectionExists = await DataModel.collection.exists();
    
    // If the collection does not exist, return a 404 response
    if (!collectionExists) {
      return res.status(404).json({ message: `Category '${category}' not found` });
    }

    // Proceed to delete the collection for that category
    await DataModel.collection.drop();
    
    // Return success response
    res.status(200).json({ message: `Category '${category}' deleted successfully` });
  } catch (error) {
    console.error('Error deleting category:', error);
    
    // Return an error response if deletion fails
    res.status(500).json({ message: 'Failed to delete category', error: error.message });
  }
};



exports.addCategory = async (req, res) => {
  const { componentName } = req.body;

  if (!componentName) {
    return res.status(400).json({ message: "Category name is required" });
  }

  try {
    const DataModel = getModelByCategory(category);

    // Check if the category already exists
    const existingCategory = await DataModel.findOne({ componentName });
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }

    // Save the category in the Category collection
    const newCategory = new Category({ componentName });
    await newCategory.save();

    // Create a dynamic model for the new category collection
    mongoose.model(componentName, new mongoose.Schema({ /* your schema fields here */ }));

    res.status(201).json({ message: `Category '${componentName}' created successfully` });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ message: "Failed to create category", error });
  }
};


