
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const app = express();


app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine','ejs');

const mongoURI = 
'mongodb://<dbuser>:<dbpassword>@ds######.mlab.com:#####/random'

const conn = mongoose.createConnection(mongoURI);

let gfs;

conn.once('open',()=>{
    gfs = Grid(conn.db,mongoose.mongo);
    gfs.collection('uploads');
})

const storage = new GridFsStorage({
    url: mongoURI ,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
    }
  });


const upload = multer({storage});

app.get('/',(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        if(!files || files.length === 0){
            res.render('index',{files:false})
        }
        else{
            files.map(file => {
                if(file.contentType === 'image/jpeg' || file.contentType === 'image/jpg'){
                    file.isImage = true;
                }
                else{
                    file.isImage = false;
                }
            })
            res.render('index',{files:files});
        }
    })

})

app.post('/upload',upload.single('file'),(req,res)=>{
     //res.json({file:req.file});
     res.redirect('/');
})

app.get('/files',(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        if(!files || files.length === 0){
            return res.status(404).json({
                err: 'No files found'
            });
        }
        return res.json(files);
    })
})


app.get('/files/:filename',(req,res)=>{
    gfs.files.findOne({filename:req.params.filename},(err,file)=>{
        if(!file || file.length === 0){
            return res.status(404).json({
                err: 'No file found'
            })
        }
        return res.json(file);
    })
})



app.get('/image/:filename',(req,res)=>{
    gfs.files.findOne({filename:req.params.filename},(err,file)=>{
        if(!file || file.length === 0){
            return res.status(404).json({
                err: 'No file found'
            })
        }
       if(file.contentType === 'image/jpg' || file.contentType === 'image/jpeg'){
           const readstream = gfs.createReadStream(file.filename)
           readstream.pipe(res);
       }
       else{
           res.status(404).json({
               err: 'Not found in database'
           })
       }
    })
})


app.delete('/files/:id',(req,res)=>{
    gfs.remove({_id: req.params.id,root: 'uploads'},(err,gridStore)=>{
            if(err)
             {
                  return res.status(404).json({err:err});
             }
            res.redirect('/');  
    })
})


app.listen('5000',()=>{
    console.log('Working on port 5000');
});