const mongoose = require('mongoose');

function handleMongooseError(error) {
  if (error instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(error.errors).map((err) => err.message);
    return {
      status: 400,
      message: 'Validation error',
      errors: messages,
    };
  }

  if (error instanceof mongoose.Error.CastError) {
    return {
      status: 400,
      message: `Invalid ${error.path}: ${error.value}`,
    };
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return {
      status: 409,
      message: `${field} already exists`,
    };
  }

  return {
    status: 500,
    message: error.message || 'Internal server error',
  };
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

module.exports = { handleMongooseError, isValidObjectId };
