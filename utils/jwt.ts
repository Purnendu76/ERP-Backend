import * as jose from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'erp-super-secure-secret-key-at-least-32-chars-long'
);

export const generateToken = async (payload: { id: string; email: string; role: string }) => {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secret);
};

export const verifyToken = async (token: string) => {
  try {
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
};
