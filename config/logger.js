import bunyan from "bunyan";

const logger = bunyan.createLogger({
  name: "lms-backend-auth",
  level: process.env.NODE_ENV == "production" ? "info" : "debug", // Logging level: 'fatal', 'error', 'warn', 'info', 'debug', 'trace'
  serializers: bunyan.stdSerializers, // Standard serializers for request and error objects
});

export default logger;
