const mongoose = require("mongoose");
const dotenv = require("dotenv");
const app = require("./app");

dotenv.config({path: "./config.env"});
const { server } = require("live-server");

const DB = process.env.DATABASE.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);

mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
}).then(() => console.log("DB connection successful !"));





const port = process.env.PORT || 3000;
const serverApp = app.listen(port, ()=> {
    console.log(`App running on port ${port}...`);
});

process.on("unhandledRejection", err => {
    console.log(err.name, err.message);
    console.log("UNHANDLE REJECTION 💥 ! Shutting down...");
    serverApp.close(() => {
        process.exit(1);
    });
});
