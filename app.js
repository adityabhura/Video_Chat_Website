var express=require('express');
var app=express();
var bodyParser=require("body-parser");
var mongoose=require("mongoose");
var passport=require("passport");
var localStrategy=require("passport-local");
var server=require('http').Server(app);
var io=require('socket.io')(server);
var methodOverride=require("method-override");
var flash=require("connect-flash");
const { v4: uuidv4 } = require("uuid");

app.set("view engine","ejs");


// app.use(bodyParser.json()) basically tells the system that you want json to be used.
// bodyParser.urlencoded({extended: ...}) basically tells the system whether you want to use 
// a simple algorithm for shallow parsing (i.e. false) or complex 
// algorithm for deep parsing that can deal with nested objects (i.e. true).
app.use(bodyParser.urlencoded({extended:true}));
// app.use(bodyParser.json());


// mongoose.connect("mongodb://localhost/exposys");
mongoose.connect("mongodb+srv://video-chat-app:aditya02@video-chat-app.zpjqs.mongodb.net/myFirstDatabase?retryWrites=true&w=majority",function(res,req){
    console.log("Database Connected");
});

var Users=require("./models/users.js");;
// var {findById,db}=mongoose.model("Users",User);

app.use(require("express-session")({
    //Secret key is used to encrypt the data before it is used
    secret:"My name is Aditya Bhura",
    //
    resave:false,
    //It means that untill and unless user is not loged in the session data will not be stored on server side
    saveUninitialized:false
}))

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(Users.serializeUser());
passport.deserializeUser(Users.deserializeUser());

passport.use(new localStrategy(Users.authenticate()));

app.use(flash());

app.use(function(req,res,next){
    res.locals.currentUser=req.user;
    res.locals.error=req.flash("error");
    res.locals.success=req.flash("success");
    next();
})

app.use(methodOverride("_method"));

// const { findById, db } = require("./models/users.js");

app.use(express.static(__dirname + "/public"))




    // console.log("Development");
    var portForPeer=3000
    var portUsing=3000

  if (process.env.NODE_ENV === "production") {
    console.log("Production");
    var portUsing=process.env.PORT;
    var portForPeer=443
  }
  const { ExpressPeerServer } = require("peer");
  const peerServer = ExpressPeerServer(server, {
    debug: true,
  });
  app.use("/peerjs", peerServer);


var roomIdSchema=new mongoose.Schema({
    roomId:String
})
var roomIds=mongoose.model("roomIds",roomIdSchema);

var callIdSchema=new mongoose.Schema({
    callId:String
})
var callIds=mongoose.model("callIds",callIdSchema);

//Index Route
app.get("/",function(req,res){
    if(req.isAuthenticated()){
        currentUser=req.user;
        Users.findById(currentUser._id).populate({path:"friends",model:Users}).exec(function(err,user){
            if(err){
                res.send(err)
            }else{   
                res.render("index",{friendsArray:user.friends})
            }
        
        })
    }else{
        // res.send("You are not allowed to do it")
        res.redirect("/home")
    }
})

//Index route when no signed in
app.get("/home",isNotLoggedIn,function(req,res){
    res.render('home');
})

//Sign up route
app.get("/signup",isNotLoggedIn,function(req,res){
    res.render('signup');
})

//Sign up post route
app.post("/signup",isNotLoggedIn,function(req,res){
    Users.register(new Users({username:req.body.username,email:req.body.username,handlename:req.body.handlename,name:req.body.name}),req.body.password,function(err,user){
        if(err){
                console.log(err);
                res.send("Error",err);
        }else{
            passport.authenticate("local")(req,res,function(){
            res.redirect("/profile/"+user.handlename);
            })
        }
    })
})

//Sign in route
app.get("/signin",isNotLoggedIn,function(req,res){
    res.render("signin");
})

//Sign in post route
app.post("/signin",isNotLoggedIn,function(req,res,next){
    Users.findOne({username:req.body.username},function(err,user){
        if(!user){
                req.flash("error","Invalid Email or Password")
                res.redirect("/signin");             
        }else{
             return next();
        }
    })
    },passport.authenticate("local",{
    successRedirect:"/",
    failureRedirect:"/signin",
    failureFlash:"Invalid Email or Password"
}),function(req,res){
})

//Signout post route
app.post("/signout",isLoggedIn,function(req,res){
    req.logout();
    console.log("Logged out")
    res.redirect("/home");
})

//Clear database
// app.get("/cleardata",function(req,res){
//     Users.deleteMany({},function(err){
//         if(err){
//             res.send(err);
//         }else{
//             res.redirect("/home")
//         }
//     })
// })

//User profile route
app.get("/profile/:handlename",isLoggedIn,function(req,res){
    // console.log(req.user,req.session)
    Users.findOne({handlename:req.params.handlename},function(err,user){
        if(!user){
             res.send("User does not exist")   
        }else{
        if(err){
            res.send(err)
        }else{   
            res.render("profile",{user:user})
        }
    }
    })
    
})

//Edit profile route
app.get("/profile/:handlename/edit",checkAuthorisation,function(req,res){
    Users.findOne({handlename:req.params.handlename},function(err,user){
       if(err){
           res.send(err)
       }else{   
           res.render("editprofile",{user:user});
       }   
})
})

//Edit profile put route
app.put("/profile/:handlename/edit",checkAuthorisation,function(req,res){
    Users.findOneAndUpdate({handlename:req.params.handlename},req.body.userData,function(err,user){
       if(err){
           res.send(err)
       }else{   
           res.redirect("/profile/"+req.params.handlename)
       }
    
})
})

//Search friend route
app.get("/searchfriend",isLoggedIn,function(req,res){
    res.render("search");
})

//Create room route
app.get("/room",isLoggedIn,function(req,res){
    var roomId=uuidv4()
    roomIds.create({roomId:roomId});
    res.redirect('/room/'+ roomId);
})

//Room route
app.get("/room/:id",isLoggedIn,function(req,res){
    roomIds.findOne({roomId:req.params.id},function(err,roomId){
        if(err){
            res.send(err);
        }else{
            if(!roomId){
                res.send("Room does not exists")
            }else{
                res.render("room",{roomId:roomId.roomId,portForPeer:portForPeer})
            }
        }
    })

})

//Post route for joining room
app.post("/joinroom",isLoggedIn,function(req,res){
    var roomId=req.body.roomId;
    roomIds.findOne({roomId:req.body.roomId},function(err,room){
        if(!room){
            req.flash("error","Room does not exist");
            res.redirect("/");
        }else{
            res.redirect('/room/'+ roomId);
        }
    })
})

//Friends route for seeing friends and friend requests
app.get("/:handlename/friends",checkAuthorisation,function(req,res){
    Users.findOne({handlename:req.params.handlename}).populate({path:"friends",model:Users}).populate({path:"friendRequest",model:Users}).exec(function(err,user){
        if(!user){
             res.send("User does not exist")   
        }else{
        if(err){
            res.send(err)
        }else{   
            res.render("friends",{user:user})
        }
    }
    })
})

//Call route
app.get("/call/:callId",isLoggedIn,function(req,res){
    callIds.findOne({callId:req.params.callId},function(err,callId){
        if(err){
            res.send(err);
        }else{
            if(!callId){
                res.send("Call does not exists")
            }else{
                if(req.query.callingUser==req.user.handlename || req.query.recievingUser==req.user.handlename){
                    res.render("call",{callId:req.params.callId,query:req.query,portForPeer:portForPeer})
                }else{
                    res.send('You are not allowed to attend this call');
                }
                
            }
        }
    })  
})

//leave call route
app.get("/leaveCall",function(req,res){
    res.render("leftcall");
})

app.get("*",function(req,res){
    res.send("LOL! Page does not exist");
})

server.listen(portUsing,function(req,res){
    console.log("Server listenting to port 3000");
})

//Checking if the person is logged in or not. If logged in then send next
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }else{
        // res.send("You are not allowed to do it")
        res.redirect("/home")
    }  
}

//Checking if the person is logged in or not. If not logged in then send next
function isNotLoggedIn(req,res,next){
    if(!req.isAuthenticated()){
        return next();
    }else{
        // res.send("You are not allowed to do it")
        res.redirect("/")
    }
    
}

//Checking the current user and the user searched for
function checkAuthorisation(req,res,next){
    if(req.isAuthenticated()){
       Users.findOne({handlename:req.params.handlename},function(err,User){
        if(!User){
            req.flash("error","User does not exist");
                   res.redirect("/"); 
       }else{
            if(err){
               console.log(err);
               res.redirect("back");
           }else{
               if(req.user && User._id.equals(req.user._id)){
                   next();
               }else{
                   req.flash("error","You are not allowed to do that");
                   res.redirect("/");
                // res.send("You are not allowed to do it")
               }
           }
        }
       })
   } 
   }


//Socket.io code goes here
io.on('connect',function(socket){

    console.log("User joined with Socket Id",socket.id);
    
    //This event will store the socket id in the database of the user
    socket.on('store-socket-id-in-db',function(currentUserId){
        Users.findById(currentUserId,function(err,user){
            if(err){
                console.log(err);
            }else{
                if(!user){
                    console.log("No User")
                }else{
                user.socketId=socket.id;
                //Socket will join the handlename i.e. it will be associated with the current handlename
                socket.join(user.handlename)
                user.save();

                socket.on("disconnect",function(reason){
                    if(reason==='ping timeout'){
                        // console.log('ping timeout')
                    }else{
                        user.socketId="";
                        user.save();
                    }                
                })
                }
            }         
        })
    })

    /****** Socket.io code for checking unique handlename and username starts here ******/
    //This event will check weather the username send from client side javascript is  already present in database or not 
    socket.on('checkUsername',function(data){
        Users.findOne({username:data.username},function(err,user){
            if(user){
                // console.log(user)
                //This event will send true to client side if the username that came from client side is present in the database 
                socket.emit('alertForUsername',{present:true})
            }else{
                //This event will send false to client side if the username that came from client side is not present in the database 
                socket.emit('alertForUsername',{present:false})
            }
        })
    })

    //This event will check weather the handlename send from client side javascript is  already present in database or not 
    socket.on('checkHandlename',function(data){
        Users.findOne({handlename:data.handlename},function(err,user){
            if(user){
                // console.log(user)
                //This event will send true to client side if the handlename that came from client side is present in the database 
                socket.emit('alertForHandlename',{present:true})
            }else{
                 //This event will send false to client side if the handlename that came from client side is not present in the database
                socket.emit('alertForHandlename',{present:false})
            }
        })
    })

    /****** Socket.io code for checking unique handlename and username ends here ******/


    /****Socket.io code for searching users starts here****/
    //This event will search for the handlename or the name coming from client side in the database and send the matching results to the client side
    //search-result event will send the matched results to the client side
    socket.on('search',function(data){
        //For handlename
        if(data.type=='handlename'){
            Users.find({handlename:new RegExp(data.text,"i")},function(err,result){
                if(err){
                    socket.emit('search-results',{result})
                }else{
                    socket.emit('search-results',{result})
                }   
            })
        //For name
        }else if(data.type=='name'){
            Users.find({name:new RegExp(data.text,"i")},function(err,result){
                if(err){
                    socket.emit('search-results',{result})
                }else{
                    socket.emit('search-results',{result})
                }   
            })
        }
    })
    /****Socket.io code for searching users ends here****/


    /****Socket.io code for video chat room starts here****/
    //This event is listened whenever someone joins a room
    //user-limit event sends true or false back to the server. If the number of users in the room is more than 6 than it will send true and if not then it will send false
    //user-connected event will broadcast to all other socket in the room that a new socket has joined i.e. emitted to all other in the room when a new user has joined room
    socket.on("join-room", function(roomId, userId,name){
        //Socket id of the user is now associated with the room id 
        socket.join(roomId);
        //The variable stores the number of sockets who are currently in the room, once the socket is disconnected it will be removed from the room i.e. no longer associated with it
        var numberOfUsers=io.sockets.adapter.rooms.get(roomId).size;
        if(numberOfUsers<=6){
            // console.log(io.sockets.adapter.rooms.get(roomId).size)
            socket.emit('user-limit',false)
            socket.broadcast.to(roomId).emit("user-connected", userId,name);
        }else{
            socket.emit('user-limit',true)
        }
        
        //Event will send the message to all in the room
        socket.on("message", function(message){
          io.to(roomId).emit("createMessage", message);
        });
        
        //When a socket is disconnected i.e. a user leaves the room. His socket id will be removed from the roomId i.e. no longer associated with the room id
        socket.on('disconnect',function(){
          console.log("User disconnected");
          if(!io.sockets.adapter.rooms.get(roomId)){
              //Remove roomId from roomIds collection as room has no one
              roomIds.deleteOne({roomId:roomId});
          }
          //This event will send all other in the room that the user has disconnected
          socket.broadcast.to(roomId).emit("user-disconnected", userId);
        })
    
      });
    /****Socket.io code for video chat room ends here****/


    /****Socket.io code for sending friend request starts here****/
      //This event will send the friend request to the friend i.e. add current user id in the friend's friend request array
      socket.on('send-friend-request',function(userId,currentUserId,currentHandlename){
          Users.findById(userId,function(err,user){
              if(err){
                console.log(err);
                socket.emit('friend-request-sent',false)
              }else{
                    user.friendRequest.push(currentUserId);
                    user.save();
                    // console.log(user.friendRequest);
                    //This event will send the current user confirmation thatmthe friend request is sent
                    socket.emit('friend-request-sent',true)
                    if(user.socketId){
                        //If the friend is online i.e. he has socket id then this event will alert the friend that he has recieved a friend reuqest from you(current user)
                        socket.broadcast.to(user.handlename).emit('friend-request-alert',currentHandlename);
                    }
                }
            })
      })

      //This event is listened when current user cancels the sent friend request. It will remove the current user id from the friend request array of the friend.
      //friend-request-cancelled event will send confirmation to the current user that the friend request is cancelled or not
      //friend-request-cancel-alert will be broadcasted to the friend via his handlename if he is online i.e. has a socket id.
      socket.on('cancel-friend-request',function(userId,currentUserId,currentHandlename){
        Users.findById(userId,function(err,user){
            if(err){
              console.log(err);
              socket.emit('friend-request-cancelled',false)
            }else{
                var index=user.friendRequest.indexOf(currentUserId)
                if(index>-1){
                    user.friendRequest.splice(index,1);
                }
                user.save();
                // console.log(user.friendRequest);
                socket.emit('friend-request-cancelled',true)
                if(user.socketId){
                    socket.broadcast.to(user.handlename).emit('friend-request-cancel-alert');
                }
            }
        })
    })

    //This event will be emitted when the friend request is accepted.friend's user idis added in the friends array of the user who sent the friend request
    //friend-request-accepted event will send confirmation to client who accepted the friend request that the friend request is accepted
    //friend-request-accepted-alert will be broadcasted to the user who sent the friend request via his handlename if he is online i.e. has socketid
    socket.on('accept-friend-request',function(userId,currentUserId,currentHandlename){
        Users.findById(userId,function(err,user){
            if(err){
              console.log(err);
              socket.emit('friend-request-accepted',false)
            }else{
                var index=user.friendRequest.indexOf(currentUserId)
                // console.log("The index is",index)
                if(index>-1){
                    user.friendRequest.splice(index,1);    
                }
                user.friends.push(currentUserId);
                user.save();
                // console.log(user.friends);
                socket.emit('friend-request-accepted',true)
                if(user.socketId){
                    socket.broadcast.to(user.handlename).emit('friend-request-accepted-alert',currentHandlename);
                }
            }
        })
    })

    //user id of the user who sent the friend request is removed from friend request araay and is added to friends array.
    //friend-request-accepted event will send the confirmation to the friend who accpeted the friend request
    socket.on('adding-friend-to-current-user',function(userId,currentUserId,currentHandlename){
        Users.findById(currentUserId,function(err,user){
            if(err){
              console.log(err);
            }else{
                var index=user.friendRequest.indexOf(userId)
                // console.log("The index is",index)
                if(index>-1){
                    user.friendRequest.splice(index,1);    
                }
                user.friends.push(userId);
                user.save();
                // console.log(user.friends);
                socket.emit('friend-request-accepted',true)
            }
        })
    })

    //When the friend rejects the friend request then the user id of the user who sent the request is removed from friend's friend requests array
    //friend-request-rejected-confirmation event will send confirmation to the friend who rejected the friend request
    //reload-for-user-whoose-request-is-rejected event will reload the page for user whose friend request is rejected
    socket.on('remove-friend-request-from-user-database',function(userId,currentUserId,userhandleName){
        Users.findById(currentUserId,function(err,user){
            if(err){
              console.log(err);
            }else{
                var index=user.friendRequest.indexOf(userId)
                // console.log("The index is",index)
                if(index>-1){
                    user.friendRequest.splice(index,1);    
                }
                user.save();
                // console.log(user.friends);
                
                socket.broadcast.to(userhandleName).emit('reload-for-user-whoose-request-is-rejected')
                socket.emit('friend-request-rejected-confirmation',true)
            }
        })
    })

    /****Socket.io code for sending friend request ends here****/

    /****Socket.io code for calling starts here****/
    //This event will call other friends
    //could-not-connect-call event will be emitted if their is an error or the friend is offline i.e. has no socket.id
    //If the user is online then enter-call event will be emitted which will open the video call in a new tab
   socket.on('calling-user',function(userHandlename,currentHandlename){
       Users.findOne({handlename:userHandlename},function(err,user){
           if(err){
              console.log(err); 
              socket.emit('could-not-connect-call',err);
           }else{
               if(!user.socketId){
                socket.emit('could-not-connect-call','Could not connect call as the user is offline');
               }else{
                    var callId=uuidv4();
                    //Call id will be saved in callIds model
                    callIds.create({callId:callId});
                    socket.emit('enter-call',userHandlename,currentHandlename,callId)
                    //socket.broadcast.to(user.handlename).emit('recieving-call',userHandlename,currentHandlename,callId)
               }
           }
       })
   })

    //This event is listened whenever someone joins a call
    //limit-exceded-in-call-alert will be emitted when numberOfUser becomes more than 2
    //user-connected event will broadcast to all other socket in the room that a new socket has joined i.e. emitted to all other in the room when a new user has joined room
    socket.on('joined-call',function(callId,peerId,name,recieverHandlename,callerHandlename){
        // console.log("Join call on event",socket.id)
        socket.join(callId);
        //The variable stores the number of sockets who are currently in the call once the socket is disconnected it will be removed from the call i.e. no longer associated with it
        var numberOfUsers=io.sockets.adapter.rooms.get(callId).size;
        //Send reciever call alert after the caller has joined the call
        if(numberOfUsers==1){
            // console.log(recieverHandlename)
            //This event will be listened when the caller joins the call 
            socket.on('make-the-recieving-call-event-emit',function(){
                //This event will send notification about the call to the reciever of the call
                socket.broadcast.to(recieverHandlename).emit('recieving-call',recieverHandlename,callerHandlename,callId)
            })
        }
        if(numberOfUsers<=2){
            //This event will be emitted whenever the caller or reciever joins the call  
            socket.broadcast.to(callId).emit("user-connected", peerId,name);
        }else{
           socket.emit('limit-exceded-in-call-alert');
        }
       //This event will send the message to all the people in call
        socket.on("message", function(message){
            io.to(callId).emit("createMessage", message);
        });

        socket.on('disconnect',function(){
            // console.log("User disconnected");
            if(!io.sockets.adapter.rooms.get(callId)){
                //Remove callId from callIds collection as call has no one
                callIds.deleteOne({callId:callId});
            }
            //THis event is broadcasted to all other user in the call when a user leaves the call
            if(numberOfUsers<=2){
                socket.broadcast.to(callId).emit("user-disconnected", peerId,name);
            }   
        })

   })
   
   //This event is emitted to when the reciever rejects the call
   socket.on('decline-call',function(callId){
       //This event is broadcasted to the caller who is in the call that the call is decilned
       socket.broadcast.to(callId).emit('call-declined-by-reciever')
   })


    socket.on("disconnect",function(reason){
        console.log("User disconnecting "+reason+" " + socket.id)
    })
})


    

