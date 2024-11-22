const crypto = require("crypto");
const predictClassification = require("../Service/inferenceService");
const storeData = require("../Service/storeData");
const createPool = require("../Service/createPool");
const mysql = require("mysql2/promise");
const { Connector } = require("@google-cloud/cloud-sql-connector");
let pool;

async function postPredictHandler(request, h) {
  const { image } = request.payload;
  const { user } = request.payload;
  const { token } = request.payload;
  const { model } = request.server.app;

  // validasi input 
  if (!image || !user || !token) {
    const response = h.response({
      status: "fail",
      message: "Invalid input. Missing required fields.",
    });
    response.code(400);
    return response;
  }

  // auth 
  if (await auth(user, token) === 0 ) {
    const response = h.response({
      status: "failed",
      message: "User unauthorized.",
    });
    response.code(401);
    return response;
  }

  const imageSize = Buffer.byteLength(image, "base64");


  if (imageSize > 1000000) {
    const response = h.response({
      status: "fail",
      message: "Payload content length greater than maximum allowed: 1000000",
    });
    response.code(413);
    return response;
  }

  const { label } = await predictClassification(model, image);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const allcraft = await getDataCrafts(label);

  // cek allcraft
  if (allcraft.error) {
    const response = h.response({
      status: "fail",
      message: `Error retrieving crafts: ${allcraft.error}`,
    });
    response.code(500);
    return response;
  }

  const data = {
    id,
    result: label,
    sugesstion: allcraft,
    createdAt,
  };

  // upload ke database
  if (allcraft.length !== 0) {
    await storeData(user, allcraft);
  }

  const response = h.response({
    status: "success",
    message: "Model is predicted successfully",
    data,
  });
  response.code(201);

  return response;
}

async function auth(id, token) {
  try {
    if (!pool) {
      pool = await createPool(); // Inisialisasi pool jika belum ada
    }

    const conn = await pool.getConnection();

    const query = `SELECT token FROM Users WHERE id = ?;`;
    const [rows] = await conn.query(query, [id]);

    const getToken = rows[0]?.token;

    if (getToken !== token) {
      await conn.release();
      return 0; // Tidak sah
    }

    await conn.release();
    return 1; // Sah
  } catch (err) {
    console.error("Error in auth:", err.message);
    return { error: err.message };
  }
}

async function getDataCrafts(label) {
  try {
    if (!pool) {
      pool = await createPool(); // Inisialisasi pool jika belum ada
    }

    const conn = await pool.getConnection();

    const query = `SELECT id FROM Trash WHERE type = ?;`;
    const [rows] = await conn.query(query, [label]);

    const id = rows[0]?.id;

    const query2 = `
        SELECT * 
        FROM Trash_Crafts AS TC
        JOIN Crafts AS C ON TC.craft_id = C.id
        WHERE TC.trash_id = ?;
    `;
    const [result] = await conn.query(query2, [id]);

    await conn.release();
    return result;
  } catch (err) {
    console.error("Error in getAllCraft:", err.message);
    return { error: err.message };
  }
}

module.exports = postPredictHandler;
