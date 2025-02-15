const predictRouter = require("express").Router()
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');

const Breed = require("../models/breed")

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
                    lowest_number_of_genetic_ailments: { $min: "$number_of_genetic_ailments" },
                    highest_number_of_genetic_ailments: { $max: "$number_of_genetic_ailments" },
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

    const processedInput = []

    console.log(userInput)



    try {
        const stats = await loadStats()

        if (userInput.popularity_ranking !== -1) {
            processedInput.push(normalizeInput(userInput.popularity_ranking, stats.lowest_popularity, stats.highest_popularity))
        }
        if (userInput.size !== -1) {
            processedInput.push(normalizeInput(userInput.size, 1, 3))
        }
        if (userInput.lifetime_cost !== -1) {
            processedInput.push(normalizeInput(userInput.lifetime_cost, stats.lowest_lifetime_cost, stats.highest_lifetime_cost))
        }
        if (userInput.intelligence !== -1) {
            processedInput.push(normalizeInput(userInput.intelligence, stats.lowest_intelligence, stats.highest_intelligence))
        }
        if (userInput.grooming_frequency !== -1) {
            processedInput.push(normalizeInput(userInput.grooming_frequency, 0, 2))
        }
        if (userInput.suitability_for_children !== -1) {
            processedInput.push(normalizeInput(userInput.suitability_for_children, 1, 3))
        }

        const model = await loadModel()
        console.log(processedInput)
        const inputTensor = tf.tensor2d([processedInput])
        const prediction = model.predict(inputTensor)
        const predictionData = await prediction.data()

        const breeds = await Breed.find({}).lean()

        const helper = breeds.map((b, i) => ({
            ...b,
            prediction: predictionData[i]
        }))

        return res.status(200).json(helper)
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

module.exports = predictRouter