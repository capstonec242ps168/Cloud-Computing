const postPredictHandler = require("./handler");

const routes = [
  {
    method: "GET",
    path: "/",
    handler: (request, h) => {
      return "Hello World!";
    },
  },
  {
    path: "/predict",
    method: "POST",
    handler: postPredictHandler,
    options: {
      payload: {
        allow: "multipart/form-data",
        multipart: true,
        maxBytes: 1000000,
      },
    },
  },
  {
    method: "GET",
    path: "/predict/histories",
    handler: async (request, h) => {
      let connection;
      try {

        connection = await mysql.createConnection({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
        });

        const [rows] = await connection.execute(`
          SELECT 
            h.ID as id,
            h.create_at as createdAt,
            u.username,
            t.type as trashType,
            c.name as craftName,
            c.tools_materials,
            c.step
          FROM Histories h
          JOIN Users u ON h.user_id = u.ID
          JOIN Trash_Crafts tc ON h.trash_craft_id = tc.ID
          JOIN Trash t ON tc.trash_id = t.ID
          JOIN Crafts c ON tc.craft_id = c.ID
          ORDER BY h.create_at DESC
        `);

        const formattedData = rows.map(row => ({
          id: row.id,
          history: {
            createdAt: row.createdAt,
            username: row.username,
            trash: {
              type: row.trashType
            },
            craft: {
              name: row.craftName,
              toolsAndMaterials: row.tools_materials,
              steps: row.step
            }
          }
        }));
        
        return {
          status: "success",
          data: formattedData,
        };

      } catch (error) {
        console.error("Error fetching prediction histories:", error);
        return h.response({
          status: "fail",
          message: "An internal server error occurred",
        }).code(500);
      } finally {
        // Selalu tutup koneksi setelah selesai
        if (connection) {
          await connection.end();
        }
      }
    },
  },
];

module.exports = routes;
