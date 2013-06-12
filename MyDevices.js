var MyDevices = new Class({
	Extends: DeviceContainer,
	initialize: function(deviceLoader, database){
		this.parent();
		this.database = database;
		this.deviceLoader = deviceLoader;
		this.loadSavedDevices();
	},
	loadSavedDevices: function(){
		this.database.getDevices(function(devices){

			var devs = {value: devices.length};
			var loadedDevices = [];
			for(var i = 0; i < devices.length; i++){
				var pass = {handle:myDevices, databaseDevices: devices, index: i, devicesToGo: devs, loadedDevices: loadedDevices};
				//	console.log(pass.databaseDevices[i].topic);
				pass.func = function(device){
					if(device == null){
						console.log('Stored device could not be found.\n\tDeviceTopic: ' + this.databaseDevices[this.index].topic + '\n\tDeviceIndex: ' + this.databaseDevices[this.index].deviceIndex);
					}
					else{
						this.loadedDevices[this.index] = device.clone();
					}
					if( --this.devicesToGo.value == 0 ){
						for(var i = 0; i < this.loadedDevices.length; i++){
							dev = this.loadedDevices[i];
							if(dev === undefined)
								continue;
							this.handle.addDevice(dev, false);
							this.handle.deviceLoader.loadImage(dev.options.index, function(){});
						}
					}
				}.bind(pass);
				myDevices.deviceLoader.attemptLoadDevice(devices[i].topic, devices[i].deviceIndex, pass.func);
			}

		});

	},

	// if useDatabase is FALSE, the device will be added to the database if it is not already in the container
	// if useDatabase is unset, useDatabase is assumed TRUE
	addDevice: function(device, useDatabase){
		wrapper = this.addDeviceToContainer(device);
		
		if(useDatabase === false)
			return;
			
		if(wrapper === undefined)
			return;


		if(index > -1)
			this.database.addDevice(device.options.topic, index, device.options.index);
		else
			console.log('Error: MyDevices.addDevice -- added device but couldn\'t find index in parent');
	},
	dropDevice: function(device){
		if(this.containsElement($(device)))
			this.addDevice(device.clone());
	},
	startDrag: function(device){
		// this device is being dragged and has been removed from container
		if(this.containsWrapper(device.wrapper))
			this.database.removeDevice(device.options.topic);
	}
});
