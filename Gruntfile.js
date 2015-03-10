module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      all: ['Gruntfile.js', 'shared/js/*.js', 'teacher/js/*.js', 'mobile/js/*.js', 'board/js/*.js']
    },
    jsonlint: {
      dev: {
        src: ['./*.json' ,'./leaf-drop/bootstrap/*.json']
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jsonlint');

  // Default task(s) .
  // grunt.registerTask('default', ['uglify']);
  grunt.registerTask('default', ['jshint',  'jsonlint']);
  grunt.registerTask('lint', ['jshint', 'jsonlint']);
};