const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dataRoutes = require('./routes/dataRoutes');
const categoryRoutes = require("./routes/categoryRoutes");
const cors = require('cors'); // Import cors

const app = express();

// Middleware to parse incoming JSON data
app.use(bodyParser.json()); // Parses incoming requests with JSON payloads
app.use(cors(
origin: process.env.FRONTEND_URL,
credentials: true,
)); // Enables CORS for all requests

// Connect to MongoDB
mongoose.connect('mongodb+srv://admin:mc2jhQRy4jP8mZyG@mern-hotel-booking.hq0m3.mongodb.net/?retryWrites=true&w=majority&appName=holidays', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Use the data routes
app.use('/api/data', dataRoutes);

app.use("/api/category", categoryRoutes);
// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
