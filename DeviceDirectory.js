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
				this.handle.loadImages();
			}.bind(pass);

			this.deviceLoader.loadImage(device.options.index, pass.func, false);
		}
	},
	refresh: function(){
		// calculate devices per page 
		var dev = new Device({topic:'measure'});
		var wrapper = this.addDeviceToContainer(dev);
		var size = wrapper.getSize();
		wrapper.destroy();

		var thisSize = $(this).getSize();

		var devicesPer = {x: Math.floor( thisSize.x / size.x),
			y: Math.floor( thisSize.y / size.y )};

		var extraSpace = {x: thisSize.x - size.x * devicesPer.x,
			y: thisSize.y - size.y * devicesPer.y};

		this.devicesPerPage = devicesPer.x * devicesPer.y;

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
	nextPage: function(){
		this.gotoPage(this.page + 1);
	},
	prevPage: function(){
		this.gotoPage(this.page - 1);
	},
	jumpPage: function(page){
		this.gotoPage(page - 1);
	},
	_pagesRequested: 0,
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


		this.page = page;
		this.pageBrowser.setPage(this.page+1);
		this.followDeviceIndex = this.page * this.devicesPerPage;

		var startIndex = this.page*this.devicesPerPage;
		var count = this.devicesPerPage;

		this.clearPage();

		//if gotoPage is called multiple times before the callback, the callback adds multiple sets of data to the page
		// to avoid that, only draw the last page requested
		this._pagesRequested++;
		this.deviceLoader.getDevices( startIndex, count, this.displayDevices.bind(this));
	},
	displayDevices: function(devices){
		if(--this._pagesRequested != 0)
			return;

		this.devicesWithoutImages = [];

		for(var i = 0; i < devices.length; i++){
			var device = devices[i];
			this.addDevice(device);

			if(device.options.image === undefined)
				this.devicesWithoutImages.push(device);
		}
	
		this.loadImages();
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

			this.deviceLoader.replaceDevice(clone);
			this.addDeviceBefore(clone, device.wrapper);
		}
	}
});
