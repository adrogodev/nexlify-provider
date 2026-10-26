// Jest runs with NODE_ENV=test, which fails AppEnvs enum validation.
// e2e boots the Nest module only; the database provider is overridden in the spec.
process.env.NODE_ENV = process.env.NODE_ENV === 'test' ? 'development' : process.env.NODE_ENV;

if (!process.env.PORT) process.env.PORT = '3600';
if (!process.env.ADMIN_USER) process.env.ADMIN_USER = 'e2e-admin';
if (!process.env.ADMIN_PASSWORD) process.env.ADMIN_PASSWORD = 'e2e-password';
if (!process.env.PLATFORM_URL) process.env.PLATFORM_URL = 'http://localhost:4200';
if (!process.env.JWT_SECRET_KEY) process.env.JWT_SECRET_KEY = 'e2e-jwt-secret-key';
if (!process.env.JWT_EXPIRATION_TIME) process.env.JWT_EXPIRATION_TIME = '2';
if (!process.env.ENCRYPT_KEY) process.env.ENCRYPT_KEY = 'e2e-encrypt-key';
