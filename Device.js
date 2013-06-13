var Device = new Class({
	Extends: Span,
	setOptions: function(options){
		this.options = options;
		this.spanTitle.set('text', options.topic);


		var title = this.options.topic;
		if(Device.tips === undefined)
			Device.tips = new FloatingTips($(this), {
				content: function(elm){ 
					var text = elm.handle.options.topic;
			
			/*
					if(elm.handle.options.categories.length != 0)
						text += " Categories: ";
			
					for(var i = 0; i < elm.handle.options.categories.length; i++){
			
						text += elm.handle.options.categories[i];
			
						if(i != elm.handle.options.categories.length - 1)
							text += ", ";
					}
					*/

					return text;
				}
				//text: function(){return "categories";},
			});
		else
			Device.tips.attach($(this));


		this.setImage(this.options.image);
	},
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
			if(this.spanImage.text == null){
				this.spanImage.text = new Span();
				$(this.spanImage.text).inject($(this.spanImage));
			}

			$(this.spanImage.text).set('text',"No Image");
			$(this.spanImage.text).className = "Device_NoImage";
		}
		else{

			if(this.spanImage.image != null && this.spanImage.image.src == image.src)
				return;

			if(this.spanImage.text != null){
				$(this.spanImage.text).destroy();
				this.spanImage.text = null;
			}
				
			if(this.spanImage.image != null)
				this.spanImage.image.destroy();

			this.spanImage.image = image.clone();
			$(this.spanImage.image).inject($(this.spanImage));
		}
	},
	loadingImage: function(){
		// don't display "Loading.." if there's already an image
		if(this.spanImage.image != null)
			return;

		if(this.spanImage.text == null){
			this.spanImage.text = new Span();
			$(this.spanImage.text).inject($(this.spanImage));
		}

		$(this.spanImage.text).set('text',"Loading");
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
