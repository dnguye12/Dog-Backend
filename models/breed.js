const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

const BreedSchema = new mongoose.Schema({
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
    number_of_genetic_ailments: Number,
    genetic_ailments: String,
    grooming_frequency: String,
    suitability_for_children: Number,
    image: String,
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'UserPreference'
        }
    ],
    dislikes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'UserPreference'
        }
    ]
})

BreedSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

BreedSchema.plugin(uniqueValidator)

module.exports = mongoose.model("Breed", BreedSchema)