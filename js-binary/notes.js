function $(i){return document.getElementById(i)}
var MyParser = {
	output : '',
	input : '',
	dom : null,

	parser : new DOMParser(),

	writer : new XMLWriter,

	parse : function(text) {
		this.input = text;
		this.dom = this.parser.parseFromString(text, 'text/html');
		if (this.dom.childNodes.length > 0) {
			this.writer.startDocument('1.0', 'UTF-8', false);
			this.writer.write('<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">');
			this.writer.write('<en-note>');
			for (var i=0; i < this.dom.childNodes.length; i++) {
				this.parseChild(this.dom.childNodes[i]);
			}
			this.writer.write('</en-note>');
		}
	},

	parseChild : function(child) {
		if (child.nodeType == Node.ELEMENT_NODE) {
			var tag = child.tagName.toLowerCase();
			if (tag == 'br') {
				this.writer.write('<' + tag);
				if (child.attributes.length > 0) {
					this.parseAttributes(child.attributes);
				}
				this.writer.write('/>');
			} else if (tag == 'img') {
				this.writer.write('<en-media');
				if (child.attributes.length > 0) {
					this.parseAttributes(child.attributes);
				}
				this.writer.write('>');
				this.writer.write('</en-media>');
			} else if (tag == 'input') {
				if (child.getAttribute('type') == 'checkbox') {
					this.writer.write('<en-todo');
					if (child.getAttribute('checked')) {
						this.writer.write(' checked="' + child.getAttribute('checked') + '"');
					}
					this.writer.write('>');
					this.writer.write('</en-todo>');
				}
			} else {
				if (ignoreTags.indexOf(tag) == -1) {
					this.writer.write('<' + tag);
					if (child.attributes.length > 0) {
						this.parseAttributes(child.attributes);
					}
					this.writer.write('>');
				}
				if (child.childNodes.length > 0) {
					for (var i=0; i < child.childNodes.length; i++) {
						this.parseChild(child.childNodes[i]);
					}
				}
				if (ignoreTags.indexOf(tag) == -1) {
					this.writer.write('</' + tag + '>');
				}
			}
		}

		if (child.nodeType == Node.TEXT_NODE) {
			this.writer.write(child.nodeValue);
		}
	},

	parseAttributes : function(attributes) {
		for (var i=0; i < attributes.length; i++) {
			if (ignoreAttributes.indexOf(attributes[i].nodeName) == -1) {
				this.writer.write(' ' + attributes[i].nodeName + '="' + attributes[i].nodeValue + '"');
			}
		}
	},

	getOutput : function() {
		this.output = this.writer.toString();
		return this.output;
	}
};

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

var ignoreAttributes = [
    'id',
    'class',
    'onclick',
    'ondblclick',
    'on*',
    'accesskey',
    'data',
    'dynsrc',
    'tabindex',
    'src'
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

var currentNote = "test";

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
	authWindow = window.open(AUTHORIZATION_URL+'?oauth_token='+tmp_oauth_token);
	window.addEventListener('message', function onMessage(evt) {
		authWindow.close();
		tmp_oauth_token = evt.data.oauth_token;
		oauth_verifier = evt.data.oauth_verifier;

		getAccessToken();
	});
};

var getTempToken = function() {
	var postUrl = buildOauthURL(REQUEST_TOKEN_URL, 'POST', {oauth_callback : NOTES_APP_CALLBACK_URL, oauth_signature_method : OAUTH_SIGNATURE_METHOD});
	processXHR(postUrl, 'POST', function(xhr){
		$('authResult').innerHTML = JSON.stringify(xhr, true, 4);
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
	var postUrl = buildOauthURL(REQUEST_TOKEN_URL, 'POST', {oauth_token : tmp_oauth_token, oauth_verifier : oauth_verifier, oauth_signature_method : OAUTH_SIGNATURE_METHOD});
	processXHR(postUrl, 'POST', function(xhr){
		var responseData = {};
		var response = xhr.responseText.split('&');
		for (var i in response) {
			var data = response[i].split('=');
			responseData[data[0]] = data[1];
		}
		$('authResult').innerHTML = JSON.stringify(responseData, true, 4);
		oauth_token = responseData['oauth_token'];
		noteStoreUrl = responseData['edam_noteStoreUrl'];
		shardUrl = responseData['edam_webApiUrlPrefix'];

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

	document.cookie = 'oauth_token=S%3Ds1%3AU%3D5a3fd%3AE%3D144065d8a8e%3AC%3D13caeac5e8e%3AP%3D185%3AA%3Disrahack%3AH%3D354f2adcef13d54e224b16408daea27d';
	document.cookie = 'noteStoreUrl=https%3A%2F%2Fsandbox.evernote.com%2Fshard%2Fs1%2Fnotestore';
	document.cookie = 'shardUrl=https%3A%2F%2Fsandbox.evernote.com%2Fshard%2Fs1%2F';
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
	MyParser.parse(html);
	currentNote.content = MyParser.getOutput();
	$("putNote").innerHTML = currentNote.content;
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