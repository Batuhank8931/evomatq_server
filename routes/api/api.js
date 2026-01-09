const express = require("express");

const verifyToken = require("../../middleware/auth.js");
const dashboard_data = require("../../models/dashboard_data.js");

const {
  getRacks,
  updateRack
} = require("../../models/rack_data.js");

const { get_flash_light, clear_flash_light } = require("../../models/get_flash_light.js");
const { getMailSettings, updateMailSettings } = require("../../models/mail_settings.js");
const { getPasswordSettings, updatePasswordSettings, addNewUser, deleteUser } = require("../../models/password_settings.js");

const getRacksByProductCode = require("../../models/get_product_data.js");

// Import your request functions
const { addRequest, getRequests, getActiveRquests, updateRequestsStatus, updateRequestsQuantity, updateRequestsItem } = require("../../models/request.js");
const getReviewers = require("../../models/get_reviewers.js");
const { GetRackDesign, InsertRackDesign, updateRackDesign, deleteRackDesign } = require("../../models/rack_design_settings.js");
const { new_productStepTwo } = require("../../models/new_product.js");
const { calibration } = require("../../models/calibration.js");


const router = express.Router();

// Dashboard
router.get('/dashboard_data', verifyToken, dashboard_data);

// Rack data
router.get("/rack_data", verifyToken, getRacks);
router.put("/rack_data/:id", verifyToken, updateRack);


// Flash light
router.post("/get_flash_light", verifyToken, get_flash_light);
router.get("/clear_flash_light", verifyToken, clear_flash_light)

// Mail settings
router.get("/mail_settings", verifyToken, getMailSettings);
router.put("/mail_settings", verifyToken, updateMailSettings);

// Password settings
router.get("/password_settings", verifyToken, getPasswordSettings);
router.put("/password_settings", verifyToken, updatePasswordSettings);
router.post("/add_new_user", verifyToken, addNewUser);
router.delete("/deleteuser/:user_id", verifyToken, deleteUser);

// Product detail
router.post("/product_detail", verifyToken, getRacksByProductCode);

// Request routes
router.post("/requests", verifyToken, addRequest);   // Add a new request
router.get("/requests", verifyToken, getRequests);  // Get all requests
router.get("/getactivereqeusts", verifyToken, getActiveRquests);  // Get all requests
router.put("/requests/:adding_number", verifyToken, updateRequestsStatus);
router.put("/updaterequests/:adding_number/:product_code/:id", verifyToken, updateRequestsItem);
router.put("/updaterequestquantity/:adding_number/:product_code/:id", verifyToken, updateRequestsQuantity);


router.get("/getreviewers", verifyToken, getReviewers);

router.get("/getrackdesign/:id?", verifyToken, GetRackDesign);
router.post("/addrackdesign", verifyToken, InsertRackDesign);
router.put("/updaterackdesign/:id", verifyToken, updateRackDesign);
router.delete("/deleterackdesign/:id", verifyToken, deleteRackDesign);

router.post("/new_product_step_two", verifyToken, new_productStepTwo);
router.post("/calibration", verifyToken, calibration);

module.exports = router;
