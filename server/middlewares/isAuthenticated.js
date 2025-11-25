import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
const isAuthenticated = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({
        message: "User not authenticated",
        success: false,
      });
    }
    const decode = await jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decode.userId); 
    if (!decode) {
      return res.status(401).json({
        message: "Invalid token",
        success: false,
      });
    }
    req.id = decode.userId;
    req.user = {
     _id: decode.userId,
     role: decode.role,
   };
   req.user = user;
    next();
  } catch (error) {
    console.log(error);
  }
};

export const adminOnly = (req, res, next)=>{
    console.log(req.user.role);
    if(req.user && req.user.role=="instructor"){
        next();
    }else{
        res.status(400).json({Message:"only admins can access"});
    }
};
export default isAuthenticated;
