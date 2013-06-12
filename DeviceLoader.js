// popluates and loads devices from ifixit.com into deviceContainer
var DeviceLoader = new Class({
	initialize: function(){
	},
	_downloadImage: function(data, callback, consoleOutput){
		if(data.image.length == 0){
			callback(null);
			return;
		}
		var image = new Element("img",{
			src: data.image.text + ".thumbnail",
			events: {
				load: function(){
					callback(image);
				}
			}
		});



	},
	// callback has signature function( image )
	// image is the loaded image Element
	loadImage: function(topic, callback, consoleOutput){

		var topicRequest = new Request.JSONP({
			url: DeviceLoader.URL_topicRoot + "/" + topic,
			method: 'get',
			callbackKey: "jsonp",
			onFailure: function(xhr){ 
				if(consoleOutput)
					console.log('failed to complete Ajax request -- ' + xhr.status + ": " + xhr.statusText);
			}.bind(this),
			onException: function(headerName, value){
				if(consoleOutput)
					console.log('exception with header -- ' + headerName + ': ' + value);
			}.bind(this),
			onComplete: function(data){
				DeviceLoader.prototype._downloadImage.bind(this)(data, callback, consoleOutput);
			}.bind(this),
			onTimeout: function(){
				if(consoleOutput)
					console.log('timeout');
			}.bind(this),
			onRequest: function(url, script){
				if(consoleOutput)
					console.log('sending: ' + url);
			}.bind(this),
			onCancel: function(){
				if(consoleOutput)
					console.log('canceled');
			}.bind(this)
		});
		topicRequest.send();

	},
	getDevices: function(start, count, callback, consoleOutput){
		var topicRequest = new Request.JSONP({
			url: DeviceLoader.URL_topicsRoot,
			data: {
				offset: start,
				limit: count
			},
			method: 'get',
			callbackKey: "jsonp",
			onFailure: function(xhr){ 
				if(consoleOutput)
					console.log('failed to complete Ajax request -- ' + xhr.status + ": " + xhr.statusText);
			}.bind(this),
			onException: function(headerName, value){
				if(consoleOutput)
					console.log('exception with header -- ' + headerName + ': ' + value);
			}.bind(this),
			onComplete: function(data){
				var devices = [];
				for(var i = 0; i < data.length; i++){
					var options = data[i];
					devices.push( new Device(options) );
				}
				callback(devices);
			}.bind(this),
			onTimeout: function(){
				if(consoleOutput)
					console.log('timeout');
			}.bind(this),
			onRequest: function(url, script){
				if(consoleOutput)
					console.log('sending: ' + url);
			}.bind(this),
			onCancel: function(){
				if(consoleOutput)
					console.log('canceled');
			}.bind(this)
		});
		topicRequest.send();
	},
	getTotalDevices: function(callback){
		var v = function(devices){
			// still haven't found end of list
			if(this.breakIndex == -1){
				// found end of list
				if(devices.length == 0){
					this.breakIndex = this.lastIndex;
					this.step = (this.breakIndex + 1)/4;

					if(this.breakIndex < 2){
						this.callback(this.breakIndex);
					}
					else{
						this.lastIndex += this.dir * this.step;
						this.loader.getDevices(this.lastIndex, 1, v.bind(this), this.log);
					}
				}
				else{
					this.lastIndex = Math.pow(2, this.power++) - 1;
					this.loader.getDevices( this.lastIndex, 1, v.bind(this), this.log);
				}
			}
			else{
				if(this.step != 1){
					this.dir = devices.length != 0? 1 : -1;
					this.lastIndex += this.dir * this.step;
					this.step /= 2;
					this.loader.getDevices(this.lastIndex, 1, v.bind(this), this.log);
				}
				else{
					this.lastIndex += this.dir;
					this.loader.getDevices(this.lastIndex, 1, function(devices){
						// if exists
						if( devices.length != 0 )
							this.callback(this.lastIndex + 1);
						else
							this.callback(this.lastIndex);
					}.bind(this),
					this.log);
				}
			}
		}
		var data = {
			callback: callback,
			dir: -1,
			lastIndex: 0,
			breakIndex: -1,
			step: -1,
			power: 1,
			loader: this,
			log: false
		};
		this.getDevices(data.lastIndex,1,v.bind(data),data.log);
	}
});
DeviceLoader.URL_topicsRoot = "http://www.ifixit.com/api/1.0/topics";
DeviceLoader.URL_topicRoot = "http://www.ifixit.com/api/1.0/topic";
DeviceLoader.jsonp = "callback";
