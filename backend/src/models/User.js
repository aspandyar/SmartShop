const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
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

async function updateUser(id, data) {
  return User.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
}

async function deleteUser(id) {
  return User.findByIdAndDelete(id).lean();
}

async function getUserByEmail(email) {
  return User.findOne({ email: email.toLowerCase() }).lean();
}

module.exports = {
  User,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserByEmail,
};

