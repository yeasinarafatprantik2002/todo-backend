import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        todos: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Todo",
            },
        ],
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

export const Category = mongoose.model("Category", categorySchema);
