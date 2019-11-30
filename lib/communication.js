module.exports = {
	Base: require('./communication/base'),
	Mqtt: require('./communication/mqtt'),
	Pushover: require('./communication/pushover'),
	findByType: function(type){
		if (type === "mqtt") {
			return this.Mqtt;
		} else if (type === "pushover") {
			return this.Pushover;
		} else {
			return this.Base;
		}
	}
};
