import mongoose, { Schema } from "mongoose";
import { SESSION_REVOKE_REASON } from "../../config/constants";

const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    familyId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: {
      type: String,
      enum: [...Object.values(SESSION_REVOKE_REASON), null],
      default: null,
    },
    replacedBySessionId: { type: Schema.Types.ObjectId, default: null },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

sessionSchema.index({ userId: 1, revokedAt: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDocument = mongoose.HydratedDocument<mongoose.InferSchemaType<typeof sessionSchema>>;

export const Session = mongoose.model("Session", sessionSchema);
