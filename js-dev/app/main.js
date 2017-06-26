//
//
//

var ZipLoaderPool = function(){

    "use strict";

    /* global zip */

    var zip_workers_queue = [];
    var zip_workers_ative = 0;
    var zip_workers_max = 6;

    this.OBJUploader = function(in_path, in_filename, in_scene){

        var _self = this;

        _self.filename = in_filename;
        _self.path = in_path;
        _self.url = in_path + "/data/" + in_filename + "/data.zip";

        _self.load = function(){

            var xhr = new XMLHttpRequest();
            xhr.open('GET', _self.url, true);
            xhr.responseType = "blob";

            xhr.onreadystatechange = function () {

                if (xhr.readyState==4 && xhr.status==200) {

                    console.log(xhr.response);

                    var blob = xhr.response;

                    zip_workers_queue.push(blob);

                    zip_worker_interval = setInterval( function(){

                        if (zip_workers_queue.length && 
                            zip_workers_ative < zip_workers_max){
                            clearInterval(zip_worker_interval);
                            zip_worker_interval = 0;
                            createZipWorker(zip_workers_queue.shift());
                        }

                    }, 15);

                    xhr = null;
                }
            };
            xhr.send();
        };

        // -----------------------------------------------------------

        var zip_reader, zip_reader_count = 0, zip_worker_interval = 0;
        var obj_file, mtl_file;

        function readZippedMtlData(text){
            zip_reader_count--;
            mtl_file = text;
            createObject();
        }

        function readZippedObjData(text){
            zip_reader_count--;
            obj_file = text;
            createObject();
        }

        function createObject(){

            if (zip_reader_count === 0){ // all files unzipped

                if (zip_reader){
                    zip_reader.close(function() { }); // onclose callback
                    zip_workers_ative--;
                    zip_reader = null;
                }

                if (obj_file && mtl_file){

                    var mtlLoader = new THREE.MTLLoader();
                    mtlLoader.setTexturePath( _self.path + "/resources/");
                    var materials = mtlLoader.parse( mtl_file );
                    change_image_ref_to_png(materials.materialsInfo);
                    materials.preload();

                    var objLoader = new THREE.OBJLoader();
                    objLoader.setMaterials( materials );
                    objLoader.setPath( _self.path );

                    var object = objLoader.parse( obj_file );
                    object.position.set(0.0, 0.0, 0.0);
                    object.scale.set(1.0, 1.0, 1.0);
                    in_scene.add( object );

                    mtlLoader = null;
                    objLoader = null;
                }

                mtl_file = null;
                obj_file = null;
            }
        }

        function createZipWorker(blob){

            zip_workers_ative++;

            zip.createReader(
                new zip.BlobReader(blob),

                function(reader) {

                    zip_reader = reader;

                    reader.getEntries( function(entries) {

                        if (entries.length) {

                            for (var i = 0; i < entries.length; i++){

                                var filename = entries[i].filename;

                                if (/\.mtl$/.test(filename)){
                                    zip_reader_count++;
                                    entries[i].getData(
                                        new zip.TextWriter(),
                                        readZippedMtlData,
                                        null // onprogress callback
                                    );
                                }
                                else if (/\.obj$/.test(filename)){
                                    zip_reader_count++;
                                    entries[i].getData(
                                        new zip.TextWriter(),
                                        readZippedObjData,
                                        null // onprogress callback
                                    );
                                }
                            }

                            if (zip_reader_count < 2){
                                reader.close(function() { }); // onclose callback
                                zip_reader = null;
                                zip_workers_ative--;
                            }

                            if (zip_reader_count > 2)
                                console.error("zip_reader_count > 2");
                        }
                    });
                },
                function(error) {}  // onerror callback
            );
        }

        function change_image_ref_to_png(mat_info_collection){
            var bDisableBumpMapping = true;
            for ( var mat_info_prop in mat_info_collection ) {
                if (!mat_info_collection.hasOwnProperty(mat_info_prop))
                    continue;
                var mat_info = mat_info_collection[mat_info_prop];
                for ( var prop in mat_info ) {
                    if (!mat_info.hasOwnProperty(prop))
                        continue;
                    var value = mat_info[ prop ];
                    if ( value === '' ) 
                        continue;
                    switch ( prop.toLowerCase() ) {
                        case 'map_kd':
                        case 'map_ks':
                            mat_info[ prop ] = value.replace(/\.[^/.]+$/, "") + ".png";
                            break;
                        case 'map_bump':
                        case 'bump':
                            if (bDisableBumpMapping){
                                delete mat_info[prop];
                            }
                            else
                                mat_info[ prop ] = value.replace(/\.[^/.]+$/, "") + ".png";
                            break;
                        default:
                            break;
                    }
                }
            }
        }
    };
};
var ZipLoaderPool = new ZipLoaderPool();

(function main(){
    "use strict";

    /* global zip */

    // set up zip worker

    zip.workerScriptsPath = "/zip-lib/";

    // set up three.js

    var camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 0.1, 10000 );
    camera.position.set(0, 3, 30);
    camera.lookAt(new THREE.Vector3(0,2,0));

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf7f7f7, 0.0003);
    scene.add( new THREE.AmbientLight( 0x444444 ) );

    var light1 = new THREE.DirectionalLight( 0xffffff, 1.0 );
    light1.position.set( 1, 1, -1 );
    scene.add( light1 );

    var light2 = new THREE.DirectionalLight( 0xffffff, 1.0 );
    light2.position.set( -1, -1, 1 );
    scene.add( light2 );

    var renderer = new THREE.WebGLRenderer( { antialias: false } );
    renderer.setClearColor( scene.fog.color );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight);

    var container = document.getElementById( 'vida.web.container');
    container.appendChild( renderer.domElement );

    var _debug = true;

    var controls;
    if (true){ 
        controls= new THREE.OrbitControls(camera, renderer.domElement );
        controls.target = new THREE.Vector3(0, 2, 0);
        controls.maxDistance = 500;
        controls.minDistance = 1;
        //controls.minPolarAngle = Math.PI / 2.0; // rad
        //controls.maxPolarAngle = Math.PI / 2.0;
        controls.noZoom = false;
        controls.noRotate = false;
        controls.noPan = false;
        controls.addEventListener( 'change', update_nexus_frame );
    }

    // Prepare clock
    var clock = new THREE.Clock();

    // Prepare stats
    var stats;
    if (_debug){
        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '20px';
        stats.domElement.style.bottom = '20px';
        stats.domElement.style.zIndex = 1;
        container.appendChild( stats.domElement );
    }

    if (false){
        scene.add( new THREE.AxisHelper( 15 ) );
        scene.add( new THREE.GridHelper( 35, 35 ) );
    }

    /* An appropriate material can be used as a fourth arg for the NexusObject constructor

    var texture = new THREE.DataTexture( new Uint8Array([1, 1, 1]), 1, 1, THREE.RGBFormat );
    texture.needsUpdate = true;
    var material = new THREE.MeshLambertMaterial( { color: 0xffffff, map: texture } );
    */

    function getURLParameter(name) {
        return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(window.location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
    }

    function onWindowResize() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );

        update_nexus_frame();
    }
    window.addEventListener( 'resize', onWindowResize, false );

    function animate() {

        var delta = clock.getDelta();

        requestAnimationFrame( animate );

        if (stats)
            stats.update();

        if (controls)
            controls.update(delta);

        var nexus_context = null;

        if (Nexus && Nexus.contexts)
            Nexus.contexts.forEach(function(g) { 
                if(g.gl == renderer.context) {
                    nexus_context = g;
                }
            });

        if (nexus_context){
            nexus_context.rendered = 0;
        }

        renderer.render( scene, camera );

        updateContextInfo(renderer, nexus_context);
    }

    function updateContextInfo( renderer, nexus_context ) {

        var info = {
            faces : 0
        };

        var faces = 0;

        if (renderer)
            info.faces += Math.round( renderer.info.render.faces );

        if (nexus_context)
            info.faces += Math.round( nexus_context.rendered / 3 );

        var e = document.createEvent('Event');
        e.initEvent("ContextInfo.update", true, true);
        e.info = info;
        document.dispatchEvent(e);
    }

    function update_nexus_frame() {
        Nexus.beginFrame(renderer.context);
        renderer.render( scene, camera );
        Nexus.endFrame(renderer.context);
    }

    var onProgress = function ( xhr ) {
        if ( xhr.lengthComputable ) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log( Math.round(percentComplete, 2) + '% downloaded' );
        }
    };

    var onError = function ( xhr ) { };

    THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );

    function uploadNxs(path, filename){
        var nexus_obj = new NexusObject(path + filename + ".nxs", renderer, update_nexus_frame);
        nexus_obj.position.set(0.0, 0.0, 0.0);
        nexus_obj.scale.set(1.0, 1.0, 1.0);
        scene.add(nexus_obj);
    }

    function uploadCrt(path, filename){

        filename = filename + ".crt";

        var loader = new THREE.CORTOLoader({ path: path }); //can pass a material or a multimaterial if you know whats' in the model.

        var decode_times = [];
        var blob = null;

        loader.load(filename, function(mesh) {
            decode_times.push(loader.decode_time);
            blob = loader.blob;

            //mesh.addEventListener("change", render);

            mesh.geometry.computeBoundingBox();
            if(!mesh.geometry.attributes.normal) {
                if(!mesh.geometry.attributes.uv) {
                    mesh.geometry.computeVertexNormals();
                }
                //else 
                //    ambient.intensity = 1.0;
            }

            //mesh.geometry.center();
            //mesh.scale.divideScalar(mesh.geometry.boundingBox.getSize().length());
            scene.add(mesh); 

            //render();
            //setTimeout(profile, 10);
        } );
    }

    animate();

    var page = 'HumanBody-FullBody-insane';

    var upload_format = getURLParameter("format") || 'obj';

    page += "-" + upload_format;
    
    var  xmlhttp = new XMLHttpRequest();

    xmlhttp.open("GET", document.location.origin + "/format/" + upload_format +"/page/" + page, true);

    function upoloadObj(path, model, scene, time_out){
        setTimeout( function(){
            var uploader = new ZipLoaderPool.OBJUploader( path, model, scene);
            uploader.load();
        }, time_out );
    }

    xmlhttp.onreadystatechange=function(){

        try{
            if (xmlhttp.readyState==4 && xmlhttp.status==200){

                var models = JSON.parse(xmlhttp.responseText);

                for ( var i = 0; i < models.length; i++)//
                {
                    var path = "models/" + page + "/";
                    var model = models[i];

                    if (upload_format === "nxs") {

                        uploadNxs( path, model);
                    }
                    else if (upload_format === "obj"){

                        upoloadObj(path, model, scene, i * 2);
                    }
                    //else if (upload_format === "crt"){
                    //   if (models[i] === "Digestive.Digestive_exterior.Jejunum")
                    //        uploadCrt( path, models[i]);
                    //}
                }
            }
        }
        catch(expt) // 
        {
            console.log(expt);
        }
    };
    xmlhttp.send();
}());