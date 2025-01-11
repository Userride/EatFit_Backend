const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

const mongoDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI;
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("DB connected");

        // Fetch data from "food" collection
        const foodCollection = mongoose.connection.db.collection("food");
        global.foodData = await foodCollection.find({}).toArray();
        console.log("Fetched Food Data:", global.foodData);

        // Fetch data from "food_cat" collection
        const foodCatCollection = mongoose.connection.db.collection("food_cat");
        global.foodCatData = await foodCatCollection.find({}).toArray();
        console.log("Fetched Food Category Data:", global.foodCatData);

        // Optional: Close the connection if you only need to fetch data once
        // await mongoose.connection.close();
    } catch (err) {
        console.error("Error connecting to the database:", err);
    }
};

module.exports = mongoDB;
