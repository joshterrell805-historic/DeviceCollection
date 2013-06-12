var MyDevices = new Class({
	Extends: DeviceContainer,
	initialize: function(){
		this.parent();
	},
	addDevice: function(device){
		this.addDeviceToContainer(device);
	},
	dropDevice: function(device){
		if(this.containsElement($(device)))
			this.addDevice(device.clone());
	}
});
