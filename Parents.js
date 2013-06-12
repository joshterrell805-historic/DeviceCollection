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
	},
	// override in sub-classes
	addDevice: function(device){
		console.log("not implemented");
	},
	addDeviceToContainer: function(device){
		if(this.containsDevice(device)){
			console.log('attempted to add duplicate device');
			return ;
		}

		var wrapper = device.wrapDevice();
		wrapper.inject($(this))
		return wrapper;
	},
	// add device before wrapper
	addDeviceBefore: function(device, wrapper){
		var devWrapper = device.wrapDevice();
		devWrapper.inject(wrapper, 'before');
	},
	deviceContainerIndex: function(device){
		var wrappers = $(this).getChildren();
		for(var i = 0; i < wrappers.length; i++){
			if(wrappers[i].handle.equals(device))
				return i;
		}
		return -1;
	},
	containsDevice: function (device){
		if(this.deviceContainerIndex(device) > -1 )
			return true;
		return false;
	},
	containsWrapper: function(wrapper){
		var wrappers = $(this).getChildren();
		for(var i = 0; i < wrappers.length; i ++){
			if(wrappers[i] === wrapper)
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
