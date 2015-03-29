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

      // check if we need to resume any brainstorm note
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
      'click #lightbulb-icon'             : 'showSentenceStarters',
      'click .sentence-starter'           : 'appendSentenceStarter',
      'keyup :input'                      : 'checkForAutoSave'
    },

    setupResumedBrainstorm: function(brainstorm) {
      var view = this;

      view.model = brainstorm;
      view.model.wake(app.config.wakeful.url);
      jQuery('#brainstorm-title-input').val(brainstorm.get('title'));
      jQuery('#brainstorm-body-input').val(brainstorm.get('body'));
    },

    showSentenceStarters: function() {
      var view = this;

      // setting up to add sentence starter content to a brainstorm, so need to make sure we have a model to add it to
      if (!view.model) {
        view.checkToAddNewBrainstorm();
      }
      jQuery('#sentence-starter-modal').modal({keyboard: true, backdrop: true});
    },

    appendSentenceStarter: function(ev) {
      // add the sentence starter text to the current body (note that this won't start the autoSave trigger)
      var bodyText = jQuery('#brainstorm-body-input').val();
      bodyText += jQuery(ev.target).text();
      jQuery('#brainstorm-body-input').val(bodyText);

      jQuery('#sentence-starter-modal').modal('hide');
    },

    // does it make more sense to put this in the initialize? (and then also in the publish and cancel?)
    checkToAddNewBrainstorm: function() {
      var view = this;

      // if there is no model yet
      if (!view.model) {
        // create a brainstorm object
        view.model = new Model.Brainstorm();
        view.model.set('author',app.username);
        view.model.set('published',false);
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

    // destroy a model, if there's something to destroy
    cancelBrainstorm: function() {
      var view = this;

      // if there is a brainstorm
      if (view.model) {
        // confirm delete
        if (confirm("Are you sure you want to delete this brainstorm?")) {
          app.clearAutoSaveTimer();
          view.model.destroy();
          // and we need to set it to null to 'remove' it from the local collection
          view.model = null;
          jQuery('.input-field').val('');
        }
      }
    },

    publishBrainstorm: function() {
      var view = this;
      var title = jQuery('#brainstorm-title-input').val();
      var body = app.turnUrlsToLinks(jQuery('#brainstorm-body-input').val());

      if (title.length > 0 && body.length > 0) {
        app.clearAutoSaveTimer();
        view.model.set('title',title);
        view.model.set('body',body);
        view.model.set('published', true);
        view.model.set('modified_at', new Date());
        view.model.save();
        jQuery().toastmessage('showSuccessToast', "Published to brainstorm wall");

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
    template: "#tile-template",

    initialize: function () {
      var view = this;
      console.log('Initializing ReadView...', view.el);

      // we don't need this, since there's no editing of content in this version
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
      'click #nav-write-btn'         : 'switchToWriteView',
      'click .tile-container'        : 'showTileDetails'
    },

    switchToWriteView: function() {
      app.hideAllContainers();
      jQuery('#write-screen').removeClass('hidden');
    },

    // TODO: create more views, definitely one for the tiles
    showTileDetails: function(ev) {
      // retrieve the brainstorm with the id in data-id
      var brainstorm = app.readView.collection.get(jQuery(ev.target).data('id'));
      jQuery('#tile-details .tile-title').text(brainstorm.get('title'));
      jQuery('#tile-details .tile-body').text(brainstorm.get('body'));
      jQuery('#tile-details .tile-author').text("- " + brainstorm.get('author'));


      jQuery('#tile-details').modal({keyboard: true, backdrop: true});
    },

    populateList: function(brainstorms, listId) {
      var view = this;

      // we have two lists now, so decide which one we're dealing with here
      var list = jQuery('#'+listId);

      _.each(brainstorms, function(brainstorm){
        var listItemTemplate = _.template(jQuery(view.template).text());
        var listItem = listItemTemplate({ 'id': brainstorm.get('_id'), 'title': brainstorm.get('title'), 'body': brainstorm.get('body'), 'author': '- '+brainstorm.get('author') });

        var existingNote = list.find("[data-id='" + brainstorm.get('_id') + "']");
        if (existingNote.length === 0) {
          list.prepend(listItem);
        } else {
          existingNote.replaceWith(listItem);
        }
      });
    },

    render: function () {
      var view = this;
      console.log("Rendering ReadView...");

      // sort newest to oldest
      view.collection.comparator = function(model) {
        return model.get('created_at');
      };

      // add the brainstorms to the list under the following ordered conditions:
      // - my brainstorms, by date (since we're using prepend)
      // - everyone else's brainstorms, by date (since we're using prepend)
      var myPublishedBrainstorms = view.collection.sort().where({published: true, author: app.username});
      view.populateList(myPublishedBrainstorms, "my-tiles-list");

      var othersPublishedBrainstorms = view.collection.sort().filter(function(b) { return (b.get('published') === true && b.get('author') !== app.username); });
      view.populateList(othersPublishedBrainstorms, "others-tiles-list");
    }

  });

  this.Skeletor = Skeletor;
}).call(this);
