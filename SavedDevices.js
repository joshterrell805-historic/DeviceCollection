var escapeString =  function(string){
	string.replace("\'", "\\\'");
	string.replace("\"", "\\\"");
	return string;
}

var unescapeString =  function(string){
	string.replace("\\\"", "\"");
	string.replace("\\\'", "\'");
	return string;
}

SavedDevices = new Class({ 

	initialize: function(){
		this.openDatabase(SavedDevices.dbOptions);
	},

	logSQLCallsOnConsole: false,
	
	queue: [],

	executing: false,

	// used when removing a device from the database. Removing a device from the database requires multiple sql calls which block all other calls until completed
	removeIndex: null,
	removeQueue: null,

	openDatabase: function(options){
		this.database = openDatabase(options.name, options.version, options.description, options.estimatedSize);
		//this._dropTable();
		this._createTable();
	},

	_dropTable: function(){
		var options = {
			query: 'DROP TABLE ' + SavedDevices.table.name,
			callback: null
		}

		this._execute(options);
	},

	_createTable: function(){
		var options = {
			query: 'CREATE TABLE IF NOT EXISTS ' + SavedDevices.table.name + '(' + 
				SavedDevices.table.cols[0].name + " " + SavedDevices.table.cols[0].sqlDescription + "," +
				SavedDevices.table.cols[1].name + " " + SavedDevices.table.cols[1].sqlDescription + "," +
				SavedDevices.table.cols[2].name + " " + SavedDevices.table.cols[2].sqlDescription + ")",
			callback: null
		};

		this._execute(options);
	},

	addDevice: function(topic, containerIndex , deviceIndex){
		if(typeof containerIndex != "number" || typeof deviceIndex != "number")
			return;

		var options = {
			query: 'INSERT INTO ' + SavedDevices.table.name +
				' VALUES (\'' + escapeString(topic) + '\', ' + containerIndex + ', ' + deviceIndex + ')',
			callback: null
		};

		this._execute(options);
	},

	// options object has members: 
	// query (string)
	// callback function(results) to get results of query
	_execute: function(options){

		// add query to end of remove queue if it has the operating remove queue's id
		if(this.removeIndex !== null && options.rIndex !== undefined && options.rIndex == this.removeIndex)
			this.removeQueue.push(options);
		else
			this.queue.push(options);

		this._checkQueue();
	},

	_checkQueue: function(){

		if(this.executing)
			return;

		var options = null;

		// currently removing a device, get query options from the remove queue
		if(this.removeIndex !== null){

			if(this.removeQueue.length == 0){
				console.log('Error: SavedDevices._checkQueue -- this.removeIndex !== null yet this.removeQueue.length == 0. Forgot to call this._finishRemove?');
				return;
			}

			this.executing = true;
			options = this.removeQueue.splice(0,1)[0];
		}

		// not removing a device, get query options from normal queue
		else if(this.queue.length != 0){

			this.executing = true;
			options = this.queue.splice(0,1)[0];

			// this is a remove query. Block all other queries from occuring until this remove command has finished
			if(options.rIndex !== undefined)
				this._initRemove(options.rIndex);

		}
		// queue length is zero, nothing to do, go home
		else{
			window.onbeforeunload = undefined;
			return;
		}

		window.onbeforeunload = SavedDevices.beforeUnload;


		this._prepare(options);
		this._real_execute(options);
	},

	_initRemove: function(rIndex){
		this.removeIndex = rIndex;
		this.removeQueue = [];
	},

	_finishRemove: function(){
		this.removeIndex = null;
		this.removeQueue = null;
		this._checkQueue();
	},

	_prepare: function(options){
		options.handle = this;
		options.userCallback = options.callback;

		// wrap the callback so that savedDevices is told when the query is done executing and also check the queue for more queries
		options.callback = this._callbackWrapper.bind(options);
	},

	_callbackWrapper: function(results){
		this.handle.executing = false;

		if(this.userCallback != null)
			this.userCallback(results);

		this.handle._checkQueue();
	},

	_real_execute: function(options){

		if(this.logSQLCallsOnConsole === true)
			console.log(options.query);

		this.database.transaction( function(tx){
			tx.executeSql(options.query, [], function(tx, results){
				options.callback(results);
			});
		},

		// there was a database error
		// i.e. command was formated wrong, can't access database, etc.
		function(eTx, error){
			console.log('database error (' + eTx.code + '): ' + eTx.message);
			if(error && error.message)
				console.log('\tmessage: ' + error.message);

			alert('Critical Database Error!\nCheck javascript console for more information');
		});
	},

	updateDeviceIndex: function(topic, deviceIndex){
		var options = {
			query: 'UPDATE ' + SavedDevices.table.name + ' SET ' + 
				SavedDevices.table.cols[2].name + '=' + deviceIndex + ' WHERE ' +
				SavedDevices.table.cols[0].name + '=\'' + escapeString(topic) + '\'',
			callback: null
		}

		this._execute(options);
	},

	_decrementContainerIndex: function(containerIndex, pass){

		var options = {
			query: 'UPDATE ' + SavedDevices.table.name + ' SET ' + 
				SavedDevices.table.cols[1].name + '=' + (containerIndex - 1) + ' WHERE ' +
				SavedDevices.table.cols[1].name + '=' + containerIndex,
			callback: function(results){
				if(--this.decrementsRemaining == 0)
					this.callback();
			}.bind(pass)
		}

		options.rIndex = pass.rIndex;

		this._execute(options);
	},

	// each of a remove's options gets a rIndex to indicate which remove it belongs to
	// when a remove is executing, only those options with the running rIndex are allowed to pass through
	// the remove is responsible for calling this._finishRemove() when it has completed
	_generateRemoveIndex: function(){
		if(this._generateRemoveIndex.limit === undefined)
			this._generateRemoveIndex.limit = 10000; // inclusive

		if(this._generateRemoveIndex.index === undefined)
			this._generateRemoveIndex.index = 0;
		
		else if( ++this._generateRemoveIndex.index > this._generateRemoveIndex.limit )
			this._generateRemoveIndex.index = 0;
		
		return this._generateRemoveIndex.index;
	},

	removeDevice: function(topic){
		// remove is a multi-query operation which must be queued like all others
		// if someone adds a device in the middle of a remove, the database gets screwed.
		// for a remove, wait until all remove-queries are done, then execute next query.

		var rIndex = this._generateRemoveIndex();

		// the multiple steps of a remove:
		// selete the device, delete it
		// select all the devices with a higher index than the removed device
		// decrement their column indicies

		// select the device
		options = {
			query: 'SELECT * FROM ' + SavedDevices.table.name + ' WHERE ' +
				SavedDevices.table.cols[0].name + '=\'' + escapeString(topic) + '\'',

			callback : function(results){

				if(results.rows.length != 1){
					console.log('Error: SavedDevices.removeDevice -- incorect rowlength returned'); 
					return;
				}

				var containerIndex = results.rows.item(0).containerIndex;

				// delete the device
				var options2 = {

					query: 'DELETE FROM ' + SavedDevices.table.name + ' WHERE ' +
						SavedDevices.table.cols[1].name + '=' + containerIndex ,

					callback: function(results){

						// decrement column indicies
						var options3 = {
							query: 'SELECT * FROM ' + SavedDevices.table.name + ' WHERE ' +
								SavedDevices.table.cols[1].name + '>' + containerIndex + '',
							callback: function(results){
								// call _finishRemove when done updating all devices
								if(results.rows.length == 0)
									this._finishRemove();
								var pass = {decrementsRemaining: results.rows.length, callback: this._finishRemove.bind(this), rIndex: rIndex};
								for( var i = 0; i < results.rows.length; i++)
									this._decrementContainerIndex(results.rows.item(i).containerIndex, pass);
							}.bind(this)
						};

						options3.rIndex = rIndex;

						this._execute(options3);

					}.bind(this)
				};

				options2.rIndex = rIndex;

				this._execute(options2);

			}.bind(this)
		};

		options.rIndex = rIndex;

		this._execute(options);
	},

	// callback of form callback( device[] )
	// where a device object has members: containerIndex , deviceIndex, topic
	getDevices: function(pCallback){

		var options = {

			query: 'SELECT * FROM ' + SavedDevices.table.name,

			callback: function(results){
				var devices = []
				for(var i = 0; i < results.rows.length; i++){
					var device = results.rows.item(i);
					device.topic = unescapeString(device.topic);
					devices.push(device);
				}
					
				pCallback(devices);
			}
		}

		this._execute(options);
	}

});

SavedDevices.beforeUnload = function(){
	return "The local database is being updated with your devices. To avoid data corruption, please return to the page and try exiting again in a few seconds.";
};

SavedDevices.dbOptions = {
	name: 'gearbag',
	version: '1.0',
	description: 'users\'s devices',
	estimatedSize: 5000
};

SavedDevices.table = {
	name: 'devices',
	cols: [{
		name:'topic', 
		sqlDescription: 'varchar(255) NOT NULL PRIMARY KEY'
	},{
		name: 'containerIndex',
		sqlDescription: 'int NOT NULL'
	},{
		name: 'deviceIndex',
		sqlDescription: 'int NOT NULL'
	}]
};
