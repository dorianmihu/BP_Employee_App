var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var Employee  = require("./models/employee");
var  passport   = require("passport");
var methodOverride  = require("method-override");
var LocalStrategy   = require("passport-local");
var flash       = require("connect-flash");
var fileUpload = require("express-fileupload");
var middleware = require("./middleware");
var path = require('path');
var fs = require('fs');
//var multer = require("multer");


mongoose.connect("mongodb://localhost/BPEmployees");
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname+"/public"));
app.use(methodOverride("_method"));
app.use(flash());
app.use(fileUpload());

//PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret:"This is a secret thingy",
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(Employee.authenticate()));
passport.serializeUser(Employee.serializeUser());
passport.deserializeUser(Employee.deserializeUser());

app.use(function(req, res, next){
   res.locals.currentUser=req.user; //passport iti extrage el direct userul logat intr-un obiect referentiat de "req.user"
   res.locals.error = req.flash("error");
   res.locals.success = req.flash("success");
   next();
});


//HOME PAGE
app.get("/",middleware.isLoggedIn, function(req,res){
    Employee.find({},function(err,employees){
            if(err){
                console.log(err);
                //req.flash("error",err.message);
                res.send(500, 'Something went wrong ' +err.message);
            } else {
                employees.forEach(function(employee){
                  if(employee.leavingStartDate && employee.leavingStartDate!= null &&employee.leavingStartDate!=undefined && employee.leavingStartDate < Date.now()){
                      employee.onLeaving = true;
                  } 
                  if(employee.leavingEndDate &&employee.leavingEndDate!= null && employee.leavingEndDate!=undefined && employee.leavingEndDate<=Date.now()){
                      employee.onLeaving = false;
                      employee.leavingStartDate=undefined;
                      employee.leavingEndDate=undefined;
                       Employee.findByIdAndUpdate(employee.id,{ $set: { leavingStartDate: undefined, leavingEndDate:undefined, onLeaving:false }},function(err,employeeUpdated){
                                        if(err){
                                            console.log(err);
                                            req.flash("error","There was an error: "+err.message);
                                        } 
                       });
                  }
                  if(employee.vacationStartDate &&employee.vacationStartDate!= null && employee.vacationStartDate!=undefined  && employee.vacationStartDate<Date.now()) {
                      employee.onVacation=true;
                  } 
                  if(employee.vacationEndDate &&employee.vacationEndDate!= null && employee.vacationEndDate!=undefined && employee.vacationEndDate<=Date.now()) {
                      employee.onVacation=false;
                      employee.vacationStartDate=undefined;
                      employee.vacationEndDate=undefined;
                       Employee.findByIdAndUpdate(employee.id,{ $set: { vacationStartDate: undefined, vacationEndDate:undefined, onVacation:false }},function(err,employeeUpdated){
                                        if(err){
                                            console.log(err);
                                            req.flash("error","There was an error: "+err.message);
                                        } 
                       });
                      
                  }
               }); 
                res.render('employees',{employees:employees});             
            }
    });
    
});

//search route
app.post("/employees/search",middleware.isLoggedIn,function(req,res){
    /*res.send(req.body.searchTerm);*/
    var foundEmployees = [];
    if(!req.body.searchTerm || req.body.searchTerm.length<1){
        req.flash("error","Can't search for an empty string...");
        return  res.redirect("/");
    } else {
    Employee.find({firstName:new RegExp('^' + req.body.searchTerm, 'i')},function(err,found){
        if(err){
            console.log("err");
            req.flash("error","There was an error "+err.message);
            return  res.redirect("back");
        } else {
            if(found.length>0){
               // console.log("found more than one:"+found.length);
                found.forEach(function(employee){
                    foundEmployees.push(employee);
                });
                    Employee.find({lastName:new RegExp('^' + req.body.searchTerm, 'i')},function(err,found){
                        if(err){
                            console.log("err");
                            req.flash("error","There was an error "+err.message);
                            res.redirect("/");
                        } else if(found.length>0){
                            found.forEach(function(employee){
                                foundEmployees.push(employee);
                            })
                        }
                    });
                    if(foundEmployees.length > 0){
                       res.render('employees',{employees:foundEmployees});  
                    } else {
                        req.flash("error","Couldn't find any employee with that name");
                        res.redirect("/");
                    }
            } else { //end if foundlegnth
              //IF NOT FOUND BY FIRSTNAME TRY AND FIND BY LAST NAME:
                Employee.find({lastName:new RegExp('^' + req.body.searchTerm, 'i')},function(err,found){
                        if(err){
                            console.log("err");
                            req.flash("error","There was an error "+err.message);
                             res.redirect("/");
                        } else if(found.length>0){
                            found.forEach(function(employee){
                                foundEmployees.push(employee);
                            })
                        }
                    });
                    if(foundEmployees.length > 0){
                       res.render('employees',{employees:foundEmployees});  
                    } else {
                        req.flash("error","Couldn't find any employee with that name");
                        res.redirect("/");
                    }
                
            }//end else case search only by lastName
        }
    });
    
    } //end of else searchTerm exists  
    
    //res.redirect("/");
});
//SHOW ROUTE
app.get("/employees/:id",middleware.isLoggedIn,function(req,res){
       Employee.findById(req.params.id,function(err,employee){
                if(err){
                    console.log(err);
                    req.flash("error",err.message);
                    res.redirect("back");
                } else {
                    res.render("show",{employee:employee});
                }
       });
        
});
//SHOW BY TEAM
app.get("/employees/team/:id",middleware.isLoggedIn,function(req, res) {
        if(req.params.id==="na"){
        Employee.find({team:"n/a"},function(err, foundEmployees) {
                 if(err){
                     console.log(err);
                     req.flash("error","There was an error "+err.message);
                     res.redirect("/");
                 } else {
                     if(foundEmployees.length>0){
                     res.render("employees",{employees:foundEmployees});
                     } else {
                         req.flash("error", "Cannot find any employees in that team");
                         res.redirect("/");
                     }
                 }
        }); 
        } else {
            Employee.find({team:req.params.id},function(err, foundEmployees) {
                 if(err){
                     console.log(err);
                     req.flash("error","There was an error "+err.message);
                     res.redirect("/");
                 } else {
                     if(foundEmployees.length>0){
                     res.render("employees",{employees:foundEmployees});
                     } else {
                         req.flash("error", "Cannot find any employees in that team");
                         res.redirect("/");
                     }
                 }
        }); 
            
        }
});
//SHOW BY ROLE
app.get("/employees/role/:id",middleware.isLoggedIn,function(req, res) {
        
        if(req.params.id==="Manager") {
            Employee.find({role:"Manager"},function(err, foundEmployees) { //aici era inainte "Manager/Lead" in loc de doar "Manager"
                     if(err){
                         console.log(err);
                         req.flash("error","There was an error "+err.message);
                         res.redirect("/");
                     } else {
                         if(foundEmployees.length>0){
                         res.render("employees",{employees:foundEmployees});
                         } else {
                             req.flash("error", "Cannot find any employees with that role");
                             res.redirect("/");
                         }
                     }
            });
        } else {
            Employee.find({role:req.params.id},function(err, foundEmployees) {
                     if(err){
                         console.log(err);
                         req.flash("error","There was an error "+err.message);
                         res.redirect("/");
                     } else {
                         if(foundEmployees.length>0){
                         res.render("employees",{employees:foundEmployees});
                         } else {
                             req.flash("error", "Cannot find any employees with that role");
                             res.redirect("/");
                         }
                     }
            }); 
        }
});




//REGISTER ROUTES
    //NEW USER
app.get("/register",function(req,res){
    res.render("register"); 
});
    //CREATE NEW USER
app.post("/register",function(req,res){
   var newUser = {
       username: req.body.username,
       firstName: req.body.firstName,
       lastName: req.body.lastName,
       team: req.body.team,
       role: req.body.role
   };
   Employee.register(newUser,req.body.password,function(err,user){
                if(err){
                    console.log(err);
                    req.flash("error",err.message);
                    return res.render("register");
                } else {
                    passport.authenticate("local")(req,res,function(){
                              req.flash("success","Welcome to BearingPoint Employee Vacation App "+user.firstName);
                              res.redirect("/"); 
                        });
                }
   });
});

//CHANGE PICTURE ROUTE
app.put("/employees/:id/picture", middleware.checkEmployeeOwnership, middleware.upload, function(req,res){
          //var picturePath = req.picturePath;
          //var oldPicturePath;
          //console.log(picturePath);
          Employee.findById(req.user.id,function(err,employee){
             if(err){
                 console.log(err);
                 req.flash("error",err.message);
                 return res.redirect("back");
             } else {
                 var path1 =__dirname
                 console.log("Path1 "+path1);
                 var oldPicturePath=path1+"/public/"+employee.picture;
                 console.log("Old Pic path is: "+oldPicturePath);
                 //We Delete the Old file if a new file is provided
                 if(oldPicturePath && oldPicturePath.length>0 && req.picturePath &&req.picturePath.length>0 ){
                        fs.unlinkSync(oldPicturePath);
                    }
                 
             }
          });
          Employee.findByIdAndUpdate(req.user.id,{ $set: { picture: req.picturePath }},function(err,employeeUpdated){
                if(err){
                    console.log(err);
                    req.flash("error","There was an error: "+err.message);
                } else {
                    //if oldPicture path exists then delete it
                    
                    req.flash("success","You sexy mothafucka :D (Employee Picture Updated) ");
                    res.redirect("back");
                }
          });
});

//EDIT EMPLOYEE DETAILS ROUTE
app.put("/employees/:id/details",middleware.checkEmployeeOwnership, function(req,res){
    Employee.findByIdAndUpdate(req.user.id,{$set:{firstName:req.body.firstName,lastName:req.body.lastName,team:req.body.team,role:req.body.role}},function(err, employeeUpdated) {
                    if(err){
                        console.log(err);
                        req.flash("error","There was an error: "+err.message);
                    } else {
                        req.flash("success","You've successfully changed your details");
                        res.redirect("back");
                    }
    });
});
//--------------
//ADD VACATION ROUTE
app.put("/employees/:id/vacation", middleware.checkEmployeeOwnership, function(req,res){
    Employee.findByIdAndUpdate(req.user.id,{$set:{vacationStartDate:req.body.vacationStartDate, vacationEndDate:req.body.vacationEndDate}},function(err,employeeUpdated){
            if(err){
                console.log(err);
                req.flash("error","There was an error: "+err.message);
            } else {
                //console.log(employeeUpdated);
                req.flash("success","Vacation Added");
                res.redirect("/");
            }
    });
});
//LEAVING PERMISSION ROUTE
app.put("/employees/:id/leaving", middleware.checkEmployeeOwnership, function(req,res){
    var startTime =new Date((new Date(Date.now())).toISOString().substr(0,11)+
                    (req.body.leavingStartTime.length===8?req.body.leavingStartTime:(req.body.leavingStartTime+":00"))+
                    (new Date(Date.now())).toISOString().substr(19,(new Date(Date.now())).toISOString().length));
    var endTime =new Date((new Date(Date.now())).toISOString().substr(0,11)+
                    (req.body.leavingEndTime.length===8?req.body.leavingEndTime:(req.body.leavingEndTime+":00"))+
                    (new Date(Date.now())).toISOString().substr(19,(new Date(Date.now())).toISOString().length));
    var onLeaving = (startTime<Date.now()?true:false);
    Employee.findByIdAndUpdate(req.user.id,{$set:{leavingStartDate:startTime, leavingEndDate:endTime, onLeaving:onLeaving}},function(err,employeeUpdated){
            if(err){
                console.log(err);
                req.flash("error","There was an error: "+err.message);
            } else {
                //console.log(employeeUpdated);
                req.flash("success","Leaving Permission Added");
                res.redirect("/");
            }
    });
});

//DELETE VACATION ROUTE
app.delete("/employees/:id/vacation", middleware.checkEmployeeOwnership, function(req,res){
          Employee.findByIdAndUpdate(req.user.id,{$set:{vacationStartDate:undefined, vacationEndDate:undefined}},function(err,employeeUpdated){
            if(err){
                console.log(err);
                req.flash("error","There was an error: "+err.message);
            } else {
               // console.log(employeeUpdated);
                req.flash("success","Vacation Removed");
                res.redirect("back");
            }
    });
});
//DELETE LEAVING ROUTE
app.delete("/employees/:id/leaving", middleware.checkEmployeeOwnership, function(req,res){
          Employee.findByIdAndUpdate(req.user.id,{$set:{leavingStartDate:undefined, leavingEndDate:undefined, onLeaving:false}},function(err,employeeUpdated){
            if(err){
                console.log(err);
                req.flash("error","There was an error: "+err.message);
            } else {
               // console.log(employeeUpdated);
                req.flash("success","Leaving Permission Removed");
                res.redirect("back");
            }
    });
});



//LOG IN ROUTES
    //SHOW LOGIN
app.get("/login",function(req, res) {
    res.render("login"); 
});

app.post("/login", passport.authenticate("local",{
    successRedirect:"/",
    failureRedirect:"/login"
}),function(req, res) { //nici nu mai trebuie callback fiindca nu mai ajunge aici
});
//LOG OUT ROUTE
app.get("/logout",function(req, res) {
        req.logout();
        //req.flash("error","Logged you out!");
        res.redirect("/login");
});

app.get("*",function(req, res) {
   res.redirect("/"); 
});

app.listen(process.env.PORT,process.env.IP,function(){
     console.log("Bearing Point Vacation Management App started...");
});

