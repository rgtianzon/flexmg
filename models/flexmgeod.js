const mongoose = require('mongoose');

const flexmgeod = new mongoose.Schema({
    eodID: Number,
    eodDate: String,
    userName: String,
    remarks: String,
    challenges: String,
    actionItems: String,
    updates: String,
    shiftSchedule: String,
}, { timestamps: { createdAt: 'created_at' } });

const FlexEOD = mongoose.model('FlexEOD', flexmgeod);
module.exports = FlexEOD;