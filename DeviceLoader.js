
// used internally by DeviceLoader
var DeviceRequest  = new Class({
		// start and count are the parameters to getDevices
		// devicesToLoad is an array of indicies of the devices which need to be downloaded
		initialize: function(start, count, devicesToLoad, callback){
			this.start = start;
			this.count = count;
			this.callback = callback;
			this.blocks = [];

			// compute blocks in order to download needed devices in as few requests as possible
			for(var i = 0; i < devicesToLoad.length; i++){
				if (i == 0){
					this.blocks[0] = [devicesToLoad[0]];
					continue;
				}
	
				// if this unloaded device comes directly after the last one add this unloaded device to the current block
				if( devicesToLoad[i] == devicesToLoad[i-1] + 1 ){
					this.blocks[this.blocks.length-1].push( devicesToLoad[i] );
				}
	
				// start a new block, the devices aren't adjacent
				else{
					this.blocks[this.blocks.length] = [devicesToLoad[i]];
				}
			}
		}
});

var DeviceLoader = new Class({

	initialize: function(){
		this._getTotalDevices();
	},

	// display console output for downloading?
	consoleOutput: false,

	// display console output for errors
	consoleErrorOutput: true,

	devices: [],

	totalDevices: null,

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
						this.deviceLoader.getDevices(this.lastIndex, 1, v.bind(this));
					}
				}
				else{
					this.lastIndex = Math.pow(2, this.power++) - 1;
					this.deviceLoader.getDevices( this.lastIndex, 1, v.bind(this));
				}
			}
			else{

				this.dir = devices.length != 0? 1 : -1;

				if(this.step != 1){
					this.lastIndex += this.dir * this.step;
					this.step /= 2;
					this.deviceLoader.getDevices(this.lastIndex, 1, v.bind(this));
				}
				else{
					this.lastIndex += this.dir;
					this.deviceLoader.getDevices(this.lastIndex, 1, function(devices){
						// if exists
						if( devices.length == 0 )
							this.callback(this.lastIndex);
						else
							this.callback(this.lastIndex+1);
					}.bind(this));
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
		};

		this.getDevices(data.lastIndex,1,v.bind(data));
	},

	// gets 'count' devices starting at index 'start'
	// calls callback with an array of devices
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


		this._getDevices(new DeviceRequest(start, count, devicesToLoad, callback));
	},

	_getDevices: function(request){

		// initialize the queue functionality
		if(this._getDevices.queue === undefined){

			this._getDevices.queue = [];
			this._getDevices.downloading = false;
			this._getDevices.checkQueue = function(){

				if(!this._getDevices.downloading && this._getDevices.queue.length != 0){

					this._getDevices.downloading = true;

					var request = this._getDevices.queue.splice(0,1)[0];
					this._realGetDevices(request);
				}

			}.bind(this);
		}

		this._getDevices.queue.push(request);
		this._getDevices.checkQueue();
	},

	_realGetDevices: function(request){
		var requestsToGo = {count: request.blocks.length};

		// download all blocks
		for(var i = 0; i < requestsToGo.count; i++){

			var pass = {handle: this, requestsToGo: requestsToGo, blocks: request.blocks, thisBlock: i};

			pass.func = function(devices){

				var block = this.blocks[this.thisBlock];

				if(devices === null){
					if(this.handle.consoleErrorOutput);
						alert('Critical Error: Failed to download devices\nSee javascript console for more information and try refreshing later');
				}
				else{
					for(var j = 0; j < devices.length; j++){
						/*
							Was used when calls to get devices were not in a queue. Keeping here just incase the desire to switch out of queue mode arises.

							if(this.handle.devices[block[j]] !== undefined)
								continue;

						*/

						devices[j].options.index = block[j];
						this.handle.devices[ block[j] ] = devices[j];
					}
				}

				if(--this.requestsToGo.count == 0){
					this.handle._getDevices.downloading = false;
					this.handle._returnDevices(request.start, request.count, request.callback);
					this.handle._getDevices.checkQueue();
				}

			}.bind(pass);

			var startIndex = request.blocks[i][0];
			var count = request.blocks[i].length;
			this._downloadDevices(startIndex, count, pass.func);

		}

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
			onException: function(headerName, value){
				if(this.consoleErrorOutput)
					console.log('Exception with header -- ' + headerName + ': ' + value);
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
					console.log('Sending for: ' + url);
			}.bind(this),
			onCancel: function(){
				if(this.consoleOutput)
					console.log('canceled');
			}.bind(this)
		});

		timeoutObj.topicRequest = topicRequest;

		topicRequest.send();
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

	_getIndex: function(device){
		for(var i = 0; i < this.devices.length; i++){
			if(this.devices[i] !== undefined && this.devices[i].equals(device))
				return i;
		}
	},

	// callback has signature function( image )
	// image is the loaded image Element
	// index is the index of the device whose image needs loading
	getImage: function(index, callback){

		var device = this._getDevice(index);

		var topic = null;

		if(device !== undefined){

			// return image if already loaded
			if(device.options.image !== undefined){
				callback(device.options.image);
				return;
			}

			topic = device.options.topic;
		}

		// requested image of unloaded device
		else{
			if(this.consoleErrorOutput)
				console.log("Error: DeviceLoader.getImage -- index is invalid. Index: " + index);

			callback(null);
			return;
		}

		this.executeOnAllDeviceInstances( this.devices[index], Device.prototype.loadingImage );

		this._downloadTopic(topic, index, function(data){
			if(data === null ){
				if(this.consoleErrorOutput)
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

	// returns undefined if no device
	_getDevice: function(indexOrTopic){

		if(typeof indexOrTopic == "number")
			return this.devices[indexOrTopic];

		else if(typeof indexOrTopic == "string"){
			for(var i = 0; i < devices.length; i++)
				if(this.devices[i] !== undefined && this.devices[i].options.topic == indexOrTopic)
					return this.devices[i];
		}
	},

	_downloadTopic: function(topic, index, callback, timeoutObj){

		if(timeoutObj === undefined)
			timeoutObj = {topicRequest: null, handle: this, remainingRetries: DeviceLoader.downloadTopicTimeoutRetry, index: index, callback: callback};
		
		var topicRequest = new Request.JSONP({
			url: DeviceLoader.URL_topicRoot + "/" + topic,
			method: 'get',
			timeout: DeviceLoader.downloadTopicTimeout,
			callbackKey: "jsonp",
			onException: function(headerName, value){
				if(this.consoleErrorOutput)
					console.log('Exception with header -- ' + headerName + ': ' + value);
			}.bind(this),
			onComplete: function(data){
				callback(data);
			}.bind(this),
			onTimeout: function(){
				if(this.handle.consoleOutput)
					console.log('Retrying topic download ' + index);

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

	_downloadImage: function(data, callback){

		if(data.image.length == 0){
			callback(null);
			return;
		}

		var image = new Element("img", {

			src: data.image.text + ".thumbnail",

			events: {

				load: function(){
					callback(image);
				}
			}
		});

	},

	executeOnAllDeviceInstances: function(device, func, pass){

		func.bind(device, pass)();

		for(var i = 0; i < this.devices.length; i++){
			var dev = this.devices[i];

			if(dev === undefined || dev === device)
				continue;

			if(dev.equals(device))
				func.bind(device, pass)();

		}

		if(window.draggedDevice !== undefined && window.draggedDevice.handle !== device && window.draggedDevice.handle.equals(device))
			func.bind(draggedDevice.handle, pass)();

		children = $(deviceDirectory).getChildren();
		for( var i = 0; i < children.length; i++){
			var dev = children[i].handle;

			if(dev === device)
				continue;

			if(dev.equals(device))
				func.bind(dev, pass)();
		}

		children = $(myDevices).getChildren();
		for( var i = 0; i < children.length; i++){
			var dev = children[i].handle;

			if(dev === device)
				continue;

			if(dev.equals(device))
				func.bind(dev, pass)();
		}
	},
	
	zexecuteOnAllDeviceInstances: function(device, func, pass){
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

	attemptLoadDevice: function(topic, index, callback){

		this.getDevices(index, 1, function(devices){

			var dev = devices[0];

			// the device requested had the correct index
			if(dev !== undefined && dev.options.topic == topic){
				callback(dev);
				return;
			}

			//else, the device has moved indicies (probably new topics added or removed)

			var func = function(devices){
				if(this.found.value === true)
					return;

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
	}
	
});
DeviceLoader.checkDone = 10;
DeviceLoader.URL_topicsRoot = "http://www.ifixit.com/api/1.0/topics";
DeviceLoader.URL_topicRoot = "http://www.ifixit.com/api/1.0/topic";
DeviceLoader.jsonp = "callback";
DeviceLoader.downloadDevicesTimeout = 2000;
DeviceLoader.downloadDevicesTimeoutRetry = 5;

// downloading a full object, give server a bit of time to think.
DeviceLoader.downloadTopicTimeout = 3000;
DeviceLoader.downloadTopicTimeoutRetry = 5;
