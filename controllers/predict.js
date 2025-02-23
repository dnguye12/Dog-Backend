const predictRouter = require("express").Router()
const tf = require('@tensorflow/tfjs-node');
const path = require('path');

const Breed = require("../models/breed");
const UserPreference = require("../models/user-preference");
const scoreBreed = require("../utils/helper");

const convertGrooming = (grooming_frequency) => {
    if (grooming_frequency === "Daily") {
        return 0
    }
    else if (grooming_frequency === "Once a week") {
        return 1
    } else if (grooming_frequency === "Once in a few weeks") {
        return 2
    }
    else {
        return 1
    }
}

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

const normalizeValue = (value, min, max) => {
    if (value === -1) return 0.5;
    if (max === min) return 0.5;
    return (value - min) / (max - min);
};

const normalizeSize = (value) => {
    if (value === -1) return 0.5;
    // Map sizes: 1 -> 0, 2 -> 0.5, 3 -> 1
    if (value === 1) return 0;
    if (value === 2) return 0.5;
    if (value === 3) return 1;
    return 0.5;
};

const normalizeGroomingNumeric = (value) => {
    if (value === -1) return 0.5;
    // Map grooming numeric values: 0 -> 0, 1 -> 0.5, 2 -> 1
    if (value === 0) return 0;
    if (value === 1) return 0.5;
    if (value === 2) return 1;
    return 0.5;
};

const normalizeSuitability = (value) => {
    if (value === -1) return 0.5;
    if (value === 1) return 1;
    return 0.5;
};

const normalizedBreedGrooming = (breed) => {
    const groom = convertGrooming(breed.grooming_frequency);
    return normalizeGroomingNumeric(groom);
};

const computeFeatureContributions = (model, inputVector, epsilon = 0.001) => {
    const baseline = new Array(inputVector.length).fill(0.5);
    let groupContribs = new Array(6).fill(0);
    let total = 0;
    for (let i = 0; i < 6; i++) {
        const plusUser = [...inputVector];
        plusUser[i] += epsilon;
        const minusUser = [...inputVector];
        minusUser[i] -= epsilon;
        const predPlusUser = model.predict(tf.tensor2d([plusUser])).dataSync()[0];
        const predMinusUser = model.predict(tf.tensor2d([minusUser])).dataSync()[0];
        const gradUser = (predPlusUser - predMinusUser) / (2 * epsilon);
        const contribUser = Math.abs((inputVector[i] - baseline[i]) * gradUser);
        const plusBreed = [...inputVector];
        plusBreed[i + 6] += epsilon;
        const minusBreed = [...inputVector];
        minusBreed[i + 6] -= epsilon;
        const predPlusBreed = model.predict(tf.tensor2d([plusBreed])).dataSync()[0];
        const predMinusBreed = model.predict(tf.tensor2d([minusBreed])).dataSync()[0];
        const gradBreed = (predPlusBreed - predMinusBreed) / (2 * epsilon);
        const contribBreed = Math.abs((inputVector[i + 6] - baseline[i + 6]) * gradBreed);
        const group = contribUser + contribBreed;
        groupContribs[i] = group;
        total += group;
    }

    const featureKeys = [
        "popularity_ranking",
        "size",
        "lifetime_cost",
        "intelligence",
        "grooming_frequency",
        "suitability_for_children"
    ];
    let percentages = {};
    for (let i = 0; i < 6; i++) {
        percentages[featureKeys[i]] = total === 0 ? 0 : (groupContribs[i] / total) * 100;
    }
    return percentages;
}

predictRouter.get("/", async (req, res) => {
    let userInput = req.query
    const userId = userInput.userId
    delete userInput.userId
    Object.keys(userInput).forEach(key => {
        userInput[key] = parseFloat(userInput[key]);
    });
    try {
        const stats = await loadStats()
        const model = await loadModel()
        const breeds = await Breed.find({}).lean()
        let breedResults = await Promise.all(
            breeds.map(async (b) => {
                const userFeatures = [
                    normalizeValue(userInput.popularity_ranking, stats.lowest_popularity, stats.highest_popularity),
                    normalizeSize(userInput.size),
                    normalizeValue(userInput.lifetime_cost, stats.lowest_lifetime_cost, stats.highest_lifetime_cost),
                    normalizeValue(userInput.intelligence, stats.lowest_intelligence, stats.highest_intelligence),
                    normalizeGroomingNumeric(userInput.grooming_frequency),
                    normalizeSuitability(userInput.suitability_for_children)
                ];
                const breedFeatures = [
                    normalizeValue(b.popularity_ranking, stats.lowest_popularity, stats.highest_popularity),
                    normalizeSize(b.size),
                    normalizeValue(b.lifetime_cost, stats.lowest_lifetime_cost, stats.highest_lifetime_cost),
                    normalizeValue(b.intelligence, stats.lowest_intelligence, stats.highest_intelligence),
                    normalizedBreedGrooming(b.grooming_frequency),
                    normalizeSuitability(b.suitability_for_children)
                ];
                const featureVector = [...userFeatures, ...breedFeatures];
                const inputTensor = tf.tensor2d([featureVector]);
                const predictionTensor = model.predict(inputTensor);
                const predictionArray = await predictionTensor.data();
                const predictionScore = scoreBreed(b, userInput, stats);
                const contributions = computeFeatureContributions(model, featureVector);
                const existingPreference = await UserPreference.findOne({
                    popularity_ranking: userInput.popularity_ranking,
                    size: userInput.size,
                    lifetime_cost: userInput.lifetime_cost,
                    intelligence: userInput.intelligence,
                    grooming_frequency: userInput.grooming_frequency,
                    suitability_for_children: userInput.suitability_for_children,
                    breed: b._id,
                    user: userId
                });
                return {
                    ...b,
                    prediction: predictionScore,
                    fit: existingPreference
                        ? (existingPreference.fit === "GOOD" ? 1 : existingPreference.fit === "BAD" ? -1 : 0)
                        : 0
                };
            })
        )
        breedResults = breedResults.filter(b => b.prediction && b.prediction !== -Infinity);
        breedResults.sort((a, b) =>
            (b.prediction.score + b.fit * 0.5) - (a.prediction.score + a.fit * 0.5)
        );
        const topResults = breedResults.slice(0, 3);
        console.log(topResults)
        return res.status(200).json(topResults);
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

module.exports = predictRouter