const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require("../models/User");
const { hashPassword } = require("../utils/auth");
const {
  handleMongooseError,
  isValidObjectId,
} = require("../utils/errorHandler");

async function listUsers(req, res, next) {
  try {
    const users = await getAllUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

async function getUser(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ user });
  } catch (error) {
    const errorInfo = handleMongooseError(error);
    return res.status(errorInfo.status).json({ message: errorInfo.message });
  }
}

async function createUserEndpoint(req, res, next) {
  try {
    if (!req.body) {
      return res.status(400).json({ message: "Request body is required" });
    }

    const { username, email, passwordHash, age, gender, preferences } =
      req.body;

    if (!username || username.trim() === "") {
      return res.status(400).json({ message: "Username is required" });
    }

    if (!email || email.trim() === "") {
      return res.status(400).json({ message: "Email is required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (!passwordHash || passwordHash.trim() === "") {
      return res.status(400).json({ message: "Password hash is required" });
    }

    if (
      age !== undefined &&
      (typeof age !== "number" || age < 0 || age > 150)
    ) {
      return res
        .status(400)
        .json({ message: "Age must be a number between 0 and 150" });
    }

    if (preferences && !Array.isArray(preferences)) {
      return res.status(400).json({ message: "Preferences must be an array" });
    }

    const user = await createUser({
      username,
      email,
      passwordHash,
      age,
      gender,
      preferences,
    });
    const userResponse = { ...user };
    delete userResponse.passwordHash;
    res.status(201).json({ user: userResponse });
  } catch (error) {
    const errorInfo = handleMongooseError(error);
    return res
      .status(errorInfo.status)
      .json({ message: errorInfo.message, errors: errorInfo.errors });
  }
}

async function updateOwnProfile(req, res, next) {
  try {
    if (!req.body) {
      return res.status(400).json({ message: "Request body is required" });
    }

    const userId = req.user.id; // From auth middleware
    const { username, age, gender, preferences, currentPassword, newPassword } =
      req.body;

    // Validate inputs
    if (
      age !== undefined &&
      (typeof age !== "number" || age < 0 || age > 150)
    ) {
      return res
        .status(400)
        .json({ message: "Age must be a number between 0 and 150" });
    }

    if (preferences !== undefined && !Array.isArray(preferences)) {
      return res.status(400).json({ message: "Preferences must be an array" });
    }

    if (gender && !["male", "female", "other", ""].includes(gender)) {
      return res.status(400).json({ message: "Invalid gender value" });
    }

    // Get current user to check password if changing it
    const currentUser = await getUserById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prepare update data (excluding email and role - users can't change these)
    const updateData = {};
    if (username) updateData.username = username;
    if (age !== undefined) updateData.age = age;
    if (gender !== undefined) updateData.gender = gender;
    if (preferences !== undefined) updateData.preferences = preferences;

    let passwordWasChanged = false;
    if (newPassword && newPassword.trim() !== "") {
      if (!currentPassword) {
        return res.status(400).json({
          message: "Current password is required to set a new password",
        });
      }

      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ message: "New password must be at least 6 characters" });
      }

      // Verify current password
      const { comparePassword } = require("../utils/auth");
      const isPasswordValid = await comparePassword(
        currentPassword,
        currentUser.passwordHash
      );
      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
      }

      // Hash new password
      updateData.passwordHash = await hashPassword(newPassword);
      passwordWasChanged = true;
    }

    // Update user
    const user = await updateUser(userId, updateData);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userResponse = { ...user };
    delete userResponse.passwordHash;

    res.json({
      message: "Profile updated successfully",
      user: userResponse,
      passwordChanged: passwordWasChanged,
    });
  } catch (error) {
    const errorInfo = handleMongooseError(error);
    return res
      .status(errorInfo.status)
      .json({ message: errorInfo.message, errors: errorInfo.errors });
  }
}

async function updateUserEndpoint(req, res, next) {
  try {
    if (!req.body) {
      return res.status(400).json({ message: "Request body is required" });
    }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const { username, email, age, gender, preferences, role } = req.body;

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
    }

    if (
      age !== undefined &&
      (typeof age !== "number" || age < 0 || age > 150)
    ) {
      return res
        .status(400)
        .json({ message: "Age must be a number between 0 and 150" });
    }

    if (preferences !== undefined && !Array.isArray(preferences)) {
      return res.status(400).json({ message: "Preferences must be an array" });
    }

    if (role && !["user", "admin"].includes(role)) {
      return res
        .status(400)
        .json({ message: 'Role must be either "user" or "admin"' });
    }

    const user = await updateUser(id, {
      username,
      email,
      age,
      gender,
      preferences,
      role,
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userResponse = { ...user };
    delete userResponse.passwordHash;
    res.json({ user: userResponse });
  } catch (error) {
    const errorInfo = handleMongooseError(error);
    return res
      .status(errorInfo.status)
      .json({ message: errorInfo.message, errors: errorInfo.errors });
  }
}

async function deleteUserEndpoint(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await deleteUser(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userResponse = { ...user };
    delete userResponse.passwordHash;
    res.json({ message: "User deleted successfully", user: userResponse });
  } catch (error) {
    const errorInfo = handleMongooseError(error);
    return res.status(errorInfo.status).json({ message: errorInfo.message });
  }
}

module.exports = {
  listUsers,
  getUser,
  createUserEndpoint,
  updateOwnProfile,
  updateUserEndpoint,
  deleteUserEndpoint,
};
