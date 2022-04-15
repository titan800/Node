const mongoose = require("mongoose")

const Movies = new mongoose.Schema({
    name:{type: String},
    Release:{type:Date},
    Rating:{type:Number},
    Director:{type:String},
    Images:{type:String},
    Videos:{type:String},
    Maxq:{type:String},
    UID:{type:String},
    BaseVid:{type:String},
    Para:{type:String},
    genre1:{type:String},
    genre2:{type:String},
    genre3:{type:String},
    genre4:{type:String},
    genre5:{type:String},
    region:{type:String}

})

const model = mongoose.model("Movies",Movies)


module.exports = model