/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:false */
/*global Backbone, _, jQuery, Sail, google */

(function() {
  "use strict";
  var Skeletor = this.Skeletor || {};
  this.Skeletor.Mobile = this.Skeletor.Mobile || {};
  var app = this.Skeletor.Mobile;
  var Model = this.Skeletor.Model;
  Skeletor.Model = Model;
  app.View = {};

  /**
    WriteView
  **/
  app.View.WriteView = Backbone.View.extend({
    view: this,
    template: "#resume-unpublished-notes",

    initialize: function() {
      var view = this;
      console.log('Initializing WriteView...', view.el);
    },

    events: {
      'click .resume-note-btn'   : "resumeNote",
      'click .new-note-btn'      : 'showNewNote',
      'click .modal-select-note' : 'selectNoteToResume',
      'click .cancel-note-btn'   : 'cancelNote',
      'click .share-note-btn'    : 'shareNote',
      //'click .note-body'         : 'createOrRestoreNote',
      'keyup :input': function(ev) {
        var view = this,
          field = ev.target.name,
          input = ev.target.value;
        // clear timer on keyup so that a save doesn't happen while typing
        window.clearTimeout(app.autoSaveTimer);

        // save after 10 keystrokes
        app.autoSave(view.model, field, input, false);

        // setting up a timer so that if we stop typing we save stuff after 5 seconds
        app.autoSaveTimer = setTimeout(function(){
          app.autoSave(view.model, field, input, true);
        }, 5000);
      }
    },

    resumeNote: function(){
      var view = this;

      // retrieve unpublished notes of user
      var notesToRestore = view.collection.where({author: app.username, published: false});

      // fill the modal
      jQuery('#select-note-modal').html('');
      _.each(notesToRestore, function(note){
        // Fix to work with Underscore > 1.7.0 http://stackoverflow.com/questions/25881041/backbone-js-template-example
        // var option = _.template(jQuery(view.template).text(), {'option_text': note.get('body'), id: note.id});
        var optionTemplate = _.template(jQuery(view.template).text());
        var option = optionTemplate({'option_text': note.get('body'), id: note.id});
        jQuery('#select-note-modal').append(option);
      });

      //show modal
      console.log('Show modal to pick previous note.');
      jQuery('.unpublished-note-picker').modal('show');
    },

    showNewNote: function() {
      var view = this;
      console.log('Starting new note.');

      // create an note object
      var note = {};
      note.author = app.username;
      note.created_at = new Date();
      note.body = '';
      note.published = false;

      // make note wakeful and add it to notes collection
      view.model = app.addNote(note);

      // Clear text input field
      this.$el.find('.note-body').val('');

      jQuery('.note-taking-toggle').slideDown();
      jQuery('.resume-note-btn, .new-note-btn').attr('disabled', 'disabled');
    },

    cancelNote: function() {
      console.log("Cancelling note and hiding textarea.");
      // Hide textarea
      jQuery('.note-taking-toggle').slideUp();
      jQuery('.resume-note-btn, .new-note-btn').removeAttr('disabled', 'disabled');
    },

    selectNoteToResume: function(ev){
      var view = this;
      console.log('Select a note.');

      var selectedOption = jQuery('#select-note-modal').find(":selected");
      // children()[jQuery('#select-note-modal').index()];
      // retrieve id of selectd note
      var selectedNoteId = jQuery(selectedOption).data('id');
      app.currentNote = view.collection.findWhere({_id: selectedNoteId});

      // Clear text input field
      this.$el.find('.note-body').val('');

      this.$el.find('.note-body').val(app.currentNote.get('body'));

      jQuery('.unpublished-note-picker').modal('hide');
      jQuery('.note-taking-toggle').slideDown();
      jQuery('.resume-note-btn, .new-note-btn').attr('disabled', 'disabled');
    },

    // createOrRestoreNote: function(ev) {
    //   // alert('createNewNote: want me to do stuff, teach me');
    //   var view = this;

    //   var noteToRestore = view.collection.findWhere({author: app.username, published: false});
    //   if (noteToRestore) {
    //     app.currentNote = noteToRestore;
    //     this.$el.find('.note-body').val(app.currentNote.get('body'));
    //   } else {
    //     // no unpublished note, so we create a new note
    //     var note = {};
    //     note.author = app.username;
    //     note.created_at = new Date();
    //     note.body = '';
    //     note.published = false;

    //     app.addNote(note);
    //   }
    // },

    shareNote: function() {
      var view = this;
      console.log('want me to do stuff, teach me');

      view.model.set('body', this.$el.find('.note-body').val());
      view.model.set('published', true);

      view.model.save();

      // clearing up
      this.$el.find('.note-body').val('');
      // turn off auto save
      window.clearTimeout(app.autoSaveTimer);
      view.model = null;
      jQuery('.note-taking-toggle').slideUp();
      jQuery('.resume-note-btn, .new-note-btn').removeAttr('disabled', 'disabled');
    },

    // autosaveNote: function(ev) {
    //   var field = ev.target.name,
    //       input = jQuery('#'+ev.target.id).val();
    //   // clear timer on keyup so that a save doesn't happen while typing
    //   window.clearTimeout(app.autoSaveTimer);

    //   // save after 10 keystrokes
    //   app.autoSave(view.model, field, input, false);

    //   // setting up a timer so that if we stop typing we save stuff after 5 seconds
    //   app.autoSaveTimer = setTimeout(function(){
    //     app.autoSave(view.model, field, input, true);
    //   }, 5000);
    // },

    render: function () {
      console.log('Rendering WriteView...');
    }
  });


  /**
    ReadView
  **/
  app.View.ReadView = Backbone.View.extend({
    template: "#notes-list-template",

    initialize: function () {
      var view = this;
      console.log('Initializing ReadView...', view.el);

      view.collection.on('change', function(n) {
        view.render();
      });

      view.collection.on('add', function(n) {
        view.render();
      });

      view.render();

      return view;
    },

    events: {
      // nothing here yet, but could be click events on list items to have actions (delete, response and so forth)
    },

    render: function () {
      var view = this;
      console.log("Rendering ReadView");

      // find the list where items are rendered into
      var list = this.$el.find('ul');

      // Only want to show published notes at some point
      var publishedNotes = view.collection.where({published: true});

      _.each(publishedNotes, function(note){
        var me_or_others = 'others';
        // add class 'me' or 'other' to note
        if (note.get('author') === app.username) {
          me_or_others = 'me';
        }

        // Fix to work with Underscore > 1.7.0 http://stackoverflow.com/questions/25881041/backbone-js-template-example
        // var listItem = _.template(jQuery(view.template).text(), {'id': note.id, 'text': note.get('body'), 'me_or_others': me_or_others, 'author': note.get('author'), 'created_at': note.get('created_at')});
        var listItemTemplate = _.template(jQuery(view.template).text());
        var listItem = listItemTemplate({'id': note.id, 'text': note.get('body'), 'me_or_others': me_or_others, 'author': note.get('author'), 'created_at': note.get('created_at')});

        var existingNote = list.find("[data-id='" + note.id + "']");

        if (existingNote.length === 0) {
          list.append(listItem);
        } else {
          existingNote.replaceWith(listItem);
        }
      });

    }

  });

  this.Skeletor = Skeletor;
}).call(this);
