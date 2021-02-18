// - Default values for sliders and number boxes should be loaded from the ESP module when loading the webpage.
// - Update sliders (and number boxes) when ESP module gets a POST request that will change the value of an analog device.
// - When using the slider on a phone the page scrolls horizontally. Maybe disable scrolling temporary when range element is active.
// - The webpage should sync. For example if a slider is changed on one device it should also change on all other devices using the same webpage.
// - Toast displaying outside visible area on phones.
// - Turn on/off all devices only works with digital and proove devices (devices which have an on/off button).

var rfstationUrl = 'http://192.168.1.140';                            // URL of RF Station
var jsonUrl = 'http://192.168.1.5:5000/Webpage/Json.json';            // URL of JSON file
var jsonFile;                                                         // Global variable to hold the contents of the json file

$.ajax({url: jsonUrl, dataType: "json", cache: false})                // Get the JSON file
  .done(function(data) {                                              // If ajax request succeded:
    jsonFile = data;                                                  // Set variable to the contents of the JSON file
    main();                                                           // Execute main function
  })
  .fail(function(data) {                                              // If ajax request failed:
    document.open();                                                  // Open the document
    document.write(data.responseText);                                // Write data to the document
    document.close();                                                 // Close the document
});

function main() {
  for (var obj of jsonFile) {                                         // Loop through objects in the JSON array
    var previous = room;
    var room = obj.room;                                              // Get the room of the object
    var device = obj.device;                                          // Get the device of the object
    if (previous !== room) {                                          // Check if we're in a new room
      $('<h3>', {text: room}).appendTo('body');                       // Create room text
    }

    var $div = $('<div>', {class: 'buttonDiv', 
                           id: device}).appendTo('body');
    $('<label>', {text: device}).appendTo($div);

    // Create input elements
    switch (obj.type) {                                               // Check type of object
      case 'proove':
      case 'digital':                                                 // Type is digital
        $('<input>', {type: 'button', value: 'On', class: 'on button', 'data-devtype': obj.type}).appendTo($div);
        $('<input>', {type: 'button', value: 'Off', class: 'off button', 'data-devtype': obj.type}).appendTo($div);
        break;
      case 'analog':                                                  // Type is analog
      case 'custom':                                                  // Type is custom
        createAnalogControls($div, obj);                              // Create slider and number box
        break;
      case 'remote':                                                  // Type is remote
        $('<input>', {type: 'button', value: 'Show remote', class: 'button remote'}).appendTo($div);
        createRemoteButtons($div, device);                            // Create all buttons for the remote
        break;
      case 'groups':
        $('<h3>', {text: 'Groups'}).appendTo('body');

        for (var group of obj.devices) {
          var $div = $('<div>', {class: 'buttonDiv', 
                             id: group.name}).appendTo('body');
          $('<label>', {text: group.name}).appendTo($div);

          $('<input>', {type: 'button', value: 'On', class: 'on button', 'data-devtype': 'group', 'data-digital': JSON.stringify(group.on)}).appendTo($div);
          $('<input>', {type: 'button', value: 'Off', class: 'off button', 'data-devtype': 'group', 'data-digital': JSON.stringify(group.off)}).appendTo($div);
        }
        break;
      default:
        alert('Found device without specified type: ' + device);
        return false;
    }
  }

  $('<input>', {type: 'button', value: 'Restart',
                class: 'button extra', id: 'restart'}).appendTo('body');
  $('<input>', {type: 'button', value: 'Get info',
                class: 'button extra', id: 'info'}).appendTo('body');
  $('.button').click(buttonClick);                                    // Add an event listener for button clicks
  $('.analog').change(analogEvent);                                   // Add an event listener for analog devices
  $('.analog').on('input', inputEvent);                               // Add an event listener for analog devices
}

function toggleRemote(target) {
  switch (target.value) {                                             // Check value of element
    case 'Show remote':                                               // Remote buttons are not showing
      target.value = 'Hide remote';                                   // Change the button's value
      target.nextElementSibling.style.display = 'block';              // Show the div element containing buttons
      break;
    case 'Hide remote':                                               // Remote buttons are showing
      target.value = 'Show remote';                                   // Change the button's value
      target.nextElementSibling.style.display = 'none';               // Hide the div element containing buttons
      break;
  }
}

function sendPost(obj) {
  $.ajax({
    url: rfstationUrl + '/deviceCtrl',
    jsonpCallback: "send",
    dataType: "jsonp",
    method: 'GET',
    data: obj
  })
  .done(e => showToast(e.response))
  .fail(e => showToast('There was an error sending the HTTP request', 'error'))
  .always(e => console.log(e));
}

function showToast(message, type='info') {
  var toast = $("#toast");                                            // Get the toast element
  if (type === 'error') {
    toast.css('backgroundColor', '#e60000');                          // Set background color to red
  } else {
    toast.css('backgroundColor', '#333');                             // Set background color to red
  }
  toast.text(message);                                                // Set the text content of the element
  toast.fadeIn(200);                                                  // Show the element
  setTimeout(() => toast.fadeOut(200), 2000);                         // Hide element after a certain time
}

/* ---------- Create elements ---------- */

function createAnalogControls(div, obj) {
  var currentValue = Math.round(obj.max/2);  // Replace with POST request to ESP module

  // Create slider
  $('<input>', {
    class: 'analog', 
    type: 'range',
    min: obj.min,
    max: obj.max,
    value: currentValue
  }).appendTo(div);

  // Create the number box
  $('<input>', {
    class: 'analog', 
    type: 'number',
    min: obj.min,
    max: obj.max,
    value: currentValue,
    autocomplete: 'off'
  }).appendTo(div);

  // Create percent sign
  if (obj.min === 0 && obj.max === 100) {                             // Only create a percentage sign if min value is 0 and max value is 100
    $('<p>', {text: '%', class: 'percentSign'}).appendTo(div);
  }

  $('<input>', {type: 'button', value: 'On', class: 'on button analog', 'data-devtype': 'analog', 'data-value': obj.max}).appendTo(div);
  $('<input>', {type: 'button', value: 'Off', class: 'off button analog', 'data-devtype': 'analog', 'data-value': obj.min}).appendTo(div);
}

function createRemoteButtons(div, device) {
  var $subDiv = $('<div>', {id: device, class: 'remoteDiv'}).appendTo(div);
  var obj = jsonFile.find(object => object.device === device);        // Get object of device
  for (key in obj.buttons) {                                          // Loop through every property of the object
    $('<input>', {type: 'button', value: key, class: 'button remoteButton'}).appendTo($subDiv);
  }
}

/* ------------- Events ------------- */

function inputEvent(e) {
  switch (e.target.type) {                                            // Test the type of the target element
    case 'range':                                                     // Element type is range
      e.target.nextElementSibling.value = e.target.value;             // Change the number box value
      break;
    case 'number':                                                    // Element type is number
      e.target.previousElementSibling.value = e.target.value;         // Change the slider's value
      break;
  }
}

function analogEvent(e) {
  var device = e.target.parentElement.id;
  var value = e.target.value;
  sendPost({device: device, value: value});
}

function buttonClick(e) {
  var device = e.target.parentElement.id;
  var devType = e.target.dataset.devtype;

  if ($(e.target).hasClass('remote')) {
    toggleRemote(e.target);
    return;
  }

  switch (devType) {
    case 'group':
      var ar = JSON.parse(e.target.dataset.digital);
      for (var ar2 of ar) {
        var [device, devtype, value] = ar2;
        sendPost({device: device, value: e.target.value});
      }
      return;
    case 'analog':
      var val = e.target.dataset.value;
      sendPost({device: device, value: val});
      return;
  }

  switch (e.target.id) {
    case 'info':
      $.ajax({
        url: rfstationUrl + '/info',
        jsonpCallback: "jsonCb",
        dataType: "jsonp",
        type: "GET",
        data: {"callback": "jsonCb"}
      })
      .done(e => showToast(e.response))
      .fail(e => showToast('Couldn\'t get info', 'error'))
      .always(e => console.log(e));
      break;
    case 'restart':
      showToast('Restarting RF Station');
      $.post(rfstationUrl + '/restart');
      break;
    default:
      sendPost({device: device, value: e.target.value});
      break;
  }
}
