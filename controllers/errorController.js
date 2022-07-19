const AppError = require("../utils/appError");

const handleDuplicateFieldsDB = error => {
    const value = error.keyValue.email;
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 400);
}

const handleValdiationErrorDB = error => {
    const errors = Object.values(error.errors).map((temp) => temp.message);
    const message = `Invalid input data. ${errors.join(". ")}`;
    return new AppError(message, 400);
}

const handleJsonWebTokenError = () => new AppError("Invalid token. Please log in again!", 401);
const handleTokenExpiredError = () => new AppError("Your token has expired. Please log in again", 401);

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message
    });
}

const sendErrorProd = (err, res) => {
    if(err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            statusCode: err.statusCode,
            message: err.message
        });
    } else {
        res.status(500).json({
            status: "Error",
            message: "Something went very wrong !"
        });
    }
}

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "Error";

    if(process.env.NODE_ENV === "development") {
        sendErrorDev(err, res);
    } else if(process.env.NODE_ENV === "production") {
        let error = {...err};
        if(error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (err.name === "ValidationError") error = handleValdiationErrorDB(error);
        if(err.name === "JsonWebTokenError") error = handleJsonWebTokenError();
        if(err.name === "TokenExpiredError") error = handleTokenExpiredError();
        sendErrorProd(error, res);
    }
};