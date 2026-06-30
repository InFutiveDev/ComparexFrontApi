export const JWT_SECRET = process.env.JWT_SECRET || "comparex-dev-secret";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
export const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS) || 30;
