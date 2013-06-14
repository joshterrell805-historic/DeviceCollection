var MyDevices = new Class({

	Extends: DeviceContainer,

	initialize: function(deviceLoader, database){
		this.parent();
		this.database = database;
		this.deviceLoader = deviceLoader;
		this.loadSavedDevices();
	},

	scrollBarEnabled: false,

	loadSavedDevices: function(){

		this.database.getDevices(function(devices){

			var devs = {value: devices.length};

			var loadedDevices = [];

			var func = function(device){

				if(device == null){
					console.log('Stored device could not be found.\n\tDeviceTopic: ' + 
						this.databaseDevices[this.index].topic + '\n\tDeviceIndex: ' + 
						this.databaseDevices[this.index].deviceIndex);
				}
				else
					this.loadedDevices[this.index] = device;
				if( --this.devicesToGo.value == 0 ){

					for(var i = 0; i < this.loadedDevices.length; i++){
						dev = this.loadedDevices[i];

						if(dev === undefined)
							continue;

						if(this.databaseDevices[i].deviceIndex != dev.options.index){

							console.log("Device has changed index since last visit: " + 
								dev.options.topic + '\n\told index: ' + this.databaseDevices[i].deviceIndex +
								'\n\tnew index: ' + dev.options.index + '\n\tFixing local database..');

							this.handle.database.updateDeviceIndex(dev.options.topic, dev.options.index);
						}

						this.handle.addDevice(dev.clone(), false);

						this.handle.deviceLoader.getImage(dev.options.index, function(){});
					}
				}
			}


			for(var i = 0; i < devices.length; i++){
				var p = {handle: myDevices, index: i, devicesToGo: devs, loadedDevices: loadedDevices, databaseDevices: devices};
				myDevices.deviceLoader.attemptLoadDevice(devices[i].topic, devices[i].deviceIndex, func.bind(p));
			}

		});
	},

	setScrollBarChangeStateCallback: function(callback){
		this.scrollBarChangeStateCallback = callback;
	},

	// pCall - pass false to not call the callback function
	updateScrollBar: function(pCall){

		var call = false;

		var displayed = $(this).scrollHeight > $(this).clientHeight;

		if(displayed){		
			if(this.scrollBarEnabled === false)
				call = true;

			this.scrollBarEnabled = true;
		}
		else{
			if(this.scrollBarEnabled === true)
				call = true;

			this.scrollBarEnabled = false;
		}

		if(pCall !== false && call === true)
			this.scrollBarChangeStateCallback(this.scrollBarEnabled);
	},

	// if useDatabase is FALSE, the device will be added to the database if it is not already in the container
	// if useDatabase is unset, useDatabase is assumed TRUE
	addDevice: function(device, useDatabase){
		wrapper = this.addDeviceToContainer(device);

		if(wrapper === undefined)
			return;
		else
			this.updateScrollBar();
		
		if(useDatabase === false)
			return;

		index = this.deviceContainerIndex(device);

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
		if(this.containsWrapper(device.wrapper)){
			device.wrapper.dispose();
			this.database.removeDevice(device.options.topic);
			this.updateScrollBar();
		}
	}

});
