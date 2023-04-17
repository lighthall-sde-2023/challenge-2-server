import express from "express";
import cors from "cors";
import compression from "compression";
import {
  getTasks,
  tDeleteTask,
  tInsertNewTask,
  tInsertNewUser,
  tUpdateTask,
} from "./sqlite";
import { buildResponse } from "./utils";

const port = process.argv.includes("--debug") ? 3001 : 8080;
const app = express();

// const upload = multer();
app
  .use(compression())
  .use(
    express.json({
      limit: "100mb",
    })
  )
  .use(
    express.urlencoded({
      extended: true,
      limit: "100mb",
      parameterLimit: 100000,
    })
  )
  .use(cors());
app.use(express.static("public"));

app.get("/", (_req, res) => {
  res.send("Yo");
});

app.get("/users/:user", async (req, res) => {
  try {
    res.send(buildResponse(tInsertNewUser(req.params.user)));
  } catch (error: any) {
    res.send(buildResponse(error.message, true));
  }
});

app.get("/tasks/:user", async (req, res) => {
  try {
    res.send(buildResponse(getTasks(req.params.user)));
  } catch (error: any) {
    res.send(buildResponse(error.message, true));
  }
});

app.put("/tasks/:user", async (req, res) => {
  try {
    res.send(
      buildResponse(
        tInsertNewTask({
          ...req.body,
          user: req.params.user,
        })
      )
    );
  } catch (error: any) {
    res.send(buildResponse(error.message, true));
  }
});

app.post("/tasks/:user/:id", async (req, res) => {
  try {
    res.send(
      buildResponse(
        tUpdateTask({
          id: req.params.id,
          user: req.params.user,
          ...req.body,
        })
      )
    );
  } catch (error: any) {
    res.send(buildResponse(error.message, true));
  }
});

app.delete("/tasks/:user/:id", async (req, res) => {
  try {
    res.send(
      buildResponse(
        tDeleteTask({
          id: req.params.id,
          user: req.params.user,
        })
      )
    );
  } catch (error: any) {
    res.send(buildResponse(error.message, true));
  }
});

app.listen(port, () => {
  console.info("Clicks Server listening on port", port);
});
