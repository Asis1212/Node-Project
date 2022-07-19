const express = require("express");
const userController = require("./../controllers/userController");
const authController = require("./../controllers/authController");

const router = express.Router();

router.post("/signUp", authController.signUp);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

router.use(authController.protect)

router.get("/me", userController.getMe);
router.patch("/updateMe",userController.uploadUserPhoto, userController.updateMe);
router.patch("/deleteMe", userController.deleteMe);

router.use(authController.restrictTo("admin"));

router.route("/")
    .get(userController.findAll)
    .post(userController.createUser);

router.route("/:email")
    .get(userController.findUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser);

router.patch("/renewalUser/:email", userController.renewalUser);
router.patch("/activateUser/:email", userController.activateUser);
router.post("/createUsers", userController.createHundredUsers);
router.get("/:startMonth/:endMonth", userController.getUsersBetweenMonths);

module.exports = router;