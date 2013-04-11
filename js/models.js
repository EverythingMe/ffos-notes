var Models = new function() {
    this.User = function(initOptions) {
        var self = this;
        
        this.data_id = "";
        this.data_username = "";
        this.data_name = "";
        this.data_date_created = "";
        this.data_metadata = {};
        this.data_last_update_count = 0;
        this.data_last_sync_time = 0;
        this.data_oauth_token = "";
        this.data_note_store_url = "";
        this.data_shard_url = "";
        this.data_expires = 0;
        
        function init(options) {
            updateObject(self, options);
            validate();
        }
        
        this.set = function(options, cbSuccess, cbError) {
            updateObject(self, options);
            validate();
            
            DB.updateUser(self, cbSuccess, cbError);
            
            return self;
        };
        
        this.newNotebook = function(options, cbSuccess, cbError) {
            options.user_id = self.getId();
            
            var notebook = new Models.Notebook(options);
            DB.addNotebook(notebook, function(){
                cbSuccess && cbSuccess(notebook);
            });
        };
        
        this.getNotebooks = function(cbSuccess, cbError) {
            DB.getNotebooks({"user_id": self.data_id, "trashed": false}, cbSuccess, cbError);
        };
        
        this.getTrashedNotes = function(cbSuccess, cbError) {
            DB.getNotes({"trashed": true}, cbSuccess, cbError);
        };
        
        this.getNotes = function(filters, cbSuccess, cbError) {
            DB.getNotes(filters, cbSuccess, cbError);
        };

        this.isValidEvernoteUser = function() {
            return (self.getOauthToken() && self.getNoteStoreUrl() && self.getExpires() > new Date().getTime());
        };
        
        this.getId = function() { return self.data_id; };
        this.getDateCreated = function() { return self.data_date_created; };
        this.getOauthToken = function() { return self.data_oauth_token; };
        this.getNoteStoreUrl = function() { return self.data_note_store_url; };
        this.getShardUrl = function() { return self.data_shard_url; };
        this.getExpires = function() { return self.data_expires; };
        this.getLastUpdateCount = function() { return self.data_last_update_count; };
        this.getLastSyncTime = function() { return self.data_last_sync_time; };

        this.export = function() {
            return exportModel(self);
        };
        
        function validate() {
            if (!self.data_id) {
                self.data_id = "user_" + Math.round(Math.random()*100000);
            }
            
            if (!self.data_date_created) {
                self.data_date_created = new Date().getTime();
            }
        }
        
        init(initOptions);
    };

    this.Notebook = function(initOptions) {
        var self = this;
        
        this.data_id = "";
        this.data_name = "";
        this.data_user_id = "";
        this.data_date_created = "";
        this.data_date_updated = "";
        this.data_metadata = {};
        this.data_trashed = false;
        this.data_numberOfNotes = 0;
        this.data_numberOfTrashedNotes = 0;
        
        function init(options) {
            updateObject(self, options);
            validate();
        }
        
        this.set = function(options, cbSuccess, cbError) {
            updateObject(self, options);
            validate();
            
            DB.updateNotebook(self, cbSuccess, cbError);
            
            return self;
        };
        
        this.newNote = function(options, cbSuccess, cbError) {
            if (!options) {
                options = {};
            }
            
            options.notebook_id = self.getId();
            
            var note = new Models.Note(options);
            DB.addNote(note, function onSuccess(){
                self.updateNotesCount(function onSuccess() {
                    cbSuccess && cbSuccess(note);
                }, cbError);
            }, cbError);
        };
        
        this.getNotes = function(bIncludeTrashed, cbSuccess, cbError) {
            var filters = {
                "notebook_id": self.getId()
            };
            if (!bIncludeTrashed) {
                filters.trashed = false;
            }
            
            DB.getNotes(filters, cbSuccess, cbError);
            
            return self;
        };
        this.getTrashedNotes = function(cbSuccess, cbError) {
            var filters = {
                "notebook_id": self.getId(),
                "trashed": true
            };
            
            DB.getNotes(filters, cbSuccess, cbError);
            
            return self;
        };
        
        this.trash = function(cbSuccess, cbError) {
            if (self.data_trashed) {
                return;
            }
            
            DB.updateMultiple("notes", {"notebook_id": self.getId()}, {"trashed": true, "active": false, "notebook_id": null}, function(){
                self.remove(cbSuccess, cbError);
            }, cbError);
        };

        this.remove = function(cbSuccess, cbError) {
            DB.removeNotebook(self, cbSuccess, cbError);
        };
        
        this.restore = function(cbSuccess, cbError) {
            if (!self.data_trashed) {
                return;
            }
            
            self.set({
                "trashed": false
            }, cbSuccess, cbError);
        };
        
        this.updateNotesCount = function(cbSuccess, cbError, options) {
            if (!options) {
                options = {};
            }
            
            self.getNotes(true, function(notes) {
                options.numberOfNotes = 0;
                options.numberOfTrashedNotes = 0;
                
                for (var i=0; i<notes.length; i++) {
                    if (notes[i].isTrashed()) {
                        options.numberOfTrashedNotes++;
                    } else {
                        options.numberOfNotes++;
                    }
                }
                
                self.set(options, cbSuccess, cbError);
            }, cbError);
        };
        
        this.getId = function() { return self.data_id; };
        this.getGuid = function() { return self.data_guid; };
        this.getName = function() { return self.data_name; };
        this.getUserId = function() { return self.data_user_id; };
        this.getNumberOfNotes = function() { return self.data_numberOfNotes; };
        this.getNumberOfTrashedNotes = function() { return self.data_numberOfTrashedNotes; };
        this.isTrashed = function() { return self.data_trashed; };

        this.export = function() {
            return exportModel(self);
        };

        function validate() {
            if (!self.data_id){
                self.data_id = "nb_" + new Date().getTime() + "_" + Math.round(Math.random()*100000);
            }
            if (!self.data_date_created) {
                self.data_date_created = new Date().getTime();
            }
            if (!self.data_date_modified) {
                self.data_date_updated = new Date().getTime();
            }
            
            (self.data_numberOfNotes < 0) && (self.data_numberOfNotes = 0);
            (self.data_numberOfTrashedNotes < 0) && (self.data_numberOfTrashedNotes = 0);
        }

        init(initOptions);
    };

    this.Note = function(initOptions) {
        var self = this,
            html_content = "";
        
        this.data_id = "";
        this.data_title = "";
        this.data_content = "";
        this.data_country = "";
        this.data_city = "";
        this.data_date_created = null;
        this.data_date_updated = null;
        this.data_trashed = false;
        this.data_active = true;
        this.data_notebook_id = null;
        this.data_metadata = {};
        this.data_resources = [];

        function init(options) {
            updateObject(self, options);
            validate();
        }
        
        this.set = function(options, cbSuccess, cbError) {
            if (options.content) {
                console.log('indexOf: '+options.content.indexOf('<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">'));
                if (options.content.indexOf('<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">') == -1) {
                    options.content = Evernote.html2enml(options.content);
                }
                html_content = "";
            }
            
            updateObject(self, options);
            validate();
            
            self.data_date_updated = new Date().getTime();
            
            DB.updateNote(self, cbSuccess, cbError);
            
            return self;
        };
        
        this.trash = function(cbSuccess, cbError) {
            if (self.data_trashed) return;
            
            self.set({
                "trashed": true,
                "active": false
            }, function onSuccess() {
                self.updateNotebookNotesCount(cbSuccess, cbError);
            }, cbError);
        };
        
        this.restore = function(cbSuccess, cbError) {
            if (!self.data_trashed) return;
            
            var args = [
                {
                    "trashed": false,
                    "active": true
                },
                function onSuccess() {
                    self.updateNotebookNotesCount(cbSuccess, cbError, {"trashed": false});
                },
                cbError
            ];
            
            if (!self.getNotebookId()) {
                DB.getNotebooks({}, function(notebooks){
                    args[0].notebook_id = notebooks[0].getId();
                    self.set.apply(self, args);
                });
            } else {
                self.set.apply(self, args);
            }
        };
        
        this.remove = function(cbSuccess, cbError) {
            DB.removeNote(self, function() {
                self.updateNotebookNotesCount(cbSuccess, cbError);
            }, cbError);
        };
        
        this.getNotebook = function(cbSuccess, cbError) {
            DB.getNotebooks({"id": self.getNotebookId()}, function(notebooks){
                cbSuccess && cbSuccess(notebooks[0]);
            }, cbError);
        };
        
        this.updateNotebookNotesCount = function(cbSuccess, cbError, additionalOptions) {
            self.getNotebook(function(notebook){
                notebook.updateNotesCount(cbSuccess, cbError, additionalOptions);
            }, cbError);
        };
        
        
        this.getResources = function(cbSuccess, cbError) {
            return self.data_resources;
            // DB.getNoteResources({"noteId": self.getId()}, cbSuccess, cbError);
        };
        
        this.newResource = function(options, cbSuccess, cbError) {
            self.data_resources.push(new Resource({
                noteGuid : self.getGuid(),
                mime : options.mime,
                data : new Data({
                    body : options.body,
                    size : options.size
                }),
                attributes : new ResourceAttributes({
                    fileName : options.name
                })
            }));

            self.set({
                resources : self.getResources()
            }, cbSuccess, cbError);
        };
        
        this.getContent = function(html) {
            if (html) {
                if (html_content.length == 0) {
                    html_content = Evernote.enml2html(self);
                }
                return html_content;
            }
            return self.data_content;
        };

        this.getId = function() { return self.data_id; };
        this.getGuid = function() { return self.data_guid; };
        this.getName = function() { return self.data_title; };
        this.getDateCreated = function() { return self.data_date_created; };
        this.getDateUpdated = function() { return self.data_date_updated; };
        this.getNotebookId = function() { return self.data_notebook_id; };
        this.getNotebookGuid = function() { return self.data_notebookGuid; };
        this.isTrashed = function() { return self.data_trashed; };
        this.isActive = function() { return self.data_active; };

        this.export = function() {
            return exportModel(self);
        };
        
        function validate() {
            if (!self.data_id) {
                self.data_id = "note_" + new Date().getTime() + "_" + Math.round(Math.random()*100000);
            }
            
            if (!self.data_date_created) {
                self.data_date_created = new Date().getTime();
            }
            
            if (!self.data_date_updated) {
                self.data_date_updated = new Date().getTime();
            }
        }
        
        init(initOptions);
    };

    this.Queue = function(initOptions) {
        var self = this;
        
        this.data_id = "";
        this.data_rel = "";
        this.data_rel_id = "";
        this.data_rel_content = "";
        
        function init(options) {
            updateObject(self, options);
            validate();

            return self;
        }
        
        this.set = function(cbSuccess, cbError) {
            DB.getQueues({
                rel_id: self.getRelId(),
                rel: self.getRel()
            }, function(results){
                if (results.length == 0) {
                    DB.addQueue(self, cbSuccess, cbError);
                } else {
                    self.setId(results[0].getId());
                    DB.updateQueue(self, cbSuccess, cbError);
                }
            });
            
            return self;
        };

        this.remove = function(cbSuccess, cbError) {
            DB.removeQueue(self, cbSuccess, cbError);

            return self;
        };
        
        this.getId = function() { return self.data_id; };
        this.getRel = function() { return self.data_rel; };
        this.getRelId = function() { return self.data_rel_id; };
        this.getRelContent = function() { return self.data_rel_content; };
        
        this.setId = function(id) { self.data_id = id; };

        this.export = function() {
            return exportModel(self);
        };
        
        function validate() {
            if (!self.data_id) {
                self.data_id = "queue_" + new Date().getTime() + "_" + Math.round(Math.random()*100000);
            }
        }
        
        init(initOptions);
    };

    this.NoteResource = function(initOptions) {
        var self = this;
        
        this.data_id = '';
        this.data_name = '';
        this.data_src = '';
        this.data_size = -1;
        this.data_type = '';
        this.data_noteId = '';
        this.data_metadata = {};
            
        function init(options) {
            updateObject(self, options);
            validate();
        }
        
        this.set = function(options, cbSuccess, cbError) {
            updateObject(self, options);
            validate();
            
            DB.updateNoteResource(self, cbSuccess, cbError);
            
            return self;        
        };
        
        this.remove = function(cbSuccess, cbError) {
            DB.removeNoteResource(self, cbSuccess, cbError);
        };
        
        this.getId = function() { return self.data_id; };
        this.getName = function() { return self.data_name; };
        this.getSrc = function() { return self.data_src; };
        this.getSize = function() { return self.data_size; };
        this.getType = function() { return self.data_type; };
        this.getNoteId = function() { return self.data_noteId; };

        this.export = function() {
            return exportModel(self);
        };
        
        function validate() {
            if (!self.data_id) {
                self.data_id = "nr_" + new Date().getTime() + "_" + Math.round(Math.random()*100000);
            }
        }
        
        init(initOptions);
    };
};

var ResourceTypes = {
    "IMAGE": "image"
};

function updateObject(obj, options) {
    if (!options) return;
    for (var k in options) {
        if (k.indexOf('data_') !== -1) {
            key = k;
        } else {
            key = 'data_' + k;
        }
        obj[key] = options[k];
    }
}

function exportModel(obj) {
    var expObj = {};
    for (var key in obj) {
        expObj[key.replace('data_', '')] = obj[key];
    }
    return expObj;
}