function playAudio(){
    document.getElementById('chatAudio').play();
}

var socket = io('/');
var videoGrid = document.getElementById('video-grid');
var myVideo = document.createElement('video');
var h=document.createElement('h1');
var myVideoDiv=document.createElement('div');
var participants=[];
myVideo.muted = true;

var peer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: portForPeer,
});

let myVideoStream;

//Add id to my video element
function addIdToMyVideo(video,h1,name){
    // console.log("Adding id",name,video)
    var id=document.createAttribute('id')
    id.value=name;
    video.setAttributeNode(id);
    // var h1=document.createElement('h1');
    h1.innerHTML=name;
    video.parentNode.insertBefore(h1, video.nextSibling);

}

//Add our video div and video element in video-grid div
//If the the metadata is loaded completely after that our video starts to play i.e. our camera becomes on
var addMyVideoStream = function(videoDiv,video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', function() {
        video.play();
    })
    videoDiv.append(video);
    videoGrid.append(videoDiv);
};

//Add video div and video element of others in video-grid div and also add id to video element 
var addOtherVideoStream = function(videoDiv,video,h1, stream,peerId) {
    // console.log("Yehi chaiye pklease dedo",peerId)
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', function() {
        video.play();
    })
    var videoId=document.createAttribute('id');
    videoId.value=peerId;
    videoGrid.append(videoDiv);
    video.setAttributeNode(videoId);
    videoDiv.append(video);
    h1.innerHTML=peerId;
    video.parentNode.insertBefore(h1, video.nextSibling);
};

//Add the name of user who joined in participants array
function addUserToParticipantsList(data){
    data=JSON.stringify(data)
    participants.push(data);
    participants=participants.filter(unique)
    updateUserListDiv();
}

//Remove the name of user from participants array who left the room
function removeUserFromParticipantsList(data){
    var index=participants.indexOf(data);
    participants.splice(index,1);
    updateUserListDiv();
}

const unique = function(value, index, self){
    return self.indexOf(value) === index
  }

//Update the participants array
function updateUserListDiv(){
    var participantDiv=document.getElementById('participants');
    participantDiv.innerHTML="";
    var i=1;
    participants.forEach(function(participant){
        participantDiv.innerHTML=participantDiv.innerHTML + "<h2>"+i+". "+JSON.parse(participant).name+"</h2>"
        i++;
      })  
}

//
var connectToNewUser = function(userId, stream,userName) {
    //This function will work if and only if username is there (not undefined)
    if(userName){
        okButton.innerHTML="OK";
        okButton.style.display="block";
        displayAlert(userName+" joined","Notification");
        playAudio();
        //   console.log("Connecting to new user");
        //This function will call a user with userId passed and it will pass the stream to that user/peerId
        var call = peer.call(userId, stream,{metadata:{name:name}});
        var videoDiv=document.createElement('div')
        var video = document.createElement('video');
        var h1 = document.createElement('h1');
        var conn=peer.connect(userId)

    
        //Callback will give us the stream of the user who we called above // `userDataStream` is the MediaStream of the remote peer.
        call.on('stream', function(userVideoStream)  {
            // console.log("Adding video stream",call,call.peer)
            //We are taking stream from the other user that we are calling and adding it to out own custom video element on our page
            addOtherVideoStream(videoDiv,video, h1,userVideoStream,userName);
            // console.log(videoDiv,video, h1,userVideoStream,userName)
            addUserToParticipantsList({peerId:call.peer,name:userName})
        })

    //Whenever someone leaves the video call we want to remove their video
    call.on('close',function(){
        // console.log("removing User at",new Date())
        removeUserFromParticipantsList({peerId:call.peer,name:userName})
        okButton.innerHTML="OK";
        okButton.style.display="block";
        displayAlert(userName+" left","Notification");
        playAudio();
        video.remove();
        h1.remove();
        videoDiv.remove();
    })

    peer[userId]=call;
    }  
}

//If number of user in room will be more than 6 then limit will be true 
socket.on('user-limit',function(limit){
    if(limit){
        window.location.href = "/";
    }
})

//Emitted when a connection to the PeerServer is established.
peer.on('open', function(id){
    socket.emit('join-room', ROOM_ID, id,name);
});

//coneecting our video
//stream is out audio and video
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    var currentName=name;
    addUserToParticipantsList({peerId:peer.id,name:currentName})
    myVideoStream = stream;
    addMyVideoStream(myVideoDiv,myVideo, stream);
    addIdToMyVideo(myVideo,h,currentName);

    //When someone tries to call us we will send our stream through it
    peer.on('call', function(call) {   
        var currentName=name;
        //Answering the call by sending out stream 
        call.answer(stream)
        var videoDiv=document.createElement('div');
        var video = document.createElement('video');
        var h1=document.createElement('h1')
        //Recieve video stream from the user whom we are answering
        call.on('stream', function(userVideoStream) {
            // console.log("Adding incoming video stream",call,userVideoStream)
            //Add video stream in html of the user whom we are answering
            addOtherVideoStream(videoDiv,video,h1, userVideoStream,call.options.metadata.name);
            addUserToParticipantsList({peerId:call.peer,name:call.options.metadata.name})
        })
        //Removing video div and video tag of the user who we were anwering when he leaves
        call.on('close',function(){
            // console.log("removing User",video.nextElementSibling);
            removeUserFromParticipantsList({peerId:call.peer,name:call.options.metadata.name})
            okButton.innerHTML="OK";
            okButton.style.display="block";
            displayAlert(call.options.metadata.name+" left","Notification");
            playAudio();
            video.remove();
            h1.remove();
            videoDiv.remove();
        })
    })

    //This event is listened whenever a new user joins
    socket.on('user-connected', function(userId,userName){
    //   console.log("User connected with userId",userId,userName)
        connectToNewUser(userId, stream,userName);
    })

    //This event is listened whenever a new user leaves
    socket.on('user-disconnected', function(userId){
        // console.log("User disconnected with userId",userId,"at",new Date());    
        connectToNewUser(userId, stream); 
      })
}).catch(function(err){
    okButton.innerHTML="OK"
    okButton.style.display="block"
    displayAlert(err,"Error");
    playAudio();
    okButton.onclick=function(){
        window.location.href="/";
    }
    // alert(err,"Your camera is not starting or you did not allow the site to use camera or microphone");
    // window.close();
})


//For displaying participants and chat box
var rightDiv=document.getElementsByClassName("main_right");
var participantsDiv=document.getElementById("participants_div");
var chatDiv=document.getElementById("chat_div");
var chatDot=document.getElementById("chat-dot");
var chatDisplayed=false;
var participantsDisplayed=false;
function displayParticipants(){
    if(!rightDiv[0].style.display && !participantsDiv.style.display){      
        rightDiv[0].style.display="flex";
        participantsDiv.style.display="flex";
    }else if(rightDiv[0].style.display==="none" && participantsDiv.style.display==="none"){
        rightDiv[0].style.display="flex";
        participantsDiv.style.display="flex";
    }else if(!participantsDiv.style.display && rightDiv[0].style.display==="none"){
        rightDiv[0].style.display="flex";
        participantsDiv.style.display="flex";
    }
    else if(rightDiv[0].style.display==="flex" && participantsDiv.style.display==="flex"){
        rightDiv[0].style.display="none";
        participantsDiv.style.display="none";
    }else if(rightDiv[0].style.display==="flex" && chatDiv.style.display==="flex"){
        chatDiv.style.display="none";
        participantsDiv.style.display="flex"; 
    }    
}
function displayChats(){
    if(!rightDiv[0].style.display && !chatDiv.style.display){      
        rightDiv[0].style.display="flex";
        chatDiv.style.display="flex";
        chatDot.style.display="none";
    }else if(rightDiv[0].style.display==="none" && chatDiv.style.display==="none"){
        rightDiv[0].style.display="flex";
        chatDiv.style.display="flex";
        chatDot.style.display="none";
    }else if(!chatDiv.style.display && rightDiv[0].style.display==="none"){
        rightDiv[0].style.display="flex";
        chatDiv.style.display="flex";
        chatDot.style.display="none";
    }else if(rightDiv[0].style.display==="flex" && chatDiv.style.display==="flex"){
        rightDiv[0].style.display="none";
        chatDiv.style.display="none";
    }else if(rightDiv[0].style.display==="flex" && participantsDiv.style.display==="flex"){
        chatDiv.style.display="flex"; 
        participantsDiv.style.display="none"; 
        chatDot.style.display="none";
    }
}









var text = document.getElementById('chat_message');
    $('html').keydown(function(e) {
        var messageText=text.value.trim();
        if (e.which == 13 && messageText.length !== 0) {
            socket.emit('message', {text:messageText,name:name});
            // console.log(text.value);
            text.value='';
        }
    });

    socket.on('createMessage', function(message) {
        var time=getTime();
        $('ul').append(`<li class="message" style="width: 90%;word-wrap: break-word;"><span><h3 style="display:inline-block;margin:0%;font-weight: 450;">${message.name}</h3></span><p style="display:inline-block;margin:0%;padding-left:2rem">${time}</p><h5 style="margin:0%; font-weight: 400;">${message.text}</h5></li>`)
        if(chatDiv.style.display==="none" || !chatDiv.style.display){
            chatDot.style.display="block";
            playAudio();
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


var scrollToBottom = function() {
    let d = $('main_chat_window');
    d.scrollTop(d.prop("scrollHeight"));
}
var setMuteButton = function() {
    var html = `
    <i onclick="muteUnmute()" class="fas fa-microphone"></i>
    <h5 onclick="muteUnmute()">Mute</h5>`
    $('.main_mute_button').html(html);
}

var setUnmuteButton = function() {
    var html = `
    <i onclick="muteUnmute()" class="unmute fas fa-microphone-slash"></i>
    <h5 onclick="muteUnmute()">Unmute</h5>`
    $('.main_mute_button').html(html);
}

var muteUnmute = function() {
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

var leaveMeet=function(){
    window.close();
}

var copyRoomId=function(){
    okButton.innerHTML="OK";
    okButton.style.display="block";
    displayAlert('<div style="display: flex;padding: 0.5rem;font-size: 1.25rem;"><input type="text" id="room-id-input" value="'+ROOM_ID+'" style="color:#17a2b8;border: none;background-color: transparent;flex:0.9;text-decoration:none" readonly><i class="fas fa-copy" id="copy-button" style="flex:0.1;"></i></div>',"Room Id")
    var copyButton=document.getElementById("copy-button");
    var roomIdInput=document.getElementById("room-id-input")
    copyButton.onclick=function() { 
        roomIdInput.select();
        document.execCommand("copy");
    }
}




startTime();
function startTime() {
    var today = new Date();
    var h = today.getHours();
    var m = today.getMinutes();
    h=checkTime(h);
    m = checkTime(m);
    document.getElementById("time").innerHTML =h + ":" + m+ " |";
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


