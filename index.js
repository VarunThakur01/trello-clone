const express = require("express");
const jwt = require("jsonwebtoken");


const {authMiddleware} = require("./middleware");

const app = express();

const PORT = 8000;

app.use(express.json());


const passKey ="unicorn";

let USER_ID = 1;
let ORGANIZATION_ID = 1;
let BOARD_ID = 1;
let ISSUES_ID = 1;

const USERS =[];

const ORGANISATIONS =[];

const BOARDS =[];

const ISSUES = [];

app.post("/signup",(req,res) => {
    const username = req.body.username;
    const password = req.body.password;

    const userExist = USERS.find((user) => user.username === username );

    if(userExist){
        res.status(411).json({
            message: "user with this user name already exit "
        })
        return;
    }

    USERS.push({
        username,
        password,
        id: USER_ID++
    });

    res.status(201).json({
        message: "You have signed up sucessfully"
    })
});

app.post("/signin",(req,res) => {
    const username = req.body.username;
    const password = req.body.password;

    const userExist = USERS.find((user) => user.username === username && user.password === password);

    if(!userExist){
        return res.status(403).json({
            message: "invalid credentials"
        })
    }

    const token = jwt.sign({
        userId : userExist.id
    },passKey);

    res.json({
        token 
    });
})

app.post("/organisation",authMiddleware,(req,res) => {
    const userId = req.userId;

    ORGANISATIONS.push({
    id: ORGANIZATION_ID++,
    title: req.body.title,
    description: req.body.description,
    admin: userId,
    members: []
    })

    res.status(201).json({
        message:"org created",
        id : ORGANIZATION_ID - 1
    })
})

app.post("/add-member-to-org",authMiddleware,(req,res) => {
    const userId = req.userId;
    const organizationId = parseInt(req.body.organizationId);
    const memberUserName = req.body.memberUserName;

    const organisation = ORGANISATIONS.find((org) => {
        return org.id === organizationId
    });

    
    if(!organisation){
        return res.status(404).json({
            message: " organisation not found"
        })
    }

    if(organisation.admin != userId){
        return res.status(404).json({
            message: "user is not the admin of the organisation "
        })
    }

    const memberUser = USERS.find((user) => user.username === memberUserName);

    if(!memberUser){
        return res.status(404).json({
            message: "user not found with this username "
        })
    }

    if(organisation.members.includes(memberUser.id)){
        return res.status(409).json({
            message:"user already added to the org "
        })
    }   

    organisation.members.push(memberUser.id);

        res.status(200).json({
            message: "member added to organisation succesfully"
    })
});

app.post("/board",authMiddleware,(req,res) => {
    
    const organisationExists = ORGANISATIONS.find(org => org.id === Number(req.body.organizationId));

    if(!organisationExists){
        return res.status(404).json({
            message: "organization not found"
        })
    }

    BOARDS.push({
        id:BOARD_ID++,
        organizationId: parseInt(req.body.organizationId),
        title: req.body.title
    });

    res.status(201).json({
        message: "board create"
    })
});

app.post("/issue",authMiddleware,(req,res) => {

     const boardExists = BOARDS.find(b => b.id === Number(req.body.boardId));

    if(!boardExists){
        return res.status(404).json({
            message: "board not found"
        })
    }

     ISSUES.push({
        id:ISSUES_ID++,
        boardId: parseInt(req.body.boardId),
        title: req.body.title,
        state: req.body.state
    });

    res.status(201).json({
        message: "issue create"
    })
})


//
app.get("/organisation",authMiddleware,(req,res) => {
    const userId = req.userId;
    const organizationId = parseInt(req.query.organizationId);

     const organisation = ORGANISATIONS.find((org) => {
        return org.id === organizationId
    });


    if(!organisation || organisation.admin !== userId){
        return res.status(404).json({
            message: "Either organisation not found or user is not the admin of the organisation "
        })
    }

    res.status(200).json({
        organisation : {
            ...organisation,
            members: organisation.members.map((memberId) => {
                const user = USERS.find(user => user.id === memberId)
                return {
                    id : user.id,
                    username : user.username
                }
            })
        }
    })
})



app.get("/boards",authMiddleware,(req,res) => {

    const userId = req.userId;
    const organisationId = Number(req.query.organisationId);
    const organisation = ORGANISATIONS.find(org => org.id === organisationId);

    if(!organisation){
        return res.status(404).json({
            message : "organisation not found "
        })
    }

    if(organisation.admin !== userId && !organisation.members.includes(userId)){
        return res.status(403).json({
            message:"user is not authorized"
        })
    }

    const boards = BOARDS.filter(b => b.organizationId === organisation.id);

    res.status(200).json({
        boards
    })
})

app.get("/issues",authMiddleware,(req,res) => {
    
    const boardId = Number(req.query.boardId);
    const userId = req.userId;

    const board = BOARDS.find(b => b.id === boardId);
    if(!board){
        return res.status(404).json({
            message: "board not found"
        })
    }

    const organisation = ORGANISATIONS.find(org => org.id === board.organizationId);

    if(!organisation){
        return res.status(404).json({
            message:"organisation not found "
        })
    }

    if(organisation.admin !== userId && !organisation.members.includes(userId)){
        return res.status(403).json({
            message:"user is not authorized"
        })
    }

    const issue = ISSUES.filter(iss => iss.boardId === board.id);

    return res.status(200).json({
        issue
    })
})

app.get("/members",authMiddleware,(req,res) => {
    
    const organisationId = Number(req.query.organisationId);
    const userId = req.userId;

    const organisation = ORGANISATIONS.find(org => org.id === organisationId);
    
    
    if(!organisation){
        return res.status(404).json({
            message:"no organisation found "
        })
    };
    
    if(organisation.admin !== userId && !organisation.members.includes(userId)){
        return res.status(403).json({
            message:"user is not authorized"
        })
    }
    
    return res.status(200).json({
        members : organisation.members.map((memberId) => {
                    const user = USERS.find(user => user.id === memberId);
                    if(!user){
                        return null;
                    }
                  return {
                        id : user.id,
                        username : user.username
                }
            })
    })
}) 

app.put("/issues/:id",authMiddleware,(req,res) => {
    const userId = req.userId;
    const issueId = Number(req.params.id);

    
    const issue = ISSUES.find(i => i.id === issueId);
    
    if(!issue){
        return res.status(404).json({
            message : "no issue found"
        })
    }

    const board = BOARDS.find(b => b.id === issue.boardId);

    if(!board){
        return res.status(404).json({
            message : "no board found"
        })
    }

    const organisation = ORGANISATIONS.find(org => org.id === board.organizationId);
    
    if(!organisation){
        return res.status(404).json({
            message : "no organisation found"
        })
    }

    if(organisation.admin !== userId && !organisation.members.includes(userId)){
        return res.status(403).json({
            message:"user is not authorized"
        })
    }

    if(req.body.title){
        issue.title =  req.body.title;
    }

    if(req.body.state){
        issue.state = req.body.state;
    }

    res.status(200).json({
        message : "upadted the issue"
    })
})



//

app.delete("/members",authMiddleware,(req,res) => {
    const userId = req.userId;
    const organizationId = parseInt(req.body.organizationId);
    const memberUserName = req.body.memberUserName;
    
    const organisation = ORGANISATIONS.find((org) => {
        return org.id === organizationId
    });
    
    if(!organisation){
        return res.status(404).json({
            message: " organisation not found"
        })
    }

    if(organisation.admin != userId){
        return res.status(404).json({
            message: "user is not the admin of the organisation "
        })
    }
    
    const memberUser = USERS.find((user) => user.username === memberUserName);
    
    if(!memberUser){
        return res.status(404).json({
            message: "user not found with this username "
        })
    }
    
    organisation.members = organisation.members.filter(user => user !== memberUser.id);
    
    res.status(200).json({
        message: "member deleted from organisation succesfully"
    })
})

// admin routes 

app.get("/users",(req,res) => {
    res.json({
        USERS
    })
})


app.get("/org",(req,res) => {
    res.json({
        ORGANISATIONS
    })
})

app.get("/b",(req,res) => {
    res.json({
        BOARDS
    })
})

app.get("/i",(req,res) => {
    res.json({
        ISSUES
    })
})


app.listen(PORT,() => {
    console.log(`app is running on port ${PORT}`);
});