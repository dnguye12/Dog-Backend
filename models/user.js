const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

const UserSchema = new mongoose.Schema({
    _id: {
        type: String
    },
    name: {
        type: String
    },
    imageUrl: {
        type: String
    },
    submit: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Breed"
        }
    ],
    approve: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Breed"
        }
    ]
})

UserSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

UserSchema.plugin(uniqueValidator)

module.exports = mongoose.model('User', UserSchema)