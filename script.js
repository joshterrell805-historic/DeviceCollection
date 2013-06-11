
var Span = new Class({
	initialize: function(){
		this.span = new Element("span");
	},
	toElement: function(){
		return this.span;
	}
});

var DeviceContainer = new Class({
	Extends: Span,
	initialize: function(){
		this.parent();
		this.span.className = "DeviceContainer";
		this.span.deviceContainer = this;
	},
	wrapDevice: function(device){
		device.wrapper = new Element("span");
		device.wrapper.handle = device;
		device.wrapper.className = "DeviceWrapper";

		$(device).inject(device.wrapper);
	},
	// override in sub-classes
	addDevice: function(device){
		console.log("not implemented");
	},
	addDeviceToContainer: function(device){
		if(this.containsDevice(device)){
			console.log('attempted to add duplicate device');
			return;
		}

		this.wrapDevice(device);
		(device.wrapper).inject($(this))
		return device.wrapper;
	},
	addDeviceBefore: function(device, wrapper){
		this.wrapDevice(device);
		(device.wrapper).inject(wrapper, 'before');
	},
	containsDevice: function (device){
		var wrappers = $(this).getChildren();
		for(var i = 0; i < wrappers.length; i++){
			if(wrappers[i].handle.equals(device))
				return true;
		}
		return false;
	},
	containsElement: function(element){
		var thisSize = $(this).getSize();
		var thisPos = $(this).getPosition();
		var elmSize = $(element).getSize();
		var elmPos = $(element).getPosition();

		if( elmPos.x + elmSize.x > thisPos.x &&
			elmPos.y + elmSize.y > thisPos.y &&
			elmPos.x < thisPos.x + thisSize.x &&
			elmPos.y < thisPos.y + thisSize.y ) return true;
		else return false;
	}
});

var Device = new Class({
	Extends: Span,
	initialize: function(options){
		this.parent();
		this.options = options;

		this.span.className = "Device";

		this.initInnerSpans();

		this.setTopic(options.topic);

		this.drag = new Drag($(this),{
			onStart:  Device.prototype.onStart.bind(this),
			onComplete: Device.prototype.onComplete.bind(this),
			onCancel: Device.prototype.onCancel.bind(this)
		});
	},
	initInnerSpans: function(){
		this.spanImage = new Element("span");
		this.spanImage.className = "Device_Image Device_InnerSpan";
		this.spanImage.inject(this.span);

		this.spanSpacing = new Element("span");
		this.spanSpacing.className = "Device_Spacing Device_InnerSpan";
		this.spanSpacing.inject(this.span);

		this.spanTitle = new Element("span");
		this.spanTitle.className = "Device_Title Device_InnerSpan";
		this.spanTitle.inject(this.span);
	},
	onStart: function(){
		deviceDirectory.startDrag(this);

		// wrapper is added to device in DeviceContainer.addDevice(device)
		$(this.wrapper).dispose();

		$(this).setStyle('position', 'absolute');
		$(this).inject($(document.body));
	},
	onComplete: function(){
		// no need to "unset" absolute positioning, device is recreated

		myDevices.dropDevice(this);
		$(this).destroy();
	},
	onCancel: function(){
		// start never called, no need to do anything
	},
	setTopic: function(topic){
		this.topic = topic;
		this.spanTitle.set('text', topic);
	},
	clone: function(){
		// clone the visible device but not the underlying device (the options)
		return new Device(this.options);
	},
	equals: function(device){
		return this.options == device.options;
	}
});

var MyDevices = new Class({
	Extends: DeviceContainer,
	initialize: function(){
		this.parent();
	},
	addDevice: function(device){
		this.addDeviceToContainer(device);
	},
	dropDevice: function(device){
		if(this.containsElement($(device.span)))
			this.addDevice(device.clone());
	}
});

var DeviceDirectory = new Class({
	Extends: DeviceContainer,
	initialize: function(deviceLoader){
		this.parent();
		this.deviceLoader = deviceLoader;
		this.deviceLoader.getTotalDevices(function(num){this.totalDevices = num;}.bind(this));
		this.gotoPage(this.page);
	},
	devices: [],
	page: 0,
	devicesPerPage: 0,
	totalPages: null,
	totalDevices: null,
	clearPage: function(){
		var children = $(this).getChildren();
		for(var i = 0; i < children.length; i++)
			children[i].dispose();
	},
	refresh: function(){
		this.clearPage();

		var dev = new Device({topic:''});
		var wrapper = this.addDeviceToContainer(dev);
		var size = wrapper.getSize();
		wrapper.destroy();

		var thisSize = $(this).getSize();

		this.devicesPerPage = Math.floor( thisSize.x / size.x ) * Math.floor( thisSize.y / size.y );
		this.pages = null;

		if(this.totalDevices == null){

			var pass = { handle: this };

			pass.func = function(){
				if(this.handle.totalDevices != null){
					this.handle.totalPages = Math.floor(this.handle.totalDevices / this.handle.devicesPerPage);
					clearTimeout(this.id);
					console.log(this.handle.totalDevices + " " + this.handle.totalPages);
				}
			};

			pass.id = pass.func.periodical( 30, pass );
		}
		else{
			this.totalPages = Math.floor(this.totalDevices / this.devicesPerPage);
			console.log(this.totalDevices + " " + this.totalPages);
		}
	},
	onResize: function(){
		this.refresh();
	},
	gotoPage: function(page){


	},
	addDevice: function(device){
		this.addDeviceToContainer(device);
	},
	startDrag: function(device){
		var children = $(this).getChildren();
		var i = children.indexOf($(device.wrapper));

		if( i != -1 )
			// duplicate device at location, about to be removed
			this.addDeviceBefore(device.clone(), device.wrapper);
	}
});

// popluates and loads devices from ifixit.com into deviceContainer
var DeviceLoader = new Class({
	initialize: function(){
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
	/*
	populate: function(){

		if(!this.loading){
			this.clear(this.populate);

			var topicRequest = new Request.JSONP({
				url: DeviceLoader.URL_topicsRoot,
				data: {
					offset: this.offset,
					limit: DeviceLoader.populateChunkSize
				},
				method: 'get',
				callbackKey: "jsonp",
				onFailure: function(xhr){ 
					console.log('failed to complete Ajax request -- ' + xhr.status + ": " + xhr.statusText);
				}.bind(this),
				onException: function(headerName, value){
					console.log('exception with header -- ' + headerName + ': ' + value);
				}.bind(this),
				onComplete: function(data){
					if(data.length == 0) {
						this.clear(this.populate);
						return;
					}

					console.log('recieved '+ data.length + ' topics.');
					this.offset += data.length;

					for(var i = 0; i < data.length; i++){
						var options = data[i];
						this.deviceContainer.addDevice( new Device(options) );
					}

					this.init(this.populate);
				}.bind(this),
				onTimeout: function(){
					console.log('timeout');
				}.bind(this),
				onRequest: function(url, script){
					console.log('sending: ' +url);
				}.bind(this),
				onCancel: function(){
					console.log('canceled');
				}.bind(this)
			});

			topicRequest.send();
		}
	},
	loadEnable: function(){
		if(this.doneLoading){
			$clear(this.loadEnableIntervalID);
			$clear(this.loadIntervalID);
			return;
		}

	},
	load: function(){

	},
	updateDevicesToLoad: function(){

	},
	offset: 0,
	devicesToLoad: [],
	donePopulating: false,
	doneLoading: false,
	loading: false
	*/

});
DeviceLoader.populateRate = 20;
DeviceLoader.populateChunkSize = 20;
DeviceLoader.loadEnableRate = 30;
DeviceLoader.loadRate = 1;
DeviceLoader.URL_topicsRoot = "http://www.ifixit.com/api/1.0/topics";
DeviceLoader.URL_topicRoot = "http://www.ifixit.com/api/1.0/topic";
DeviceLoader.jsonp = "callback";

constructBody = function(){
	var body = $(document.body);
	body.setStyle('overflow', 'hidden');

	var page = new Element("Div");
	page.className = "page";

	myDevices = new MyDevices();
	var loader = new DeviceLoader();
	deviceDirectory = new DeviceDirectory(loader);

	/*
	for(var i = 0; i < 20; i++){
		window.deviceDirectory.addDevice(new Device({topic:'name ' + i}));
	}
	*/

	$(myDevices).inject(page);
	$(deviceDirectory).inject(page);
	page.inject(body);
	deviceDirectory.refresh();
	window.addEvent('resize', DeviceDirectory.prototype.refresh.bind(deviceDirectory));
}
