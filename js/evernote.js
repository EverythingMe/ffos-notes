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

        TEXTS = null,

        NAME_CONFLICT_POSTFIX = " - 1",

        tmp_oauth_token,
        oauth_verifier,
        oauth_token,
        note_store_url,
        shard_url,
        expires,
        last_update_count,
        last_sync_time,

        syncChunks = [],
        syncMaxEntries = 100,

        queueList = {
            notebooks : [],
            notes : []
        },

        syncList = {
            notebooks : [],
            notes : [],
            expungedNotebooks : [],
            expungedNotes : []
        },

        noteStoreTransport,
        noteStoreProtocol,
        noteStore;

    this.init = function(user) {
        self.setupTexts();

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

        document.addEventListener('localechange', function(){
            navigator.mozL10n.ready(function(){
                self.setupTexts();
            });
        }, false);
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
            } else {
                alert(TEXTS.NOT_REACHED_EVERNOTE);
            }
        });
    };

    this.logout = function() {
        DB.destroy(function(){
            window.location.href = "?signedout";
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

            App.onLogin();
            
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
        App.startSync();
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
                if (syncChunks[i].notebooks && syncChunks[i].notebooks.length > 0) {
                    for (var j in syncChunks[i].notebooks) {
                        syncList.notebooks.push(syncChunks[i].notebooks[j]);
                    }
                }
                if (syncChunks[i].notes && syncChunks[i].notes.length > 0) {
                    for (var j in syncChunks[i].notes) {
                        syncList.notes.push(syncChunks[i].notes[j]);
                    }
                }
                if (syncChunks[i].expungedNotebooks && syncChunks[i].expungedNotebooks.length > 0) {
                    for (var j in syncChunks[i].expungedNotebooks) {
                        syncList.expungedNotebooks.push(syncChunks[i].expungedNotebooks[j]);
                    }
                }
                if (syncChunks[i].expungedNotes && syncChunks[i].expungedNotes.length > 0) {
                    for (var j in syncChunks[i].expungedNotes) {
                        syncList.expungedNotes.push(syncChunks[i].expungedNotes[j]);
                    }
                }

                last_update_count = syncChunks[i].updateCount;
                last_sync_time = syncChunks[i].currentTime;
            }
            self.processSyncChunkList();
        }
    };
    this.processSyncChunkList = function() {
        var chunk = null;
        console.log('[FxOS-Notes] this.processSyncList');
        console.log('[FxOS-Notes] this.processSyncList syncList.notebooks.length: '+syncList.notebooks.length);
        console.log('[FxOS-Notes] this.processSyncList syncList.notes.length: '+syncList.notes.length);
        console.log('[FxOS-Notes] this.processSyncList syncList.expungedNotebooks.length: '+syncList.expungedNotebooks.length);
        console.log('[FxOS-Notes] this.processSyncList syncList.expungedNotes.length: '+syncList.expungedNotes.length);
        if (syncList.notebooks.length > 0) {
            chunk = syncList.notebooks.pop();
            self.processNotebookChunk(chunk);
        } else if (syncList.notes.length > 0) {
            chunk = syncList.notes.pop();
            self.processNoteChunk(chunk);
        } else if (syncList.expungedNotebooks.length > 0) {
            chunk = syncList.expungedNotebooks.pop();
            self.processExpungedNotebookChunk(chunk);
        } else if (syncList.expungedNotes.length > 0) {
            chunk = syncList.expungedNotes.pop();
            self.processExpungedNoteChunk(chunk);
        } else {
            self.finishSync();
        }
    };
    this.processNotebookChunk = function(chunk) {
        console.log('[FxOS-Notes] this.processNotebookChunk (chunk): '+JSON.stringify(chunk));
        self.getNotebook(chunk.guid, function(notebook){
            console.log('[FxOS-Notes] self.getNotebook: '+JSON.stringify(notebook));
            DB.getNotebooks({guid: notebook.guid}, function(resultsGuid){
                console.log('[FxOS-Notes] DB.getNotebooks by guid: '+JSON.stringify(resultsGuid));
                DB.getNotebooks({name: notebook.name}, function(resultsName){
                    console.log('[FxOS-Notes] DB.getNotebooks by name: '+JSON.stringify(resultsName));
                    DB.getQueues({rel: "Notebook", rel_guid: notebook.guid}, function(resultsQueue){
                        console.log('[FxOS-Notes] DB.getQueues by notebook.guid: '+JSON.stringify(resultsQueue));
                        if (resultsQueue.length == 0) {
                            if (resultsGuid.length == 0) {
                                if (resultsName.length == 0) {
                                    App.getUser().newNotebook(notebook, self.processSyncChunkList);
                                } else {
                                    if (!resultsName[0].getGuid() || resultsName[0].getGuid() == notebook.guid) {
                                        resultsName[0].set(notebook, self.processSyncChunkList);
                                    } else {
                                        App.getUser().newNotebook(notebook, self.processSyncChunkList);
                                    }
                                }
                            } else {
                                resultsGuid[0].set(notebook, self.processSyncChunkList);
                            }
                        } else {
                            if (resultsQueue[0].getExpunge()) {
                                if (confirm(TEXTS.NOTEBOOK_DELETE_CONFLICT)) {
                                    App.getUser().newNotebook(notebook, function(){
                                        resultsQueue[0].remove(self.processSyncChunkList);
                                    });
                                } else {
                                    self.processSyncChunkList();
                                }
                            } else {
                                if (resultsGuid[0].getName() != notebook.name) {
                                    var txt = TEXTS.GENERIC_CONFLICT.replace("{{date}}", new Date(notebook.serviceUpdated));
                                        txt = txt.replace("{{object}}", "Notebook");
                                        txt = txt.replace("{{name}}", '"'+resultsGuid[0].getName()+'"');
                                    if (!confirm(txt)) {
                                        resultsGuid[0].set(notebook, function(){
                                            resultsQueue[0].remove(self.processSyncChunkList);
                                        });
                                    } else {
                                        self.processSyncChunkList();
                                    }
                                } else {
                                    resultsGuid[0].set(notebook, self.processSyncChunkList);
                                }
                            }
                        }
                    });
                });
            });
        });
    };
    this.processNoteChunk = function(chunk) {
        console.log('[FxOS-Notes] this.processNoteChunk (chunk): '+JSON.stringify(chunk));
        self.getNote(chunk.guid, function(note){
            console.log('[FxOS-Notes] self.getNote: '+JSON.stringify(note));
            DB.getNotes({guid: note.guid}, function(resultsNote){
                console.log('[FxOS-Notes] DB.getNotes: '+JSON.stringify(resultsNote));
                DB.getQueues({rel: "Note", rel_guid: note.guid}, function(resultsQueue){
                    console.log('[FxOS-Notes] DB.getQueues by note.guid: '+JSON.stringify(resultsQueue));
                    if (resultsQueue.length > 0) {
                        var txt = TEXTS.GENERIC_CONFLICT.replace("{{date}}", new Date(note.updated));
                            txt = txt.replace("{{object}}", "Note");
                            txt = txt.replace("{{name}}", '"'+resultsNote[0].getTitle()+'"');
                        if (!confirm(txt)) {
                            resultsNote[0].set(note, function(newNote){
                                if (resultsNote[0].isTrashed() && newNote.isActive()) {
                                    newNote.restore(self.processSyncChunkList);
                                } else if (!resultsNote[0].isTrashed() && !newNote.isActive()) {
                                    newNote.trash(self.processSyncChunkList);
                                } else {
                                    self.processSyncChunkList();
                                }
                            });
                        } else {
                            self.processSyncChunkList();
                        }
                    } else {
                        if (resultsNote.length > 0) {
                            resultsNote[0].set(note, function(newNote){
                                if (resultsNote[0].isTrashed() && newNote.isActive()) {
                                    newNote.restore(self.processSyncChunkList);
                                } else if (!resultsNote[0].isTrashed() && !newNote.isActive()) {
                                    newNote.trash(self.processSyncChunkList);
                                } else {
                                    self.processSyncChunkList();
                                }
                            });
                        } else {
                            DB.getNotebooks({guid: note.notebookGuid}, function(notebooks){
                                console.log('[FxOS-Notes] DB.getNotebooks: '+JSON.stringify(notebooks));
                                if (notebooks.length > 0) {
                                    notebooks[0].newNote(note, function(newNote){
                                        if (!newNote.isActive()) {
                                            newNote.trash();
                                        }
                                        self.processSyncChunkList();
                                    });
                                } else {
                                    self.processSyncChunkList();
                                }
                            });
                        }
                    }
                });
            });
        });
    };
    this.processExpungedNotebookChunk = function(chunk) {
        console.log('[FxOS-Notes] this.processExpungedNotebookChunk (chunk): '+JSON.stringify(chunk));
        DB.getNotebooks({guid: chunk}, function(notebook){
            if (notebook.length > 0) {
                notebook[0].remove();
            }
            self.processSyncChunkList();
        });
    };
    this.processExpungedNoteChunk = function(chunk) {
        console.log('[FxOS-Notes] this.processExpungedNoteChunk (chunk): '+JSON.stringify(chunk));
        DB.getNotes({guid: chunk}, function(note){
            if (note.length > 0) {
                note[0].remove();
            }
            self.processSyncChunkList();
        });
    };
    this.finishSync = function() {
        App.stopSync();
        App.updateUserData({
            last_update_count : last_update_count,
            last_sync_time : last_sync_time
        }, self.sendChanges);
    };

    this.sendChanges = function() {
        App.getQueues(function(queues){
            console.log('[FxOS-Notes] this.sendChanges: '+JSON.stringify(queues));
            if (queues.length > 0) {
                queueList = {
                    notebooks : [],
                    notes : []
                };
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
        App.startSync();
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
        if (queue.getRelContent().expunge) {
            self.deleteNotebook(queue.getRelContent().guid, function(){
                queue.remove(self.processQueueList);
            });
        } else {
            DB.getNotebooks({id : queue.getRelId()}, function(notebook){
                if (notebook.length > 0) {
                    notebook = notebook[0];

                    console.log('[FxOS-Notes] this.processNotebookQueue: '+JSON.stringify(notebook));
                    console.log('[FxOS-Notes] this.processNotebookQueue notebook.getGuid(): '+notebook.getGuid());
                    console.log('[FxOS-Notes] this.processNotebookQueue notebook.isTrashed(): '+notebook.isTrashed());
                    if (notebook.getGuid()) {
                        self.updateNotebook(notebook, function() {
                            queue.remove(self.processQueueList);
                        });
                    } else {
                        self.newNotebook(notebook, function() {
                            queue.remove(self.processQueueList);
                        });
                    }
                }
            });
        }
    };
    this.processNoteQueue = function(queue) {
        if (queue.getRelContent().expunge) {
            self.expungeNote(queue.getRelContent().guid, function(){
                queue.remove(self.processQueueList);
            })
        } else {
            DB.getNotes({id : queue.getRelId()}, function(note){
                if (note.length > 0) {
                    note = note[0];

                    console.log('[FxOS-Notes] this.processNoteQueue: '+JSON.stringify(note));
                    console.log('[FxOS-Notes] this.processNoteQueue note.getGuid(): '+note.getGuid());
                    console.log('[FxOS-Notes] this.processNoteQueue note.isTrashed(): '+note.isTrashed());
                    if (note.getGuid()) {
                        self.updateNote(note, function(newNote) {
                            if (note.isTrashed()) {
                                self.deleteNote(newNote.guid);
                            }
                            queue.remove(self.processQueueList);
                        });
                    } else {
                        self.newNote(note, function(newNote) {
                            if (note.isTrashed()) {
                                self.deleteNote(newNote.guid);
                            }
                            queue.remove(self.processQueueList);
                        });
                    }
                }
            });
        }
    };

    this.finishProcessQueueList = function() {
        App.stopSync();
        console.log('[FxOS-Notes] this.finishProcessQueueList');
        App.refershNotebooksList();
        App.refershNotebookView();
    };

    this.newNotebook = function(notebook, cbSuccess, cbError) {
        console.log('[FxOS-Notes] this.newNotebook');
        var notebookData = notebook.export();
        notebookData.name = notebookData.name.replace(/(^[\s]+|[\s]+$)/g, '');
        noteStore.createNotebook(oauth_token, new Notebook(notebook.export()), function(remoteNotebook) {
            notebook.set(remoteNotebook, cbSuccess);
            if (App.getUser().getLastUpdateCount() < remoteNotebook.updateSequenceNum) {
                App.updateUserData({
                    last_update_count : remoteNotebook.updateSequenceNum
                });
            }
        }, function(error){
            console.log('[FxOS-Notes] this.newNotebook error: '+ JSON.stringify(error));
            if (error.parameter == "Notebook.name") {
                notebook.set({
                    name: notebook.getName() + NAME_CONFLICT_POSTFIX
                }, function(notebook){
                    self.newNotebook(notebook, cbSuccess);
                });
            }
        });
    };
    this.updateNotebook = function(notebook, cbSuccess, cbError) {
        console.log('[FxOS-Notes] this.updateNotebook');
        var notebookData = notebook.export();
        notebookData.name = notebookData.name.replace(/(^[\s]+|[\s]+$)/g, '');
        notebookData.restrictions = new NotebookRestrictions(notebookData.restrictions);
        noteStore.updateNotebook(oauth_token, new Notebook(notebookData), function(remoteNotebook) {
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
        console.log('[FxOS-Notes] this.newNote: '+JSON.stringify(note));
        DB.getNotebooks({"id": note.getNotebookId()}, function(notebook) {
            if (notebook.length > 0) {
                notebook = notebook[0];
                note = note.set({notebookGuid : notebook.getGuid()});
                var noteData = note.export();
                for(var k in noteData.resources) {
                    var bodyArrayBuffer = ArrayBufferHelper.decode(noteData.resources[k].data.body);
                    var rawMD5str = md5(bodyArrayBuffer, false, true);
                    var bodyHashArrayBuffer = new ArrayBuffer(rawMD5str.length*2); // 2 bytes for each char
                    var arrayBufferView = new Uint16Array(bodyHashArrayBuffer);
                    for (var i=0, strLen=rawMD5str.length; i<strLen; i++) {
                        arrayBufferView[i] = rawMD5str.charCodeAt(i);
                    }
                    noteData.resources[k] = new Resource({
                        noteGuid : noteData.resources[k].noteGuid,
                        mime : noteData.resources[k].mime,
                        data : new Data({
                            body : bodyArrayBuffer,
                            bodyHash : bodyHashArrayBuffer,
                            size : noteData.resources[k].data.size
                        }),
                        attributes : new ResourceAttributes({
                            fileName : noteData.resources[k].attributes.fileName
                        })
                    });
                }
                noteData.title = noteData.title.replace(/(^[\s]+|[\s]+$)/g, '');
                noteStore.createNote(oauth_token, new Note(noteData), function(remoteNote) {
                    console.log('[FxOS-Notes] this.newNote (noteStore.createNote): '+JSON.stringify(remoteNote));
                    self.getNote(remoteNote.guid, function(remoteNote) {
                        console.log('[FxOS-Notes] this.newNote (self.getNote): '+JSON.stringify(remoteNote));
                        udatedNote = note.set(remoteNote);
                        if (App.getUser().getLastUpdateCount() < remoteNote.updateSequenceNum) {
                            App.updateUserData({
                                last_update_count : remoteNote.updateSequenceNum
                            });
                        }
                        cbSuccess(udatedNote);
                    }, cbError || cbSuccess);
                }, /*cbError || cbSuccess*/function(error){
                    console.log("ERROR: "+JSON.stringify(error));
                });
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
                udatedNote = note.set(remoteNote);
                if (App.getUser().getLastUpdateCount() < remoteNote.updateSequenceNum) {
                    App.updateUserData({
                        last_update_count : remoteNote.updateSequenceNum
                    });
                }
                cbSuccess(udatedNote);
            }, cbError || cbSuccess);
        }, cbError || cbSuccess);
    };
    this.deleteNote = function(guid, cbSuccess, cbError) {
        console.log('[FxOS-Notes] this.deleteNote: ' + JSON.stringify(guid, null, 4));
        noteStore.deleteNote(oauth_token, guid, cbSuccess, cbError||cbSuccess);
    };
    this.expungeNote = function(guid, cbSuccess, cbError) {
        console.log('[FxOS-Notes] this.expungeNote: ' + JSON.stringify(guid, null, 4));
        noteStore.expungeNote(oauth_token, guid, cbSuccess, cbError||cbSuccess);
    };
    this.getNote = function(guid, cbSuccess, cbError) {
        cbError = cbError || self.onError;
        noteStore.getNote(oauth_token, guid, true, true, true, true, cbSuccess, cbError);
    };
    this.getNotebook = function(guid, cbSuccess, cbError) {
        cbError = cbError || self.onError;
        noteStore.getNotebook(oauth_token, guid, cbSuccess, cbError);
    };

    this.enml2html = function(note) {
        var hashMap = {};
        var noteResources = note.data_resources || [];
        for (var r in noteResources) {
            var key = "",
                value = "",
                bytes = [];

            if (!noteResources[r].data.bodyHash) {
                hashMap[SparkMD5.ArrayBuffer.hash(ArrayBufferHelper.decode(noteResources[r].data.body))] = noteResources[r].data.body;
            } else {
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
        }
        return enml.HTMLOfENML(note.getContent(false),hashMap);
    };

    this.html2enml = function(html) {
        html = '<html><head></head><body>'+html+'</body></html>';
        return new ENMLofHTML().parse(html).getOutput();
    };

    this.onError = function() {};

    this.setupTexts = function() {
        TEXTS = {
            "NOT_REACHED_EVERNOTE": navigator.mozL10n.get("not-reached-evernote"),
            "NOTEBOOK_DELETE_CONFLICT": navigator.mozL10n.get("notebook-delete-conflict"),
            "GENERIC_CONFLICT": navigator.mozL10n.get("generic-conflict")
        };
    };

    function initNoteStore() {
        if (!noteStore) {
            noteStoreTransport = new Thrift.BinaryHttpTransport(note_store_url);
            noteStoreProtocol = new Thrift.BinaryProtocol(noteStoreTransport, false, false);
            noteStore = new NoteStoreClient(noteStoreProtocol, noteStoreProtocol);
        }
    }
};

var ENMLofHTML = function(){
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