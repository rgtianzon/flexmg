const mongoose = require('mongoose');

const agentStateSchema = new mongoose.Schema({
    stateID: Number,
    userName: String,
    fullName: String,
    stateName: String,
    stateU: String,
    stateType: String,
    startDate: String,
    endDate: String,
    durationTime: String,
    durationHr: Number,
    durationMn: Number,
    durationSc: Number,
    onGoing: Boolean,
    comments: String,
    UpdatedBy: String
}, { timestamps: { createdAt: 'created_at' } });

const AgentState = mongoose.model('AgentState', agentStateSchema);
module.exports = AgentState;