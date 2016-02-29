var exec = require('child_process').exec;
var request = require('request');

(function(){

  var control = this;
  this.transmission = null;
  this.connectedToVpn = false;
  this.status = 0;
  this.connecting = false;
  this.closing = false;

  this.checkVpnConnection = function(callback) {

    exec('ifconfig | grep ppp0', function(err,stdout,stderr){
      var connected = false;

      if ( stdout !== "" ) {
        connected = true;
      } else {
        connected = false;
      }

      control.connectedToVpn = connected;

      callback(connected);

    });

  };

  this.connectToVpn = function() {

    exec('nmcli con up VPN');

  };

  this.disconnectFromVpn = function() {

    exec('nmcli con down VPN');

  };

  this.checkData = function() {

    if (! control.connectedToVpn ) {
      console.log("VPN isnt connected, dont bother checking line");
      return false;
    }

    console.log('Checking data line');


    request('http://www.google.com/', function(err,res,body){

      if ( err || res.statusCode !== 200 ) {
        console.log('No ping response, VPN is dead');
        control.disconnectFromVpn();
        return false;
      } else {
        console.log("VPN data line is alive");
      }

    });


  };

  this.launchTransmission = function() {

    control.transmission = exec('transmission-gtk',function(err,stdo,stde){});
    control.transmission.on('exit', function(){
      console.log("Transmission died...");
      control.transmission = null;
    });

  };

  this.main = function() {

    this.checkVpnConnection(function(status){
      if ( status ) {

        if (! transmission ) {
          //Fire up transmission.
          console.log('Firing up transmission-gtk.');
          control.launchTransmission();

        }

      } else {

        //VPN not connected.
        //If transmission is running, kill it immediately.
        if ( control.transmission ) {
          if (! control.closing ) {
            control.closing = true;
            control.transmission.kill('SIGINT');
            exec('killall -s KILL transmission-gtk');
            control.transmission = null;
            console.log("No VPN and transmission is running. Kill it.");
          }

          setTimeout(function(){
            control.closing = false;
          },10000);
        }

        //Request a reconnect.
        if (! control.connecting ) {
          control.connecting = true;
          console.log("Attempting reconnection on VPN");
          control.connectToVpn();
          setTimeout(function(){
            control.connecting = false;
          },10000);
        }


      }
    });


  };

  setInterval(function(){

    control.main();

  },100);

  setInterval(function(){

    control.checkData();

  },(1000 * 60) * 5);

  this.connectToVpn();

})();
