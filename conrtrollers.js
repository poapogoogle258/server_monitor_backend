const express = require('express');
const router = express.Router();

const history_resource = require('./Model/history');
const mongoose = require('mongoose')
mongoose.connect('mongodb://localhost:27017/history_resource',{
    useNewUrlParser: true 
})


// api _
router.get(`/api/status`,async (req,res) => {
    res.json(Object.values(status_now_computer).map(status => {
      return {
        ...status.status_last,
        'connected' : (status.socket === undefined)? false : status.socket.connected
      }
    }))
  })
  
router.get(`/api/history`,async (req,res) => {
    const history = await history_resource.find()
    res.json(history)
})
  
//api get historys
router.get(`/api/history/:file`,async function(req , res){
const {file} = req.params

const {existsSync} = require('fs')
const check_exis_file = await existsSync(`historys/${file}.json`)

if(check_exis_file){
    const { readFile } = require('fs/promises');
    const read_history = await readFile(`historys/${file}.json`)
    const data = JSON.parse(read_history)
    res.json(data)
}
else{
    return res.status(500).json({
    status: "Not Found"
    });
}
})


module.exports = router;

