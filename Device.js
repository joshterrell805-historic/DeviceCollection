
var Device = new Class({

	Extends: Span,

	initialize: function(options){
		this.parent();
		this.span.className = "Device";

		this.span.handle = this;

		this.initInnerSpans();

		this.drag = new Drag($(this),{
			onStart:  Device.prototype.onStart.bind(this),
			onComplete: Device.prototype.onComplete.bind(this),
			onCancel: Device.prototype.onCancel.bind(this)
		});

		this.setOptions(options);
	},

	setOptions: function(options){
		this.options = options;
		this.spanTitle.set('text', options.topic);

		var title = this.options.topic;

		if(Device.tips === undefined){
			Device.tips = new FloatingTips($(this), {
				content: function(devWrapper){ 
					return devWrapper.handle.options.topic;
				}
			});
		}
		else
			Device.tips.attach($(this));

		this.setImage(this.options.image);
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

	wrapDevice: function(){
		if (this.wrapper !== undefined)
			return this.wrapper;

		this.wrapper = new Element("span");
		this.wrapper.handle = this;
		this.wrapper.className = "DeviceWrapper";

		$(this).inject(this.wrapper);

		return this.wrapper;
	},


	setImage: function(image){

		// no parameter or image already been set
		if(image === undefined || this.spanImage.image != undefined)
			return;


		// set "No Image"
		if(image === null){
			// remove current image if there is one
			if(this.options.image != undefined){
				$(this.spanImage.image).dispose();
				this.spanImage.image = null;
			}

			if(this.spanImage.text == null){
				this.spanImage.text = new Span();
				$(this.spanImage.text).inject($(this.spanImage));
			}

			$(this.spanImage.text).className = "Device_NoImage";
			$(this.spanImage.text).set('text',"No Image");
		}
		// set passed image
		else{

			// don't set the exact same image
			if(this.spanImage.image != null && this.spanImage.image.src == image.src)
				return;

			// get rid of "No Image" or "Loading" span if there is one
			if(this.spanImage.text != null){
				$(this.spanImage.text).destroy();
				this.spanImage.text = null;
			}
				
			// get rid of current image if there is one
			if(this.spanImage.image != null)
				this.spanImage.image.destroy();

			this.spanImage.image = image.clone();
			$(this.spanImage.image).inject($(this.spanImage));
		}

		this.options.image = image;
	},

	
	failedDownload: function(){
		if(this.spanImage.text == null){
			this.spanImage.text = new Span();
			$(this.spanImage.text).inject($(this.spanImage));
		}

		$(this.spanImage.text).set('text',"Failed");
		$(this.spanImage.text).className = "Device_Failed";
	},

	// display "Loading.."
	loadingImage: function(){
		if(this.spanImage.text == null){
			this.spanImage.text = new Span();
			$(this.spanImage.text).inject($(this.spanImage));
		}

		$(this.spanImage.text).set('text',"Loading..");
		$(this.spanImage.text).className = "Device_Loading";

	},

	onStart: function(){
		myDevices.startDrag(this);
		deviceDirectory.startDrag(this);

		$(this.wrapper).dispose();

		$(this).setStyle('position', 'absolute');
		$(this).inject($(document.body));

		window.draggedDevice = $(this);
	},

	onComplete: function(){
		// no need to "unset" absolute positioning, device is recreated

		myDevices.dropDevice(this);

		Device.tips.detach($(this));

		$(this).destroy();

		window.draggedDevice = undefined;
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
