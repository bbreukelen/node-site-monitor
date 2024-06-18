var events = require('events');
var util = require('util');
var http = require('http');
var https = require('https');
var Url = require('url');

/** 
 * Site instance
 *
 * @param config Object the site configuration
 * 
 * @returns Site
 */
function Site(config, id) {
	events.EventEmitter.call(this);

	//The ID
	this.id = id;

	//The id of the client
	this.config = config;

	//The name
	this.name = config.name;

	//Type
	this.type = config.type;
	
	//Url
	this.url = config.url;
	
	//Content
	this.content = config.content !== undefined && config.content.length > 0 ? config.content : null;
	
	//Interval
	this.interval = config.interval;
	
	//Timeout
	this.timeout = config.timeout;

	//Downtime
	this.downtime = config.downtime || [];

	//Last run
	this.lastRun = 0;
	
	//Is down
	this.down = false;
	
	//Previous down
	this.previousDown = true;

	//Last down notification
	this.lastDownNotification = 0;
}

//Inherit event emitter
util.inherits(Site, events.EventEmitter);

//Export
module.exports = Site;

/**
 * If the site is currently down or not
 *
 * @returns void
 */
Site.prototype.wasDown = function() {
	return this.previousDown;
}

/**
 * If the site is currently down or not
 *
 * @returns boolean
 */
Site.prototype.isDown = function() {
	return this.down;
}

/**
 * Requires a check or not
 *
 * @returns boolean
 */
Site.prototype.requiresCheck = function() {
	const now = new Date();
	if (this.downtime.includes(now.getHours())) {
		return false;
	} else if ((this.lastRun + (this.interval * 1000)) < now.getTime()) {
		return true;
	} else {
		return false;
	}
}

/**
 * Needs down reminder
 *
 * @returns boolean
 */
Site.prototype.requiresReminder = function() {
	const reminderNeeded = this.down && new Date().getTime() - this.lastDownNotification > 1000 * 60 * 60 * 1;
	if (reminderNeeded) {
		// Reset
		this.lastDownNotification = new Date().getTime();
	}
	return reminderNeeded;
}


/**
 * Check
 *
 * @returns void
 */
Site.prototype.check = function(callback) {
	//Make the request and then decide if the result was success or failure
	this.request(function(stats){
		//Set the preview down status
		this.previousDown = this.down ? true : false;

		if (stats.connectFailed === true || stats.connectTimeout === true) {
			//Connection failed
			this.down = true;
			if (this.lastDownNotification === 0) { this.lastDownNotification = new Date().getTime(); }
			stats.notes = 'Could not connect to server';

		} else if (stats.statusCode !== 304 && (stats.statusCode < 200 || stats.statusCode > 299)) {
			//Not a good status code
			this.down = true;
			if (this.lastDownNotification === 0) { this.lastDownNotification = new Date().getTime(); }
			stats.notes = `Unexpected status code ${stats.statusCode} was returned`;
			
		} else if (stats.contentMatched === false) {
			//Content didn't match
			this.down = true;
			if (this.lastDownNotification === 0) { this.lastDownNotification = new Date().getTime(); }
			
		} else {
			//Up
			this.down = false;
			this.lastDownNotification = 0;
		}

		//Callback
		callback(stats);
	}.bind(this));
}


/**
 * Send an error message to the user
 *
 * @param message string the message to show to the user
 * 
 * @returns void
 */
Site.prototype.request = function(callback) {
	
	//Set the last run
	this.lastRun = new Date().getTime();
	
	//Keep the request meta data with the request
	var stats = {
		startTime: new Date().getTime(),
		connectTime: 0,
		responseTime: 0,
		connectTimeout: false,
		connectFailed: false,
		contentMatched: null,
		request: null,
		response: null,
		body: null,
		statusCode: null,
		notes: ''
	};

	//Replace variables in the url
  var url = this.url.replace(/\[EPOCH\]/g, Math.floor(new Date().getTime() / 1000)); // [EPOCH] to epoch time in seconds
	
	//Create the request
	url = Url.parse(url);
	var httpModule = http;
	if (url.protocol.substr(0,5) === "https") {
		httpModule = https;
		url.port = url.port ? url.port : 443;
	} else {
		url.port = url.port ? url.port : 80;
	}
	
	var request = httpModule.request({
		port:    url.port,
		host:    url.hostname,
		path:    url.path,
		headers: {
			'User-Agent': 'node-site-monitor/0.1.0',
		},
		method:  'GET',
		agent:   false

	}, function ( response ) {

		//Response
		stats.response = response;
		
		//Status code
		stats.statusCode = response.statusCode;
		
		//Set the response time
		stats.connectTime = (new Date().getTime() - stats.startTime) / 1000;
		
		//Clear the request timeout
		clearTimeout(connectTimeout);
		request.connectTimeout = null;

		//Collect the body
		var body = '';
		response.on('data', function (chunk) {
			body += chunk.toString('utf8');
		});
		
		//Respond with whole body
		response.on('end', function () {
			stats.body = body;
			stats.responseTime = (new Date().getTime() - stats.startTime) / 1000;
			
			//Check the content matched
			if (this.content !== null) {
				if (typeof this.content === 'object') {
					// Must match all
					this.notes = '';
					let notMatching = this.content.length;
					this.content.forEach(toMatch => {
						if (stats.body.indexOf(toMatch) >= 0) {
							notMatching--;
						} else {
							stats.notes += toMatch + ' not found in body. ';
						}
					});
					stats.contentMatched = notMatching === 0;
				} else {
					if (stats.body.indexOf(this.content) >= 0) {
						stats.contentMatched = true;
					} else {
						stats.contentMatched = false;
						stats.notes = 'The site content did not contain the string: "' + this.content + '"';
					}
				}
			}
			
			callback(stats);
		}.bind(this));
		
	}.bind(this));
	
	stats.request = request;

	//Create the response timeout timer
	var connectTimeout = setTimeout(function() {
		request.abort();
		stats.connectTimeout = true;
		stats.connectFailed = true;
		callback(stats);
	}.bind(this), this.timeout * 1000);
	
	//Attach error handlers
	request.on('error', function(err) {
		//Connection error
		stats.connectFailed = true;
		clearTimeout(connectTimeout);
		callback(stats);
	});
	
	//End the request and start receiving the response
	request.end();
};
