var Evernote = new function() {
    var self = this,
        EVERNOTE_SERVER = "https://sandbox.evernote.com",
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
        AUTHORIZATION_URL = EVERNOTE_SERVER+"/OAuth.action",

        IGNORE_TAGS = [
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
        ],
        IGNORE_ATTRS = [
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

    this.tmp_oauth_token = null;
    this.oauth_verifier = null;
    this.oauth_token = null;
    this.noteStoreUrl = null;
    this.shardUrl = null;

    this.noteStoreTransport = null;
    this.noteStoreProtocol = null;
    this.noteStore = null;
    this.note = null;

    this.init = function() {

    };

    this.processXHR = function(url, method, callback) {
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
    
    this.buildOauthURL = function(url, method, parameters) {
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

    this.getAuthorization = function() {
        authWindow = window.open(AUTHORIZATION_URL+'?oauth_token='+self.tmp_oauth_token);
        window.addEventListener('message', function onMessage(evt) {
            authWindow.close();
            self.tmp_oauth_token = evt.data.oauth_token;
            self.oauth_verifier = evt.data.oauth_verifier;

            self.getAccessToken();
        });
    };

    this.login = function() {
        var postUrl = self.buildOauthURL(REQUEST_TOKEN_URL, 'POST', {
            oauth_callback : NOTES_APP_CALLBACK_URL,
            oauth_signature_method : OAUTH_SIGNATURE_METHOD
        });
        self.processXHR(postUrl, 'POST', function(xhr){
            if (xhr.responseText) {
                var responseData = {};
                var response = xhr.responseText.split('&');
                for (var i in response) {
                    var data = response[i].split('=');
                    responseData[data[0]] = data[1];
                }
                self.tmp_oauth_token = responseData['oauth_token'];

                self.getAuthorization();
            }
        });
    };

    this.getAccessToken = function() {
        var postUrl = self.buildOauthURL(REQUEST_TOKEN_URL, 'POST', {
            oauth_token : self.tmp_oauth_token, 
            oauth_verifier : self.oauth_verifier, 
            oauth_signature_method : OAUTH_SIGNATURE_METHOD
        });
        self.processXHR(postUrl, 'POST', function(xhr){
            var responseData = {};
            var response = xhr.responseText.split('&');
            for (var i in response) {
                var data = response[i].split('=');
                responseData[data[0]] = data[1];
            }
            self.oauth_token = responseData['oauth_token'];
            self.noteStoreUrl = responseData['edam_noteStoreUrl'];
            self.shardUrl = responseData['edam_webApiUrlPrefix'];

            var expires = new Date(responseData['edam_expires']).toString();
            document.cookie = 'oauth_token='+self.oauth_token+';expires='+expires+';';
            document.cookie = 'noteStoreUrl='+self.noteStoreUrl+';expires='+expires+';';
            document.cookie = 'shardUrl='+self.shardUrl+';expires='+expires+';';
            self.finishAuth();
        });
    };

    self.finishAuth = function() {
        document.body.classList.add('loggedin');

        self.noteStoreTransport = new Thrift.BinaryHttpTransport(decodeURIComponent(self.noteStoreUrl));
        self.noteStoreProtocol = new Thrift.BinaryProtocol(self.noteStoreTransport, false, false);
        self.noteStore = new NoteStoreClient(self.noteStoreProtocol, self.noteStoreProtocol);
    };
};
