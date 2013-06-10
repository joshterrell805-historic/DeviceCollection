
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
	// don't need for now devices: [],
	addDevice: function(device){
		$(device).inject($(this))
		// this.devices.push(device);
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

		this.spanImage = new Element("span");
		this.spanImage.className = "Device_Image Device_InnerSpan";
		this.spanImage.inject(this.span);

		this.spanTitle = new Element("span");
		this.spanTitle.className = "Device_Title Device_InnerSpan";
		this.spanTitle.inject(this.span);

		this.spanSpacing = new Element("span");
		this.spanSpacing.className = "Device_Spacing Device_InnerSpan";
		this.spanSpacing.inject(this.span);

		this.wrapper = new Element("span");
		this.wrapper.className = "DeviceWrapper";
		this.span.inject(this.wrapper);

		this.setTopic(options.topic);

		this.drag = new Drag($(this),{
			onStart:  Device.prototype.onStart.bind(this),
			onComplete: Device.prototype.onComplete.bind(this),
			onCancel: Device.prototype.onCancel.bind(this),
			handle: this.span
		});

		// may need later
		// $(this).handle = this;
	},
	onStart: function(){
		console.log('on start');
		deviceDirectory.startDrag(this);
		$(this).dispose();
		$(this).setStyle('position', 'absolute');
		$(this).inject($(document.body));

	},
	onComplete: function(){
		console.log('on complete');
		myDevices.dropDevice(this);
		$(this).destroy();
	},
	onCancel: function(){
		console.log('on cancel');
	},
	toElement: function(){
		return this.wrapper;
	},
	setTopic: function(topic){
		this.topic = topic;
		this.spanTitle.set('text', topic);
		

	},
	clone: function(){
		// don't create new options, use reference
		return new Device(this.options);
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
		var i = children.indexOf($(device));
		if( i != -1 ){
			// duplicate child at location, about to be removed
			var duplicate = device.clone();
			$(duplicate).inject($(device), 'after')
		}
	}
});


constructBody = function(){
	var body = $(document.body);
	body.setStyle('overflow', 'hidden');

	var page = new Element("Div");
	page.className = "page";

	myDevices = new MyDevices();
	deviceDirectory = new DeviceDirectory();
	for(var i = 0; i < 20; i++){
		window.deviceDirectory.addDevice(new Device({topic:'name ' + i}));
	}
	$(myDevices).inject(page);
	$(deviceDirectory).inject(page);
	page.inject(body);
}
