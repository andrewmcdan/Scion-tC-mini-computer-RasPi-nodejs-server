var i2c = require('i2c');
var fs = require('fs');
var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
server.listen(80);

// this handles the sending of files
app.get('/icon/', function (req, res) { res.sendFile(__dirname + '/icon.png');});
app.get('*', function (req, res) {
    res.setHeader("X-Dinosaur-Says:","RAWR"); // This is here only because it makes me smile...
    res.sendFile(__dirname + req.url);
 });

var twoWire = new i2c(2/*i2cAddress of slave device*/, {device:'/dev/i2c-1'});
var testest = "hemlo ";

setInterval(function(){
    twoWire.write(testest/*[72,101,108,108,111,76]*/,function(err){});
    twoWire.read(11,function(err,res){
        //console.log(String.fromCharCode.apply(String,res));
    });
},500);

//var dataObj = JSON.parse('{"OBDIIdata":{"speed":1,"tach":2753},"HeatAC":{"fan":0,"hotCool":125,"dest":0,"reCirc":false,"AC":false,"rearDef":false},"Indicators":{"on":false,"off":false,"security":false,"volume":15},"CarLights":{"colorRGB":{"r":0,"g":0,"b":0,"a":0},"lighting":{"fog":false,"groundLights":false,"groundBlinkers":false,"grill":false,"halos":false}},"VSCTrac":{"Trac":false,"VSC":false},"SystemStatus":{"volts":{"vehicle":12,"v12":12,"v5":5,"v3.3":3.3,"vBatt":3.6},"modules":{"grill":0,"groundLights":1}}}');
//fs.writeFile('dataObjFile',JSON.stringify(dataObj),function(err){console.log('data saved')});

//////////////////
//
// Here we read the 'dataObjFile' file and store it into the object 'dataObj'
//
fs.readFile('dataObjFile', function(err, data){
    if (!err) {
        dataObj = JSON.parse(data); // store data read from file into global object
        setInterval(function(){  // every 5 seconds store the global object 'dataObj' in file
        // this setTimer function needs to be rewritten so
        // that writing to the file only happens when something changes
        fs.writeFile('dataObjFile',JSON.stringify(dataObj),function(err){
            //if(err){
            //console.log('write error');
            //console.log(err);
            //}
        });
        //console.log('saved');
    },5000);
}
});
/////////////////////

setInterval(function(){sendOBD()},1000);
setInterval(function(){sendHeatAC()},500);
setInterval(function(){sendIndicators()},2000);

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

function sendLights(){
    // get states of everything from Arduino Due and update the dataObj
    // then send the new data to interface
    io.emit('LIGHTS',dataObj.CarLights);
    //console.log('updateLights');
}

function sendHeatAC(){
    // get states of everything from Arduino Due and update the dataObj
    // then send the new data to interface
    io.emit('HEATAC',dataObj.HeatAC);
    //console.log('updateHeatAC');
}

function sendIndicators(){
    io.emit('INDICATOR',dataObj.Indicators);

    // test
    //////////////////////////
    dataObj.Indicators.security = dataObj.Indicators.security?false:true;
    //////////////////////////
    //console.log('updateIndicators');
}

io.on('connection',function(socket){
    socket.on('HeatACUpdate', function (obj) {
        dataObj.HeatAC = obj;
        // send new state to Arduino Due and wait for it to complete update.
        sendHeatAC();
        //console.log(dataObj.HeatAC);
        //send update to Arduino Due
    });
    socket.on('lightingUpdate', function(obj) {
        dataObj.CarLights = obj;
        //console.log(dataObj.CarLights);
        sendLights();
        //send update to Arduino Due
    });
    io.emit('INITIALIZE',dataObj); // sends current data to client when connection is made
    socket.on('getSystemStats', function(obj){
        // get the status of stufflike voltages and what have you from Due
        io.emit('SYSTEMSTATS',dataObj.SystemStatus);
    }); // sends current data to client when connection is made
});

// psuedo code
// on(airbag_and_security_Light_State_Change){send_Update_For_Airbag_security_Indicators}
//
// Arduino Due will be conencted via I2C
// need to send updates to Arduino Due
// need to poll Arduino Due for updates
//
