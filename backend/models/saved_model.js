import mongoose from "mongoose";

const savedSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    post_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Posts",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound unique index so the same post cannot be saved multiple times by the same user
savedSchema.index({ user_id: 1, post_id: 1 }, { unique: true });

// Explicitly name the collection 'saved' in MongoDB
const Saved = mongoose.model("Saved", savedSchema, "saved");

export default Saved;
