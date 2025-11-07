const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    age: Number,
    gender: String,
    preferences: [String],
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } },
);

const User = mongoose.model('User', userSchema);

async function getAllUsers() {
  return User.find({}).lean();
}

async function getUserById(id) {
  return User.findById(id).lean();
}

async function createUser(data) {
  const user = new User(data);
  return user.save();
}

module.exports = { User, getAllUsers, getUserById, createUser };

