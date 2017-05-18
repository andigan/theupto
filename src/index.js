// replace assignDrag with assignImageDrag

// wall-collective
//
// Version: 0.7.0
// Requires: jQuery v1.7+
//           jquery-ui
//           jquery.form
//           jquery.mobile-events
//           jquery.ui.touch-punch
//           socket.io v1.3.7+
//           interact.js
//
// Copyright (c) 2018 Andrew Nease (andrew.nease.code@gmail.com)

import config from './_config/config';

import configureStore from './_init/configureStore';
const store = configureStore();


import pageSettings from './_init/pageSettings';
import stateChange from './views/state-change';

// components
import Buttons from './components/buttons';
import Grid from './components/grid';
import NavToggleButton from './components/ui-elements/nav-toggle-button';

// actions
import { setSelectedImage } from './actions';
import { resetClickCount } from './actions';
import { setSessionID } from './actions';
import { setInstaAvailable } from './actions';

// helpers
import { getCookie } from './helpers';
import { setCookie } from './helpers';

// main drag
import { assignImageDrag } from './components/ui-elements/main-image-drag';

// draggers
import { draggersInit } from './components/draggers';
import { setDraggerLocations } from './components/draggers';

// DEBUG
import debug from './debug/debug'; // DEBUG
if (config.debugOn) debug.init(store);

// instagram switch
config.useIGram = useIGram;

// create buttons and assign functionality

// only import the init
Buttons.init();

// set page sizes and resize listeners
// only import the init
pageSettings.init();
// provide methods for creating and destroying grid
// only import the init
Grid.init(pageSettings);
// make nav-toggle-button draggable
NavToggleButton.init();

draggersInit();

// temporary height to percentage conversion
Array.from(document.getElementsByClassName('wallPic')).forEach(function (element) {
  if (element.style.height === 'auto') {
    element.style.height = ((parseInt(window.getComputedStyle(element).height) / pageSettings.imagesHigh * 100).toFixed(2)) + '%';
  };


});


// set socket location : io.connect('http://localhost:8000'); || io.connect('http://www.domain_name.com');
var socket = io.connect([location.protocol, '//', location.host, location.pathname].join('')),

    // assigned by initial socket; used by upload counter
    sessionID = String,

    // used with a cookie to store which draggers are active for individual persistence
    switches_status = String,

    // used by the upload counter
    uploadtotal = 0,

    // used when an image is dragged from the instagram div; assigned by socket when download is complete
    insta_download_ready_filename = {};

window.store = store;
window.socket = socket;



var insta = {
  init: function () {
    // set insta-container's height
    document.getElementById('insta-container').style.height = (window.innerHeight) + 'px';
    document.getElementById('insta-images-container').style.height = (window.innerHeight * 0.8) + 'px';
    document.getElementById('insta-images-container').style.top = (window.innerHeight * 0.1) + 'px';
    document.getElementById('insta-header').style.height = (window.innerHeight * 0.07) + 'px';
    document.getElementById('background-opacity').style.height = (window.innerHeight * 0.8) + 'px';
    document.getElementById('background-opacity').style.top = (window.innerHeight * 0.1) + 'px';

    // insta_step 5, 6: on initial load, if query includes ?open_igram (added after i-gram auth),
    // fetch igram data and open the divs
    if (window.location.href.includes('open_igram')) {
      socket.emit('ce:_fetchIgramData');

      document.getElementById('insta-header').style.display = 'flex';
      document.getElementById('insta-container').style.display = 'block';
      document.body.classList.add('a-nav-container-is-open');

      // animate open hamburgers
      document.getElementById('ham-line1').style.top = '35%';
      document.getElementById('ham-line3').style.top = '65%';
    };
  }
};

// initialize instagram options
insta.init();

// assign draggable to all .wallPic elements
assignImageDrag();

// // prevent default behavior to prevent iphone dragging and bouncing
// // http://www.quirksmode.org/mobile/default.html
// document.ontouchmove = function (event) {
//   event.preventDefault();
// };

  // process any click on the wrapper
  $('#wrapper').on('click touchstart', function (event) {
    var dragger_elements = {};

    document.getElementById('color-chooser').style.display = 'none';

    // if the images div alone is clicked...
    if (event.target.getAttribute('id') === 'images') {
      dragger_elements = document.getElementsByClassName('dragger');
      // remove all draggers
      stateChange.hideDraggers();
      // close button containers and remove d-transition
      document.body.classList.remove('d-transition');

    };
  });


  // remove
  // if (document.getElementById('insta-container').style.display === 'block') {
  //   history.replaceState({}, 'wall-collective', '/');
  //   document.getElementById('insta-header').style.display = 'none';
  //   document.getElementById('insta-container').style.display = 'none';
  // };

// --Socket.io

  // on initial connect, retrieve sessionID cookie and send results to server
  socket.on('connect', function () {
    var clientVars = {};

    clientVars.sessionID = getCookie('sessionID');
    socket.emit ('ce:  sessionID_check', clientVars);

  });


  // used to see instagram results
  socket.on('check_out', function (data) {
    console.log(data);
  });


  socket.on('ce: insta_access_ready', function () {
    window.store.dispatch(setInstaAvailable(true));
  });

  // initial set up for all visits.
  socket.on('connect_set_clientVars', function (clientVars) {
    var i = 0,
      switches = ['stretch', 'rotation', 'opacity', 'blur_brightness', 'contrast_saturate', 'grayscale_invert', 'threeD', 'party'];

    // assign sessionID.  used by upload_counter and user_count
    // the server sends a unique id or the previous id from the cookie
    sessionID = clientVars.sessionID;
    window.store.dispatch(setSessionID(sessionID));



//    instaAppID = clientVars.instaAppID;
    config.instaAppID = clientVars.instaAppID;


    // set background color
    document.getElementById('wrapper').style.backgroundColor = clientVars.backgroundColor;

    // set or reset sessionID cookie
    setCookie('sessionID', sessionID, 7);

    // hack: Problem:  busboy stream received the file stream before the sessionID, which was passed as a data value in the ajax submit
    //       Solution: change the HTML 'name' attribute of the form's input to the sessionID, which always arrives concurrently
    document.getElementById('fileselect').setAttribute('name', sessionID);

    // switches_status cookie stores which draggers are activated when the page loads; capital letters denote an activated dragger
    if (getCookie('switches_status') === '') setCookie('switches_status', 'SRObcgtp', 7);

    switches_status = getCookie('switches_status');

    // if the switches_status character is uppercase, switch on the corresponding dragger_switch
    for ( i = 0; i < switches.length; i++ ) {
      if (switches_status[i] === switches_status[i].toUpperCase()) document.getElementById(switches[i] + '_dragger_switch').classList.add('switchon');
    };
  });

  // display the number of connected clients
  socket.on('bc: change_user_count', function (data) {
    var i = 0,
      content = '',
      connectInfoEl = document.getElementById('connect-info');

    // for each connected_client, add an icon to connect-info element
    for ( i = 0; i < data.length; i++ ) {
      content = content + "<img src='icons/person_icon.png' class='icon-person' />";
      // debug: report sessionID rather than image. underline connected sessionID
      // if (data[i] === sessionID) content = content + '<u>'; content = content + '  ' + data[i]; if (data[i] === sessionID) content = content + '</u>';
    };
    connectInfoEl.innerHTML = content;
  });

  // on another client moving an image, move target
  socket.on('bc:_moving', function (data) {
    document.getElementById(data.imageID).style.top  = data.posTop + '%';
    document.getElementById(data.imageID).style.left = data.posLeft + '%';
  });

  // on another client resizing an image, resize target
  socket.on('bc: resizing', function (data) {
    document.getElementById(data.imageID).style.transform = data.imageTransform;
    document.getElementById(data.imageID).style.top       = data.imageTop;
    document.getElementById(data.imageID).style.left      = data.imageLeft;
    document.getElementById(data.imageID).style.width     = data.imageWidth;
    document.getElementById(data.imageID).style.height    = data.imageHeight;
  });

  // on resize stop, resize target with new parameters
  socket.on('bc: resized', function (data) {
    document.getElementById(data.imageID).style.transform = data.imageTransform;
    document.getElementById(data.imageID).style.top       = data.imageTop;
    document.getElementById(data.imageID).style.left      = data.imageLeft;
    document.getElementById(data.imageID).style.width     = data.imageWidth;
    document.getElementById(data.imageID).style.height    = data.imageHeight;
  });

  // on transforming, transform target
  socket.on('bc: transforming', function (data) {
    document.getElementById(data.imageID).style.transform = data.imageTransform;
  });

  // on transform changes, modify data attributes used by setDraggerLocations
  socket.on('bc: change_data_attributes', function (data) {
    document.getElementById(data.imageID).setAttribute('data-scale', data.scale);
    document.getElementById(data.imageID).setAttribute('data-angle', data.angle);
    document.getElementById(data.imageID).setAttribute('data-rotateX', data.rotateX);
    document.getElementById(data.imageID).setAttribute('data-rotateY', data.rotateY);
    document.getElementById(data.imageID).setAttribute('data-rotateZ', data.rotateZ);
  });

  // on opacity changing, adjust target
  socket.on('bc: opacity_changing', function (data) {
    document.getElementById(data.imageID).style.opacity = data.imageOpacity;
  });

  // on filter changing, adjust target
  socket.on('bc: filter_changing', function (data) {
    document.getElementById(data.imageID).style.WebkitFilter = data.imageFilter;
  });

  socket.on('bc:_changeBackground', function (data) {
    document.getElementById('images').style.backgroundColor = data;
  });

  // reset page across all clients
  socket.on('bc: resetpage', function () {
    window.location.reload(true);
  });

  // add uploaded image
  socket.on('bc: add_upload', function (data) {
    var images_element = document.getElementById('images'),
      imageEl = document.createElement('img');

    imageEl.setAttribute('id', data.dom_id);
    imageEl.src = data.location + data.imageFilename;
    imageEl.classList.add('wallPic');
    imageEl.setAttribute('title', data.imageFilename);
    imageEl.setAttribute('data-scale', '1');
    imageEl.setAttribute('data-angle', '0');
    imageEl.setAttribute('data-rotateX', '0');
    imageEl.setAttribute('data-rotateY', '0');
    imageEl.setAttribute('data-rotateZ', '0');
    imageEl.style.width = config.uploadWidth;
    imageEl.style.zIndex = data.z_index;
    imageEl.style.top = config.uploadTop;
    imageEl.style.left = config.uploadLeft;
    imageEl.style.opacity = 1;
    imageEl.style.WebkitFilter = 'grayscale(0) blur(0px) invert(0) brightness(1) contrast(1) saturate(1) hue-rotate(0deg)';
    imageEl.style.transform = 'rotate(0deg) scale(1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)';

    // Add <img id='dom_id'> to <div id='images'>
    images_element.appendChild(imageEl);
    // assign drag to added element
    assignImageDrag(data.dom_id);
  });

  // remove deleted image
  socket.on('bc:_deleteImage', function (data) {
    document.getElementById(data.deleteID).remove();
    if (data.deleteID === window.store.getState().selectedImage.id) {
      window.store.dispatch(setSelectedImage(''));
      stateChange.hideDraggers();
    };
  });

  // remove filter
  socket.on('bc: remove_filter', function (data) {
    document.getElementById(data).setAttribute('data-filter', document.getElementById(data).style.WebkitFilter);
    document.getElementById(data).style.WebkitFilter = '';
  });
  // replace filter
  socket.on('bc: restore_filter', function (data) {
    document.getElementById(data).style.WebkitFilter = document.getElementById(data).getAttribute('data-filter');
    document.getElementById(data).removeAttribute('data-filter');
  });

  // disable dragging; other client is moving image
  socket.on('bc: freeze', function (data) {
    $('#' + data).draggable ( 'disable' );
  });
  // enable dragging; other client has stopped moving image
  socket.on('bc: unfreeze', function (data) {
    $('#' + data).draggable ( 'enable' );
  });

  // hide element; other client has primed image for deletion
  socket.on('bc: hide_image', function (data) {
    document.getElementById(data).style.display = 'none';
  });
  // show element; other client has cancelled deletion
  socket.on('bc: show_image', function (data) {
    console.log(data);
    document.getElementById(data).style.display = 'initial';

  });

  // if this client is the uploader, show upload statistics from busboy
  socket.on('bc: chunk_sent', function (uploaddata) {
    if (uploaddata.sessionID === sessionID) {
      uploadtotal += uploaddata.chunkSize;
      document.getElementById('upload-confirm-info').textContent = 'Uploaded ' + uploadtotal  + ' bytes of ' + document.getElementById('fileselect').files[0].size + ' bytes.';
    };
  });

  // insta_step 10: Add content to insta-container
  socket.on('se: add_content_to_insta_div', function (insta_fetch_data) {
    var i = 0,
      instaImagesEl = document.getElementById('insta-images-container');

    // set content in insta-header
    document.getElementById('insta-info-username').textContent = insta_fetch_data.username;
    document.getElementById('insta-image-profile').src = insta_fetch_data.profile_picture;
    document.getElementById('insta-profile-link').setAttribute('href', 'https://www.instagram.com/' + insta_fetch_data.username + '/?hl=en');

    // destroy current images in insta-images-container
    instaImagesEl.innerHTML = '';

    // use insta_images_src to display fetched Instagram images
    for (i = 0; i < insta_fetch_data.insta_images_src.length; i++ ) {

      var temp_img = document.createElement('img'),
        temp_div = document.createElement('div'),
        spacer_top = document.createElement('div'),
        spacer_middle = document.createElement('div'),
        spacer_bottom = document.createElement('div');

      temp_div.classList.add('insta_image_div');

      temp_img.setAttribute('id', 'insta' + i);
      temp_img.classList.add('insta_image');
      temp_img.src = insta_fetch_data.insta_images_src[i];
      temp_img.setAttribute('data-link', insta_fetch_data.insta_images_link[i]);

      spacer_top.classList.add('spacer_top_bottom');
      spacer_middle.classList.add('spacer_middle');
      spacer_bottom.classList.add('spacer_top_bottom');

      temp_div.appendChild(temp_img);
      instaImagesEl.appendChild(temp_div);

      // add spacers for scrolling
      if (i < insta_fetch_data.insta_images_src.length - 1) {
        instaImagesEl.appendChild(spacer_top);
        instaImagesEl.appendChild(spacer_middle);
        instaImagesEl.appendChild(spacer_bottom);
      };

      // insta_step 11: Make the imported Instagram images draggable

      // use a clone so that the images can escape the scrollable div
      $('#insta' + i).draggable(
        {
          helper: 'clone',
          appendTo: 'body',
          scroll: true,
          start:  function () {

            // insta_step 12: When dragging starts, save dragged image to server storage, using id as an index
//            console.log(this);

            socket.emit('ce: save_insta_image', { src: this.getAttribute('src'), id: parseInt(this.getAttribute('id').replace('insta', '')) });

            // assign temporary z-index
            this.style.zIndex = 60000;

            stateChange.hideDraggers();
          }
        });
    };
  }); // end of socket se: add_content_to_insta_div


  // insta_step 15: Receive new filename from server
  socket.on('ce: insta_download_ready', function (newFileData) {

  //  store new filename in an object with the id as the key
  insta_download_ready_filename['insta' + newFileData.iIndex] = newFileData.newFilename;

  console.log(newFileData.newFilename + ' downloaded.');
});


// insta_step 16: Make dragged insta_image droppable in images_div

// http://stackoverflow.com/questions/36181050/jquery-ui-draggable-and-droppable-duplicate-issue
// This allows the image to be draggable outside of the scrollable div
  $('#images').droppable({
    accept: '.insta_image',
    drop: function (event, ui) {
      var clone = {},
          instaDropData = {},
          timeout_counter = 0;

        // clone is a jQuery method.  false specifies that event handlers should not be copied.
        // create a clone of the ui.draggable within the images div
        instaDropData.posLeft = ((ui.offset.left - (pageSettings.mainWide - pageSettings.imagesWide) / 2) / pageSettings.imagesWide * 100).toFixed(2) + '%';
        instaDropData.posTop = ((ui.offset.top - (pageSettings.mainHigh - pageSettings.imagesHigh) / 2) / pageSettings.imagesHigh * 100).toFixed(2) + '%';



      clone = ui.draggable.clone(false);
      clone.css('left', instaDropData.posLeft)
           .css('top', instaDropData.posTop)
           .css('position', 'absolute')
           // consider changing id so that id is not duplicated in dom
           // .attr('id', 'i' + clone.attr('id')),
           .removeClass('ui-draggable ui-draggable-dragging resize-drag');
      $('#images').append(clone);

      // wait for the filename to be received from the server
      function wait_for_download() {

        if (insta_download_ready_filename[ui.draggable[0].getAttribute('id')] === undefined) {

          // if timeout_counter has lasted too long, cancel operation
          timeout_counter = timeout_counter + 50;
          console.log('Waiting for download: ' + (timeout_counter / 1000) + 's');
          if (timeout_counter > 10000) {
            alert('Download error.  Refreshing page.');
            window.location.assign([location.protocol, '//', location.host, location.pathname].join(''));
          } else {
            // wait 50 milliseconds then recheck
            setTimeout(wait_for_download, 50);
            return;
          };
        };

        // once the filename is received...

        // insta_step 17: Send instaDropData to server
        instaDropData.iID = ui.draggable[0].getAttribute('id');
        instaDropData.iFilename =  insta_download_ready_filename[ui.draggable[0].getAttribute('id')];
        // instaDropData.posleft = ui.offset.left;
        // instaDropData.postop = ui.offset.top;

        instaDropData.posLeft = ((ui.offset.left - (pageSettings.mainWide - pageSettings.imagesWide) / 2) / pageSettings.imagesWide * 100).toFixed(2) + '%';
        instaDropData.posTop = ((ui.offset.top - (pageSettings.mainHigh - pageSettings.imagesHigh) / 2) / pageSettings.imagesHigh * 100).toFixed(2) + '%';

        instaDropData.iWidth = window.getComputedStyle(ui.draggable[0]).width + '%';
        instaDropData.iHeight = window.getComputedStyle(ui.draggable[0]).height + '%';

        instaDropData.iwide = (parseFloat(window.getComputedStyle(ui.draggable[0]).width) / pageSettings.imagesWide * 100).toFixed(2) + '%';
        instaDropData.ihigh = (parseFloat(window.getComputedStyle(ui.draggable[0]).height) / pageSettings.imagesHigh * 100).toFixed(2) + '%';

        instaDropData.iLink = ui.draggable[0].getAttribute('data-link');

        socket.emit('ce: insta_drop', instaDropData);

        // delete id key from insta_download_ready_filename object
        delete insta_download_ready_filename[ui.draggable[0].getAttribute('id')];
      }

      wait_for_download();

      // It would be much less complex to initiate the download here,
      // however, this strategy (of starting the download when the drag starts)
      // provides a quicker user experience.
    }
  });



  // insta_step 20: Convert dragged image to typical .wallPic
  socket.on('se: change_clone_to_image', function(instaDBData) {
    var imageEl = document.getElementById(instaDBData.iID);

    imageEl.setAttribute('id', instaDBData.dom_id);
    imageEl.src = instaDBData.location + instaDBData.iFilename;
    imageEl.classList.add('wallPic');

    imageEl.style.left = instaDBData.posleft;
    imageEl.style.top = instaDBData.postop;
    imageEl.style.width = instaDBData.width;
    imageEl.style.height = instaDBData.height;

    imageEl.classList.remove('insta_image');
    imageEl.setAttribute('title', instaDBData.iFilename);
    imageEl.setAttribute('data-link', instaDBData.insta_link);
    imageEl.setAttribute('data-scale', '1');
    imageEl.setAttribute('data-angle', '0');
    imageEl.setAttribute('data-rotateX', '0');
    imageEl.setAttribute('data-rotateY', '0');
    imageEl.setAttribute('data-rotateZ', '0');
    imageEl.style.zIndex = instaDBData.z_index;
    imageEl.style.opacity = 1;
    imageEl.style.WebkitFilter = 'grayscale(0) blur(0px) invert(0) brightness(1) contrast(1) saturate(1) hue-rotate(0deg)';
    imageEl.style.transform = 'rotate(0deg) scale(1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)';

    // assign drag to added element
    assignImageDrag(instaDBData.dom_id);
  });

  // insta_step 22: Add image to other clients
  socket.on('be: add_insta_image_to_other_clients', function (instaDBData) {
    var images_element = document.getElementById('images'),
      imageEl = document.createElement('img');

    imageEl.setAttribute('id', instaDBData.dom_id);
    imageEl.setAttribute('title', instaDBData.iFilename);
    imageEl.src = instaDBData.location + instaDBData.iFilename;
    imageEl.classList.add('wallPic');
    imageEl.style.width = instaDBData.width;
    imageEl.style.height = instaDBData.height;
    imageEl.style.top = instaDBData.postop;
    imageEl.style.left = instaDBData.posleft;
    imageEl.style.zIndex = instaDBData.z_index;
    imageEl.setAttribute('data-link', instaDBData.insta_link);


    imageEl.setAttribute('data-scale', '1');
    imageEl.setAttribute('data-angle', '0');
    imageEl.setAttribute('data-rotateX', '0');
    imageEl.setAttribute('data-rotateY', '0');
    imageEl.setAttribute('data-rotateZ', '0');
    imageEl.style.opacity = 1;
    imageEl.style.WebkitFilter = 'grayscale(0) blur(0px) invert(0) brightness(1) contrast(1) saturate(1) hue-rotate(0deg)';
    imageEl.style.transform = 'rotate(0deg) scale(1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)';

    images_element.appendChild(imageEl);

    // assign drag to added element
    assignImageDrag(instaDBData.dom_id);
  });





// --Buttons
  // dragger_all_switch; used to toggle all dragger switches
  $('#dragger_all_switch').click(function () {
    var i = 0,
      switch_elements = {},
      dragger_elements = {};

    // add or remove 'switchon' class in dragger_all_switch
    this.classList.toggle('switchon');
    // if dragger_all_switch has been switched on
    if (document.getElementById('dragger_all_switch').classList.contains('switchon')) {
      // add 'switchon' class to all dragger_switch elements
      switch_elements = document.getElementsByClassName('dragger_switch');
      for (i = 0; i < switch_elements.length; i++) {
        switch_elements[i].classList.add('switchon');
      };
      // set dragger element locations
      setDraggerLocations(window.store.getState().selectedImage.id);
      // show dragger elements if an image is selected
      if (window.store.getState().selectedImage.id) {
        dragger_elements = document.getElementsByClassName('dragger');
        for (i = 0; i < dragger_elements.length; i++) {
          dragger_elements[i].style.display = 'block';
        };
      };
      // set cookie to all uppercase
      setCookie('switches_status', 'SROBCGTP', 7);
      switches_status = 'SROBCGTP';
    // else when dragger_all_switch has been switched off
    } else {
      // remove 'switchon' class from dragger_status elements
      switch_elements = document.getElementsByClassName('dragger_switch');
      for (i = 0; i < switch_elements.length; i++) {
        switch_elements[i].classList.remove('switchon');
      };
      // hide all draggers
      dragger_elements = document.getElementsByClassName('dragger');
      for (i = 0; i < dragger_elements.length; i++) {
        dragger_elements[i].style.display = 'none';
      };
      // set cookie to all lowercase
      setCookie('switches_status', 'srobcgtp', 7);
      switches_status = 'srobcgtp';
    };
  });











  // set up dragger_switch functionalities
  $('.dragger_switch').click(function () {
    var switch_status_array = [],
    // use id='stretch_dragger_switch' to get 'stretch_dragger'
      dragger_name = this.getAttribute('id').replace('_switch', '');

    // toggle dragger_switch
    this.classList.toggle('switchon');

    // convert d_status string to array
    switch_status_array = switches_status.split('');

    // if switched on
    if (this.classList.contains('switchon')) {
      // set dragger locations
      setDraggerLocations(window.store.getState().selectedImage.id);
      // show dragger if an image is selected
      if (window.store.getState().selectedImage.id) {
        document.getElementById(dragger_name).style.display = 'block';
      };
      // use first letter of dragger_name to find corresponding character in array and replace it
      // with uppercase character to indicate dragger_switch is on
      switch_status_array[switch_status_array.indexOf(dragger_name[0])] = dragger_name[0].toUpperCase();
    // else when switched off
    } else {
      // hide dragger
      document.getElementById(dragger_name).style.display = 'none';
      // use first letter of dragger_name to find corresponding character in array and replace it
      // with lowercase character to indicate dragger_switch is off
      switch_status_array[switch_status_array.indexOf(dragger_name[0].toUpperCase())] = dragger_name[0].toLowerCase();
    };
    // convert switch_status_array back to string and set cookie
    switches_status = switch_status_array.join('');
    setCookie('switches_status', switches_status, 7);
  });





  // on file_select element change, load up the image preview
  $('#fileselect').on('change', function () {
    // open upload-preview-container
    stateChange.uploadPreview();
    readURL(this);
  });

  // this function puts the image selected by the browser into the upload_preview container.
  // http://stackoverflow.com/questions/18934738/select-and-display-images-using-filereader
  // https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL
  function readURL(input) {
    var reader;

    if (input.files && input.files[0]) {
      reader = new FileReader();
      reader.onload = function (event) {
        // wait until the image is ready to upload_preview container
        document.getElementById('upload-preview-container').classList.add('upload-preview-container_is_open');
        document.getElementById('image-upload-preview').src = event.target.result;
      };
      reader.readAsDataURL(input.files[0]);
    };
  }

  // confirm upload button
  // on click, send a submit to the html form with id='upload-form-button'
  // the html form with id='upload-form-button' posts to '/addfile'
  $('#button-confirm-upload').on('click', function () {
    document.getElementById('upload-confirm-container').style.display = 'none';

    $('#upload-form-button').ajaxSubmit({
      // method from jquery.form
      error: function (xhr) {
        console.log('Error:' + xhr.status);
        // change nav-main-container and remove upload_preview
        stateChange.afterUpload();
        uploadtotal = 0;
      },
      success: function (response) {
        // response variable from server is the uploaded file information
        var socketdata = {},
          images_element = document.getElementById('images'),
          imageEl = document.createElement('img');

        // create new image
        imageEl.setAttribute('id', response.dom_id);
        imageEl.setAttribute('title', response.imageFilename);
        imageEl.classList.add('wallPic');
        imageEl.src = response.location + response.imageFilename;
        imageEl.setAttribute('data-scale', '1');
        imageEl.setAttribute('data-angle', '0');
        imageEl.setAttribute('data-rotateX', '0');
        imageEl.setAttribute('data-rotateY', '0');
        imageEl.setAttribute('data-rotateZ', '0');
        imageEl.setAttribute('data-persective', '0');
        imageEl.style.width = config.uploadWidth;
        imageEl.style.height = config.uploadheight;
        imageEl.style.zIndex = response.z_index;
        imageEl.style.top = config.uploadTop;
        imageEl.style.left = config.uploadLeft;
        imageEl.style.opacity = 1;
        imageEl.style.WebkitFilter = 'grayscale(0) blur(0px) invert(0) brightness(1) contrast(1) saturate(1) hue-rotate(0deg)';
        imageEl.style.transform = 'rotate(0deg) scale(1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)';

        // Add <div id='dom_id'> to <div id='images'>
        images_element.appendChild(imageEl);
        // assign drag to added element
        assignImageDrag(response.dom_id);
        // change navigation container and remove upload_preview
        stateChange.afterUpload();
        // emit to other clients
        socketdata.uploadedFilename = response.imageFilename;
        socket.emit('ce:  share_upload', socketdata);

        uploadtotal = 0;
      }
    });
  });



















// --Interact('.wallPic').gesturable, for touchscreen rotating and scaling

  interact('.wallPic').gesturable({
    onstart: function (event) {

      this.imageID = event.target.getAttribute('id');
      this.imageEl = event.target;

      stateChange.hideDraggers();

      // retrieve original angle and scale
      this.angle = parseFloat(this.imageEl.getAttribute('data-angle'));
      this.scale = parseFloat(this.imageEl.getAttribute('data-scale'));

      // pass id to ce:_lockID
      socket.emit('ce:_lockID', this.imageID);

      // prepare socketdata
      this.socketdata = {};
      this.socketdata.imageID = this.imageID;
      this.socketdata.imageFilename = this.imageEl.getAttribute('title');
    },
    onmove: function (event) {
      // retrieve scale and angle from event object
      // event.ds is scale difference; event.da is the angle difference
      this.scale = this.scale * (1 + event.ds);
      this.angle += event.da;

      // modify element with new transform
      this.imageEl.style.transform = this.imageEl.style.transform.replace(/rotate\(.*?\)/, 'rotate(' + this.angle + 'deg)');
      this.imageEl.style.transform = this.imageEl.style.transform.replace(/scale\(.*?\)/ , 'scale(' + this.scale + ')');

      // send socketdata
      this.socketdata.imageTransform = this.imageEl.style.transform;
      socket.emit('ce:_transforming', this.socketdata);
    },
    onend: function (event) {
      // if angle is < 0 or > 360, revise the angle to 0-360 range
      if (this.angle < 0) {
        this.angle = (360 + this.angle);
        this.imageEl.style.transform = this.imageEl.style.transform.replace(/rotate\(.*?\)/, 'rotate(' + this.angle + 'deg)');
      };
      if (this.angle > 360) {
        this.angle = (this.angle - 360);
        this.imageEl.style.transform = this.imageEl.style.transform.replace(/rotate\(.*?\)/, 'rotate(' + this.angle + 'deg)');
      };

      // send socketdata
      this.socketdata.scale = this.scale.toFixed(2);
      this.socketdata.angle = this.angle.toFixed(2);
      this.socketdata.rotateX = this.imageEl.getAttribute('data-rotateX');
      this.socketdata.rotateY = this.imageEl.getAttribute('data-rotateY');
      this.socketdata.rotateZ = this.imageEl.getAttribute('data-rotateZ');

      socket.emit('ce:_saveDataAttributes', this.socketdata);
      this.socketdata.imageTransform = this.imageEl.style.transform;
      socket.emit('ce:_saveTransform', this.socketdata);

      // pass id to ce:_unlockID
      socket.emit('ce:_unlockID', this.imageID);

      // put new scale and angle into data-scale and data-angle
      event.target.setAttribute('data-scale', this.scale.toFixed(2));
      event.target.setAttribute('data-angle', this.angle.toFixed(2));

      // reset draggers
//      setDraggerLocations(this.imageID);

      // reset click count
      click_count = 0;

    }
  });






// --Draggers




// // --Set dragger locations
//
// function setDraggerLocations(id) {
//
//     if (id) {
//       if (document.getElementById('stretch_dragger_switch').classList.contains('switchon')) {
//         set_stretch_dragger_to(id);
//       };
//       if (document.getElementById('opacity_dragger_switch').classList.contains('switchon')) {
//         set_opacity_dragger_to(id);
//       };
//       if (document.getElementById('rotation_dragger_switch').classList.contains('switchon')) {
//         set_rotation_dragger_to(id);
//       };
//       if (document.getElementById('grayscale_invert_dragger_switch').classList.contains('switchon')) {
//         set_grayscale_invert_dragger_to(id);
//       };
//       if (document.getElementById('blur_brightness_dragger_switch').classList.contains('switchon')) {
//         set_blur_brightness_dragger_to(id);
//       };
//       if (document.getElementById('contrast_saturate_dragger_switch').classList.contains('switchon')) {
//         set_contrast_saturate_dragger_to(id);
//       };
//       if (document.getElementById('threeD_dragger_switch').classList.contains('switchon')) {
//         set_threeD_dragger_to(id);
//       };
//       if (document.getElementById('party_dragger_switch').classList.contains('switchon')) {
//         set_party_dragger_to(id);
//       };
//     };
//   };

//   function set_stretch_dragger_to(id) {
//     var dragger_element = document.getElementById('stretch_dragger'),
//         imageEl     = document.getElementById(id),
//         // get the width and height
//         selected_imageWidth  = parseFloat(imageEl.style.width),
//         selected_imageHeight = parseFloat(imageEl.style.height),
//
//         // calculate the dragger location
//         selected_imageWidth_percentage  = selected_imageWidth / 100,
//         selected_imageHeight_percentage = selected_imageHeight / 100,
//         draggerLeft = selected_imageWidth_percentage * pageSettings.innerWidth,
//         draggerTop = (1 - selected_imageHeight_percentage) * pageSettings.innerHeight;
//
//     // set the dragger location
//     dragger_element.style.left    = draggerLeft + 'px';
//     dragger_element.style.top     = draggerTop + 'px';
//     dragger_element.style.display = 'block';
//
//     // allow transitions
//     // setTimeout is needed because the dragger will otherwise transition from no selection to selection
//     setTimeout(function () {
//       dragger_element.classList.add('d-transition');
//     }, 0);
//   };
//
//   function set_opacity_dragger_to(id) {
//     var dragger_element = document.getElementById('opacity_dragger'),
//         imageEl = document.getElementById(id),
//         // get the opacity percentage: 0-1
//         selected_image_opacity = parseInt( imageEl.style.opacity * 100) / 100,
//         // calculate the dragger location
//         draggerLeft = (selected_image_opacity * pageSettings.innerWidth);
//
//     // set the dragger location
//     dragger_element.style.left    = draggerLeft + 'px';
// //    dragger_element.style.top     = (pageSettings.innerHeight / 3 * 2) + 'px';
//     dragger_element.style.display = 'block';
//     // allow transitions
//     setTimeout(function () {
//       dragger_element.classList.add('d-transition');
//     }, 0);
//   };
//
//   function set_rotation_dragger_to(id) {
//     var dragger_element = document.getElementById('rotation_dragger'),
//       imageEl = document.getElementById(id),
//       // calculate the dragger location
//       draggerLeft = parseFloat(imageEl.getAttribute('data-angle') / 360 * pageSettings.innerWidth),
//       draggerTop = parseFloat(imageEl.getAttribute('data-rotateZ') / 360 * pageSettings.innerHeight);
//
//     // set the dragger location
//     dragger_element.style.left    = draggerLeft + 'px';
//     dragger_element.style.top     = draggerTop + 'px';
//     dragger_element.style.display = 'block';
//     // allow transitions
//     setTimeout(function () {
//       dragger_element.classList.add('d-transition');
//     }, 0);
//   };
//
//   function set_grayscale_invert_dragger_to(id) {
//     var dragger_element = document.getElementById('grayscale_invert_dragger');
//     var imageEl = document.getElementById(id);
//         // get the filter. example: ('grayscale(0) blur(0px) invert(0) brightness(1) contrast(1) saturate(1) hue-rotate(0deg)')
//     var selected_image_filter = imageEl.style.WebkitFilter;
//         // get the numbers within the grayscale and invert parentheses
//
// //        console.log(imageEl);
//
//
//     var grayscale_Exp = /grayscale\(([^)]+)\)/,
//         invert_Exp = /invert\(([^)]+)\)/,
//         grayscale_matches = grayscale_Exp.exec(selected_image_filter),
//         invert_matches    = invert_Exp.exec(selected_image_filter),
//         // calculate the dragger location
//         draggerTop = ((1 - parseFloat(grayscale_matches[1])) * pageSettings.innerHeight),
//         draggerLeft = (parseFloat(invert_matches[1]) * pageSettings.innerWidth);
//
//
//
//
//     // set the dragger location
//     dragger_element.style.left    = draggerLeft + 'px';
//     dragger_element.style.top     = draggerTop + 'px';
//     dragger_element.style.display = 'block';
//     // allow transitions
//     setTimeout(function () {
//       dragger_element.classList.add('d-transition');
//     }, 0);
//   };
//
//   function set_blur_brightness_dragger_to(id) {
//     var dragger_element = document.getElementById('blur_brightness_dragger'),
//         imageEl = document.getElementById(id),
//         // get the filter. example: ('grayscale(0) blur(0px) invert(0) brightness(1) contrast(1) saturate(1) hue-rotate(0deg)')
//         selected_image_filter = imageEl.style.WebkitFilter,
//         // get the numbers within the blur and brightness parentheses
//         blur_Exp = /blur\(([^)]+)\)/,
//         brightness_Exp = /brightness\(([^)]+)\)/,
//         blur_matches = blur_Exp.exec(selected_image_filter),
//         brightness_matches    = brightness_Exp.exec(selected_image_filter),
//         // calculate the dragger location
//         draggerTop = (parseFloat(blur_matches[1]) * pageSettings.innerHeight / config.blurLevel),
//         draggerLeft = (parseFloat(brightness_matches[1]) * pageSettings.innerWidth / config.brightnessLevel);
//
//     // set the dragger location
//     dragger_element.style.left    = draggerLeft + 'px';
//     dragger_element.style.top     = draggerTop + 'px';
//     dragger_element.style.display = 'block';
//     // allow transitions
//     setTimeout(function () {
//       dragger_element.classList.add('d-transition');
//     }, 0);
//   };
//
//   function set_contrast_saturate_dragger_to(id) {
//     var dragger_element = document.getElementById('contrast_saturate_dragger'),
//         imageEl = document.getElementById(id),
//         // get the filter. example: ('grayscale(0) blur(0px) invert(0) brightness(1) contrast(1) saturate(1) hue-rotate(0deg)')
//         selected_image_filter = imageEl.style.WebkitFilter,
//         // get the numbers within the contrast and saturate parentheses
//         contrast_Exp = /contrast\(([^)]+)\)/,
//         saturate_Exp = /saturate\(([^)]+)\)/,
//         contrast_matches = contrast_Exp.exec(selected_image_filter),
//         saturate_matches = saturate_Exp.exec(selected_image_filter),
//         // calculate the dragger location
//         draggerTop = (parseFloat(contrast_matches[1]) * pageSettings.innerHeight / config.contrastLevel),
//         draggerLeft = (parseFloat(saturate_matches[1]) * pageSettings.innerWidth / config.saturateLevel);
//
//     // set the dragger location
//     dragger_element.style.left    = draggerLeft + 'px';
//     dragger_element.style.top     = draggerTop + 'px';
//     dragger_element.style.display = 'block';
//     // allow transitions
//     setTimeout(function () {
//       dragger_element.classList.add('d-transition');
//     }, 0);
//   };
//
//   function set_party_dragger_to(id) {
//     var dragger_element = document.getElementById('party_dragger'),
//         imageEl = document.getElementById(id),
//         // get the filter. example: ('grayscale(0) blur(0px) invert(0) brightness(1) contrast(1) saturate(1) hue-rotate(0deg)')
//         // and opacity percentage: (0-1)
//         selected_image_filter = imageEl.style.WebkitFilter,
//         selected_image_opacity = parseInt( imageEl.style.opacity * 100) / 100,
//         // get the number within the hue-rotation parentheses
//         hue_rotate_Exp = /hue-rotate\(([^)]+)\)/,
//         hue_rotate_matches = hue_rotate_Exp.exec(selected_image_filter),
//         // calculate the dragger location
//         draggerLeft = (selected_image_opacity * pageSettings.innerWidth),
//         draggerTop = (pageSettings.innerHeight - (parseFloat(hue_rotate_matches[1]) / 360 * pageSettings.innerHeight));
//
//     // set the dragger location
//     dragger_element.style.left    = draggerLeft + 'px';
//     dragger_element.style.top     = draggerTop + 'px';
//     dragger_element.style.display = 'block';
//     // allow transitions
//     setTimeout(function () {
//       dragger_element.classList.add('d-transition');
//     }, 0);
//   };
//
//   function set_threeD_dragger_to(id) {
//     var dragger_element = document.getElementById('threeD_dragger'),
//       imageEl = document.getElementById(id),
//       // calculate the dragger location
//       draggerTop = pageSettings.innerHeight - ((( 180 + parseFloat(imageEl.getAttribute('data-rotateX')) ) / 360) * pageSettings.innerHeight),
//       draggerLeft = (( 180 + parseFloat(imageEl.getAttribute('data-rotateY')) ) / 360) * pageSettings.innerWidth;
//
//     // set the dragger location
//     dragger_element.style.left    = draggerLeft + 'px';
//     dragger_element.style.top     = draggerTop + 'px';
//     dragger_element.style.display = 'block';
//     // allow transitions
//     setTimeout(function () {
//       dragger_element.classList.add('d-transition');
//     }, 0);
//   };
