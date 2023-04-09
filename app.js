const express = require("express");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");
const User = require("./database/Sechma/userSechma.js");
const app = express();
const { isEmpty } = require("./function.js");
var jwt = require("jsonwebtoken");
const Group = require("./database/Sechma/groupSechma");

const port = process.env.PORT || 8000;
//Database Connection
require("./database/connecion.js");

//MiddelWare
app.use(cors());
app.use(express.json());

//Router
app.post("/auth/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (isEmpty(name) || isEmpty(email) || isEmpty(password)) {
    return res.status(400).json({ error: "Please fill all the fields" });
  } else {
    const emailExist = await User.findOne({ email: email });
    if (emailExist) {
      return res.status(400).json({ error: "Email already exist" });
    } else {
      const userId = uuidv4();
      const user = new User({
        email,
        name,
        password,
        userId,
      });
      await user.save();
      return res.status(200).json({ message: "Signup successfull" });
    }
  }
});

//------------------Login------------------
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (isEmpty(email) || isEmpty(password)) {
    return res.status(400).json({ error: "Please fill all the fields" });
  } else {
    const userExist = await User.findOne({ email: email });
    if (userExist) {
      if (userExist.password == password) {
        const token = jwt.sign(
          {
            userId: userExist.userId,
            name: userExist.name,
            email: userExist.email,
          },
          "secret",
          { expiresIn: "1h" }
        );
        userExist.token = token;
        await userExist.save();
        return res.status(200).json({
          message: "Login successfull",
          token: token,
          userId: userExist.userId,
        });
      } else {
        return res.status(400).json({ error: "Invalid Credentials" });
      }
    } else {
      return res.status(400).json({ error: "Invalid Credentials" });
    }
  }
});

//Get All Users API
app.get("/getUsers", async (req, res) => {
  const token1 = req.headers["authorization"];
  if (isEmpty(token1)) {
    return res.status(400).json({ error: "Token is not provided" });
  } else {
    const userExist = await User.findOne({ token: token1 });
    if (userExist) {
      User.find({}, { name: 1, email: 1 }).then(function (users) {
        res.send(200, users);
      });
    } else {
      return res.status(400).json({ error: "Unauthorized access" });
    }
  }
});

//----------------Create Group----------------
app.post("/group/create/:id", async (req, res) => {
  const { groupName, groupArray } = req.body;

  if (!isEmpty(groupName) && groupArray.length > 0) {
    const userExist = await User.findOne({ userId: req.params.id });
    if (userExist) {
      groupArray.push(userExist.email);
      const group = new Group({
        groupId: uuidv4(),
        groupName: groupName,
        groupMembers: groupArray,
      });
      // Add the group ID to every email found in the groupArray array
      for (let i = 0; i < groupArray.length; i++) {
        const memberEmail = groupArray[i];
        const memberUser = await User.findOne({ email: memberEmail });
        if (memberUser) {
          memberUser.group.push(group.groupId);
          await memberUser.save();
          await group.save();
        } else {
          return res.status(400).json({ error: `All users are not found` });
        }
      }
    } else {
      return res.status(400).json({ error: "User not found" });
    }
  } else {
    return res.status(400).json({ error: "Please add atleast 2 members" });
  }
  return res.status(200).json({ message: "Group created successfull" });
});

//----------------Get Groups----------------
app.get("/getgroups", async (req, res) => {
  const token1 = req.headers["authorization"];
  const user = jwt.decode(token1);
  if (isEmpty(token1)) {
    return res.status(400).json({ error: "Token is not provided" });
  } else {
    const userExist = await User.findOne({ userId: user.userId });
    if (userExist) {
      const groups = userExist.group;
      let listGroup = [];
      for (let i = 0; i < groups.length; i++) {
        const group = await Group.findOne({ groupId: groups[i] });
        listGroup.push(group);
      }
      res.status(200).json({ groups: listGroup });
    } else {
      return res.status(400).json({ error: "Unauthorized access" });
    }
  }
});

//Listener
app.listen(port, () => {
  console.log("Server is running on port: ", port);
});
