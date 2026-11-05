import mongoose from "mongoose";

const postSchema = mongoose.Schema({
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    text : {
        type : String
    },
    img : {
        type : String
    },
    video : {
        type : String,
        default : ""
    },
    videoDuration : {
        type : Number,
        default : 0
    },
    likes : [
        {
            type : mongoose.Schema.Types.ObjectId,
            ref : "User"
        }
    ],
    comments : [
        {
           text : {
             type : String,
             required : true
           },
           user : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "User",
            required : true
           }
        }
    ]
}, {timestamps : true})

const Posts = mongoose.model("Posts", postSchema);
export default Posts;
