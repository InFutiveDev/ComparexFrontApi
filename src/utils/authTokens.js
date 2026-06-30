import jwt from "jsonwebtoken";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/jwt.js";
import { RefreshToken } from "../models/RefreshToken.js";

export function createAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export async function issueAuthTokens(user) {
  const accessToken = createAccessToken(user);
  const { token: refreshToken } = await RefreshToken.create(user._id.toString());

  return { accessToken, refreshToken };
}
