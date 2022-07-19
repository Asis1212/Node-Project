const crypto = require("crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, "A user must have a first-name"],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, "A user must have a last-name"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "A user must have a email"],
        unique: true,
        trim: true
    },
    photo: {
        type: String,
        default: "default.jpg"
    },
    registeredDate: {
        type: Date,
        default: Date.now()
    },
    expiryDate: {
        type: Date
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: "user"
    },
    password: {
        type: String,
        required: [true, "Please provide a password"],
        minlength: [8, "A user password must have more or equal to 8 characters."],
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, "A user must have a password confirm"],
        validate: {
            validator: function(el) {
                return el === this.password;
            },
            message: "Passwords are not the same"
        }
    },
    passwordChangedAt : {
        type: Date,
        select: false
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
});

userSchema.pre("save", async function(next) {
    let date = new Date(this.registeredDate);
    this.expiryDate = date.setMonth(date.getMonth() + 1);

    if(!this.isModified("password")) return next();

    this.passwordChangedAt = Date.now() - 1000;
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;

    next();
});

userSchema.methods.isCorrectPassword = async function(loginUserPass, passInDatabase) {
    return await bcrypt.compare(loginUserPass, passInDatabase);
}
userSchema.methods.isChangedPasswordAfter = async function(JWTTimesstamp) {
    if(this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime()/1000, 10);
        return JWTTimesstamp < changedTimestamp;
    }
    return false;
} 

userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString("hex");

    this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    this.passwordResetExpires = Date.now() + 10*60*1000;

    return resetToken;
}

const User = mongoose.model("User", userSchema);

module.exports = User;