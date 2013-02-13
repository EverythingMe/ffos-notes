function $(i){return document.getElementById(i)}

var ignoreTags = [
	'applet',
    'base',
    'basefont',
    'bgsound',
    'blink',
    'body',
    'button',
    'dir',
    'embed',
    'fieldset',
    'form',
    'frame',
    'frameset',
    'head',
    'html',
    'iframe',
    'ilayer',
    'isindex',
    'label',
    'layer,',
    'legend',
    'link',
    'marquee',
    'menu',
    'meta',
    'noframes',
    'noscript',
    'object',
    'optgroup',
    'option',
    'param',
    'plaintext',
    'script',
    'select',
    'style',
    'textarea',
    'xml'
];

var EVERNOTE_SERVER = "https://sandbox.evernote.com",
	OAUTH_CONSUMER_KEY = "israhack",
	OAUTH_CONSUMER_SECRET = "76034784d7dd7aa5",
	OAUTH_TOKEN_SECRET = "",
	NOTESTORE_HOST = EVERNOTE_SERVER,
	NOTESTORE_PORT = "443",
	NOTESTORE_PROTOCOL = "https",
	OAUTH_SIGNATURE_METHOD = "PLAINTEXT",
	NOTES_APP_CALLBACK_URL = "http://redirector.cloudfoundry.com/",
	REQUEST_TOKEN_URL = EVERNOTE_SERVER+"/oauth",
	ACCESS_TOKEN_URL = EVERNOTE_SERVER+"/oauth",
	AUTHORIZATION_URL = EVERNOTE_SERVER+"/OAuth.action";

var tmp_oauth_token = "",
	oauth_verifier = "",
	oauth_token = "",
	noteStoreUrl = "",
	shardUrl = "";

var noteStoreTransport,
	noteStoreProtocol,
	noteStore;

var currentNote;

var processXHR = function(url, method, callback) {
	var xhr = new XMLHttpRequest({mozSystem: true});
	xhr.open(method, url, true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (typeof callback == 'function') {
				callback(xhr);
			}
		}
	};
	xhr.send();
};

var buildOauthURL = function(url, method, parameters) {
	var accessor = {
		token: null,
		tokenSecret: null,
		consumerKey: OAUTH_CONSUMER_KEY,
		consumerSecret: OAUTH_CONSUMER_SECRET
	};

	var message = {
		action: url,
		method: method,
		parameters: parameters
	};

	OAuth.completeRequest(message, accessor);
	OAuth.SignatureMethod.sign(message, accessor);

	return url + '?' + OAuth.formEncode(message.parameters);
};

var getAuthorization = function() {
	console.group('getAuthorization');
	authWindow = window.open(AUTHORIZATION_URL+'?oauth_token='+tmp_oauth_token);
	window.addEventListener('message', function onMessage(evt) {
		authWindow.close();
		console.log(evt.data);
		console.log(evt.data.oauth_token);
		tmp_oauth_token = evt.data.oauth_token;
		oauth_verifier = evt.data.oauth_verifier;
		console.groupEnd();

		getAccessToken();
	});
};

var getTempToken = function() {
	console.group('getTempToken');
	var postUrl = buildOauthURL(REQUEST_TOKEN_URL, 'POST', {oauth_callback : NOTES_APP_CALLBACK_URL, oauth_signature_method : OAUTH_SIGNATURE_METHOD});
	console.log(postUrl);
	processXHR(postUrl, 'POST', function(xhr){
		console.log(xhr);
		console.log(xhr.responseText);
		console.groupEnd();
		if (xhr.responseText) {
			var responseData = {};
			var response = xhr.responseText.split('&');
			for (var i in response) {
				var data = response[i].split('=');
				responseData[data[0]] = data[1];
			}
			tmp_oauth_token = responseData['oauth_token'];

			getAuthorization();
		}
	});
};

var getAccessToken = function() {
	console.group('getAccessToken');
	var postUrl = buildOauthURL(REQUEST_TOKEN_URL, 'POST', {oauth_token : tmp_oauth_token, oauth_verifier : oauth_verifier, oauth_signature_method : OAUTH_SIGNATURE_METHOD});
	console.log(postUrl);
	processXHR(postUrl, 'POST', function(xhr){
		console.log(xhr);
		console.log(xhr.responseText);
		var responseData = {};
		var response = xhr.responseText.split('&');
		for (var i in response) {
			var data = response[i].split('=');
			responseData[data[0]] = data[1];
		}
		console.log(responseData);
		console.groupEnd();
		$('authResult').innerHTML = JSON.stringify(responseData, true, 4);
		oauth_token = responseData['oauth_token'];
		noteStoreUrl = responseData['edam_noteStoreUrl'];
		shardUrl = responseData['edam_webApiUrlPrefix'];
		console.log(responseData);

		var expires = new Date(responseData['edam_expires']).toString();
		document.cookie = 'oauth_token='+oauth_token+';expires='+expires;
		document.cookie = 'noteStoreUrl='+noteStoreUrl+';expires='+expires+';';
		document.cookie = 'shardUrl='+shardUrl+';expires='+expires+';';
		finishAuth();
	});
};

var finishAuth = function() {
	$('login').style.display = 'none';
	$('logged').style.display = 'block';

	noteStoreTransport = new Thrift.BinaryHttpTransport(decodeURIComponent(noteStoreUrl));
    noteStoreProtocol = new Thrift.BinaryProtocol(noteStoreTransport, false, false);
    noteStore = new NoteStoreClient(noteStoreProtocol, noteStoreProtocol);
};

window.onload = function() {
	$('login').addEventListener('click', getTempToken);
	$('fetchNotebooks').addEventListener('click', fetchNotebooks);
	$('fetchNotebook').addEventListener('click', getNotebook);
	$('fetchNote').addEventListener('click', getNote);
	$('saveNote').addEventListener('click', saveNote);

	// document.cookie = 'oauth_token=S%3Ds1%3AU%3D5a3fd%3AE%3D144065d8a8e%3AC%3D13caeac5e8e%3AP%3D185%3AA%3Disrahack%3AH%3D354f2adcef13d54e224b16408daea27d';
	// document.cookie = 'noteStoreUrl=https%3A%2F%2Fsandbox.evernote.com%2Fshard%2Fs1%2Fnotestore';
	// document.cookie = 'shardUrl=https%3A%2F%2Fsandbox.evernote.com%2Fshard%2Fs1%2F';
	if ((new RegExp("(?:^|;\\s*)" + escape('oauth_token').replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie) && (new RegExp("(?:^|;\\s*)" + escape('noteStoreUrl').replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie)) {
		oauth_token = document.cookie.replace(new RegExp("(?:^|.*;\\s*)" + escape('oauth_token').replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1");
		noteStoreUrl = document.cookie.replace(new RegExp("(?:^|.*;\\s*)" + escape('noteStoreUrl').replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1");
		shardUrl = document.cookie.replace(new RegExp("(?:^|.*;\\s*)" + escape('shardUrl').replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1");
		var data = {
			oauth_token : oauth_token,
			noteStoreUrl : noteStoreUrl,
			shardUrl : shardUrl
		};
		$('authResult').innerHTML = JSON.stringify(data, true, 4);
		finishAuth();
	}
}
function fetchNotebooks() {
	var callback = {
		onSuccess: function(notebooks) {
			$("listNotebooks").innerHTML += JSON.stringify(notebooks, true, 4)+"\n";
		},
		onFailure: function(error) {
			alert("listNotebooks received error: "+error);
		}
	};
	noteStore.listNotebooks(decodeURIComponent(oauth_token), callback.onSuccess, callback.onFailure);
}
function getNotebook() {
	var guid = $("notebookguid").value;
	if (guid.length == 0) {
		alert('You must enter a notebook guid');
		return;
	}
	var noteFilter = new NoteFilter();
		noteFilter.notebookGuid = guid;
	var callback = {
		onSuccess: function(notebook) {
			$("getNotebook").innerHTML += JSON.stringify(notebook, true, 4)+"\n";
		},
		onFailure: function(error) {
			alert("getNotebook received error: "+error);
		}
	};
	noteStore.findNotes(decodeURIComponent(oauth_token), noteFilter, 0, 20, callback.onSuccess, callback.onFailure);
}
function getNote() {
	var guid = $("noteguid").value;
	if (guid.length == 0) {
		alert('You must enter a note guid');
		return;
	}
	var callback = {
		onSuccess: function(note) {
			currentNote = note;
			var hashMap = {};
			var resMap = {};
			for (var r in note.resources) {
				var key = "",
					value = "",
					bytes = [];
				for (var i in note.resources[r].data.bodyHash) {
				    key += String("0123456789abcdef".substr((note.resources[r].data.bodyHash[i] >> 4) & 0x0F,1)) + "0123456789abcdef".substr(note.resources[r].data.bodyHash[i] & 0x0F,1);
				}
				for (var i in note.resources[r].data.body) {
				    value += String("0123456789abcdef".substr((note.resources[r].data.body[i] >> 4) & 0x0F,1)) + "0123456789abcdef".substr(note.resources[r].data.body[i] & 0x0F,1);
				}
				for(var i=0; i< value.length-1; i+=2){
				    bytes.push(parseInt(value.substr(i, 2), 16));
				}
				hashMap[key] = window.btoa(String.fromCharCode.apply(String, bytes));
				resMap[key] = note.resources[r].guid;
			}
			var html = "";
			html = enml.HTMLOfENML(note.content,hashMap);
			// html = note.content;
			console.log(note.content);
			$("notecontent").innerHTML = html;
			$("getNote").innerHTML = note.content;
			// $("getNote").innerHTML = JSON.stringify(hashMap, true, 4)+"\n";
			// $("getNote").innerHTML += "\n\n\n"+JSON.stringify(resMap, true, 4)+"\n";
		},
		onFailure: function(error) {
			alert("getNote received error: "+error);
		}
	};
	noteStore.getNote(decodeURIComponent(oauth_token), guid, true, true, true, true, callback.onSuccess,callback.onFailure);
}
function saveNote() {
	var html = $('notecontent').innerHTML;
	var writer = new XMLWriter;
	writer.startDocument('1.0', 'UTF-8', false);
	writer.write('<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">');
	writer.startElement('en-note');
	var parser = new SaxParser(function(cb) {
		cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
			if (ignoreTags.indexOf(elem) == -1) {
				if(elem == 'input') {
					var type = null;
					var checked = false;
					if(attrs) attrs.forEach(function(attr) {
						if(attr[0] == 'type') type = attr[1];
						if(attr[0] == 'checked') checked = attr[1];
					});
					if (type == 'checkbox') {
						writer.startElement('en-todo');
						if (checked) {
							writer.writeAttribute('checked', checked);
						}
						writer.endElement();
						return;
					}
				} else if(elem == 'img'){
					var type = null;
					var hash = null;
					var width = 0;
					var height = 0;

					// console.log(attrs);
					if(attrs) attrs.forEach(function(attr, i) {
						if (attr[0] == 'type') type = attr[1];
						if (attr[0] == 'src') delete attrs[i];
					});

					if(!type.match('image')) return;
					writer.startElement('en-media');
					if(attrs) attrs.forEach(function(attr) {
						writer.writeAttribute(attr[0], attr[1]);
					});
					writer.endElement();
					return;
				} else {
					writer.startElement(elem);
				}

				if(attrs) attrs.forEach(function(attr) {
					writer.writeAttribute(attr[0], attr[1]);
				});
			}
		});
		cb.onEndElementNS(function(elem, prefix, uri) {
			if (ignoreTags.indexOf(elem) == -1) {
				writer.endElement();
			}
		});

		cb.onCharacters(function(chars) {
			writer.text(chars);
		});
	});
	parser.parseString(html);
	writer.endElement('en-note');
	currentNote.content = writer.toString();
	$("putNote").innerHTML = writer.toString();
	var callback = {
		onSuccess: function(note) {
			$("updateNote").innerHTML += JSON.stringify(note, true, 4)+"\n";
		},
		onFailure: function(error) {
			alert("updateNote received error: "+error);
		}
	};
	noteStore.updateNote(decodeURIComponent(oauth_token), currentNote, callback.onSuccess, callback.onFailure);
}