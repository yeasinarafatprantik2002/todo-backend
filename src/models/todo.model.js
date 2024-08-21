import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const todoSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        isCompleted: {
            type: Boolean,
            default: false,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

todoSchema.plugin(mongooseAggregatePaginate);

export const Todo = mongoose.model("Todo", todoSchema);
