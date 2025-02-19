const pendingRouter = require("express").Router()

const Pending = require("../models/pending")
const User = require("../models/user")
const Breed = require("../models/breed")

const gis = require('async-g-i-s');

const APPROVE_MAX = 2
const APPROVE_MIN = -2

pendingRouter.get('/', async (req, res) => {
    const { id } = req.query

    try {
        const pending = await Pending.findById(id)

        if (!pending.image) {
            let helper
            const googleImages = await gis(`${pending.breed} dog breed 1920x1080`)

            for (let i = 0; i < 10; i++) {
                if (googleImages[i].width > googleImages[i].height && googleImages[i].width >= 1000) {
                    helper = googleImages[i].url
                    break
                }
            }

            if (!helper) {
                helper = googleImages[0].url
            }

            pending.image = helper
            const savedPending = await pending.save()

            return res.status(200).json(savedPending)
        }

        return res.status(200).json(pending)
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

pendingRouter.get("/group", async (req, res) => {
    const { userId } = req.query

    try {
        const user = await User.findById(userId)

        if (!user) {
            return res.status(400).json("Cant find user")
        }

        const pendingList = await Pending.find({
            approved_by: { $nin: [userId] }
        })

        return res.status(200).json(pendingList)
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

pendingRouter.post("/", async (req, res) => {
    const {
        breed,
        type,
        popularity_ranking,
        size,
        lifetime_cost,
        intelligence,
        longevity,
        grooming_frequency,
        suitability_for_children,
        user
    } = req.body;

    try {
        const pending = new Pending({
            breed,
            type,
            popularity_ranking,
            size,
            lifetime_cost,
            intelligence,
            longevity,
            grooming_frequency,
            suitability_for_children,
            approve: 0,
            user,
            approved_by: []
        })

        let helper
        const googleImages = await gis(`${breed} dog breed 1920x1080`)

        for (let i = 0; i < 10; i++) {
            if (googleImages[i].width > googleImages[i].height && googleImages[i].width >= 1000) {
                helper = googleImages[i].url
                break
            }
        }

        if (!helper) {
            helper = googleImages[0].url
        }

        pending.image = helper

        const savedPending = await pending.save()

        return res.status(200).json(savedPending)
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

pendingRouter.patch("/approve", async (req, res) => {
    const { userId, pId, approve } = req.body

    try {
        const pending = await Pending.findById(pId)
        pending.approve += approve
        pending.approved_by.push(userId)

        if (pending.approve >= APPROVE_MAX) {
            const newBreed = new Breed({
                breed: pending.breed,
                type: pending.type,
                popularity_ranking: pending.popularity_ranking,
                size: pending.size,
                lifetime_cost: pending.lifetime_cost,
                intelligence: pending.intelligence,
                longevity: pending.longevity,
                grooming_frequency: pending.grooming_frequency,
                suitability_for_children: pending.suitability_for_children
            })

            const savedBreed = await newBreed.save()
            for (const ab of pending.approved_by) {
                const user = await User.findById(ab);
                if (user) {
                    user.approve.push(savedBreed.id);
                    await user.save();
                }
            }

            const user = await User.findById(pending.user)
            user.submit.push(savedBreed.id)
            await user.save()

            await Pending.findByIdAndDelete(pending.id)
            return res.status(200).json(null)
        } else if (pending.approve <= APPROVE_MIN) {
            await Pending.findByIdAndDelete(pending.id)
            return res.status(200).json(null)
        }
        const savedPending = await pending.save()
        return res.status(200).json(savedPending)
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

module.exports = pendingRouter