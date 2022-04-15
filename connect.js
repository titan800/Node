const express = require("express");
const res = require("express/lib/response");
const app = express()
const {MongoClient} = require("mongodb")
const mongoose = require("mongoose")
const {test} = require("./models/data")
const {tob} = require("./models/data")

var cors = require('cors')
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())
console.log(test)
mongoose.connect("mongodb://localhost:27017/")



app.get("/search",async(req,res) => {
    const records = await test.find()
    console.log(records)
    res.json(records)
})

app.post("/db", async (req, res) => {
    const record = req.body
    const response = await test.create(record)
    const response1 = await tob.create(record)

    console.log(response)
    return res.status(200)
   });

app.listen(8000,() => {
    console.log("server running on port 8000")
})