import { AuthChallenge, AuthIdentity, Session, User, connectDb, disconnectDb } from "@repo/database";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | undefined;

export async function startTestDb() {
  mongod = await MongoMemoryServer.create();
  await connectDb(mongod.getUri());
  await Promise.all([
    User.syncIndexes(),
    AuthIdentity.syncIndexes(),
    Session.syncIndexes(),
    AuthChallenge.syncIndexes(),
  ]);
}

export async function stopTestDb() {
  await disconnectDb();
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
