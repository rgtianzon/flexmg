const mongoose = require('mongoose');

const campFlex = new mongoose.Schema({
    CampID: Number,
    CampU: String,
    CampName: String,
    details: String,
    addedBy: String
}, { timestamps: { createdAt: 'created_at' } });

const Campaign = mongoose.model('campaign', campFlex);
module.exports = Campaign;