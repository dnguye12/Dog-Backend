const userRouter = require("express").Router()

const Breed = require("../models/breed");
const User = require("../models/user")

userRouter.get("/", async (req, res) => {
    const { userId } = req.query

    try {
        const user = await User.findById(userId)
        if (user) {
            return res.status(200).json(user)
        } else {
            return res.status(204).json({ error: 'User not found' });
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

userRouter.post("/", async (req, res) => {
    const { userId, name, imageUrl } = req.body

    const newUser = new User({
        _id: userId,
        name,
        imageUrl
    })

    try {
        const savedUser = await newUser.save()
        return res.status(201).json(savedUser)
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

userRouter.patch("/like", async (req, res) => {
    const { breedId, userId } = req.query

    try {
        const breed = await Breed.findById(breedId)

        if (!breed) {
            return res.status(404).json("Breed not found")
        }

        const user = await User.findById(userId)

        if (!user) {
            return res.status(404).json("User not found")
        }

        if (!breed.likes.find((u) => u === userId)) {
            breed.likes.push(userId)

            const savedBreed = await breed.save()

            return res.status(200).json(savedBreed)
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal error")
    }
})

module.exports = userRouter