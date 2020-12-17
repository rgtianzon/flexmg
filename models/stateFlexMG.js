const mongoose = require('mongoose');

const stateFlex = new mongoose.Schema({
    stateID: Number,
    stateU: String,
    stateName: String,
    stateType: String,
    details: String
}, { timestamps: { createdAt: 'created_at' } });

const State = mongoose.model('State', stateFlex);
module.exports = State;