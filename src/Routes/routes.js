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
    handler: handlers.indexCraft,
  },
  {
    path: "/predict",
    method: "POST",
    handler: handlers.postPredictHandler,
    options: {
      payload: {
        allow: "multipart/form-data",
        multipart: true,
        maxBytes: 10000000,
      },
    },
  },
  {
    path: "/bookmark",
    method: "POST",
    handler: handlers.bookmark,
  },
  {
    method: "GET",
    path: "/history/{id}/{uid}",
    handler: handlers.historyByUserId,
  },
  {
    method: "POST",
    path: "/auth",
    handler: handlers.firebaseLogin,
  },
  {
    method: "GET",
    path: "/news",
    handler: handlers.indexNews,
  },
  {
    method: "GET",
    path: "/news/{id}",
    handler: handlers.indexNewsID,
  },
];

module.exports = routes;
