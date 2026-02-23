import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Users from "../models/User.js";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.userId,
      role: user.role,
      clinicId: user.clinicId
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString("hex");
};

/* ========================================
   REGISTER
======================================== */

export const register = async (req, res) => {
  try {
    const {
      userId,
      username,
      password,
      firstName,
      lastName,
      role,
      clinicId,gender, dob, cellPhoneNumber, middleName
    } = req.body;

    const existingUser = await Users.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await Users.create({
      userId,
      username,
      passwordHash,
      firstName,
      lastName,
      role,
      clinicId, gender, dob, cellPhoneNumber, middleName
    });

    res.status(201).json({
      message: "User registered successfully"
    });

  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

/* ========================================
   LOGIN
======================================== */

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await Users.findOne({ username }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check account lock
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(423).json({ message: "Account temporarily locked" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000; // 15 min lock
      }

      await user.save();

      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Reset login attempts
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    user.refreshTokens.push({
      tokenHash: refreshTokenHash,
      expiresAt: new Date(
        Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      )
    });

    await user.save();

    res.json({
      accessToken,
      refreshToken
    });

  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};