const mongoose = require("mongoose")

const TestSchema = new mongoose.Schema({
    name:{type: String}
})
const TestSchema2 = new mongoose.Schema({
    name:{type: String}
})
const model = mongoose.model("test",TestSchema)
const model1 = mongoose.model("tob",TestSchema2)

module.exports = {test: model, tob : model1}