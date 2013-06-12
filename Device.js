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
		//console.log(this.options.topic);
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
		myDevices.startDrag(this);
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
