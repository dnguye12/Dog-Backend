const mongoose = require("mongoose")

const fitType = ["GOOD", "BAD", "NEUTRAL"]

const UserPreferenceSchema = new mongoose.Schema({
    popularity_ranking: Number,
    size: Number,
    lifetime_cost: Number,
    intelligence: Number,
    grooming_frequency: Number,
    suitability_for_children: Number,
    breed: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Breed"
    },
    user: {
        type: String,
        ref: "User"
    },
    fit: {
        type: String,
        enum: fitType,
        default: "NEUTRAL"
    }
})

UserPreferenceSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

module.exports = mongoose.model("UserPreference", UserPreferenceSchema);