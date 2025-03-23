import express from "express";
import bodyParse from "body-parser";
import AuthRoutes from "./api/v1/routes/auth.routes.js";
import NetworkRoutes from "./api/v1/routes/network.routes.js";

const app = express();
const port = 4001;
import { pool } from "./config/db.js";
import logger from "./config/logger.js";

app.use(bodyParse.json({ limit: "50mb" }));
app.use(bodyParse.urlencoded({ extended: false }));

app.use("/auth/network", NetworkRoutes);
app.use("/auth", AuthRoutes);

app.use("/", (req, res) => {
  res.json({
    message: "Auth Services",
  });
});
app.listen(port, () => {
  pool.getConnection((err, connection) => {
    if (err) {
      logger.error("Error connecting the Auth Service to DataBase");
      process.exit(1);
    }
    logger.info(
      `Auth Service connected to the database and server is up and running on PORT: ${port}`
    );
  });
});
