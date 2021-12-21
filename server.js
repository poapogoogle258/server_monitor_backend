const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require('cors')

const send_message = require('./line_massage')

const app = express();
const api = require('./conrtrollers')
const httpServer = createServer(app);


//use json
app.use(cors())
app.use(express.json())
app.use(api)

//connect database 
const history_resource = require('./Model/history');
const mongoose = require('mongoose')
mongoose.connect('mongodb://localhost:27017/history_resource',{
    useNewUrlParser: true 
})

//create socket servers
const io = new Server(httpServer,{
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials:true
  }
})

var status_now_computer = {}
var haveSenderMessage = false


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

    //callback
    fn({
      status : status_now_computer.map(computer => {
        return {
          ...computer.status_last,
          'connected' : computer.connected
        }
      }),
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
          
        send_message(`host ${status_now_computer[key].status_last.host} Down...`)
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
  const monify_data = data_to_day.map(item => {
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


httpServer.listen(3000,() =>{
  console.log('Application is running on port 3000')
});









