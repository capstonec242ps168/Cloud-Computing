const createPool = require("./createPool");
let pool;

async function storeData(user_id, craft) {
  try {
    if (!pool) {
      pool = await createPool();
    }

    const conn = await pool.getConnection();
    const [result] = await conn.query(`SELECT NOW();`);


    await prisma.Histories.create({
      data: {
        user_id: user_id,
        trash_craft_id: craft,
      },
    });


    await conn.release(); 

  } catch (err) {
    console.error('Failed to connect to the database:', err.message);
  }
}

module.exports = storeData;