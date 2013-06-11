
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
	addDevice: function(device){
		if(this.containsDevice(device)){
			console.log('attempted to add duplicate device');
			return;
		}

		this.wrapDevice(device);
		(device.wrapper).inject($(this))
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

		this.spanTitle = new Element("span");
		this.spanTitle.className = "Device_Title Device_InnerSpan";
		this.spanTitle.inject(this.span);

		this.spanSpacing = new Element("span");
		this.spanSpacing.className = "Device_Spacing Device_InnerSpan";
		this.spanSpacing.inject(this.span);
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
	dropDevice: function(device){
		if(this.containsElement($(device.span)))
			this.addDevice(device.clone());
	}
});

var DeviceDirectory = new Class({
	Extends: DeviceContainer,
	initialize: function(){
		this.parent();
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
	initialize: function(deviceContainer){
		this.deviceContainer = deviceContainer;
		this.init(this.populate);
	},
	init: function(func){
		if(func == this.populate)
			this.populate.id = DeviceLoader.prototype.populate.delay(DeviceLoader.populateRate, this);
		/*
		this.loadEnableIntervalID = DeviceLoader.prototype.loadEnable.periodical(DeviceLoader.loadEnableRate, this);
		this.loadIntervalID = DeviceLoader.prototype.load.periodical(DeviceLoader.loadRate, this);
		*/
	},
	clear: function(func){
		if(func == this.populate)
			clearTimeout(this.populate.id);
	},
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
	deviceDirectory = new DeviceDirectory();

	/*
	for(var i = 0; i < 20; i++){
		window.deviceDirectory.addDevice(new Device({topic:'name ' + i}));
	}
	*/

	$(myDevices).inject(page);
	$(deviceDirectory).inject(page);
	page.inject(body);
	loader = new DeviceLoader(deviceDirectory);
}
