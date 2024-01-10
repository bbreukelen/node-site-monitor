var events = require('events');
var util = require('util');
var Push = require('pushover-notifications');

/** 
 * Base communication
 *
 * @param config Object the configuration
 * 
 * @returns Site
 */
function PushoverCommunication(user, config, baseConfig) {
	events.EventEmitter.call(this);
	
	//User
	this.user = user;
	
	//The config
	this.config = config;
	
	//The base config
	this.baseConfig = baseConfig;

}

//Inherit event emitter
util.inherits(PushoverCommunication, events.EventEmitter);

//Export
module.exports = PushoverCommunication;
					
/**
 * Can send
 *
 * @returns void
 */
PushoverCommunication.prototype.toArray = function() {
	return {user: this.user, config: this.config};
}
					
/**
 * Can send
 *
 * @returns boolean
 */
PushoverCommunication.prototype.isAllowed = function() {
	return true;
}

/**
 * Log success
 *
 * @returns void
 */
PushoverCommunication.prototype.send = function(up_down, site, stats, callback) {
	// send a pushover message
  var down = up_down === "down";
	var title;
	if (down) {
		var title = 'Service down: ' + site.name;
	} else {
		var title = 'Service up: ' + site.name;
	}
	
	//Remove stats
	delete stats.response;
	delete stats.request;
	
	//Loop through stats
  var body = "";
	Object.keys(stats).forEach(function(key){
		if (key === "body") return;
		body += key + ': ' + stats[key] + "\n";
	});

	// Send out the pushover message
	var p = new Push({
	  user: this.baseConfig.pushover[this.config.account].usertoken,
	  token: this.baseConfig.pushover[this.config.account].apptoken
	});

	var msg = {
	  message: body,
	  title: title,
	  //sound: 'magic',
	  device: this.config.devicename,
	  priority: down ? 1 : 0,
	  sound: down ? 'echo' : 'pushover'
	}

	p.send(msg, function(err, result) {
		if (err) { return console.error(err); }
		console.log( result )
	});
}
