function OrbitControlsModified(THREE) {

  var MOUSE = THREE.MOUSE
  if (!MOUSE)
    MOUSE = { LEFT: 0, MIDDLE: 1, RIGHT: 2 };

  /**
   * @author qiao / https://github.com/qiao
   * @author mrdoob / http://mrdoob.com
   * @author alteredq / http://alteredqualia.com/
   * @author WestLangley / http://github.com/WestLangley
   * @author erich666 / http://erichaines.com
   */
  /*global THREE, console */

  function OrbitConstraint ( object ) {

    this.object = object;

    // "target" sets the location of focus, where the object orbits around
    // and where it pans with respect to.
    this.target = new THREE.Vector3();

    // Limits to how far you can dolly in and out ( PerspectiveCamera only )
    this.minDistance = 0;
    this.maxDistance = Infinity;

    // Limits to how far you can zoom in and out ( OrthographicCamera only )
    this.minZoom = 0;
    this.maxZoom = Infinity;

    // How far you can orbit vertically, upper and lower limits.
    // Range is 0 to Math.PI radians.
    this.minPolarAngle = 0; // radians
    this.maxPolarAngle = Math.PI; // radians

    // How far you can orbit horizontally, upper and lower limits.
    // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
    this.minAzimuthAngle = - Infinity; // radians
    this.maxAzimuthAngle = Infinity; // radians

    // Set to true to enable damping (inertia)
    // If damping is enabled, you must call controls.update() in your animation loop
    this.enableDamping = false;
    this.dampingFactor = 0.25;

    ////////////
    // internals

    var scope = this;

    var EPS = 0.000001;

    // Current position in spherical coordinate system.
    var theta = 0;
    var phi = 0;

    // Pending changes
    var phiDelta = 0;
    var thetaDelta = 0;
    var scale = 1;
    var panOffset = new THREE.Vector3();
    var zoomChanged = false;

    // API

    this.getPolarAngle = function () {

      return phi;

    };

    this.getAzimuthalAngle = function () {

      return theta;

    };

    this.setPolarAngle = function (angle) {

      phi = angle;
      this.forceUpdate();

    };

    this.setAzimuthalAngle = function (angle) {
      theta = angle;
      this.forceUpdate();

    };

    this.rotateLeft = function ( angle ) {

      thetaDelta -= angle;
    };

    this.rotateUp = function ( angle ) {

      phiDelta -= angle;

    };

    // pass in distance in world space to move left
    this.panLeft = function() {

      var v = new THREE.Vector3();

      return function panLeft ( distance ) {

        var te = this.object.matrix.elements;

        // get X column of matrix
        v.set( te[ 0 ], te[ 1 ], te[ 2 ] );
        v.multiplyScalar( - distance );

        panOffset.add( v );

      };

    }();

    // pass in distance in world space to move up
    this.panUp = function() {

      var v = new THREE.Vector3();

      return function panUp ( distance ) {

        var te = this.object.matrix.elements;

        // get Y column of matrix
        v.set( te[ 4 ], te[ 5 ], te[ 6 ] );
        v.multiplyScalar( distance );

        panOffset.add( v );

      };

    }();

    // pass in x,y of change desired in pixel space,
    // right and down are positive
    this.pan = function ( deltaX, deltaY, screenWidth, screenHeight ) {

      if ( scope.object instanceof THREE.PerspectiveCamera ) {

        // perspective
        var position = scope.object.position;
        var offset = position.clone().sub( scope.target );
        var targetDistance = offset.length();

        // half of the fov is center to top of screen
        targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

        // we actually don't use screenWidth, since perspective camera is fixed to screen height
        scope.panLeft( 2 * deltaX * targetDistance / screenHeight );
        scope.panUp( 2 * deltaY * targetDistance / screenHeight );

      } else if ( scope.object instanceof THREE.OrthographicCamera ) {

        // orthographic
        scope.panLeft( deltaX * ( scope.object.right - scope.object.left ) / screenWidth );
        scope.panUp( deltaY * ( scope.object.top - scope.object.bottom ) / screenHeight );

      } else {

        // camera neither orthographic or perspective
        console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );

      }

    };

    this.dollyIn = function ( dollyScale ) {

      if ( scope.object instanceof THREE.PerspectiveCamera ) {

        scale /= dollyScale;

      } else if ( scope.object instanceof THREE.OrthographicCamera ) {

        scope.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom * dollyScale ) );
        scope.object.updateProjectionMatrix();
        zoomChanged = true;

      } else {

        console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );

      }

    };

    this.dollyOut = function ( dollyScale ) {

      if ( scope.object instanceof THREE.PerspectiveCamera ) {

        scale *= dollyScale;

      } else if ( scope.object instanceof THREE.OrthographicCamera ) {

        scope.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom / dollyScale ) );
        scope.object.updateProjectionMatrix();
        zoomChanged = true;

      } else {

        console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );

      }

    };


    this.forceUpdate = function() {

      var offset = new THREE.Vector3();

      // so camera.up is the orbit axis
      var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
      var quatInverse = quat.clone().inverse();

      var lastPosition = new THREE.Vector3();
      var lastQuaternion = new THREE.Quaternion();

      return function () {

        var position = this.object.position;

        offset.copy( position ).sub( this.target );

        // rotate offset to "y-axis-is-up" space
        offset.applyQuaternion( quat );

        // restrict theta to be between desired limits
        theta = Math.max( this.minAzimuthAngle, Math.min( this.maxAzimuthAngle, theta ) );

        // restrict phi to be between desired limits
        phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

        // restrict phi to be betwee EPS and PI-EPS
        phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

        var radius = offset.length() * scale;

        // restrict radius to be between desired limits
        radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );

        // move target to panned location
        this.target.add( panOffset );

        offset.x = radius * Math.sin( phi ) * Math.sin( theta );
        offset.y = radius * Math.cos( phi );
        offset.z = radius * Math.sin( phi ) * Math.cos( theta );

        // rotate offset back to "camera-up-vector-is-up" space
        offset.applyQuaternion( quatInverse );

        position.copy( this.target ).add( offset );

        this.object.lookAt( this.target );

        if ( this.enableDamping === true ) {

          thetaDelta *= ( 1 - this.dampingFactor );
          phiDelta *= ( 1 - this.dampingFactor );

        } else {

          thetaDelta = 0;
          phiDelta = 0;

        }

        scale = 1;
        panOffset.set( 0, 0, 0 );

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8

        if ( zoomChanged ||
           lastPosition.distanceToSquared( this.object.position ) > EPS ||
          8 * ( 1 - lastQuaternion.dot( this.object.quaternion ) ) > EPS ) {

          lastPosition.copy( this.object.position );
          lastQuaternion.copy( this.object.quaternion );
          zoomChanged = false;

          return true;

        }

        return false;

      };

    }();

    this.update = function() {

      var offset = new THREE.Vector3();

      // so camera.up is the orbit axis
      var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
      var quatInverse = quat.clone().inverse();

      var lastPosition = new THREE.Vector3();
      var lastQuaternion = new THREE.Quaternion();

      return function () {

        var position = this.object.position;

        offset.copy( position ).sub( this.target );

        // rotate offset to "y-axis-is-up" space
        offset.applyQuaternion( quat );

        // angle from z-axis around y-axis

        theta = Math.atan2( offset.x, offset.z );

        // angle from y-axis

        phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

        theta += thetaDelta;
        phi += phiDelta;

        // restrict theta to be between desired limits
        theta = Math.max( this.minAzimuthAngle, Math.min( this.maxAzimuthAngle, theta ) );

        // restrict phi to be between desired limits
        phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

        // restrict phi to be betwee EPS and PI-EPS
        phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

        var radius = offset.length() * scale;

        // restrict radius to be between desired limits
        radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );

        // move target to panned location
        this.target.add( panOffset );

        offset.x = radius * Math.sin( phi ) * Math.sin( theta );
        offset.y = radius * Math.cos( phi );
        offset.z = radius * Math.sin( phi ) * Math.cos( theta );

        // rotate offset back to "camera-up-vector-is-up" space
        offset.applyQuaternion( quatInverse );

        position.copy( this.target ).add( offset );

        this.object.lookAt( this.target );

        if ( this.enableDamping === true ) {

          thetaDelta *= ( 1 - this.dampingFactor );
          phiDelta *= ( 1 - this.dampingFactor );

        } else {

          thetaDelta = 0;
          phiDelta = 0;

        }

        scale = 1;
        panOffset.set( 0, 0, 0 );

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8

        if ( zoomChanged ||
           lastPosition.distanceToSquared( this.object.position ) > EPS ||
          8 * ( 1 - lastQuaternion.dot( this.object.quaternion ) ) > EPS ) {

          lastPosition.copy( this.object.position );
          lastQuaternion.copy( this.object.quaternion );
          zoomChanged = false;

          return true;

        }

        return false;

      };

    }();

  };
  // This set of controls performs orbiting, dollying (zooming), and panning. It maintains
  // the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
  // supported.
  //
  //    Orbit - left mouse / touch: one finger move
  //    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
  //    Pan - right mouse, or arrow keys / touch: three finter swipe

  function OrbitControls ( object, domElement ) {

    var constraint = new OrbitConstraint( object );

    this.domElement = ( domElement !== undefined ) ? domElement : document;

    // API

    Object.defineProperty( this, 'constraint', {

      get: function() {

        return constraint;

      }

    } );

    this.getPolarAngle = function () {

      return constraint.getPolarAngle();

    };

    this.getAzimuthalAngle = function () {

      return constraint.getAzimuthalAngle();

    };

    this.setPolarAngle = function (angle) {

      return constraint.setPolarAngle(angle);

    };

    this.setAzimuthalAngle = function (angle) {

      return constraint.setAzimuthalAngle(angle);

    };

    // Set to false to disable this control
    this.enabled = true;

    // center is old, deprecated; use "target" instead
    this.center = this.target;

    // This option actually enables dollying in and out; left as "zoom" for
    // backwards compatibility.
    // Set to false to disable zooming
    this.enableZoom = true;
    this.zoomSpeed = 1.0;

    // Set to false to disable rotating
    this.enableRotate = true;
    this.rotateSpeed = 1.0;

    // Set to false to disable panning
    this.enablePan = true;
    this.keyPanSpeed = 7.0; // pixels moved per arrow key push

    // Set to true to automatically rotate around the target
    // If auto-rotate is enabled, you must call controls.update() in your animation loop
    this.autoRotate = false;
    this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

    // Set to false to disable use of the keys
    this.enableKeys = true;

    // The four arrow keys
    this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

    // Mouse buttons
    this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

    ////////////
    // internals

    var scope = this;

    var rotateStart = new THREE.Vector2();
    var rotateEnd = new THREE.Vector2();
    var rotateDelta = new THREE.Vector2();

    var panStart = new THREE.Vector2();
    var panEnd = new THREE.Vector2();
    var panDelta = new THREE.Vector2();

    var dollyStart = new THREE.Vector2();
    var dollyEnd = new THREE.Vector2();
    var dollyDelta = new THREE.Vector2();

    var STATE = { NONE : - 1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

    var state = STATE.NONE;

    // for reset

    this.target0 = this.target.clone();
    this.position0 = this.object.position.clone();
    this.zoom0 = this.object.zoom;

    // events

    var changeEvent = { type: 'change' };
    var startEvent = { type: 'start' };
    var endEvent = { type: 'end' };

    // pass in x,y of change desired in pixel space,
    // right and down are positive
    function pan( deltaX, deltaY ) {

      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

      constraint.pan( deltaX, deltaY, element.clientWidth, element.clientHeight );

    }

    this.update = function () {

      if ( this.autoRotate && state === STATE.NONE ) {

        constraint.rotateLeft( getAutoRotationAngle() );

      }

      if ( constraint.update() === true ) {

        this.dispatchEvent( changeEvent );

      }

    };

    this.reset = function () {

      state = STATE.NONE;

      this.target.copy( this.target0 );
      this.object.position.copy( this.position0 );
      this.object.zoom = this.zoom0;

      this.object.updateProjectionMatrix();
      this.dispatchEvent( changeEvent );

      this.update();

    };

    function getAutoRotationAngle() {

      return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

    }

    function getZoomScale() {

      return Math.pow( 0.95, scope.zoomSpeed );

    }

    function onMouseDown( event ) {

      if ( scope.enabled === false ) return;

      event.preventDefault();

      if ( event.button === scope.mouseButtons.ORBIT ) {

        if ( scope.enableRotate === false ) return;

        state = STATE.ROTATE;

        rotateStart.set( event.clientX, event.clientY );

      } else if ( event.button === scope.mouseButtons.ZOOM ) {

        if ( scope.enableZoom === false ) return;

        state = STATE.DOLLY;

        dollyStart.set( event.clientX, event.clientY );

      } else if ( event.button === scope.mouseButtons.PAN ) {

        if ( scope.enablePan === false ) return;

        state = STATE.PAN;

        panStart.set( event.clientX, event.clientY );

      }

      if ( state !== STATE.NONE ) {

        document.addEventListener( 'mousemove', onMouseMove, false );
        document.addEventListener( 'mouseup', onMouseUp, false );
        scope.dispatchEvent( startEvent );

      }

    }

    function onMouseMove( event ) {

      if ( scope.enabled === false ) return;

      event.preventDefault();

      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

      if ( state === STATE.ROTATE ) {

        if ( scope.enableRotate === false ) return;

        rotateEnd.set( event.clientX, event.clientY );
        rotateDelta.subVectors( rotateEnd, rotateStart );

        // rotating across whole screen goes 360 degrees around
        constraint.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

        // rotating up and down along whole screen attempts to go 360, but limited to 180
        constraint.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

        rotateStart.copy( rotateEnd );

      } else if ( state === STATE.DOLLY ) {

        if ( scope.enableZoom === false ) return;

        dollyEnd.set( event.clientX, event.clientY );
        dollyDelta.subVectors( dollyEnd, dollyStart );

        if ( dollyDelta.y > 0 ) {

          constraint.dollyIn( getZoomScale() );

        } else if ( dollyDelta.y < 0 ) {

          constraint.dollyOut( getZoomScale() );

        }

        dollyStart.copy( dollyEnd );

      } else if ( state === STATE.PAN ) {

        if ( scope.enablePan === false ) return;

        panEnd.set( event.clientX, event.clientY );
        panDelta.subVectors( panEnd, panStart );

        pan( panDelta.x, panDelta.y );

        panStart.copy( panEnd );

      }

      if ( state !== STATE.NONE ) scope.update();

    }

    function onMouseUp( /* event */ ) {

      if ( scope.enabled === false ) return;

      document.removeEventListener( 'mousemove', onMouseMove, false );
      document.removeEventListener( 'mouseup', onMouseUp, false );
      scope.dispatchEvent( endEvent );
      state = STATE.NONE;

    }

    function onMouseWheel( event ) {

      if ( scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE ) return;

      event.preventDefault();
      event.stopPropagation();

      var delta = 0;

      if ( event.wheelDelta !== undefined ) {

        // WebKit / Opera / Explorer 9

        delta = event.wheelDelta;

      } else if ( event.detail !== undefined ) {

        // Firefox

        delta = - event.detail;

      }

      if ( delta > 0 ) {

        constraint.dollyOut( getZoomScale() );

      } else if ( delta < 0 ) {

        constraint.dollyIn( getZoomScale() );

      }

      scope.update();
      scope.dispatchEvent( startEvent );
      scope.dispatchEvent( endEvent );

    }

    function onKeyDown( event ) {

      if ( scope.enabled === false || scope.enableKeys === false || scope.enablePan === false ) return;

      switch ( event.keyCode ) {

        case scope.keys.UP:
          pan( 0, scope.keyPanSpeed );
          scope.update();
          break;

        case scope.keys.BOTTOM:
          pan( 0, - scope.keyPanSpeed );
          scope.update();
          break;

        case scope.keys.LEFT:
          pan( scope.keyPanSpeed, 0 );
          scope.update();
          break;

        case scope.keys.RIGHT:
          pan( - scope.keyPanSpeed, 0 );
          scope.update();
          break;

      }

    }

    function touchstart( event ) {

      if ( scope.enabled === false ) return;

      switch ( event.touches.length ) {

        case 1: // one-fingered touch: rotate

          if ( scope.enableRotate === false ) return;

          state = STATE.TOUCH_ROTATE;

          rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
          break;

        case 2: // two-fingered touch: dolly

          if ( scope.enableZoom === false ) return;

          state = STATE.TOUCH_DOLLY;

          var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
          var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
          var distance = Math.sqrt( dx * dx + dy * dy );
          dollyStart.set( 0, distance );
          break;

        case 3: // three-fingered touch: pan

          if ( scope.enablePan === false ) return;

          state = STATE.TOUCH_PAN;

          panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
          break;

        default:

          state = STATE.NONE;

      }

      if ( state !== STATE.NONE ) scope.dispatchEvent( startEvent );

    }

    function touchmove( event ) {

      if ( scope.enabled === false ) return;

      event.preventDefault();
      event.stopPropagation();

      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

      switch ( event.touches.length ) {

        case 1: // one-fingered touch: rotate

          if ( scope.enableRotate === false ) return;
          if ( state !== STATE.TOUCH_ROTATE ) return;

          rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
          rotateDelta.subVectors( rotateEnd, rotateStart );

          // rotating across whole screen goes 360 degrees around
          constraint.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );
          // rotating up and down along whole screen attempts to go 360, but limited to 180
          constraint.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

          rotateStart.copy( rotateEnd );

          scope.update();
          break;

        case 2: // two-fingered touch: dolly

          if ( scope.enableZoom === false ) return;
          if ( state !== STATE.TOUCH_DOLLY ) return;

          var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
          var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
          var distance = Math.sqrt( dx * dx + dy * dy );

          dollyEnd.set( 0, distance );
          dollyDelta.subVectors( dollyEnd, dollyStart );

          if ( dollyDelta.y > 0 ) {

            constraint.dollyOut( getZoomScale() );

          } else if ( dollyDelta.y < 0 ) {

            constraint.dollyIn( getZoomScale() );

          }

          dollyStart.copy( dollyEnd );

          scope.update();
          break;

        case 3: // three-fingered touch: pan

          if ( scope.enablePan === false ) return;
          if ( state !== STATE.TOUCH_PAN ) return;

          panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
          panDelta.subVectors( panEnd, panStart );

          pan( panDelta.x, panDelta.y );

          panStart.copy( panEnd );

          scope.update();
          break;

        default:

          state = STATE.NONE;

      }

    }

    function touchend( /* event */ ) {

      if ( scope.enabled === false ) return;

      scope.dispatchEvent( endEvent );
      state = STATE.NONE;

    }

    function contextmenu( event ) {

      event.preventDefault();

    }

    this.dispose = function() {

      this.domElement.removeEventListener( 'contextmenu', contextmenu, false );
      this.domElement.removeEventListener( 'mousedown', onMouseDown, false );
      this.domElement.removeEventListener( 'mousewheel', onMouseWheel, false );
      this.domElement.removeEventListener( 'MozMousePixelScroll', onMouseWheel, false ); // firefox

      this.domElement.removeEventListener( 'touchstart', touchstart, false );
      this.domElement.removeEventListener( 'touchend', touchend, false );
      this.domElement.removeEventListener( 'touchmove', touchmove, false );

      document.removeEventListener( 'mousemove', onMouseMove, false );
      document.removeEventListener( 'mouseup', onMouseUp, false );

      window.removeEventListener( 'keydown', onKeyDown, false );

    }

    this.domElement.addEventListener( 'contextmenu', contextmenu, false );

    this.domElement.addEventListener( 'mousedown', onMouseDown, false );
    this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
    this.domElement.addEventListener( 'MozMousePixelScroll', onMouseWheel, false ); // firefox

    this.domElement.addEventListener( 'touchstart', touchstart, false );
    this.domElement.addEventListener( 'touchend', touchend, false );
    this.domElement.addEventListener( 'touchmove', touchmove, false );

    window.addEventListener( 'keydown', onKeyDown, false );

    // force an update at start
    this.update();

  };

  OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
  OrbitControls.prototype.constructor = OrbitControls;

  Object.defineProperties( OrbitControls.prototype, {

    object: {

      get: function () {

        return this.constraint.object;

      }

    },

    target: {

      get: function () {

        return this.constraint.target;

      },

      set: function ( value ) {

        console.warn( 'THREE.OrbitControls: target is now immutable. Use target.set() instead.' );
        this.constraint.target.copy( value );

      }

    },

    minDistance : {

      get: function () {

        return this.constraint.minDistance;

      },

      set: function ( value ) {

        this.constraint.minDistance = value;

      }

    },

    maxDistance : {

      get: function () {

        return this.constraint.maxDistance;

      },

      set: function ( value ) {

        this.constraint.maxDistance = value;

      }

    },

    minZoom : {

      get: function () {

        return this.constraint.minZoom;

      },

      set: function ( value ) {

        this.constraint.minZoom = value;

      }

    },

    maxZoom : {

      get: function () {

        return this.constraint.maxZoom;

      },

      set: function ( value ) {

        this.constraint.maxZoom = value;

      }

    },

    minPolarAngle : {

      get: function () {

        return this.constraint.minPolarAngle;

      },

      set: function ( value ) {

        this.constraint.minPolarAngle = value;

      }

    },

    maxPolarAngle : {

      get: function () {

        return this.constraint.maxPolarAngle;

      },

      set: function ( value ) {

        this.constraint.maxPolarAngle = value;

      }

    },

    minAzimuthAngle : {

      get: function () {

        return this.constraint.minAzimuthAngle;

      },

      set: function ( value ) {

        this.constraint.minAzimuthAngle = value;

      }

    },

    maxAzimuthAngle : {

      get: function () {

        return this.constraint.maxAzimuthAngle;

      },

      set: function ( value ) {

        this.constraint.maxAzimuthAngle = value;

      }

    },

    enableDamping : {

      get: function () {

        return this.constraint.enableDamping;

      },

      set: function ( value ) {

        this.constraint.enableDamping = value;

      }

    },

    dampingFactor : {

      get: function () {

        return this.constraint.dampingFactor;

      },

      set: function ( value ) {

        this.constraint.dampingFactor = value;

      }

    },

    // backward compatibility

    noZoom: {

      get: function () {

        console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
        return ! this.enableZoom;

      },

      set: function ( value ) {

        console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
        this.enableZoom = ! value;

      }

    },

    noRotate: {

      get: function () {

        console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
        return ! this.enableRotate;

      },

      set: function ( value ) {

        console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
        this.enableRotate = ! value;

      }

    },

    noPan: {

      get: function () {

        console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
        return ! this.enablePan;

      },

      set: function ( value ) {

        console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
        this.enablePan = ! value;

      }

    },

    noKeys: {

      get: function () {

        console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
        return ! this.enableKeys;

      },

      set: function ( value ) {

        console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
        this.enableKeys = ! value;

      }

    },

    staticMoving : {

      get: function () {

        console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
        return ! this.constraint.enableDamping;

      },

      set: function ( value ) {

        console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
        this.constraint.enableDamping = ! value;

      }

    },

    dynamicDampingFactor : {

      get: function () {

        console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
        return this.constraint.dampingFactor;

      },

      set: function ( value ) {

        console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
        this.constraint.dampingFactor = value;

      }

    }

  } );

  return OrbitControls;
}

OrbitControls = OrbitControlsModified(THREE);
;(function() {

"use strict";

var root = this

var has_require = typeof require !== 'undefined'

var THREE = root.THREE || has_require && require('three')
if( !THREE )
  throw new Error( 'MeshLine requires three.js' )

function MeshLine() {

  this.positions = [];

  this.previous = [];
  this.next = [];
  this.side = [];
  this.width = [];
  this.indices_array = [];
  this.uvs = [];
  this.counters = [];
  this.geometry = new THREE.BufferGeometry();

  this.widthCallback = null;

}

MeshLine.prototype.setGeometry = function( g, c ) {

  this.widthCallback = c;

  this.positions = [];
  this.counters = [];

  if( g instanceof THREE.Geometry ) {
    for( var j = 0; j < g.vertices.length; j++ ) {
      var v = g.vertices[ j ];
      var c = j/g.vertices.length;
      this.positions.push( v.x, v.y, v.z );
      this.positions.push( v.x, v.y, v.z );
      this.counters.push(c);
      this.counters.push(c);
    }
  }

  if( g instanceof THREE.BufferGeometry ) {
    // read attribute positions ?
  }

  if( g instanceof Float32Array || g instanceof Array ) {
    for( var j = 0; j < g.length; j += 3 ) {
      var c = j/g.length;
      this.positions.push( g[ j ], g[ j + 1 ], g[ j + 2 ] );
      this.positions.push( g[ j ], g[ j + 1 ], g[ j + 2 ] );
      this.counters.push(c);
      this.counters.push(c);
    }
  }

  this.process();

}

MeshLine.prototype.compareV3 = function( a, b ) {

  var aa = a * 6;
  var ab = b * 6;
  return ( this.positions[ aa ] === this.positions[ ab ] ) && ( this.positions[ aa + 1 ] === this.positions[ ab + 1 ] ) && ( this.positions[ aa + 2 ] === this.positions[ ab + 2 ] );

}

MeshLine.prototype.copyV3 = function( a ) {

  var aa = a * 6;
  return [ this.positions[ aa ], this.positions[ aa + 1 ], this.positions[ aa + 2 ] ];

}

MeshLine.prototype.process = function() {

  var l = this.positions.length / 6;

  this.previous = [];
  this.next = [];
  this.side = [];
  this.width = [];
  this.indices_array = [];
  this.uvs = [];

  for( var j = 0; j < l; j++ ) {
    this.side.push( 1 );
    this.side.push( -1 );
  }

  var w;
  for( var j = 0; j < l; j++ ) {
    if( this.widthCallback ) w = this.widthCallback( j / ( l -1 ) );
    else w = 1;
    this.width.push( w );
    this.width.push( w );
  }

  for( var j = 0; j < l; j++ ) {
    this.uvs.push( j / ( l - 1 ), 0 );
    this.uvs.push( j / ( l - 1 ), 1 );
  }

  var v;

  if( this.compareV3( 0, l - 1 ) ){
    v = this.copyV3( l - 2 );
  } else {
    v = this.copyV3( 0 );
  }
  this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
  this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
  for( var j = 0; j < l - 1; j++ ) {
    v = this.copyV3( j );
    this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
    this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
  }

  for( var j = 1; j < l; j++ ) {
    v = this.copyV3( j );
    this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );
    this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );
  }

  if( this.compareV3( l - 1, 0 ) ){
    v = this.copyV3( 1 );
  } else {
    v = this.copyV3( l - 1 );
  }
  this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );
  this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );

  for( var j = 0; j < l - 1; j++ ) {
    var n = j * 2;
    this.indices_array.push( n, n + 1, n + 2 );
    this.indices_array.push( n + 2, n + 1, n + 3 );
  }

  if (!this.attributes) {
    this.attributes = {
      position: new THREE.BufferAttribute( new Float32Array( this.positions ), 3 ),
      previous: new THREE.BufferAttribute( new Float32Array( this.previous ), 3 ),
      next: new THREE.BufferAttribute( new Float32Array( this.next ), 3 ),
      side: new THREE.BufferAttribute( new Float32Array( this.side ), 1 ),
      width: new THREE.BufferAttribute( new Float32Array( this.width ), 1 ),
      uv: new THREE.BufferAttribute( new Float32Array( this.uvs ), 2 ),
      index: new THREE.BufferAttribute( new Uint16Array( this.indices_array ), 1 ),
      counters: new THREE.BufferAttribute( new Float32Array( this.counters ), 1 )
    }
  } else {
    this.attributes.position.copyArray(new Float32Array(this.positions));
    this.attributes.position.needsUpdate = true;
    this.attributes.previous.copyArray(new Float32Array(this.previous));
    this.attributes.previous.needsUpdate = true;
    this.attributes.next.copyArray(new Float32Array(this.next));
    this.attributes.next.needsUpdate = true;
    this.attributes.side.copyArray(new Float32Array(this.side));
    this.attributes.side.needsUpdate = true;
    this.attributes.width.copyArray(new Float32Array(this.width));
    this.attributes.width.needsUpdate = true;
    this.attributes.uv.copyArray(new Float32Array(this.uvs));
    this.attributes.uv.needsUpdate = true;
    this.attributes.index.copyArray(new Uint16Array(this.indices_array));
    this.attributes.index.needsUpdate = true;
    }

  this.geometry.addAttribute( 'position', this.attributes.position );
  this.geometry.addAttribute( 'previous', this.attributes.previous );
  this.geometry.addAttribute( 'next', this.attributes.next );
  this.geometry.addAttribute( 'side', this.attributes.side );
  this.geometry.addAttribute( 'width', this.attributes.width );
  this.geometry.addAttribute( 'uv', this.attributes.uv );
  this.geometry.addAttribute( 'counters', this.attributes.counters );

  this.geometry.setIndex( this.attributes.index );

}

function memcpy (src, srcOffset, dst, dstOffset, length) {
  var i

  src = src.subarray || src.slice ? src : src.buffer
  dst = dst.subarray || dst.slice ? dst : dst.buffer

  src = srcOffset ? src.subarray ?
  src.subarray(srcOffset, length && srcOffset + length) :
  src.slice(srcOffset, length && srcOffset + length) : src

  if (dst.set) {
    dst.set(src, dstOffset)
  } else {
    for (i=0; i<src.length; i++) {
      dst[i + dstOffset] = src[i]
    }
  }

  return dst
}

/**
 * Fast method to advance the line by one position.  The oldest position is removed.
 * @param position
 */
MeshLine.prototype.advance = function(position) {

  var positions = this.attributes.position.array;
  var previous = this.attributes.previous.array;
  var next = this.attributes.next.array;
  var l = positions.length;

  // PREVIOUS
  memcpy( positions, 0, previous, 0, l );

  // POSITIONS
  memcpy( positions, 6, positions, 0, l - 6 );

  positions[l - 6] = position.x;
  positions[l - 5] = position.y;
  positions[l - 4] = position.z;
  positions[l - 3] = position.x;
  positions[l - 2] = position.y;
  positions[l - 1] = position.z;

    // NEXT
  memcpy( positions, 6, next, 0, l - 6 );

  next[l - 6]  = position.x;
  next[l - 5]  = position.y;
  next[l - 4]  = position.z;
  next[l - 3]  = position.x;
  next[l - 2]  = position.y;
  next[l - 1]  = position.z;

  this.attributes.position.needsUpdate = true;
  this.attributes.previous.needsUpdate = true;
  this.attributes.next.needsUpdate = true;

};

function MeshLineMaterial( parameters ) {

  var vertexShaderSource = [
'precision highp float;',
'',
'attribute vec3 position;',
'attribute vec3 previous;',
'attribute vec3 next;',
'attribute float side;',
'attribute float width;',
'attribute vec2 uv;',
'attribute float counters;',
'',
'uniform mat4 projectionMatrix;',
'uniform mat4 modelViewMatrix;',
'uniform vec2 resolution;',
'uniform float lineWidth;',
'uniform vec3 color;',
'uniform float opacity;',
'uniform float near;',
'uniform float far;',
'uniform float sizeAttenuation;',
'',
'varying vec2 vUV;',
'varying vec4 vColor;',
'varying float vCounters;',
'',
'vec2 fix( vec4 i, float aspect ) {',
'',
'    vec2 res = i.xy / i.w;',
'    res.x *= aspect;',
'  vCounters = counters;',
'    return res;',
'',
'}',
'',
'void main() {',
'',
'    float aspect = resolution.x / resolution.y;',
'  float pixelWidthRatio = 1. / (resolution.x * projectionMatrix[0][0]);',
'',
'    vColor = vec4( color, opacity );',
'    vUV = uv;',
'',
'    mat4 m = projectionMatrix * modelViewMatrix;',
'    vec4 finalPosition = m * vec4( position, 1.0 );',
'    vec4 prevPos = m * vec4( previous, 1.0 );',
'    vec4 nextPos = m * vec4( next, 1.0 );',
'',
'    vec2 currentP = fix( finalPosition, aspect );',
'    vec2 prevP = fix( prevPos, aspect );',
'    vec2 nextP = fix( nextPos, aspect );',
'',
'  float pixelWidth = finalPosition.w * pixelWidthRatio;',
'    float w = 1.8 * pixelWidth * lineWidth * width;',
'',
'    if( sizeAttenuation == 1. ) {',
'        w = 1.8 * lineWidth * width;',
'    }',
'',
'    vec2 dir;',
'    if( nextP == currentP ) dir = normalize( currentP - prevP );',
'    else if( prevP == currentP ) dir = normalize( nextP - currentP );',
'    else {',
'        vec2 dir1 = normalize( currentP - prevP );',
'        vec2 dir2 = normalize( nextP - currentP );',
'        dir = normalize( dir1 + dir2 );',
'',
'        vec2 perp = vec2( -dir1.y, dir1.x );',
'        vec2 miter = vec2( -dir.y, dir.x );',
'        //w = clamp( w / dot( miter, perp ), 0., 4. * lineWidth * width );',
'',
'    }',
'',
'    //vec2 normal = ( cross( vec3( dir, 0. ), vec3( 0., 0., 1. ) ) ).xy;',
'    vec2 normal = vec2( -dir.y, dir.x );',
'    normal.x /= aspect;',
'    normal *= .5 * w;',
'',
'    vec4 offset = vec4( normal * side, 0.0, 1.0 );',
'    finalPosition.xy += offset.xy;',
'',
'    gl_Position = finalPosition;',
'',
'}' ];

  var fragmentShaderSource = [
    '#extension GL_OES_standard_derivatives : enable',
'precision mediump float;',
'',
'uniform sampler2D map;',
'uniform sampler2D alphaMap;',
'uniform float useMap;',
'uniform float useAlphaMap;',
'uniform float useDash;',
'uniform vec2 dashArray;',
'uniform float visibility;',
'uniform float alphaTest;',
'uniform vec2 repeat;',
'',
'varying vec2 vUV;',
'varying vec4 vColor;',
'varying float vCounters;',
'',
'void main() {',
'',
'    vec4 c = vColor;',
'    if( useMap == 1. ) c *= texture2D( map, vUV * repeat );',
'    if( useAlphaMap == 1. ) c.a *= texture2D( alphaMap, vUV * repeat ).a;',
'  if( c.a < alphaTest ) discard;',
'  if( useDash == 1. ){',
'    ',
'  }',
'    gl_FragColor = c;',
'  gl_FragColor.a *= step(vCounters,visibility);',
'}' ];

  function check( v, d ) {
    if( v === undefined ) return d;
    return v;
  }

  THREE.Material.call( this );

  parameters = parameters || {};

  this.lineWidth = check( parameters.lineWidth, 1 );
  this.map = check( parameters.map, null );
  this.useMap = check( parameters.useMap, 0 );
  this.alphaMap = check( parameters.alphaMap, null );
  this.useAlphaMap = check( parameters.useAlphaMap, 0 );
  this.color = check( parameters.color, new THREE.Color( 0xffffff ) );
  this.opacity = check( parameters.opacity, 1 );
  this.resolution = check( parameters.resolution, new THREE.Vector2( 1, 1 ) );
  this.sizeAttenuation = check( parameters.sizeAttenuation, 1 );
  this.near = check( parameters.near, 1 );
  this.far = check( parameters.far, 1 );
  this.dashArray = check( parameters.dashArray, [] );
  this.useDash = ( this.dashArray !== [] ) ? 1 : 0;
  this.visibility = check( parameters.visibility, 1 );
  this.alphaTest = check( parameters.alphaTest, 0 );
  this.repeat = check( parameters.repeat, new THREE.Vector2( 1, 1 ) );

  var material = new THREE.RawShaderMaterial( {
    uniforms:{
      lineWidth: { type: 'f', value: this.lineWidth },
      map: { type: 't', value: this.map },
      useMap: { type: 'f', value: this.useMap },
      alphaMap: { type: 't', value: this.alphaMap },
      useAlphaMap: { type: 'f', value: this.useAlphaMap },
      color: { type: 'c', value: this.color },
      opacity: { type: 'f', value: this.opacity },
      resolution: { type: 'v2', value: this.resolution },
      sizeAttenuation: { type: 'f', value: this.sizeAttenuation },
      near: { type: 'f', value: this.near },
      far: { type: 'f', value: this.far },
      dashArray: { type: 'v2', value: new THREE.Vector2( this.dashArray[ 0 ], this.dashArray[ 1 ] ) },
      useDash: { type: 'f', value: this.useDash },
      visibility: {type: 'f', value: this.visibility},
      alphaTest: {type: 'f', value: this.alphaTest},
      repeat: { type: 'v2', value: this.repeat }
    },
    vertexShader: vertexShaderSource.join( '\r\n' ),
    fragmentShader: fragmentShaderSource.join( '\r\n' )
  });

  delete parameters.lineWidth;
  delete parameters.map;
  delete parameters.useMap;
  delete parameters.alphaMap;
  delete parameters.useAlphaMap;
  delete parameters.color;
  delete parameters.opacity;
  delete parameters.resolution;
  delete parameters.sizeAttenuation;
  delete parameters.near;
  delete parameters.far;
  delete parameters.dashArray;
  delete parameters.visibility;
  delete parameters.alphaTest;
  delete parameters.repeat;

  material.type = 'MeshLineMaterial';

  material.setValues( parameters );

  return material;

};

MeshLineMaterial.prototype = Object.create( THREE.Material.prototype );
MeshLineMaterial.prototype.constructor = MeshLineMaterial;

MeshLineMaterial.prototype.copy = function ( source ) {

  THREE.Material.prototype.copy.call( this, source );

  this.lineWidth = source.lineWidth;
  this.map = source.map;
  this.useMap = source.useMap;
  this.alphaMap = source.alphaMap;
  this.useAlphaMap = source.useAlphaMap;
  this.color.copy( source.color );
  this.opacity = source.opacity;
  this.resolution.copy( source.resolution );
  this.sizeAttenuation = source.sizeAttenuation;
  this.near = source.near;
  this.far = source.far;
  this.dashArray.copy( source.dashArray );
  this.useDash = source.useDash;
  this.visibility = source.visibility;
  this.alphaTest = source.alphaTest;
  this.repeat.copy( source.repeat );

  return this;

};

if( typeof exports !== 'undefined' ) {
  if( typeof module !== 'undefined' && module.exports ) {
    exports = module.exports = { MeshLine: MeshLine, MeshLineMaterial: MeshLineMaterial };
  }
  exports.MeshLine = MeshLine;
  exports.MeshLineMaterial = MeshLineMaterial;
}
else {
  root.MeshLine = MeshLine;
  root.MeshLineMaterial = MeshLineMaterial;
}

}).call(this);


/* VARIABLES */

var canvas, scene, renderer, data;

// Cache DOM selectors
var container = document.getElementsByClassName('js-globe')[0];

// Object for country HTML elements and variables
var elements = {};

// Three group objects
var groups = {
  main: null, // A group containing everything
  globe: null, // A group containing the globe sphere (and globe dots)
  globeDots: null, // A group containing the globe dots
  lines: null, // A group containing the lines between each country
  lineDots: null // A group containing the line dots
};

// Map properties for creation and rendering
var props = {
  mapSize: {
    // Size of the map from the intial source image (on which the dots are positioned on)
    width: 2048 / 2,
    height: 1024 / 2
  },
  globeRadius: 200, // Radius of the globe (used for many calculations)
  dotsAmount: 20, // Amount of dots to generate and animate randomly across the lines
  startingCountry: 'hongkong', // The key of the country to rotate the camera to during the introduction animation (and which country to start the cycle at)
  colours: {
    // Cache the colours
    globeDots: '#444444', // No need to use the Three constructor as this value is used for the HTML canvas drawing 'fillStyle' property
    // lines: new THREE.Color('#ff717a'),
    lines: new THREE.Color('#2dc0ff'),
    // lineDots: new THREE.Color('#ffc22d')
    lineDots: new THREE.Color('#57ebff')
  },
  widths: {
    lines: 0.25
  },
  alphas: {
    // Transparent values of materials
    globe: 0.4,
    lines: 0.5
  }
};

// Angles used for animating the camera
var camera = {
  object: null, // Three object of the camera
  controls: null, // Three object of the orbital controls
  angles: {
    // Object of the camera angles for animating
    current: {
      azimuthal: null,
      polar: null
    },
    target: {
      azimuthal: null,
      polar: null
    }
  }
};

// Booleans and values for animations
var animations = {
  finishedIntro: false, // Boolean of when the intro animations have finished
  dots: {
    current: 0, // Animation frames of the globe dots introduction animation
    total: 170, // Total frames (duration) of the globe dots introduction animation,
    points: [] // Array to clone the globe dots coordinates to
  },
  globe: {
    current: 0, // Animation frames of the globe introduction animation
    total: 80, // Total frames (duration) of the globe introduction animation,
  },
  countries: {
    active: false, // Boolean if the country elements have been added and made active
    animating: false, // Boolean if the countries are currently being animated
    current: 0, // Animation frames of country elements introduction animation
    total: 120, // Total frames (duration) of the country elements introduction animation
    selected: null, // Three group object of the currently selected country
    index: null, // Index of the country in the data array
    timeout: null, // Timeout object for cycling to the next country
    initialDuration: 5000, // Initial timeout duration before starting the country cycle
    duration: 2000 // Timeout duration between cycling to the next country
  }
};

// Boolean to enable or disable rendering when window is in or out of focus
var isHidden = false;



/* SETUP */

function getData() {
  data = {"points":[{"x":489,"y":153},{"x":1559,"y":489},{"x":372,"y":342},{"x":1316,"y":271},{"x":372,"y":71},{"x":1458,"y":489},{"x":795,"y":53},{"x":318,"y":270},{"x":516,"y":162},{"x":1383,"y":246},{"x":840,"y":666},{"x":858,"y":630},{"x":687,"y":44},{"x":1467,"y":44},{"x":147,"y":252},{"x":183,"y":207},{"x":1223,"y":187},{"x":1442,"y":573},{"x":1039,"y":540},{"x":1534,"y":120},{"x":1458,"y":414},{"x":1257,"y":254},{"x":192,"y":216},{"x":913,"y":135},{"x":183,"y":297},{"x":1475,"y":624},{"x":1257,"y":330},{"x":570,"y":26},{"x":1181,"y":229},{"x":1517,"y":523},{"x":1417,"y":103},{"x":183,"y":396},{"x":1610,"y":78},{"x":300,"y":621},{"x":426,"y":297},{"x":795,"y":630},{"x":345,"y":441},{"x":561,"y":62},{"x":471,"y":107},{"x":723,"y":35},{"x":264,"y":89},{"x":822,"y":540},{"x":354,"y":432},{"x":120,"y":396},{"x":1391,"y":540},{"x":183,"y":594},{"x":291,"y":630},{"x":291,"y":360},{"x":57,"y":279},{"x":1542,"y":590},{"x":1299,"y":364},{"x":678,"y":44},{"x":363,"y":369},{"x":1442,"y":431},{"x":1450,"y":489},{"x":192,"y":89},{"x":246,"y":540},{"x":1232,"y":221},{"x":606,"y":270},{"x":1375,"y":280},{"x":255,"y":71},{"x":1265,"y":263},{"x":1500,"y":632},{"x":1626,"y":44},{"x":570,"y":414},{"x":1391,"y":338},{"x":1391,"y":112},{"x":561,"y":189},{"x":21,"y":423},{"x":444,"y":315},{"x":597,"y":360},{"x":958,"y":621},{"x":1492,"y":506},{"x":949,"y":603},{"x":246,"y":342},{"x":1652,"y":11},{"x":273,"y":144},{"x":759,"y":180},{"x":786,"y":153},{"x":1358,"y":422},{"x":102,"y":234},{"x":462,"y":207},{"x":1391,"y":238},{"x":696,"y":207},{"x":958,"y":540},{"x":931,"y":675},{"x":246,"y":567},{"x":660,"y":315},{"x":1534,"y":565},{"x":1341,"y":170},{"x":1702,"y":36},{"x":1458,"y":431},{"x":732,"y":414},{"x":183,"y":107},{"x":1450,"y":447},{"x":399,"y":423},{"x":282,"y":657},{"x":66,"y":360},{"x":282,"y":144},{"x":30,"y":405},{"x":1467,"y":540},{"x":976,"y":657},{"x":408,"y":189},{"x":156,"y":288},{"x":795,"y":71},{"x":1307,"y":246},{"x":237,"y":171},{"x":1223,"y":145},{"x":903,"y":720},{"x":165,"y":432},{"x":1341,"y":179},{"x":1475,"y":657},{"x":1198,"y":112},{"x":498,"y":288},{"x":1249,"y":263},{"x":471,"y":162},{"x":1358,"y":288},{"x":903,"y":657},{"x":282,"y":62},{"x":471,"y":279},{"x":958,"y":630},{"x":1173,"y":95},{"x":345,"y":198},{"x":345,"y":486},{"x":1366,"y":187},{"x":1383,"y":313},{"x":246,"y":666},{"x":57,"y":351},{"x":1433,"y":573},{"x":967,"y":648},{"x":1366,"y":254},{"x":822,"y":693},{"x":606,"y":234},{"x":1534,"y":187},{"x":201,"y":71},{"x":525,"y":162},{"x":30,"y":378},{"x":588,"y":189},{"x":444,"y":279},{"x":1534,"y":61},{"x":534,"y":53},{"x":1417,"y":447},{"x":255,"y":648},{"x":174,"y":603},{"x":561,"y":225},{"x":435,"y":116},{"x":264,"y":639},{"x":1333,"y":212},{"x":1509,"y":481},{"x":516,"y":98},{"x":1761,"y":86},{"x":174,"y":125},{"x":201,"y":423},{"x":696,"y":71},{"x":273,"y":675},{"x":786,"y":270},{"x":138,"y":432},{"x":1568,"y":523},{"x":111,"y":144},{"x":1635,"y":78},{"x":705,"y":495},{"x":192,"y":513},{"x":363,"y":306},{"x":534,"y":144},{"x":1425,"y":473},{"x":129,"y":324},{"x":75,"y":279},{"x":525,"y":234},{"x":201,"y":603},{"x":1559,"y":531},{"x":1492,"y":531},{"x":345,"y":125},{"x":1450,"y":431},{"x":1702,"y":70},{"x":174,"y":459},{"x":1534,"y":615},{"x":741,"y":297},{"x":408,"y":297},{"x":1366,"y":145},{"x":246,"y":639},{"x":291,"y":342},{"x":318,"y":567},{"x":192,"y":576},{"x":345,"y":270},{"x":894,"y":621},{"x":633,"y":89},{"x":1148,"y":86},{"x":39,"y":432},{"x":237,"y":387},{"x":1349,"y":103},{"x":57,"y":270},{"x":507,"y":162},{"x":291,"y":234},{"x":732,"y":53},{"x":1509,"y":112},{"x":462,"y":225},{"x":1333,"y":380},{"x":759,"y":98},{"x":1066,"y":621},{"x":291,"y":62},{"x":354,"y":405},{"x":714,"y":351},{"x":174,"y":396},{"x":1291,"y":263},{"x":1265,"y":187},{"x":1257,"y":246},{"x":579,"y":297},{"x":1475,"y":523},{"x":111,"y":396},{"x":931,"y":62},{"x":804,"y":216},{"x":1400,"y":557},{"x":318,"y":144},{"x":183,"y":116},{"x":534,"y":342},{"x":678,"y":171},{"x":633,"y":315},{"x":237,"y":62},{"x":174,"y":495},{"x":913,"y":144},{"x":228,"y":441},{"x":1333,"y":355},{"x":1626,"y":112},{"x":1551,"y":498},{"x":138,"y":342},{"x":1333,"y":229},{"x":1316,"y":145},{"x":813,"y":675},{"x":543,"y":135},{"x":579,"y":351},{"x":354,"y":306},{"x":336,"y":495},{"x":345,"y":459},{"x":372,"y":98},{"x":687,"y":414},{"x":660,"y":369},{"x":1442,"y":691},{"x":903,"y":585},{"x":354,"y":261},{"x":408,"y":116},{"x":165,"y":288},{"x":183,"y":531},{"x":1417,"y":523},{"x":687,"y":396},{"x":1500,"y":523},{"x":822,"y":621},{"x":237,"y":243},{"x":1265,"y":212},{"x":381,"y":279},{"x":201,"y":675},{"x":1744,"y":36},{"x":696,"y":225},{"x":1057,"y":549},{"x":804,"y":80},{"x":471,"y":225},{"x":1123,"y":128},{"x":1433,"y":473},{"x":1484,"y":615},{"x":1341,"y":112},{"x":732,"y":315},{"x":777,"y":89},{"x":1391,"y":447},{"x":138,"y":405},{"x":435,"y":53},{"x":84,"y":441},{"x":624,"y":252},{"x":219,"y":531},{"x":1232,"y":229},{"x":1257,"y":338},{"x":1408,"y":86},{"x":165,"y":297},{"x":831,"y":594},{"x":309,"y":171},{"x":759,"y":243},{"x":183,"y":144},{"x":156,"y":297},{"x":300,"y":585},{"x":1500,"y":683},{"x":1500,"y":531},{"x":516,"y":107},{"x":723,"y":360},{"x":210,"y":603},{"x":381,"y":603},{"x":237,"y":116},{"x":615,"y":225},{"x":651,"y":342},{"x":913,"y":675},{"x":615,"y":98},{"x":138,"y":288},{"x":219,"y":621},{"x":1509,"y":649},{"x":561,"y":369},{"x":940,"y":711},{"x":435,"y":62},{"x":1542,"y":515},{"x":516,"y":315},{"x":894,"y":125},{"x":1442,"y":540},{"x":777,"y":306},{"x":1223,"y":137},{"x":732,"y":297},{"x":300,"y":125},{"x":255,"y":225},{"x":597,"y":44},{"x":1408,"y":162},{"x":75,"y":225},{"x":291,"y":125},{"x":390,"y":333},{"x":453,"y":198},{"x":1105,"y":120},{"x":1299,"y":112},{"x":597,"y":315},{"x":264,"y":144},{"x":624,"y":35},{"x":255,"y":693},{"x":723,"y":315},{"x":1375,"y":78},{"x":1400,"y":154},{"x":1509,"y":473},{"x":1156,"y":95},{"x":714,"y":513},{"x":1433,"y":641},{"x":1433,"y":204},{"x":183,"y":495},{"x":264,"y":351},{"x":678,"y":351},{"x":1677,"y":78},{"x":300,"y":360},{"x":1433,"y":422},{"x":777,"y":657},{"x":1458,"y":70},{"x":687,"y":270},{"x":1475,"y":439},{"x":453,"y":216},{"x":66,"y":405},{"x":678,"y":270},{"x":291,"y":252},{"x":1417,"y":44},{"x":75,"y":450},{"x":363,"y":116},{"x":922,"y":630},{"x":246,"y":198},{"x":1349,"y":238},{"x":66,"y":153},{"x":1375,"y":464},{"x":1274,"y":70},{"x":426,"y":225},{"x":732,"y":116},{"x":687,"y":261},{"x":651,"y":80},{"x":1542,"y":162},{"x":507,"y":189},{"x":732,"y":107},{"x":354,"y":459},{"x":1467,"y":649},{"x":1307,"y":170},{"x":588,"y":270},{"x":507,"y":89},{"x":1349,"y":187},{"x":1458,"y":724},{"x":1316,"y":170},{"x":48,"y":369},{"x":1450,"y":590},{"x":1383,"y":70},{"x":597,"y":35},{"x":1232,"y":246},{"x":255,"y":288},{"x":1467,"y":506},{"x":498,"y":62},{"x":1584,"y":28},{"x":1593,"y":540},{"x":219,"y":360},{"x":1349,"y":196},{"x":1517,"y":699},{"x":120,"y":342},{"x":1299,"y":212},{"x":1400,"y":439},{"x":129,"y":162},{"x":696,"y":288},{"x":192,"y":594},{"x":408,"y":53},{"x":570,"y":62},{"x":1576,"y":515},{"x":750,"y":270},{"x":1417,"y":498},{"x":696,"y":171},{"x":381,"y":252},{"x":958,"y":657},{"x":372,"y":423},{"x":1198,"y":246},{"x":426,"y":207},{"x":1223,"y":296},{"x":462,"y":80},{"x":1383,"y":154},{"x":282,"y":531},{"x":940,"y":603},{"x":246,"y":585},{"x":381,"y":594},{"x":291,"y":414},{"x":1425,"y":78},{"x":381,"y":125},{"x":264,"y":558},{"x":1084,"y":729},{"x":1282,"y":355},{"x":1307,"y":145},{"x":138,"y":153},{"x":1282,"y":254},{"x":1375,"y":162},{"x":795,"y":144},{"x":345,"y":405},{"x":516,"y":270},{"x":1450,"y":464},{"x":1668,"y":19},{"x":183,"y":603},{"x":1408,"y":78},{"x":111,"y":324},{"x":336,"y":279},{"x":219,"y":44},{"x":462,"y":53},{"x":1475,"y":540},{"x":1408,"y":489},{"x":1484,"y":78},{"x":1408,"y":531},{"x":282,"y":522},{"x":1383,"y":179},{"x":922,"y":612},{"x":237,"y":153},{"x":48,"y":351},{"x":1375,"y":204},{"x":381,"y":342},{"x":696,"y":333},{"x":138,"y":324},{"x":651,"y":135},{"x":1593,"y":582},{"x":237,"y":630},{"x":444,"y":80},{"x":462,"y":116},{"x":949,"y":522},{"x":1542,"y":557},{"x":723,"y":396},{"x":669,"y":71},{"x":903,"y":567},{"x":399,"y":342},{"x":615,"y":80},{"x":147,"y":297},{"x":696,"y":44},{"x":219,"y":702},{"x":561,"y":180},{"x":822,"y":405},{"x":210,"y":71},{"x":633,"y":198},{"x":732,"y":216},{"x":1257,"y":288},{"x":1660,"y":78},{"x":120,"y":360},{"x":237,"y":306},{"x":1257,"y":179},{"x":444,"y":216},{"x":750,"y":261},{"x":723,"y":270},{"x":1517,"y":540},{"x":93,"y":378},{"x":922,"y":720},{"x":678,"y":98},{"x":255,"y":450},{"x":1467,"y":565},{"x":696,"y":369},{"x":687,"y":252},{"x":201,"y":62},{"x":102,"y":351},{"x":1105,"y":103},{"x":642,"y":35},{"x":840,"y":675},{"x":1509,"y":683},{"x":408,"y":378},{"x":1442,"y":489},{"x":255,"y":44},{"x":678,"y":153},{"x":1517,"y":691},{"x":642,"y":171},{"x":642,"y":98},{"x":579,"y":107},{"x":138,"y":387},{"x":561,"y":252},{"x":1223,"y":238},{"x":318,"y":387},{"x":1198,"y":288},{"x":390,"y":198},{"x":219,"y":693},{"x":1341,"y":78},{"x":669,"y":360},{"x":165,"y":198},{"x":1517,"y":800},{"x":1375,"y":120},{"x":1568,"y":565},{"x":498,"y":297},{"x":687,"y":162},{"x":228,"y":675},{"x":507,"y":153},{"x":183,"y":198},{"x":1534,"y":128},{"x":264,"y":468},{"x":786,"y":162},{"x":967,"y":71},{"x":219,"y":116},{"x":516,"y":53},{"x":885,"y":252},{"x":1719,"y":28},{"x":471,"y":234},{"x":831,"y":207},{"x":291,"y":495},{"x":1593,"y":506},{"x":1391,"y":145},{"x":660,"y":297},{"x":57,"y":324},{"x":516,"y":35},{"x":309,"y":162},{"x":489,"y":171},{"x":615,"y":324},{"x":1727,"y":53},{"x":1484,"y":724},{"x":750,"y":62},{"x":570,"y":333},{"x":786,"y":279},{"x":1626,"y":53},{"x":408,"y":270},{"x":282,"y":648},{"x":1383,"y":44},{"x":579,"y":71},{"x":1500,"y":599},{"x":372,"y":621},{"x":282,"y":243},{"x":1358,"y":187},{"x":219,"y":107},{"x":291,"y":189},{"x":768,"y":657},{"x":1442,"y":607},{"x":885,"y":603},{"x":192,"y":657},{"x":1232,"y":170},{"x":1341,"y":212},{"x":849,"y":585},{"x":1408,"y":103},{"x":48,"y":333},{"x":318,"y":153},{"x":786,"y":306},{"x":777,"y":62},{"x":327,"y":432},{"x":1475,"y":179},{"x":336,"y":180},{"x":1761,"y":11},{"x":768,"y":540},{"x":210,"y":540},{"x":723,"y":189},{"x":462,"y":162},{"x":696,"y":486},{"x":1249,"y":271},{"x":1635,"y":95},{"x":1542,"y":641},{"x":1349,"y":263},{"x":633,"y":153},{"x":462,"y":35},{"x":714,"y":216},{"x":1307,"y":221},{"x":372,"y":432},{"x":201,"y":189},{"x":1257,"y":162},{"x":300,"y":378},{"x":768,"y":216},{"x":255,"y":116},{"x":1643,"y":28},{"x":201,"y":441},{"x":624,"y":107},{"x":48,"y":306},{"x":1358,"y":229},{"x":922,"y":711},{"x":1526,"y":137},{"x":903,"y":666},{"x":1383,"y":305},{"x":931,"y":513},{"x":1475,"y":447},{"x":1181,"y":86},{"x":435,"y":180},{"x":1066,"y":747},{"x":949,"y":684},{"x":498,"y":243},{"x":417,"y":44},{"x":174,"y":441},{"x":480,"y":261},{"x":489,"y":26},{"x":714,"y":189},{"x":1534,"y":19},{"x":228,"y":234},{"x":795,"y":450},{"x":210,"y":657},{"x":273,"y":98},{"x":309,"y":135},{"x":390,"y":107},{"x":138,"y":279},{"x":1291,"y":288},{"x":354,"y":243},{"x":687,"y":288},{"x":1333,"y":238},{"x":93,"y":360},{"x":156,"y":216},{"x":1240,"y":78},{"x":1526,"y":447},{"x":894,"y":684},{"x":1442,"y":708},{"x":849,"y":107},{"x":633,"y":144},{"x":624,"y":144},{"x":903,"y":144},{"x":264,"y":657},{"x":1442,"y":78},{"x":615,"y":315},{"x":534,"y":17},{"x":480,"y":80},{"x":381,"y":459},{"x":561,"y":414},{"x":669,"y":207},{"x":201,"y":576},{"x":1358,"y":179},{"x":390,"y":594},{"x":1517,"y":531},{"x":1232,"y":179},{"x":813,"y":162},{"x":372,"y":125},{"x":696,"y":432},{"x":552,"y":369},{"x":111,"y":405},{"x":849,"y":62},{"x":570,"y":261},{"x":1492,"y":464},{"x":201,"y":107},{"x":534,"y":261},{"x":588,"y":171},{"x":102,"y":414},{"x":1660,"y":61},{"x":543,"y":144},{"x":669,"y":144},{"x":1417,"y":439},{"x":570,"y":360},{"x":1265,"y":204},{"x":633,"y":234},{"x":931,"y":648},{"x":849,"y":639},{"x":759,"y":324},{"x":1012,"y":513},{"x":1215,"y":162},{"x":399,"y":369},{"x":183,"y":315},{"x":1417,"y":137},{"x":408,"y":243},{"x":858,"y":53},{"x":940,"y":513},{"x":21,"y":369},{"x":570,"y":342},{"x":678,"y":324},{"x":1030,"y":774},{"x":282,"y":98},{"x":849,"y":80},{"x":1551,"y":582},{"x":1366,"y":86},{"x":264,"y":71},{"x":1542,"y":506},{"x":291,"y":135},{"x":795,"y":675},{"x":1425,"y":229},{"x":39,"y":396},{"x":156,"y":171},{"x":1744,"y":11},{"x":1291,"y":120},{"x":165,"y":180},{"x":552,"y":44},{"x":534,"y":80},{"x":1299,"y":70},{"x":354,"y":423},{"x":453,"y":80},{"x":273,"y":414},{"x":192,"y":324},{"x":1660,"y":36},{"x":922,"y":666},{"x":102,"y":288},{"x":705,"y":207},{"x":543,"y":234},{"x":1433,"y":506},{"x":1593,"y":515},{"x":1500,"y":103},{"x":1626,"y":61},{"x":822,"y":71},{"x":1198,"y":61},{"x":309,"y":387},{"x":903,"y":125},{"x":174,"y":333},{"x":1274,"y":103},{"x":1442,"y":212},{"x":723,"y":378},{"x":1467,"y":439},{"x":1408,"y":431},{"x":849,"y":441},{"x":111,"y":414},{"x":931,"y":603},{"x":147,"y":351},{"x":417,"y":360},{"x":723,"y":297},{"x":318,"y":62},{"x":687,"y":468},{"x":93,"y":396},{"x":273,"y":639},{"x":1500,"y":573},{"x":264,"y":540},{"x":129,"y":423},{"x":1257,"y":120},{"x":1391,"y":170},{"x":624,"y":53},{"x":534,"y":315},{"x":291,"y":666},{"x":291,"y":585},{"x":480,"y":125},{"x":318,"y":306},{"x":714,"y":387},{"x":543,"y":351},{"x":363,"y":270},{"x":1265,"y":196},{"x":651,"y":171},{"x":264,"y":80},{"x":1131,"y":95},{"x":534,"y":216},{"x":1736,"y":44},{"x":237,"y":423},{"x":1181,"y":78},{"x":264,"y":432},{"x":552,"y":243},{"x":1316,"y":103},{"x":1526,"y":481},{"x":949,"y":576},{"x":1299,"y":229},{"x":1542,"y":19},{"x":1442,"y":683},{"x":84,"y":297},{"x":1484,"y":582},{"x":687,"y":378},{"x":903,"y":612},{"x":363,"y":360},{"x":678,"y":135},{"x":1391,"y":103},{"x":1391,"y":128},{"x":1358,"y":263},{"x":354,"y":125},{"x":1576,"y":498},{"x":579,"y":144},{"x":1526,"y":162},{"x":1442,"y":44},{"x":579,"y":234},{"x":561,"y":306},{"x":777,"y":477},{"x":1349,"y":414},{"x":210,"y":702},{"x":903,"y":648},{"x":1635,"y":44},{"x":931,"y":621},{"x":1719,"y":36},{"x":525,"y":288},{"x":1475,"y":431},{"x":534,"y":89},{"x":1509,"y":456},{"x":219,"y":585},{"x":1450,"y":364},{"x":192,"y":468},{"x":1223,"y":179},{"x":1484,"y":548},{"x":822,"y":80},{"x":804,"y":477},{"x":705,"y":125},{"x":1694,"y":44},{"x":741,"y":252},{"x":282,"y":225},{"x":1484,"y":473},{"x":759,"y":702},{"x":219,"y":594},{"x":372,"y":630},{"x":822,"y":396},{"x":597,"y":89},{"x":273,"y":107},{"x":579,"y":171},{"x":741,"y":153},{"x":1584,"y":515},{"x":768,"y":198},{"x":480,"y":144},{"x":768,"y":207},{"x":1400,"y":565},{"x":102,"y":189},{"x":669,"y":180},{"x":894,"y":765},{"x":714,"y":306},{"x":687,"y":135},{"x":291,"y":378},{"x":1635,"y":36},{"x":606,"y":261},{"x":660,"y":107},{"x":201,"y":53},{"x":1677,"y":11},{"x":1492,"y":145},{"x":201,"y":98},{"x":327,"y":98},{"x":201,"y":432},{"x":228,"y":98},{"x":678,"y":80},{"x":831,"y":144},{"x":435,"y":279},{"x":1526,"y":531},{"x":516,"y":80},{"x":462,"y":180},{"x":777,"y":486},{"x":1626,"y":28},{"x":1668,"y":53},{"x":444,"y":261},{"x":327,"y":423},{"x":516,"y":8},{"x":1265,"y":347},{"x":1517,"y":456},{"x":624,"y":135},{"x":858,"y":71},{"x":831,"y":612},{"x":903,"y":729},{"x":471,"y":62},{"x":345,"y":62},{"x":543,"y":53},{"x":588,"y":261},{"x":174,"y":423},{"x":363,"y":135},{"x":1333,"y":288},{"x":228,"y":693},{"x":93,"y":369},{"x":768,"y":315},{"x":201,"y":333},{"x":165,"y":189},{"x":444,"y":35},{"x":669,"y":171},{"x":336,"y":540},{"x":1223,"y":78},{"x":813,"y":612},{"x":93,"y":270},{"x":336,"y":153},{"x":804,"y":450},{"x":1408,"y":565},{"x":264,"y":612},{"x":453,"y":243},{"x":480,"y":116},{"x":84,"y":396},{"x":1517,"y":515},{"x":147,"y":369},{"x":201,"y":549},{"x":1526,"y":607},{"x":435,"y":297},{"x":669,"y":288},{"x":291,"y":297},{"x":687,"y":171},{"x":768,"y":495},{"x":1215,"y":154},{"x":1526,"y":70},{"x":1458,"y":766},{"x":858,"y":639},{"x":588,"y":279},{"x":732,"y":387},{"x":597,"y":216},{"x":111,"y":180},{"x":1551,"y":607},{"x":813,"y":639},{"x":1643,"y":70},{"x":1249,"y":95},{"x":1509,"y":657},{"x":327,"y":270},{"x":219,"y":144},{"x":498,"y":189},{"x":102,"y":216},{"x":768,"y":324},{"x":507,"y":116},{"x":1618,"y":78},{"x":93,"y":333},{"x":588,"y":71},{"x":300,"y":495},{"x":102,"y":261},{"x":867,"y":630},{"x":1093,"y":738},{"x":372,"y":315},{"x":462,"y":216},{"x":741,"y":53},{"x":1744,"y":86},{"x":1442,"y":439},{"x":931,"y":666},{"x":75,"y":432},{"x":723,"y":107},{"x":858,"y":657},{"x":840,"y":603},{"x":1223,"y":154},{"x":183,"y":288},{"x":309,"y":423},{"x":228,"y":378},{"x":309,"y":531},{"x":1652,"y":53},{"x":489,"y":162},{"x":876,"y":630},{"x":1559,"y":582},{"x":84,"y":270},{"x":804,"y":62},{"x":1324,"y":389},{"x":795,"y":657},{"x":831,"y":71},{"x":453,"y":297},{"x":183,"y":405},{"x":723,"y":405},{"x":192,"y":495},{"x":1433,"y":414},{"x":453,"y":279},{"x":1417,"y":414},{"x":1265,"y":120},{"x":291,"y":441},{"x":1484,"y":154},{"x":822,"y":207},{"x":255,"y":53},{"x":750,"y":44},{"x":1727,"y":36},{"x":1383,"y":145},{"x":867,"y":603},{"x":327,"y":261},{"x":822,"y":180},{"x":1012,"y":783},{"x":1383,"y":447},{"x":255,"y":333},{"x":922,"y":621},{"x":534,"y":324},{"x":255,"y":414},{"x":1551,"y":590},{"x":1559,"y":481},{"x":255,"y":297},{"x":246,"y":441},{"x":588,"y":324},{"x":1249,"y":246},{"x":372,"y":180},{"x":417,"y":180},{"x":606,"y":315},{"x":1433,"y":607},{"x":1425,"y":196},{"x":1383,"y":439},{"x":741,"y":306},{"x":426,"y":306},{"x":714,"y":495},{"x":1207,"y":78},{"x":345,"y":477},{"x":1249,"y":204},{"x":471,"y":26},{"x":732,"y":234},{"x":777,"y":252},{"x":1383,"y":531},{"x":327,"y":116},{"x":1207,"y":137},{"x":1417,"y":61},{"x":741,"y":89},{"x":327,"y":225},{"x":922,"y":702},{"x":399,"y":144},{"x":192,"y":369},{"x":480,"y":98},{"x":1744,"y":19},{"x":372,"y":369},{"x":219,"y":513},{"x":1559,"y":599},{"x":1131,"y":103},{"x":678,"y":315},{"x":138,"y":180},{"x":516,"y":189},{"x":651,"y":315},{"x":831,"y":495},{"x":1450,"y":540},{"x":183,"y":306},{"x":417,"y":252},{"x":1307,"y":212},{"x":516,"y":333},{"x":759,"y":342},{"x":1400,"y":162},{"x":1291,"y":372},{"x":1240,"y":355},{"x":1400,"y":95},{"x":273,"y":89},{"x":940,"y":504},{"x":372,"y":306},{"x":1433,"y":649},{"x":1249,"y":313},{"x":1198,"y":103},{"x":390,"y":71},{"x":543,"y":17},{"x":1492,"y":582},{"x":300,"y":540},{"x":1509,"y":447},{"x":552,"y":171},{"x":516,"y":306},{"x":1316,"y":137},{"x":561,"y":89},{"x":1442,"y":515},{"x":1417,"y":456},{"x":1324,"y":221},{"x":561,"y":324},{"x":498,"y":315},{"x":1240,"y":187},{"x":1274,"y":254},{"x":723,"y":135},{"x":93,"y":261},{"x":201,"y":531},{"x":318,"y":423},{"x":192,"y":441},{"x":940,"y":594},{"x":795,"y":44},{"x":147,"y":189},{"x":282,"y":89},{"x":201,"y":198},{"x":1626,"y":70},{"x":318,"y":441},{"x":534,"y":252},{"x":1727,"y":11},{"x":543,"y":261},{"x":201,"y":369},{"x":633,"y":71},{"x":291,"y":171},{"x":345,"y":171},{"x":255,"y":477},{"x":1492,"y":632},{"x":1492,"y":599},{"x":291,"y":594},{"x":1509,"y":699},{"x":534,"y":162},{"x":120,"y":432},{"x":444,"y":252},{"x":111,"y":423},{"x":129,"y":270},{"x":516,"y":324},{"x":1467,"y":615},{"x":1021,"y":531},{"x":1223,"y":271},{"x":1400,"y":187},{"x":1442,"y":531},{"x":57,"y":396},{"x":1467,"y":666},{"x":372,"y":441},{"x":1458,"y":657},{"x":985,"y":675},{"x":1635,"y":61},{"x":1274,"y":170},{"x":1349,"y":128},{"x":994,"y":549},{"x":1509,"y":599},{"x":642,"y":351},{"x":1526,"y":464},{"x":435,"y":234},{"x":201,"y":450},{"x":453,"y":171},{"x":597,"y":297},{"x":147,"y":315},{"x":931,"y":711},{"x":1375,"y":515},{"x":174,"y":71},{"x":1425,"y":540},{"x":732,"y":98},{"x":372,"y":270},{"x":363,"y":62},{"x":1257,"y":263},{"x":93,"y":423},{"x":264,"y":477},{"x":579,"y":360},{"x":354,"y":71},{"x":390,"y":378},{"x":48,"y":441},{"x":480,"y":135},{"x":354,"y":162},{"x":1484,"y":775},{"x":1542,"y":28},{"x":66,"y":216},{"x":876,"y":71},{"x":795,"y":477},{"x":570,"y":71},{"x":1223,"y":263},{"x":1417,"y":86},{"x":1240,"y":103},{"x":714,"y":450},{"x":1249,"y":103},{"x":327,"y":585},{"x":480,"y":198},{"x":1475,"y":741},{"x":201,"y":135},{"x":624,"y":98},{"x":192,"y":180},{"x":579,"y":333},{"x":1165,"y":86},{"x":768,"y":144},{"x":1316,"y":162},{"x":732,"y":342},{"x":543,"y":44},{"x":651,"y":261},{"x":588,"y":351},{"x":1467,"y":741},{"x":282,"y":333},{"x":318,"y":522},{"x":1500,"y":515},{"x":111,"y":261},{"x":381,"y":378},{"x":885,"y":693},{"x":489,"y":17},{"x":642,"y":53},{"x":399,"y":288},{"x":543,"y":342},{"x":1274,"y":162},{"x":273,"y":648},{"x":1500,"y":61},{"x":237,"y":576},{"x":723,"y":71},{"x":327,"y":333},{"x":1626,"y":19},{"x":417,"y":71},{"x":246,"y":107},{"x":336,"y":576},{"x":381,"y":243},{"x":525,"y":315},{"x":1517,"y":464},{"x":345,"y":306},{"x":1349,"y":86},{"x":1458,"y":61},{"x":750,"y":144},{"x":219,"y":225},{"x":201,"y":594},{"x":1442,"y":464},{"x":399,"y":225},{"x":1316,"y":61},{"x":147,"y":450},{"x":1299,"y":179},{"x":1568,"y":548},{"x":1400,"y":170},{"x":417,"y":297},{"x":1333,"y":347},{"x":48,"y":432},{"x":1307,"y":86},{"x":786,"y":44},{"x":1433,"y":212},{"x":489,"y":198},{"x":1307,"y":137},{"x":300,"y":234},{"x":705,"y":504},{"x":1417,"y":162},{"x":849,"y":279},{"x":651,"y":107},{"x":93,"y":306},{"x":1400,"y":128},{"x":642,"y":153},{"x":1458,"y":154},{"x":786,"y":486},{"x":1500,"y":128},{"x":795,"y":62},{"x":1534,"y":473},{"x":552,"y":17},{"x":1274,"y":212},{"x":255,"y":684},{"x":867,"y":585},{"x":741,"y":135},{"x":1366,"y":95},{"x":651,"y":162},{"x":741,"y":225},{"x":1467,"y":733},{"x":750,"y":369},{"x":1307,"y":196},{"x":822,"y":252},{"x":210,"y":495},{"x":1475,"y":724},{"x":309,"y":80},{"x":1408,"y":523},{"x":471,"y":189},{"x":669,"y":44},{"x":237,"y":468},{"x":210,"y":198},{"x":1257,"y":103},{"x":1282,"y":322},{"x":129,"y":171},{"x":156,"y":378},{"x":588,"y":252},{"x":498,"y":98},{"x":660,"y":189},{"x":1349,"y":170},{"x":228,"y":594},{"x":1349,"y":212},{"x":1458,"y":456},{"x":300,"y":225},{"x":795,"y":98},{"x":282,"y":125},{"x":949,"y":513},{"x":1358,"y":86},{"x":1358,"y":128},{"x":345,"y":89},{"x":48,"y":297},{"x":1526,"y":473},{"x":1526,"y":523},{"x":309,"y":378},{"x":1467,"y":179},{"x":633,"y":80},{"x":228,"y":486},{"x":1475,"y":456},{"x":1408,"y":61},{"x":651,"y":270},{"x":489,"y":288},{"x":768,"y":107},{"x":741,"y":35},{"x":282,"y":396},{"x":435,"y":288},{"x":1450,"y":187},{"x":849,"y":594},{"x":543,"y":297},{"x":264,"y":225},{"x":1333,"y":103},{"x":759,"y":125},{"x":1148,"y":70},{"x":678,"y":144},{"x":903,"y":594},{"x":1215,"y":238},{"x":273,"y":486},{"x":264,"y":125},{"x":1349,"y":380},{"x":1307,"y":271},{"x":741,"y":116},{"x":426,"y":369},{"x":705,"y":243},{"x":516,"y":198},{"x":309,"y":540},{"x":210,"y":315},{"x":552,"y":387},{"x":750,"y":333},{"x":462,"y":279},{"x":1105,"y":112},{"x":165,"y":396},{"x":606,"y":171},{"x":1492,"y":691},{"x":75,"y":315},{"x":1702,"y":28},{"x":192,"y":189},{"x":931,"y":522},{"x":1551,"y":515},{"x":660,"y":89},{"x":408,"y":62},{"x":651,"y":144},{"x":165,"y":414},{"x":192,"y":288},{"x":687,"y":369},{"x":525,"y":125},{"x":93,"y":243},{"x":201,"y":288},{"x":327,"y":576},{"x":300,"y":432},{"x":759,"y":198},{"x":606,"y":243},{"x":399,"y":360},{"x":1207,"y":170},{"x":876,"y":207},{"x":264,"y":513},{"x":1576,"y":548},{"x":1215,"y":288},{"x":318,"y":288},{"x":615,"y":252},{"x":804,"y":702},{"x":165,"y":360},{"x":831,"y":162},{"x":1458,"y":565},{"x":246,"y":648},{"x":507,"y":288},{"x":1341,"y":271},{"x":732,"y":252},{"x":1467,"y":775},{"x":489,"y":306},{"x":498,"y":162},{"x":1400,"y":145},{"x":1249,"y":364},{"x":453,"y":207},{"x":210,"y":648},{"x":102,"y":342},{"x":309,"y":477},{"x":57,"y":342},{"x":1282,"y":103},{"x":192,"y":360},{"x":624,"y":324},{"x":714,"y":35},{"x":246,"y":351},{"x":876,"y":603},{"x":876,"y":684},{"x":822,"y":89},{"x":1291,"y":212},{"x":273,"y":125},{"x":759,"y":89},{"x":291,"y":162},{"x":1433,"y":515},{"x":156,"y":125},{"x":471,"y":153},{"x":345,"y":333},{"x":894,"y":80},{"x":237,"y":297},{"x":1249,"y":86},{"x":723,"y":53},{"x":21,"y":387},{"x":327,"y":450},{"x":858,"y":594},{"x":570,"y":17},{"x":453,"y":125},{"x":786,"y":495},{"x":3,"y":351},{"x":1375,"y":229},{"x":651,"y":243},{"x":1299,"y":271},{"x":165,"y":459},{"x":471,"y":207},{"x":1190,"y":238},{"x":111,"y":288},{"x":174,"y":189},{"x":93,"y":297},{"x":291,"y":576},{"x":1333,"y":389},{"x":642,"y":71},{"x":687,"y":297},{"x":498,"y":261},{"x":813,"y":495},{"x":399,"y":98},{"x":696,"y":98},{"x":931,"y":504},{"x":633,"y":333},{"x":174,"y":432},{"x":1341,"y":204},{"x":57,"y":369},{"x":903,"y":504},{"x":687,"y":53},{"x":741,"y":107},{"x":1526,"y":128},{"x":318,"y":369},{"x":705,"y":450},{"x":732,"y":207},{"x":804,"y":207},{"x":66,"y":144},{"x":282,"y":423},{"x":426,"y":116},{"x":1425,"y":548},{"x":931,"y":89},{"x":390,"y":98},{"x":273,"y":504},{"x":444,"y":44},{"x":336,"y":567},{"x":1450,"y":657},{"x":246,"y":98},{"x":624,"y":80},{"x":1425,"y":405},{"x":435,"y":549},{"x":1534,"y":95},{"x":642,"y":306},{"x":381,"y":71},{"x":480,"y":26},{"x":1417,"y":238},{"x":1618,"y":53},{"x":570,"y":297},{"x":786,"y":630},{"x":1358,"y":271},{"x":318,"y":225},{"x":669,"y":333},{"x":922,"y":684},{"x":120,"y":234},{"x":759,"y":44},{"x":940,"y":693},{"x":498,"y":270},{"x":1207,"y":120},{"x":624,"y":297},{"x":642,"y":315},{"x":705,"y":144},{"x":147,"y":261},{"x":363,"y":378},{"x":597,"y":324},{"x":219,"y":53},{"x":570,"y":243},{"x":1484,"y":498},{"x":192,"y":423},{"x":1576,"y":489},{"x":1534,"y":641},{"x":615,"y":261},{"x":1173,"y":70},{"x":426,"y":189},{"x":435,"y":243},{"x":372,"y":144},{"x":1626,"y":103},{"x":822,"y":639},{"x":1509,"y":548},{"x":1282,"y":238},{"x":237,"y":666},{"x":417,"y":189},{"x":1484,"y":540},{"x":1551,"y":523},{"x":264,"y":53},{"x":462,"y":189},{"x":210,"y":171},{"x":183,"y":189},{"x":1458,"y":187},{"x":354,"y":234},{"x":156,"y":315},{"x":309,"y":468},{"x":1375,"y":489},{"x":1307,"y":103},{"x":876,"y":594},{"x":462,"y":62},{"x":219,"y":189},{"x":183,"y":468},{"x":1500,"y":162},{"x":1425,"y":95},{"x":219,"y":540},{"x":1475,"y":170},{"x":1542,"y":649},{"x":624,"y":279},{"x":435,"y":171},{"x":1475,"y":615},{"x":264,"y":459},{"x":48,"y":423},{"x":615,"y":116},{"x":381,"y":98},{"x":1408,"y":246},{"x":1584,"y":599},{"x":1391,"y":212},{"x":1492,"y":557},{"x":768,"y":306},{"x":210,"y":459},{"x":210,"y":558},{"x":741,"y":80},{"x":489,"y":207},{"x":345,"y":98},{"x":795,"y":486},{"x":588,"y":153},{"x":696,"y":135},{"x":156,"y":432},{"x":1223,"y":288},{"x":1509,"y":582},{"x":958,"y":594},{"x":903,"y":675},{"x":192,"y":648},{"x":795,"y":80},{"x":678,"y":369},{"x":246,"y":144},{"x":570,"y":89},{"x":390,"y":423},{"x":453,"y":225},{"x":525,"y":270},{"x":777,"y":261},{"x":1559,"y":573},{"x":732,"y":261},{"x":669,"y":107},{"x":1702,"y":11},{"x":327,"y":441},{"x":435,"y":225},{"x":237,"y":450},{"x":606,"y":62},{"x":705,"y":270},{"x":696,"y":468},{"x":390,"y":288},{"x":1291,"y":78},{"x":255,"y":675},{"x":462,"y":243},{"x":327,"y":405},{"x":264,"y":180},{"x":228,"y":468},{"x":408,"y":225},{"x":633,"y":189},{"x":1232,"y":128},{"x":723,"y":261},{"x":615,"y":198},{"x":1551,"y":599},{"x":705,"y":261},{"x":1366,"y":112},{"x":768,"y":297},{"x":84,"y":333},{"x":1719,"y":44},{"x":1265,"y":221},{"x":165,"y":405},{"x":687,"y":62},{"x":849,"y":89},{"x":633,"y":324},{"x":327,"y":171},{"x":291,"y":225},{"x":723,"y":342},{"x":507,"y":144},{"x":264,"y":324},{"x":985,"y":666},{"x":219,"y":198},{"x":1408,"y":364},{"x":714,"y":180},{"x":1534,"y":489},{"x":1433,"y":531},{"x":1265,"y":372},{"x":300,"y":342},{"x":723,"y":423},{"x":885,"y":657},{"x":399,"y":153},{"x":813,"y":216},{"x":192,"y":414},{"x":705,"y":405},{"x":273,"y":387},{"x":696,"y":279},{"x":1475,"y":691},{"x":777,"y":243},{"x":1484,"y":683},{"x":561,"y":80},{"x":1433,"y":95},{"x":903,"y":639},{"x":967,"y":612},{"x":1425,"y":439},{"x":1417,"y":254},{"x":426,"y":98},{"x":363,"y":180},{"x":1551,"y":531},{"x":363,"y":648},{"x":831,"y":171},{"x":552,"y":107},{"x":228,"y":116},{"x":336,"y":387},{"x":1492,"y":607},{"x":210,"y":594},{"x":1316,"y":112},{"x":759,"y":477},{"x":1358,"y":212},{"x":777,"y":333},{"x":732,"y":405},{"x":1181,"y":70},{"x":1593,"y":28},{"x":750,"y":89},{"x":822,"y":171},{"x":228,"y":360},{"x":867,"y":657},{"x":741,"y":333},{"x":336,"y":216},{"x":1375,"y":263},{"x":1349,"y":70},{"x":1198,"y":271},{"x":219,"y":405},{"x":129,"y":315},{"x":1215,"y":187},{"x":1207,"y":61},{"x":777,"y":702},{"x":1383,"y":120},{"x":435,"y":252},{"x":552,"y":207},{"x":768,"y":477},{"x":246,"y":477},{"x":309,"y":585},{"x":1458,"y":708},{"x":696,"y":180},{"x":615,"y":53},{"x":246,"y":603},{"x":399,"y":270},{"x":552,"y":180},{"x":1568,"y":599},{"x":732,"y":80},{"x":597,"y":306},{"x":1719,"y":53},{"x":786,"y":540},{"x":39,"y":324},{"x":1131,"y":120},{"x":1475,"y":515},{"x":894,"y":89},{"x":102,"y":207},{"x":498,"y":26},{"x":1450,"y":86},{"x":804,"y":666},{"x":282,"y":495},{"x":1568,"y":489},{"x":75,"y":297},{"x":1542,"y":615},{"x":534,"y":360},{"x":822,"y":657},{"x":1484,"y":489},{"x":615,"y":207},{"x":336,"y":477},{"x":1240,"y":70},{"x":417,"y":333},{"x":192,"y":116},{"x":1677,"y":70},{"x":1299,"y":162},{"x":1467,"y":724},{"x":1442,"y":599},{"x":525,"y":62},{"x":1467,"y":758},{"x":1265,"y":313},{"x":156,"y":198},{"x":570,"y":125},{"x":390,"y":576},{"x":1425,"y":187},{"x":498,"y":225},{"x":976,"y":684},{"x":1291,"y":162},{"x":1442,"y":632},{"x":1526,"y":540},{"x":714,"y":135},{"x":705,"y":35},{"x":1458,"y":95},{"x":426,"y":324},{"x":525,"y":297},{"x":282,"y":486},{"x":1274,"y":364},{"x":1618,"y":112},{"x":93,"y":144},{"x":615,"y":279},{"x":399,"y":261},{"x":876,"y":80},{"x":102,"y":198},{"x":1383,"y":86},{"x":813,"y":198},{"x":1358,"y":53},{"x":345,"y":153},{"x":651,"y":324},{"x":300,"y":333},{"x":1475,"y":531},{"x":1165,"y":70},{"x":615,"y":107},{"x":714,"y":198},{"x":570,"y":189},{"x":1349,"y":422},{"x":417,"y":288},{"x":210,"y":504},{"x":471,"y":135},{"x":606,"y":135},{"x":1391,"y":120},{"x":1333,"y":204},{"x":588,"y":333},{"x":552,"y":297},{"x":660,"y":360},{"x":309,"y":576},{"x":1249,"y":162},{"x":534,"y":351},{"x":903,"y":684},{"x":660,"y":216},{"x":480,"y":189},{"x":30,"y":360},{"x":1467,"y":573},{"x":507,"y":71},{"x":390,"y":351},{"x":976,"y":522},{"x":651,"y":189},{"x":1736,"y":11},{"x":1223,"y":162},{"x":1190,"y":254},{"x":498,"y":17},{"x":1458,"y":515},{"x":967,"y":657},{"x":435,"y":162},{"x":93,"y":162},{"x":1542,"y":489},{"x":1215,"y":70},{"x":561,"y":297},{"x":1366,"y":170},{"x":237,"y":558},{"x":93,"y":288},{"x":1526,"y":86},{"x":1417,"y":540},{"x":1299,"y":263},{"x":840,"y":549},{"x":552,"y":198},{"x":1408,"y":557},{"x":1391,"y":548},{"x":1744,"y":28},{"x":1324,"y":196},{"x":453,"y":53},{"x":318,"y":396},{"x":444,"y":342},{"x":723,"y":495},{"x":705,"y":306},{"x":507,"y":125},{"x":201,"y":621},{"x":345,"y":450},{"x":1341,"y":103},{"x":867,"y":648},{"x":462,"y":270},{"x":1534,"y":70},{"x":714,"y":116},{"x":1274,"y":313},{"x":381,"y":297},{"x":1417,"y":548},{"x":201,"y":495},{"x":669,"y":315},{"x":183,"y":324},{"x":1375,"y":473},{"x":822,"y":648},{"x":1442,"y":473},{"x":246,"y":369},{"x":597,"y":116},{"x":219,"y":396},{"x":507,"y":98},{"x":1257,"y":221},{"x":786,"y":648},{"x":1366,"y":506},{"x":264,"y":504},{"x":976,"y":648},{"x":940,"y":648},{"x":1484,"y":557},{"x":1375,"y":154},{"x":300,"y":612},{"x":1450,"y":212},{"x":804,"y":89},{"x":822,"y":144},{"x":1534,"y":515},{"x":489,"y":315},{"x":345,"y":351},{"x":507,"y":306},{"x":156,"y":98},{"x":228,"y":324},{"x":84,"y":342},{"x":1366,"y":44},{"x":219,"y":558},{"x":165,"y":162},{"x":1643,"y":11},{"x":192,"y":387},{"x":615,"y":306},{"x":84,"y":360},{"x":1366,"y":280},{"x":237,"y":414},{"x":669,"y":80},{"x":111,"y":441},{"x":201,"y":80},{"x":1475,"y":783},{"x":1349,"y":221},{"x":922,"y":513},{"x":156,"y":252},{"x":552,"y":153},{"x":696,"y":351},{"x":183,"y":333},{"x":1417,"y":170},{"x":129,"y":198},{"x":1249,"y":212},{"x":1257,"y":364},{"x":1265,"y":296},{"x":1375,"y":322},{"x":498,"y":216},{"x":1509,"y":53},{"x":1542,"y":599},{"x":1375,"y":338},{"x":813,"y":378},{"x":1509,"y":632},{"x":183,"y":71},{"x":174,"y":207},{"x":1450,"y":221},{"x":57,"y":288},{"x":192,"y":279},{"x":1467,"y":456},{"x":174,"y":144},{"x":1215,"y":128},{"x":336,"y":225},{"x":435,"y":125},{"x":1240,"y":221},{"x":516,"y":71},{"x":1324,"y":145},{"x":1066,"y":612},{"x":534,"y":135},{"x":642,"y":62},{"x":246,"y":468},{"x":282,"y":306},{"x":1736,"y":19},{"x":102,"y":360},{"x":777,"y":53},{"x":570,"y":288},{"x":976,"y":540},{"x":1408,"y":548},{"x":1316,"y":364},{"x":264,"y":675},{"x":1282,"y":179},{"x":219,"y":468},{"x":822,"y":477},{"x":543,"y":80},{"x":642,"y":342},{"x":858,"y":684},{"x":444,"y":243},{"x":147,"y":89},{"x":903,"y":711},{"x":165,"y":333},{"x":597,"y":53},{"x":273,"y":666},{"x":1039,"y":765},{"x":1458,"y":641},{"x":174,"y":216},{"x":489,"y":297},{"x":570,"y":279},{"x":1559,"y":590},{"x":336,"y":189},{"x":705,"y":369},{"x":759,"y":486},{"x":489,"y":116},{"x":1442,"y":649},{"x":363,"y":315},{"x":1307,"y":70},{"x":543,"y":189},{"x":336,"y":468},{"x":1291,"y":364},{"x":678,"y":53},{"x":723,"y":252},{"x":1307,"y":364},{"x":354,"y":153},{"x":1249,"y":238},{"x":714,"y":504},{"x":246,"y":621},{"x":606,"y":297},{"x":363,"y":261},{"x":1677,"y":53},{"x":1383,"y":61},{"x":309,"y":342},{"x":1291,"y":280},{"x":1744,"y":95},{"x":309,"y":450},{"x":147,"y":144},{"x":1324,"y":70},{"x":1366,"y":473},{"x":489,"y":98},{"x":336,"y":125},{"x":1467,"y":78},{"x":804,"y":693},{"x":940,"y":684},{"x":1131,"y":86},{"x":75,"y":207},{"x":777,"y":189},{"x":876,"y":639},{"x":255,"y":612},{"x":1517,"y":11},{"x":138,"y":396},{"x":552,"y":216},{"x":1190,"y":263},{"x":1240,"y":288},{"x":1458,"y":540},{"x":1274,"y":229},{"x":399,"y":89},{"x":1702,"y":53},{"x":363,"y":621},{"x":813,"y":107},{"x":354,"y":80},{"x":1668,"y":44},{"x":732,"y":171},{"x":1542,"y":632},{"x":894,"y":62},{"x":174,"y":288},{"x":228,"y":396},{"x":363,"y":71},{"x":1736,"y":3},{"x":615,"y":35},{"x":471,"y":216},{"x":1752,"y":28},{"x":444,"y":288},{"x":1400,"y":78},{"x":1383,"y":456},{"x":561,"y":153},{"x":417,"y":162},{"x":336,"y":270},{"x":1341,"y":405},{"x":624,"y":62},{"x":147,"y":162},{"x":498,"y":107},{"x":1467,"y":523},{"x":723,"y":243},{"x":183,"y":522},{"x":1240,"y":330},{"x":255,"y":531},{"x":678,"y":180},{"x":543,"y":125},{"x":381,"y":630},{"x":1341,"y":70},{"x":624,"y":125},{"x":1509,"y":557},{"x":651,"y":198},{"x":417,"y":62},{"x":264,"y":531},{"x":543,"y":288},{"x":93,"y":279},{"x":642,"y":261},{"x":210,"y":432},{"x":913,"y":639},{"x":102,"y":387},{"x":417,"y":342},{"x":741,"y":98},{"x":1148,"y":103},{"x":705,"y":225},{"x":903,"y":621},{"x":768,"y":531},{"x":219,"y":612},{"x":741,"y":162},{"x":633,"y":98},{"x":1635,"y":103},{"x":1417,"y":565},{"x":471,"y":89},{"x":1324,"y":372},{"x":129,"y":432},{"x":1198,"y":78},{"x":255,"y":630},{"x":1341,"y":397},{"x":804,"y":180},{"x":1702,"y":19},{"x":732,"y":513},{"x":1223,"y":112},{"x":1207,"y":280},{"x":552,"y":116},{"x":1484,"y":53},{"x":1084,"y":738},{"x":1274,"y":128},{"x":399,"y":324},{"x":1215,"y":179},{"x":246,"y":387},{"x":949,"y":531},{"x":174,"y":378},{"x":588,"y":62},{"x":732,"y":306},{"x":75,"y":414},{"x":1509,"y":162},{"x":840,"y":594},{"x":372,"y":234},{"x":408,"y":44},{"x":831,"y":189},{"x":1517,"y":439},{"x":1307,"y":154},{"x":75,"y":441},{"x":300,"y":603},{"x":1517,"y":573},{"x":210,"y":162},{"x":120,"y":162},{"x":543,"y":62},{"x":183,"y":351},{"x":444,"y":135},{"x":534,"y":35},{"x":1274,"y":137},{"x":291,"y":53},{"x":786,"y":216},{"x":435,"y":144},{"x":1249,"y":154},{"x":300,"y":522},{"x":1484,"y":674},{"x":1349,"y":78},{"x":1249,"y":145},{"x":147,"y":342},{"x":444,"y":89},{"x":273,"y":297},{"x":1526,"y":565},{"x":732,"y":531},{"x":597,"y":98},{"x":219,"y":603},{"x":390,"y":207},{"x":1190,"y":212},{"x":390,"y":432},{"x":903,"y":576},{"x":1534,"y":86},{"x":687,"y":216},{"x":967,"y":621},{"x":372,"y":594},{"x":687,"y":360},{"x":399,"y":180},{"x":633,"y":116},{"x":1391,"y":53},{"x":345,"y":342},{"x":1391,"y":506},{"x":1643,"y":19},{"x":354,"y":351},{"x":732,"y":225},{"x":1324,"y":95},{"x":255,"y":180},{"x":660,"y":198},{"x":156,"y":153},{"x":1358,"y":238},{"x":552,"y":26},{"x":1291,"y":112},{"x":390,"y":342},{"x":1509,"y":28},{"x":570,"y":171},{"x":876,"y":261},{"x":1198,"y":238},{"x":525,"y":225},{"x":552,"y":378},{"x":1417,"y":154},{"x":1484,"y":649},{"x":750,"y":171},{"x":1375,"y":523},{"x":111,"y":351},{"x":714,"y":288},{"x":102,"y":396},{"x":687,"y":198},{"x":858,"y":585},{"x":1257,"y":229},{"x":75,"y":261},{"x":183,"y":80},{"x":813,"y":693},{"x":894,"y":657},{"x":768,"y":279},{"x":1408,"y":95},{"x":1584,"y":11},{"x":705,"y":297},{"x":264,"y":62},{"x":273,"y":621},{"x":264,"y":387},{"x":885,"y":116},{"x":30,"y":306},{"x":804,"y":189},{"x":525,"y":207},{"x":1341,"y":196},{"x":93,"y":441},{"x":615,"y":288},{"x":174,"y":180},{"x":1383,"y":473},{"x":615,"y":44},{"x":327,"y":243},{"x":588,"y":89},{"x":822,"y":189},{"x":318,"y":477},{"x":318,"y":98},{"x":768,"y":125},{"x":669,"y":306},{"x":768,"y":648},{"x":1576,"y":540},{"x":21,"y":396},{"x":525,"y":17},{"x":255,"y":189},{"x":894,"y":53},{"x":462,"y":198},{"x":336,"y":459},{"x":561,"y":17},{"x":624,"y":89},{"x":579,"y":342},{"x":1240,"y":305},{"x":201,"y":360},{"x":1215,"y":229},{"x":336,"y":351},{"x":606,"y":198},{"x":228,"y":459},{"x":570,"y":306},{"x":1442,"y":641},{"x":849,"y":612},{"x":174,"y":522},{"x":1719,"y":61},{"x":894,"y":630},{"x":1417,"y":422},{"x":741,"y":396},{"x":273,"y":684},{"x":129,"y":414},{"x":1517,"y":128},{"x":507,"y":261},{"x":480,"y":315},{"x":1542,"y":187},{"x":1433,"y":657},{"x":1559,"y":498},{"x":687,"y":351},{"x":1400,"y":61},{"x":192,"y":612},{"x":489,"y":53},{"x":1568,"y":607},{"x":39,"y":387},{"x":913,"y":738},{"x":642,"y":324},{"x":228,"y":648},{"x":471,"y":44},{"x":1526,"y":657},{"x":372,"y":612},{"x":93,"y":342},{"x":1526,"y":557},{"x":1433,"y":523},{"x":57,"y":405},{"x":372,"y":297},{"x":1391,"y":414},{"x":237,"y":351},{"x":84,"y":279},{"x":1358,"y":112},{"x":1075,"y":747},{"x":885,"y":639},{"x":786,"y":666},{"x":660,"y":378},{"x":1500,"y":473},{"x":480,"y":62},{"x":363,"y":80},{"x":1207,"y":86},{"x":1165,"y":78},{"x":354,"y":171},{"x":949,"y":693},{"x":228,"y":162},{"x":624,"y":116},{"x":696,"y":89},{"x":237,"y":342},{"x":1576,"y":590},{"x":1333,"y":70},{"x":1324,"y":271},{"x":723,"y":306},{"x":219,"y":414},{"x":345,"y":423},{"x":660,"y":261},{"x":1710,"y":61},{"x":300,"y":135},{"x":1093,"y":594},{"x":1324,"y":204},{"x":1282,"y":145},{"x":417,"y":207},{"x":138,"y":351},{"x":903,"y":80},{"x":1710,"y":11},{"x":219,"y":522},{"x":1232,"y":263},{"x":1391,"y":422},{"x":759,"y":279},{"x":831,"y":396},{"x":1433,"y":447},{"x":1366,"y":481},{"x":336,"y":423},{"x":633,"y":62},{"x":1198,"y":305},{"x":958,"y":531},{"x":462,"y":234},{"x":1534,"y":624},{"x":318,"y":243},{"x":426,"y":180},{"x":1484,"y":162},{"x":1240,"y":296},{"x":1652,"y":70},{"x":1458,"y":750},{"x":1391,"y":498},{"x":1500,"y":657},{"x":372,"y":360},{"x":1291,"y":254},{"x":1333,"y":128},{"x":1677,"y":61},{"x":246,"y":675},{"x":210,"y":306},{"x":408,"y":306},{"x":1375,"y":313},{"x":1500,"y":86},{"x":1727,"y":28},{"x":1626,"y":95},{"x":1694,"y":61},{"x":273,"y":288},{"x":102,"y":441},{"x":1391,"y":154},{"x":1500,"y":666},{"x":165,"y":207},{"x":1450,"y":422},{"x":1475,"y":187},{"x":372,"y":261},{"x":1484,"y":699},{"x":543,"y":35},{"x":1417,"y":489},{"x":318,"y":116},{"x":588,"y":207},{"x":3,"y":396},{"x":174,"y":360},{"x":219,"y":567},{"x":1291,"y":70},{"x":1223,"y":280},{"x":1207,"y":229},{"x":1274,"y":204},{"x":759,"y":540},{"x":354,"y":468},{"x":570,"y":116},{"x":660,"y":98},{"x":318,"y":53},{"x":237,"y":198},{"x":291,"y":243},{"x":1123,"y":86},{"x":318,"y":531},{"x":840,"y":630},{"x":1500,"y":489},{"x":129,"y":279},{"x":732,"y":44},{"x":606,"y":116},{"x":894,"y":71},{"x":291,"y":80},{"x":606,"y":89},{"x":705,"y":71},{"x":525,"y":342},{"x":516,"y":26},{"x":255,"y":324},{"x":39,"y":333},{"x":1366,"y":288},{"x":318,"y":180},{"x":1668,"y":11},{"x":525,"y":26},{"x":777,"y":98},{"x":543,"y":315},{"x":66,"y":369},{"x":498,"y":89},{"x":876,"y":675},{"x":1232,"y":187},{"x":300,"y":441},{"x":1526,"y":674},{"x":1509,"y":128},{"x":633,"y":279},{"x":345,"y":495},{"x":1249,"y":280},{"x":102,"y":279},{"x":291,"y":153},{"x":561,"y":360},{"x":1408,"y":473},{"x":1232,"y":305},{"x":552,"y":80},{"x":462,"y":261},{"x":120,"y":261},{"x":777,"y":666},{"x":75,"y":342},{"x":705,"y":44},{"x":624,"y":207},{"x":840,"y":62},{"x":129,"y":297},{"x":1282,"y":212},{"x":246,"y":396},{"x":183,"y":414},{"x":255,"y":441},{"x":1458,"y":632},{"x":417,"y":98},{"x":1727,"y":19},{"x":1484,"y":70},{"x":687,"y":107},{"x":1358,"y":204},{"x":435,"y":89},{"x":1526,"y":61},{"x":192,"y":540},{"x":282,"y":567},{"x":192,"y":666},{"x":831,"y":98},{"x":1442,"y":624},{"x":237,"y":216},{"x":345,"y":279},{"x":588,"y":125},{"x":1450,"y":699},{"x":318,"y":297},{"x":1190,"y":103},{"x":831,"y":648},{"x":1274,"y":112},{"x":192,"y":639},{"x":588,"y":144},{"x":102,"y":450},{"x":1400,"y":112},{"x":1509,"y":515},{"x":1282,"y":162},{"x":579,"y":216},{"x":1375,"y":196},{"x":1291,"y":229},{"x":435,"y":360},{"x":129,"y":252},{"x":570,"y":315},{"x":1584,"y":607},{"x":282,"y":558},{"x":1400,"y":498},{"x":705,"y":216},{"x":642,"y":270},{"x":1349,"y":179},{"x":1240,"y":263},{"x":1458,"y":212},{"x":489,"y":44},{"x":282,"y":630},{"x":1618,"y":86},{"x":1618,"y":70},{"x":300,"y":80},{"x":615,"y":243},{"x":1475,"y":422},{"x":165,"y":306},{"x":273,"y":62},{"x":219,"y":234},{"x":156,"y":387},{"x":282,"y":180},{"x":1484,"y":170},{"x":714,"y":153},{"x":1517,"y":36},{"x":1181,"y":61},{"x":1282,"y":271},{"x":795,"y":495},{"x":219,"y":423},{"x":462,"y":144},{"x":255,"y":558},{"x":435,"y":333},{"x":913,"y":62},{"x":1307,"y":179},{"x":291,"y":333},{"x":282,"y":297},{"x":327,"y":189},{"x":885,"y":612},{"x":201,"y":342},{"x":849,"y":675},{"x":417,"y":243},{"x":1442,"y":162},{"x":1710,"y":19},{"x":228,"y":477},{"x":949,"y":62},{"x":264,"y":648},{"x":435,"y":71},{"x":1467,"y":170},{"x":228,"y":540},{"x":408,"y":342},{"x":1694,"y":19},{"x":291,"y":396},{"x":183,"y":567},{"x":741,"y":216},{"x":1003,"y":522},{"x":1408,"y":254},{"x":228,"y":531},{"x":1358,"y":61},{"x":651,"y":216},{"x":723,"y":333},{"x":453,"y":288},{"x":795,"y":180},{"x":1467,"y":557},{"x":723,"y":225},{"x":1417,"y":364},{"x":444,"y":98},{"x":1400,"y":347},{"x":1383,"y":162},{"x":1265,"y":254},{"x":1509,"y":86},{"x":732,"y":288},{"x":264,"y":693},{"x":1265,"y":355},{"x":786,"y":693},{"x":994,"y":522},{"x":12,"y":414},{"x":1232,"y":296},{"x":237,"y":486},{"x":660,"y":180},{"x":1450,"y":607},{"x":282,"y":432},{"x":156,"y":279},{"x":525,"y":216},{"x":291,"y":612},{"x":201,"y":162},{"x":273,"y":459},{"x":615,"y":62},{"x":1232,"y":196},{"x":741,"y":270},{"x":156,"y":135},{"x":426,"y":107},{"x":606,"y":162},{"x":750,"y":225},{"x":696,"y":80},{"x":1190,"y":246},{"x":219,"y":80},{"x":336,"y":207},{"x":354,"y":189},{"x":1542,"y":523},{"x":723,"y":153},{"x":309,"y":495},{"x":1408,"y":456},{"x":759,"y":135},{"x":111,"y":153},{"x":318,"y":594},{"x":156,"y":107},{"x":1652,"y":61},{"x":426,"y":261},{"x":408,"y":288},{"x":714,"y":89},{"x":336,"y":107},{"x":66,"y":225},{"x":246,"y":405},{"x":309,"y":306},{"x":237,"y":603},{"x":219,"y":297},{"x":1727,"y":44},{"x":138,"y":306},{"x":1484,"y":741},{"x":1694,"y":53},{"x":1769,"y":11},{"x":237,"y":504},{"x":579,"y":198},{"x":786,"y":288},{"x":354,"y":207},{"x":435,"y":189},{"x":1492,"y":573},{"x":1736,"y":53},{"x":831,"y":621},{"x":922,"y":693},{"x":777,"y":216},{"x":894,"y":135},{"x":381,"y":351},{"x":174,"y":315},{"x":1442,"y":716},{"x":976,"y":639},{"x":1500,"y":19},{"x":345,"y":432},{"x":1240,"y":246},{"x":426,"y":360},{"x":858,"y":693},{"x":129,"y":360},{"x":1492,"y":649},{"x":633,"y":35},{"x":111,"y":189},{"x":156,"y":495},{"x":723,"y":62},{"x":651,"y":225},{"x":228,"y":585},{"x":786,"y":116},{"x":1333,"y":254},{"x":57,"y":333},{"x":219,"y":324},{"x":1475,"y":775},{"x":192,"y":153},{"x":696,"y":162},{"x":255,"y":135},{"x":192,"y":342},{"x":1265,"y":229},{"x":1492,"y":792},{"x":363,"y":477},{"x":1475,"y":649},{"x":219,"y":125},{"x":408,"y":252},{"x":1282,"y":280},{"x":1341,"y":254},{"x":300,"y":405},{"x":408,"y":234},{"x":138,"y":450},{"x":1257,"y":271},{"x":390,"y":387},{"x":1752,"y":95},{"x":1265,"y":288},{"x":453,"y":189},{"x":327,"y":252},{"x":940,"y":729},{"x":300,"y":639},{"x":201,"y":378},{"x":768,"y":62},{"x":264,"y":414},{"x":228,"y":333},{"x":894,"y":603},{"x":183,"y":378},{"x":867,"y":504},{"x":39,"y":369},{"x":246,"y":423},{"x":723,"y":522},{"x":174,"y":387},{"x":183,"y":504},{"x":831,"y":252},{"x":111,"y":297},{"x":426,"y":234},{"x":1601,"y":531},{"x":1509,"y":523},{"x":958,"y":684},{"x":210,"y":144},{"x":1500,"y":615},{"x":480,"y":207},{"x":1425,"y":414},{"x":876,"y":702},{"x":1601,"y":19},{"x":1156,"y":103},{"x":516,"y":144},{"x":885,"y":225},{"x":705,"y":360},{"x":336,"y":252},{"x":1534,"y":540},{"x":417,"y":351},{"x":723,"y":288},{"x":1316,"y":254},{"x":1475,"y":641},{"x":1215,"y":95},{"x":129,"y":378},{"x":940,"y":639},{"x":867,"y":198},{"x":885,"y":675},{"x":1576,"y":582},{"x":210,"y":513},{"x":192,"y":53},{"x":48,"y":405},{"x":1232,"y":288},{"x":255,"y":423},{"x":372,"y":216},{"x":354,"y":252},{"x":39,"y":423},{"x":381,"y":162},{"x":1450,"y":582},{"x":768,"y":270},{"x":579,"y":89},{"x":381,"y":171},{"x":885,"y":585},{"x":399,"y":71},{"x":156,"y":89},{"x":822,"y":53},{"x":1492,"y":515},{"x":669,"y":189},{"x":1467,"y":674},{"x":1458,"y":170},{"x":363,"y":225},{"x":1265,"y":86},{"x":174,"y":89},{"x":435,"y":306},{"x":498,"y":116},{"x":1458,"y":548},{"x":1282,"y":154},{"x":705,"y":62},{"x":210,"y":477},{"x":1265,"y":179},{"x":1593,"y":548},{"x":1232,"y":204},{"x":399,"y":107},{"x":237,"y":360},{"x":696,"y":243},{"x":1021,"y":522},{"x":66,"y":243},{"x":399,"y":378},{"x":525,"y":333},{"x":111,"y":171},{"x":273,"y":71},{"x":1484,"y":456},{"x":1526,"y":498},{"x":1265,"y":330},{"x":120,"y":297},{"x":1391,"y":229},{"x":1366,"y":489},{"x":1601,"y":515},{"x":57,"y":225},{"x":1576,"y":28},{"x":372,"y":162},{"x":453,"y":261},{"x":831,"y":666},{"x":363,"y":171},{"x":471,"y":297},{"x":192,"y":261},{"x":1492,"y":641},{"x":705,"y":477},{"x":624,"y":234},{"x":147,"y":171},{"x":1635,"y":53},{"x":885,"y":648},{"x":291,"y":549},{"x":264,"y":423},{"x":1576,"y":506},{"x":1257,"y":355},{"x":588,"y":360},{"x":678,"y":261},{"x":1593,"y":523},{"x":714,"y":459},{"x":1685,"y":36},{"x":246,"y":504},{"x":1551,"y":573},{"x":1333,"y":170},{"x":1484,"y":464},{"x":147,"y":405},{"x":931,"y":729},{"x":471,"y":243},{"x":660,"y":153},{"x":1450,"y":473},{"x":426,"y":351},{"x":660,"y":62},{"x":976,"y":630},{"x":183,"y":441},{"x":922,"y":729},{"x":1383,"y":170},{"x":1526,"y":120},{"x":840,"y":693},{"x":1307,"y":380},{"x":1274,"y":86},{"x":174,"y":279},{"x":336,"y":414},{"x":318,"y":89},{"x":1509,"y":19},{"x":741,"y":279},{"x":570,"y":107},{"x":309,"y":360},{"x":1341,"y":128},{"x":309,"y":71},{"x":696,"y":378},{"x":660,"y":270},{"x":777,"y":171},{"x":1215,"y":271},{"x":1358,"y":162},{"x":1400,"y":53},{"x":705,"y":198},{"x":147,"y":306},{"x":1417,"y":179},{"x":237,"y":189},{"x":804,"y":162},{"x":228,"y":612},{"x":958,"y":576},{"x":516,"y":125},{"x":705,"y":333},{"x":1484,"y":590},{"x":264,"y":243},{"x":1458,"y":733},{"x":57,"y":234},{"x":570,"y":98},{"x":462,"y":71},{"x":57,"y":243},{"x":876,"y":666},{"x":93,"y":207},{"x":705,"y":324},{"x":219,"y":576},{"x":516,"y":342},{"x":1484,"y":128},{"x":1358,"y":254},{"x":372,"y":116},{"x":1291,"y":196},{"x":363,"y":252},{"x":1500,"y":649},{"x":57,"y":378},{"x":1265,"y":238},{"x":183,"y":576},{"x":525,"y":53},{"x":219,"y":459},{"x":1333,"y":78},{"x":1517,"y":641},{"x":1215,"y":196},{"x":1257,"y":137},{"x":1458,"y":473},{"x":1559,"y":19},{"x":1282,"y":221},{"x":129,"y":342},{"x":1576,"y":531},{"x":336,"y":288},{"x":408,"y":89},{"x":129,"y":306},{"x":273,"y":657},{"x":588,"y":441},{"x":336,"y":171},{"x":408,"y":279},{"x":804,"y":234},{"x":1492,"y":565},{"x":1274,"y":271},{"x":534,"y":44},{"x":1375,"y":221},{"x":138,"y":207},{"x":516,"y":89},{"x":75,"y":369},{"x":237,"y":657},{"x":156,"y":333},{"x":1492,"y":540},{"x":273,"y":396},{"x":1207,"y":212},{"x":1291,"y":95},{"x":1442,"y":422},{"x":759,"y":216},{"x":849,"y":684},{"x":174,"y":324},{"x":1316,"y":229},{"x":624,"y":270},{"x":1635,"y":11},{"x":219,"y":89},{"x":768,"y":71},{"x":1408,"y":498},{"x":1542,"y":154},{"x":1408,"y":414},{"x":1282,"y":347},{"x":264,"y":549},{"x":192,"y":107},{"x":696,"y":342},{"x":1584,"y":590},{"x":858,"y":62},{"x":633,"y":216},{"x":958,"y":675},{"x":750,"y":216},{"x":1458,"y":78},{"x":1240,"y":86},{"x":345,"y":297},{"x":1265,"y":154},{"x":1307,"y":187},{"x":1551,"y":641},{"x":363,"y":441},{"x":192,"y":522},{"x":516,"y":252},{"x":813,"y":522},{"x":579,"y":378},{"x":561,"y":396},{"x":1517,"y":28},{"x":408,"y":80},{"x":165,"y":342},{"x":183,"y":62},{"x":741,"y":171},{"x":1257,"y":347},{"x":786,"y":225},{"x":480,"y":71},{"x":768,"y":80},{"x":1057,"y":558},{"x":147,"y":270},{"x":1349,"y":120},{"x":1484,"y":196},{"x":1551,"y":481},{"x":1240,"y":128},{"x":1257,"y":196},{"x":1425,"y":154},{"x":967,"y":693},{"x":1265,"y":271},{"x":246,"y":207},{"x":1542,"y":607},{"x":651,"y":288},{"x":570,"y":387},{"x":1383,"y":238},{"x":1282,"y":86},{"x":255,"y":639},{"x":615,"y":297},{"x":1425,"y":170},{"x":1694,"y":36},{"x":219,"y":216},{"x":570,"y":270},{"x":813,"y":62},{"x":1710,"y":70},{"x":1475,"y":128},{"x":1240,"y":271},{"x":1341,"y":229},{"x":462,"y":44},{"x":642,"y":297},{"x":552,"y":89},{"x":453,"y":234},{"x":345,"y":396},{"x":147,"y":153},{"x":768,"y":243},{"x":1425,"y":364},{"x":417,"y":144},{"x":507,"y":44},{"x":525,"y":189},{"x":1492,"y":498},{"x":669,"y":153},{"x":903,"y":71},{"x":813,"y":207},{"x":1383,"y":498},{"x":57,"y":315},{"x":336,"y":441},{"x":1400,"y":515},{"x":1526,"y":582},{"x":381,"y":107},{"x":48,"y":396},{"x":1492,"y":473},{"x":1291,"y":221},{"x":958,"y":522},{"x":1635,"y":28},{"x":1391,"y":515},{"x":210,"y":360},{"x":309,"y":144},{"x":1291,"y":128},{"x":723,"y":351},{"x":1274,"y":221},{"x":696,"y":125},{"x":84,"y":261},{"x":913,"y":684},{"x":309,"y":369},{"x":1383,"y":364},{"x":327,"y":495},{"x":1375,"y":296},{"x":210,"y":396},{"x":318,"y":80},{"x":273,"y":405},{"x":1492,"y":447},{"x":786,"y":71},{"x":1492,"y":170},{"x":192,"y":162},{"x":1366,"y":229},{"x":219,"y":666},{"x":408,"y":107},{"x":795,"y":648},{"x":156,"y":144},{"x":1265,"y":280},{"x":237,"y":107},{"x":192,"y":405},{"x":732,"y":378},{"x":1475,"y":204},{"x":561,"y":98},{"x":795,"y":621},{"x":84,"y":216},{"x":1500,"y":154},{"x":237,"y":125},{"x":1433,"y":548},{"x":336,"y":135},{"x":201,"y":297},{"x":1643,"y":44},{"x":273,"y":116},{"x":759,"y":144},{"x":228,"y":630},{"x":219,"y":504},{"x":1232,"y":120},{"x":543,"y":378},{"x":561,"y":162},{"x":768,"y":252},{"x":390,"y":441},{"x":1265,"y":103},{"x":1517,"y":666},{"x":246,"y":522},{"x":147,"y":414},{"x":1643,"y":86},{"x":687,"y":387},{"x":1534,"y":137},{"x":1467,"y":145},{"x":57,"y":441},{"x":354,"y":369},{"x":75,"y":351},{"x":156,"y":450},{"x":507,"y":107},{"x":858,"y":80},{"x":372,"y":243},{"x":579,"y":53},{"x":219,"y":450},{"x":1198,"y":204},{"x":1433,"y":599},{"x":552,"y":306},{"x":156,"y":414},{"x":1316,"y":280},{"x":1475,"y":44},{"x":174,"y":351},{"x":75,"y":333},{"x":678,"y":279},{"x":534,"y":243},{"x":885,"y":621},{"x":525,"y":35},{"x":309,"y":279},{"x":264,"y":107},{"x":1223,"y":120},{"x":66,"y":387},{"x":1341,"y":246},{"x":597,"y":351},{"x":48,"y":414},{"x":1391,"y":557},{"x":192,"y":450},{"x":1417,"y":506},{"x":1105,"y":128},{"x":543,"y":270},{"x":75,"y":378},{"x":660,"y":125},{"x":552,"y":71},{"x":1467,"y":766},{"x":1265,"y":338},{"x":480,"y":243},{"x":1500,"y":641},{"x":913,"y":666},{"x":579,"y":80},{"x":967,"y":522},{"x":642,"y":252},{"x":183,"y":369},{"x":255,"y":198},{"x":1198,"y":296},{"x":120,"y":378},{"x":273,"y":513},{"x":354,"y":360},{"x":1542,"y":657},{"x":1207,"y":128},{"x":1324,"y":86},{"x":183,"y":477},{"x":462,"y":26},{"x":237,"y":675},{"x":543,"y":306},{"x":894,"y":567},{"x":741,"y":414},{"x":813,"y":657},{"x":39,"y":360},{"x":111,"y":369},{"x":462,"y":107},{"x":327,"y":62},{"x":489,"y":62},{"x":210,"y":684},{"x":1282,"y":70},{"x":1113,"y":112},{"x":48,"y":450},{"x":30,"y":333},{"x":336,"y":116},{"x":228,"y":567},{"x":471,"y":288},{"x":354,"y":342},{"x":1568,"y":531},{"x":1282,"y":305},{"x":849,"y":414},{"x":1113,"y":103},{"x":1249,"y":288},{"x":174,"y":486},{"x":471,"y":315},{"x":687,"y":98},{"x":750,"y":207},{"x":624,"y":261},{"x":1375,"y":70},{"x":426,"y":270},{"x":696,"y":315},{"x":129,"y":333},{"x":597,"y":189},{"x":561,"y":234},{"x":1249,"y":112},{"x":903,"y":62},{"x":1400,"y":212},{"x":453,"y":144},{"x":570,"y":80},{"x":336,"y":297},{"x":246,"y":306},{"x":498,"y":135},{"x":273,"y":315},{"x":282,"y":612},{"x":273,"y":243},{"x":309,"y":153},{"x":336,"y":62},{"x":1274,"y":187},{"x":1333,"y":112},{"x":867,"y":693},{"x":1375,"y":95},{"x":723,"y":80},{"x":111,"y":378},{"x":561,"y":279},{"x":183,"y":450},{"x":1383,"y":523},{"x":219,"y":657},{"x":282,"y":603},{"x":363,"y":594},{"x":1366,"y":78},{"x":1307,"y":372},{"x":417,"y":116},{"x":1702,"y":61},{"x":1349,"y":405},{"x":849,"y":603},{"x":1542,"y":11},{"x":237,"y":513},{"x":489,"y":189},{"x":867,"y":252},{"x":336,"y":89},{"x":1542,"y":540},{"x":309,"y":351},{"x":831,"y":693},{"x":480,"y":252},{"x":804,"y":630},{"x":273,"y":612},{"x":318,"y":162},{"x":903,"y":756},{"x":318,"y":585},{"x":786,"y":657},{"x":958,"y":71},{"x":480,"y":270},{"x":534,"y":71},{"x":381,"y":315},{"x":192,"y":306},{"x":1383,"y":263},{"x":498,"y":306},{"x":264,"y":666},{"x":1207,"y":271},{"x":1333,"y":179},{"x":615,"y":216},{"x":1500,"y":557},{"x":543,"y":26},{"x":967,"y":639},{"x":1349,"y":397},{"x":534,"y":171},{"x":1660,"y":19},{"x":1433,"y":489},{"x":660,"y":44},{"x":255,"y":495},{"x":1349,"y":137},{"x":777,"y":540},{"x":1316,"y":380},{"x":1534,"y":28},{"x":165,"y":144},{"x":885,"y":630},{"x":543,"y":198},{"x":498,"y":125},{"x":669,"y":378},{"x":354,"y":414},{"x":1467,"y":683},{"x":1484,"y":481},{"x":1358,"y":137},{"x":444,"y":144},{"x":1215,"y":204},{"x":246,"y":324},{"x":282,"y":594},{"x":786,"y":504},{"x":1366,"y":53},{"x":390,"y":414},{"x":1467,"y":414},{"x":408,"y":180},{"x":741,"y":71},{"x":1274,"y":238},{"x":579,"y":26},{"x":606,"y":153},{"x":1425,"y":431},{"x":228,"y":225},{"x":300,"y":450},{"x":1517,"y":481},{"x":741,"y":234},{"x":940,"y":657},{"x":931,"y":684},{"x":1375,"y":179},{"x":237,"y":53},{"x":1509,"y":624},{"x":111,"y":315},{"x":768,"y":333},{"x":1341,"y":145},{"x":624,"y":333},{"x":786,"y":477},{"x":1240,"y":137},{"x":228,"y":216},{"x":705,"y":171},{"x":39,"y":414},{"x":480,"y":288},{"x":705,"y":459},{"x":165,"y":270},{"x":822,"y":378},{"x":1601,"y":11},{"x":246,"y":693},{"x":705,"y":441},{"x":417,"y":216},{"x":813,"y":414},{"x":1383,"y":489},{"x":246,"y":702},{"x":1408,"y":170},{"x":480,"y":44},{"x":976,"y":675},{"x":309,"y":504},{"x":597,"y":288},{"x":21,"y":351},{"x":273,"y":603},{"x":408,"y":98},{"x":498,"y":80},{"x":165,"y":441},{"x":183,"y":432},{"x":129,"y":180},{"x":237,"y":135},{"x":282,"y":360},{"x":1593,"y":565},{"x":273,"y":153},{"x":1207,"y":112},{"x":1215,"y":330},{"x":1467,"y":599},{"x":336,"y":315},{"x":1400,"y":422},{"x":1249,"y":355},{"x":1408,"y":229},{"x":201,"y":630},{"x":813,"y":98},{"x":1442,"y":70},{"x":1207,"y":322},{"x":723,"y":216},{"x":1223,"y":196},{"x":642,"y":89},{"x":1576,"y":599},{"x":489,"y":80},{"x":867,"y":261},{"x":1408,"y":221},{"x":913,"y":630},{"x":1307,"y":254},{"x":1307,"y":120},{"x":318,"y":252},{"x":1542,"y":78},{"x":327,"y":324},{"x":1215,"y":280},{"x":1425,"y":355},{"x":75,"y":405},{"x":102,"y":378},{"x":894,"y":594},{"x":1467,"y":632},{"x":552,"y":252},{"x":1643,"y":78},{"x":705,"y":53},{"x":516,"y":225},{"x":165,"y":89},{"x":309,"y":612},{"x":1610,"y":28},{"x":1223,"y":212},{"x":1710,"y":28},{"x":30,"y":351},{"x":642,"y":207},{"x":237,"y":567},{"x":543,"y":89},{"x":192,"y":432},{"x":174,"y":116},{"x":804,"y":44},{"x":705,"y":486},{"x":1324,"y":380},{"x":651,"y":306},{"x":327,"y":468},{"x":237,"y":531},{"x":1450,"y":61},{"x":732,"y":270},{"x":318,"y":549},{"x":309,"y":567},{"x":750,"y":315},{"x":354,"y":288},{"x":579,"y":189},{"x":480,"y":297},{"x":84,"y":387},{"x":1316,"y":389},{"x":507,"y":62},{"x":1467,"y":447},{"x":1526,"y":78},{"x":949,"y":612},{"x":1433,"y":162},{"x":949,"y":657},{"x":1366,"y":103},{"x":345,"y":53},{"x":435,"y":216},{"x":219,"y":315},{"x":777,"y":44},{"x":246,"y":153},{"x":1324,"y":355},{"x":1442,"y":582},{"x":750,"y":288},{"x":255,"y":89},{"x":327,"y":180},{"x":967,"y":531},{"x":183,"y":423},{"x":363,"y":333},{"x":1257,"y":78},{"x":849,"y":648},{"x":858,"y":612},{"x":1265,"y":95},{"x":913,"y":513},{"x":1475,"y":557},{"x":165,"y":504},{"x":183,"y":387},{"x":597,"y":270},{"x":354,"y":315},{"x":516,"y":279},{"x":1391,"y":439},{"x":525,"y":116},{"x":1257,"y":95},{"x":1433,"y":179},{"x":867,"y":80},{"x":300,"y":567},{"x":291,"y":324},{"x":120,"y":306},{"x":1333,"y":187},{"x":949,"y":567},{"x":120,"y":369},{"x":30,"y":414},{"x":588,"y":315},{"x":237,"y":639},{"x":813,"y":53},{"x":1291,"y":246},{"x":75,"y":396},{"x":390,"y":125},{"x":282,"y":477},{"x":1601,"y":523},{"x":1400,"y":246},{"x":624,"y":44},{"x":1509,"y":565},{"x":922,"y":504},{"x":309,"y":243},{"x":1223,"y":61},{"x":696,"y":297},{"x":1442,"y":447},{"x":1593,"y":531},{"x":867,"y":71},{"x":1610,"y":523},{"x":606,"y":144},{"x":147,"y":378},{"x":1265,"y":364},{"x":1500,"y":179},{"x":687,"y":180},{"x":1249,"y":296},{"x":1526,"y":599},{"x":192,"y":585},{"x":1190,"y":70},{"x":210,"y":324},{"x":885,"y":62},{"x":885,"y":89},{"x":381,"y":612},{"x":1442,"y":196},{"x":579,"y":35},{"x":390,"y":567},{"x":165,"y":171},{"x":777,"y":107},{"x":255,"y":378},{"x":958,"y":513},{"x":165,"y":486},{"x":246,"y":684},{"x":1249,"y":330},{"x":462,"y":315},{"x":300,"y":648},{"x":291,"y":486},{"x":1181,"y":238},{"x":345,"y":135},{"x":498,"y":153},{"x":813,"y":621},{"x":219,"y":387},{"x":804,"y":333},{"x":300,"y":351},{"x":210,"y":576},{"x":336,"y":80},{"x":1467,"y":498},{"x":489,"y":180},{"x":777,"y":225},{"x":705,"y":234},{"x":1710,"y":53},{"x":813,"y":369},{"x":750,"y":279},{"x":192,"y":297},{"x":291,"y":180},{"x":534,"y":279},{"x":642,"y":125},{"x":759,"y":53},{"x":1526,"y":103},{"x":372,"y":396},{"x":1559,"y":506},{"x":174,"y":513},{"x":228,"y":288},{"x":1450,"y":170},{"x":381,"y":270},{"x":363,"y":342},{"x":255,"y":432},{"x":300,"y":531},{"x":660,"y":171},{"x":219,"y":441},{"x":255,"y":342},{"x":561,"y":144},{"x":1240,"y":120},{"x":1542,"y":179},{"x":1425,"y":145},{"x":336,"y":513},{"x":1484,"y":573},{"x":1207,"y":95},{"x":48,"y":378},{"x":138,"y":414},{"x":1408,"y":439},{"x":345,"y":216},{"x":1333,"y":145},{"x":273,"y":162},{"x":1417,"y":431},{"x":372,"y":80},{"x":390,"y":180},{"x":1450,"y":531},{"x":489,"y":135},{"x":1215,"y":78},{"x":120,"y":270},{"x":1417,"y":212},{"x":1240,"y":145},{"x":940,"y":585},{"x":255,"y":306},{"x":615,"y":342},{"x":543,"y":324},{"x":1517,"y":582},{"x":237,"y":279},{"x":111,"y":432},{"x":570,"y":405},{"x":1299,"y":196},{"x":750,"y":189},{"x":1467,"y":708},{"x":57,"y":360},{"x":1282,"y":112},{"x":597,"y":234},{"x":660,"y":252},{"x":219,"y":207},{"x":372,"y":53},{"x":696,"y":198},{"x":381,"y":621},{"x":588,"y":234},{"x":255,"y":468},{"x":849,"y":666},{"x":237,"y":207},{"x":1265,"y":322},{"x":12,"y":387},{"x":633,"y":107},{"x":1349,"y":95},{"x":660,"y":116},{"x":273,"y":324},{"x":588,"y":216},{"x":1366,"y":128},{"x":678,"y":306},{"x":678,"y":107},{"x":372,"y":225},{"x":345,"y":116},{"x":1492,"y":196},{"x":489,"y":243},{"x":696,"y":62},{"x":849,"y":657},{"x":210,"y":369},{"x":660,"y":35},{"x":201,"y":522},{"x":309,"y":261},{"x":354,"y":198},{"x":1215,"y":212},{"x":525,"y":198},{"x":426,"y":252},{"x":507,"y":225},{"x":1223,"y":170},{"x":1467,"y":531},{"x":300,"y":180},{"x":228,"y":387},{"x":246,"y":297},{"x":1349,"y":154},{"x":525,"y":153},{"x":678,"y":378},{"x":543,"y":180},{"x":768,"y":666},{"x":1458,"y":649},{"x":570,"y":162},{"x":723,"y":513},{"x":940,"y":540},{"x":1257,"y":305},{"x":705,"y":279},{"x":777,"y":675},{"x":1509,"y":498},{"x":1408,"y":53},{"x":1492,"y":204},{"x":1240,"y":238},{"x":543,"y":207},{"x":471,"y":261},{"x":453,"y":89},{"x":237,"y":693},{"x":741,"y":198},{"x":237,"y":612},{"x":255,"y":396},{"x":1408,"y":464},{"x":858,"y":270},{"x":228,"y":144},{"x":192,"y":567},{"x":1610,"y":103},{"x":813,"y":324},{"x":327,"y":378},{"x":165,"y":135},{"x":606,"y":351},{"x":1375,"y":53},{"x":1458,"y":615},{"x":1442,"y":565},{"x":228,"y":62},{"x":552,"y":225},{"x":732,"y":35},{"x":1584,"y":548},{"x":1568,"y":11},{"x":1383,"y":95},{"x":417,"y":225},{"x":1408,"y":481},{"x":624,"y":342},{"x":471,"y":98},{"x":327,"y":71},{"x":1652,"y":36},{"x":453,"y":44},{"x":444,"y":198},{"x":885,"y":594},{"x":561,"y":71},{"x":174,"y":98},{"x":12,"y":369},{"x":1467,"y":481},{"x":309,"y":630},{"x":1316,"y":70},{"x":120,"y":423},{"x":183,"y":243},{"x":1375,"y":112},{"x":453,"y":107},{"x":1391,"y":473},{"x":1232,"y":78},{"x":687,"y":80},{"x":462,"y":125},{"x":913,"y":98},{"x":1123,"y":103},{"x":516,"y":62},{"x":1190,"y":95},{"x":741,"y":144},{"x":687,"y":234},{"x":84,"y":378},{"x":1610,"y":531},{"x":318,"y":234},{"x":1232,"y":145},{"x":1458,"y":691},{"x":940,"y":522},{"x":669,"y":243},{"x":687,"y":189},{"x":534,"y":198},{"x":237,"y":459},{"x":669,"y":261},{"x":903,"y":603},{"x":363,"y":351},{"x":949,"y":540},{"x":507,"y":135},{"x":1526,"y":590},{"x":894,"y":675},{"x":210,"y":468},{"x":165,"y":477},{"x":1584,"y":506},{"x":93,"y":324},{"x":30,"y":396},{"x":1551,"y":548},{"x":237,"y":594},{"x":1584,"y":573},{"x":363,"y":144},{"x":1181,"y":254},{"x":534,"y":333},{"x":327,"y":513},{"x":831,"y":180},{"x":345,"y":144},{"x":84,"y":450},{"x":678,"y":288},{"x":1232,"y":95},{"x":1668,"y":28},{"x":300,"y":297},{"x":777,"y":684},{"x":111,"y":360},{"x":885,"y":567},{"x":804,"y":675},{"x":102,"y":144},{"x":615,"y":333},{"x":1484,"y":750},{"x":363,"y":612},{"x":156,"y":180},{"x":480,"y":180},{"x":759,"y":71},{"x":210,"y":297},{"x":1475,"y":599},{"x":1249,"y":347},{"x":165,"y":468},{"x":93,"y":387},{"x":345,"y":315},{"x":399,"y":576},{"x":66,"y":234},{"x":246,"y":432},{"x":759,"y":80},{"x":543,"y":71},{"x":795,"y":324},{"x":678,"y":162},{"x":219,"y":486},{"x":228,"y":369},{"x":1391,"y":162},{"x":759,"y":711},{"x":1475,"y":573},{"x":309,"y":107},{"x":345,"y":360},{"x":642,"y":135},{"x":84,"y":288},{"x":1542,"y":582},{"x":1307,"y":238},{"x":1274,"y":305},{"x":336,"y":405},{"x":949,"y":639},{"x":958,"y":666},{"x":165,"y":324},{"x":201,"y":585},{"x":237,"y":540},{"x":768,"y":116},{"x":120,"y":216},{"x":831,"y":423},{"x":426,"y":71},{"x":1618,"y":95},{"x":219,"y":495},{"x":1610,"y":86},{"x":300,"y":477},{"x":246,"y":216},{"x":741,"y":189},{"x":255,"y":486},{"x":967,"y":630},{"x":1274,"y":246},{"x":714,"y":98},{"x":300,"y":171},{"x":1433,"y":154},{"x":579,"y":306},{"x":147,"y":324},{"x":57,"y":450},{"x":1475,"y":607},{"x":579,"y":162},{"x":327,"y":153},{"x":849,"y":432},{"x":1383,"y":103},{"x":498,"y":279},{"x":1307,"y":229},{"x":1341,"y":187},{"x":1450,"y":733},{"x":291,"y":531},{"x":471,"y":198},{"x":453,"y":180},{"x":795,"y":504},{"x":1223,"y":246},{"x":958,"y":639},{"x":1694,"y":11},{"x":147,"y":396},{"x":21,"y":360},{"x":390,"y":315},{"x":606,"y":125},{"x":543,"y":252},{"x":111,"y":198},{"x":894,"y":720},{"x":282,"y":540},{"x":1383,"y":254},{"x":822,"y":261},{"x":1484,"y":641},{"x":165,"y":261},{"x":1551,"y":557},{"x":1391,"y":464},{"x":57,"y":414},{"x":1500,"y":506},{"x":1249,"y":229},{"x":831,"y":432},{"x":48,"y":342},{"x":949,"y":648},{"x":885,"y":207},{"x":246,"y":288},{"x":1190,"y":221},{"x":264,"y":135},{"x":516,"y":135},{"x":363,"y":603},{"x":741,"y":207},{"x":1383,"y":481},{"x":300,"y":423},{"x":552,"y":279},{"x":1257,"y":322},{"x":1559,"y":607},{"x":1467,"y":204},{"x":1509,"y":590},{"x":1021,"y":783},{"x":714,"y":324},{"x":1517,"y":145},{"x":246,"y":414},{"x":318,"y":198},{"x":1391,"y":481},{"x":444,"y":171},{"x":1274,"y":145},{"x":1358,"y":246},{"x":1232,"y":313},{"x":498,"y":252},{"x":822,"y":675},{"x":597,"y":125},{"x":606,"y":180},{"x":1299,"y":145},{"x":1467,"y":641},{"x":381,"y":135},{"x":183,"y":162},{"x":183,"y":98},{"x":570,"y":135},{"x":1509,"y":120},{"x":1324,"y":120},{"x":183,"y":180},{"x":1240,"y":112},{"x":822,"y":107},{"x":768,"y":135},{"x":822,"y":162},{"x":786,"y":98},{"x":237,"y":396},{"x":1526,"y":666},{"x":913,"y":153},{"x":1433,"y":481},{"x":507,"y":252},{"x":1383,"y":112},{"x":129,"y":351},{"x":894,"y":648},{"x":1003,"y":783},{"x":102,"y":306},{"x":210,"y":666},{"x":579,"y":432},{"x":66,"y":423},{"x":1517,"y":162},{"x":1257,"y":145},{"x":183,"y":612},{"x":192,"y":171},{"x":1274,"y":347},{"x":768,"y":504},{"x":1584,"y":489},{"x":237,"y":288},{"x":1559,"y":523},{"x":471,"y":80},{"x":949,"y":675},{"x":174,"y":594},{"x":1458,"y":624},{"x":327,"y":459},{"x":525,"y":171},{"x":1618,"y":44},{"x":1324,"y":162},{"x":588,"y":306},{"x":1450,"y":666},{"x":48,"y":315},{"x":1249,"y":196},{"x":1408,"y":405},{"x":1526,"y":154},{"x":588,"y":342},{"x":651,"y":53},{"x":399,"y":53},{"x":561,"y":243},{"x":1484,"y":447},{"x":1274,"y":78},{"x":678,"y":207},{"x":1685,"y":11},{"x":282,"y":135},{"x":768,"y":189},{"x":651,"y":153},{"x":138,"y":171},{"x":1240,"y":170},{"x":1307,"y":263},{"x":1526,"y":548},{"x":516,"y":297},{"x":885,"y":684},{"x":336,"y":98},{"x":759,"y":207},{"x":282,"y":450},{"x":273,"y":468},{"x":714,"y":279},{"x":1358,"y":196},{"x":246,"y":162},{"x":192,"y":621},{"x":1215,"y":112},{"x":1509,"y":573},{"x":1458,"y":582},{"x":534,"y":116},{"x":831,"y":414},{"x":1282,"y":288},{"x":1534,"y":590},{"x":390,"y":270},{"x":1417,"y":78},{"x":471,"y":144},{"x":786,"y":675},{"x":399,"y":62},{"x":1492,"y":758},{"x":210,"y":153},{"x":291,"y":639},{"x":570,"y":234},{"x":471,"y":171},{"x":210,"y":180},{"x":291,"y":315},{"x":480,"y":17},{"x":525,"y":306},{"x":795,"y":189},{"x":913,"y":80},{"x":1299,"y":204},{"x":228,"y":576},{"x":651,"y":125},{"x":399,"y":387},{"x":507,"y":324},{"x":822,"y":504},{"x":1400,"y":489},{"x":759,"y":531},{"x":1610,"y":506},{"x":336,"y":549},{"x":102,"y":423},{"x":318,"y":107},{"x":1433,"y":170},{"x":606,"y":189},{"x":354,"y":180},{"x":1223,"y":229},{"x":417,"y":306},{"x":363,"y":125},{"x":1282,"y":78},{"x":1400,"y":254},{"x":1274,"y":355},{"x":201,"y":351},{"x":804,"y":657},{"x":273,"y":540},{"x":768,"y":171},{"x":336,"y":333},{"x":606,"y":71},{"x":291,"y":459},{"x":1500,"y":196},{"x":579,"y":261},{"x":1509,"y":615},{"x":750,"y":243},{"x":291,"y":261},{"x":561,"y":53},{"x":1534,"y":103},{"x":147,"y":423},{"x":192,"y":630},{"x":1215,"y":61},{"x":390,"y":162},{"x":1467,"y":716},{"x":696,"y":324},{"x":1249,"y":179},{"x":588,"y":369},{"x":804,"y":639},{"x":318,"y":459},{"x":489,"y":71},{"x":1249,"y":305},{"x":1517,"y":557},{"x":795,"y":225},{"x":561,"y":423},{"x":1282,"y":229},{"x":1450,"y":624},{"x":408,"y":71},{"x":534,"y":288},{"x":210,"y":342},{"x":1232,"y":322},{"x":786,"y":107},{"x":894,"y":639},{"x":1777,"y":11},{"x":525,"y":180},{"x":372,"y":107},{"x":633,"y":44},{"x":768,"y":225},{"x":12,"y":405},{"x":1425,"y":238},{"x":1458,"y":699},{"x":1500,"y":607},{"x":732,"y":504},{"x":1450,"y":523},{"x":372,"y":387},{"x":381,"y":324},{"x":408,"y":360},{"x":300,"y":468},{"x":246,"y":89},{"x":228,"y":495},{"x":381,"y":62},{"x":1484,"y":112},{"x":669,"y":297},{"x":1097,"y":120},{"x":417,"y":261},{"x":75,"y":234},{"x":1232,"y":112},{"x":1391,"y":489},{"x":1240,"y":212},{"x":480,"y":279},{"x":1433,"y":565},{"x":876,"y":612},{"x":237,"y":89},{"x":201,"y":639},{"x":1484,"y":137},{"x":1500,"y":456},{"x":813,"y":252},{"x":471,"y":35},{"x":1517,"y":615},{"x":408,"y":144},{"x":93,"y":351},{"x":777,"y":71},{"x":777,"y":639},{"x":273,"y":225},{"x":1198,"y":229},{"x":1492,"y":674},{"x":705,"y":107},{"x":327,"y":531},{"x":30,"y":387},{"x":120,"y":387},{"x":1240,"y":196},{"x":633,"y":270},{"x":1391,"y":246},{"x":1685,"y":70},{"x":651,"y":207},{"x":327,"y":89},{"x":1526,"y":615},{"x":75,"y":135},{"x":192,"y":486},{"x":949,"y":71},{"x":1719,"y":11},{"x":1534,"y":506},{"x":273,"y":234},{"x":1215,"y":86},{"x":714,"y":342},{"x":1333,"y":221},{"x":390,"y":585},{"x":363,"y":207},{"x":543,"y":107},{"x":1559,"y":515},{"x":867,"y":53},{"x":867,"y":216},{"x":1139,"y":86},{"x":1450,"y":632},{"x":399,"y":207},{"x":723,"y":89},{"x":408,"y":35},{"x":1677,"y":36},{"x":237,"y":315},{"x":1509,"y":439},{"x":363,"y":162},{"x":408,"y":171},{"x":1534,"y":498},{"x":498,"y":324},{"x":922,"y":62},{"x":633,"y":171},{"x":1408,"y":145},{"x":1626,"y":86},{"x":336,"y":324},{"x":678,"y":116},{"x":768,"y":53},{"x":498,"y":35},{"x":597,"y":26},{"x":1517,"y":506},{"x":228,"y":135},{"x":1400,"y":263},{"x":219,"y":675},{"x":976,"y":531},{"x":1450,"y":649},{"x":1165,"y":103},{"x":507,"y":17},{"x":219,"y":162},{"x":291,"y":107},{"x":1324,"y":112},{"x":1475,"y":137},{"x":1450,"y":498},{"x":345,"y":261},{"x":1198,"y":280},{"x":732,"y":62},{"x":1584,"y":565},{"x":354,"y":144},{"x":534,"y":378},{"x":570,"y":44},{"x":282,"y":666},{"x":390,"y":89},{"x":264,"y":369},{"x":579,"y":62},{"x":390,"y":62},{"x":1467,"y":783},{"x":561,"y":44},{"x":210,"y":639},{"x":75,"y":306},{"x":1534,"y":162},{"x":1366,"y":61},{"x":1610,"y":3},{"x":507,"y":207},{"x":381,"y":198},{"x":642,"y":180},{"x":1534,"y":582},{"x":309,"y":639},{"x":228,"y":432},{"x":1207,"y":187},{"x":516,"y":261},{"x":714,"y":162},{"x":1736,"y":95},{"x":1433,"y":439},{"x":237,"y":369},{"x":714,"y":107},{"x":1366,"y":221},{"x":417,"y":35},{"x":903,"y":693},{"x":1467,"y":582},{"x":255,"y":234},{"x":1383,"y":515},{"x":282,"y":216},{"x":1333,"y":154},{"x":1568,"y":540},{"x":273,"y":477},{"x":282,"y":189},{"x":795,"y":684},{"x":255,"y":261},{"x":444,"y":125},{"x":462,"y":135},{"x":822,"y":198},{"x":372,"y":351},{"x":462,"y":153},{"x":255,"y":162},{"x":1291,"y":103},{"x":120,"y":315},{"x":318,"y":558},{"x":219,"y":333},{"x":246,"y":333},{"x":237,"y":162},{"x":174,"y":369},{"x":813,"y":333},{"x":1425,"y":481},{"x":876,"y":585},{"x":354,"y":89},{"x":1542,"y":565},{"x":1291,"y":271},{"x":408,"y":216},{"x":642,"y":198},{"x":390,"y":603},{"x":1500,"y":674},{"x":1341,"y":154},{"x":66,"y":324},{"x":913,"y":657},{"x":858,"y":171},{"x":696,"y":261},{"x":642,"y":144},{"x":1341,"y":137},{"x":1400,"y":473},{"x":138,"y":315},{"x":210,"y":675},{"x":1282,"y":120},{"x":669,"y":198},{"x":1433,"y":666},{"x":687,"y":225},{"x":840,"y":486},{"x":858,"y":666},{"x":1375,"y":128},{"x":1366,"y":246},{"x":795,"y":702},{"x":588,"y":80},{"x":678,"y":62},{"x":1500,"y":481},{"x":228,"y":684},{"x":327,"y":144},{"x":1500,"y":112},{"x":237,"y":522},{"x":273,"y":567},{"x":1383,"y":280},{"x":57,"y":432},{"x":138,"y":252},{"x":480,"y":171},{"x":516,"y":234},{"x":732,"y":135},{"x":1232,"y":254},{"x":813,"y":234},{"x":345,"y":207},{"x":264,"y":378},{"x":876,"y":621},{"x":1391,"y":61},{"x":210,"y":189},{"x":1484,"y":758},{"x":210,"y":486},{"x":57,"y":306},{"x":399,"y":414},{"x":318,"y":378},{"x":318,"y":576},{"x":1484,"y":657},{"x":1299,"y":95},{"x":534,"y":8},{"x":660,"y":279},{"x":201,"y":153},{"x":696,"y":360},{"x":1240,"y":95},{"x":1341,"y":280},{"x":1458,"y":683},{"x":1383,"y":506},{"x":1568,"y":590},{"x":174,"y":306},{"x":246,"y":657},{"x":597,"y":252},{"x":723,"y":180},{"x":552,"y":261},{"x":913,"y":720},{"x":255,"y":567},{"x":444,"y":153},{"x":1375,"y":305},{"x":1433,"y":145},{"x":741,"y":261},{"x":552,"y":351},{"x":1358,"y":44},{"x":1215,"y":137},{"x":75,"y":360},{"x":1526,"y":632},{"x":138,"y":369},{"x":30,"y":441},{"x":1467,"y":70},{"x":156,"y":405},{"x":300,"y":324},{"x":489,"y":261},{"x":381,"y":333},{"x":408,"y":351},{"x":1291,"y":145},{"x":669,"y":225},{"x":138,"y":198},{"x":579,"y":98},{"x":1316,"y":355},{"x":381,"y":369},{"x":66,"y":432},{"x":399,"y":189},{"x":741,"y":324},{"x":696,"y":252},{"x":678,"y":252},{"x":246,"y":180},{"x":111,"y":333},{"x":12,"y":351},{"x":291,"y":468},{"x":1534,"y":649},{"x":1450,"y":599},{"x":1668,"y":70},{"x":894,"y":729},{"x":687,"y":116},{"x":1299,"y":296},{"x":327,"y":594},{"x":885,"y":53},{"x":1475,"y":506},{"x":453,"y":162},{"x":552,"y":405},{"x":786,"y":125},{"x":858,"y":648},{"x":129,"y":261},{"x":1425,"y":498},{"x":588,"y":225},{"x":750,"y":53},{"x":1324,"y":212},{"x":300,"y":369},{"x":678,"y":225},{"x":1509,"y":154},{"x":561,"y":107},{"x":1450,"y":481},{"x":1123,"y":112},{"x":570,"y":216},{"x":318,"y":540},{"x":552,"y":53},{"x":552,"y":288},{"x":1366,"y":271},{"x":1375,"y":170},{"x":1458,"y":422},{"x":291,"y":558},{"x":1198,"y":263},{"x":39,"y":315},{"x":309,"y":125},{"x":147,"y":98},{"x":840,"y":153},{"x":1408,"y":447},{"x":552,"y":234},{"x":831,"y":513},{"x":1383,"y":464},{"x":408,"y":207},{"x":264,"y":621},{"x":1240,"y":204},{"x":732,"y":279},{"x":282,"y":405},{"x":210,"y":414},{"x":570,"y":351},{"x":228,"y":702},{"x":1727,"y":61},{"x":471,"y":71},{"x":570,"y":396},{"x":1366,"y":212},{"x":1198,"y":212},{"x":1442,"y":548},{"x":291,"y":567},{"x":408,"y":125},{"x":597,"y":171},{"x":642,"y":225},{"x":1593,"y":573},{"x":210,"y":378},{"x":1509,"y":800},{"x":273,"y":432},{"x":300,"y":576},{"x":426,"y":216},{"x":165,"y":279},{"x":1576,"y":565},{"x":633,"y":243},{"x":102,"y":270},{"x":687,"y":89},{"x":264,"y":630},{"x":1660,"y":11},{"x":228,"y":558},{"x":1475,"y":632},{"x":958,"y":612},{"x":435,"y":44},{"x":327,"y":414},{"x":1643,"y":61},{"x":255,"y":351},{"x":858,"y":44},{"x":1517,"y":154},{"x":264,"y":306},{"x":705,"y":351},{"x":354,"y":630},{"x":345,"y":243},{"x":849,"y":540},{"x":444,"y":62},{"x":1400,"y":229},{"x":111,"y":342},{"x":399,"y":432},{"x":255,"y":125},{"x":1316,"y":86},{"x":327,"y":198},{"x":1450,"y":414},{"x":1492,"y":708},{"x":1551,"y":632},{"x":624,"y":71},{"x":1458,"y":464},{"x":345,"y":288},{"x":246,"y":459},{"x":282,"y":162},{"x":66,"y":414},{"x":363,"y":450},{"x":1442,"y":481},{"x":84,"y":306},{"x":1333,"y":86},{"x":561,"y":171},{"x":876,"y":252},{"x":336,"y":243},{"x":345,"y":107},{"x":1559,"y":78},{"x":894,"y":576},{"x":228,"y":53},{"x":1408,"y":263},{"x":651,"y":252},{"x":1526,"y":489},{"x":498,"y":180},{"x":786,"y":468},{"x":318,"y":125},{"x":165,"y":495},{"x":354,"y":279},{"x":291,"y":540},{"x":390,"y":360},{"x":309,"y":225},{"x":246,"y":189},{"x":1198,"y":221},{"x":1433,"y":187},{"x":381,"y":180},{"x":1316,"y":128},{"x":255,"y":459},{"x":552,"y":62},{"x":516,"y":153},{"x":1291,"y":137},{"x":876,"y":62},{"x":678,"y":459},{"x":1274,"y":288},{"x":1450,"y":456},{"x":1484,"y":624},{"x":84,"y":423},{"x":327,"y":306},{"x":237,"y":684},{"x":1425,"y":523},{"x":1509,"y":540},{"x":336,"y":71},{"x":453,"y":306},{"x":1458,"y":498},{"x":768,"y":684},{"x":1509,"y":489},{"x":777,"y":207},{"x":1265,"y":145},{"x":417,"y":135},{"x":147,"y":107},{"x":1299,"y":128},{"x":444,"y":107},{"x":264,"y":585},{"x":741,"y":62},{"x":1492,"y":699},{"x":228,"y":414},{"x":1433,"y":464},{"x":660,"y":162},{"x":723,"y":324},{"x":894,"y":711},{"x":138,"y":270},{"x":822,"y":98},{"x":390,"y":369},{"x":1534,"y":53},{"x":1375,"y":481},{"x":300,"y":558},{"x":354,"y":53},{"x":1551,"y":19},{"x":327,"y":80},{"x":831,"y":657},{"x":741,"y":243},{"x":940,"y":531},{"x":714,"y":53},{"x":660,"y":53},{"x":264,"y":198},{"x":1299,"y":288},{"x":174,"y":198},{"x":1265,"y":78},{"x":102,"y":432},{"x":1500,"y":548},{"x":615,"y":162},{"x":786,"y":315},{"x":228,"y":71},{"x":1249,"y":338},{"x":381,"y":450},{"x":1048,"y":549},{"x":777,"y":116},{"x":102,"y":180},{"x":867,"y":486},{"x":525,"y":44},{"x":1299,"y":120},{"x":1652,"y":28},{"x":1223,"y":221},{"x":1442,"y":657},{"x":390,"y":279},{"x":138,"y":333},{"x":1467,"y":431},{"x":1500,"y":582},{"x":1425,"y":179},{"x":480,"y":153},{"x":210,"y":612},{"x":516,"y":216},{"x":93,"y":315},{"x":1450,"y":162},{"x":309,"y":441},{"x":291,"y":89},{"x":1391,"y":254},{"x":1458,"y":573},{"x":903,"y":702},{"x":660,"y":135},{"x":534,"y":62},{"x":1223,"y":103},{"x":1408,"y":137},{"x":426,"y":135},{"x":1526,"y":53},{"x":1576,"y":557},{"x":849,"y":71},{"x":1517,"y":649},{"x":831,"y":630},{"x":949,"y":711},{"x":381,"y":423},{"x":624,"y":315},{"x":291,"y":216},{"x":750,"y":116},{"x":165,"y":107},{"x":1618,"y":19},{"x":1450,"y":196},{"x":642,"y":333},{"x":228,"y":207},{"x":1383,"y":422},{"x":327,"y":387},{"x":777,"y":297},{"x":1207,"y":204},{"x":696,"y":270},{"x":885,"y":261},{"x":1333,"y":196},{"x":489,"y":89},{"x":264,"y":441},{"x":453,"y":153},{"x":940,"y":621},{"x":1316,"y":78},{"x":1366,"y":162},{"x":1341,"y":414},{"x":1559,"y":11},{"x":1299,"y":372},{"x":750,"y":198},{"x":273,"y":333},{"x":1190,"y":112},{"x":795,"y":666},{"x":1568,"y":582},{"x":102,"y":369},{"x":102,"y":333},{"x":102,"y":324},{"x":1316,"y":187},{"x":1333,"y":162},{"x":1492,"y":70},{"x":1282,"y":196},{"x":1265,"y":112},{"x":552,"y":35},{"x":1534,"y":573},{"x":813,"y":243},{"x":417,"y":153},{"x":381,"y":80},{"x":831,"y":80},{"x":93,"y":225},{"x":1249,"y":120},{"x":516,"y":180},{"x":1173,"y":86},{"x":1450,"y":573},{"x":660,"y":225},{"x":1475,"y":162},{"x":255,"y":98},{"x":282,"y":414},{"x":84,"y":432},{"x":39,"y":405},{"x":660,"y":71},{"x":237,"y":225},{"x":552,"y":144},{"x":822,"y":243},{"x":633,"y":225},{"x":885,"y":495},{"x":1173,"y":103},{"x":543,"y":333},{"x":471,"y":116},{"x":1517,"y":624},{"x":246,"y":594},{"x":462,"y":288},{"x":381,"y":89},{"x":156,"y":360},{"x":210,"y":387},{"x":849,"y":423},{"x":1291,"y":154},{"x":210,"y":567},{"x":813,"y":225},{"x":714,"y":486},{"x":1467,"y":691},{"x":777,"y":198},{"x":1492,"y":523},{"x":624,"y":198},{"x":894,"y":252},{"x":1500,"y":800},{"x":678,"y":89},{"x":516,"y":243},{"x":327,"y":369},{"x":201,"y":225},{"x":219,"y":288},{"x":651,"y":360},{"x":777,"y":711},{"x":1492,"y":103},{"x":210,"y":585},{"x":174,"y":477},{"x":30,"y":369},{"x":1467,"y":473},{"x":210,"y":405},{"x":1425,"y":162},{"x":813,"y":80},{"x":1324,"y":347},{"x":174,"y":504},{"x":1207,"y":238},{"x":426,"y":162},{"x":201,"y":513},{"x":1307,"y":95},{"x":21,"y":333},{"x":1492,"y":53},{"x":597,"y":62},{"x":264,"y":603},{"x":1500,"y":691},{"x":1450,"y":683},{"x":1282,"y":137},{"x":426,"y":144},{"x":291,"y":522},{"x":1012,"y":774},{"x":1324,"y":254},{"x":813,"y":630},{"x":606,"y":35},{"x":1156,"y":86},{"x":1710,"y":44},{"x":1450,"y":674},{"x":1400,"y":447},{"x":1475,"y":750},{"x":750,"y":297},{"x":651,"y":71},{"x":768,"y":702},{"x":1383,"y":137},{"x":561,"y":270},{"x":255,"y":549},{"x":228,"y":423},{"x":940,"y":702},{"x":768,"y":711},{"x":534,"y":26},{"x":1551,"y":565},{"x":1232,"y":70},{"x":624,"y":180},{"x":543,"y":387},{"x":327,"y":504},{"x":949,"y":666},{"x":12,"y":360},{"x":669,"y":351},{"x":327,"y":162},{"x":804,"y":153},{"x":363,"y":279},{"x":786,"y":621},{"x":913,"y":702},{"x":660,"y":207},{"x":732,"y":522},{"x":804,"y":144},{"x":579,"y":116},{"x":336,"y":198},{"x":534,"y":153},{"x":1517,"y":674},{"x":93,"y":450},{"x":1257,"y":313},{"x":156,"y":342},{"x":1366,"y":422},{"x":102,"y":297},{"x":1509,"y":11},{"x":201,"y":567},{"x":1349,"y":112},{"x":345,"y":189},{"x":1417,"y":573},{"x":264,"y":396},{"x":768,"y":693},{"x":813,"y":189},{"x":588,"y":198},{"x":831,"y":53},{"x":516,"y":116},{"x":1240,"y":229},{"x":345,"y":225},{"x":282,"y":107},{"x":786,"y":198},{"x":345,"y":162},{"x":480,"y":89},{"x":192,"y":71},{"x":318,"y":432},{"x":444,"y":116},{"x":1517,"y":95},{"x":1190,"y":61},{"x":669,"y":53},{"x":552,"y":315},{"x":219,"y":684},{"x":66,"y":297},{"x":1190,"y":229},{"x":1475,"y":78},{"x":1450,"y":515},{"x":444,"y":162},{"x":174,"y":468},{"x":255,"y":107},{"x":561,"y":26},{"x":1517,"y":590},{"x":228,"y":198},{"x":642,"y":288},{"x":561,"y":207},{"x":219,"y":639},{"x":552,"y":98},{"x":1400,"y":456},{"x":291,"y":369},{"x":1341,"y":53},{"x":111,"y":207},{"x":1215,"y":145},{"x":246,"y":44},{"x":1500,"y":439},{"x":561,"y":288},{"x":913,"y":648},{"x":1467,"y":464},{"x":1291,"y":179},{"x":417,"y":89},{"x":1500,"y":590},{"x":561,"y":405},{"x":678,"y":297},{"x":1458,"y":196},{"x":669,"y":125},{"x":624,"y":216},{"x":534,"y":207},{"x":1450,"y":506},{"x":804,"y":684},{"x":75,"y":153},{"x":840,"y":432},{"x":1484,"y":145},{"x":1509,"y":44},{"x":156,"y":369},{"x":327,"y":234},{"x":1383,"y":212},{"x":687,"y":405},{"x":1375,"y":61},{"x":183,"y":89},{"x":768,"y":162},{"x":1433,"y":229},{"x":1223,"y":95},{"x":1526,"y":624},{"x":651,"y":333},{"x":237,"y":71},{"x":300,"y":387},{"x":732,"y":423},{"x":1702,"y":44},{"x":1400,"y":103},{"x":1610,"y":515},{"x":750,"y":324},{"x":1425,"y":489},{"x":822,"y":486},{"x":264,"y":98},{"x":327,"y":315},{"x":633,"y":135},{"x":84,"y":234},{"x":1366,"y":137},{"x":1551,"y":11},{"x":1442,"y":506},{"x":210,"y":423},{"x":291,"y":71},{"x":192,"y":234},{"x":669,"y":89},{"x":804,"y":648},{"x":840,"y":89},{"x":777,"y":135},{"x":687,"y":243},{"x":1492,"y":44},{"x":372,"y":89},{"x":705,"y":116},{"x":867,"y":639},{"x":922,"y":603},{"x":507,"y":216},{"x":201,"y":558},{"x":822,"y":153},{"x":768,"y":44},{"x":1484,"y":691},{"x":885,"y":125},{"x":1660,"y":44},{"x":219,"y":648},{"x":1408,"y":422},{"x":1568,"y":557},{"x":1568,"y":498},{"x":138,"y":423},{"x":1417,"y":473},{"x":1484,"y":733},{"x":1584,"y":498},{"x":1433,"y":431},{"x":1526,"y":573},{"x":57,"y":423},{"x":786,"y":324},{"x":1500,"y":36},{"x":255,"y":153},{"x":1509,"y":145},{"x":642,"y":279},{"x":192,"y":243},{"x":940,"y":62},{"x":1526,"y":506},{"x":201,"y":459},{"x":597,"y":135},{"x":1139,"y":112},{"x":588,"y":53},{"x":1458,"y":439},{"x":1484,"y":187},{"x":1249,"y":137},{"x":228,"y":44},{"x":345,"y":234},{"x":714,"y":44},{"x":273,"y":450},{"x":381,"y":116},{"x":507,"y":198},{"x":282,"y":387},{"x":876,"y":693},{"x":84,"y":315},{"x":444,"y":270},{"x":786,"y":53},{"x":1240,"y":313},{"x":300,"y":288},{"x":840,"y":441},{"x":264,"y":684},{"x":768,"y":261},{"x":570,"y":378},{"x":1584,"y":540},{"x":1282,"y":263},{"x":1383,"y":271},{"x":228,"y":153},{"x":399,"y":351},{"x":327,"y":549},{"x":282,"y":234},{"x":129,"y":396},{"x":1249,"y":254},{"x":1458,"y":204},{"x":1190,"y":78},{"x":1425,"y":506},{"x":931,"y":612},{"x":237,"y":477},{"x":1450,"y":44},{"x":327,"y":125},{"x":291,"y":387},{"x":480,"y":53},{"x":183,"y":125},{"x":1584,"y":523},{"x":759,"y":116},{"x":958,"y":603},{"x":714,"y":369},{"x":1282,"y":364},{"x":246,"y":171},{"x":255,"y":621},{"x":138,"y":189},{"x":1173,"y":78},{"x":1232,"y":61},{"x":228,"y":351},{"x":282,"y":585},{"x":444,"y":207},{"x":1475,"y":473},{"x":201,"y":657},{"x":1643,"y":36},{"x":931,"y":639},{"x":669,"y":135},{"x":922,"y":639},{"x":48,"y":279},{"x":1467,"y":196},{"x":192,"y":315},{"x":354,"y":225},{"x":1324,"y":280},{"x":1677,"y":28},{"x":1299,"y":154},{"x":489,"y":107},{"x":1517,"y":632},{"x":1425,"y":86},{"x":309,"y":549},{"x":1223,"y":254},{"x":1358,"y":154},{"x":525,"y":135},{"x":237,"y":324},{"x":129,"y":441},{"x":949,"y":630},{"x":228,"y":125},{"x":705,"y":315},{"x":867,"y":207},{"x":525,"y":107},{"x":1500,"y":120},{"x":471,"y":252},{"x":786,"y":639},{"x":705,"y":288},{"x":1442,"y":170},{"x":3,"y":387},{"x":1341,"y":389},{"x":669,"y":234},{"x":1467,"y":607},{"x":840,"y":189},{"x":426,"y":53},{"x":318,"y":414},{"x":1299,"y":103},{"x":264,"y":171},{"x":219,"y":62},{"x":1232,"y":154},{"x":1442,"y":590},{"x":345,"y":180},{"x":21,"y":378},{"x":795,"y":468},{"x":1274,"y":296},{"x":1349,"y":280},{"x":570,"y":180},{"x":399,"y":171},{"x":1265,"y":162},{"x":291,"y":98},{"x":633,"y":288},{"x":1458,"y":674},{"x":741,"y":342},{"x":282,"y":639},{"x":300,"y":144},{"x":678,"y":216},{"x":93,"y":116},{"x":426,"y":125},{"x":1526,"y":145},{"x":1526,"y":95},{"x":759,"y":261},{"x":327,"y":297},{"x":129,"y":189},{"x":579,"y":252},{"x":156,"y":261},{"x":1526,"y":515},{"x":561,"y":342},{"x":849,"y":98},{"x":345,"y":71},{"x":336,"y":432},{"x":1534,"y":599},{"x":201,"y":207},{"x":300,"y":396},{"x":282,"y":675},{"x":1475,"y":154},{"x":597,"y":153},{"x":741,"y":180},{"x":1492,"y":120},{"x":291,"y":450},{"x":579,"y":180},{"x":606,"y":288},{"x":282,"y":324},{"x":804,"y":423},{"x":894,"y":116},{"x":1265,"y":128},{"x":1257,"y":128},{"x":1232,"y":238},{"x":1618,"y":28},{"x":714,"y":414},{"x":1417,"y":196},{"x":1324,"y":179},{"x":1534,"y":632},{"x":1752,"y":19},{"x":1299,"y":187},{"x":255,"y":504},{"x":570,"y":144},{"x":1282,"y":296},{"x":327,"y":567},{"x":588,"y":98},{"x":174,"y":414},{"x":1366,"y":238},{"x":1509,"y":666},{"x":849,"y":630},{"x":480,"y":225},{"x":1265,"y":170},{"x":1383,"y":338},{"x":759,"y":270},{"x":1492,"y":590},{"x":354,"y":333},{"x":705,"y":89},{"x":1257,"y":170},{"x":750,"y":153},{"x":237,"y":585},{"x":21,"y":405},{"x":696,"y":234},{"x":408,"y":162},{"x":1450,"y":179},{"x":1500,"y":565},{"x":958,"y":648},{"x":705,"y":396},{"x":1593,"y":498},{"x":273,"y":576},{"x":219,"y":98},{"x":1215,"y":221},{"x":372,"y":639},{"x":840,"y":657},{"x":642,"y":26},{"x":831,"y":603},{"x":282,"y":504},{"x":1593,"y":11},{"x":264,"y":486},{"x":66,"y":333},{"x":561,"y":216},{"x":1475,"y":489},{"x":804,"y":621},{"x":1207,"y":246},{"x":1240,"y":322},{"x":1526,"y":28},{"x":1316,"y":204},{"x":1341,"y":238},{"x":1534,"y":145},{"x":327,"y":540},{"x":931,"y":531},{"x":273,"y":306},{"x":336,"y":234},{"x":120,"y":414},{"x":1509,"y":464},{"x":399,"y":297},{"x":1341,"y":162},{"x":174,"y":153},{"x":210,"y":288},{"x":363,"y":107},{"x":777,"y":648},{"x":543,"y":116},{"x":75,"y":387},{"x":1492,"y":187},{"x":1391,"y":221},{"x":840,"y":621},{"x":1383,"y":540},{"x":750,"y":98},{"x":201,"y":414},{"x":1442,"y":674},{"x":246,"y":378},{"x":345,"y":468},{"x":291,"y":657},{"x":282,"y":315},{"x":903,"y":89},{"x":507,"y":180},{"x":1442,"y":615},{"x":309,"y":297},{"x":525,"y":243},{"x":1551,"y":154},{"x":1492,"y":36},{"x":246,"y":53},{"x":462,"y":98},{"x":381,"y":585},{"x":1467,"y":657},{"x":723,"y":144},{"x":1458,"y":599},{"x":462,"y":252},{"x":804,"y":53},{"x":696,"y":144},{"x":453,"y":270},{"x":1400,"y":523},{"x":381,"y":53},{"x":264,"y":450},{"x":372,"y":648},{"x":867,"y":612},{"x":507,"y":80},{"x":291,"y":603},{"x":489,"y":270},{"x":1349,"y":389},{"x":1425,"y":447},{"x":606,"y":44},{"x":30,"y":324},{"x":300,"y":315},{"x":534,"y":297},{"x":66,"y":342},{"x":949,"y":585},{"x":777,"y":144},{"x":1257,"y":154},{"x":201,"y":180},{"x":849,"y":270},{"x":372,"y":279},{"x":1475,"y":708},{"x":840,"y":612},{"x":246,"y":549},{"x":588,"y":297},{"x":237,"y":80},{"x":192,"y":396},{"x":831,"y":675},{"x":435,"y":98},{"x":1240,"y":154},{"x":678,"y":387},{"x":1417,"y":246},{"x":795,"y":89},{"x":390,"y":324},{"x":1492,"y":624},{"x":723,"y":198},{"x":435,"y":107},{"x":1610,"y":19},{"x":804,"y":198},{"x":750,"y":162},{"x":732,"y":333},{"x":1190,"y":86},{"x":1500,"y":464},{"x":219,"y":378},{"x":471,"y":125},{"x":390,"y":261},{"x":723,"y":279},{"x":1417,"y":481},{"x":363,"y":324},{"x":903,"y":135},{"x":777,"y":315},{"x":66,"y":351},{"x":1391,"y":204},{"x":264,"y":405},{"x":255,"y":62},{"x":255,"y":315},{"x":985,"y":657},{"x":327,"y":288},{"x":354,"y":116},{"x":1299,"y":86},{"x":840,"y":684},{"x":633,"y":26},{"x":1316,"y":372},{"x":804,"y":459},{"x":552,"y":189},{"x":813,"y":180},{"x":1048,"y":756},{"x":1282,"y":372},{"x":1425,"y":582},{"x":183,"y":540},{"x":1282,"y":187},{"x":354,"y":639},{"x":246,"y":135},{"x":759,"y":234},{"x":498,"y":71},{"x":309,"y":252},{"x":246,"y":576},{"x":885,"y":107},{"x":687,"y":71},{"x":922,"y":657},{"x":1223,"y":70},{"x":219,"y":549},{"x":534,"y":270},{"x":192,"y":603},{"x":1207,"y":263},{"x":1375,"y":506},{"x":273,"y":171},{"x":705,"y":378},{"x":1249,"y":322},{"x":903,"y":53},{"x":435,"y":153},{"x":678,"y":71},{"x":255,"y":387},{"x":363,"y":288},{"x":201,"y":468},{"x":453,"y":252},{"x":120,"y":171},{"x":606,"y":53},{"x":615,"y":270},{"x":1752,"y":86},{"x":66,"y":306},{"x":309,"y":603},{"x":30,"y":432},{"x":336,"y":450},{"x":1542,"y":70},{"x":291,"y":621},{"x":732,"y":144},{"x":219,"y":630},{"x":804,"y":225},{"x":381,"y":144},{"x":543,"y":216},{"x":273,"y":585},{"x":1450,"y":716},{"x":273,"y":630},{"x":372,"y":288},{"x":1492,"y":657},{"x":1425,"y":557},{"x":228,"y":89},{"x":624,"y":189},{"x":732,"y":189},{"x":606,"y":207},{"x":570,"y":423},{"x":228,"y":180},{"x":534,"y":98},{"x":922,"y":80},{"x":120,"y":351},{"x":976,"y":666},{"x":1366,"y":179},{"x":588,"y":288},{"x":1316,"y":120},{"x":1349,"y":145},{"x":156,"y":441},{"x":1517,"y":447},{"x":264,"y":522},{"x":1207,"y":313},{"x":1450,"y":78},{"x":156,"y":234},{"x":1534,"y":523},{"x":120,"y":252},{"x":174,"y":297},{"x":768,"y":89},{"x":435,"y":261},{"x":84,"y":162},{"x":1458,"y":531},{"x":228,"y":603},{"x":1324,"y":364},{"x":651,"y":351},{"x":606,"y":324},{"x":1383,"y":53},{"x":345,"y":324},{"x":1492,"y":548},{"x":1274,"y":338},{"x":768,"y":288},{"x":1324,"y":229},{"x":399,"y":116},{"x":1341,"y":380},{"x":147,"y":180},{"x":480,"y":162},{"x":1358,"y":170},{"x":147,"y":432},{"x":561,"y":135},{"x":1207,"y":305},{"x":1349,"y":271},{"x":1358,"y":70},{"x":1307,"y":288},{"x":1265,"y":246},{"x":714,"y":62},{"x":1274,"y":179},{"x":210,"y":441},{"x":967,"y":684},{"x":1375,"y":86},{"x":750,"y":80},{"x":201,"y":315},{"x":786,"y":702},{"x":624,"y":153},{"x":723,"y":116},{"x":777,"y":288},{"x":1232,"y":86},{"x":750,"y":306},{"x":1274,"y":280},{"x":1593,"y":590},{"x":786,"y":144},{"x":1307,"y":78},{"x":1207,"y":70},{"x":462,"y":306},{"x":210,"y":621},{"x":1366,"y":196},{"x":1475,"y":464},{"x":1559,"y":565},{"x":597,"y":225},{"x":507,"y":234},{"x":1484,"y":120},{"x":1526,"y":649},{"x":336,"y":486},{"x":597,"y":243},{"x":786,"y":243},{"x":246,"y":360},{"x":597,"y":71},{"x":507,"y":342},{"x":462,"y":297},{"x":714,"y":171},{"x":1249,"y":221},{"x":273,"y":549},{"x":219,"y":153},{"x":1349,"y":246},{"x":903,"y":116},{"x":219,"y":351},{"x":210,"y":693},{"x":913,"y":729},{"x":561,"y":116},{"x":219,"y":342},{"x":1232,"y":280},{"x":1433,"y":196},{"x":1484,"y":506},{"x":1467,"y":95},{"x":588,"y":107},{"x":1366,"y":204},{"x":1282,"y":204},{"x":210,"y":531},{"x":642,"y":189},{"x":786,"y":171},{"x":1643,"y":53},{"x":741,"y":44},{"x":795,"y":297},{"x":1181,"y":103},{"x":66,"y":135},{"x":237,"y":495},{"x":1484,"y":439},{"x":192,"y":477},{"x":498,"y":198},{"x":579,"y":369},{"x":1635,"y":70},{"x":1291,"y":187},{"x":1509,"y":61},{"x":39,"y":342},{"x":714,"y":207},{"x":93,"y":125},{"x":1433,"y":221},{"x":336,"y":144},{"x":651,"y":279},{"x":399,"y":279},{"x":1492,"y":439},{"x":300,"y":504},{"x":543,"y":225},{"x":1207,"y":196},{"x":1559,"y":548},{"x":444,"y":189},{"x":534,"y":225},{"x":372,"y":62},{"x":273,"y":80},{"x":1467,"y":154},{"x":147,"y":441},{"x":1442,"y":414},{"x":903,"y":513},{"x":1442,"y":204},{"x":1391,"y":523},{"x":615,"y":234},{"x":705,"y":189},{"x":120,"y":189},{"x":291,"y":423},{"x":228,"y":306},{"x":1475,"y":766},{"x":237,"y":180},{"x":759,"y":171},{"x":723,"y":125},{"x":1240,"y":61},{"x":1475,"y":758},{"x":1282,"y":128},{"x":318,"y":513},{"x":750,"y":342},{"x":39,"y":378},{"x":1517,"y":607},{"x":1282,"y":95},{"x":282,"y":441},{"x":1484,"y":565},{"x":660,"y":342},{"x":985,"y":540},{"x":246,"y":71},{"x":1198,"y":95},{"x":93,"y":180},{"x":543,"y":360},{"x":228,"y":189},{"x":1752,"y":11},{"x":1207,"y":221},{"x":642,"y":162},{"x":390,"y":153},{"x":795,"y":315},{"x":570,"y":369},{"x":1417,"y":464},{"x":1299,"y":78},{"x":723,"y":171},{"x":174,"y":80},{"x":318,"y":468},{"x":1576,"y":11},{"x":903,"y":98},{"x":1685,"y":53},{"x":363,"y":189},{"x":1316,"y":196},{"x":1442,"y":498},{"x":723,"y":414},{"x":651,"y":44},{"x":183,"y":621},{"x":1433,"y":498},{"x":1316,"y":179},{"x":282,"y":621},{"x":1030,"y":531},{"x":642,"y":216},{"x":1601,"y":28},{"x":426,"y":243},{"x":390,"y":450},{"x":687,"y":153},{"x":840,"y":71},{"x":1618,"y":515},{"x":1324,"y":137},{"x":273,"y":522},{"x":561,"y":333},{"x":597,"y":261},{"x":93,"y":153},{"x":1324,"y":170},{"x":219,"y":306},{"x":102,"y":225},{"x":363,"y":98},{"x":813,"y":648},{"x":615,"y":89},{"x":138,"y":378},{"x":201,"y":477},{"x":777,"y":270},{"x":660,"y":324},{"x":750,"y":107},{"x":1433,"y":632},{"x":327,"y":396},{"x":453,"y":135},{"x":913,"y":756},{"x":1710,"y":36},{"x":201,"y":171},{"x":795,"y":198},{"x":399,"y":162},{"x":426,"y":333},{"x":1458,"y":741},{"x":696,"y":107},{"x":1307,"y":128},{"x":282,"y":342},{"x":615,"y":153},{"x":1080,"y":137},{"x":435,"y":35},{"x":165,"y":252},{"x":750,"y":135},{"x":210,"y":630},{"x":813,"y":549},{"x":1601,"y":548},{"x":237,"y":333},{"x":1593,"y":19},{"x":75,"y":270},{"x":1450,"y":724},{"x":183,"y":360},{"x":1475,"y":565},{"x":714,"y":261},{"x":498,"y":207},{"x":336,"y":585},{"x":1274,"y":95},{"x":1551,"y":615},{"x":363,"y":297},{"x":840,"y":639},{"x":417,"y":279},{"x":291,"y":432},{"x":273,"y":378},{"x":399,"y":125},{"x":1542,"y":573},{"x":264,"y":576},{"x":210,"y":216},{"x":1375,"y":254},{"x":183,"y":171},{"x":885,"y":243},{"x":759,"y":504},{"x":1458,"y":523},{"x":192,"y":80},{"x":21,"y":324},{"x":192,"y":98},{"x":840,"y":98},{"x":309,"y":333},{"x":246,"y":261},{"x":669,"y":252},{"x":714,"y":252},{"x":300,"y":216},{"x":354,"y":297},{"x":1677,"y":44},{"x":210,"y":53},{"x":264,"y":288},{"x":1215,"y":263},{"x":669,"y":116},{"x":1425,"y":464},{"x":111,"y":270},{"x":174,"y":450},{"x":453,"y":71},{"x":309,"y":89},{"x":381,"y":360},{"x":804,"y":486},{"x":183,"y":513},{"x":1232,"y":271},{"x":1215,"y":246},{"x":237,"y":648},{"x":1458,"y":557},{"x":435,"y":135},{"x":354,"y":107},{"x":867,"y":62},{"x":1551,"y":70},{"x":876,"y":648},{"x":1383,"y":221},{"x":48,"y":387},{"x":1324,"y":246},{"x":1492,"y":683},{"x":1257,"y":70},{"x":246,"y":630},{"x":606,"y":98},{"x":922,"y":98},{"x":1475,"y":145},{"x":264,"y":594},{"x":1048,"y":540},{"x":669,"y":270},{"x":66,"y":450},{"x":1223,"y":305},{"x":381,"y":441},{"x":606,"y":107},{"x":1458,"y":590},{"x":633,"y":162},{"x":624,"y":171},{"x":858,"y":261},{"x":192,"y":135},{"x":309,"y":594},{"x":1526,"y":36},{"x":651,"y":35},{"x":408,"y":333},{"x":741,"y":531},{"x":561,"y":261},{"x":399,"y":135},{"x":885,"y":71},{"x":1652,"y":78},{"x":696,"y":53},{"x":291,"y":504},{"x":678,"y":333},{"x":777,"y":468},{"x":813,"y":513},{"x":1517,"y":61},{"x":858,"y":603},{"x":768,"y":153},{"x":120,"y":180},{"x":723,"y":207},{"x":1576,"y":573},{"x":1375,"y":103},{"x":552,"y":396},{"x":300,"y":243},{"x":543,"y":171},{"x":597,"y":180},{"x":940,"y":576},{"x":552,"y":270},{"x":1408,"y":506},{"x":1450,"y":145},{"x":795,"y":207},{"x":1484,"y":783},{"x":282,"y":80},{"x":453,"y":62},{"x":561,"y":315},{"x":615,"y":125},{"x":1249,"y":78},{"x":192,"y":225},{"x":1458,"y":666},{"x":1668,"y":61},{"x":1358,"y":280},{"x":705,"y":153},{"x":931,"y":702},{"x":246,"y":558},{"x":255,"y":603},{"x":1383,"y":128},{"x":1223,"y":86},{"x":597,"y":198},{"x":913,"y":89},{"x":1433,"y":70},{"x":552,"y":360},{"x":624,"y":288},{"x":867,"y":675},{"x":219,"y":135},{"x":291,"y":306},{"x":192,"y":504},{"x":714,"y":144},{"x":219,"y":171},{"x":1475,"y":548},{"x":958,"y":585},{"x":660,"y":80},{"x":642,"y":80},{"x":1408,"y":238},{"x":913,"y":603},{"x":75,"y":288},{"x":1492,"y":716},{"x":579,"y":44},{"x":165,"y":80},{"x":1467,"y":548},{"x":129,"y":405},{"x":102,"y":171},{"x":642,"y":234},{"x":579,"y":207},{"x":1333,"y":280},{"x":534,"y":234},{"x":255,"y":207},{"x":633,"y":53},{"x":354,"y":135},{"x":129,"y":387},{"x":597,"y":342},{"x":1500,"y":498},{"x":1668,"y":36},{"x":940,"y":675},{"x":1249,"y":61},{"x":1282,"y":170},{"x":1618,"y":103},{"x":1274,"y":196},{"x":210,"y":207},{"x":1534,"y":657},{"x":309,"y":486},{"x":1349,"y":53},{"x":84,"y":135},{"x":21,"y":342},{"x":687,"y":144},{"x":417,"y":369},{"x":579,"y":125},{"x":1375,"y":498},{"x":858,"y":180},{"x":228,"y":504},{"x":120,"y":288},{"x":723,"y":98},{"x":1425,"y":221},{"x":1341,"y":288},{"x":1291,"y":296},{"x":1257,"y":280},{"x":1492,"y":766},{"x":1391,"y":86},{"x":543,"y":243},{"x":813,"y":89},{"x":597,"y":144},{"x":318,"y":360},{"x":363,"y":630},{"x":1333,"y":95},{"x":336,"y":396},{"x":813,"y":144},{"x":660,"y":234},{"x":1551,"y":506},{"x":822,"y":612},{"x":1467,"y":515},{"x":1333,"y":263},{"x":1307,"y":162},{"x":1240,"y":338},{"x":111,"y":306},{"x":1349,"y":162},{"x":1265,"y":70},{"x":453,"y":98},{"x":669,"y":216},{"x":183,"y":216},{"x":1559,"y":615},{"x":876,"y":657},{"x":1358,"y":103},{"x":1299,"y":170},{"x":129,"y":288},{"x":327,"y":486},{"x":786,"y":89},{"x":30,"y":423},{"x":183,"y":558},{"x":588,"y":135},{"x":246,"y":450},{"x":1249,"y":128},{"x":885,"y":666},{"x":1324,"y":263},{"x":417,"y":270},{"x":1652,"y":19},{"x":228,"y":342},{"x":147,"y":198},{"x":777,"y":180},{"x":840,"y":80},{"x":1316,"y":95},{"x":1400,"y":481},{"x":525,"y":8},{"x":372,"y":459},{"x":255,"y":360},{"x":390,"y":116},{"x":813,"y":504},{"x":1257,"y":212},{"x":1475,"y":666},{"x":579,"y":243},{"x":183,"y":585},{"x":777,"y":495},{"x":660,"y":144},{"x":111,"y":387},{"x":1391,"y":271},{"x":273,"y":441},{"x":922,"y":648},{"x":858,"y":621},{"x":967,"y":666},{"x":390,"y":252},{"x":1568,"y":19},{"x":1375,"y":246},{"x":156,"y":423},{"x":1400,"y":506},{"x":714,"y":80},{"x":1542,"y":548},{"x":759,"y":189},{"x":255,"y":171},{"x":678,"y":342},{"x":1660,"y":70},{"x":1458,"y":506},{"x":1425,"y":204},{"x":913,"y":125},{"x":210,"y":522},{"x":894,"y":666},{"x":192,"y":558},{"x":1492,"y":112},{"x":264,"y":116},{"x":849,"y":621},{"x":894,"y":98},{"x":1349,"y":254},{"x":1509,"y":641},{"x":768,"y":486},{"x":507,"y":270},{"x":363,"y":423},{"x":1215,"y":254},{"x":201,"y":486},{"x":390,"y":171},{"x":489,"y":252},{"x":1559,"y":540},{"x":1358,"y":120},{"x":705,"y":98},{"x":687,"y":279},{"x":372,"y":333},{"x":444,"y":306},{"x":1442,"y":187},{"x":1223,"y":128},{"x":1517,"y":489},{"x":282,"y":116},{"x":1358,"y":221},{"x":1375,"y":288},{"x":282,"y":53},{"x":768,"y":675},{"x":1375,"y":238},{"x":687,"y":342},{"x":228,"y":315},{"x":985,"y":648},{"x":282,"y":513},{"x":1442,"y":699},{"x":93,"y":414},{"x":678,"y":198},{"x":543,"y":279},{"x":1181,"y":112},{"x":1492,"y":137},{"x":669,"y":369},{"x":255,"y":144},{"x":678,"y":243},{"x":219,"y":369},{"x":687,"y":324},{"x":840,"y":53},{"x":678,"y":234},{"x":1542,"y":481},{"x":597,"y":333},{"x":282,"y":369},{"x":318,"y":71},{"x":759,"y":252},{"x":363,"y":243},{"x":669,"y":324},{"x":1467,"y":422},{"x":1467,"y":162},{"x":552,"y":414},{"x":408,"y":261},{"x":723,"y":234},{"x":804,"y":107},{"x":1517,"y":53},{"x":696,"y":477},{"x":570,"y":198},{"x":1458,"y":716},{"x":282,"y":153},{"x":1417,"y":221},{"x":552,"y":162},{"x":291,"y":351},{"x":318,"y":504},{"x":949,"y":702},{"x":417,"y":53},{"x":1299,"y":246},{"x":444,"y":351},{"x":1719,"y":19},{"x":534,"y":180},{"x":1156,"y":78},{"x":138,"y":261},{"x":93,"y":432},{"x":363,"y":459},{"x":1442,"y":557},{"x":1475,"y":196},{"x":579,"y":279},{"x":354,"y":216},{"x":228,"y":171},{"x":237,"y":549},{"x":606,"y":216},{"x":1324,"y":154},{"x":264,"y":189},{"x":1391,"y":347},{"x":264,"y":342},{"x":309,"y":513},{"x":597,"y":107},{"x":588,"y":180},{"x":183,"y":549},{"x":93,"y":405},{"x":30,"y":342},{"x":543,"y":369},{"x":795,"y":162},{"x":732,"y":198},{"x":318,"y":495},{"x":597,"y":80},{"x":1542,"y":86},{"x":1274,"y":154},{"x":1400,"y":540},{"x":714,"y":378},{"x":813,"y":153},{"x":201,"y":396},{"x":372,"y":171},{"x":147,"y":288},{"x":444,"y":53},{"x":381,"y":306},{"x":750,"y":405},{"x":282,"y":351},{"x":1084,"y":720},{"x":1316,"y":212},{"x":1500,"y":204},{"x":840,"y":180},{"x":1408,"y":179},{"x":507,"y":279},{"x":147,"y":360},{"x":210,"y":62},{"x":831,"y":684},{"x":336,"y":261},{"x":1249,"y":187},{"x":1450,"y":204},{"x":651,"y":116},{"x":102,"y":153},{"x":300,"y":549},{"x":1433,"y":557},{"x":1307,"y":112},{"x":1265,"y":305},{"x":1534,"y":607},{"x":1484,"y":666},{"x":165,"y":153},{"x":489,"y":125},{"x":1500,"y":145},{"x":138,"y":441},{"x":444,"y":234},{"x":1458,"y":179},{"x":156,"y":459},{"x":1257,"y":112},{"x":534,"y":306},{"x":1685,"y":61},{"x":750,"y":71},{"x":624,"y":243},{"x":831,"y":639},{"x":1417,"y":145},{"x":408,"y":369},{"x":66,"y":315},{"x":660,"y":288},{"x":1467,"y":590},{"x":1148,"y":95},{"x":1492,"y":128},{"x":75,"y":144},{"x":876,"y":243},{"x":822,"y":62},{"x":795,"y":288},{"x":84,"y":324},{"x":831,"y":477},{"x":858,"y":675},{"x":732,"y":125},{"x":165,"y":315},{"x":237,"y":432},{"x":228,"y":513},{"x":120,"y":279},{"x":372,"y":468},{"x":264,"y":234},{"x":894,"y":693},{"x":1021,"y":774},{"x":1568,"y":573},{"x":192,"y":549},{"x":849,"y":53},{"x":1517,"y":473},{"x":958,"y":702},{"x":1316,"y":154},{"x":66,"y":441},{"x":931,"y":80},{"x":588,"y":35},{"x":354,"y":270},{"x":1475,"y":582},{"x":1660,"y":53},{"x":363,"y":639},{"x":931,"y":630},{"x":381,"y":261},{"x":903,"y":765},{"x":282,"y":549},{"x":543,"y":162},{"x":723,"y":44},{"x":525,"y":80},{"x":1475,"y":674},{"x":1576,"y":607},{"x":1215,"y":103},{"x":1274,"y":322},{"x":940,"y":666},{"x":228,"y":107},{"x":777,"y":279},{"x":1618,"y":36},{"x":750,"y":125},{"x":1450,"y":154},{"x":354,"y":378},{"x":1417,"y":187},{"x":336,"y":558},{"x":1626,"y":36},{"x":922,"y":71},{"x":786,"y":333},{"x":1500,"y":792},{"x":480,"y":35},{"x":1400,"y":548},{"x":813,"y":171},{"x":39,"y":306},{"x":156,"y":189},{"x":138,"y":162},{"x":1123,"y":120},{"x":1324,"y":288},{"x":1509,"y":674},{"x":363,"y":387},{"x":111,"y":279},{"x":570,"y":35},{"x":1358,"y":338},{"x":309,"y":414},{"x":1442,"y":523},{"x":1450,"y":708},{"x":1484,"y":599},{"x":615,"y":180},{"x":1391,"y":531},{"x":931,"y":657},{"x":633,"y":207},{"x":1391,"y":431},{"x":525,"y":89},{"x":1458,"y":162},{"x":867,"y":621},{"x":363,"y":396},{"x":1450,"y":691},{"x":66,"y":288},{"x":1316,"y":288},{"x":507,"y":243},{"x":723,"y":387},{"x":219,"y":279},{"x":913,"y":612},{"x":588,"y":26},{"x":1509,"y":137},{"x":1425,"y":573},{"x":1366,"y":338},{"x":1484,"y":632},{"x":732,"y":180},{"x":255,"y":594},{"x":687,"y":333},{"x":219,"y":432},{"x":1400,"y":464},{"x":291,"y":513},{"x":516,"y":288},{"x":354,"y":324},{"x":1291,"y":305},{"x":1475,"y":716},{"x":255,"y":657},{"x":1316,"y":263},{"x":624,"y":306},{"x":615,"y":71},{"x":1534,"y":548},{"x":885,"y":234},{"x":1223,"y":204},{"x":1274,"y":120},{"x":156,"y":351},{"x":795,"y":306},{"x":156,"y":486},{"x":633,"y":180},{"x":759,"y":288},{"x":714,"y":225},{"x":894,"y":585},{"x":741,"y":387},{"x":1534,"y":557},{"x":516,"y":207},{"x":183,"y":342},{"x":1584,"y":557},{"x":1165,"y":95},{"x":264,"y":315},{"x":309,"y":432},{"x":192,"y":459},{"x":1148,"y":112},{"x":336,"y":162},{"x":1240,"y":162},{"x":615,"y":144},{"x":1635,"y":19},{"x":1349,"y":204},{"x":345,"y":252},{"x":120,"y":324},{"x":264,"y":567},{"x":1500,"y":447},{"x":651,"y":62},{"x":1265,"y":137},{"x":786,"y":459},{"x":1181,"y":263},{"x":120,"y":198},{"x":516,"y":44},{"x":1316,"y":221},{"x":786,"y":80},{"x":588,"y":243},{"x":201,"y":504},{"x":1400,"y":86},{"x":498,"y":144},{"x":1299,"y":280},{"x":1030,"y":765},{"x":1257,"y":187},{"x":1383,"y":78},{"x":534,"y":107},{"x":714,"y":315},{"x":750,"y":180},{"x":417,"y":125},{"x":1425,"y":212},{"x":291,"y":405},{"x":210,"y":351},{"x":228,"y":405},{"x":246,"y":486},{"x":1299,"y":238},{"x":1492,"y":481},{"x":804,"y":171},{"x":390,"y":135},{"x":1307,"y":280},{"x":876,"y":53},{"x":822,"y":603},{"x":1113,"y":120},{"x":633,"y":261},{"x":651,"y":89},{"x":1450,"y":565},{"x":606,"y":333},{"x":1517,"y":565},{"x":940,"y":630},{"x":1484,"y":523},{"x":345,"y":414},{"x":588,"y":116},{"x":705,"y":135},{"x":1257,"y":204},{"x":156,"y":306},{"x":300,"y":98},{"x":750,"y":252},{"x":922,"y":675},{"x":633,"y":297},{"x":120,"y":333},{"x":318,"y":315},{"x":507,"y":35},{"x":949,"y":621},{"x":48,"y":324},{"x":102,"y":315},{"x":777,"y":125},{"x":480,"y":306},{"x":1282,"y":246},{"x":1433,"y":590},{"x":768,"y":180},{"x":660,"y":351},{"x":210,"y":333},{"x":309,"y":270},{"x":1559,"y":557},{"x":210,"y":549},{"x":1417,"y":531},{"x":1484,"y":766},{"x":489,"y":234},{"x":246,"y":125},{"x":570,"y":252},{"x":12,"y":378},{"x":822,"y":387},{"x":48,"y":360},{"x":1299,"y":254},{"x":282,"y":171},{"x":579,"y":315},{"x":759,"y":333},{"x":804,"y":540},{"x":399,"y":80},{"x":687,"y":125},{"x":165,"y":378},{"x":1358,"y":95},{"x":66,"y":270},{"x":417,"y":234},{"x":1408,"y":187},{"x":1358,"y":78},{"x":1542,"y":624},{"x":1425,"y":565},{"x":363,"y":89},{"x":408,"y":198},{"x":1181,"y":95},{"x":1551,"y":78},{"x":1668,"y":78},{"x":777,"y":153},{"x":228,"y":639},{"x":1685,"y":19},{"x":309,"y":396},{"x":696,"y":306},{"x":75,"y":423},{"x":597,"y":279},{"x":327,"y":477},{"x":732,"y":324},{"x":1500,"y":137},{"x":1400,"y":238},{"x":417,"y":107},{"x":732,"y":243},{"x":768,"y":98},{"x":813,"y":71},{"x":1458,"y":481},{"x":705,"y":80},{"x":165,"y":423},{"x":1433,"y":624},{"x":1198,"y":70},{"x":795,"y":693},{"x":831,"y":89},{"x":291,"y":477},{"x":1383,"y":296},{"x":336,"y":342},{"x":786,"y":62},{"x":543,"y":396},{"x":264,"y":333},{"x":597,"y":162},{"x":147,"y":279},{"x":507,"y":171},{"x":687,"y":306},{"x":1139,"y":95},{"x":1341,"y":95},{"x":1576,"y":523},{"x":381,"y":432},{"x":1685,"y":28},{"x":669,"y":62},{"x":237,"y":405},{"x":606,"y":80},{"x":66,"y":378},{"x":12,"y":342},{"x":1341,"y":221},{"x":381,"y":153},{"x":1467,"y":187},{"x":120,"y":207},{"x":894,"y":612},{"x":1626,"y":78},{"x":687,"y":432},{"x":723,"y":504},{"x":1458,"y":447},{"x":1207,"y":103},{"x":741,"y":288},{"x":201,"y":234},{"x":192,"y":198},{"x":1492,"y":162},{"x":1299,"y":137},{"x":1542,"y":531},{"x":1484,"y":708},{"x":714,"y":405},{"x":246,"y":80},{"x":913,"y":594},{"x":786,"y":189},{"x":1341,"y":86},{"x":300,"y":153},{"x":246,"y":513},{"x":1442,"y":179},{"x":318,"y":405},{"x":579,"y":225},{"x":1274,"y":263},{"x":588,"y":44},{"x":1694,"y":28},{"x":507,"y":315},{"x":570,"y":225},{"x":426,"y":198},{"x":1509,"y":36},{"x":147,"y":333},{"x":1660,"y":28},{"x":1534,"y":666},{"x":1274,"y":330},{"x":1475,"y":683},{"x":525,"y":252},{"x":1450,"y":615},{"x":606,"y":279},{"x":507,"y":333},{"x":435,"y":80},{"x":732,"y":396},{"x":1299,"y":221},{"x":300,"y":486},{"x":714,"y":71},{"x":246,"y":62},{"x":354,"y":477},{"x":786,"y":180},{"x":291,"y":288},{"x":795,"y":153},{"x":444,"y":297},{"x":345,"y":80},{"x":768,"y":639},{"x":327,"y":207},{"x":1450,"y":641},{"x":318,"y":135},{"x":516,"y":351},{"x":39,"y":441},{"x":931,"y":720},{"x":849,"y":477},{"x":426,"y":153},{"x":264,"y":162},{"x":318,"y":261},{"x":183,"y":459},{"x":1618,"y":11},{"x":985,"y":549},{"x":318,"y":279},{"x":922,"y":522},{"x":255,"y":540},{"x":309,"y":459},{"x":228,"y":297},{"x":840,"y":171},{"x":318,"y":171},{"x":57,"y":387},{"x":1467,"y":137},{"x":372,"y":450},{"x":21,"y":315},{"x":561,"y":125},{"x":282,"y":468},{"x":426,"y":62},{"x":534,"y":189},{"x":1291,"y":86},{"x":1349,"y":288},{"x":795,"y":216},{"x":1324,"y":103},{"x":633,"y":125},{"x":408,"y":135},{"x":192,"y":531},{"x":642,"y":107},{"x":489,"y":225},{"x":84,"y":225},{"x":435,"y":270},{"x":300,"y":414},{"x":1215,"y":120},{"x":1761,"y":19},{"x":561,"y":387},{"x":1375,"y":137},{"x":1610,"y":36},{"x":1492,"y":666},{"x":210,"y":135},{"x":1635,"y":86},{"x":228,"y":522},{"x":426,"y":171},{"x":426,"y":288},{"x":1333,"y":271},{"x":1500,"y":53},{"x":885,"y":702},{"x":543,"y":98},{"x":885,"y":576},{"x":174,"y":342},{"x":1450,"y":557},{"x":840,"y":648},{"x":777,"y":80},{"x":192,"y":333},{"x":1274,"y":372},{"x":174,"y":585},{"x":1408,"y":154},{"x":777,"y":504},{"x":426,"y":279},{"x":696,"y":387},{"x":129,"y":369},{"x":714,"y":234},{"x":759,"y":107},{"x":1366,"y":154},{"x":201,"y":324},{"x":264,"y":153},{"x":480,"y":216},{"x":525,"y":261},{"x":534,"y":125},{"x":922,"y":89},{"x":777,"y":630},{"x":138,"y":360},{"x":12,"y":396},{"x":336,"y":504},{"x":57,"y":297},{"x":561,"y":351},{"x":12,"y":333},{"x":561,"y":35},{"x":1517,"y":498},{"x":795,"y":639},{"x":651,"y":98},{"x":318,"y":189},{"x":1542,"y":95},{"x":489,"y":144},{"x":246,"y":315},{"x":1492,"y":800},{"x":642,"y":44},{"x":1500,"y":699},{"x":1223,"y":313},{"x":1324,"y":187},{"x":795,"y":107},{"x":705,"y":342},{"x":327,"y":522},{"x":1517,"y":86},{"x":444,"y":180},{"x":1181,"y":246},{"x":1232,"y":162},{"x":1509,"y":506},{"x":714,"y":297},{"x":660,"y":306},{"x":372,"y":252},{"x":1408,"y":212},{"x":1207,"y":254},{"x":1291,"y":170},{"x":1366,"y":498},{"x":876,"y":89},{"x":480,"y":234},{"x":714,"y":360},{"x":876,"y":576},{"x":1652,"y":86},{"x":1257,"y":296},{"x":913,"y":621},{"x":120,"y":441},{"x":228,"y":243},{"x":1484,"y":431},{"x":552,"y":135},{"x":1433,"y":405},{"x":1467,"y":624},{"x":273,"y":495},{"x":300,"y":116},{"x":1542,"y":498},{"x":129,"y":153},{"x":1500,"y":624},{"x":84,"y":405},{"x":255,"y":585},{"x":354,"y":62},{"x":291,"y":144},{"x":867,"y":89},{"x":705,"y":252},{"x":660,"y":243},{"x":75,"y":243},{"x":363,"y":216},{"x":282,"y":576},{"x":318,"y":351},{"x":498,"y":171},{"x":273,"y":135},{"x":732,"y":153},{"x":228,"y":549},{"x":669,"y":279},{"x":813,"y":666},{"x":219,"y":477},{"x":696,"y":216},{"x":174,"y":405},{"x":291,"y":116},{"x":786,"y":135},{"x":840,"y":585},{"x":309,"y":234},{"x":264,"y":360},{"x":1391,"y":179},{"x":552,"y":125},{"x":1526,"y":456},{"x":300,"y":107},{"x":1442,"y":86},{"x":372,"y":603},{"x":885,"y":80},{"x":489,"y":216},{"x":273,"y":342},{"x":183,"y":486},{"x":255,"y":405},{"x":1249,"y":170},{"x":30,"y":315},{"x":282,"y":459},{"x":1400,"y":179},{"x":615,"y":171},{"x":111,"y":216},{"x":111,"y":252},{"x":201,"y":405},{"x":795,"y":171},{"x":1534,"y":154},{"x":1736,"y":36},{"x":1551,"y":489},{"x":183,"y":153},{"x":1341,"y":263},{"x":255,"y":522},{"x":210,"y":450},{"x":741,"y":315},{"x":867,"y":477},{"x":1400,"y":414},{"x":642,"y":243},{"x":633,"y":306},{"x":309,"y":522},{"x":1509,"y":607},{"x":1333,"y":137},{"x":894,"y":702},{"x":1534,"y":531},{"x":1736,"y":28},{"x":678,"y":360},{"x":336,"y":306},{"x":1492,"y":489},{"x":201,"y":648},{"x":867,"y":702},{"x":1601,"y":506},{"x":759,"y":225},{"x":723,"y":162},{"x":75,"y":324},{"x":381,"y":396},{"x":786,"y":207},{"x":399,"y":333},{"x":507,"y":53},{"x":606,"y":252},{"x":255,"y":666},{"x":498,"y":44},{"x":471,"y":270},{"x":93,"y":135},{"x":1475,"y":120},{"x":435,"y":315},{"x":1316,"y":238},{"x":1467,"y":489},{"x":1475,"y":733},{"x":913,"y":71},{"x":309,"y":288},{"x":201,"y":540},{"x":1088,"y":137},{"x":66,"y":207},{"x":1484,"y":607},{"x":435,"y":207},{"x":300,"y":62},{"x":1542,"y":61},{"x":759,"y":306},{"x":931,"y":693},{"x":885,"y":98},{"x":678,"y":189},{"x":1249,"y":70},{"x":165,"y":387},{"x":237,"y":621},{"x":1433,"y":78},{"x":732,"y":162},{"x":903,"y":630},{"x":750,"y":351},{"x":1139,"y":103},{"x":967,"y":675},{"x":1551,"y":624},{"x":1467,"y":750},{"x":940,"y":612},{"x":192,"y":62},{"x":795,"y":459},{"x":696,"y":116},{"x":273,"y":369},{"x":597,"y":207},{"x":237,"y":98},{"x":390,"y":53},{"x":1324,"y":238},{"x":579,"y":288},{"x":309,"y":180},{"x":1425,"y":531},{"x":237,"y":144},{"x":318,"y":486},{"x":759,"y":62},{"x":894,"y":107},{"x":1375,"y":422},{"x":462,"y":171},{"x":849,"y":261},{"x":84,"y":243},{"x":696,"y":189},{"x":453,"y":35},{"x":976,"y":693},{"x":1584,"y":582},{"x":696,"y":153},{"x":201,"y":666},{"x":1408,"y":515},{"x":273,"y":351},{"x":1391,"y":137},{"x":1601,"y":540},{"x":714,"y":125},{"x":615,"y":189},{"x":444,"y":225},{"x":210,"y":44},{"x":1341,"y":120},{"x":201,"y":144},{"x":741,"y":125},{"x":804,"y":342},{"x":273,"y":423},{"x":273,"y":558},{"x":1425,"y":515},{"x":48,"y":288},{"x":255,"y":513},{"x":1097,"y":128},{"x":156,"y":324},{"x":687,"y":459},{"x":714,"y":396},{"x":651,"y":234},{"x":822,"y":666},{"x":363,"y":53},{"x":714,"y":243},{"x":1458,"y":758},{"x":237,"y":441},{"x":1324,"y":78},{"x":1333,"y":120},{"x":552,"y":342},{"x":949,"y":594},{"x":813,"y":684},{"x":426,"y":44},{"x":291,"y":198},{"x":138,"y":297},{"x":1240,"y":254},{"x":705,"y":162},{"x":1458,"y":53},{"x":831,"y":504},{"x":606,"y":26},{"x":183,"y":279},{"x":417,"y":198},{"x":399,"y":198},{"x":1417,"y":204},{"x":1232,"y":103},{"x":1333,"y":397},{"x":300,"y":630},{"x":1131,"y":112},{"x":1475,"y":590},{"x":1417,"y":229},{"x":1003,"y":504},{"x":174,"y":162},{"x":913,"y":693},{"x":453,"y":315},{"x":777,"y":162},{"x":624,"y":225},{"x":1433,"y":582},{"x":1307,"y":204},{"x":1291,"y":204},{"x":1517,"y":137},{"x":642,"y":116},{"x":525,"y":98},{"x":570,"y":53},{"x":1433,"y":456},{"x":1366,"y":120},{"x":831,"y":198},{"x":1517,"y":599},{"x":1391,"y":456},{"x":669,"y":162},{"x":831,"y":62},{"x":282,"y":378},{"x":525,"y":144},{"x":273,"y":180},{"x":390,"y":80},{"x":1517,"y":548},{"x":913,"y":711},{"x":300,"y":594},{"x":363,"y":432},{"x":1282,"y":313},{"x":192,"y":378},{"x":1316,"y":246},{"x":1442,"y":456},{"x":958,"y":693},{"x":309,"y":116},{"x":579,"y":135},{"x":732,"y":89},{"x":408,"y":153},{"x":1492,"y":456},{"x":471,"y":306},{"x":570,"y":324},{"x":1685,"y":44},{"x":1593,"y":557},{"x":300,"y":71},{"x":705,"y":387},{"x":246,"y":612},{"x":354,"y":486},{"x":1324,"y":128},{"x":255,"y":576},{"x":480,"y":107},{"x":1391,"y":95},{"x":228,"y":450},{"x":327,"y":107},{"x":1509,"y":531},{"x":471,"y":180},{"x":372,"y":135},{"x":174,"y":107},{"x":165,"y":450},{"x":1240,"y":280},{"x":687,"y":315},{"x":867,"y":666},{"x":201,"y":387},{"x":777,"y":324},{"x":39,"y":351},{"x":399,"y":252},{"x":1075,"y":630},{"x":1458,"y":607},{"x":552,"y":324},{"x":255,"y":369},{"x":192,"y":144},{"x":678,"y":125},{"x":444,"y":71},{"x":822,"y":630},{"x":507,"y":26},{"x":588,"y":162},{"x":426,"y":342},{"x":1257,"y":86},{"x":615,"y":135},{"x":1433,"y":86},{"x":1358,"y":145},{"x":1156,"y":70},{"x":309,"y":405},{"x":273,"y":53},{"x":228,"y":657},{"x":687,"y":423},{"x":786,"y":297},{"x":1736,"y":86},{"x":579,"y":324},{"x":246,"y":495},{"x":931,"y":71},{"x":777,"y":693},{"x":1408,"y":540},{"x":1400,"y":405},{"x":165,"y":369},{"x":579,"y":153},{"x":931,"y":540},{"x":1400,"y":431},{"x":741,"y":405},{"x":1492,"y":615},{"x":804,"y":98},{"x":219,"y":180},{"x":1349,"y":229},{"x":264,"y":495},{"x":1475,"y":498},{"x":1509,"y":691},{"x":1417,"y":95},{"x":372,"y":324},{"x":381,"y":639},{"x":327,"y":135},{"x":1484,"y":515},{"x":165,"y":351},{"x":1610,"y":95},{"x":822,"y":684},{"x":381,"y":288},{"x":264,"y":297},{"x":1383,"y":196},{"x":84,"y":414},{"x":201,"y":612},{"x":552,"y":333},{"x":579,"y":270},{"x":1383,"y":431},{"x":1417,"y":515},{"x":273,"y":360},{"x":1517,"y":657},{"x":606,"y":225},{"x":651,"y":297},{"x":156,"y":270},{"x":372,"y":378},{"x":1484,"y":716},{"x":1291,"y":238},{"x":435,"y":198},{"x":1450,"y":750},{"x":318,"y":450},{"x":561,"y":432},{"x":516,"y":171},{"x":471,"y":53},{"x":498,"y":234},{"x":759,"y":153},{"x":1475,"y":481},{"x":669,"y":98},{"x":1500,"y":540},{"x":1492,"y":154},{"x":1744,"y":3},{"x":759,"y":495},{"x":300,"y":459},{"x":435,"y":342},{"x":300,"y":89},{"x":1232,"y":330},{"x":84,"y":351},{"x":849,"y":162},{"x":894,"y":504},{"x":327,"y":558},{"x":489,"y":279},{"x":1458,"y":145},{"x":282,"y":288},{"x":102,"y":405},{"x":426,"y":80},{"x":300,"y":162},{"x":1618,"y":523},{"x":1075,"y":738},{"x":1475,"y":699},{"x":525,"y":324},{"x":66,"y":396},{"x":417,"y":171},{"x":1584,"y":531},{"x":1450,"y":70},{"x":1232,"y":212},{"x":1240,"y":347},{"x":1433,"y":540},{"x":1509,"y":196},{"x":1198,"y":86},{"x":732,"y":71},{"x":1484,"y":531},{"x":714,"y":270},{"x":372,"y":153},{"x":507,"y":297},{"x":1677,"y":19},{"x":246,"y":531},{"x":1467,"y":699},{"x":354,"y":441},{"x":363,"y":468},{"x":156,"y":396},{"x":1450,"y":548},{"x":354,"y":450},{"x":759,"y":315},{"x":1375,"y":271},{"x":93,"y":216},{"x":417,"y":80},{"x":1425,"y":422},{"x":705,"y":180},{"x":1425,"y":456},{"x":381,"y":387},{"x":390,"y":144},{"x":534,"y":369},{"x":228,"y":80},{"x":1156,"y":112},{"x":237,"y":378},{"x":1375,"y":44},{"x":1383,"y":229},{"x":822,"y":495},{"x":300,"y":513},{"x":426,"y":89},{"x":273,"y":531},{"x":255,"y":216},{"x":228,"y":279},{"x":363,"y":234},{"x":804,"y":71},{"x":1198,"y":254},{"x":1391,"y":78},{"x":759,"y":162},{"x":93,"y":234},{"x":1652,"y":44},{"x":1375,"y":145},{"x":1400,"y":137},{"x":1433,"y":615},{"x":516,"y":17},{"x":228,"y":666},{"x":1534,"y":78},{"x":1215,"y":296},{"x":858,"y":89},{"x":1475,"y":95},{"x":246,"y":116},{"x":309,"y":98},{"x":940,"y":89},{"x":885,"y":711},{"x":525,"y":71},{"x":399,"y":585},{"x":309,"y":558},{"x":1551,"y":187},{"x":192,"y":351},{"x":786,"y":684},{"x":174,"y":171},{"x":435,"y":351},{"x":1534,"y":674},{"x":1417,"y":355},{"x":570,"y":153},{"x":84,"y":207},{"x":894,"y":495},{"x":75,"y":216},{"x":1551,"y":61},{"x":354,"y":98},{"x":624,"y":162},{"x":660,"y":333},{"x":84,"y":369},{"x":1240,"y":179},{"x":1568,"y":515},{"x":1442,"y":221},{"x":570,"y":207},{"x":867,"y":684},{"x":606,"y":342},{"x":1626,"y":11},{"x":327,"y":279},{"x":453,"y":116},{"x":1694,"y":70},{"x":543,"y":153},{"x":1232,"y":137},{"x":1400,"y":531},{"x":1366,"y":263},{"x":867,"y":594},{"x":21,"y":414},{"x":940,"y":720},{"x":759,"y":297},{"x":1492,"y":179},{"x":1417,"y":557},{"x":669,"y":342},{"x":156,"y":162},{"x":273,"y":594},{"x":651,"y":180},{"x":102,"y":135},{"x":1643,"y":95},{"x":1526,"y":641},{"x":66,"y":279},{"x":255,"y":80},{"x":363,"y":153},{"x":633,"y":252},{"x":561,"y":198},{"x":1551,"y":540},{"x":462,"y":89},{"x":687,"y":207},{"x":489,"y":35},{"x":1442,"y":666},{"x":291,"y":648},{"x":1257,"y":238},{"x":498,"y":53},{"x":147,"y":387},{"x":165,"y":98},{"x":1333,"y":246},{"x":840,"y":107},{"x":1391,"y":263},{"x":1568,"y":506},{"x":201,"y":306},{"x":714,"y":333},{"x":228,"y":621},{"x":120,"y":405},{"x":237,"y":44},{"x":1450,"y":439}],"countries":{"pakistan":{"x":525,"y":279,"name":"WalletPAK","country":"Pakistan"},"india":{"x":561,"y":378,"name":"Asan Wallet","country":"India"},"srilanka":{"x":579,"y":441,"name":"Sinha Wallet","country":"Sri Lanka"},"nepal":{"x":606,"y":306,"name":"NewaLETA","country":"Nepal"},"bangladesh":{"x":633,"y":342,"name":"WalleTAKA","country":"Bangladesh"},"thailand":{"x":696,"y":396,"name":"WalleTHAI","country":"Thailand"},"malaysia":{"x":696,"y":441,"name":"Sehati Wallet","country":"Malaysia"},"singapore":{"x":714,"y":468,"name":"Xin Wallet","country":"Singapore"},"indonesia":{"x":750,"y":531,"name":"INDompet Wallet","country":"Indonesia"},"vietnam":{"x":723,"y":369,"name":"Vina Wallet","country":"Vietnam"},"china":{"x":750,"y":234,"name":"TNG \u94b1\u5305","country":"China"},"hongkong":{"x":768,"y":342,"name":"TNG Wallet","country":"Hong Kong"},"philippines":{"x":813,"y":387,"name":"PhiliPurse","country":"Philippines"}}}
  setupScene();
}

function showFallback() {

  /*
    This function will display an alert if WebGL is not supported.
  */

  alert('WebGL not supported. Please use a browser that supports WebGL.');

}

function setupScene() {

  canvas = container.getElementsByClassName('js-canvas')[0];

  scene = new THREE.Scene();
  window.scene = scene;
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    shadowMapEnabled: false
  });
  window.renderer = renderer;
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);

  // Main group that contains everything
  groups.main = new THREE.Group();
  groups.main.name = 'Main';

  // Group that contains lines for each country
  groups.lines = new THREE.Group();
  groups.lines.name = 'Lines';
  groups.main.add(groups.lines);

  // Group that contains dynamically created dots
  groups.lineDots = new THREE.Group();
  groups.lineDots.name = 'Dots';
  groups.main.add(groups.lineDots);

  // Add the main group to the scene
  scene.add(groups.main);

  // Render camera and add orbital controls
  addCamera();
  addControls();

  // Render objects
  addGlobe();

  if (Object.keys(data.countries).length > 0) {
    addLines();
    createListElements();
  }

  // Start the requestAnimationFrame loop
  render();
  animate();

  var canvasResizeBehaviour = function() {

    container.width = window.innerWidth;
    container.height = window.innerHeight;
    container.style.width = window.innerWidth + 'px';
    container.style.height = window.innerHeight + 'px';

    camera.object.aspect = container.offsetWidth / container.offsetHeight;
    camera.object.updateProjectionMatrix();
    renderer.setSize(container.offsetWidth, container.offsetHeight);

  };

  window.addEventListener('resize', canvasResizeBehaviour);
  window.addEventListener('orientationchange', function() {
    setTimeout(canvasResizeBehaviour, 0);
  });
  canvasResizeBehaviour();

}



/* CAMERA AND CONTROLS */

function addCamera() {

  camera.object = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 1, 10000);
  camera.object.position.z = props.globeRadius * 2.2;

}

function addControls() {

  camera.controls = new OrbitControls(camera.object, canvas);
  camera.controls.enableKeys = false;
  camera.controls.enablePan = true;
  camera.controls.enableZoom = false;
  camera.controls.enableDamping = false;
  camera.controls.enableRotate = false;

  // Set the initial camera angles to something crazy for the introduction animation
  camera.angles.current.azimuthal = -Math.PI;
  camera.angles.current.polar = 0;

}



/* RENDERING */

function render() {
  renderer.render(scene, camera.object);
}

if ('hidden' in document) {
  document.addEventListener('visibilitychange', onFocusChange);
}
else if ('mozHidden' in document) {
  document.addEventListener('mozvisibilitychange', onFocusChange);
}
else if ('webkitHidden' in document) {
  document.addEventListener('webkitvisibilitychange', onFocusChange);
}
else if ('msHidden' in document) {
  document.addEventListener('msvisibilitychange', onFocusChange);
}
else if ('onfocusin' in document) {
  document.onfocusin = document.onfocusout = onFocusChange;
}
else {
  window.onpageshow = window.onpagehide = window.onfocus = window.onblur = onFocusChange;
}

function onFocusChange(event) {

  var visible = 'visible';
  var hidden = 'hidden';
  var eventMap = {
    focus: visible,
    focusin: visible,
    pageshow: visible,
    blur: hidden,
    focusout: hidden,
    pagehide: hidden
  };

  event = event || window.event;

  if (event.type in eventMap) {
    isHidden = true;
  }
  else {
    isHidden = false;
  }

}

function animate() {

  if (isHidden === false) {
    requestAnimationFrame(animate);
  }

  if (groups.globeDots) {
    introAnimate();
  }

  if (animations.finishedIntro === true) {
    animateDots();
  }

  if (animations.countries.animating === true) {
    animateCountryCycle();
  }

  positionElements();

  camera.controls.update();

  render();

}



/* GLOBE */

function addGlobe() {

  var textureLoader = new THREE.TextureLoader();
  textureLoader.setCrossOrigin(true);

  var radius = props.globeRadius - (props.globeRadius * 0.02);
  var segments = 64;
  var rings = 64;

  // Make gradient
  var canvasSize = 128;
  var textureCanvas = document.createElement('canvas');
  textureCanvas.width = canvasSize;
  textureCanvas.height = canvasSize;
  // var canvasContext = textureCanvas.getContext('2d');
  // canvasContext.rect(0, 0, canvasSize, canvasSize);
  // var canvasGradient = canvasContext.createLinearGradient(0, 0, 0, canvasSize);
  // canvasGradient.addColorStop(0, '#5B0BA0');
  // canvasGradient.addColorStop(0.5, '#260F76');
  // canvasGradient.addColorStop(1, '#130D56');
  // canvasContext.fillStyle = canvasGradient;
  // canvasContext.fill();

  // Make texture
  var texture = new THREE.Texture(textureCanvas);
  texture.needsUpdate = true;

  var geometry = new THREE.SphereGeometry(radius, segments, rings);
  var material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0
  });
  globe = new THREE.Mesh(geometry, material);

  groups.globe = new THREE.Group();
  groups.globe.name = 'Globe';

  groups.globe.add(globe);
  groups.main.add(groups.globe);

  addGlobeDots();

}

function addGlobeDots() {

  var geometry = new THREE.Geometry();

  // Make circle
  var canvasSize = 6;
  var halfSize = canvasSize / 2;
  var textureCanvas = document.createElement('canvas');
  textureCanvas.width = canvasSize;
  textureCanvas.height = canvasSize;
  var canvasContext = textureCanvas.getContext('2d');
  canvasContext.beginPath();
  canvasContext.arc(halfSize, halfSize, halfSize, 0, 2 * Math.PI);
  canvasContext.fillStyle = props.colours.globeDots;
  canvasContext.fill();

  // Make texture
  var texture = new THREE.Texture(textureCanvas);
  texture.needsUpdate = true;

  var material = new THREE.PointsMaterial({
    map: texture,
    size: props.globeRadius / 120
  });

  var addDot = function(targetX, targetY) {

    // Add a point with zero coordinates
    var point = new THREE.Vector3(0, 0, 0);
    geometry.vertices.push(point);

    // Add the coordinates to a new array for the intro animation
    var result = returnSphericalCoordinates(
      targetX,
      targetY
    );
    animations.dots.points.push(new THREE.Vector3(result.x, result.y, result.z));

  };

  for (var i = 0; i < data.points.length; i++) {
    addDot(data.points[i].x, data.points[i].y);
  }

  for (var country in data.countries) {
    addDot(data.countries[country].x, data.countries[country].y);
  }

  // Add the points to the scene
  groups.globeDots = new THREE.Points(geometry, material);
  groups.globe.add(groups.globeDots);

}



/* COUNTRY LINES AND DOTS */

function addLines() {

  // Create the geometry
  var geometry = new THREE.Geometry();

  for (var countryStart in data.countries) {

    var group = new THREE.Group();
    group.name = countryStart;

    for (var countryEnd in data.countries) {

      // Skip if the country is the same
      if (countryStart === countryEnd) {
        continue;
      }

      // Get the spatial coordinates
      var result = returnCurveCoordinates(
        data.countries[countryStart].x,
        data.countries[countryStart].y,
        data.countries[countryEnd].x,
        data.countries[countryEnd].y
      );

      // Calcualte the curve in order to get points from
      var curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(result.start.x, result.start.y, result.start.z),
        new THREE.Vector3(result.mid.x, result.mid.y, result.mid.z),
        new THREE.Vector3(result.end.x, result.end.y, result.end.z)
      );

      // Get verticies from curve
      geometry.vertices = curve.getPoints(200);

      // Create mesh line using plugin and set its geometry
      var line = new MeshLine();
      line.setGeometry(geometry);

      // Create the mesh line material using the plugin
      var material = new MeshLineMaterial({
        color: props.colours.lines,
        transparent: true,
        opacity: props.alphas.lines,
        lineWidth: props.widths.lines,
        sizeAttenuation: true
      });

      // Create the final object to add to the scene
      var curveObject = new THREE.Mesh(line.geometry, material);
      curveObject._path = geometry.vertices;

      group.add(curveObject);

    }

    group.visible = false;

    groups.lines.add(group);

  }

}

function addLineDots() {

  /*
    This function will create a number of dots (props.dotsAmount) which will then later be
    animated along the lines. The dots are set to not be visible as they are later
    assigned a position after the introduction animation.
  */

  var radius = props.globeRadius / 180;
  var segments = 32;
  var rings = 32;
  var geometry = new THREE.SphereGeometry(radius, segments, rings);
  var material = new THREE.MeshBasicMaterial({
    color: props.colours.lineDots
  })

  // var map = new THREE.TextureLoader().load('/assets/img/kre.svg');
  // var material = new THREE.SpriteMaterial({
  //   map: map,
  //   color: 0xffffff,
  //   fog: false
  // });

  // Returns a sphere geometry positioned at coordinates
  var returnLineDot = function() {
    // var sprite = new THREE.Sprite(material);
    // sprite.scale.set(2, 2, 1)
    // return sprite;
    var sphere = new THREE.Mesh(geometry, material);
    return sphere;
  };

  for (var i = 0; i < props.dotsAmount; i++) {

    // Get the country path geometry vertices and create the dot at the first vertex
    var targetDot = returnLineDot();
    targetDot.visible = false;

    // Add custom variables for custom path coordinates and index
    targetDot._pathIndex = null;
    targetDot._path = null;

    // Add the dot to the dots group
    groups.lineDots.add(targetDot);

  }

}

function assignDotsToRandomLine(target) {

  // Get a random line from the current country
  var randomLine = Math.random() * (animations.countries.selected.children.length - 1);
  randomLine = animations.countries.selected.children[randomLine.toFixed(0)];

  // Assign the random country path to the dot and set the index at 0
  target._path = randomLine._path;

}

function reassignDotsToNewLines() {

  for (var i = 0; i < groups.lineDots.children.length; i++) {

    var target = groups.lineDots.children[i];
    if (target._path !== null && target._pathIndex !== null) {
      assignDotsToRandomLine(target);
    }

  }

}

function animateDots() {

  // Loop through the dots children group
  for (var i = 0; i < groups.lineDots.children.length; i++) {

    var dot = groups.lineDots.children[i];

    if (dot._path === null) {

      // Create a random seed as a pseudo-delay
      var seed = Math.random();

      if (seed > 0.99) {
        assignDotsToRandomLine(dot);
        dot._pathIndex = 0;
      }

    }
    else if (dot._path !== null && dot._pathIndex < dot._path.length - 1) {

      // Show the dot
      if (dot.visible === false) {
        dot.visible = true;
      }

      // Move the dot along the path vertice coordinates
      dot.position.x = dot._path[dot._pathIndex].x;
      dot.position.y = dot._path[dot._pathIndex].y;
      dot.position.z = dot._path[dot._pathIndex].z;

      // Advance the path index by 1
      dot._pathIndex++;

    }
    else {

      // Hide the dot
      dot.visible = false;

      // Remove the path assingment
      dot._path = null;

    }

  }

}



/* ELEMENTS */

var list;

function createListElements() {

  list = document.getElementsByClassName('js-list')[0];

  var pushObject = function(coordinates, target) {

    // Create the element
    var element = document.createElement('li');

    var innerContent;
    var targetCountry = data.countries[target];

    // element.innerHTML = '<span class="text">' + targetCountry.country + '</span>';

    var object = {
      position: coordinates,
      element: element
    };

    // Add the element to the DOM and add the object to the array
    list.appendChild(element);
    elements[target] = object;

  };

  // Loop through each country line
  var i = 0;

  for (var country in data.countries) {

    var group = groups.lines.getObjectByName(country);
    var coordinates = group.children[0]._path[0];
    pushObject(coordinates, country);

    if (country === props.startingCountry) {

      // Set the country cycle index and selected line object for the starting country
      animations.countries.index = i;
      animations.countries.selected = groups.lines.getObjectByName(country);

      // Set the line opacity to 0 so they can be faded-in during the introduction animation
      var lineGroup = animations.countries.selected;
      lineGroup.visible = true;
      for (var ii = 0; ii < lineGroup.children.length; ii++) {
        lineGroup.children[ii].material.uniforms.opacity.value = 0;
      }

      // Set the target camera angles for the starting country for the introduction animation
      var angles = returnCameraAngles(data.countries[country].x, data.countries[country].y);
      camera.angles.target.azimuthal = angles.azimuthal;
      camera.angles.target.polar = angles.polar;

    }
    else {
      i++;
    }

  }

}

function positionElements() {

  var widthHalf = canvas.clientWidth / 2;
  var heightHalf = canvas.clientHeight / 2;

  // Loop through the elements array and reposition the elements
  for (var key in elements) {

    var targetElement = elements[key];

    var position = getProjectedPosition(widthHalf, heightHalf, targetElement.position);

    // Construct the X and Y position strings
    var positionX = position.x + 'px';
    var positionY = position.y + 'px';

    // Construct the 3D translate string
    var elementStyle = targetElement.element.style;
    elementStyle.webkitTransform = 'translate3D(' + positionX + ', ' + positionY + ', 0)';
    elementStyle.WebkitTransform = 'translate3D(' + positionX + ', ' + positionY + ', 0)'; // Just Safari things (capitalised property name prefix)...
    elementStyle.mozTransform = 'translate3D(' + positionX + ', ' + positionY + ', 0)';
    elementStyle.msTransform = 'translate3D(' + positionX + ', ' + positionY + ', 0)';
    elementStyle.oTransform = 'translate3D(' + positionX + ', ' + positionY + ', 0)';
    elementStyle.transform = 'translate3D(' + positionX + ', ' + positionY + ', 0)';

  }

}



/* INTRO ANIMATIONS */

// Easing reference: https://gist.github.com/gre/1650294

var easeInOutCubic = function(t) {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
};

var easeOutCubic = function(t) {
  return (--t) * t * t + 1;
};

var easeInOutQuad = function(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

function introAnimate() {

  if (animations.dots.current <= animations.dots.total) {

    var points = groups.globeDots.geometry.vertices;
    var totalLength = points.length;

    for (var i = 0; i < totalLength; i++) {

      // Get ease value
      var dotProgress = easeInOutCubic(animations.dots.current / animations.dots.total);

      // Add delay based on loop iteration
      dotProgress = dotProgress + (dotProgress * (i / totalLength));

      if (dotProgress > 1) {
        dotProgress = 1;
      }

      // Move the point
      points[i].x = animations.dots.points[i].x * dotProgress;
      points[i].y = animations.dots.points[i].y * dotProgress;
      points[i].z = animations.dots.points[i].z * dotProgress;

      // Animate the camera at the same rate as the first dot
      if (i === 0) {

        var azimuthalDifference = (camera.angles.current.azimuthal - camera.angles.target.azimuthal) * dotProgress;
        azimuthalDifference = camera.angles.current.azimuthal - azimuthalDifference;
        camera.controls.setAzimuthalAngle(azimuthalDifference);

        var polarDifference = (camera.angles.current.polar - camera.angles.target.polar) * dotProgress;
        polarDifference = camera.angles.current.polar - polarDifference;
        camera.controls.setPolarAngle(polarDifference);

      }

    }

    animations.dots.current++;

    // Update verticies
    groups.globeDots.geometry.verticesNeedUpdate = true;

  }

  if (animations.dots.current >= (animations.dots.total * 0.65) && animations.globe.current <= animations.globe.total) {

    var globeProgress = easeOutCubic(animations.globe.current / animations.globe.total);
    globe.material.opacity = props.alphas.globe * globeProgress;

    // Fade-in the country lines
    var lines = animations.countries.selected.children;
    for (var ii = 0; ii < lines.length; ii++) {
      lines[ii].material.uniforms.opacity.value = props.alphas.lines * globeProgress;
    }

    animations.globe.current++;

  }

  if (animations.dots.current >= (animations.dots.total * 0.7) && animations.countries.active === false) {

    list.classList.add('active');

    var key = Object.keys(data.countries)[animations.countries.index];
    changeCountry(key, true);

    animations.countries.active = true;

  }

  if (animations.countries.active === true && animations.finishedIntro === false) {

    animations.finishedIntro = true;
    // Start country cycle
    animations.countries.timeout = setTimeout(showNextCountry, animations.countries.initialDuration);
    addLineDots();

  }

}



/* COUNTRY CYCLE */

function changeCountry(key, init) {

  if (animations.countries.selected !== undefined) {
    animations.countries.selected.visible = false;
  }

  for (var name in elements) {
    if (name === key) {
      elements[name].element.classList.add('active');
    }
    else {
      elements[name].element.classList.remove('active');
    }
  }

  // Show the select country lines
  animations.countries.selected = groups.lines.getObjectByName(key);
  animations.countries.selected.visible = true;

  if (init !== true) {

    camera.angles.current.azimuthal = camera.controls.getAzimuthalAngle();
    camera.angles.current.polar = camera.controls.getPolarAngle();

    var targetAngles = returnCameraAngles(data.countries[key].x, data.countries[key].y);
    camera.angles.target.azimuthal = targetAngles.azimuthal;
    camera.angles.target.polar = targetAngles.polar;

    animations.countries.animating = true;
    reassignDotsToNewLines();

  }

}

function animateCountryCycle() {

  if (animations.countries.current <= animations.countries.total) {

    var progress = easeInOutQuad(animations.countries.current / animations.countries.total);

    var azimuthalDifference = (camera.angles.current.azimuthal - camera.angles.target.azimuthal) * progress;
    azimuthalDifference = camera.angles.current.azimuthal - azimuthalDifference;
    camera.controls.setAzimuthalAngle(azimuthalDifference);

    var polarDifference = (camera.angles.current.polar - camera.angles.target.polar) * progress;
    polarDifference = camera.angles.current.polar - polarDifference;
    camera.controls.setPolarAngle(polarDifference);

    animations.countries.current++;

  }
  else {

    animations.countries.animating = false;
    animations.countries.current = 0;

    animations.countries.timeout = setTimeout(showNextCountry, animations.countries.duration);

  }

}

function showNextCountry() {

  animations.countries.index++;

  if (animations.countries.index >= Object.keys(data.countries).length) {
    animations.countries.index = 0;
  }

  var key = Object.keys(data.countries)[animations.countries.index];
  changeCountry(key, false);

}



/* COORDINATE CALCULATIONS */

// Returns an object of 3D spherical coordinates
function returnSphericalCoordinates(latitude, longitude) {

  /*
    This function will take a latitude and longitude and calcualte the
    projected 3D coordiantes using Mercator projection relative to the
    radius of the globe.

    Reference: https://stackoverflow.com/a/12734509
  */

  // Convert latitude and longitude on the 90/180 degree axis
  latitude = ((latitude - props.mapSize.width) / props.mapSize.width) * -180;
  longitude = ((longitude - props.mapSize.height) / props.mapSize.height) * -90;

  // Calculate the projected starting point
  var radius = Math.cos(longitude / 180 * Math.PI) * props.globeRadius;
  var targetX = Math.cos(latitude / 180 * Math.PI) * radius;
  var targetY = Math.sin(longitude / 180 * Math.PI) * props.globeRadius;
  var targetZ = Math.sin(latitude / 180 * Math.PI) * radius;

  return {
    x: targetX,
    y: targetY,
    z: targetZ
  };

}

// Reference: https://codepen.io/ya7gisa0/pen/pisrm?editors=0010
function returnCurveCoordinates(latitudeA, longitudeA, latitudeB, longitudeB) {

  // Calculate the starting point
  var start = returnSphericalCoordinates(latitudeA, longitudeA);

  // Calculate the end point
  var end = returnSphericalCoordinates(latitudeB, longitudeB);

  // Calculate the mid-point
  var midPointX = (start.x + end.x) / 2;
  var midPointY = (start.y + end.y) / 2;
  var midPointZ = (start.z + end.z) / 2;

  // Calculate the distance between the two coordinates
  var distance = Math.pow(end.x - start.x, 2);
  distance += Math.pow(end.y - start.y, 2);
  distance += Math.pow(end.z - start.z, 2);
  distance = Math.sqrt(distance);

  // Calculate the multiplication value
  var multipleVal = Math.pow(midPointX, 2);
  multipleVal += Math.pow(midPointY, 2);
  multipleVal += Math.pow(midPointZ, 2);
  multipleVal = Math.pow(distance, 2) / multipleVal;
  multipleVal = multipleVal * 0.7;

  // Apply the vector length to get new mid-points
  var midX = midPointX + multipleVal * midPointX;
  var midY = midPointY + multipleVal * midPointY;
  var midZ = midPointZ + multipleVal * midPointZ;

  // Return set of coordinates
  return {
    start: {
      x: start.x,
      y: start.y,
      z: start.z
    },
    mid: {
      x: midX,
      y: midY,
      z: midZ
    },
    end: {
      x: end.x,
      y: end.y,
      z: end.z
    }
  };

}

// Returns an object of 2D coordinates for projected 3D position
function getProjectedPosition(width, height, position) {

  /*
    Using the coordinates of a country in the 3D space, this function will
    return the 2D coordinates using the camera projection method.
  */

  position = position.clone();
  var projected = position.project(camera.object);

  return {
    x: (projected.x * width) + width,
    y: -(projected.y * height) + height
  };

}


// Returns an object of the azimuthal and polar angles of a given map latitude and longitude
function returnCameraAngles(latitude, longitude) {

  /*
    This function will convert given latitude and longitude coordinates that are
    proportional to the map dimensions into values relative to PI (which the
    camera uses as angles).

    Note that the azimuthal angle ranges from 0 to PI, whereas the polar angle
    ranges from -PI (negative PI) to PI (positive PI).

    A small offset is added to the azimuthal angle as angling the camera directly on top of a point makes the lines appear flat.
  */

  var targetAzimuthalAngle = ((latitude - props.mapSize.width) / props.mapSize.width) * Math.PI;
  targetAzimuthalAngle = targetAzimuthalAngle + (Math.PI / 2);
  targetAzimuthalAngle = targetAzimuthalAngle + 0.1; // Add a small offset

  var targetPolarAngle = (longitude / (props.mapSize.height * 2)) * Math.PI;

  return {
    azimuthal: targetAzimuthalAngle,
    polar: targetPolarAngle
  };

}



/* INITIALISATION */

function globe() {
  if (!window.WebGLRenderingContext) {
    showFallback();
  }
  else {
    // if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) getData();
    getData();
  }
}
(function(){var r,t=function(e,n){return function(){return e.apply(n,arguments)}};r=function(){function e(e,n){this.onCleared=t(this.onCleared,this),this.onChanged=t(this.onChanged,this),this.element=e,this.options=$.extend(this.options,n),this.bind()}return e.prototype.element=null,e.prototype.options={fileInputSelector:"> input[type=file]",clearButtonSelector:"+ a.image-picker-cancel",onChanged:null,onCleared:null},e.prototype.onChanged=function(e){var n,t,o;if((n=e.target).files&&n.files[0]&&((t=new FileReader).onload=(o=this,function(e){return $(o.element).css("background-image","url("+e.target.result+")").addClass("removable")}),t.readAsDataURL(n.files[0]),"function"==typeof this.options.onChanged))return this.options.onChanged(e)},e.prototype.onCleared=function(e){var n;if(e.preventDefault(),null==(n=$(this.element).attr("data-no-image"))&&(n="none"),$(this.element).css("background-image",n).removeClass("removable"),"function"==typeof this.options.onCleared)return this.options.onCleared(e)},e.prototype.bind=function(){return $(this.element).find(this.options.fileInputSelector).unbind("change").change(this.onChanged).end().find(this.options.clearButtonSelector).unbind("click").click(this.onCleared).end()},e}(),"undefined"!=typeof $&&null!==$&&($.fn.giaImagePicker=function(e){var n,t,o,i;for(i=[],t=0,o=this.length;t<o;t++)n=this[t],i.push(new r(n,e));return i})}).call(this);
//@prepros-prepend orbit-controls.js
//@prepros-prepend mesh-line.js
//@prepros-prepend globe.js
//@prepros-prepend image-picker.js

// whitepaper
function whitepaper() {
  if (!$('#home').length) return
  var WP_DATE = moment('2018-05-01', 'YYYY-MM-DD')
  var WP_DEADLINE = WP_DATE.format('MMM Do, YYYY')
  $('#wpdate').text(WP_DEADLINE)
  var $day = $('#wpday')
  var $hour = $('#wphour')
  var $min = $('#wpmin')
  var $sec = $('#wpsec')
  var tick = function() {
    var now = moment()
    var diff = WP_DATE.diff(now)
    $day.text(~~(diff / 86400000))
    $hour.text(~~(diff % 86400000 / 3600000))
    $min.text(~~(diff % 3600000 / 60000))
    $sec.text(~~(diff % 60000 / 1000))
  }
  setInterval(tick, 1000)
}

// scrolling
var didScroll = false
var lastScrollTop = 0
var delta = 5
function scroller() {
  didScroll = true
}
function header() {
  function hasScrolled() {
    var height = $('#top-bar').outerHeight()
    var top = $(this).scrollTop()
    if (Math.abs(lastScrollTop - top) <= delta) return
    if (top > lastScrollTop && top > height)
      $('#top-bar').removeClass('down').addClass('up')
    else if (top + $(window).height() < $(document).height())
      $('#top-bar').removeClass('up').addClass('down')
    lastScrollTop = top
  }
  if (!$('#home').length) {
    setInterval(function() {
      if (didScroll) {
        hasScrolled()
        didScroll = false
      }
    }, 250)
  }
}

// ui

function aosing() {
  if (AOS) {
    AOS.init({
      duration: 500
    })
  }
}

function menu() {
  var section = $('#menu')
  var toggle = $('#top-bar .menu')
  toggle.click(function(e) {
    e.preventDefault()
    if (section.hasClass('h')) {
      section.removeClass('h').hide().fadeIn('fast')
      toggle.addClass('opened')
      $('html, body').addClass('no-scroll')
    } else {
      section.fadeOut('fast', function() {
        section.addClass('h')
      })
      toggle.removeClass('opened')
      $('html, body').removeClass('no-scroll')
    }
  })
  if ($('#home').length) {
    section.on('click', '.navigations a', function(e) {
      section.fadeOut('fast', function() {
        $('html, body').removeClass('no-scroll')
        section.addClass('h')
      })
      toggle.removeClass('opened')
      link = $(e.target).attr('href')
      element = $(link)
      $('html, body').animate({
        scrollTop: element.offset().top
      }, 1000)
    })
  }
}

function pickers() {
  if ($.fn.giaImagePicker) {
    $('.image-picker').giaImagePicker()
  }
}

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

function toc() {
  var toc = $('.toc')
  if (!toc.length) return
  var document = $('.document')
  // get all sections h1
  var sections = document.find('.section')
  var h1s = $('<ul></ul>')
  sections.each(function (i, e) {
    var title = $(e).find('h1')
    // var id = 'wps-' + (i + 1)
    var id = slugify(title.text().trim())
    title.attr('id', id)
    var a = $('<a></a>')
    var li = $('<li></li>')
    a.html(title.html())
    a.attr('href', '#' + id)
    a.addClass('anchor')
    li.append(a)
    // get all h2
    var children = $(e).find('h2')
    if (children.length) {
      var h2s = $('<ul></ul>')
      children.each(function (j, f) {
        var _title = $(f)
        var _id = id + '-' + (j + 1)
        var _li = $('<li></li>')
        var _a = $('<a></a>')
        _title.attr('id', _id)
        _a.html(_title.html())
        _a.attr('href', '#' + _id)
        _li.append(_a)
        h2s.append(_li)
      })
      li.append(h2s)
    }
    h1s.append(li)
  })
  toc.children(':not(.download)').remove()
  toc.append(h1s)
  if (toc.scrollToFixed && window.innerWidth > 640)
    toc.scrollToFixed({
      marginTop: 150,
      limit: function() {
        var docTop = $('.document').scrollTop()
        var docHeight = $('.document').height()
        return docTop + docHeight - 350
      },
      dontCheckForPositionFixedSupport: true
    })
  toc.on('click', 'a.anchor', function(ev) {
    ev.preventDefault()
    var target = $($(ev.currentTarget).attr('href'))
    if (!target.length) return
    var from = $('html').scrollTop()
    var to = target.offset().top - 150
    var delta = Math.abs(from - to)
    $('html, body').animate({
      scrollTop: to
    }, delta / 5)
  })
}

// preload
function loader() {
  setTimeout(function() {
    var preload = $('#preload')
    var home = $('#home')
    if (preload.length) preload.fadeOut('slow')
    if (home.length && globe) globe()
    if (aosing) aosing()
  }, 0)
}

// bind

$(window)
  .on('load', loader)
  .scroll(scroller)
$(document).ready(function() {
  menu()
  header()
  whitepaper()
  toc()
  pickers()
})

//# sourceMappingURL=miskre.dist.js.map