var MyDevices = new Class({

	Extends: DeviceContainer,

	initialize: function(deviceLoader, database){
		this.parent();
		this.database = database;
		this.deviceLoader = deviceLoader;
		this.loadSavedDevices();
	},

	loadingDevices: false,

	loadSavedDevices: function(){
		this.loadingDevices = true;

		this.database.getDevices(function(devices){
			var devs = {value: devices.length};

			var func = function(device){

				if(device == null){
					console.log('Stored device could not be found.\n\tDeviceTopic: ' + 
						this.databaseDevices[this.index].topic + '\n\tDeviceIndex: ' + 
						this.databaseDevices[this.index].deviceIndex);
				}
				else{
					this.handle.addDatabaseDevice(device.clone());
					if(this.databaseDevices[this.index].deviceIndex != device.options.index){
						console.log("Device has changed index since last visit: " + 
							device.options.topic + '\n\told index: ' + this.databaseDevices[this.index].deviceIndex +
							'\n\tnew index: ' + device.options.index + '\n\tFixing local database..');

						this.handle.database.updateDeviceIndex(device.options.topic, device.options.index);
					}
					this.handle.deviceLoader.getImage(device.options.index, function(){});
				}

				if(--this.remainingDevices.value == 0)
					this.handle.loadingDevices = false;
			}

			if(devices.length == 0)
				this.loadingDevices = false;

			for(var i = 0; i < devices.length; i++){
				var p = {handle: myDevices, index: i, databaseDevices: devices, remainingDevices: devs};
				myDevices.deviceLoader.attemptLoadDevice(devices[i].topic, devices[i].deviceIndex, func.bind(p));
			}

		}.bind(this));
	},

	addDatabaseDevice: function(device){
		this._addDevice(device);
	},

	_addDevice:function(device){
		var wrapper = this.addDeviceToContainer(device);

		// duplicate device, didn't add
		if(wrapper === undefined)
			return false;
			
		resize();
	},

	addDevice: function(device){
		if(this.loadingDevices){
			if(this.loadingMessage === undefined){
				this.loadingMessage = new Purr({
					mode: 'top',
					position: 'center'
				});
			}

			this.loadingMessage.alert('Please wait until your Gear Bag has finished loading');
			return;
		}

		// duplicate device
		if(this._addDevice(device) === false)
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
			resize();
		}
	}

});
