var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
server.listen(8080);

// this handles the sending of files
app.get('/icon/', function (req, res) { res.sendFile(__dirname + '/icon.png');});
app.get('*', function (req, res) { res.sendFile(__dirname + req.url);});

var dataObj = JSON.parse('{"OBDIIdata":{"speed":1,"tach":2753},"HeatAC":{"fan":2,"hotCool":25,"dest":4,"reCirc":false,"AC":false,"rearDef":false},"Indicators":{"on":false,"off":false,"security":false,"volume":15},"CarLights":{"colorRGB":{"r":0,"g":0,"b":0,"a":0},"fog":false},"VSCTrac":{"Trac":false,"VSC":false}}');

setInterval(function(){sendOBD()},1000);
setInterval(function(){updateHeatAC()},500);
setInterval(function(){updateIndicators()},2000);

function sendOBD(){
  io.emit('OBD',dataObj.OBDIIdata);

  //test
  ////////////////////////
  dataObj.OBDIIdata.tach+=123;
  dataObj.OBDIIdata.speed+=1;
  if(dataObj.OBDIIdata.speed>99){dataObj.OBDIIdata.speed=0;}
  if(dataObj.OBDIIdata.tach>9999){dataObj.OBDIIdata.tach=0;}
  //////////////////////////
}

function updateLights(){
  // get states of everything from Arduino Due and update the dataObj
  // then send the new data to interface
  io.emit('LIGHTS',dataObj.CarLights);
  //console.log('updateLights');
}

function updateHeatAC(){
  // get states of everything from Arduino Due and update the dataObj
  // then send the new data to interface
  io.emit('HEATAC',dataObj.HeatAC);
  //console.log('updateHeatAC');
}

function updateIndicators(){
  io.emit('INDICATOR',dataObj.Indicators);

  // test
  //////////////////////////
  dataObj.Indicators.security = dataObj.Indicators.security?false:true;
  //////////////////////////
}

io.on('connection',function(socket){
  socket.on('HeatACUpdate', function (obj) {
    dataObj.HeatAC = obj;
    // send new state to Arduino Due and wait for it to complete update.
    updateHeatAC();
    //console.log(dataObj.HeatAC);
    //send update to Arduino Due
  });
  socket.on('lightingUpdate', function(obj) {
    dataObj.CarLights = obj;
    updateLights();
  });
});

// psuedo code
// on(airbag_and_security_Light_State_Change){send_Update_For_Airbag_security_Indicators}
//
// Arduino Due will be conencted via I2C
// need to send updates to Arduino Due
// need to poll Arduino Due for updates
//
/*
{
   "OBDIIdata":{
      "speed":1,
      "tach":2753
   },
   "HeatAC":{
      "fan":2,
      "hotCool":25,
      "dest":4,
      "reCirc":false,
      "AC":false,
      "rearDef":false
   },
   "Indicators":{
      "on":false,
      "off":false,
      "security":false,
      "volume":15
   },
   "CarLightsColor":{
      "r":0,
      "g":0,
      "b":0
   },
   "VSCTrac":{
      "Trac":false,
      "VSC":false
   }
}
*/
