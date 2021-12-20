const mongoose = require('mongoose')
const Schema = mongoose.Schema

const history_resource = new Schema({
    'host' : String,
    'cpu' : Number,
    'memory' : Number,
    'node_service' : [{
        'name' : String,
        'status' : String
    }],
    'nginx' : Boolean,
    'time': Number
}, {timestamps : false})

module.exports = mongoose.model('history', history_resource)