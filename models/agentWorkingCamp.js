const mongoose = require('mongoose');

const agentCampSchema = new mongoose.Schema({
    workID: Number,
    userName: String,
    fullName: String,
    CampName: String,
    CampU: String,
    startDate: String,
    endDate: String,
    Deconflicted:Number,
    leadsProspected: Number,
    goodLeads: Number,
    website: Number,
    email: Number,
    linkedin: Number,
    fb: Number,
    Skype: Number,
    durationTime: String,
    durationHr: Number,
    durationMn: Number,
    durationSc: Number,
    onGoing: Boolean,
    comments: String,
    Report: String,
    UpdatedBy: String
}, { timestamps: { createdAt: 'created_at' } });

const AgentCamp = mongoose.model('AgentCamp', agentCampSchema);
module.exports = AgentCamp;