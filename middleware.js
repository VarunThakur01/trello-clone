const jwt = require("jsonwebtoken");

function authMiddleware(req,res,next){
    const token = req.headers.token;
    
    if(!token){
        return res.status(404).json({
            message: "token not found"
        })
    }

    const decode = jwt.verify(token, "unicorn");
    const userId = decode.userId;

    if(userId){
        req.userId = userId;
        next();
    }else{
        res.status(403).json({
            message:"tokken was incorrect"
        })
    }
}

module.exports = {
    authMiddleware
} 