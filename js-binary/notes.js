function $(i){return document.getElementById(i)}

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
	noteStoreUrl = "";

var noteStoreTransport,
	noteStoreProtocol,
	noteStore;

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

		var expires = new Date(responseData['edam_expires']).toString();
		document.cookie = 'oauth_token='+oauth_token+';expires='+expires;
		document.cookie = 'noteStoreUrl='+noteStoreUrl+';expires='+expires+';';
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
	$('fetchResource').addEventListener('click', getResource);

	document.cookie = 'oauth_token=S%3Ds1%3AU%3D5a3fd%3AE%3D144065d8a8e%3AC%3D13caeac5e8e%3AP%3D185%3AA%3Disrahack%3AH%3D354f2adcef13d54e224b16408daea27d';
	document.cookie = 'noteStoreUrl=https%3A%2F%2Fsandbox.evernote.com%2Fshard%2Fs1%2Fnotestore';
	if ((new RegExp("(?:^|;\\s*)" + escape('oauth_token').replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie) && (new RegExp("(?:^|;\\s*)" + escape('noteStoreUrl').replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie)) {
		oauth_token = document.cookie.replace(new RegExp("(?:^|.*;\\s*)" + escape('oauth_token').replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1");
		noteStoreUrl = document.cookie.replace(new RegExp("(?:^|.*;\\s*)" + escape('noteStoreUrl').replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1");
		var data = {
			oauth_token : oauth_token,
			noteStoreUrl : noteStoreUrl
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
			$("notecontent").innerHTML = note.content;
			console.log(note.content);
			$("getNote").innerHTML = JSON.stringify(note.resources, true, 4)+"\n";
		},
		onFailure: function(error) {
			alert("getNote received error: "+error);
		}
	};
	noteStore.getNote(decodeURIComponent(oauth_token), guid, true, true, false, false, callback.onSuccess,callback.onFailure);
}
function getResource() {
	var guid = $("resourceguid").value;
	if (guid.length == 0) {
		alert('You must enter a note guid');
		return;
	}
	var callback = {
		onSuccess: function(resource) {
			$("getResource").innerHTML = JSON.stringify(resource, true, 4)+"\n";
		},
		onFailure: function(error) {
			alert("getResource received error: "+error);
		}
	};
	noteStore.getResource(decodeURIComponent(oauth_token), guid, true, false, true, true, callback.onSuccess, callback.onFailure);
}