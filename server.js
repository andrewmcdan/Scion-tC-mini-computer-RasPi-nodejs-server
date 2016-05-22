var i2c = require('i2c');
var fs = require('fs');
var dataObj = JSON.parse('{ "OBDIIdata": { "speed": 1, "tach": 2753 }, "HeatAC": { "fan": 0, "hotCool": 125, "dest": 0, "reCirc": false, "AC": false, "rearDef": false }, "Indicators": { "on": false, "off": false, "security": false, "volume": 15 }, "CarLights": { "colorRGB": { "r": 0, "g": 0, "b": 0, "a": 0 }, "lighting": { "fog": false, "groundLights": false, "groundBlinkers": false, "grill": false, "halos": false }, "pattern": 0}, "VSCTrac": { "Trac": false, "VSC": false }, "SystemStatus": { "volts": { "vehicle": 12, "v12": 12, "v5": 5, "v33": 3.3, "vBatt": 3.6 }, "modules": { "grill": 0, "groundLights": 1 } }, "AudioSystem":{ "MasterVol":15, "SubVol":30, "Source":0 } }');
fs.writeFile('dataObjFile',JSON.stringify(dataObj),function(err){console.log('data saved')});
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
        });
        //console.log('saved');
    },1000);
}
});
/////////////////////

var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var GPIO = require('onoff').Gpio;
var DueInt = new GPIO(17, 'in', 'rising');
var DueRTS = new GPIO(27, 'in', 'rising');
var RasPiToDueDataReq = new GPIO(22, 'out');
var DueReset = new GPIO(10,'out');

var temp5445 = 0;

server.listen(80);

// this handles the sending of files
app.get('/icon/', function (req, res) { res.sendFile(__dirname + '/icon.png');});
app.get('*', function (req, res) {
    res.setHeader("X-Dinosaur-Says:","RAWR"); // This is here only because it makes me smile...
    res.sendFile(__dirname + req.url);
});

var twoWire = new i2c(2/*i2cAddress of slave device*/, {device:'/dev/i2c-1'});
var testest = "hemlo ";

DueInt.watch(UpdateFromDue);
function DueUpdateHeatAC(){
    twoWire.write("3UUU"+JSON.stringify(dataObj.HeatAC.fan),function(err){});
    twoWire.write("4UUU"+JSON.stringify(dataObj.HeatAC.hotCool),function(err){});
    twoWire.write("5UUU"+JSON.stringify(dataObj.HeatAC.dest),function(err){});
    twoWire.write("6UUU"+JSON.stringify(dataObj.HeatAC.reCirc),function(err){});
    twoWire.write("7UUU"+JSON.stringify(dataObj.HeatAC.AC),function(err){});
    twoWire.write("8UUU"+JSON.stringify(dataObj.HeatAC.rearDef),function(err){});
}
function DueUpdateCarLights(){
    twoWire.write("cUUU"+JSON.stringify(dataObj.CarLights.colorRGB.r),function(err){});
    twoWire.write("dUUU"+JSON.stringify(dataObj.CarLights.colorRGB.g),function(err){});
    twoWire.write("eUUU"+JSON.stringify(dataObj.CarLights.colorRGB.b),function(err){});
    twoWire.write("gUUU"+JSON.stringify(dataObj.CarLights.lighting.fog),function(err){});
    twoWire.write("hUUU"+JSON.stringify(dataObj.CarLights.lighting.groundLights),function(err){});
    twoWire.write("jUUU"+JSON.stringify(dataObj.CarLights.lighting.groundBlinkers),function(err){});
    twoWire.write("iUUU"+JSON.stringify(dataObj.CarLights.lighting.grill),function(err){});
    twoWire.write("kUUU"+JSON.stringify(dataObj.CarLights.lighting.halos),function(err){});
    twoWire.write("qUUU"+JSON.stringify(dataObj.CarLights.pattern),function(err){});
}
function DueUpdateVSCTrac(){
    twoWire.write("lUUU"+JSON.stringify(dataObj.VSCTrac.Trac),function(err){});
    twoWire.write("mUUU"+JSON.stringify(dataObj.VSCTrac.VSC),function(err){});
}
function DueUpdateAudioStystem(){
    twoWire.write("nUUU"+JSON.stringify(dataObj.AudioSystem.MasterVol),function(err){});
    twoWire.write("oUUU"+JSON.stringify(dataObj.AudioSystem.SubVol),function(err){});
    twoWire.write("pUUU"+JSON.stringify(dataObj.AudioSystem.Source),function(err){});
}

function SendAllUpdatesToDue(){
    DueUpdateHeatAC();
    DueUpdateCarLights();
    DueUpdateVSCTrac();
    DueUpdateAudioStystem();
}

function UpdateFromDue(){
    twoWire.read(9,ProcessDataFromDue);
    RasPiToDueDataReq.write(temp5445,function(err){});
    temp5445 = temp5445==1?0:1;
    //SendAllUpdatesToDue();
}

function ProcessDataFromDue(err,res){
    var stringResponse = " ";
    stringResponse = String.fromCharCode.apply(null,res);
    console.log(stringResponse);
    if(stringResponse=="xxxxxxxxx"){
        SendAllUpdatesToDue();
    }
    if((stringResponse.substring(0,1)=="a")&&(stringResponse.substring(3)=="xxxxxx")){
        dataObj.OBDIIdata.speed=Number(stringResponse.substring(1,stringResponse.substring(2,3)=="x"?2:3));
        sendOBD();
    }
    if((stringResponse.substring(0,1)=="b")&&(stringResponse.substring(5)=="xxxx")){
        dataObj.OBDIIdata.tach=Number(stringResponse.substring(1,stringResponse.substring(4,5)=="x"?4:5));
        sendOBD();
    }
}

//setInterval(function(){sendOBD()},1000);
setInterval(function(){sendHeatAC()},500);
setInterval(function(){sendIndicators()},2000);

function sendOBD(){
    io.emit('OBD',dataObj.OBDIIdata);

    //test
    ////////////////////////
    //dataObj.OBDIIdata.tach+=123;
    //dataObj.OBDIIdata.speed+=1;
    //if(dataObj.OBDIIdata.speed>99){dataObj.OBDIIdata.speed=0;}
    //if(dataObj.OBDIIdata.tach>9999){dataObj.OBDIIdata.tach=0;}
    //////////////////////////
}

function sendLights(){
    // get states of everything from Arduino Due and update the dataObj
    // then send the new data to interface
    io.emit('LIGHTS',dataObj.CarLights);
    //console.log('updateLights');
}

function sendAudio(){
    // get states of everything from Arduino Due and update the dataObj
    // then send the new data to interface
    io.emit('AUDIO',dataObj.AudioSystem);
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
        DueUpdateHeatAC();
    });
    socket.on('lightingUpdate', function(obj) {
        dataObj.CarLights = obj;
        //console.log(dataObj.CarLights);
        sendLights();
        //send update to Arduino Due
        DueUpdateCarLights();
    });
    socket.on('VSCTrac', function(obj) {
        dataObj.VSCTrac = obj;
        //send update to Arduino Due
        DueUpdateVSCTrac();
    });
    socket.on('AudioSystem', function(obj) {
        dataObj.AudioSystem = obj;
        sendAudio();
        //send update to Arduino Due
        DueUpdateAudioStystem();
    });
    io.emit('INITIALIZE',dataObj); // sends current data to client when connection is made
    socket.on('getSystemStats', function(obj){
        // get the status of stuff, like voltages and what have you, from Due
        io.emit('SYSTEMSTATS',dataObj.SystemStatus);
    }); // sends current data to client when connection is made
    SendAllUpdatesToDue();
});

process.on('SIGINT', exit);
function exit() {
    DueInt.unexport();
    process.exit();
}
