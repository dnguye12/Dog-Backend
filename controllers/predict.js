const predictRouter = require("express").Router()
const tf = require('@tensorflow/tfjs-node');
const path = require('path');

const Breed = require("../models/breed");
const scoreBreed = require("../utils/helper");

const featureNames = [
    "popularity_ranking",
    "size",
    "lifetime_cost",
    "intelligence",
    "grooming_frequency",
    "suitability_for_children"
];

const loadModel = async () => {
    // eslint-disable-next-line no-undef
    const modelPath = `file://${path.resolve(__dirname, "../public/model.json")}`;
    return await tf.loadLayersModel(modelPath);
}

const loadStats = async () => {
    try {
        const stats = await Breed.aggregate([
            {
                $group: {
                    _id: null,
                    lowest_lifetime_cost: { $min: "$lifetime_cost" },
                    highest_lifetime_cost: { $max: "$lifetime_cost" },
                    lowest_intelligence: { $min: "$intelligence" },
                    highest_intelligence: { $max: "$intelligence" },
                    lowest_popularity: { $min: "$popularity_ranking" },
                    highest_popularity: { $max: "$popularity_ranking" },
                }
            }
        ])

        return stats[0]
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
}

const normalizeInput = (value, min, max) => {
    if (min === max) {
        return 0.5
    }
    return (value - min) / (max - min)
}

predictRouter.get("/", async (req, res) => {
    const userInput = req.query

    Object.keys(userInput).forEach(key => {
        userInput[key] = parseFloat(userInput[key]);
    });

    try {
        const stats = await loadStats()

        const featureRanges = {
            popularity_ranking: [stats.lowest_popularity, stats.highest_popularity],
            size: [1, 3],
            lifetime_cost: [stats.lowest_lifetime_cost, stats.highest_lifetime_cost],
            intelligence: [stats.lowest_intelligence, stats.highest_intelligence],
            grooming_frequency: [0, 2],
            suitability_for_children: [1, 3]
        };

        let processedFeatures = [];

        featureNames.forEach((feature, index) => {
            if (userInput[feature] === -1) {
                processedFeatures.push(-1)
            } else {
                const [min, max] = featureRanges[feature];
                let normalizedValue = normalizeInput(userInput[feature], min, max);
                processedFeatures.push(normalizedValue);
            }
        })

        const inputTensor = tf.tensor2d([processedFeatures])

        const model = await loadModel()

        const breeds = await Breed.find({}).lean()
        let breedResults = breeds.map((b, i) => ({
            ...b,
            prediction: scoreBreed(b, userInput, stats)
        }))

        breedResults = breedResults.filter(b => b.prediction && b.prediction !== -Infinity)
        breedResults.sort((a, b) => b.prediction.score - a.prediction.score)

        const topResults = breedResults.slice(0, 3)
        return res.status(200).json(topResults)
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

module.exports = predictRouter