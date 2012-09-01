$(window).on('app-ready',function(){
	var mime = require('mime');
	var path = require('path');
	var fs = require('fs');
	var Buffer = require('buffer').Buffer;
	var crypto = require('crypto');
	var net = require('net');
	function log(item){
			$('#output').append('debug: '+JSON.stringify(item)+'<br>');
	}
	var mainSocket = io.connect('http://localhost:9000');
	
	mainSocket.on('connect',function(){
		log('main socket connection established');
	});
	
	mainSocket.on('error',function(){
		log('FAILED TO CONNECT TO MAIN SERVER');
	});
	
	mainSocket.on('sendFileRequest',function(data){
		var isAccepted = confirm('from: '+data.from+'\nname: '+data.file.name+'\nsize: '+data.file.size+'\ntype: '+data.file.type);
		if(isAccepted){
			window.frame.openDialog({
					type:'save',
					acceptTypes: { all:['*.*'] },
					initialValue:data.file.name,
					multiSelect:false,
					dirSelect:false
					},function(err,file){
						if(!err){
							$('#filePathInput').text(file);
							log('file accepted');
							mainSocket.emit('fileAccepted',{from:data.from});
						}
			});
		}
	});
	mainSocket.on('fileAccepted',function(){
		var server = net.createServer(function (socket) {
		log('someone connected...');
			var currentPos = 0;
			var bufferSize = 512;
			var file = path.resolve($('#filePathInput').html());
			var size = fs.statSync(file).size;
			var rs = fs.createReadStream(file, { bufferSize: bufferSize,  encoding: 'binary' });
			rs.on('data',function(data){
				socket.write(data,'binary');
			});
			rs.on('end',function(){
				socket.end();
			});
			
		}).listen(9090);
		mainSocket.emit('fileServerStarted');
	});
	
	mainSocket.on('fileServerStarted',function(data){
		var fileSocket = net.createConnection(9090, data.ip);
		var filePath = path.resolve($('#filePathInput').html());
		var ws = fs.createWriteStream(filePath,{encoding: 'binary' });
		fileSocket.on('connect',function(){
			log('connected to sender');
		});
		
		fileSocket.on('data',function(data){
			ws.write(data,'binary');
		});
		fileSocket.on('end',function(){
			log('transfer complete');
			ws.end();
			fileSocket.end();
		});
	});
	
	$('#loginSubmit').click(function(){
		var random  = Math.round(Math.random(1000)*1000);
		var login = $('#loginField').val()+random;
		$('#loginField').add('#loginSubmit').hide();
		$('#userRequestField').add('#fileSelector').show();
		mainSocket.emit('setLogin',login);
		$('#loginHeader').html(login);
	});
	

	$('#fileSelector').click(function(){
		 window.frame.openDialog({
			type:'open',
			acceptTypes: { all:['*.*'] },
			multiSelect:false,
			dirSelect:false
		},function(err,files){
			if(!err){
				var file = files[0];
				var type = mime.lookup(file);
				var stat = fs.statSync(file);
				var name = path.basename(file);
				var to = $('#userRequestField').val();
				$('#filePathInput').html(file);
				log({name:name,size:stat.size,type:type});
				mainSocket.emit('sendFileRequest',{to:to,file:{name:name,size:stat.size,type:type}});
			}
		});
	});
	
	log('js is ok');
});