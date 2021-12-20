const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");


const app = express();
const httpServer = createServer(app);
const cors = require('cors')


//use json
app.use(cors())
app.use(express.json())

const io = new Server(httpServer,{
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"]
  }
})

var status_now_computer = {}

var haveSenderMessage = false


const mongoose = require('mongoose')
const history_resource = require('./Model/history');


//connect database 
mongoose.connect('mongodb://localhost:27017/history_resource',{
    useNewUrlParser: true 
})


//send
const send_message = (message) => {
  var axios = require('axios');
  var qs = require('qs');
  var data = qs.stringify({
    'message': message 
  });
  var config = {
    method: 'post',
    url: 'https://notify-api.line.me/api/notify',
    headers: { 
      'Authorization': 'Bearer B6yPj7gOCjsVuhn9MhZjbYgqwwcnM3AxrQRhDtt3MvU', 
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data : data
  };

  axios(config)
  .then(function (response) {
    console.log(JSON.stringify(response.data));
  })
  .catch(function (error) {
    console.log(error);
  });

  console.log('sended message')
}


// api _
app.get(`/api/status`,async (req,res) => {
  res.json(Object.values(status_now_computer).map(status => {
    return {
      ...status.status_last,
      'connected' : (status.socket === undefined)? false : status.socket.connected
    }
  }))
})

app.get(`/api/history`,async (req,res) => {
  const history = await history_resource.find()
  res.json(history)
})

//api get historys
app.get(`/api/history/:file`,async function(req , res){
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

io.on("connection", async (socket) => {  
  socket.on('send_status', function(playload){
    
    status_now_computer[playload.host] = {
      'status_last' : playload,
      'connected' : socket.connected,
      'socket' : socket,
      'sender_message' : (!haveSenderMessage)? true : 
      status_now_computer.hasOwnProperty(playload.host)? status_now_computer[playload.host].sender_message : false
    }
    
    if(!haveSenderMessage){
      socket.emit('assign_sender',{})
      haveSenderMessage = true
    }

    const new_history = new history_resource(playload)
    new_history.save() 
    io.to("status").emit('loging',{...playload, 'connected' : socket.connected})
  })
  
  socket.on('listen',async function(name ,fn){

    const data = await history_resource.find()

    const status_dits = {}
    for (let key in status_now_computer){
      status_dits[key] = status_now_computer[key].status_last
      status_dits[key].connected = (status_now_computer[key].socket === undefined)? false : status_now_computer[key].socket.connected
    }

    //callback
    fn({
      status : status_dits,
      history : data
    })

    socket.join('status')
  })

  socket.on("disconnect", () => {
    for (let key in status_now_computer){
      if(!status_now_computer[key].socket.connected && status_now_computer[key].connected){

        //check new sender
        if(status_now_computer[key].sender_message){
          status_now_computer[key].sender_message = false
          haveSenderMessage = false
          for(const key_host in status_now_computer){
            if(status_now_computer[key_host].socket.connected){
              status_now_computer[key_host].sender_message = true
              status_now_computer[key_host].socket.emit('assign_sender',{})
              haveSenderMessage = true
              break
            }
          }
        }

        const computer_disconnect = {
          'host' : status_now_computer[key].status_last.host, 
          'cpu' : 0,
          'memory': 0,
          'time' : Date.now(),
          'node_service': [],
          'nginx' : 'stop',
          'connected' : status_now_computer[key].socket.connected
        }
        const save_story = {
          'host' : status_now_computer[key].status_last.host, 
          'cpu' : 0,
          'memory': 0,
          'time' : Date.now(),
          'node_service': [],
          'nginx' : false,
        }
        const new_history = new history_resource(save_story)
        new_history.save()

        io.to("status").emit('loging',computer_disconnect)
          
          // send_message(`host ${status_now_computer[key].status_last.host} Down...`)
      }
    }
  });
});


const cron = require("node-cron");

// dump_data_to_jsonfile
cron.schedule('50 59 23 * * *',async function(){
  const { writeFile } = require('fs/promises');

  const today = new Date().toISOString().slice(0, 10)
  const data_to_day = await history_resource.find()
  const monify_data = await data_to_day.map(item => {
    return {
      host: item.host,
      cpu: item.cpu,
      memory: item.memory,  
      node_service: item.node_service,
      nginx: item.nginx,
      time: item.time,
    }
  }).sort((a,b) => a.time < b.time)

  await writeFile(`historys/${today}.json`,JSON.stringify(monify_data))
  
  console.log(`clear data to day ${today}`)
})


httpServer.listen(3000,async () =>{
  console.log('Application is running on port 3000')
  // console.log('checking status computer')
});









