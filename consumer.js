// //This file contains socket.io code
// module.exports={
//     start: function(io) {
//         io.on('connect',function(socket){
//             console.log("User joined");
//             socket.on('checkUsername',function(data){
//                 Users.findOne({username:data.username},function(err,user){
//                     if(user){
//                         console.log(user)
//                         socket.emit('alertForUsername',{present:true})
//                     }else{
//                         console.log("No")
//                         socket.emit('alertForUsername',{present:false})
//                     }
//                 })
//             })
        
//             socket.on('checkHandlename',function(data){
//                 Users.findOne({handlename:data.handlename},function(err,user){
//                     if(user){
//                         console.log(user)
//                         socket.emit('alertForHandlename',{present:true})
//                     }else{
//                         console.log("No")
//                         socket.emit('alertForHandlename',{present:false})
//                     }
//                 })
//             })
//             socket.on("disconnect",function(){
//                 console.log("User disconnecting")
//             })
//         })
        
//     }
// }