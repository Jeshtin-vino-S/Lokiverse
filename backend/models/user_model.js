import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    username : {
        type : String,
        require : true,
        unique : true
    },
    fullname : {
        type : String,
        require : true,
        unique : true
    },
    email :{
        type : String,
        require : true,
        unique : true
    },
    password : {
        type : String,
        minLength : 8,
        require : true
    },
    followers : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        default : []
    }],
    following : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        default : []
    }],
    profileImg : {
        type : String,
        default : ""
    },
    coverImg : {
        type : String,
        default : ""
    },
    bio : {
        type : String,
        default : ""
    },
    link : {
        type : String,
        default : ""
    },
    lastSeen : {
        type : Date,
        default : Date.now
    }
}, {timestamps : true});

const User = mongoose.model("User", userSchema);

export default User;
