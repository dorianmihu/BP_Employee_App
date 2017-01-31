var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var employeeSchema = mongoose.Schema({
      username:  String,
      password:  String,
      firstName: String,
       lastName: String,
        picture: String,
           role: String,
           team: String,
vacationStartDate: Date,
 vacationEndDate:  Date,
  leavingStartDate:Date,
   leavingEndDate: Date,
      onVacation: false,
       onLeaving: false
});
employeeSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("Employee", employeeSchema);