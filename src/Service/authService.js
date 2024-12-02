const { OAuth2Client } = require('google-auth-library');
const pool = require('./createPool'); 

const client = new OAuth2Client('70793757615-8gdn0cl0ngs72dlnbqpphn21hq1adiup.apps.googleusercontent.com');

async function verifyAndRegister(token, email) {
  try {
    // Verifikasi ID token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: '70793757615-8gdn0cl0ngs72dlnbqpphn21hq1adiup.apps.googleusercontent.com',
    });

    const payload = ticket.getPayload();
    const userId = payload.sub; // ID unik pengguna dari Google

    const conn = await pool.getConnection();
    try {
      // Periksa apakah pengguna sudah terdaftar
      const [existingUser] = await conn.query('SELECT * FROM Users WHERE email = ?', [email]);

      if (existingUser.length > 0) {
        return { status: 'User already registered' };
      }

      // Membuat username berdasarkan nama depan dan email
      const firstName = payload.given_name || '';  // Ambil nama depan dari payload
      const emailPrefix = email.split('@')[0];     // Ambil bagian sebelum "@" dari email
      const username = `${firstName}${emailPrefix}`;  // Buat username

      // Simpan data dengan username baru
      await conn.query('INSERT INTO Users (user_id, username, email, token) VALUES (?, ?, ?, ?)', [userId, username, email, token]);

      return { status: 'User registered successfully' };
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Error in verifyAndRegister:', err.message);
    return { status: 'Error during verification', error: err.message };
  }
}

module.exports = verifyAndRegister;
