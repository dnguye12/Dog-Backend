const predictRouter = require("express").Router()
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');

const dogBreeds = JSON.parse(fs.readFileSync(path.join(__dirname, "../public/dog_breeds.json"), "utf8"))
const normalizationMinMax = JSON.parse(fs.readFileSync(path.join(__dirname, "../public/normalization_params.json"), "utf8"))
const featureNames = [
    "popularity_ranking",
    "size",
    "lifetime_cost",
    "intelligence",
    "longevity",
    "number_of_genetic_ailments",
    "grooming_frequency",
    "suitability_for_children"
];

const loadModel = async () => {
    // eslint-disable-next-line no-undef
    const modelPath = `file://${path.resolve(__dirname, "../public/model.json")}`;
    return await tf.loadLayersModel(modelPath);
}

const normalizeInput = (value, min, max) => {
    if (min === max) {
        return 0.5
    }
    return (value - min) / (max - min)
}

const prepareInput = (userInput) => {
    let normalizedValues = featureNames.map(feature => {
        let min = normalizationMinMax[feature].min;
        let max = normalizationMinMax[feature].max;
        return normalizeInput(userInput[feature], min, max);
    });

    return tf.tensor2d([normalizedValues]);
}

predictRouter.get("/", async (req, res) => {
    const userInput = req.query
    try {
        const model = await loadModel()
        const inputTensor = prepareInput(userInput)
        const prediction = model.predict(inputTensor)
        const predictionData = await prediction.data()

        return res.status(200).json(predictionData)
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

module.exports = predictRouter