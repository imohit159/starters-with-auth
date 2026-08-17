import mongoose, { Schema } from "mongoose";

const stripeEventSchema = new Schema(
  {
    _id: { type: String },
    type: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
    payload: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: false },
);

export type StripeEventDocument = mongoose.HydratedDocument<
  mongoose.InferSchemaType<typeof stripeEventSchema>
>;

export const StripeEvent = mongoose.model("StripeEvent", stripeEventSchema);
