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
