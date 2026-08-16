import mongoose, { Schema } from "mongoose";

const todoSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

todoSchema.index({ organizationId: 1, createdAt: -1 });

export type TodoDocument = mongoose.HydratedDocument<mongoose.InferSchemaType<typeof todoSchema>>;

export const Todo = mongoose.model("Todo", todoSchema);
