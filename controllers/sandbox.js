//Code for testing

const tf = require('@tensorflow/tfjs-node');

const sandboxRouter = require("express").Router()

const config = require("../utils/config")
const Breed = require("../models/breed");
const scoreBreed = require('../utils/helper');

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

const convertSuitabilityForChildren = (suitability_for_children) => {
    if (suitability_for_children === 1) {
        return 2
    } else if (suitability_for_children === 2) {
        return 1
    } else {
        return 0
    }
}

const normalize = (data, columnName) => {
    let min = Math.min(...data);
    let max = Math.max(...data);
    if (min === max) {
        return 0.5
    }
    return data.map(value => (value - min) / (max - min))
}

sandboxRouter.get("/prep", async (req, res) => {
    const { pass } = req.query
    if (!pass || pass !== config.PASS) {
        return res.status(400).json("Unauthorized")
    }


})

sandboxRouter.get("/train", async (req, res) => {
    const { pass } = req.query
    if (!pass || pass !== config.PASS) {
        return res.status(400).json("Unauthorized")
    }
    const breeds = await Breed.find({})

    let xs = breeds.map(d => [
        d.popularity_ranking,
        d.size,
        d.lifetime_cost,
        d.intelligence,
        d.longevity,
        d.number_of_genetic_ailments,
        convertGrooming(d.grooming_frequency),
        convertSuitabilityForChildren(d.suitability_for_children)
    ])

    for (let col = 0; col < xs[0].length; col++) {
        let columnData = xs.map(row => row[col]);
        let normalizedColumn = normalize(columnData, featureNames[col]);
        xs = xs.map((row, i) => {
            row[col] = normalizedColumn[i];
            return row;
        });
    }

    const uniqueBreeds = [...new Set(breeds.map(b => b.breed))]
    const breedToIndex = Object.fromEntries(uniqueBreeds.map((b, i) => [b, i]));

    const ys = breeds.map(d => {
        let labelArray = new Array(uniqueBreeds.length).fill(0);
        labelArray[breedToIndex[d.breed]] = 1;
        return labelArray;
    })

    const xsTensor = tf.tensor2d(xs)
    const ysTensor = tf.tensor2d(ys)

    const model = tf.sequential()
    model.add(tf.layers.dense({ inputShape: [xs[0].length], units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
    model.add(tf.layers.dense({ units: uniqueBreeds.length, activation: 'softmax' }));

    model.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });

    await model.fit(xsTensor, ysTensor, { epochs: 2, batchSize: 3, validationSplit: 0.2 });
    return res.status(200).json('Model trained and saved.')
})

sandboxRouter.get("/", async (req, res) => {
    let userInput = req.query
    const userId = userInput.userId
    delete userInput.userId

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

        featureNames.forEach((feature) => {
            if (userInput[feature] === -1) {
                processedFeatures.push(-1)
            } else {
                const [min, max] = featureRanges[feature];
                let normalizedValue = normalizeInput(userInput[feature], min, max);
                processedFeatures.push(normalizedValue);
            }
        })

        const breeds = await Breed.find({}).lean()

        let breedResults = await Promise.all(
            breeds.map(async (b, i) => {
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

                if (existingPreference) {
                    return {
                        ...b,
                        prediction: scoreBreed(b, userInput, stats),
                        fit: existingPreference.fit === "GOOD" ? 1 : existingPreference.fit === "BAD" ? -1 : 0
                    };
                } else {
                    return {
                        ...b,
                        prediction: scoreBreed(b, userInput, stats),
                        fit: 0
                    };
                }
            })
        );

        breedResults = breedResults.filter(b => b.prediction && b.prediction !== -Infinity)
        breedResults.sort((a, b) => b.prediction.score + b.fit * 0.5 - a.prediction.score - a.fit * 0.5)

        const topResults = breedResults.slice(0, 3)
        return res.status(200).json(topResults)
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

module.exports = sandboxRouter