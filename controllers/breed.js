const breedRouter = require("express").Router()

const gis = require('async-g-i-s');
const axios = require('axios');

const Breed = require("../models/breed");

breedRouter.get("/", async (req, res) => {
    const { id } = req.query

    try {
        const breed = await Breed.findById(id)

        if (!breed) {
            return res.status(404).json("Breed not found")
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
            return res.status(200).json(breed.image.toString("base64"))
        } else {
            let helper
            const googleImages = await gis(`${breed.breed} dog breed 1920x1080`)

            for (let i = 0; i < 10; i++) {
                if (googleImages[i].width > googleImages[i].height && googleImages[i].width >= 1000) {
                    const image = await axios.get(googleImages[i].url, { responseType: 'arraybuffer' })
                    helper = Buffer.from(image.data, "binary")
                    break
                }
            }

            if (!helper) {
                const image = await axios.get(googleImages[0].url, { responseType: 'arraybuffer' })
                helper = Buffer.from(image.data, "binary")
            }

            breed.image = helper

            const savedBreed = await breed.save()

            return res.status(200).json(savedBreed.image.toString("base64"));
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

module.exports = breedRouter