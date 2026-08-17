import mongoose, { Schema } from "mongoose";
import { IDENTITY_PROVIDER } from "../../config/constants";

const identitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: {
      type: String,
      enum: Object.values(IDENTITY_PROVIDER),
      required: true,
    },
    providerUserId: { type: String, required: true },
    passwordHash: { type: String, default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    profile: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

identitySchema.index({ provider: 1, providerUserId: 1 }, { unique: true });
identitySchema.index({ userId: 1, provider: 1 });

export type IdentityDocument = mongoose.HydratedDocument<
  mongoose.InferSchemaType<typeof identitySchema>
>;

export const AuthIdentity = mongoose.model("AuthIdentity", identitySchema);
