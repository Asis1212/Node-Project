const { promisify } = require("util");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { decode } = require("punycode");
const sendEmail = require("../utils/email");

const createNewToken = (userId) => {
    return jwt.sign({id: userId}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}

exports.signUp = catchAsync(async(req, res, next) => {
    const newUser = await User.create({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        photo: req.body.photo,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
    });

    const token = createNewToken(newUser._id);

    res.status(201).json({
        status: "success",
        token,
        data: {
            newUser
        }
    });
});

exports.login = catchAsync(async(req, res, next) => {
    const {email, password} = req.body;
    if(!email || !password) {
        return next(new AppError("Please provide email and password !", 400));
    }

    const user = await User.findOne({email}).select("+password +active");
    if(!user || !(await user.isCorrectPassword(password, user.password))) {
        return next(new AppError("Incorrect email or password!", 401));
    }
    
    if(!user.active) {
        return next(new AppError("This user is disabled", 401));
    }

    const timeNow = parseInt(Date.now()/1000, 10);
    const expiryDate = parseInt(user.expiryDate.getTime()/1000, 10);
    if(timeNow > expiryDate) {
        return next(new AppError("The user's activity has expired. Please contact the admin.", 401));
    }

    const token = createNewToken(user._id);

    res.status(200).json({
        status: "success",
        message: "You logging successfully !",
        token
    });
});

exports.protect = catchAsync(async(req, res, next) => {
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if(!token) {
        return next(new AppError("You are not logged in! Please log in to get access.", 401))
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    const freshUser = await User.findById(decoded.id).select("+passwordChangedAt");
    if(!freshUser) {
        return next(new AppError("No user found with that token!", 401));
    }

    if(await freshUser.isChangedPasswordAfter(decoded.iat)) {
        return next(new AppError("User recently changed password! Please log in again", 401));
    }

    req.user = freshUser;
    next();
});

exports.restrictTo = (...roles) => {
    return(req, res, next) => {
        if(!roles.includes(req.user.role)) {
            return next(new AppError("You do not have a premissions to perform this action", 403))
        }
        next();
    }
}

exports.forgotPassword = catchAsync(async(req, res, next) => {
    const user = await User.findOne({email: req.body.email});
    if(!user) {
        return next(new AppError("There is not user with this email", 404));
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({validateBeforeSave: false});

    const resetURL = `${req.protocol}://${req.get("host")}/api/v1/users/resetPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request with your new password and
    passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

    try {
        await sendEmail({
            email: user.email,
            subject: "Your password reset token (valid for 10 min)",
            token: resetToken
        });

        res.status(200).json({
            status: "success",
            message: "Token sent to email!"
        });
    } catch(err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({validateBeforeSave: false});

        return next(new AppError("There was an error sending the email. Try again later!", 500));
    }
});

exports.resetPassword = catchAsync(async(req, res, next) => {
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: {$gt: Date.now()}
    });

    if(!user) {
        return next(new AppError("Token is invalid or has expired", 400));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    const token = createNewToken(user._id);

    res.status(200).json({
        status: "success",
        token
    });
});

exports.logout = catchAsync(async(req, res, next) => {
    res.status(200).json({
        status: "success",
        message: "Logout successfully !"
    });
});

