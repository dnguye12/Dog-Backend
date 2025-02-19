const breedRouter = require("express").Router()

const gis = require('async-g-i-s');
const stringSimilarity = require('string-similarity');

const Breed = require("../models/breed");

breedRouter.get("/", async (req, res) => {
    const { id } = req.query

    try {
        const breed = await Breed.findById(id)

        if (!breed) {
            return res.status(404).json("Breed not found")
        }

        if (!breed.image) {
            let helper
            const googleImages = await gis(`${breed.breed} dog breed 1920x1080`)

            for (let i = 0; i < 10; i++) {
                if (googleImages[i].width > googleImages[i].height && googleImages[i].width >= 1000) {
                    helper = googleImages[i].url
                    break
                }
            }

            if (!helper) {
                helper = googleImages[0].url
            }

            breed.image = helper

            const savedBreed = await breed.save()

            return res.status(200).json(savedBreed)
        }

        return res.status(200).json(breed)
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

breedRouter.patch("/fit", async (req, res) => {
    const { id, type } = req.query

    try {
        const breed = await Breed.findById(id)

        if (!breed) {
            return res.status(404).json("Breed not found")
        }

        if (type === "good") {
            breed.fit = breed.fit + 1
        } else {
            breed.fit = breed.fit - 1
        }

        const savedBreed = await breed.save()

        return res.status(200).json(savedBreed)
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

breedRouter.get("/image", async (req, res) => {
    const { id } = req.query

    try {
        const breed = await Breed.findById(id)

        if (!breed) {
            return res.status(404).json("Breed not found")
        }

        if (breed.image) {
            return res.status(200).json(breed.image)
        } else {
            let helper
            const googleImages = await gis(`${breed.breed} dog breed 1920x1080`)

            for (let i = 0; i < 10; i++) {
                if (googleImages[i].width > googleImages[i].height && googleImages[i].width >= 1000) {
                    helper = googleImages[i].url
                    break
                }
            }

            if (!helper) {
                helper = googleImages[0].url
            }

            breed.image = helper

            const savedBreed = await breed.save()

            return res.status(200).json(savedBreed.image);
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

breedRouter.get("/stats", async (req, res) => {
    try {
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
                    lowest_number_of_genetic_ailments: {$min: "$number_of_genetic_ailments"},
                    highest_number_of_genetic_ailments: {$max: "$number_of_genetic_ailments"},
                }
            }
        ]) 

        return res.status(200).json(stats[0])
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

breedRouter.get("/similar-name", async(req, res) => {
    const {name} = req.query

    try {
        const breeds = await Breed.find({})
        const breedNames = breeds.map(b => b.breed.toLowerCase())

        const matches = stringSimilarity.findBestMatch(name.toLowerCase(), breedNames)
        const similarBreeds  = matches.ratings.filter(rating => rating.rating >= 0.4).sort((a, b) => b.rating - a.rating).map(match => breeds.find(b => b.breed.toLowerCase() === match.target))

        return res.status(200).json(similarBreeds)
    }catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

module.exports = breedRouter