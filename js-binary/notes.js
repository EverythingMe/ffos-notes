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
	$('fetchTags').addEventListener('click', fetchTags);
	$('search').addEventListener('click', findNotes);

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
			for (var i = 0; i < notebooks.length; i++) {
				$("listNotebooks").innerHTML += notebooks[i].name+"\n";
			}
		},
		onFailure: function(error) {
			alert("listNotebooks received error: "+error);
		}
	};
	noteStore.listNotebooks(decodeURIComponent(oauth_token), callback.onSuccess, callback.onFailure);
}

function fetchTags() {
	var callback = {
		onSuccess: function(tags) {
			for (var i = 0; i < tags.length; i++) {
				$("listTags").innerHTML += tags[i].name+"\n";
			}
		},
		onFailure: function(error) {
			alert("listTags received error: "+error);
		}
	};
	noteStore.listTags(decodeURIComponent(oauth_token), callback.onSuccess, callback.onFailure);
}

function findNotes() {
	var noteFilter = new NoteFilter();
		noteFilter.words = $('searchValue') || "started";

	var callback = {
		onSuccess: function(noteList) {
			var notes = noteList.notes;
			for (var i = 0; i < notes.length; i++) {
				$("findNotes").innerHTML += notes[i].title+"\n";
			}
		},
		onFailure: function(error) {
			alert(error);
		}
	};
	noteStore.findNotes(decodeURIComponent(oauth_token), noteFilter, 0, 20, callback.onSuccess, callback.onFailure);
}