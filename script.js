





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
