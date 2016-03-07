/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var audioElement1 = document.createElement("audio");
audioElement1.id = "audio1";
document.getElementsByTagName('body')[0].appendChild(audioElement1);


var audioElement2 = document.createElement("audio");
audioElement2.id = "audio2";
document.getElementsByTagName('body')[0].appendChild(audioElement2);


var audioInput1Select = document.querySelector('select#audioInput1');
var audioOutput1Select = document.querySelector('select#audioOutput1');
var audioInput2Select = document.querySelector('select#audioInput2');
var audioOutput2Select = document.querySelector('select#audioOutput2');
var selectors = [audioInput1Select, audioOutput1Select, audioInput2Select, audioOutput2Select];

var call1StartBtn = document.getElementById("call1StartBtn");
var call1StopBtn = document.getElementById("call1StopBtn");

var call2StartBtn = document.getElementById("call2StartBtn");
var call2StopBtn = document.getElementById("call2StopBtn");


function gotDevices(deviceInfos) {
  // Handles being called several times to update labels. Preserve values.
  var values = selectors.map(function(select) {
    return select.value;
  });

  selectors.forEach(function(select) {
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }
  });

  for (var i = 0; i !== deviceInfos.length; ++i) {
    var deviceInfo = deviceInfos[i];
    var option1 = document.createElement('option');
    var option2 = document.createElement('option');
    option1.value = deviceInfo.deviceId;
    option2.value = deviceInfo.deviceId;

    if (deviceInfo.kind === 'audioinput') {
      console.log("Set input option text");
      option1.text = deviceInfo.label || 'microphone ' + (audioInput1Select.length + 1);
      option2.text = deviceInfo.label || 'microphone ' + (audioInput1Select.length + 1);

      audioInput1Select.appendChild(option1);
      audioInput2Select.appendChild(option2);
    } else if (deviceInfo.kind === 'audiooutput') {
      console.log("Set output option text");
      option1.text = deviceInfo.label || 'speaker ' + (audioOutput1Select.length + 1);
      option2.text = deviceInfo.label || 'microphone ' + (audioInput1Select.length + 1);

      audioOutput1Select.appendChild(option1);
      audioOutput2Select.appendChild(option2);

    } else if (deviceInfo.kind === 'videoinput') {
      // Ignore video
    } else {
      console.log('Some other kind of source/device: ', deviceInfo);
    }
  }
  selectors.forEach(function(select, selectorIndex) {
    if (Array.prototype.slice.call(select.childNodes).some(function(n) {
      return n.value === values[selectorIndex];
    })) {
      select.value = values[selectorIndex];
    }
  });
}

navigator.mediaDevices.enumerateDevices()
.then(gotDevices)
.catch(errorCallback);

function errorCallback(error) {
  console.log('navigator.getUserMedia error: ', error);
}

// Attach audio output device to video element using device/sink ID.
function attachSinkId(element, sinkId) {
  if (typeof element.sinkId !== 'undefined') {
    element.setSinkId(sinkId)
    .then(function() {
      console.log('Success, audio output device attached: ' + sinkId);
    })
    .catch(function(error) {
      var errorMessage = error;
      if (error.name === 'SecurityError') {
        errorMessage = 'You need to use HTTPS for selecting audio output ' +
            'device: ' + error;
      }
      console.error(errorMessage);
      // Jump back to first output device in the list as it's the default.
      audioOutput1Select.selectedIndex = 0;
    });
  } else {
    console.warn('Browser does not support output device selection.');
  }
}
window.ua = new SIP.UA();

var logSession = function(session) {

  session.on('progress', function () {
    console.log('Ringing...');
  });

  session.on('accepted', function () {
    console.log('Connected...');
  });

  session.on('failed', function () {
    console.log('Failed...');
  });

  session.on('bye', function () {
    console.log('Byte...');
  });

}

var call1Session;
var call2Session;

function stopCall(session) {

  if(session != undefined) {
    session.bye();
  }
  else {
    console.log("Unable to end session");
  }
}

function stopCall1() {
  stopCall(call1Session);
  call1StartBtn.setAttribute("class","visible");
  call1StopBtn.setAttribute("class","hidden");

}

function stopCall2() {
  stopCall(call2Session);

  call2StartBtn.setAttribute("class","visible");
  call2StopBtn.setAttribute("class","hidden");


}

function call1() {

  call1StartBtn.setAttribute("class","hidden");
  call1StopBtn.setAttribute("class","visible");

  var audio1 = document.getElementById('audio1');

  var audioDestination1 = audioOutput1Select.value;
  // attachSinkId(audio1, audioDestination1);

  var constraints1 = {
    media: {
      stream: window.stream1,
      render: {
        remote: {
          audio: audio1
        },
        local: {
          audio: audio1
        }
      }
    }
  };

  audio1.src = window.URL.createObjectURL(window.stream1);
  call1Session = window.ua.invite('15555557998@webrtctest.onsip.com', audio1);

  // Applying the hack to set a particular output device id.
  call1Session.on('accepted', function() {
    setSinkIdByHack(audio1, call1Session, audioOutput1Select.value);
  });

  logSession(call1Session);
}

function call2() {

  call2StartBtn.setAttribute("class","hidden");
  call2StopBtn.setAttribute("class","visible");

  var audio2 = document.getElementById('audio2');
  var audioDestination2 = audioOutput2Select.value;
  // attachSinkId(audio2, audioDestination2);

  var constraints2 = {
    media: {
      stream: window.stream2,
      render: {
        remote: {
          audio: audio2
        },
        local: {
          audio: audio2
        }
      }
    }
  };
  audio2.src = window.URL.createObjectURL(window.stream2);
  call2Session = window.ua.invite('15555557998@webrtctest.onsip.com', audio2);


  // Applying the hack to set a particular output device id.
  call2Session.on('accepted', function() {
    setSinkIdByHack(audio2, call2Session, audioOutput2Select.value);
  });

  logSession(call2Session);
}

function setSinkIdByHack(audioTag, session, newSinkId) {
  var ctx = new AudioContext(); // There can be only 6 instances of AudioContext.
  var remoteStream = session.getRemoteStreams()[0];
  var srcNode = ctx.createMediaStreamSource(remoteStream);

  var destNode = ctx.createMediaStreamDestination();
  srcNode.connect(destNode);

  audioTag.src = URL.createObjectURL(destNode.stream);
  audioTag.play();

  attachSinkId(audioTag, newSinkId);
  // audioTag.setSinkId(newSinkId);
}


function start() {
  if (window.stream1) {
    window.stream1.getTracks().forEach(function(track) {
      track.stop();
    });
  }

  if (window.stream2) {
    window.stream2.getTracks().forEach(function(track) {
      track.stop();
    });
  }

  var audioSource1 = audioInput1Select.value;
  var constraints1 = {
    audio: {deviceId: audioSource1 ? {exact: audioSource1} : undefined}
  };

  // Get stream for first audio input device
  navigator.mediaDevices.getUserMedia(constraints1)
  .then(function(stream) {

    window.stream1 = stream; // make stream available to console
    // Refresh button list in case labels have become available
    return navigator.mediaDevices.enumerateDevices();
  })
  .then(gotDevices)
  .catch(errorCallback);


  var audioSource2 = audioInput2Select.value;
  var constraints2 = {
    audio: {deviceId: audioSource2 ? {exact: audioSource2} : undefined}
  };

  // Get stream for second audio input device
  navigator.mediaDevices.getUserMedia(constraints2)
      .then(function(stream) {

        window.stream2 = stream; // make stream available to console
        // Refresh button list in case labels have become available
        return navigator.mediaDevices.enumerateDevices();
      })
      .then(gotDevices)
      .catch(errorCallback);

}

start();
