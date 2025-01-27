import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { decode, sign, verify } from "hono/jwt";
import { signupInput, signinInput } from "@bibhoo/medium-common";

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
}>();

userRouter.post("/signup", async (c) => {
  const body = await c.req.json();
  //this is how u get the body in hono

  const { success } = signupInput.safeParse(body);
  if (!success) {
    c.status(411);
    return c.json({
      message: "Inputs not correct",
    });
  }

  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  //we used to do req.body to get the body in express

  //user will have the user id
  try {
    const user = await prisma.user.create({
      data: {
        username: body.username,
        password: body.password,
        name: body.name,
      },
    });

    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
    //the only thing usually u need to sign in a jwt with is id.

    return c.text(jwt);
  } catch (e) {
    c.status(411);
    console.log(e);
    return c.text("User already exists with this email");
  }
});
//this is how u access env variables in hono
//it has all the req data all response data as well datta of env variables

userRouter.post("/signin", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  //again initialize prisma

  const body = await c.req.json();
  //again get back the body

  const { success } = signinInput.safeParse(body);
  if (!success) {
    c.status(411);
    return c.json({
      message: "Inputs not correct",
    });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        username: body.username,
        password: body.password,
      },
    });
    //find a user with this email and password

    if (!user) {
      c.status(403);
      return c.json({ message: "Incorrect creds" });
    }
    //if does not exist then we tell him his credentials are incorrect

    //@ts-ignore
    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
    return c.json({ jwt });
    //if exists then we sign the jwt for the user and return it
  } catch (e) {
    console.log(e);
    c.status(411);
    return c.text("Invalid");
  }
});
