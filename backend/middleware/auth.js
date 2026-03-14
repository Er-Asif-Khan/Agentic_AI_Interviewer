const jwt = require("jsonwebtoken");
const User = require("../models/User");

// @desc    Verify JWT token and protect routes
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev-secret"
    );

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user not found",
      });
    }

    req.user = { id: user._id, role: user.role };
    req.currentUser = user;

    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }
};

// @desc    Check if user is HR
exports.isHR = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "hr") {
      return res.status(403).json({
        success: false,
        message: "Access denied. HR role required.",
      });
    }
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: "Access denied. HR role required.",
    });
  }
};

// @desc    Check if user is authenticated (all users in mock interview app)
exports.isCandidate = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Please log in.",
      });
    }
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: "Access denied.",
    });
  }
};

