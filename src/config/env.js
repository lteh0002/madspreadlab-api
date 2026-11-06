export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/madspreadlab',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
};
