const express = require("express");
const userRoutes = require("./routes/userRoutes");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const path = require("path");
const crypto = require("crypto");
const User = require("./models/userModel");

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: false}));


app.use("/api/v1/users", userRoutes);

app.get("/css", async(req, res, next) => {
    res.sendFile(path.join(__dirname + "/resetPage.css"));
});
app.get("/Reset-Password/:token", async(req, res, next) => {
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: {$gt: Date.now()}
    });

    if(!user) {
        res.sendFile(path.join(__dirname + "/errorPage.html")); 
        return;
    }

    res.sendFile(path.join(__dirname + "/resetPasswordPage.html"));
});
app.post("/Reset-Password/:token", async(req, res, next) => {
    const {password, passwordConfirm} = req.body;
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: {$gt: Date.now()}
    });

    if(!user) {
        res.sendFile(path.join(__dirname + "/errorPage.html"));
        return;
    }

    user.password = password;
    user.passwordConfirm = passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.sendFile(path.join(__dirname + "/successPage.html"));
});


app.all("*", (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
app.use(globalErrorHandler);


module.exports = app;