const userPreferenceRouter = require("express").Router()

const Breed = require("../models/breed");
const User = require("../models/user")
const UserPreference = require("../models/user-preference")

userPreferenceRouter.post("/", async (req, res) => {
    const { breedId, userId, fit, popularity_ranking, size, lifetime_cost, intelligence, grooming_frequency, suitability_for_children } = req.body

    try {
        const breed = await Breed.findById(breedId)
        const user = await User.findById(userId)

        const existingPreference = await UserPreference.findOne({
            breed: breed._id,
            user: user._id,
            popularity_ranking,
            size,
            lifetime_cost,
            intelligence,
            grooming_frequency,
            suitability_for_children
        });

        if (existingPreference) {
            existingPreference.fit = fit
            const savedPreference = await existingPreference.save()
            return res.status(200).json(savedPreference)
        }

        const newPreference = await new UserPreference({
            popularity_ranking,
            size,
            lifetime_cost,
            intelligence,
            grooming_frequency,
            suitability_for_children,
            breed: breed._id,
            user: user._id,
            fit
        })

        const savedPreference = await newPreference.save()
        return res.status(200).json(savedPreference)
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

userPreferenceRouter.patch("/by-input", async(req, res) => {
    const { breedId, userId, popularity_ranking, size, lifetime_cost, intelligence, grooming_frequency, suitability_for_children } = req.body

    try {
        const breed = await Breed.findById(breedId)
        const user = await User.findById(userId)

        const existingPreference = await UserPreference.findOne({
            breed: breed._id,
            user: user._id,
            popularity_ranking,
            size,
            lifetime_cost,
            intelligence,
            grooming_frequency,
            suitability_for_children
        });

        if (existingPreference) {
            return res.status(200).json(existingPreference)
        }else {
            return res.status(204).json(null)
        }
    }catch(error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

module.exports = userPreferenceRouter