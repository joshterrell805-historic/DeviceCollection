
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
			return;
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
	setOptions: function(options){
		this.options = options;
		this.spanTitle.set('text', options.topic);
		this.setImage(this.options.image);
	},
	initialize: function(options){
		this.parent();

		this.span.className = "Device";

		this.initInnerSpans();


		this.drag = new Drag($(this),{
			onStart:  Device.prototype.onStart.bind(this),
			onComplete: Device.prototype.onComplete.bind(this),
			onCancel: Device.prototype.onCancel.bind(this)
		});
		this.setOptions(options);
	},
	// wraps device if unwrapped, returns wrapper
	wrapDevice: function(){
		if (this.wrapper !== undefined)
			return this.wrapper;

		this.wrapper = new Element("span");
		this.wrapper.handle = this;
		this.wrapper.className = "DeviceWrapper";

		$(this).inject(this.wrapper);
		return this.wrapper;
	},
	initInnerSpans: function(){
		this.spanImage = new Element("span");
		this.spanImage.className = "Device_Image Device_InnerSpan";
		this.spanImage.inject(this.span);

		this.spanSpacing = new Element("span");
		this.spanSpacing.className = "Device_Spacing Device_InnerSpan";
		this.spanSpacing.inject(this.span);

		this.spanTitle = new Element("span");
		this.spanTitle.className = "Device_Title Device_InnerSpan";
		this.spanTitle.inject(this.span);
	},
	setImage: function(image){
		if(image === undefined)
			return;
		this.options.image = image;
		if(image == null){
			this.spanImage.text = new Span();
			$(this.spanImage.text).set('text',"No Image");
			$(this.spanImage.text).inject($(this.spanImage));
			$(this.spanImage.text).className = "Device_NoImage";
		}
		else{
			this.spanImage.image = image.clone();
			$(this.spanImage.image).inject($(this.spanImage));

		}

	},
	onStart: function(){
		deviceDirectory.startDrag(this);

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
	clone: function(){
		// clone the visible device but not the underlying device (the options)
		return new Device(this.options);
	},
	equals: function(device){
		return this.options === device.options;
	}
});

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

// popluates and loads devices from ifixit.com into deviceContainer
var DeviceLoader = new Class({
	initialize: function(){
	},
	_downloadImage: function(data, callback, consoleOutput){
		if(data.image.length == 0){
			callback(null);
			return;
		}
		var image = new Element("img",{
			src: data.image.text + ".thumbnail",
			events: {
				load: function(){
					callback(image);
				}
			}
		});



	},
	// callback has signature function( image )
	// image is the loaded image Element
	loadImage: function(topic, callback, consoleOutput){

		var topicRequest = new Request.JSONP({
			url: DeviceLoader.URL_topicRoot + "/" + topic,
			method: 'get',
			callbackKey: "jsonp",
			onFailure: function(xhr){ 
				if(consoleOutput)
					console.log('failed to complete Ajax request -- ' + xhr.status + ": " + xhr.statusText);
			}.bind(this),
			onException: function(headerName, value){
				if(consoleOutput)
					console.log('exception with header -- ' + headerName + ': ' + value);
			}.bind(this),
			onComplete: function(data){
				DeviceLoader.prototype._downloadImage.bind(this)(data, callback, consoleOutput);
			}.bind(this),
			onTimeout: function(){
				if(consoleOutput)
					console.log('timeout');
			}.bind(this),
			onRequest: function(url, script){
				if(consoleOutput)
					console.log('sending: ' + url);
			}.bind(this),
			onCancel: function(){
				if(consoleOutput)
					console.log('canceled');
			}.bind(this)
		});
		topicRequest.send();

	},
	getDevices: function(start, count, callback, consoleOutput){
		var topicRequest = new Request.JSONP({
			url: DeviceLoader.URL_topicsRoot,
			data: {
				offset: start,
				limit: count
			},
			method: 'get',
			callbackKey: "jsonp",
			onFailure: function(xhr){ 
				if(consoleOutput)
					console.log('failed to complete Ajax request -- ' + xhr.status + ": " + xhr.statusText);
			}.bind(this),
			onException: function(headerName, value){
				if(consoleOutput)
					console.log('exception with header -- ' + headerName + ': ' + value);
			}.bind(this),
			onComplete: function(data){
				var devices = [];
				for(var i = 0; i < data.length; i++){
					var options = data[i];
					devices.push( new Device(options) );
				}
				callback(devices);
			}.bind(this),
			onTimeout: function(){
				if(consoleOutput)
					console.log('timeout');
			}.bind(this),
			onRequest: function(url, script){
				if(consoleOutput)
					console.log('sending: ' + url);
			}.bind(this),
			onCancel: function(){
				if(consoleOutput)
					console.log('canceled');
			}.bind(this)
		});
		topicRequest.send();
	},
	getTotalDevices: function(callback){
		var v = function(devices){
			// still haven't found end of list
			if(this.breakIndex == -1){
				// found end of list
				if(devices.length == 0){
					this.breakIndex = this.lastIndex;
					this.step = (this.breakIndex + 1)/4;

					if(this.breakIndex < 2){
						this.callback(this.breakIndex);
					}
					else{
						this.lastIndex += this.dir * this.step;
						this.loader.getDevices(this.lastIndex, 1, v.bind(this), this.log);
					}
				}
				else{
					this.lastIndex = Math.pow(2, this.power++) - 1;
					this.loader.getDevices( this.lastIndex, 1, v.bind(this), this.log);
				}
			}
			else{
				if(this.step != 1){
					this.dir = devices.length != 0? 1 : -1;
					this.lastIndex += this.dir * this.step;
					this.step /= 2;
					this.loader.getDevices(this.lastIndex, 1, v.bind(this), this.log);
				}
				else{
					this.lastIndex += this.dir;
					this.loader.getDevices(this.lastIndex, 1, function(devices){
						// if exists
						if( devices.length != 0 )
							this.callback(this.lastIndex + 1);
						else
							this.callback(this.lastIndex);
					}.bind(this),
					this.log);
				}
			}
		}
		var data = {
			callback: callback,
			dir: -1,
			lastIndex: 0,
			breakIndex: -1,
			step: -1,
			power: 1,
			loader: this,
			log: false
		};
		this.getDevices(data.lastIndex,1,v.bind(data),data.log);
	}
});
DeviceLoader.URL_topicsRoot = "http://www.ifixit.com/api/1.0/topics";
DeviceLoader.URL_topicRoot = "http://www.ifixit.com/api/1.0/topic";
DeviceLoader.jsonp = "callback";

var PageBrowser = new Class({
	Extends: Span,
	initialize: function(){
		//var callbackContainer = null;
		//this.setCallbackContainer(callbackContainer);
		this.parent();

		this.initInnerElements();
		$(this).className =  'PageBrowser';
	},
	setTotalPages: function(num){
		this.pageOfSpan.setTotalPages(num);
	},
	setPage: function(num){
		this.pageOfSpan.setPage(num);
	},
	setCallbackContainer: function(callbackContainer){
		this.pagedContainer = callbackContainer;
	},
	initInnerElements: function(){
		var jumpSpan = new Span();
		$(jumpSpan).id = 'jumpSpan';
		jumpSpan.input = new Element("input",{
			type: 'number'
		});
		this.pageInput = jumpSpan.input;
		jumpSpan.button = new Element("input",{
			type: 'button',
			value: 'Jump',
			events:{
				click: function(){ 
					this.onJump(this.pageInput.get('value'));
				}.bind(this)
			}
		});

		$(jumpSpan.input).inject($(jumpSpan));
		$(jumpSpan.button).inject($(jumpSpan));

		// this.pageOfSpan
		// has methods: setPage(num), setTotalPages(num)
		this.pageOfSpan = new Span();
		$(this.pageOfSpan).id = 'pageOf';
		var s = new Span();
		$(s).set('text', 'Page ');
		$(s).inject($(this.pageOfSpan));

		this.pageOfSpan.page = new Span();
		$(this.pageOfSpan.page).inject($(this.pageOfSpan));

		s = new Span();
		$(s).set('text', ' of ');
		$(s).inject($(this.pageOfSpan));

		this.pageOfSpan.totalPages = new Span();
		$(this.pageOfSpan.totalPages).inject($(this.pageOfSpan));

		this.pageOfSpan.setPage = function(num){
			// assume num is valid number
			$(this.page).set('text', num);
		}.bind(this.pageOfSpan);

		this.pageOfSpan.setTotalPages = function(num){
			// assume num is valid nubmer
			$(this.totalPages).set('text', num);
		}.bind(this.pageOfSpan);

		// nextPrev span
		var nextPrevSpan = new Span();
		$(nextPrevSpan).id = 'nextPrev';

		var prev = new Element("input", {
			type: 'button',
			value: 'Prev',
			events:{
				click: PageBrowser.prototype.onPrev.bind(this)
			}
		});
		var next = new Element("input", {
			type: 'button',
			value: 'Next',
			events:{
				click: PageBrowser.prototype.onNext.bind(this)
			}
		});

		$(prev).inject($(nextPrevSpan));
		$(next).inject($(nextPrevSpan));

		var pageOfAndNextPrevSpan = new Span();
		$(pageOfAndNextPrevSpan).id = 'pageOfAndNextPrev';

		$(this.pageOfSpan).inject($(pageOfAndNextPrevSpan));
		$(nextPrevSpan).inject($(pageOfAndNextPrevSpan));

		$(jumpSpan).inject($(this));
		$(pageOfAndNextPrevSpan).inject($(this));

	},
	onNext: function(){
		if(this.pagedContainer != null)
			this.pagedContainer.nextPage();
	},
	onPrev: function(){
		if(this.pagedContainer != null)
			this.pagedContainer.prevPage();
	},
	onJump: function(page){
		if(this.pagedContainer != null)
			this.pagedContainer.jumpPage(page);
	}

});

constructBody = function(){
	var body = $(document.body);
	body.setStyle('overflow', 'hidden');

	var page = new Element("Div");
	page.className = "page";

	myDevices = new MyDevices();
	var loader = new DeviceLoader();
	var pageBrowser = new PageBrowser();
	deviceDirectory = new DeviceDirectory(loader,pageBrowser);
	pageBrowser.setCallbackContainer(deviceDirectory);

	$(myDevices).inject(page);
	$(deviceDirectory).inject(page);
	$(pageBrowser).inject(page);
	page.inject(body);
	window.addEvent('resize', DeviceDirectory.prototype.refresh.bind(deviceDirectory));
	window.addEvent('domready', DeviceDirectory.prototype.refresh.bind(deviceDirectory));
}
