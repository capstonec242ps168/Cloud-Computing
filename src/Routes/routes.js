const handlers = require("./handler");

const routes = [
  {
    method: "GET",
    path: "/",
    handler: (request, h) => {
      return "Hello World!";
    },
  },
  {
    method: "GET",
    path: "/trashes",
    handler: handlers.indexTrash,
  },
  {
    method: "GET",
    path: "/crafts/{label}",
    handler: handlers.indexCrafts,
  },
  {
    method: "GET",
    path: "/craft/{id}",
    handler: handlers.indexCrafts,
  },
  {
    path: "/predict",
    method: "POST",
    handler: handlers.postPredictHandler,
    options: {
      payload: {
        allow: "multipart/form-data",
        multipart: true,
        maxBytes: 1000000,
      },
    },
  },
  {
    path: "/bookmark",
    method: "POST",
    handler: handlers.bookmark,
  },
  {
    method: 'GET',
    path: '/history/{id}',
    handler: handlers.historyByUserId,
  },
];

module.exports = routes;
