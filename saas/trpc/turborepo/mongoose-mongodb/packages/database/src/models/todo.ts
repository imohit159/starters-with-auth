import mongoose, { Schema } from "mongoose";

const todoSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

todoSchema.index({ organizationId: 1 });
todoSchema.index({ organizationId: 1, createdAt: -1 });
todoSchema.index({ userId: 1 });

export type TodoDocument = mongoose.HydratedDocument<
  mongoose.InferSchemaType<typeof todoSchema> & { createdAt: Date; updatedAt: Date }
>;

export const Todo = mongoose.model("Todo", todoSchema);
