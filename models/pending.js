const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

const PendingSchema = new mongoose.Schema({
    breed: {
        type: String,
        index: true
    },
    type: String,
    score: {
        type: Number,
        default: 0
    },
    popularity_ranking: Number,
    size: Number,
    lifetime_cost: Number,
    intelligence: Number,
    longevity: Number,
    grooming_frequency: String,
    suitability_for_children: Number,
    approve: {
        type: Number,
        default: 0
    },
    user: {
        type: String,
        ref: "User"
    },
    approved_by: [{
        type: String,
        ref: "User",
    }],
    image: String
})

PendingSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

PendingSchema.plugin(uniqueValidator)

module.exports = mongoose.model("Pending", PendingSchema)