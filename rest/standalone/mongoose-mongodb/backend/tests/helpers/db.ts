import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { AuthChallenge } from "../../src/modules/auth/challenge.model";
import { AuthIdentity } from "../../src/modules/auth/identity.model";
import { Session } from "../../src/modules/auth/session.model";
import { User } from "../../src/modules/users/user.model";

let mongod: MongoMemoryServer | undefined;

export async function startTestDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([
    User.syncIndexes(),
    AuthIdentity.syncIndexes(),
    Session.syncIndexes(),
    AuthChallenge.syncIndexes(),
  ]);
}

export async function stopTestDb() {
  await mongoose.disconnect();
  await mongod?.stop();
}

export async function resetTestDb() {
  await Promise.all([
    User.deleteMany({}),
    AuthIdentity.deleteMany({}),
    Session.deleteMany({}),
    AuthChallenge.deleteMany({}),
  ]);
}
