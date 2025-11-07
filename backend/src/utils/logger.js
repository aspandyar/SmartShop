function formatMessage(level, message) {
  return `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
}

const logger = {
  info(message) {
    // eslint-disable-next-line no-console
    console.log(formatMessage('info', message));
  },
  warn(message) {
    // eslint-disable-next-line no-console
    console.warn(formatMessage('warn', message));
  },
  error(message, error) {
    // eslint-disable-next-line no-console
    console.error(formatMessage('error', message));
    if (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  },
};

module.exports = logger;

