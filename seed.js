const fs = require('fs');

const Papa = require('papaparse');

const Breed = require("./models/breed")
const UserPreference = require("./models/user-preference")

const config = require("./utils/config");
const logger = require("./utils/logger");
const scoreBreed = require("./utils/helper");

const featureNames = [
    "popularity_ranking",
    "size",
    "lifetime_cost",
    "intelligence",
    "grooming_frequency",
    "suitability_for_children"
];

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

const generateFakePreference = (stats) => {
    return {
        popularity_ranking: Math.random() < 0.2 ? -1 : Math.floor(Math.random() * stats.highest_popularity) + stats.lowest_popularity,
        size: Math.random() < 0.2 ? -1 : Math.floor(Math.random() * 3) + 1,
        lifetime_cost: Math.random() < 0.2 ? -1 : Math.floor(Math.random() * stats.highest_lifetime_cost) + stats.lowest_lifetime_cost,
        intelligence: Math.random() < 0.2 ? -1 : Math.floor(Math.random() * stats.highest_intelligence) + stats.lowest_intelligence,
        grooming_frequency: Math.random() < 0.2 ? -1 : Math.floor(Math.random() * 3),
        suitability_for_children: Math.random() < 0.2 ? -1 : Math.floor(Math.random() * 3) + 1
    }
}

const simulateScoring = async (breeds, stats) => {
    const preferences = generateFakePreference(stats)

    let bestScore = -Infinity
    let bestBreed = null

    for (let breed of breeds) {
        const score = scoreBreed(breed, preferences)
        if (score > bestScore) {
            bestScore = score
            bestBreed = breed
        }
    }

    if (bestBreed) {
        const helper = new UserPreference({
            ...preferences,
            recommendation: bestBreed._id,
            recommendationName: bestBreed.breed
        })
        await helper.save()
    }
}

const seedPreferences = async () => {
    try {
        await UserPreference.deleteMany({})
        const breeds = await Breed.find({})
        const stats = await Breed.aggregate([
            {
                $group: {
                    _id: null,
                    lowest_lifetime_cost: { $min: "$lifetime_cost" },
                    highest_lifetime_cost: { $max: "$lifetime_cost" },
                    lowest_intelligence: { $min: "$intelligence" },
                    highest_intelligence: { $max: "$intelligence" },
                    lowest_longevity: { $min: "$longevity" },
                    highest_longevity: { $max: "$longevity" },
                    lowest_popularity: { $min: "$popularity_ranking" },
                    highest_popularity: { $max: "$popularity_ranking" },
                    lowest_number_of_genetic_ailments: { $min: "$number_of_genetic_ailments" },
                    highest_number_of_genetic_ailments: { $max: "$number_of_genetic_ailments" },
                }
            }
        ])
        for (let i = 0; i < 10000; i++) {
            await simulateScoring(breeds, stats[0])
        }
    } catch (error) {
        console.log(error)
    } finally {
        mongoose.connection.close();
        console.log("Database connection closed.");
    }
}

const updateBreeds = async () => {
    try {
        const updateResult = await Breed.updateMany({}, {
            $unset: { fits: 1 }
        })
        console.log(`Updated ${updateResult.modifiedCount} breeds.`);
    } catch (error) {
        console.error('Error updating breeds:', error);
    } finally {
        await mongoose.disconnect();
    }
}