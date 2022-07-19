const User = require("./../models/userModel");
const mongoose = require("mongoose");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("../utils/appError");
const multer = require("multer");

let lastIndexUser = 1;

const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/img");
    },
    filename: (req, file, cb) => {
        const ext = file.mimetype.split("/")[1];
        cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
    }
});

const multerFilter = (req, file, cb) => {
    if(file.mimetype.startsWith("image")) {
        cb(null, true);
    } else {
        cb(new AppError("Not an image. Please upload only images.", 400), false);
    }
}

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

exports.uploadUserPhoto = upload.single("photo");

const filterObj = (obj, ...properties) => {
    const newObject = {};
    Object.keys(obj).forEach((temp) => {
        if(properties.includes(temp)) newObject[temp] = obj[temp];
    });

    return newObject;
}

// Admin Interface
exports.findAll = catchAsync(async(req, res, next) => {
    const users = await User.find();

    res.status(200).json({
        status: "success",
        results: users.length,
        data: {
            users
        }
    });
});

exports.findUser = catchAsync(async(req, res, next) => {
    const user = await User.findOne({email: req.params.email}, {__v:0});

    if(!user) {
        return next(new AppError("No user found with that email!", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            user
        }
    });
});

exports.createUser = catchAsync(async(req, res, next) => {
    if(req.file) req.body.photo = req.file.filename;
    const newUser = await User.create(req.body);

    res.status(200).json({
        status: "success",
        data: {
            user: newUser
        }
    });
});

exports.updateUser = catchAsync(async(req, res, next) => {
    if(req.file) req.body.photo = req.file.filename;
    const updatedUser = await User.findOneAndUpdate({email: req.params.email}, req.body, {
        new: true,
        runValidators: true
    }).select("+passwordChangedAt");

    if(!updatedUser) {
        return next(new AppError("No user found with that email!", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            updatedUser
        }
    });
});

exports.renewalUser = catchAsync(async(req, res, next) => {
    let renewaledUser = await User.findOne({email: req.params.email});

    if(!renewaledUser) {
        return next(new AppError("No user found with that email!", 404));
    }

    const timeNow = parseInt(Date.now()/1000, 10);
    const expiryDate = parseInt(renewaledUser.expiryDate.getTime()/1000, 10);
    if(timeNow < expiryDate) {
        return next(new AppError("The user is active and valid.", 401));
    }

    renewaledUser = await User.findOneAndUpdate({email: req.params.email}, {expiryDate: Date.now() + 30*24*60*60*1000}, {
        new: true
    });

    res.status(200).json({
        status: "success",
        data: {
            renewaledUser
        }
    });
});

exports.activateUser = catchAsync(async(req, res, next) => {
    const activateuser = await User.findOneAndUpdate({email: req.params.email}, {active : true}, {
        new: true
    }).select("+active");

    if(!activateuser) {
        return next(new AppError("No user found with that email!", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            activateuser
        }
    });
});

exports.createHundredUsers = catchAsync(async(req, res, next) => {
    let newUser;
    let monthRandom;
    let dayRandom;
    for(let i=0; i<5; i++) {
        monthRandom = Math.floor(Math.random() * 2) + 6;
        dayRandom = Math.floor(Math.random() * 31) + 1;
        newUser = new User({
            firstName: `User${lastIndexUser}`,
            lastName: `User${lastIndexUser}`,
            email: `user${lastIndexUser}@user${lastIndexUser}.io`,
            registeredDate: new Date(2022, monthRandom, dayRandom), 
            password: "user1234",
            passwordConfirm: "user1234"
        });
        await newUser.save();
        lastIndexUser++;
    }

    res.status(200).json({
        status: "success"
    });
});

exports.deleteUser = catchAsync(async(req, res, next) => {
    const deletedUser = await User.findOneAndDelete({email: req.params.email});

    if(!deletedUser) {
        return next(new AppError("No user found with that email!", 404));
    }

    res.status(200).json({
        status: "success",
        message: "The user deleted successfully",
        data: null
    });
});

// User Interface
exports.getMe = catchAsync(async(req, res, next) => {
    const MyUser = await User.findById(req.user._id);


    res.status(200).json({
        status: "success",
        data: {
            MyUser
        }
    });
});

exports.updateMe = catchAsync(async(req, res, next) => {
    const filteredBody = filterObj(req.body, "firstName", "lastName", "email", "photo");
    if(req.file) filteredBody.photo = req.file.filename;
    const updatedMe = await User.findByIdAndUpdate(req.user._id, filteredBody, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        status: "success",
        data: {
            updatedMe 
        }
    });
});

exports.deleteMe = catchAsync(async(req, res, next) => {
    await User.findByIdAndUpdate(req.user._id, {active: false});

    res.status(200).json({
        status: "success",
        data: null
    });
});

// Aggregation
exports.getUsersBetweenMonths = catchAsync(async(req, res, next) => {
    const startMonth = parseInt(req.params.startMonth);
    const endMonth = parseInt(req.params.endMonth);
    if(startMonth > endMonth || startMonth > 12 || endMonth > 12) {
        return next(new AppError("The parameters are not valid !", 404));
    }

    const users = await User.aggregate([
        {
            $match: {
                registeredDate: {$gte: new Date(`2022-${startMonth}-1`),
                                 $lte: new Date(`2022-${endMonth}-31`)}
            }
        }
    ]);

    if(!users) {
        return next(new AppError("There is no users between the months"));
    }

    res.status(200).json({
        status: "success",
        results: users.length,
        data: {
            users
        }
    });
});