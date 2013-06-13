
// popluates and loads devices from ifixit.com into deviceContainer
var DeviceLoader = new Class({
	initialize: function(){
		this._getTotalDevices();
	},
	consoleOutput: false,
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
	executeOnAllDeviceInstances: function(device, func, pass){
		var bPass = false;

		if(pass !== undefined)
			bPass = true;

		if(bPass)
			func.bind(device, pass)();
		else
			func.bind(device)();

		for(var i = 0; i < this.devices.length; i++){
			var dev = this.devices[i];
			if(dev === undefined)
				continue;
			if(dev === device)
				continue;
			if(dev.equals(device)){
				if(bPass)
					func.bind(device, pass)();
				else
					func.bind(device)();
			}

		}
		if(window.draggedDevice !== undefined && window.draggedDevice.handle !== device && window.draggedDevice.handle.equals(device)){
			if(bPass)
				func.bind(draggedDevice.handle, pass)();
			else
				func.bind(draggedDevice.handle)();
		}

		children = $(deviceDirectory).getChildren();
		for( var i = 0; i < children.length; i++){
			var dev = children[i].handle;
			if(dev === device)
				continue;
			if(dev.equals(device)){
				if(bPass){
					func.bind(dev, pass)();
				}
				else
					func.bind(dev)();
			}
		}

		children = $(myDevices).getChildren();
		for( var i = 0; i < children.length; i++){
			var dev = children[i].handle;
			if(dev === device)
				continue;
			if(dev.equals(device)){
				if(bPass)
					func.bind(dev, pass)();
				else
					func.bind(dev)();
			}
		}

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

		this.executeOnAllDeviceInstances( this.devices[index], Device.prototype.loadingImage );

		this._downloadTopic(topic, index, function(data){
			if(data === null){
				console.log('Failed to download topic: ' + index);
			}
			else{
				this._downloadImage(data, function(image){
					var device = this.devices[index];
					this.executeOnAllDeviceInstances(device, Device.prototype.setImage, image);
					callback(image);
				}.bind(this));
			}
		}.bind(this));
	},
	_downloadTopic: function(topic, index, callback, timeoutObj){

		if(timeoutObj === undefined)
			timeoutObj = {topicRequest: null, handle: this, remainingRetries: DeviceLoader.downloadTopicTimeoutRetry, index: index, callback: callback};
		
		var topicRequest = new Request.JSONP({
			url: DeviceLoader.URL_topicRoot + "/" + topic,
			method: 'get',
			timeout: DeviceLoader.downloadTopicTimeout,
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
				callback(data);
			}.bind(this),
			onTimeout: function(){
				if(this.handle.consoleOutput){
					console.log('Retrying topic download ' + index);
				}
				if(--this.remainingRetries == 0)
					this.callback(null);
				else
					this.handle._downloadTopic(this.startIndex, this.count, this.callback, this);
			}.bind(timeoutObj),
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
				if(this.found.value === true)
					return;

				//console.log('check indicies ' + this.start + 

				for(var i = 0; i < devices.length; i++){
					var dev = devices[i];
					if(dev.options.topic == topic){
						this.found.value = true;
						callback(dev);
						return;
					}
				}
				if(--this.calls.value == 0)
					callback(null);
			};

			var span = 20;
			var calls = {value: 2};
			var found = {value: false};
			var pass = {found: found, calls: calls, start: index - span, count: span, topic: topic, index: index, callback: callback};
			if(pass.start < 0)
				pass.start = 0;
			this.getDevices(pass.start, pass.count, func.bind(pass));

			var pass = {found: found, calls: calls, start: index + 1, count: span, topic: topic, index: index, callback: callback};
			this.getDevices(pass.start, pass.count, func.bind(pass));

		}.bind(this));
	},
	_getDevices: function(blocks){
		if(this._getDevices.queue === undefined){
			this._getDevices.queue = [];
			this._getDevices.downloading = false;
			this._getDevices.checkQueue = function(){
				if(!this._getDevices.downloading && this._getDevices.queue.length != 0){
					this._getDevices.downloading = true;
					var blocks = this._getDevices.queue.splice(0,1)[0];
					this._realGetDevices(blocks);
				}
			}.bind(this);
		}

		this._getDevices.queue.push(blocks);
		this._getDevices.checkQueue();

	},
	_realGetDevices: function(blocks){
		var requestsToGo = {count: blocks.length};

		// download all blocks (up to DeviceDirectory.devicesPerPage)
		for(var i = 0; i < blocks.length; i++){
			var pass = {handle: this, requestsToGo: requestsToGo, blocks: blocks, thisBlock: i};

			pass.func = function(devices){
				var block = this.blocks[this.thisBlock];
				if(devices === null){
					if(this.handle.consoleOutput);
						console.log('Failed to download devices ' + block[0] + ' through ' + block[block.length-1]);
				}
				else{
					
					//var downloaded = []

					for(var j = 0; j < devices.length; j++){
						// in case two calls to load device before device gets downloaded (actually happens!)
						if(this.handle.devices[block[j]] !== undefined)
							continue;
						//downloaded.push(block[j]);
						devices[j].options.index = block[j];
						this.handle.devices[ block[j] ] = devices[j];
					}

					//if(downloaded.length != 0)
					//	console.log("Downloaded Devices: " + downloaded);
				}

				if(--this.requestsToGo.count == 0){
					this.handle._getDevices.downloading = false;
					this.handle._returnDevices(blocks.start, blocks.count, blocks.callback);
					this.handle._getDevices.checkQueue();
				}
			}.bind(pass);

			var si= blocks[i][0];
			var c= blocks[i].length;
			this._downloadDevices(si, c, pass.func);
		}
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

		//console.log("Request Devices: " + devicesToLoad );

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

		// add to queue so that only one set of devices is downloading at a time
		// (actually speeds up application a lot!)
		blocks.start = start;
		blocks.count = count;
		blocks.callback = callback;
		this._getDevices(blocks);
	},
	_returnDevices: function(start, count, callback){
		callback(this.devices.slice(start, start + count));
	},
	_downloadDevices: function(startIndex, count, callback, timeoutObj){
		if(timeoutObj === undefined)
			timeoutObj = {topicRequest: null, handle: this, remainingRetries: DeviceLoader.downloadDevicesTimeoutRetry, startIndex: startIndex, count: count, callback: callback};


		var topicRequest = new Request.JSONP({
			url: DeviceLoader.URL_topicsRoot,
			data: {
				offset: startIndex,
				limit: count
			},
			method: 'get',
			timeout: DeviceLoader.downloadDevicesTimeout,
			callbackKey: "jsonp",
			onTimeout: function(){
				if(this.handle.consoleOutput){
					var end = this.startIndex + this.count;
					console.log('Retrying download ' + this.startIndex + " through " + end);
				}
				if(--this.remainingRetries == 0)
					this.callback(null);
				else
					this.handle._downloadDevices(this.startIndex, this.count, this.callback, this);
			}.bind(timeoutObj),
			onFailure: function(xhr){ 
				if(this.consoleOutput)

					console.log('failed to complete Ajax request -- '+ xhr.statusText);
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
			onRequest: function(url, script){
				if(this.consoleOutput)
					console.log('sending: ' + url);
			}.bind(this),
			onCancel: function(){
				if(this.consoleOutput)
					console.log('canceled');
			}.bind(this)
		});

		timeoutObj.topicRequest = topicRequest;

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
DeviceLoader.downloadDevicesTimeout = 2000;
DeviceLoader.downloadDevicesTimeoutRetry = 5;
DeviceLoader.downloadTopicTimeout = 1500;
DeviceLoader.downloadTopicTimeoutRetry = 5;
