// Import the Express library
const express = require('express');

// Create a new router object
const router = express.Router();

// Define a route that handles POST requests to the '/foodData' endpoint
router.post('/foodData', (req, res) => {
    try {
        // Attempt to send a response with two global variables: foodData and foodCatData
        res.send([global.foodData, global.foodCatData]);
    } catch (error) {
        // If an error occurs, log the error message to the console
        console.log(error.message);
        // Send a 'Server error' response to the client
        res.send('Server error');
    }
});

// Export the router object so it can be used in other parts of the application
module.exports = router;
