export default async function verifyJwt(token: string) {
  const { verifyAccessToken } = await import("./token.js");
  const payload = verifyAccessToken(token);
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}
