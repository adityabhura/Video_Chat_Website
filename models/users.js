var mongoose=require("mongoose");
var passportLocalMongoose=require("passport-local-mongoose");

var UserSchema=new mongoose.Schema({
    username:{type:String,
        lowercase: true,
        unique:true,
        required:[true,'Username required']
    },
    email:String,
    password:String,
    name:String,
    about:String,
    profilepicture:String,
    handlename:{type:String,unique:true},
    notifications:String,
    friends:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Users"
    }],
    dateofbirth:String,
    age:Number,
    friendRequest:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Users"
    }],
    socketId:String
})

UserSchema.plugin(passportLocalMongoose);

module.exports=mongoose.model("Users",UserSchema);