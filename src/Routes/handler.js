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
  const createdAt = new Date().toISOString();
  const [result, id, treatment] = await getDataCrafts(label);

  // cek result
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

  // upload ke database
  // if (result.length !== 0) {
  //   await storeData(user, result);
  // }

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

  await storeData(user, craft);

  const response = h.response({
    status: "success",
    message: "Bookmark has added",
  });
  response.code(201);

  return response

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

    const query = `SELECT * FROM Trash WHERE type = ?;`;
    const [rows] = await conn.query(query, [label]);

    const id = rows[0]?.ID;
    const treatment = rows[0]?.treatment;

    const query2 = `
        SELECT * 
        FROM Trash_Crafts AS TC
        JOIN Crafts AS C ON TC.craft_id = C.id
        WHERE TC.trash_id = ?;
    `;
    const [result] = await conn.query(query2, [id]);

    await conn.release();
    return [result, id, treatment];
  } catch (err) {
    console.error("Error in getAllCraft:", err.message);
    return { error: err.message };
  }
}

async function indexTrash(request, h) {
  try {
    if (!pool) {
      pool = await createPool(); // Inisialisasi pool jika belum ada
    }

    const conn = await pool.getConnection();

    const query = `SELECT * FROM Trash;`;
    const [result] = await conn.query(query);

    await conn.release();

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
    if (!pool) {
      pool = await createPool(); // Inisialisasi pool jika belum ada
    }

    const { label } = request.params

    const conn = await pool.getConnection();

    const query = `SELECT * FROM Trash WHERE type = ?;`;
    const [rows] = await conn.query(query, [label]);

    const id = rows[0]?.ID;
    const treatment = rows[0]?.treatment;

    const query2 = `
        SELECT * 
        FROM Trash_Crafts AS TC
        JOIN Crafts AS C ON TC.craft_id = C.id
        WHERE TC.trash_id = ?;
    `;
    const [result] = await conn.query(query2, [id]);

    await conn.release();


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
    if (!pool) {
      pool = await createPool(); // Inisialisasi pool jika belum ada
    }

    const { id } = request.params

    const conn = await pool.getConnection();

    const query2 = `
        SELECT * 
        FROM Trash_Crafts AS TC
        JOIN Crafts AS C ON TC.craft_id = C.id
        WHERE TC.ID = ?;
    `;
    const [result] = await conn.query(query2, [id]);

    await conn.release();


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


module.exports = {postPredictHandler, bookmark, indexTrash, indexCrafts, indexCraft};
