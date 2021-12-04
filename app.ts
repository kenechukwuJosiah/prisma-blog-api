import { PrismaClient } from "@prisma/client";
import express, { NextFunction, Request, Response } from "express";
import { body, validationResult } from "express-validator";

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

//Validator
const userValidationRules = [
  body("email")
    .isLength({ min: 1 })
    .withMessage("Email must not be empty")
    .isEmail()
    .withMessage("Must be a valid email"),
  body("name").isLength({ min: 1 }).withMessage("Name must not be empty"),
  body("role")
    .isIn(["ADMIN", "USER", "SUPERADMIN", undefined])
    .withMessage(`Role must be 'ADMIN', 'USER', 'SUPERADMIN'`),
];

const simpleValidationResults = validationResult.withDefaults({
  formatter: (err) => err.msg,
});

//Validates Resquest Body
const bodyValidator = (req: Request, res: Response, next: NextFunction) => {
  const errors = simpleValidationResults(req);

  if (!errors.isEmpty())
    return res.status(400).json({
      message: "Error Make sure you entered the correct fields",
      error: errors.mapped(),
    });

  next();
};

//Create User
app.post(
  "/users",
  userValidationRules,
  bodyValidator,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, role } = req.body;
      const isUser = await prisma.user.findUnique({ where: { email } });

      if (isUser)
        return res.status(401).json({ message: "Email already exists!!" });

      const user = await prisma.user.create({
        data: {
          name,
          email,
          role,
        },
      });
      return res.status(200).json({
        user,
        message: "Successful",
      });
    } catch (err) {
      console.log(err);

      return res.status(500).json({
        message: "Something went Wrong!!",
        error: err,
      });
    }
  }
);

//Get all Users
app.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({ include: { posts: true } });

    return res.status(200).json({
      message:
        "Here are the users you requested for!! Thank you hitting this endpoint",
      data: users,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Something went wrong",
      error: err,
    });
  }
});

//Update User
app.put("/users/:uuid", async (req: Request, res: Response) => {
  try {
    const uuid = req.params.uuid;

    const { name, email, role } = req.body;
    let user = await prisma.user.findUnique({ where: { uuid } });

    if (!user) return res.status(404).json({ message: "User not found" });

    user = await prisma.user.update({
      where: { uuid },
      data: { name, email, role },
    });

    return res.status(200).json({
      message: "Updated successfully",
      data: user,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Something went worong",
      error: err,
    });
  }
});
//Delete Delete User
app.delete("/users/:uuid", async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.delete({ where: { uuid: req.params.uuid } });

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({
      message: "user deleted successfully!",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Something went Wrong!!",
      error,
    });
  }
});

//Find User
app.get("/users/:uuid", async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { uuid: req.params.uuid },
      select: {
        uuid: true,
        name: true,
        role: true,
        posts: {
          select: {
            title: true,
            body: true,
          },
        },
      },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({
      status: "success",
      data: user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Something wrong",
      error,
    });
  }
});

const validatePosts = [
  body("title")
    .isLength({ min: 1 })
    .withMessage("Please Provide title for this post"),
];
//Create a post
app.post("/posts", validatePosts, bodyValidator, async (req: Request, res: Response) => {
  try {
    const { title, body, userUuid } = req.body;

    const post = await prisma.post.create({
      data: {
        title,
        body,
        user: { connect: { uuid: userUuid } },
      },
    });

    return res.status(201).json({
      message: "post created successfully",
      data: post,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Something Wrong",
      error,
    });
  }
});

//Read all posts
app.get("/posts", async (_: Request, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });

    return res.status(200).json({
      status: "success",
      message: "posts fetched successfully",
      data: posts,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Something Wrong",
      error,
    });
  }
});

app.listen(5500, () => console.log("Server running at http://127.0.0.1:5500"));
