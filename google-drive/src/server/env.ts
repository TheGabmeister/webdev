function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  get DATABASE_URL() { return required('DATABASE_URL'); },
  get JWT_SECRET() { return required('JWT_SECRET'); },
  get AWS_ACCESS_KEY_ID() { return process.env.AWS_ACCESS_KEY_ID ?? ''; },
  get AWS_SECRET_ACCESS_KEY() { return process.env.AWS_SECRET_ACCESS_KEY ?? ''; },
  get AWS_REGION() { return process.env.AWS_REGION ?? 'us-east-1'; },
  get S3_BUCKET_NAME() { return process.env.S3_BUCKET_NAME ?? ''; },
  get APP_ORIGIN() { return process.env.APP_ORIGIN ?? 'http://localhost:3000'; },
  get PORT() { return parseInt(process.env.PORT ?? '3000', 10); },
  get isProduction() { return process.env.NODE_ENV === 'production'; },
};
