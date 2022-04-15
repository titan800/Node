const express = require("express");
const { json } = require("express/lib/response");
const app = express();
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const { MongoClient } = require("mongodb");
var ip = require('ip');
var cors = require("cors");
const mongoose = require("mongoose");
const Movies = require("./models/movies");
const Resolutions = require("./exports/resolutions");
const upload = require("express-fileupload");
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
const { v4: uuidv4 } = require("uuid");
app.use(bodyParser.json());
app.use(upload());
app.use(cors());
const multer = require("multer");

mongoose.connect("mongodb+srv://dan:Praytogod1@cluster0.tasg9.mongodb.net/Movies?retryWrites=true&w=majority");

ffmpeg.setFfmpegPath("C:/ffmpeg/bin/ffmpeg.exe");

ffmpeg.setFfprobePath("C:/ffmpeg/bin/ffprobe.exe");

ffmpeg.setFlvtoolPath("C:/flvtool");

app.use(express.static("public"));

function groupBy(list, keyGetter) {
  const map = new Map();
  list.forEach((item) => {
    const key = keyGetter(item);
    const collection = map.get(key);
    if (!collection) {
      map.set(key, [item]);
    } else {
      collection.push(item);
    }
  });
  return map;
}

app.post("/movies/upload/", async (req, res) => {
  console.log("request recieved");
  let uuid = uuidv4();
  let data = req.body;
  let uploaded;
  const entries = Object.entries(req.files).filter((e) => e[0] !== "Image");

  let dir = `./public/${uuid}`;

  // let uri = dir + "/poster/" + ImageName;
  // Image.mv(uri);
  let movieData = [];
  let Parentobj = {
    name: req.body.movie_name,
    Release: req.body.movie_rel,
    Rating: req.body.movie_rating,
    Director: req.body.movie_dir,
    genre1: req.body.genre1,
    genre2: req.body.genre2,
    genre3: req.body.genre3,
    genre4: req.body.genre4,
    genre5: req.body.genre5,
    region: req.body.region,
    Para: req.body.para,
    UID: uuid,
  };

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  const grouped = groupBy(entries, (file) => file[0].slice(-1));

  for (let i = 0; i < grouped.size; i++) {
    let index = i;
    let FilterGroup = grouped.get(String(index));
    let dir = `./public/${uuid}/${"obj" + index}/`;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
      fs.mkdirSync(dir + "poster");
      fs.mkdirSync(dir + "video");
    }

    FilterGroup.forEach((e, index) => {
      let obj = e;
      let fileName = obj[1].name;
      let fileNameIndex = obj[0];
      let file = obj[1];

      if (fileNameIndex.search("video") == -1) {
        let uri = dir + "poster/" + fileName;
        file.mv(uri);
      } else {
        let uri = dir + "video/" + fileName;
        file.mv(uri);
      }
    });
  }

  const testFolder = `./public/${uuid}/`;

  fs.readdir(testFolder, (err, files) => {
    files.forEach((file, index) => {
      let obj = {};
      const names = Object.entries(data);
      let name_data = names.filter(
        (e) => e[0].split("file_name")[1] == String(index)
      );
      fs.readdir(testFolder + file + "/poster/", (err, files) => {
        obj = {
          name: name_data[0][1],
          poster: testFolder + file + "/poster/" + files[0],
          video: testFolder + file + "/video/",
        };
      });

      let video_dir = testFolder + file + "/video/";

      fs.readdir(video_dir, (err, files) => {
        let FinalLoc = video_dir + files[0];

        ffmpeg.ffprobe(FinalLoc, (err, meta) => {
          if (err) {
            console.error(err);
          } else {
            // metadata should contain 'width', 'height' and 'display_aspect_ratio'
            let Videowidth = meta.streams[0].coded_height;
            Parentobj["Maxq"] = Videowidth;
            Parentobj["BaseVid"] = files[0];
            movieData.push(obj);
            let MaxResolution = [];
            Resolutions.forEach((e) => {
              let width = e.split("x")[1];

              if (width < Videowidth) {
                MaxResolution.push(e);
              }
            });

            MaxResolution.forEach((e, index) => {
              let width = e.split("x")[1];
              let ProcessedDir =
                video_dir +
                `${files[0].split(".")[0] + width}.${files[0].split(".")[1]}`;

              ffmpeg(FinalLoc)
                .output(ProcessedDir)
                .size(e)
                .on("error", function (err) {
                  console.log("An error occurred: " + err.message);
                })
                .on("progress", function (progress) {
                  console.log("... frames: " + progress.frames);
                })
                .on("end", function () {
                  console.log("Finished processing");
                  if (index == MaxResolution.length - 1) {
                    Parentobj["Videos"] = JSON.stringify(movieData);
                    if (fs.existsSync(`./public/${uuid}/thumbnail`) == false) {
                      fs.mkdirSync(`./public/${uuid}/thumbnail`, (err) => {
                        if (err) {
                          console.log(err);
                        }
                      });
                    }

                    let Image = req.files.Image;
                    let ImageName = req.files.Image.name;

                    let uri = `./public/${uuid}/thumbnail/` + ImageName;
                    Image.mv(uri);

                    Parentobj["Images"] = uri;
                    async function DataBaseCreate(params) {
                      const response = await Movies.create(Parentobj);
                      
                      uploaded = 1
                    }
                    if(uploaded !== 1){
                      DataBaseCreate();
                    }
                    
                  }
                })

                .run();
            });
          }
        });
      });
    });
  });
  res.status(200).json("Video Processed");
});

app.post("/file", function (req, res) {
  if (req.files == null) {
    res.status(400).json("no file uploaded");
  } else {
    let file = req.files.file;
    let fileName = req.files.file.name;
    file.mv("./public/uploads/" + fileName, async (err) => {
      console.log(err);
    });
    res.status(200).json("file uploaded");
  }
});

app.use(cors());

app.get("/",function (req,res) {
  res.json("running")
})

app.get("/video/stream/:id", function (req, res) {
  const range = req.headers.range;

  let DynamicVideoUrl = req.originalUrl.slice(1);
  const videoPath = "." + req.originalUrl.split("val=")[1];
  const videoSize = fs.statSync(videoPath).size;
  if (!range) {
    const head = {
      "Content-Length": videoSize,
      "Content-Type": "video/mp4",
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  } else {
    const CHUNK_SIZE = 5000000; // 1MB
    const start = Number(range.replace(/\D/g, ""));

    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
    // console.log(end)
    const contentLength = end - start + 1;
    const headers = {
      "Content-Range": `bytes ${start}-${end}/${videoSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": contentLength,
      "Content-Type": "video/mp4",
    };
    res.writeHead(206, headers);

    // create video read stream for this particular chunk
    const videoStream = fs.createReadStream(videoPath, { start, end });

    // Stream the video chunk to the client
    videoStream.pipe(res);
  }
});

app.get("/home-content", async function (req, res) {
  let limit;
  if (req.headers.location == "home_banner") {
    limit = 6;
  } else {
    limit = 24;
  }
  let model = await Movies.find({ Rating: 5 }).limit(limit);
  return res.json(model);
});
app.get("/specified-content", async function (req, res) {
  let InputGenre = req.headers.genre;
  let model = await Movies.find({ genre1: InputGenre }).limit(18);
  return res.json(model);
});
app.get("/movie-search", async function (req, res) {
  let InputName = req.headers.name;
  let model = await Movies.find({ name: { $regex: InputName } }).limit(3);
  return res.json(model);
});
app.get("/regional-content", async function (req, res) {
  let model = await Movies.find({ region: "india" }).limit(18);
  return res.json(model);
});
app.get("/all-content", async function (req, res) {
  let model = await Movies.find({});
  return res.json(model);
});
app.get("/genre-content", async function (req, res) {
  let head_genre1 = req.headers.genre1;
  let head_genre2 = req.headers.genre2;
  let head_genre3 = req.headers.genre3;
  let head_genre4 = req.headers.genre4;
  let head_genre5 = req.headers.genre5;
  // let Processed = { "$in": [] }
  let options =
    head_genre1 || head_genre2 || head_genre3 || head_genre4 || head_genre5;
  let model = await Movies.find()
    .or([
      {
        genre1: head_genre1,
      },
      {
        genre2: head_genre2,
      },
      {
        genre3: head_genre3,
      },
      {
        genre4: head_genre4,
      },
      {
        genre5: head_genre5,
      },
    ])
    .exec();
  return res.json(model);
});
app.get("/detail-content", async function (req, res) {
  let model = await Movies.findOne({ UID: req.headers.id });
  return res.json(model);
});
app.get("/db", function (req, res) {
  return res.json("db");
});

app.listen(process.env.PORT || 8000, function () {
  console.log("Listening on port 8000!");
  console.log(ip.address());
});
