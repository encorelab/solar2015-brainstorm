(function() {
  "use strict";

  var Backbone, Skeletor, Drowsy, jQuery, _,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty;

  if (typeof exports !== "undefined" && exports !== null) {
    jQuery = require("jquery");
    _ = require("underscore");
    Backbone = require("backbone");
    Backbone.$ = jQuery;
    Drowsy = require("backbone.drowsy").Drowsy;
    Skeletor = {};
    exports.Skeletor = Skeletor;
  } else {
    window.Skeletor = window.Skeletor || {};
    Skeletor = window.Skeletor;
    jQuery = window.$;
    _ = window._;
    Drowsy = window.Drowsy;
  }

  Skeletor.Model = (function() {
    function Model() {}

    Model.requiredCollections = ['brainstorms', 'states'];

    Model.init = function(url, db) {
      var dfrInit,
        _this = this;
      dfrInit = jQuery.Deferred();
      if (!url) {
        throw new Error("Cannot configure model because no DrowsyDromedary URL was given!");
      }
      if (!db) {
        throw new Error("Cannot configure model because no database name was given!");
      }
      this.baseURL = url;
      this.dbURL = "" + url + "/" + db;
      this.server = new Drowsy.Server(url);

      this.checkThatDatabaseExists(db)
      .then(function () {
        _this.db = _this.server.database(db);
        return _this.createNecessaryCollections(_this.requiredCollections);
      })
      .then(function() {
          _this.defineModelClasses();
          dfrInit.resolve();
      });

      return dfrInit.promise();
    };

    Model.checkThatDatabaseExists = function(dbName) {
      var _this = this;
      var dfrCheck = jQuery.Deferred();

      this.server.databases()
      .done(function (dbs) {
        if (_.pluck(dbs, 'name').indexOf(dbName) < 0) {
          throw new Error("Database '"+dbName+"' does not exist in '"+_this.baseURL+"'!");
        }
        dfrCheck.resolve();
      });

      return dfrCheck.promise();
    };

    Model.createNecessaryCollections = function(requiredCollections) {
      var df, dfs,
        _this = this;
      dfs = [];
      df = jQuery.Deferred();

      this.db.collections(function(colls) {
        var col, existingCollections, _i, _len;
        existingCollections = _.pluck(colls, 'name');
        _.each(requiredCollections, function (coll) {
          if (existingCollections.indexOf(coll) < 0) {
            console.log("Creating collection '" + coll + "' under " + Skeletor.Model.dbURL);
            dfs.push(_this.db.createCollection(coll));
          }
        });
      });

      jQuery.when.apply(jQuery, dfs).done(function() {
        return df.resolve();
      });
      return df.promise();
    };

    Model.defineModelClasses = function(username) {
      this.Brainstorm = this.db.Document('brainstorms').extend({
        defaults: {
          'created_at': new Date(),
          'modified_at': new Date(),
          // Colin this won't work since the model is used by Smartboard and Skeletor.Mobile is not available
          //'author': username,
          'published': false
        }
      });

      this.Brainstorms = this.db.Collection('brainstorms').extend({
        model: Skeletor.Model.Brainstorm
      });

      // board insists and this could be used for PAUSE
      this.State = this.db.Document('states').extend({
        defaults: {
          'created_at': new Date(),
          'modified_at': new Date(),
          'paused': false
        }
      });

      this.States = this.db.Collection('states').extend({
        model: Skeletor.Model.State
      });
    };

    Model.wake = function(wakefulUrl) {
      var dfrWake = jQuery.Deferred();
      Wakeful.loadFayeClient(wakefulUrl).then(function () {
        return Model.initWakefulCollections(wakefulUrl);
      }).then(function () {
        dfrWake.resolve();
      });

      return dfrWake.promise();
    };

    Model.initWakefulCollections = function(wakefulUrl) {
      var camelCase, coll, collName, deferreds, _i, _len, _ref;
      deferreds = [];
      camelCase = function(str) {
        return str.replace(/([\-_][a-z]|^[a-z])/g, function($1) {
          return $1.toUpperCase().replace(/[\-_]/, '');
        });
      };
      this.awake = {};
      _.each(this.requiredCollections, function (collName) {
        coll = new Skeletor.Model[camelCase(collName)]();
        coll.wake(wakefulUrl);
        Skeletor.Model.awake[collName] = coll;
        deferreds.push(coll.fetch());
      });
      return jQuery.when.apply(jQuery, deferreds);
    };

    return Model;

  })();

}).call(this);
