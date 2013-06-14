
var DeviceDirectory = new Class({

	Extends: DeviceContainer,

	initialize: function(deviceLoader, pageBrowser){
		this.parent();
		$(this).set('id', 'DeviceDirectory');

		this.deviceLoader = deviceLoader;
		this.pageBrowser = pageBrowser;

		this.deviceLoader.getTotalDevices( function(num) {
				this.totalDevices = num;
			}.bind(this)
		);
	},

	// the index of the device to follow on screen resize (top left device of page when gotoPage() is called)
	followDeviceIndex: 0,

	page: 0,

	devicesPerPage: 0,

	totalPages: null,

	totalDevices: null,

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

	clearPage: function(){
		var children = $(this).getChildren();

		for(var i = 0; i < children.length; i++)
			children[i].dispose();
	},

	refresh: function(){

		this.devicesPerPage = this.getDevicesPerPage();

		var page = this.pageOf(this.followDeviceIndex);

		this.gotoPage(page);

		this.calculateTotalPages();
	},

	getDevicesPerPage: function(){
		var size = getDeviceSize();

		var thisSize = $(this).getSize();

		var devicesPer = {x: Math.floor( thisSize.x / size.x),
			y: Math.floor( thisSize.y / size.y )};

		return devicesPer.x * devicesPer.y;
	},

	pageOf: function(index){
		return Math.floor( index / this.devicesPerPage );
	},

	calculateTotalPages: function(){
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

	gotoPage: function(page){

		if(page < 0)
			page = 0;


		// attempt to go to page, but when totalPages has been calculated, verify that the page is a valid page
		if(this.totalPages == null){
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

		var startIndex = this.followDeviceIndex;

		var count = this.devicesPerPage;

		this.clearPage();

		this.deviceLoader.getDevices( startIndex, count, this.displayDevices.bind(this) );
	},

	displayDevices: function(devices){
		if(devices.length == 0)
			return;

		// if there were multiple page requests made, only display the devices of the last page requested
		if(this.followDeviceIndex != devices[0].options.index)
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

	loadImages: function(){
		// Load each image individually. This way if the user changes pages, 
		// the images previously requested stop getting loaded;
		// the images of the new page get loaded instead.
		if(this.devicesWithoutImages.length != 0){
			var device = this.devicesWithoutImages.splice(0,1)[0];

			var pass = {handle: this, device: device};

			pass.func = function(image){
				this.handle.loadImages();
			}.bind(pass);

			this.deviceLoader.getImage(device.options.index, pass.func, false);
		}
	},

	isPageValid: function(){
		// the page has already been set, but may have been set to a page higher than the highest possible page
		// check and fix if need be
		// totalPages is defined (this method is only called after total pages has been defined)

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

		// If the device being dragged is located inside this container,
		// clone the device at it's position because the device being dragged is being added to the body with fixed positioning for dragging
		if( i != -1 )
		{
			var clone = device.clone();

			this.deviceLoader.replaceDevice(clone);
			this.addDeviceBefore(clone, device.wrapper);
		}
	}
});
