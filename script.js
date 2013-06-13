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
	var body = $(document.body);
	body.setStyle('overflow', 'hidden');

	page = new Element("Div");
	page.className = "page";

	devicesContainer = new Element("div");
	devicesContainer.id = "devicesContainer";

	pageBrowser = new PageBrowser();
	var loader = new DeviceLoader();
	var savedDevices = new SavedDevices();

	myDevices = new MyDevices(loader,savedDevices);
	myDevices.setScrollBarChangeStateCallback(resize);
	deviceDirectory = new DeviceDirectory(loader,pageBrowser);

	pageBrowser.setCallbackContainer(deviceDirectory);

	var titleDiv = new Element("div");
	titleDiv.className = "ContainerTitleDiv";
	devicesContainer.myDevicesTitleDiv = titleDiv;
	var titleSpan = new Element('span');
	titleSpan.className = "ContainerTitleSpan";
	titleSpan.set("text", 'Gear Bag');
	$(titleSpan).inject(titleDiv);

	$(titleDiv).inject(devicesContainer);

	$(myDevices).inject(devicesContainer);

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


	devicesContainer.margins = [];
	var marg = new Element("div");
	marg.className = "DevicesContainerVMargin";
	$(marg).inject(page);

	devicesContainer.margins.push(marg);

	$(devicesContainer).inject(page);

	var marg = new Element("div");
	marg.className = "DevicesContainerVMargin";
	$(marg).inject(page);

	devicesContainer.margins.push(marg);


	
	page.inject(body);
	window.addEvent('resize', resize );
	window.addEvent('domready', resize );
}

var resize = function(){

	$(devicesContainer).setStyle("width", "95%");
	$(devicesContainer).setStyle("height", "98%");

	var otherUsedY = $(pageBrowser).clientHeight + $(devicesContainer.deviceDirectoryTitleDiv).clientHeight + $(devicesContainer.myDevicesTitleDiv).clientHeight;

	var containerHeight = ($(devicesContainer).clientHeight - otherUsedY)/2;

	$(deviceDirectory).setStyle("width", "100%");
	$(deviceDirectory).setStyle("height", containerHeight+"px");

	$(myDevices).setStyle("width", "100%");
	$(myDevices).setStyle("height", containerHeight+"px" );

	myDevices.updateScrollBar(false);

	var deviceSize = getDeviceSize();

	var containerSize = $(deviceDirectory).getSize();

	var devicesPer = {x: Math.floor( containerSize.x / deviceSize.x ),
		y: Math.floor( containerSize.y / deviceSize.y)};

	var extraSpace = {x: containerSize.x - deviceSize.x * devicesPer.x,
		y: containerSize.y - deviceSize.y * devicesPer.y};

	var newSize = {x: containerSize.x - extraSpace.x,
		y: containerSize.y - extraSpace.y};

	if(myDevices.scrollBarEnabled)
		newSize.x += getScrollBarWidth();

	$(deviceDirectory).setStyle("width", newSize.x);
	$(myDevices).setStyle("width", newSize.x);

	$(devicesContainer).setStyle("width", newSize.x);
	$(pageBrowser).setStyle("width", newSize.x);

	var margin = ($(devicesContainer).clientWidth - newSize.x)/2;
	$(devicesContainer.myDevicesTitleDiv).setStyle("width", newSize.x);
	$(devicesContainer.myDevicesTitleDiv).setStyle("margin-left", margin);

	$(devicesContainer.deviceDirectoryTitleDiv).setStyle("width", newSize.x);
	$(devicesContainer.deviceDirectoryTitleDiv).setStyle("margin-left", margin);

	otherUsedY = $(pageBrowser).clientHeight + $(devicesContainer.deviceDirectoryTitleDiv).clientHeight + $(devicesContainer.myDevicesTitleDiv).clientHeight;
	$(devicesContainer).setStyle("height", newSize.y * 2 + otherUsedY);

	$(deviceDirectory).setStyle("height", newSize.y);
	$(myDevices).setStyle("height", newSize.y);

	var marginHeight = ($(page).clientHeight - $(devicesContainer).clientHeight) / 2;
	devicesContainer.margins[0].setStyle("height",  marginHeight);
	devicesContainer.margins[1].setStyle("height", marginHeight);


	 deviceDirectory.refresh();
}

var getDeviceSize = function(){
	if(getDeviceSize.size == undefined){
		var dev = new Device({topic:'Measure'});
		var wrapper = deviceDirectory.addDeviceToContainer(dev);
		getDeviceSize.size = wrapper.getSize();
		wrapper.destroy();
	}

	return getDeviceSize.size;
}

