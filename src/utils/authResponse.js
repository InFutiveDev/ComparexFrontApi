import { User } from "../models/User.js";

export function buildAuthResponse(user, tokens) {
  return {
    token: tokens.accessToken,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: User.sanitize(user),
  };
}
