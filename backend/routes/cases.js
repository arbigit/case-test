const express = require("express");
const router = express.Router();
const Case = require("../models/Case");

// Get all cases
router.get("/", async (req, res) => {
  try {
    const cases = await Case.find().sort({ dateRecorded: -1 });
    res.json(cases);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new case
router.post("/", async (req, res) => {
  const newCase = new Case(req.body);
  try {
    const savedCase = await newCase.save();
    res.status(201).json(savedCase);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a case
router.put("/:id", async (req, res) => {
  try {
    const updatedCase = await Case.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updatedCase);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a case
router.delete("/:id", async (req, res) => {
  try {
    await Case.findByIdAndDelete(req.params.id);
    res.json({ message: "Case deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
