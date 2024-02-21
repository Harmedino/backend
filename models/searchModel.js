import mongoose from "mongoose";
const { Schema } = mongoose;

const searchSchema = mongoose.Schema({
  value: {
    type: [String],
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
      ref: "User",
    required:true
  },
});

export default mongoose.model("Search", searchSchema);
