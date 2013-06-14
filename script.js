var getScrollBarWidth = function(){

	if(getScrollBarWidth.width !== undefined)
		return getScrollBarWidth.width;

	var innerDiv = new Element("div", {
		styles:{
			display: 'inline-block',
			height: '200px',
			width: '200px'
		}
	});

	var div1 = new Element("div", {
		styles:{
			display: 'inline-block',
			height: '100px',
			'overflow-y': 'auto'
		}
	});

	var div2 = new Element("div",{
		styles:{
			display: 'inline-block',
			height: '100px',
			'overflow-y': 'none'
		}
	});

	$(innerDiv).clone().inject($(div1));
	$(innerDiv).inject($(div2));

	$(div1).inject($(document.body));
	$(div2).inject($(document.body));

	var width = div2.clientWidth - div1.clientWidth;

	$(div1).destroy();
	$(div2).destroy();

	getScrollBarWidth.width = width;

	return width;
}

constructBody = function(){
	if(Browser.chrome !== true)
		alert('This application utilizes some tools only available to some browsers. Try opening this page in Google Chrome for full functionality');

	var body = $(document.body);
	body.setStyle('overflow', 'hidden');
	body.className = "noSelect";

	page = new Element("Div");
	page.className = "page";

	devicesContainer = new Element("div");
	devicesContainer.id = "devicesContainer";

	
	var loader = new DeviceLoader();
	var savedDevices = new SavedDevices();

	// My Devices / Gear Bag
	myDevices = new MyDevices(loader,savedDevices);

	var titleDiv = new Element("div");
	titleDiv.className = "ContainerTitleDiv";
	devicesContainer.myDevicesTitleDiv = titleDiv;

	var titleSpan = new Element('span');
	titleSpan.className = "ContainerTitleSpan";
	titleSpan.set("text", 'Gear Bag');
	$(titleSpan).inject(titleDiv);

	$(titleDiv).inject(devicesContainer);
	$(myDevices).inject(devicesContainer);
	
	// Device Directory
	pageBrowser = new PageBrowser();
	deviceDirectory = new DeviceDirectory(loader,pageBrowser);
	pageBrowser.setCallbackContainer(deviceDirectory);

	titleDiv = new Element("div");
	titleDiv.className = "ContainerTitleDiv";
	titleDiv.id = "DeviceDirectoryTitleDiv";
	devicesContainer.deviceDirectoryTitleDiv = titleDiv;

	titleSpan = new Element('span');
	titleSpan.className = "ContainerTitleSpan";
	titleSpan.set("text", 'Device Directory');
	$(titleSpan).inject(titleDiv);

	$(titleDiv).inject(devicesContainer);
	$(deviceDirectory).inject(devicesContainer);
	$(pageBrowser).inject(devicesContainer);


	// Devices Container & Top and Bottom Margins
	devicesContainer.margins = [];

	var marg = new Element("div");
	marg.className = "DevicesContainerVMargin";
	devicesContainer.margins.push(marg);

	// push top marg
	$(marg).inject(page);

	// then container
	$(devicesContainer).inject(page);

	var marg = new Element("div");
	marg.className = "DevicesContainerVMargin";
	devicesContainer.margins.push(marg);

	// then bottom marg
	$(marg).inject(page);

	page.inject(body);


	// full screen image only visible in non-fullscreen mode
	// (because page gets fullscreened, not body)
	fullScreenImage = new Element("img",{
		src: "FullScreen.png",
		id: "Fullscreen_Image",
		events:{
			click: function(){ $(page).webkitRequestFullScreen(); }
		}
	});
	fullScreenImage.tips = new FloatingTips($(fullScreenImage), {
		position: 'right',
		content: function(elm){
			return "Go to Fullscreen mode";
		}
	});

	$(fullScreenImage).inject(body);

	window.addEvent('resize', resize );
	window.addEvent('domready', resize );
}

var resize = function(){

	// set all sizes to max
	$(devicesContainer).setStyle("width", "95%");
	$(devicesContainer).setStyle("height", "98%");

	var otherUsedY = $(pageBrowser).clientHeight + $(devicesContainer.deviceDirectoryTitleDiv).clientHeight + $(devicesContainer.myDevicesTitleDiv).clientHeight;
	var deviceContainerHeight = $(devicesContainer).clientHeight - otherUsedY;
	var deviceContainerWidth = $(devicesContainer).clientWidth;

	var deviceSize = getDeviceSize();

	var rowsAvailable = Math.floor( deviceContainerHeight / deviceSize.y );

	var myDevicesHeight = null;
	var deviceDirectoryHeight = null;

	var maxDevicesPerRow = Math.floor( deviceContainerWidth / deviceSize.x );

	var myDevRows = Math.ceil( $(myDevices).getChildren().length / maxDevicesPerRow );
	myDevRows = myDevRows == 0? 1 : myDevRows;

	// with sizes at max, compute how many devices can fit
	if(rowsAvailable == 2){
		myDevicesHeight = deviceDirectoryHeight = deviceSize.y;
		var myDevicesRowsUsed = 1;
	}
	else{
		
		var rowsRemaining = rowsAvailable - myDevRows;

		if(rowsRemaining <= 0){
			var myDevicesRowsUsed = rowsAvailable - 1;
			var devDirRows = 1;
		}
		else{
			var myDevicesRowsUsed = myDevRows;
			var devDirRows = rowsRemaining;
		}

		myDevicesHeight = (myDevicesRowsUsed) * deviceSize.y;
		deviceDirectoryHeight = devDirRows * deviceSize.y;
	}

	$(deviceDirectory).setStyle("height", deviceDirectoryHeight);
	$(myDevices).setStyle("height", myDevicesHeight);

	var width = maxDevicesPerRow * deviceSize.x + (myDevRows > myDevicesRowsUsed ? getScrollBarWidth() : 0);
	$(deviceDirectory).setStyle("width", width);
	$(pageBrowser).setStyle("width", width);
	$(myDevices).setStyle("width", width);

	var margin = ( deviceContainerWidth - width)/2;
	$(devicesContainer.myDevicesTitleDiv).setStyle("width", width);
	$(devicesContainer.myDevicesTitleDiv).setStyle("margin-left", margin);

	$(devicesContainer.deviceDirectoryTitleDiv).setStyle("width", width);
	$(devicesContainer.deviceDirectoryTitleDiv).setStyle("margin-left", margin);

	otherUsedY = $(pageBrowser).clientHeight + $(devicesContainer.deviceDirectoryTitleDiv).clientHeight + $(devicesContainer.myDevicesTitleDiv).clientHeight;
	$(devicesContainer).setStyle("height", myDevicesHeight + deviceDirectoryHeight + otherUsedY);

	var marginHeight = ($(page).clientHeight - $(devicesContainer).clientHeight) / 2;
	devicesContainer.margins[0].setStyle("height",  marginHeight);
	devicesContainer.margins[1].setStyle("height", marginHeight);

	// refresh incase less or more devices, might need to page change
	deviceDirectory.refresh();
}

var getDeviceSize = function(){

	if(getDeviceSize.size == undefined){
		var dev = new Device({topic:'Measure', categories: []});
		var wrapper = deviceDirectory.addDeviceToContainer(dev);
		getDeviceSize.size = wrapper.getSize();
		wrapper.destroy();
	}

	return getDeviceSize.size;
}

