function playAudio(){
    document.getElementById('chatAudio').play();
}

var videoGrid = document.getElementById('video-grid');
var myVideoDiv=document.createElement('div');
var myVideo = document.createElement('video');
var numberOfusers=0;
myVideo.muted = true;

var peer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: portForPeer
});

let myVideoStream;

function addIdToVideo(video,name){
    console.log("Adding id",name)
    var id=document.createAttribute('id')
    id.value=name;
    video.setAttributeNode(id);
    var h1=document.createElement('h1');
    h1.innerHTML=name;
    video.parentNode.insertBefore(h1, video.nextSibling);
}

 //If the the metadata is loaded completely after that our video starts to play i.e. our camera becomes on
var addVideoStream = (videoDiv,video, stream) => {
    video.srcObject = stream;
    
    video.addEventListener('loadedmetadata', () => {
        video.play();
    })
    videoGrid.append(videoDiv);
    videoDiv.append(video);
    console.log("Hehe",video)
};

var connectToNewUser = (userId, stream,currentName) => {
  console.log("Connecting to new user",stream);
  //This function will call a user with userId passed and it will pass the stream to that user
    var call = peer.call(userId, stream);
    var videoDiv=document.createElement('div');
    var video = document.createElement('video');
    var h1=document.createElement('h1');
    var conn=peer.connect(userId)
    var userName;


    //THis events does that when we call this user we're gonna send them 
    //our video stream and when they send us back their video 
    //stream we are gonna get this event here called the 
    //stream which is going to take their video stream so 
    call.on('stream', userDataStream => {
        console.log("Adding video stream",userDataStream)
        //We are taking stream from the other user that we are calling and adding it to out own custom video element on our page
        addVideoStream(videoDiv,video,userDataStream);
    })

    //Whenever someone leaves the video call we want to remove their video so we use the following code
    call.on('close',function(){
        console.log("removing User at",new Date())
        videoDiv.remove();
        video.remove();
    })
   
    conn.on('open', function() {
        // Receive messages
        conn.on('data', function(data) {
            userName=data;
            console.log('Received', data);
            addIdToVideo(video,userName)
        });

        // Send messages
        conn.send(currentName);    
        })
    
    
    peer[userId]=call;
    // peer[userId]=conn;
}

//coneecting our video
//stream is out audio and video

// socket.on('user-limit',function(limit){
//     if(limit){
//         window.location.href = "/";
//     }
// })

peer.on('open', id => {
    console.log("Opening peer")
    socket.emit('joined-call',callId,id,name,recieverHandlename,callerHandlename);
});
// var conn = peer.connect('dest-peer-id');

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
}).then(stream => {
    //Storing name of current user
    var currentName=name;

    //Calling the reciever only after camera is on 
    socket.emit('make-the-recieving-call-event-emit')
    myVideoStream = stream;
    addVideoStream(myVideoDiv,myVideo, stream);
    addIdToVideo(myVideo,currentName);
    console.log("Tik TIk")
    //When someone tries to call us we will send our stream through it i.e. send get user stream from 1st user and send stream of 2nd user to 1st user
    peer.on('call', call => {
        call.answer(stream)
        console.log("answering",stream)
        var videoDiv=document.createElement('div');
        var video = document.createElement('video');
        var userName;
        //the callback of the connection event will both provide a DataConnection object. This object will allow you to send and receive data
        peer.on('connection', function(conn) {  
            //Emitted when the connection is established and ready-to-use.     
            conn.on('open', function() {
                console.log('conn open');
                // Sends data to the user to which we are trying to connect i.e. the 1st user
                conn.send(currentName);
                //Recieve data from user to whom we are answering i.e. to 1st user
                conn.on('data', function(data) {
                    userName=data;
                    console.log("Received",name);
                    addIdToVideo(video, userName);
                });
            });
        });
        
        call.on('stream', userDataStream => {
            console.log("YAHA SE KAR RAHA HU",call)
            addVideoStream(videoDiv,video, userDataStream)
        })
        call.on('close',function(){
            console.log("removing User 1")
            videoDiv.remove();
            video.remove();
        })
    })


    socket.on('user-connected', (userId,name) => {
        okButton.innerHTML="OK";
        okButton.style.display="block";
        noButton.style.display="none";
        displayAlert(name +" joined","Notification")
        playAudio();
        okButton.onclick=function(){
            modal.style.display="none";
        }
    // window.alert(name +" joined")
      console.log("User connected with userId",userId,stream)
        connectToNewUser(userId, stream,currentName);
    })

    socket.on('user-disconnected', (userId,name) => {
        okButton.innerHTML="YES";
        noButton.innerHTML="NO";
        okButton.style.display="block";
        noButton.style.display="block";     
        displayAlert(name+" left. Leave call","Notification")
        playAudio();
        okButton.onclick=function(){
            window.close();
            noButton.style.display="none";
        }
        // alert(name+" left");
        // var leave=confirm("Leave Call")
        // if(leave){
        //     window.close()
        // }     
        console.log("User disconnected with userId",userId,"at",new Date()); 
        connectToNewUser(userId,stream,name); 
      })
}).catch(function(err){
    alert(err,"Your camera is not starting or you did not allow the site to use camera or microphone");
    window.close();
})



var text = document.getElementById('chat_message');
    $('html').keydown(e => {
        var messageText=text.value.trim();
        if (e.which == 13 && messageText.length !== 0) {
            socket.emit('message', {text:messageText,name:name});
            console.log(text.value);
            text.value='';
        }
    });

    socket.on('createMessage', function(message) {
        var time=getTime();
        $('ul').append(`<li class="message" style="width: 90%;word-wrap: break-word;"><span><h3 style="display:inline-block;margin:0%;font-weight: 450;">${message.name}</h3></span><p style="display:inline-block;margin:0%;padding-left:2rem">${time}</p><h5 style="margin:0%; font-weight: 400;">${message.text}</h5></li>`)
        if(chatDiv.style.display==="none" || !chatDiv.style.display){
            playAudio();
            chatDot.style.display="block";
        }
        scrollToBottom();
    })

    var setPlayVideo =function () {
    var html = `
    <i  onclick="playStop()" class="stop fas fa-video-slash"></i>
    <h5  onclick="playStop()">Play Video</h5>`
    $('.main_video_button').html(html);
}

var setStopVideo = function() {
    var html = `
    <i  onclick="playStop()" class="fas fa-video"></i>
    <h5  onclick="playStop()">Stop Video</h5>`
    $('.main_video_button').html(html);
}


var playStop = function() {
    let enabled = myVideoStream.getVideoTracks()[0].enabled;
    if(enabled){
        myVideoStream.getVideoTracks()[0].enabled = false;
        myVideo.style.backgroundColor="white"
        setPlayVideo();
    }
    else {
        setStopVideo();
        myVideoStream.getVideoTracks()[0].enabled = true;
    }
}


var scrollToBottom = () => {
    let d = $('main_chat_window');
    d.scrollTop(d.prop("scrollHeight"));
}
var setMuteButton = () => {
    var html = `
    <i onclick="muteUnmute()" class="fas fa-microphone"></i>
    <h5 onclick="muteUnmute()">Mute</h5>`
    $('.main_mute_button').html(html);
}

var setUnmuteButton = () => {
    var html = `
    <i onclick="muteUnmute()" class="unmute fas fa-microphone-slash"></i>
    <h5 onclick="muteUnmute()">Unmute</h5>`
    $('.main_mute_button').html(html);
}

var muteUnmute = () => {
    var enabled = myVideoStream.getAudioTracks()[0].enabled;
    if(enabled){
        myVideoStream.getAudioTracks()[0].enabled = false;
        setUnmuteButton();
    }
    else {
        setMuteButton();
        myVideoStream.getAudioTracks()[0].enabled = true;
    }   
}

startTime();
function startTime() {
    var today = new Date();
    var h = today.getHours();
    var m = today.getMinutes();
    h=checkTime(h);
    m = checkTime(m);
    document.getElementById("time").innerHTML =h + ":" + m;
    var t = setTimeout(startTime, 500);
  }
function checkTime(i) {
if (i < 10) {i = "0" + i}; 
return i;
}

function getTime(){
    var today = new Date();
    var h = today.getHours();
    var m = today.getMinutes();
    h=checkTime(h);
    m = checkTime(m);
    return h +":"+m;
}