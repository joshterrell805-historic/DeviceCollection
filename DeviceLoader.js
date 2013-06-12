
// popluates and loads devices from ifixit.com into deviceContainer
var DeviceLoader = new Class({
	initialize: function(){
		this._getTotalDevices();
	},
	consoleoutput: false,
	devices: [],
	totalDevices: null,
	// returns undefined if no device
	_getDevice: function(indexOrTopic){
		if(typeof indexOrTopic == "number"){
			return this.devices[indexOrTopic];
		}else if(typeof indexOrTopic == "string"){
			for(var i = 0; i < devices.length; i++)
				if(this.devices[i] !== undefined && this.devices[i].options.topic == indexOrTopic)
					return this.devices[i];
		}
	},
	_downloadImage: function(data, callback){
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
	_getIndex: function(device){
		for(var i = 0; i < this.devices.length; i++){
			if(this.devices[i] !== undefined && this.devices[i].equals(device))
				return i;
		}
	},
	
	// returns true if device was replaced, else false
	replaceDevice: function(device){
		index = this._getIndex(device);

		if(index !== undefined){
			this.devices[index] = device;
			return true;
		}
		return false;
	},
	// callback has signature function( image )
	// image is the loaded image Element
	loadImage: function(index, callback){

		var device = this._getDevice(index);
		var topic = null;
		if(device !== undefined){
			if(device.options.image !== undefined){
				callback(device.options.image);
				return;
			}
			topic = device.options.topic;
		}else{
			console.log("Error: DeviceLoader.getImage -- index is invalid. Index: " + index);
			callback(null);
			return;
		}

		var topicRequest = new Request.JSONP({
			url: DeviceLoader.URL_topicRoot + "/" + topic,
			method: 'get',
			callbackKey: "jsonp",
			onFailure: function(xhr){ 
				if(this.consoleOutput)
					console.log('failed to complete Ajax request -- ' + xhr.status + ": " + xhr.statusText);
			}.bind(this),
			onException: function(headerName, value){
				if(this.consoleOutput)
					console.log('exception with header -- ' + headerName + ': ' + value);
			}.bind(this),
			onComplete: function(data){
				DeviceLoader.prototype._downloadImage.bind(this)(data, function(image){
					var device = this.devices[index];
					device.setImage(image);

					// find all instances of device in myDevices and deviceDirectory and set image
					var children = $(deviceDirectory).getChildren();

					for( var i = 0; i < children.length; i++){
						var dev = children[i].handle;
						if(dev === device)
							continue;
						if(dev.equals(device))
							dev.setImage(image);
					}
					
					children = $(myDevices).getChildren();

					for( var i = 0; i < children.length; i++){
						var dev = children[i].handle;
						if(dev === device)
							continue;
						if(dev.equals(device))
							dev.setImage(image);
					}

					callback(image);
				}.bind(this));
			}.bind(this),
			onTimeout: function(){
				if(this.consoleOutput)
					console.log('timeout');
			}.bind(this),
			onRequest: function(url, script){
				if(this.consoleOutput)
					console.log('sending: ' + url);
			}.bind(this),
			onCancel: function(){
				if(this.consoleOutput)
					console.log('canceled');
			}.bind(this)
		});
		topicRequest.send();

	},
	attemptLoadDevice: function(topic, index, callback){
		this.getDevices(index, 1, function(devices){
			var dev = devices[0];
			if(dev !== undefined && dev.options.topic == topic){
				callback(dev);
				return;
			}

			var func = function(devices){
				for(var i = 0; i < devices.length; i++){
					var dev = devices[i];
					if(dev.options.topic == topic)
						callback(dev);
				}
				if(--this.calls.value == 0)
					callback(null);
			};

			var span = 20;
			var calls = {value: 2};
			var pass = {calls: calls, start: index - span, count: span, topic: topic, index: index, callback: callback};
			this.getDevices(pass.start, pass.count, func.bind(pass));

			var pass = {calls: calls, start: index + 1, count: span, topic: topic, index: index, callback: callback};
			this.getDevices(pass.start, pass.count, func.bind(pass));

		}.bind(this));
	},
	getDevices: function(start, count, callback){

		var devicesToLoad = [];

		for(var i = 0; i < count; i++){
			var index = start + i;
			if( this.devices[index] == undefined )
				devicesToLoad.push(index);
		}

		if(devicesToLoad.length == 0){
			this._returnDevices(start, count, callback);
			return;
		}

		// compute blocks in order to download needed devices in as few requests as possible
		var blocks = [];
		for(var i = 0; i < devicesToLoad.length; i++){
			if (i == 0){
				blocks[0] = [devicesToLoad[0]];
				continue;
			}
			// if the this unloaded devices comes directly after the last one
			if( devicesToLoad[i] == devicesToLoad[i-1] + 1 ){
				// add this unloaded device to the current block 
				blocks[blocks.length-1].push( devicesToLoad[i] );
			}
			// start a new block, the devices aren't adjacent
			else{
				blocks[blocks.length] = [devicesToLoad[i]];
			}
		}


		// download devices
		var requestsToGo = {count: blocks.length};
		for(var i = 0; i < blocks.length; i++){
			var pass = {handle: this, requestsToGo: requestsToGo, blocks: blocks, thisBlock: i};

			pass.func = function(devices){
				var block = this.blocks[this.thisBlock];
				
				for(var j = 0; j < devices.length; j++){
					// in case two calls to load device before device gets downloaded (actually happens!)
					if(this.handle.devices[block[j]] !== undefined)
						continue;
					devices[j].options.index = block[j];
					this.handle.devices[ block[j] ] = devices[j];
				}

				if(--this.requestsToGo.count == 0)
					this.handle._returnDevices(start, count, callback);

			}.bind(pass);

			var si= blocks[i][0];
			var c= blocks[i].length;

			this._downloadDevices(si, c, pass.func);
		}
	},
	_returnDevices: function(start, count, callback){
		callback(this.devices.slice(start, start + count));
	},
	_downloadDevices: function(startIndex, count, callback){

		var topicRequest = new Request.JSONP({
			url: DeviceLoader.URL_topicsRoot,
			data: {
				offset: startIndex,
				limit: count
			},
			method: 'get',
			callbackKey: "jsonp",
			onFailure: function(xhr){ 
				if(this.consoleOutput)
					console.log('failed to complete Ajax request -- ' + xhr.status + ": " + xhr.statusText);
			}.bind(this),
			onException: function(headerName, value){
				if(this.consoleOutput)
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
				if(this.consoleOutput)
					console.log('timeout');
			}.bind(this),
			onRequest: function(url, script){
				if(this.consoleOutput)
					console.log('sending: ' + url);
			}.bind(this),
			onCancel: function(){
				if(this.consoleOutput)
					console.log('canceled');
			}.bind(this)
		});
		topicRequest.send();
	},
	_getTotalDevices: function(){
		var callback = function(total){
			this.totalDevices = total;
		}.bind(this);

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
						this.deviceLoader.getDevices(this.lastIndex, 1, v.bind(this), this.log);
					}
				}
				else{
					this.lastIndex = Math.pow(2, this.power++) - 1;
					this.deviceLoader.getDevices( this.lastIndex, 1, v.bind(this), this.log);
				}
			}
			else{
				if(this.step != 1){
					this.dir = devices.length != 0? 1 : -1;
					this.lastIndex += this.dir * this.step;
					this.step /= 2;
					this.deviceLoader.getDevices(this.lastIndex, 1, v.bind(this), this.log);
				}
				else{
					this.lastIndex += this.dir;
					this.deviceLoader.getDevices(this.lastIndex, 1, function(devices){
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
			deviceLoader: this,
			log: false
		};
		this.getDevices(data.lastIndex,1,v.bind(data),data.log);
	},
	getTotalDevices: function(callback){
		if(this.totalDevices !== null){
			callback(this.totalDevices);
			return;
		}

		var pass = { handle: this, callback: callback};
		pass.func = function(){
			if(this.handle.totalDevices !== null){
				this.callback(this.handle.totalDevices);
				clearTimeout(this.id);
			}
		};
		pass.id = pass.func.periodical( DeviceLoader.checkDone, pass);
	},
	
});
DeviceLoader.checkDone = 10;
DeviceLoader.URL_topicsRoot = "http://www.ifixit.com/api/1.0/topics";
DeviceLoader.URL_topicRoot = "http://www.ifixit.com/api/1.0/topic";
DeviceLoader.jsonp = "callback";
