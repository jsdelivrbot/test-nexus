
module.exports = function (grunt) {

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-file-append');

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        concat: {
            app: {
                src: [
                    'js-dev/app/**/*.js',
                ],
                dest: 'public/app/app.js'
            },
            libs: {
                src: [
                    'js-dev/libs/three.js/*.js',
                    'js-dev/libs/three.js/plugins/*.js',
                    'js-dev/libs/nexus/*.js',
                ],
                dest: 'public/libs/libs.js'
            }
        },
        uglify: {
            app: {
                options: {
                    banner: '// <%= grunt.template.today("dd.mm.yyyy") %> by <%= pkg.author %>\n',
                    //sourceMap: true
                },
                src: '<%= concat.app.dest %>',
                dest: '<%= concat.app.dest %>',
            },
            libs: {
                options: {
                    banner: '// <%= grunt.template.today("dd.mm.yyyy") %> external libraries\n',
                    //sourceMap: true
                },
                src: '<%= concat.libs.dest %>',
                dest: '<%= concat.libs.dest %>'
            }
        },
        jshint: {
            options: {
                esversion: 6,
                eqeqeq: false,
                eqnull: true,
                "-W041": false,
                noempty: true,
                nonbsp: true,
                strict: true,
                undef: true,
                unused: false,
                laxcomma: true,
                proto: true,
                globals: {
                    // browser
                    Element : true,
                    NodeList : true,
                    HTMLCollection : true,
                    console: true,
                    module: true,
                    require: true,
                    window: true,
                    document: true,
                    setTimeout: true,
                    clearTimeout : true,
                    setInterval : true,
                    clearInterval : true,
                    XMLHttpRequest: true,
                    screen: true,
                    Image: true,
                    ArrayBuffer: true,
                    DataView: true,
                    Int8Array: true,
                    Uint8Array: true,
                    Uint8ClampedArray: true,
                    Int16Array: true,
                    Uint16Array: true,
                    Uint32Array: true,
                    Float32Array: true,
                    Float64Array: true,
                    Map: true,
                    requestAnimationFrame : true,
                    MutationObserver : true,
                    // libs
                    jQuery: true,
                    $: true,
                    getURLQueryParams : true,
                    addPropertyWithEvent : true,
                    THREE : true,
                    Stats : true,
                    Nexus : true,
                    NexusObject : true
                },
                reporter: require('jshint-stylish')
            },
            files: [
                '<%= concat.app.dest %>',
            ]
        },
        copy: {
            resources: {
                files: [
                  { expand: true, src: ['models/**/*'], dest: 'public/' }
                ],
            }
        },
        file_append: {
            default_options: {
              files: [
                {
                  append: "OCC.GlobalConfigurator._debug=false;",
                  input: '<%= concat.app.dest %>',
                  output: '<%= concat.app.dest %>'
                }
              ]
            }
          }
    });

    grunt.registerTask('default', [ 'concat', 'jshint', 'copy']);
};
