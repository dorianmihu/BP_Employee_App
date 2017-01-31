//all the middleware goes here
var Employee = require("../models/employee");
//dependencies for image upload---
var path = require('path');
/*var uid = require('uid2');
var mime = require('mime');*/
//--------------------------------
//CONSTANTS---
//var TARGET_PATH = path.resolve(__dirname, '../writable/');
var TARGET_PATH = path.resolve(__dirname, "../public/writable");
var IMAGE_TYPES = ['image/jpeg', 'image/png'];
//------------

var middlewareObj = {};

middlewareObj.checkEmployeeOwnership = function(req,res,next){
    if(req.isAuthenticated()){
            
            Employee.findById(req.params.id,function(err,foundEmployee){
                if(err){
                    console.log(err);
                    req.flash("error",err);
                    res.redirect("back");
                } else {
                    //does user own campground?
                    if(foundEmployee._id.equals(req.user._id)){
                       // res.render("campgrounds/edit",{campground:foundCampground});              
                       next();
                    } else {
                        req.flash("error","You are not the author of that campground");
                        res.redirect("back"); // asta te intoarce mereu la pagina la care ai fost anterior
                    }
                    
                }
            
            });
    } else {
        //if not redirect
         req.flash("error","You need to be logged in to do that");
         res.redirect("back"); // asta te intoarce mereu la pagina la care ai fost anterior
        
    }
};

middlewareObj.isLoggedIn=function(req,res,next){
    if(req.isAuthenticated())
    {
        //req.flash("success","You logged in succesfully");
        return next();
    }
    else
    {
        req.flash("error","Please Log In first !");
        res.redirect("/login");
    }
};

middlewareObj.upload = function(req, res, next) {
    
   // console.log(req.files);
   // console.log(TARGET_PATH);
    if(req.files.file)
    {
        var targetPath = path.join(TARGET_PATH, req.files.file.name);
       //var targetPath = TARGET_PATH + "/"+req.files.file.name;
        console.log("TargetPath should be: "+targetPath);
        var pictureFile = req.files.file;
        pictureFile.mv(targetPath,function(err){
           if(err){
               console.log(err);
               return res.render("back");
           } else {
               //req.picturePath=targetPath;
               req.picturePath=path.join("/writable/",req.files.file.name);
               return next();
           }
        }); 
    } else {
        req.flash("error","No upload picture  was provided");
        res.redirect("back");
    }
    
     
  };


module.exports = middlewareObj;