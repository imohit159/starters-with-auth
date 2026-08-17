import mongoose, { Schema } from "mongoose";
import { DEFAULT_ROLES, USER_STATUS } from "../constants";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    avatarUrl: { type: String, default: null },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.active,
    },
    emailVerifiedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    roles: { type: [String], default: () => [...DEFAULT_ROLES] },
  },
  { timestamps: true },
);

userSchema.index({ status: 1 });

export type UserDocument = mongoose.HydratedDocument<mongoose.InferSchemaType<typeof userSchema>>;

export const User = mongoose.model("User", userSchema);
