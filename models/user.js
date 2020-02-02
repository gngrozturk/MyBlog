const mongoose = require('mongoose');


let userSchema = mongoose.Schema({
    googleData: {
        type: Object,
        require: true
    },
    googleId: {
        type: String,
        require: true
    },
    username: {
        type: String,
        require: true,
    },
    posts: [
        {type: mongoose.Schema.Types.ObjectId,
        ref: 'Blog'}
    ]
})

module.exports = mongoose.model('User', userSchema);