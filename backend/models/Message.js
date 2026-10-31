import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
    },
    sender: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    reactions: [
      {
        user: {
          type: String,
          required: true,
        },
        emoji: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

// Compound index on roomId and createdAt for fast cursor-based pagination and queries
messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ roomId: 1, read: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;

