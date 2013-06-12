var escapeString =  function(string){
	string.replace("\'", "\\\'");
	string.replace("\"", "\\\"");
	return string;
};
var unescapeString =  function(string){
	string.replace("\\\"", "\"");
	string.replace("\\\'", "\'");
	return string;
};

SavedDevices = new Class({ initialize: function(){
		this.openDatabase(SavedDevices.dbOptions);
	},
	openDatabase: function(options){
		this.database = openDatabase(options.name, options.version, options.description, options.estimatedSize);
		//this._dropTable();
		this._createTable();
	},

	// options object has members: 
	// query (string)
	// callback function(results) to get results of query
	_execute: function(options){
		this.database.transaction( function(tx){
			tx.executeSql(options.query, [], function(tx, results){
				if(options.callback != null)
					options.callback(results);
			});
		},//.options = options,
		function(eTx, error){
			console.log('database error (' + eTx.code + '): ' + eTx.message);
			if(error && error.message)
				console.log('\tmessage: ' + error.message);
		});
	},
	_dropTable: function(){
		var options = {
			query: 'DROP TABLE ' + SavedDevices.table.name,
			callback: null
		}
		console.log(options.query);
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
		console.log(options.query);
		this._execute(options);
	},
	addDevice: function(topic, containerIndex , deviceIndex){
		if(typeof containerIndex != "number")
			return;

		var options = {
			query: 'INSERT INTO ' + SavedDevices.table.name +
				' VALUES (\'' + escapeString(topic) + '\', ' + containerIndex + ', ' + deviceIndex + ')',
			callback: null
		};
		console.log(options.query);
		this._execute(options);
	},
	_decrementContainerIndex: function(containerIndex){
		var options = {
			query: 'UPDATE ' + SavedDevices.table.name + ' SET ' + 
				SavedDevices.table.cols[1].name + '=' + (containerIndex - 1) + ' WHERE ' +
				SavedDevices.table.cols[1].name + '=' + containerIndex,
			callback: null
		}
		console.log(options.query);
		this._execute(options);
	},
	removeDevice: function(topic){
		var options = {
			query: 'SELECT * FROM ' + SavedDevices.table.name + ' WHERE ' +
				SavedDevices.table.cols[0].name + '=\'' + escapeString(topic) + '\'',
			callback : function(results){

				if(results.rows.length != 1){
					console.log('Error: SavedDevices.removeDevice -- incorect rowlength returned'); 
					return;
				}

				var containerIndex = results.rows.item(0).containerIndex;

				var options2 = {
					query: 'DELETE FROM ' + SavedDevices.table.name + ' WHERE ' +
						SavedDevices.table.cols[1].name + '=' + containerIndex ,
					callback: function(){

						var options3 = {
							query: 'SELECT * FROM ' + SavedDevices.table.name + ' WHERE ' +
								SavedDevices.table.cols[1].name + '>' + containerIndex + '',
							callback: function(results){
								for( var i = 0; i < results.rows.length; i++)
									this._decrementContainerIndex(results.rows.item(i).containerIndex);
							}.bind(this)
						};

						console.log(options3.query);
						this._execute(options3);

					}.bind(this)
				};

				console.log(options2.query);
				this._execute(options2);

			}.bind(this)
		};

		console.log(options.query);
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

constructBody = function(){
	var body = $(document.body);
	body.setStyle('overflow', 'hidden');

	var page = new Element("Div");
	page.className = "page";

	var pageBrowser = new PageBrowser();
	var loader = new DeviceLoader();
	var savedDevices = new SavedDevices();

	myDevices = new MyDevices(loader,savedDevices);
	deviceDirectory = new DeviceDirectory(loader,pageBrowser);

	pageBrowser.setCallbackContainer(deviceDirectory);


	$(myDevices).inject(page);
	$(deviceDirectory).inject(page);
	$(pageBrowser).inject(page);
	page.inject(body);
	window.addEvent('resize', DeviceDirectory.prototype.refresh.bind(deviceDirectory));
	window.addEvent('domready', DeviceDirectory.prototype.refresh.bind(deviceDirectory));
}
