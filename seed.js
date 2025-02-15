const fs = require('fs');

const Papa = require('papaparse');
const Breed = require("./models/breed")
const config = require("./utils/config");
const logger = require("./utils/logger");

const mongoose = require("mongoose");

mongoose.set("strictQuery", false);

logger.info("connecting to", config.MONGODB_URI);
mongoose
    .connect(config.MONGODB_URI)
    .then(() => {
        logger.info("connected to MongoDB");
    })
    .catch((error) => {
        logger.error("error connecting to MongoDB:", error.message);
    });

const preprocessDataset = (data) => {
    return data.map(dog => {
        return {
            breed: dog.Breed,
            type: dog.type,
            score: parseFloat(dog.score),
            popularity_ranking: parseInt(dog.popularity_ranking),
            size: parseInt(dog.size),
            lifetime_cost: parseFloat(dog["$LIFETIME_COST"].replace(/[$, ]/g, "")),
            intelligence: parseInt(dog["INTELLIGENCE"].replace("%", "")),
            longevity: parseInt(dog["LONGEVITY(YEARS)"]),
            number_of_genetic_ailments: parseInt(dog["NUMBER_OF_GENETIC_AILMENTS"]),
            genetic_ailments: dog["GENETIC_AILMENTS"],
            grooming_frequency: dog["GROOMING_FREQUNCY"],
            suitability_for_children: parseInt(dog["SUITABILITY_FOR_CHILDREN"])
        }
    })
}

const seed = async () => {
    try {
        const fileData = fs.readFileSync("./public/dogs-dataset.csv", "utf-8")
        const parsedData = Papa.parse(fileData, {
            header: true,
            skipEmptyLines: true
        });
        const processedData = preprocessDataset(parsedData.data);

        await Breed.deleteMany({})
        await Breed.insertMany(processedData)
        console.log("Database seeded successfully.");

    } catch (error) {
        console.log(error.message)
    } finally {
        mongoose.connection.close();
        console.log("Database connection closed.");
    }
}

seed()