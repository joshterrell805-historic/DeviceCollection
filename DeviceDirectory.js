var DeviceDirectory = new Class({
	Extends: DeviceContainer,
	initialize: function(deviceLoader, pageBrowser){
		this.parent();
		this.deviceLoader = deviceLoader;
		this.pageBrowser = pageBrowser;
		this.deviceLoader.getTotalDevices(function(num){this.totalDevices = num;}.bind(this));
		$(this).set('id', 'DeviceDirectory');
	},
	// which device to follow on screen resize(top left device of screen)?
	followDeviceIndex: 0,
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
	loadImages: function(){
		if(this.devicesWithoutImages.length != 0){
			var device = this.devicesWithoutImages.splice(0,1)[0];

			var pass = {handle: this, device: device};

			pass.func = function(image){
				this.device.setImage(image);
				this.handle.loadImages();

				// if moved device to bag during load, the device is now a cloned device and the device in myDevices will not have the image
				// find all instances of device in myDevices and deviceDirectory and set image

				var children = $(deviceDirectory).getChildren();

				// can't use index of because of comparison method. manual search
				for( var i = 0; i < children.length; i++){
					var dev = children[i].handle;
					if(dev === device)
						continue;
					if(dev.equals(this.device))
						dev.setImage(image);
				}
				
				var children = $(myDevices).getChildren();

				for( var i = 0; i < children.length; i++){
					var dev = children[i].handle;
					if(dev === device)
						continue;
					if(dev.equals(this.device))
						dev.setImage(image);
				}

			}.bind(pass);

			this.deviceLoader.loadImage(device.options.topic, pass.func, false);
		}
	},
	refresh: function(){

		// calculate devices per page 
		var dev = new Device({topic:''});
		var wrapper = this.addDeviceToContainer(dev);
		var size = wrapper.getSize();
		wrapper.destroy();

		var thisSize = $(this).getSize();

		this.devicesPerPage = Math.floor( thisSize.x / size.x ) * Math.floor( thisSize.y / size.y );

		// load page
		var pageOf = function(index){
			return Math.floor( index / this.devicesPerPage );
		}.bind(this);

		var page = pageOf(this.followDeviceIndex);
		this.gotoPage(page);

		// calculate total pages
		this.totalPages = null;

		if(this.totalDevices == null){
			var pass = { handle: this };
			pass.func = function(){
				if(this.handle.totalDevices != null){
					this.handle.totalPages = Math.ceil(this.handle.totalDevices / this.handle.devicesPerPage);
					this.handle.pageBrowser.setTotalPages(this.handle.totalPages);
					clearTimeout(this.id);
				}
			};
			pass.id = pass.func.periodical( 30, pass );
		}
		else{
			this.totalPages = Math.ceil(this.totalDevices / this.devicesPerPage);
			this.pageBrowser.setTotalPages(this.totalPages);
		}
	},
	onResize: function(){
		this.refresh();
	},
	displayDevices: function( startIndex, count ){

		var PageDeviceMap = new Class({
			initialize: function(deviceIndex, pageIndex){
				this.deviceIndex = deviceIndex;
				this.pageIndex = pageIndex;
			}
		});

		var devicesToLoad = [];

		// on the last page, there may not exist the requested 'count' amount of devices
		// adjust count accordingly
		if(this.totalDevices != null && this.totalPages != null && this.page == this.totalPages - 1){
			count = this.totalDevices - startIndex - 1;
		}

		for(var i = 0; i < count; i++){
			var index = startIndex + i;
			if( this.devices[index] === undefined )
				devicesToLoad.push(new PageDeviceMap(index, i));
		}

		// compute blocks in order to download needed devices in as few requests as possible
		var blocks = [];
		for(var i = 0; i < devicesToLoad.length; i++){
			if (i == 0){
				blocks[0] = [devicesToLoad[0]];
				continue;
			}
			// if the this unloaded devices comes directly after the last one
			if( devicesToLoad[i].pageIndex == devicesToLoad[i-1].pageIndex + 1 ){
				// add this unloaded device to the current block 
				blocks[blocks.length-1].push( devicesToLoad[i] );
			}
			// start a new block, the devices aren't adjacent
			else{
				blocks[blocks.length] = [devicesToLoad[i]];
			}
		}

		// download devices
		var requestsToGo = {count: blocks.length};
		for(var i = 0; i < blocks.length; i++){
			var pass = {handle: this, requestsToGo: requestsToGo, blocks: blocks, thisBlock: i};

			pass.func = function(devices){
				var block = this.blocks[this.thisBlock];
				
				for(var j = 0; j < devices.length; j++)
					this.handle.devices[ block[j].deviceIndex ] = devices[j];

				if(--this.requestsToGo.count == 0)
					this.handle.doneLoadingDevices();

			}.bind(pass);

			var si= blocks[i][0].deviceIndex;
			var c= blocks[i].length;

			this.deviceLoader.getDevices(si, c, pass.func, false);
		}

		// didn't have to download any devices. If had to download, this method is called again
		if(blocks.length == 0){
			this.devicesWithoutImages = [];
			for(var i = 0; i < count; i++){
				var device = this.devices[i + startIndex];
				this.addDevice(device);

				if(device.options.image === undefined)
					this.devicesWithoutImages.push(device);
			}
			this.loadImages();
		}
	},
	doneLoadingDevices: function(){
		// the page may have changed, window been resized, etc..
		this.gotoPage(this.page);
	},
	nextPage: function(){
		this.gotoPage(this.page + 1);
	},
	prevPage: function(){
		this.gotoPage(this.page - 1);
	},
	jumpPage: function(page){
		this.gotoPage(page - 1);
	},
	gotoPage: function(page){

		if(page < 0)
			page = 0;


		// attempt to go to page, but when totalPages has been calculated, verify that the page is a valid page
		if(this.totalPages == null){
			// wait for totalPages to be calculated
			var pass = {handle: this};
			pass.func = function(){
				if(this.handle.totalPages != null){
					clearTimeout(this.id);
					this.handle.isPageValid();
				}
			};
			pass.id = pass.func.periodical(30, pass);
		}
		else if(page > this.totalPages - 1)
			page = this.totalPages - 1;

		this.clearPage();

		this.page = page;
		this.pageBrowser.setPage(this.page+1);
		this.followDeviceIndex = this.page * this.devicesPerPage;

		this.displayDevices(this.page * this.devicesPerPage, this.devicesPerPage);
	},
	isPageValid: function(){
		// the page has already been set, but may have been set to a page higher than the highest possible page
		// check and fix if need be
		// totalPages is defined

		if(this.totalPages == 0)
			return;

		if(this.page >= this.totalPages)
			this.gotoPage(this.totalPages - 1);
	},
	addDevice: function(device){
		this.addDeviceToContainer(device);
	},
	startDrag: function(device){
		var children = $(this).getChildren();
		var i = children.indexOf($(device.wrapper));

		// duplicate device at location, about to be removed
		if( i != -1 )
		{
			var clone = device.clone();

			var devIndex = this.devices.indexOf( device );
			if(devIndex == -1)
				console.log('Error: DeviceDirectory.startDrag -- device doesn\'t exist within this.devices yet was found in dom');
			else
				this.devices[devIndex] = clone;
				
			this.addDeviceBefore(clone, device.wrapper);
		}
	}
});
