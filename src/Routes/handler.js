
const predictClassification = require("../Service/inferenceService");
const storeData = require("../Service/storeData");
const { google } = require("googleapis");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require('@prisma/client');
const Boom = require('@hapi/boom');
const blacklist = new Set();
const axios = require('axios');
const admin = require("./../../firebase/firebase"); 
const prisma = new PrismaClient();

async function firebaseLogin (request, h) {
  const idToken = request.payload.token; 
  const username = request.payload.username;
  const email = request.payload.email;
  const uid = request.payload.uid;

  if (!email || !username || !uid) {
    return h.response({
      error: 'Email or username missing',
    }).code(400); 
  }

  try {
    const decodedToken = jwt.decode(idToken);
    console.log('Decoded Token:', decodedToken);
  
    if (decodedToken.aud !== '70793757615-4fmg3mbvt3v77ek27vq312l2m889o03m.apps.googleusercontent.com') {
      return Boom.unauthorized('Access denied');
    }

    let user = await prisma.Users.findUnique({
      where: {
        email: email
      }
    });

    if (!user) {
      user = await prisma.Users.create({
        data: {
          username: username,
          email: email,
          uid: uid
        }
      });
    }

    return h.response({
      data: {
        id: user.ID,
        email: user.email,
        name: user.username,
        uid: user.uid,
      }
    }).code(200);
  } catch (error) {
    return h.response({
      error: 'Internal Server Error',
      message: error.message
    }).code(500); 
  }
}

async function postPredictHandler(request, h) {
  const { image } = request.payload;
  const { model } = request.server.app;

  if (!image) {
    const response = h.response({
      status: "fail",
      message: "Invalid input. Missing required fields.",
    });
    response.code(400);
    return response;
  }

  const imageSize = Buffer.byteLength(image, "base64");

  if (imageSize > 10000000) {
    const response = h.response({
      status: "fail",
      message: "Payload content length greater than maximum allowed: 10000000",
    });
    response.code(413);
    return response;
  }

  console.log("testingg")

  const { label } = await predictClassification(model, image);
  const createdAt = new Date().toISOString();
  const [result, id, treatment] = await getDataCrafts(label);

  console.log(`label : ${label}`)

  if (result.error) {
    const response = h.response({
      status: "fail",
      message: `Error retrieving crafts: ${result.error}`,
    });
    response.code(500);
    return response;
  }

  const data = {
    id_trash: id,
    result: label,
    treatment,
    sugesstion: result,
    createdAt,
  };

  const response = h.response({
    status: "success",
    message: "Model is predicted successfully",
    data,
  });
  response.code(201);

  return response;
}

async function bookmark(request, h) {
  const { user } = request.payload;
  const { craft } = request.payload;

  if (!user && craft) {
    const response = h.response({
      status: "fail",
      message: "Invalid input. Missing required fields.",
    });
    response.code(400);
    return response;
  }

  await storeData(user, craft);

  const response = h.response({
    status: "success",
    message: "Bookmark has added",
  });
  response.code(201);

  return response;
}

async function getDataCrafts(label) {
  try {

    const rows = await prisma.Trash.findMany({
      where: {
        type: label
      }
    })

    const id = rows[0]?.ID;
    const treatment = rows[0]?.treatment;

    const result = await prisma.Trash_Crafts.findMany({
      where: {
        trash_id: id
      },
      include: {
        Crafts: true 
      }
    })

    return [result, id, treatment];
  } catch (err) {
    console.error("Error in getAllCraft:", err.message);
    return { error: err.message };
  }
}

async function indexTrash(request, h) {
  try {

    const query = `SELECT * FROM Trash;`;
    const result = await prisma.Trash.findMany();

    const response = h.response({
      status: "success",
      result,
    });
    response.code(200);

    return response;
  } catch (err) {
    console.error("Error in getAllCraft:", err.message);
    return { error: err.message };
  }
}

async function indexCrafts(request, h) {
  try {
  
    const { label } = request.params;

    const rows = await prisma.Trash.findMany({
      where: {
        type: label
      }
    })

    const id = rows[0]?.ID;
    const treatment = rows[0]?.treatment;

    console.log(`id trash : ${JSON.stringify(rows)}`)
    console.log(`id trash : ${id}`)

    const result = await prisma.Trash_Crafts.findMany({
      where: {
        trash_id: id
      },
      include: {
        Crafts: true 
      }
    });

    const response = h.response({
      status: "success",
      result,
    });
    response.code(200);

    return response;
  } catch (err) {
    console.error("Error in getAllCraft:", err.message);
    return { error: err.message };
  }
}

async function indexCraft(request, h) {
  try {
    const { id } = request.params;

    const result = await prisma.Trash_Crafts.findUnique({
      where: {
        ID: Number(id) 
      },
      include: {
        Crafts: true 
      }
    });

    const response = h.response({
      status: "success",
      result,
    });
    response.code(200);

    return response;
  } catch (err) {
    console.error("Error in getAllCraft:", err.message);
    return { error: err.message };
  }
}

async function historyByUserId(request, h) {
  try {

    const { id } = request.params;
    const { uid } = request.params;

    const user = await prisma.Users.findFirst({
      where: {
        ID: Number(id),
        uid: uid,
      },
    });

    if(!user) {
      return Boom.unauthorized('Access denied');
    }

    const histories = await prisma.Histories.findMany({
      where: {
        user_id: Number(id), 
      },
      select: {
        ID: true, 
        create_at: true,
        Users: {
          select: {
            username: true,
            email: true,
          },
        },
        Trash_Crafts: {
          select: {
            Trash: {
              select: {
                type: true,
              },
            },
            Crafts: {
              select: {
                name: true,
                tools_materials: true,
                step: true,
              },
            },
          },
        },
      },
    });

    if (histories.length === 0) {
      const response = h.response({
        status: "fail",
        message: `No history found for user_id: ${id}`,
      });
      response.code(404);
      return response;
    }

    const response = h.response({
      status: "success",
      histories,
    });
    response.code(200);

    return response;
  } catch (err) {
    console.error("Error in historyByUserId:", err.message);
    const response = h.response({
      status: "fail",
      message: err.message,
    });
    response.code(500);

    return response;
  }
}

async function indexNews(request, h) {
  try {
    const result = await prisma.News.findMany();

    const response = h.response({
      status: "success",
      result,
    });
    response.code(200);

    return response;
  } catch (err) {
    console.error("Error in indexNews:", err.message);
    return {
      status: "fail",
      message: "Failed to retrieve news.",
      error: err.message,
    };
  }
}

async function indexNewsID(request, h) {
  try {
    const { id } = request.params;

    const result = await prisma.News.findUnique({
      where: {
        id: Number(id), 
      },
    });

    if (!result) {
      return h
        .response({
          status: "fail",
          message: `News with ID ${id} not found`,
        })
        .code(404);
    }

    return h
      .response({
        status: "success",
        data: result,
      })
      .code(200);
  } catch (err) {

    console.error("Error in indexNewsID:", err.message);
    return h
      .response({
        status: "error",
        message: "An internal server error occurred",
      })
      .code(500);
  }
}

module.exports = {
  postPredictHandler,
  bookmark,
  indexTrash,
  indexCrafts,
  indexCraft,
  historyByUserId,
  firebaseLogin,
  indexNews,
  indexNewsID
};
