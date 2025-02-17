const mongoose = require("mongoose")

const UserPreferenceSchema = new mongoose.Schema({
    popularity_ranking: Number,
    size: Number,
    lifetime_cost: Number,
    intelligence: Number,
    grooming_frequency: Number,
    suitability_for_children: Number,
    recommendation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Breed"
    },
    recommendationName: String
})

UserPreferenceSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

module.exports = mongoose.model("UserPreference", UserPreferenceSchema);