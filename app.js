var express=require('express');
var app=express();
var bodyParser=require("body-parser");
var mongoose=require("mongoose");
var passport=require("passport");
var localStrategy=require("passport-local");
var server=require('http').Server(app);
var io=require('socket.io')(server);
var methodOverride=require("method-override");
const { v4: uuidv4 } = require("uuid");

app.set("view engine","ejs");


// app.use(bodyParser.json()) basically tells the system that you want json to be used.
// bodyParser.urlencoded({extended: ...}) basically tells the system whether you want to use 
// a simple algorithm for shallow parsing (i.e. false) or complex 
// algorithm for deep parsing that can deal with nested objects (i.e. true).
app.use(bodyParser.urlencoded({extended:true}));
// app.use(bodyParser.json());

mongoose.connect("mongodb://localhost/exposys");



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

app.use(function(req,res,next){
    res.locals.currentUser=req.user;
    next();
})

app.use(methodOverride("_method"));

const { findById, db } = require("./models/users.js");

app.use(express.static(__dirname + "/public"))



if (process.env.NODE_ENV === "development") {
    console.log("Development");
    var portForPeer=3000
    var portUsing=3000 || 8000
  }
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

app.get("/home",isNotLoggedIn,function(req,res){
    res.render('home');
})

app.get("/signup",isNotLoggedIn,function(req,res){
    res.render('signup');
})

app.post("/signup",isNotLoggedIn,function(req,res){
    Users.register(new Users({username:req.body.username,email:req.body.username,handlename:req.body.handlename,name:req.body.name,dateofbirth:req.body.dateofbirth}),req.body.password,function(err,user){
        if(err){
                console.log(err);
                res.send(err);
        }else{
            passport.authenticate("local")(req,res,function(){
            res.redirect("/profile/"+user.handlename);
            })
        }
    })
})

app.get("/signin",isNotLoggedIn,function(req,res){
    res.render("signin");
})

app.post("/signin",isNotLoggedIn,passport.authenticate("local",{
    successRedirect:"/",
    failureRedirect:"/signin"
}),function(req,res){
    console.log("Buffalo")
})

app.post("/signout",isLoggedIn,function(req,res){
    req.logout();
    console.log("Logged out")
    res.redirect("/home");
})

app.get("/cleardata",function(req,res){
    Users.deleteMany({},function(err){
        if(err){
            res.send(err);
        }else{
            res.redirect("/home")
        }
    })
})

app.get("/profile/:handlename",isLoggedIn,function(req,res){
    console.log(req.user,req.session)
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

app.get("/profile/:handlename/edit",checkAuthorisation,function(req,res){
    Users.findOne({handlename:req.params.handlename},function(err,user){
       if(err){
           res.send(err)
       }else{   
           res.render("editprofile",{user:user});
       }   
})
})

app.put("/profile/:handlename/edit",checkAuthorisation,function(req,res){
    Users.findOneAndUpdate({handlename:req.params.handlename},req.body.userData,function(err,user){
       if(err){
           res.send(err)
       }else{   
           res.redirect("/profile/"+req.params.handlename)
       }
    
})
})

app.get("/searchfriend",isLoggedIn,function(req,res){
    res.render("search");
})

app.get("/joinroom",isLoggedIn,function(req,res){
    res.render("joinroom");
})

app.get("/room",isLoggedIn,function(req,res){
    var roomId=uuidv4()
    roomIds.create({roomId:roomId});
    res.redirect('/room/'+ roomId);
})

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

app.get("*",function(req,res){
    res.send("Page does not exist");
})

server.listen(portUsing,function(req,res){
    console.log("Server listenting to port 3000");
})

function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }else{
        // res.send("You are not allowed to do it")
        res.redirect("/home")
    }  
}

function isNotLoggedIn(req,res,next){
    if(!req.isAuthenticated()){
        return next();
    }else{
        // res.send("You are not allowed to do it")
        console.log("Your are not allowed")
        res.redirect("/")
    }
    
}

function checkAuthorisation(req,res,next){
    if(req.isAuthenticated()){
       Users.findOne({handlename:req.params.handlename},function(err,User){
        if(!User){
            res.send("User does not exist")   
       }else{
            if(err){
               console.log(err);
               res.redirect("back");
           }else{
               if(req.user && User._id.equals(req.user._id)){
                   next();
               }else{
                //    req.flash("error","You are not allowed to do that");
                //    res.redirect("back");
                res.send("Tu nhi kar sakta")
               }
           }
        }
       })
   } 
   }

io.on('connect',function(socket){
    console.log("User joined with Socket Id",socket.id);
    
    socket.on('store-socket-id-in-db',function(currentUserId){
        Users.findById(currentUserId,function(err,user){
            if(err){
                console.log(err);
            }else{
                if(!user){
                    console.log("No User")
                }else{
                user.socketId=socket.id;
                socket.join(user.handlename)
                user.save();

                socket.on("disconnect",function(){
                    user.socketId="";
                    user.save();
                    console.log("qwewvhuearbnuv")
                })

                }
                
            }
            
        })
    })

    socket.on('remove-socket-id-from-db',function(){
        console.log("qwertyuiuoipgavrngjrgnqg")
    })

    /****Socket.io code for checking unique handlename and username starts here****/
    socket.on('checkUsername',function(data){
        Users.findOne({username:data.username},function(err,user){
            if(user){
                console.log(user)
                socket.emit('alertForUsername',{present:true})
            }else{
                console.log("No")
                socket.emit('alertForUsername',{present:false})
            }
        })
    })

    socket.on('checkHandlename',function(data){
        Users.findOne({handlename:data.handlename},function(err,user){
            if(user){
                console.log(user)
                socket.emit('alertForHandlename',{present:true})
            }else{
                console.log("No")
                socket.emit('alertForHandlename',{present:false})
            }
        })
    })
    /****Socket.io code for checking unique handlename and username ends here****/


    /****Socket.io code for searching users starts here****/
    socket.on('search',function(data){
        if(data.type=='handlename'){
            Users.find({handlename:new RegExp(data.text,"i")},function(err,result){
                if(err){
                    socket.emit('search-results',{result})
                }else{
                    socket.emit('search-results',{result})
                }   
            })
        }else if(data.type=='name'){
            Users.find({name:new RegExp(data.text,"i")},function(err,result){
                if(err){
                    socket.emit('search-results',{result})
                }else{
                    socket.emit('search-results',{result})
                }   
            })
        }
        // console.log(data)
    })
    /****Socket.io code for searching users ends here****/


    /****Socket.io code for video chat room starts here****/

    socket.on("join-room", function(roomId, userId){
        console.log("Join room on event",socket.id)
        socket.join(roomId);
        var numberOfUsers=io.sockets.adapter.rooms.get(roomId).size;
        if(numberOfUsers<=6){
            console.log(io.sockets.adapter.rooms.get(roomId).size)
            socket.emit('user-limit',false)
            socket.broadcast.to(roomId).emit("user-connected", userId);
        }else{
            socket.emit('user-limit',true)
        }
        
    
        socket.on("message", function(message){
          io.to(roomId).emit("createMessage", message);
        });
        
        socket.on('disconnect',function(){
          console.log("User disconnected");
          if(!io.sockets.adapter.rooms.get(roomId)){
              //Remove roomId from roomIds collection as room has no one
              roomIds.deleteOne({roomId:roomId});
          }
          socket.broadcast.to(roomId).emit("user-disconnected", userId);
        })
    
      });

    /****Socket.io code for video chat room ends here****/


    /****Socket.io code for sending friend request starts here****/
      socket.on('send-friend-request',function(userId,currentUserId,currentHandlename){
          Users.findById(userId,function(err,user){
              if(err){
                console.log(err);
                socket.emit('friend-request-sent',false)
              }else{
                  user.friendRequest.push(currentUserId);
                  user.save();
                  console.log(user.friendRequest);
                  socket.emit('friend-request-sent',true)
                  if(user.socketId){
                      socket.broadcast.to(user.handlename).emit('friend-request-alert',currentHandlename);
                  }
              }
          })
      })

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
                console.log(user.friendRequest);
                socket.emit('friend-request-cancelled',true)
                if(user.socketId){
                    socket.broadcast.to(user.handlename).emit('friend-request-cancel-alert');
                }
            }
        })
    })

    socket.on('accept-friend-request',function(userId,currentUserId,currentHandlename){
        Users.findById(userId,function(err,user){
            if(err){
              console.log(err);
              socket.emit('friend-request-accepted',false)
            }else{
                var index=user.friendRequest.indexOf(currentUserId)
                console.log("The index is",index)
                if(index>-1){
                    user.friendRequest.splice(index,1);    
                }
                user.friends.push(currentUserId);
                user.save();
                console.log(user.friends);
                socket.emit('friend-request-accepted',true)
                if(user.socketId){
                    socket.broadcast.to(user.handlename).emit('friend-request-accepted-alert',currentHandlename);
                }
            }
        })
    })

    socket.on('adding-friend-to-current-user',function(userId,currentUserId,currentHandlename){
        Users.findById(currentUserId,function(err,user){
            if(err){
              console.log(err);
            }else{
                var index=user.friendRequest.indexOf(userId)
                console.log("The index is",index)
                if(index>-1){
                    user.friendRequest.splice(index,1);    
                }
                user.friends.push(userId);
                user.save();
                console.log("aeengbvuiwnrbkornbk",user.friends);
                socket.emit('friend-request-accepted',true)
            }
        })
    })

    socket.on('remove-friend-request-from-user-database',function(userId,currentUserId,userhandleName){
        Users.findById(currentUserId,function(err,user){
            if(err){
              console.log(err);
            }else{
                var index=user.friendRequest.indexOf(userId)
                console.log("The index is",index)
                if(index>-1){
                    user.friendRequest.splice(index,1);    
                }
                user.save();
                console.log("aeengbvuiwnrbkornbk",user.friends);
                
                socket.broadcast.to(userhandleName).emit('reload-for-user-whoose-request-is-rejected')
                socket.emit('friend-request-rejected-confirmation',true)
            }
        })
    })

    /****Socket.io code for sending friend request ends here****/


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
                   callIds.create({callId:callId});
                   socket.emit('enter-call',userHandlename,currentHandlename,callId)
                   socket.broadcast.to(user.handlename).emit('recieving-call',userHandlename,currentHandlename,callId)
               }
           }
       })
   })

   socket.on('joined-call',function(callId,peerId,name){
    console.log("Join call on event",socket.id)
       socket.join(callId);
       var numberOfUsers=io.sockets.adapter.rooms.get(callId).size;
       if(numberOfUsers<=2){
        socket.broadcast.to(callId).emit("user-connected", peerId,name);
       }else{
           socket.emit('limit-exceded-in-call-alert');
       }
       
       
       socket.on("message", function(message){
        io.to(callId).emit("createMessage", message);
      });

       socket.on('disconnect',function(){
        console.log("User disconnected");
        if(!io.sockets.adapter.rooms.get(callId)){
            //Remove callId from callIds collection as call has no one
            callIds.deleteOne({callId:callId});
        }
        if(numberOfUsers<=2){
            socket.broadcast.to(callId).emit("user-disconnected", peerId,name);
        }   
      })

   })
   
   socket.on('decline-call',function(callId){
       socket.broadcast.to(callId).emit('call-declined-by-reciever')
   })


    socket.on("disconnect",function(){
        console.log("User disconnecting")
    })
})


    

