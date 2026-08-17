import mongoose, { Schema } from "mongoose";
import { CHALLENGE_TYPE } from "../constants";

const challengeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    type: {
      type: String,
      enum: Object.values(CHALLENGE_TYPE),
      required: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
    payload: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

challengeSchema.index({ userId: 1, type: 1 });
challengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type ChallengeDocument = mongoose.HydratedDocument<
  mongoose.InferSchemaType<typeof challengeSchema>
>;

export const AuthChallenge = mongoose.model("AuthChallenge", challengeSchema);
