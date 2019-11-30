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
 * @returns void
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
	var body = 'Error while checking site: ' + site.name + ":\n\n";
	
	//Remove stats
	delete stats.response;
	delete stats.request;
	
	//Loop through stats
	Object.keys(stats).forEach(function(key){
		body += key + ': ' + stats[key] + "\n";
	});
	
	body += "\nThanks\nYour site monitor";

	// Send out the pushover message
	var p = new Push({
	  user: this.baseConfig.pushover.usertoken,
	  token: this.baseConfig.pushover.apptoken
	});

	var msg = {
	  message: body,
	  title: "Node Site Monitor",
	  sound: 'magic',
	  device: this.config.devicename,
	  priority: 1
	}

	p.send(msg, function(err, result) {
		if (err) { return console.error(err); }
		console.log( result )
	});
}
