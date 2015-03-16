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
    initialize: function() {
      var view = this;
      console.log('Initializing WriteView...', view.el);

      var brainstormToResume = view.collection.findWhere({author: app.username, published: false});
      if (brainstormToResume) {
        view.setupResumedBrainstorm(brainstormToResume);
      }
    },

    events: {
      'click #nav-read-btn'               : 'switchToReadView',
      'click #cancel-brainstorm-btn'      : 'cancelBrainstorm',
      'click #publish-brainstorm-btn'     : 'publishBrainstorm',
      'click #brainstorm-title-input'     : 'checkToAddNewBrainstorm',
      'click #brainstorm-body-input'      : 'checkToAddNewBrainstorm',
      'keyup :input'                      : 'checkForAutoSave'
    },

    setupResumedBrainstorm: function(brainstorm) {
      var view = this;

      view.model = brainstorm;
      jQuery('#brainstorm-title-input').val(brainstorm.get('title'));
      jQuery('#brainstorm-body-input').val(brainstorm.get('body'));
    },

    // does it make more sense to put this in the initialize? (and then also in the publish and cancel?)
    checkToAddNewBrainstorm: function() {
      var view = this;

      // if there is no model yet
      if (!view.model) {
        // create a brainstorm object
        view.model = new Model.Brainstorm();
        view.model.wake(app.config.wakeful.url);
        view.model.save();
        view.collection.add(view.model);
      }
    },

    checkForAutoSave: function(ev) {
      var view = this,
          field = ev.target.name,
          input = ev.target.value;
      // clear timer on keyup so that a save doesn't happen while typing
      app.clearAutoSaveTimer();

      // save after 10 keystrokes
      app.autoSave(view.model, field, input, false);

      // setting up a timer so that if we stop typing we save stuff after 5 seconds
      app.autoSaveTimer = setTimeout(function(){
        app.autoSave(view.model, field, input, true);
      }, 5000);
    },

    cancelBrainstorm: function() {
      var view = this;

      // TODO: get this to work, much cleaner - view.model.destroy();   has this been correctly implemented with this version of wakeful?
      // this doesn't actually cancel a note, if just sets it to blank. Could be relevantly different in some cases
      view.model.set('title','');
      view.model.set('body','');
      view.model.save();
      jQuery('.input-field').val('');
    },

    publishBrainstorm: function() {
      var view = this;
      var title = jQuery('#brainstorm-title-input').val();
      var body = jQuery('#brainstorm-body-input').val();

      if (title.length > 0 && body.length > 0) {
        app.clearAutoSaveTimer();
        view.model.set('title',title);
        view.model.set('body',body);
        view.model.set('published', true);
        view.model.set('modified_at', new Date());
        view.model.save();
        jQuery().toastmessage('showSuccessToast', "Your brainstorm contribution has been submitted!");

        // BOOOO - let's get destroy working please
        view.model = null;
        jQuery('.input-field').val('');
      } else {
        jQuery().toastmessage('showErrorToast', "You need to complete both fields to submit your brainstorm...");
      }
    },

    switchToReadView: function() {
      app.hideAllContainers();
      jQuery('#read-screen').removeClass('hidden');
    },

    render: function () {
      console.log("Rendering WriteView...");
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
      'click #nav-write-btn'         : "switchToWriteView",
    },

    switchToWriteView: function() {
      app.hideAllContainers();
      jQuery('#write-screen').removeClass('hidden');
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
