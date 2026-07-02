require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const db = require('../config/database');
const fs = require('fs');
const path = require('path');

const testSeed = {
  workshopId: null,
  adminId: null,
  customerId: null,
  vehicleId: null,
  jobCardId: null,
  adminToken: null,
  customerToken: null,
};

beforeAll(async () => {
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const name = file.replace('.sql', '');
    const { rows } = await db.query('SELECT COUNT(*)::int as cnt FROM migrations WHERE name=$1', [name]);
    if (rows[0].cnt > 0) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    try {
      await db.query('BEGIN');
      await db.query(sql);
      await db.query('INSERT INTO migrations (name) VALUES ($1)', [name]);
      await db.query('COMMIT');
    } catch (e) {
      await db.query('ROLLBACK');
    }
  }

  const { rows: [ws] } = await db.query(
    `INSERT INTO workshops (name, address, phone, email) VALUES ($1,$2,$3,$4) RETURNING *`,
    ['Test Workshop', '123 Test St', '+251911111111', 'test@workshop.com']
  );
  testSeed.workshopId = ws.id;

  const bcrypt = require('bcryptjs');
  const pw = await bcrypt.hash('password123', 4);

  const { rows: [admin] } = await db.query(
    `INSERT INTO users (name, email, phone, password_hash, role, workshop_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    ['Admin User', 'admin@test.com', '+251911111112', pw, 'SuperAdmin', ws.id]
  );
  testSeed.adminId = admin.id;

  const { rows: [customer] } = await db.query(
    `INSERT INTO users (name, email, phone, password_hash, role, workshop_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    ['Test Customer', 'customer@test.com', '+251911111113', pw, 'Customer', ws.id]
  );
  testSeed.customerId = customer.id;

  const jwt = require('jsonwebtoken');
  testSeed.adminToken = jwt.sign(
    { id: admin.id, role: 'SuperAdmin', workshop_id: ws.id },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
  testSeed.customerToken = jwt.sign(
    { id: customer.id, role: 'Customer', workshop_id: ws.id },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await db.query('DELETE FROM users WHERE id IN ($1,$2)', [testSeed.adminId, testSeed.customerId]);
  await db.query('DELETE FROM workshops WHERE id = $1', [testSeed.workshopId]);
  await db.pool.end();
});

module.exports = testSeed;