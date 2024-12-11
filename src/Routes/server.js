"use strict";
require("dotenv").config();

const Hapi = require("@hapi/hapi");
const routes = require("./routes");
const loadModel = require("../Service/loadModel");
const InputError = require("../Exceptions/InputError");

const init = async () => {
  const server = Hapi.server({
    port: 3000,
    host: "localhost",
    routes: {
      cors: {
        origin: ["*"],
      },
    },
  });

  server.route(routes);

  const model = await loadModel();
  server.app.model = model;

  server.ext("onPreResponse", function (request, h) {
    const response = request.response;

    if (response instanceof InputError) {
      const newResponse = h.response({
        status: "fail",
        message: `Terjadi kesalahan dalam melakukan prediksi  ${
          response.message || "Detail error tidak tersedia"
        }`,
      });

      newResponse.code(response.statusCode || 400);
      return newResponse;
    }

    if (response.isBoom) {
      const newResponse = h.response({
        status: "fail",
        message:
          response.output.payload.message ||
          "Terjadi kesalahan dalam melakukan prediksi1",
      });

      newResponse.code(response.output.statusCode || 500);
      return newResponse;
    }

    return h.continue;
  });

  await server.start();
  console.log("Server running on %s", server.info.uri);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
