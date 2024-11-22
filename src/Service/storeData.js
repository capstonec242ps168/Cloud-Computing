const createPool = require("./createPool");
let pool;

async function storeData(user_id, data) {
  try {
    if (!pool) {
      pool = await createPool();
    }

    const conn = await pool.getConnection();
    const [result] = await conn.query(`SELECT NOW();`);


    for (const craft of data) {
      const query = `INSERT INTO Histories (user_id, trash_craft_id) VALUES (?, ?);`;
      await pool.execute(query, [user_id, craft.ID]);
    }

    console.log('Connection successful! Server time:', result[0]['NOW()']);

    await conn.release(); 
    await pool.end(); 
    // connector.close();
  } catch (err) {
    console.error('Failed to connect to the database:', err.message);
  }
}

module.exports = storeData;