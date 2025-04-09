const mongoose = require("mongoose");

const CaseSchema = new mongoose.Schema({
  dateRecorded: {
    type: Date,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  scores: {
    margins: {
      type: Number,
      required: true,
      min: 0,
      max: 2,
    },
    contacts: {
      type: Number,
      required: true,
      min: 0,
      max: 2,
    },
    occlusion: {
      type: Number,
      required: true,
      min: 0,
      max: 2,
    },
    color: {
      type: Number,
      required: true,
      min: 0,
      max: 2,
    },
    contour: {
      type: Number,
      required: true,
      min: 0,
      max: 2,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Case", CaseSchema);
