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

        tmp_oauth_token,
        oauth_verifier,
        oauth_token,
        note_store_url,
        shard_url,
        expires,
        last_update_count,
        last_sync_time,

        syncChunks = [],
        syncElements = 0,
        syncMaxEntries = 100,

        queueList = {
            notebooks : [],
            notes : []
        },

        noteStoreTransport,
        noteStoreProtocol,
        noteStore;

    this.init = function(user) {
        console.log('[FxOS-Notes] Evernote.init()');
        console.log('[FxOS-Notes] isValidEvernoteUser: '+user.isValidEvernoteUser());
        if (user.isValidEvernoteUser()) {
            markLoggedin();

            oauth_token = user.getOauthToken();
            note_store_url = user.getNoteStoreUrl();
            shard_url = user.getShardUrl();
            expires = user.getExpires();
            last_update_count = user.getLastUpdateCount();
            last_sync_time = user.getLastSyncTime();

            console.log('[FxOS-Notes] oauth_token: '+oauth_token);
            console.log('[FxOS-Notes] note_store_url: '+note_store_url);
            console.log('[FxOS-Notes] shard_url: '+shard_url);
            console.log('[FxOS-Notes] expires: '+expires);
            console.log('[FxOS-Notes] last_update_count: '+last_update_count);
            console.log('[FxOS-Notes] last_sync_time: '+last_sync_time);

            initNoteStore();

            if (last_sync_time == 0) {
                self.startFullSync();
            } else {
                self.getSyncState();
            }
        } else {
            $("button-evernote-login").style.display = "block";
            $("button-evernote-login").addEventListener("click", Evernote.login);
        }
    };

    this.processXHR = function(url, method, callback) {
        var xhr = new XMLHttpRequest({mozSystem: true});
        xhr.open(method, url, true);
        console.log('[FxOS-Notes] processXHR url: '+url);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                console.log('[FxOS-Notes] processXHR xhr: '+JSON.stringify(xhr));
                console.log('[FxOS-Notes] processXHR xhr.responseText: '+xhr.responseText);
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
                tmp_oauth_token = responseData['oauth_token'];

                self.getAuthorization();
            }
        });
    };

    this.getAuthorization = function() {
        authWindow = window.open(AUTHORIZATION_URL+'?oauth_token='+tmp_oauth_token);
        window.addEventListener('message', function onMessage(evt) {
            authWindow.close();
            tmp_oauth_token = evt.data.oauth_token;
            oauth_verifier = evt.data.oauth_verifier;

            self.getAccessToken();
        });
    };

    this.getAccessToken = function() {
        var postUrl = self.buildOauthURL(REQUEST_TOKEN_URL, 'POST', {
            oauth_token : tmp_oauth_token, 
            oauth_verifier : oauth_verifier, 
            oauth_signature_method : OAUTH_SIGNATURE_METHOD
        });
        self.processXHR(postUrl, 'POST', function(xhr){
            var responseData = {};
            var response = xhr.responseText.split('&');
            for (var i in response) {
                var data = response[i].split('=');
                responseData[data[0]] = data[1];
            }
            oauth_token = decodeURIComponent(responseData['oauth_token']);
            note_store_url = decodeURIComponent(responseData['edam_noteStoreUrl']);
            shard_url = decodeURIComponent(responseData['edam_webApiUrlPrefix']);
            expires = responseData['edam_expires'];
            
            self.finishAuthenticationProcess();
        });
    };

    this.finishAuthenticationProcess = function() {
        markLoggedin();

        var userStoreTransport = new Thrift.BinaryHttpTransport(EVERNOTE_SERVER + '/edam/user');
        var userStoreProtocol = new Thrift.BinaryProtocol(userStoreTransport, false, false);
        var userStore = new UserStoreClient(userStoreProtocol, userStoreProtocol);

        initNoteStore();

        last_update_count = App.getUser().getLastUpdateCount();
        last_sync_time = App.getUser().getLastSyncTime();

        var callback = self.getSyncState;
        if (last_sync_time == 0) {
            callback = self.startFullSync;
        }

        userStore.getUser(oauth_token, function(user){
            delete user.id;
            user.oauth_token = oauth_token;
            user.note_store_url = note_store_url;
            user.shard_url = shard_url;
            user.expires = expires;
            user.last_update_count = last_update_count;
            user.last_sync_time = last_sync_time;
            
            App.updateUserData(user, callback);
        }, self.onError);
    };

    this.getSyncState = function() {
        noteStore.getSyncState(oauth_token, function(state) {
            console.log('[FxOS-Notes] getSyncState: '+JSON.stringify(state));
            console.log('[FxOS-Notes] state.fullSyncBefore: '+state.fullSyncBefore);
            console.log('[FxOS-Notes] last_sync_time: '+last_sync_time);
            console.log('[FxOS-Notes] state.updateCount: '+state.updateCount);
            console.log('[FxOS-Notes] last_update_count: '+last_update_count);
            if (state.fullSyncBefore > last_sync_time) {
                self.startFullSync();
            } else if(state.updateCount == last_update_count) {
                self.sendChanges();
            } else {
                self.startIncrementalSync();
            }
        }, self.onError);
    };

    this.getSyncChunk = function(usn, max, full, c) {
        noteStore.getSyncChunk(oauth_token, usn, max, full, c, self.onError);
    };

    this.startIncrementalSync = function() {
        self.getSyncChunk(last_update_count, syncMaxEntries, false, self.processSyncChunk);
    };
    this.startFullSync = function() {
        self.getSyncChunk(0, syncMaxEntries, true, self.processSyncChunk);
    };
    this.processSyncChunk = function(chunk) {
        syncChunks.push(chunk);
        if (chunk.chunkHighUSN < chunk.updateCount) {
            self.getSyncChunk(chunk.chunkHighUSN, syncMaxEntries, true, self.processSyncChunk);
        } else {
            console.log('[FxOS-Notes] processSyncChunk: '+JSON.stringify(syncChunks));
            for(var i in syncChunks) {
                if (syncChunks[i].notebooks) {
                    syncElements += syncChunks[i].notebooks.length;
                }
                if (syncChunks[i].notes) {
                    syncElements += syncChunks[i].notes.length;
                }
                last_update_count = syncChunks[i].updateCount;
                last_sync_time = syncChunks[i].currentTime;
                if (syncChunks[i].notebooks && syncChunks[i].notebooks.length > 0) {
                    for (var j in syncChunks[i].notebooks) {
                        DB.getNotebooks({guid: syncChunks[i].notebooks[j].guid}, function(results){
                            console.log('[FxOS-Notes] DB.getNotebooks: '+JSON.stringify(results));
                            if (results.length == 0) {
                                App.getUser().newNotebook(syncChunks[i].notebooks[j], self.processNotebookNotes);
                            } else {
                                results[0].set(syncChunks[i].notebooks[j], self.processNotebookNotes);
                            }
                        });
                    }
                } else {
                    self.processNotesChunk();
                }
            }
        }
    };
    this.processNotesChunk = function(notebook) {
        for(var i in syncChunks) {
            for (var j in syncChunks[i].notes) {
                if (!notebook) {
                    self.getNote(syncChunks[i].notes[j].guid, function(note){
                        console.log('[FxOS-Notes] self.getNote: '+JSON.stringify(note));
                        DB.getNotes({guid: note.guid}, function(results){
                            console.log('[FxOS-Notes] DB.getNotes: '+JSON.stringify(results));
                            if (results.length > 0) {
                                results[0].set(note);
                            } else {
                                DB.getNotebooks({guid: note.notebookGuid}, function(notebooks){
                                    console.log('[FxOS-Notes] DB.getNotebooks: '+JSON.stringify(notebooks));
                                    if (notebooks.length > 0) {
                                        notebooks[0].newNote(note);
                                    }
                                })
                            }
                            self.finishSync();
                        });
                    });
                } else {
                    notebookGuid = notebook.getGuid();
                    if (syncChunks[i].notes[j].notebookGuid == notebookGuid) {
                        self.getNote(syncChunks[i].notes[j].guid, function(note){
                            console.log('[FxOS-Notes] self.getNote: '+JSON.stringify(note));
                            DB.getNotes({guid: note.guid}, function(results){
                                console.log('[FxOS-Notes] DB.getNotes: '+JSON.stringify(results));
                                if (results.length == 0) {
                                    notebook.newNote(note);
                                } else {
                                    results[0].set(note);
                                }
                                self.finishSync();
                            });
                        });
                    }
                }
            }
        }
    };
    this.processNotebookNotes = function(notebook) {
        syncElements = syncElements-1;
        self.processNotesChunk(notebook);
    };
    this.finishSync = function() {
        syncElements = syncElements-1;
        if (syncElements == 0) {
            App.updateUserData({
                last_update_count : last_update_count,
                last_sync_time : last_sync_time
            });
            self.sendChanges();
        }
    };

    this.sendChanges = function() {
        App.getQueues(function(queues){
            console.log('[FxOS-Notes] this.sendChanges: '+JSON.stringify(queues));
            if (queues.length > 0) {
                for(var i in queues) {
                    if (queues[i].getRel() == 'Notebook') {
                        queueList.notebooks.push(queues[i]);
                    } else if (queues[i].getRel() == 'Note') {
                        queueList.notes.push(queues[i]);
                    }
                }
            }
            self.processQueueList();
        });
    };

    this.processQueueList = function() {
        var queue = null;
        console.log('[FxOS-Notes] this.processQueueList');
        console.log('[FxOS-Notes] this.processQueueList queueList.notebooks.length: '+queueList.notebooks.length);
        console.log('[FxOS-Notes] this.processQueueList queueList.notes.length: '+queueList.notes.length);
        if (queueList.notebooks.length > 0) {
            queue = queueList.notebooks.pop();
            console.log('[FxOS-Notes] this.processQueueList notebook queue: '+JSON.stringify(queue));
            self.processNotebookQueue(queue);
        } else if (queueList.notes.length > 0) {
            queue = queueList.notes.pop();
            console.log('[FxOS-Notes] this.processQueueList note queue: '+JSON.stringify(queue));
            self.processNoteQueue(queue);
        } else {
            self.finishProcessQueueList();
        }
    };
    this.processNotebookQueue = function(queue) {
        var notebook = new Models.Notebook(queue.getRelContent());
        console.log('[FxOS-Notes] this.processNotebookQueue: '+JSON.stringify(notebook));
        if (notebook.getGuid()) {
            if (notebook.isTrashed()) {
                self.deleteNotebook(notebook, function() {
                    queue.remove();
                    self.processQueueList();
                });
            } else {
                self.updateNotebook(notebook, function() {
                    queue.remove();
                    self.processQueueList();
                });
            }
        } else {
            self.newNotebook(notebook, function() {
                queue.remove();
                self.processQueueList();
            });
        }
    };
    this.processNoteQueue = function(queue) {
        var note = new Models.Note(queue.getRelContent());
        console.log('[FxOS-Notes] this.processNoteQueue: '+JSON.stringify(note));
        console.log('[FxOS-Notes] this.processNoteQueue note.getGuid(): '+note.getGuid());
        console.log('[FxOS-Notes] this.processNoteQueue note.isTrashed(): '+note.isTrashed());
        if (note.getGuid()) {
            if (note.isTrashed()) {
                self.deleteNote(note, function() {
                    queue.remove();
                    self.processQueueList();
                });
            } else {
                self.updateNote(note, function() {
                    queue.remove();
                    self.processQueueList();
                });
            }
        } else {
            self.newNote(note, function() {
                queue.remove();
                self.processQueueList();
            });
        }
    };

    this.finishProcessQueueList = function() {
        console.log('[FxOS-Notes] this.finishProcessQueueList');
        App.refershNotebooksList();
        App.refershNotebookView();
    };

    this.newNotebook = function(notebook, cbSuccess, cbError) {
        console.log('[FxOS-Notes] this.newNotebook');
        noteStore.createNotebook(oauth_token, new Notebook(notebook.export()), function(remoteNotebook) {
            notebook.set(remoteNotebook, cbSuccess);
            if (App.getUser().getLastUpdateCount() < remoteNotebook.updateSequenceNum) {
                App.updateUserData({
                    last_update_count : remoteNotebook.updateSequenceNum
                });
            }
        }, cbError || cbSuccess);
    };
    this.updateNotebook = function(notebook, cbSuccess, cbError) {
        console.log('[FxOS-Notes] this.updateNotebook');
        noteStore.updateNotebook(oauth_token, new Notebook(notebook.export()), function(remoteNotebook) {
            notebook.set(remoteNotebook, cbSuccess);
            if (App.getUser().getLastUpdateCount() < remoteNotebook.updateSequenceNum) {
                App.updateUserData({
                    last_update_count : remoteNotebook.updateSequenceNum
                });
            }
        }, cbError || cbSuccess);
    };
    this.deleteNotebook = function(notebook, cbSuccess, cbError) {
        console.log('[FxOS-Notes] this.deleteNotebook: ' + JSON.stringify(notebook, null, 4));
        cbSuccess();
    };

    this.newNote = function(note, cbSuccess, cbError) {
        console.log('[FxOS-Notes] this.newNote');
        DB.getNotebooks({"id": note.getNotebookId()}, function(notebook) {
            if (notebook.length > 0) {
                notebook = notebook[0];
                note = note.set({notebookGuid : notebook.getGuid()});
                noteStore.createNote(oauth_token, new Note(note.export()), function(remoteNote) {
                    self.getNote(remoteNote.guid, function(remoteNote) {
                        note.set(remoteNote);
                        if (App.getUser().getLastUpdateCount() < remoteNote.updateSequenceNum) {
                            App.updateUserData({
                                last_update_count : remoteNote.updateSequenceNum
                            });
                        }
                        cbSuccess(remoteNote);
                    }, cbError || cbSuccess);
                }, cbError || cbSuccess);
            } else {
                cbSuccess();
            }
        }, cbError || cbSuccess);
    };
    this.updateNote = function(note, cbSuccess, cbError) {
        console.log('[FxOS-Notes] this.updateNote');
        noteStore.updateNote(oauth_token, new Note({
            guid : note.getGuid(),
            title : note.getName(),
            content : note.getContent()
        }), function(remoteNote) {
            self.getNote(remoteNote.guid, function(remoteNote) {
                note.set(remoteNote);
                if (App.getUser().getLastUpdateCount() < remoteNote.updateSequenceNum) {
                    App.updateUserData({
                        last_update_count : remoteNote.updateSequenceNum
                    });
                }
                cbSuccess(remoteNote);
            }, cbError || cbSuccess);
        }, cbError || cbSuccess);
    };
    this.deleteNote = function(note, cbSuccess, cbError) {
        console.log('[FxOS-Notes] this.deleteNote: ' + JSON.stringify(note, null, 4));
        cbSuccess();
    };
    this.getNote = function(guid, cbSuccess, cbError) {
        cbError = cbError || self.onError;
        noteStore.getNote(oauth_token, guid, true, true, true, true, cbSuccess, cbError);
    };

    this.enml2html = function(note) {
        var hashMap = {};
        var noteResources = note.getResources() || [];
        for (var r in noteResources) {
            var key = "",
                value = "",
                bytes = [];
            for (var i in noteResources[r].data.bodyHash) {
                key += String("0123456789abcdef".substr((noteResources[r].data.bodyHash[i] >> 4) & 0x0F,1)) + "0123456789abcdef".substr(noteResources[r].data.bodyHash[i] & 0x0F,1);
            }
            for (var i in noteResources[r].data.body) {
                value += String("0123456789abcdef".substr((noteResources[r].data.body[i] >> 4) & 0x0F,1)) + "0123456789abcdef".substr(noteResources[r].data.body[i] & 0x0F,1);
            }
            for(var i=0; i< value.length-1; i+=2){
                bytes.push(parseInt(value.substr(i, 2), 16));
            }
            hashMap[key] = window.btoa(String.fromCharCode.apply(String, bytes));
        }
        return enml.HTMLOfENML(note.getContent(),hashMap);
    };

    this.html2enml = function(html) {
        html = '<html><head></head><body>'+html+'</body></html>';
        return ENMLofHTML.parse(html).getOutput();
    };

    this.onError = function() {};

    function markLoggedin() {
        document.body.classList.add('loggedin');
        $("button-evernote-login").style.display = "none";
    }

    function initNoteStore() {
        if (!noteStore) {
            noteStoreTransport = new Thrift.BinaryHttpTransport(note_store_url);
            noteStoreProtocol = new Thrift.BinaryProtocol(noteStoreTransport, false, false);
            noteStore = new NoteStoreClient(noteStoreProtocol, noteStoreProtocol);
        }
    }
};

var ENMLofHTML = new function(){
    var self = this;

    this.output = '';
    this.input = '';
    this.dom = null;

    this.parser = new DOMParser();

    this.writer = new XMLWriter;

    this.IGNORE_TAGS = [
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
    this.IGNORE_ATTRS = [
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

    this.parse = function(text) {
        self.input = text;
        self.dom = self.parser.parseFromString(text, 'text/html');
        if (self.dom.childNodes.length > 0) {
            self.writer.startDocument('1.0', 'UTF-8', false);
            self.writer.write('<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">');
            self.writer.write('<en-note>');
            for (var i=0; i < self.dom.childNodes.length; i++) {
                self.parseChild(self.dom.childNodes[i]);
            }
            self.writer.write('</en-note>');
        }

        return self;
    },

    this.parseChild = function(child) {
        if (child.nodeType == Node.ELEMENT_NODE) {
            var tag = child.tagName.toLowerCase();
            if (tag == 'br') {
                self.writer.write('<' + tag);
                if (child.attributes.length > 0) {
                    self.parseAttributes(child.attributes);
                }
                self.writer.write('/>');
            } else if (tag == 'img') {
                self.writer.write('<en-media');
                if (child.attributes.length > 0) {
                    self.parseAttributes(child.attributes);
                }
                self.writer.write('>');
                self.writer.write('</en-media>');
            } else if (tag == 'input') {
                if (child.getAttribute('type') == 'checkbox') {
                    self.writer.write('<en-todo');
                    if (child.getAttribute('checked')) {
                        self.writer.write(' checked="' + child.getAttribute('checked') + '"');
                    }
                    self.writer.write('>');
                    self.writer.write('</en-todo>');
                }
            } else {
                if (self.IGNORE_TAGS.indexOf(tag) == -1) {
                    self.writer.write('<' + tag);
                    if (child.attributes.length > 0) {
                        self.parseAttributes(child.attributes);
                    }
                    self.writer.write('>');
                }
                if (child.childNodes.length > 0) {
                    for (var i=0; i < child.childNodes.length; i++) {
                        self.parseChild(child.childNodes[i]);
                    }
                }
                if (self.IGNORE_TAGS.indexOf(tag) == -1) {
                    self.writer.write('</' + tag + '>');
                }
            }
        }

        if (child.nodeType == Node.TEXT_NODE) {
            self.writer.write(child.nodeValue);
        }
    },

    this.parseAttributes = function(attributes) {
        for (var i=0; i < attributes.length; i++) {
            if (self.IGNORE_ATTRS.indexOf(attributes[i].nodeName) == -1) {
                self.writer.write(' ' + attributes[i].nodeName + '="' + attributes[i].nodeValue + '"');
            }
        }
    },

    this.getOutput = function() {
        self.output = self.writer.toString();
        return self.output;
    }
};