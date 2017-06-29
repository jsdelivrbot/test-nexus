//
//
//

var available_lods = [0.1, 0.2, 0.3, 0.5];

var DEBUG = {
    bUseMaxLod : false,
    bUseWireframe : false
};

var ZipLoaderPool = function(){

    "use strict";

    /* global zip */

    var zip_workers_queue = [];
    var zip_workers_ative = 0;
    var zip_workers_max = 6;

    var xhrs_data = {};

    this.OBJUploader = function(in_path, in_filename, in_lod_param, in_parent_object){

        var _self = this;

        _self.filename = in_filename;
        _self.path = in_path;
        _self.url = in_path + "/data/" + in_filename + "/" + in_lod_param.toFixed(3) + "/data.zip";

        _self.load = function(){

            var uuid = generateUUID();

            var xhr = new XMLHttpRequest();
            xhr.open('GET', _self.url, true);
            xhr.responseType = "blob";

            xhrs_data[uuid] = {
                loaded : 0,
                total : 0
            };

            xhr.onprogress = function(event) {

                xhrs_data[uuid].loaded = event.loaded; // bytes
                xhrs_data[uuid].total = event.total;

                var loaded = 0, total = 0;

                for (var _uuid in xhrs_data){
                    if (xhrs_data[_uuid]){
                        loaded += xhrs_data[_uuid].loaded;
                        total += xhrs_data[_uuid].total;
                    }
                }

                var e = document.createEvent('Event');
                e.initEvent("UploadData.update", true, true);
                e.loaded = loaded;
                e.total = total;
                document.dispatchEvent(e);
            };

            xhr.onreadystatechange = function () {

                if (xhr.readyState==4 && xhr.status==200) {

                    console.log(in_filename + " : " + in_lod_param);

                    var blob = xhr.response;

                    createZipWorker(blob);

                    // TODO FIX WORKER QUEUE !

                    /*zip_workers_queue.push(blob);

                    zip_worker_interval = setInterval( function(){
                        if (zip_workers_queue.length && 
                            zip_workers_ative < zip_workers_max){
                            clearInterval(zip_worker_interval);
                            zip_worker_interval = 0;
                            createZipWorker(zip_workers_queue.shift());
                        }
                    }, 15);*/

                    xhr = null;
                }
            };
            xhr.send();
        };

        _self.onLoad = function(_self){};

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

                    if (!in_parent_object.shared_materials){

                        var mtlLoader = new THREE.MTLLoader();
                        mtlLoader.setTexturePath( _self.path + "/resources/");
                        var materials = mtlLoader.parse( mtl_file );

                        change_image_ref_to_png(materials.materialsInfo);
                        materials.preload();

                        in_parent_object.shared_materials = materials;
                    }

                    var objLoader = new THREE.OBJLoader();
                    objLoader.setMaterials( in_parent_object.shared_materials );
                    objLoader.setPath( _self.path );

                    var object = objLoader.parse( obj_file );
                    object.position.set(0.0, 0.0, 0.0);
                    object.scale.set(1.0, 1.0, 1.0);

                    object.lod = in_lod_param;

                    in_parent_object.lod_objects[in_lod_param] = object;

                    object.traverseVisible(function(_this){
                        _this.onAfterRender = function( renderer, scene, camera, geometry, material, group ){
                            in_parent_object.onAfterRender(in_parent_object, _this, renderer, scene, camera, geometry, material, group);
                        };
                    });

                    object.visible = false;

                    in_parent_object.add(object);

                    _self.onLoad(_self);
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

    var generateUUID = function () {

        // http://www.broofa.com/Tools/Math.uuid.htm

        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split( '' );
        var uuid = new Array( 36 );
        var rnd = 0, r;

        return function generateUUID() {

            for ( var i = 0; i < 36; i ++ ) {

                if ( i === 8 || i === 13 || i === 18 || i === 23 ) {

                    uuid[ i ] = '-';

                } else if ( i === 14 ) {

                    uuid[ i ] = '4';

                } else {

                    if ( rnd <= 0x02 ) rnd = 0x2000000 + ( Math.random() * 0x1000000 ) | 0;
                    r = rnd & 0xf;
                    rnd = rnd >> 4;
                    uuid[ i ] = chars[ ( i === 19 ) ? ( r & 0x3 ) | 0x8 : r ];

                }

            }

            return uuid.join( '' );

        };

    }();
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
    var scene_lods = [];

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

    var bRedraw = false;

    var container = document.getElementById( 'vida.web.container');
    renderer.domElement.style.zIndex = 1;
    container.appendChild( renderer.domElement );

    var _debug = true;

    var controls, input_container = renderer.domElement;

    var debug_canvas;

    if (true){
        debug_canvas = document.createElement('canvas');
        container.appendChild(debug_canvas);
        debug_canvas.style.position = 'absolute';
        debug_canvas.style.zIndex = 2;
        debug_canvas.style.top =renderer.domElement.offsetTop + "px";
        debug_canvas.style.left =renderer.domElement.offsetLeft + "px";
        debug_canvas.width = renderer.domElement.width;
        debug_canvas.height = renderer.domElement.height;

        var debug_canvas_observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === "attributes") {
                    debug_canvas.style.top =renderer.domElement.offsetTop + "px";
                    debug_canvas.style.left =renderer.domElement.offsetLeft + "px";
                    debug_canvas.width = renderer.domElement.width;
                    debug_canvas.height = renderer.domElement.height;
                }
            });
        });
        debug_canvas_observer.observe(renderer.domElement, { attributes: true });
        input_container = debug_canvas;
    }


    if (true){ 
        controls= new THREE.OrbitControls(camera, input_container );
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

        Nexus.debug_draw_wirefame = DEBUG.bUseWireframe;

        var nexus_context = null;

        bRedraw = true; // TODO

        if (bRedraw){

            if (Nexus && Nexus.contexts)
                Nexus.contexts.forEach(function(g) { 
                    if(g.gl == renderer.context) {
                        nexus_context = g;
                    }
                });

            if (nexus_context){
                nexus_context.rendered = 0;
            }

            for (var i = 0; i < scene_lods.length; i++){

                var object = scene_lods[i];

                for (var lodId in object.lod_objects){
                    if (object.lod_objects[lodId]){
                        object.lod_objects[lodId].visible = false;
                    }
                }

                if (object.lod_objects[object.lod_desired]){
                    object.lod_objects[object.lod_desired].visible = true;
                }
                else {

                    var start_indx = available_lods.indexOf(object.lod_desired);

                    for ( var j = start_indx - 1; j >= 0; j--){

                        var lod = available_lods[j];

                        if (object.lod_objects[lod]){
                            object.lod_objects[lod].visible = true;
                            break;
                        }
                    }
                }

                object.lod_desired = available_lods[0]; // reset LOD - will be set in onAfterRender
            }

            Nexus.beginFrame(renderer.context);

            renderer.render( scene, camera );

            if (false && debug_canvas)
                renderDebugCanvas(debug_canvas, scene_lods);

            Nexus.endFrame(renderer.context);

            updateContextInfo(renderer, nexus_context);
        }

        bRedraw = false;
    }

    function renderDebugCanvas(debug_canvas, scene){

        var ctx = debug_canvas.getContext('2d');

        ctx.font = '13px serif';

        ctx.clearRect(0, 0, debug_canvas.width, debug_canvas.height);

        for (var i = 0; i < scene_lods.length; i++){
            var lod = available_lods[0];
            var object = scene_lods[i];
            object.children = object.lod_objects[lod] ? [object.lod_objects[lod]] : [];

            var mesh = object.children[0] ? object.children[0].children[0] : null;

            if (mesh && mesh.geometry.boundingSphere){

                var sphere = mesh.geometry.boundingSphere;

                var center = toScreenPosition(sphere.center, camera, debug_canvas);
                var radius = toScreenLength(sphere.radius, camera, debug_canvas);

                ctx.beginPath();
                ctx.arc( center.x, center.y, radius, 0, 2 * Math.PI );
                ctx.stroke();

                //ctx.fillText( object.name, center.x, center.y);
            }
        }
    }

    function toScreenPosition(position, camera, canvas){
        var vector = new THREE.Vector3(position.x, position.y, position.z);
        var widthHalf = 0.5 * canvas.width;
        var heightHalf = 0.5 * canvas.height;
        vector.project(camera);
        vector.x = ( vector.x * widthHalf ) + widthHalf;
        vector.y = - ( vector.y * heightHalf ) + heightHalf;
        return { x : vector.x, y : vector.y };
    }

    function toScreenLength(length_units, camera, canvas){
        var xAxis = new THREE.Vector3(0, 0, 0);
        var yAxis = new THREE.Vector3(0, 0, 0);
        var zAxis = new THREE.Vector3(0, 0, 0);
        camera.matrixWorld.extractBasis(xAxis, yAxis, zAxis);
        var widthHalf = 0.5 * canvas.width;
        var heightHalf = 0.5 * canvas.height;
        var z = new THREE.Vector3(0, 0, 0);
        z.project(camera);
        z.x = ( z.x * widthHalf ) + widthHalf;
        z.y = - ( z.y * heightHalf ) + heightHalf;
        var v = new THREE.Vector3(length_units * yAxis.x, length_units * yAxis.y, length_units * yAxis.z);
        v.project(camera);
        v.x = ( v.x * widthHalf ) + widthHalf;
        v.y = - ( v.y * heightHalf ) + heightHalf;
        v.x = v.x - z.x;
        v.y = v.y - z.y;
        var l = Math.sqrt(v.x * v.x + v.y * v.y);
        return l;
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
        bRedraw = true;
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

    animate();

    var page = 'HumanBody-FullBody-insane';

    var upload_format = getURLParameter("format") || 'obj';

    page += "-" + upload_format;
    
    var  xmlhttp = new XMLHttpRequest();

    xmlhttp.open("GET", document.location.origin + "/format/" + upload_format +"/page/" + page, true);

    function updateLOD(object, mesh, renderer, scene, camera, geometry, material, group ){

        var sphere = mesh.geometry.boundingSphere;
        var radius = toScreenLength(sphere.radius, camera, debug_canvas);

        if (mesh.material){
            mesh.material.wireframe = DEBUG.bUseWireframe;
        }

        var size = renderer.getSize();

        var resolution = Math.sqrt( size.width * size.width + size.height + size.height );

        var parameter = radius / resolution;

        if (DEBUG.bUseMaxLod)
            object.lod_desired = available_lods[available_lods.length - 1];

        if ( parameter <= 0.1){
            if (object.lod_desired < available_lods[0])
                object.lod_desired = available_lods[0];
        }
        else if ( parameter <= 0.2){
            if (object.lod_desired < available_lods[1])
                object.lod_desired = available_lods[1];
        }
        else if ( parameter <= 0.3){
            if (object.lod_desired < available_lods[2])
                object.lod_desired = available_lods[2];
        }
        else if ( parameter > 0.3){
            if (object.lod_desired < available_lods[3])
                object.lod_desired = available_lods[3];
        }

        if (!object.lod_upload_state[object.lod_desired]){

            object.lod_upload_state[object.lod_desired] = true;
            var uploader = new ZipLoaderPool.OBJUploader( object.path, object.name, object.lod_desired , object);
            uploader.onLoad = function(){
                bRedraw = true;
            };
            uploader.load();
        }
    }

    function uploadOBJ(path, model_name){
    
        var min_lod = available_lods[0];

        var object = new THREE.Object3D();
        object.path = path;
        object.name = model_name;
        object.shared_materials = null;
        object.lod_objects = {};
        object.lod_upload_state = { };
        object.lod_desired = min_lod;

        object.onAfterRender = updateLOD;

        object.lod_upload_state[min_lod] = true;
        var uploader = new ZipLoaderPool.OBJUploader( path, model_name, min_lod , object);
        uploader.onLoad = function(){
            bRedraw = true;
        };
        uploader.load();

        scene_lods.push(object);
        scene.add(object);
    }

    xmlhttp.onreadystatechange=function(){

        try{
            if (xmlhttp.readyState==4 && xmlhttp.status==200){

                var models = JSON.parse(xmlhttp.responseText);

                for ( var i = 0; i < models.length; i++)//
                {
                    var path = "models/" + page + "/";
                    var model_name = models[i];

                    if (upload_format === "nxs") {

                        uploadNxs( path, model_name);
                    }
                    else if (upload_format === "obj"){

                        uploadOBJ(path, model_name);
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

/*
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
    */