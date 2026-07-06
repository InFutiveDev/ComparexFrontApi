import { ObjectId } from "mongodb";

export function parseObjectId(id) {
  if (!id || !ObjectId.isValid(id)) {
    return null;
  }

  return new ObjectId(id);
}
