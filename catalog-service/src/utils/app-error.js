function AppError(message, statusCode) {
  Error.captureStackTrace(this, this.constructor);

  this.name = 'AppError';
  this.message = message;
  this.statusCode = statusCode;
}

AppError.prototype = Object.create(Error.prototype);
AppError.prototype.constructor = AppError;

module.exports = AppError;
