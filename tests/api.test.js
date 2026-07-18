require('dotenv').config();
const request = require('supertest');
const { app } = require('../server');
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.setTimeout(30000);

let adminToken, customerToken, workshopId, customerId, vehicleId, jobCardId;

async function cleanupTest() {
  await db.query('DELETE FROM milestone_tasks WHERE milestone_id IN (SELECT id FROM milestones WHERE job_card_id IN (SELECT id FROM job_cards WHERE workshop_id IN (SELECT id FROM workshops WHERE name = $1)))', ['Test Workshop']);
  await db.query('DELETE FROM milestones WHERE job_card_id IN (SELECT id FROM job_cards WHERE workshop_id IN (SELECT id FROM workshops WHERE name = $1))', ['Test Workshop']);
  await db.query('DELETE FROM parts_used WHERE job_card_id IN (SELECT id FROM job_cards WHERE workshop_id IN (SELECT id FROM workshops WHERE name = $1))', ['Test Workshop']);
  await db.query('DELETE FROM media_assets WHERE job_card_id IN (SELECT id FROM job_cards WHERE workshop_id IN (SELECT id FROM workshops WHERE name = $1))', ['Test Workshop']);
  await db.query('DELETE FROM tracking_tokens WHERE job_card_id IN (SELECT id FROM job_cards WHERE workshop_id IN (SELECT id FROM workshops WHERE name = $1))', ['Test Workshop']);
  await db.query('DELETE FROM notification_log WHERE job_card_id IN (SELECT id FROM job_cards WHERE workshop_id IN (SELECT id FROM workshops WHERE name = $1))', ['Test Workshop']);
  await db.query('DELETE FROM invoice_line_items WHERE invoice_id IN (SELECT id FROM invoices WHERE job_card_id IN (SELECT id FROM job_cards WHERE workshop_id IN (SELECT id FROM workshops WHERE name = $1)))', ['Test Workshop']);
  await db.query('DELETE FROM invoices WHERE job_card_id IN (SELECT id FROM job_cards WHERE workshop_id IN (SELECT id FROM workshops WHERE name = $1))', ['Test Workshop']);
  await db.query('DELETE FROM job_cards WHERE workshop_id IN (SELECT id FROM workshops WHERE name = $1)', ['Test Workshop']);
  await db.query('DELETE FROM appointments WHERE workshop_id IN (SELECT id FROM workshops WHERE name = $1)', ['Test Workshop']);
  await db.query('DELETE FROM vehicles WHERE workshop_id IN (SELECT id FROM workshops WHERE name = $1)', ['Test Workshop']);
  await db.query('DELETE FROM parts_inventory WHERE workshop_id IN (SELECT id FROM workshops WHERE name = $1)', ['Test Workshop']);
  await db.query('DELETE FROM users WHERE phone IN ($1,$2,$3)', ['+251911111112', '+251911111113', '+251911111114']);
  await db.query('DELETE FROM workshops WHERE name = $1', ['Test Workshop']);
}

beforeAll(async () => {
  await cleanupTest();

  const pw = await bcrypt.hash('password123', 4);

  const { rows: [ws] } = await db.query(
    `INSERT INTO workshops (name) VALUES ($1) RETURNING *`,
    ['Test Workshop']
  );
  workshopId = ws.id;

  const { rows: [admin] } = await db.query(
    `INSERT INTO users (name, phone, password_hash, role, workshop_id)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    ['Admin', '+251911111112', pw, 'SuperAdmin', ws.id]
  );

  const { rows: [cust] } = await db.query(
    `INSERT INTO users (name, phone, password_hash, role, workshop_id)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    ['Customer', '+251911111113', pw, 'Customer', ws.id]
  );
  customerId = cust.id;

  const { rows: [v] } = await db.query(
    `INSERT INTO vehicles (make, model, plate_number, customer_id, workshop_id)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    ['Toyota', 'Corolla', 'AA-1234', cust.id, ws.id]
  );
  vehicleId = v.id;

  const secret = process.env.JWT_SECRET || 'test-secret-for-jwt';
  adminToken = jwt.sign({ id: admin.id, role: 'SuperAdmin', workshop_id: ws.id }, secret, { expiresIn: '1h' });
  customerToken = jwt.sign({ id: cust.id, role: 'Customer', workshop_id: ws.id }, secret, { expiresIn: '1h' });
});

afterAll(async () => {
  await cleanupTest();
  await db.pool.end();
});

describe('Auth', () => {
  it('POST /api/auth/register', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New User', phone: '+251911111114', password: 'test123', role: 'Customer', workshopId });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('id');
    await db.query('DELETE FROM users WHERE id = $1', [res.body.user.id]);
  });

  it('POST /api/auth/login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ phone: '+251911111112', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.name).toBe('Admin');
  });

  it('GET /api/auth/me returns user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/auth/me rejects no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('Vehicles', () => {
  it('GET /api/vehicles lists vehicles', async () => {
    const res = await request(app)
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.vehicles).toBeInstanceOf(Array);
  });

  it('GET /api/vehicles/mine for customer', async () => {
    const res = await request(app)
      .get('/api/vehicles/mine')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.vehicles.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/vehicles creates vehicle', async () => {
    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ make: 'Honda', model: 'Civic', plateNumber: 'BB-5678', customerId });
    expect(res.status).toBe(201);
    expect(res.body.vehicle).toHaveProperty('id');
    await db.query('DELETE FROM vehicles WHERE id = $1', [res.body.vehicle.id]);
  });

  it('GET /api/vehicles/:id returns vehicle', async () => {
    const res = await request(app)
      .get(`/api/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.vehicle.make).toBe('Toyota');
  });
});

describe('Job Cards', () => {
  it('POST /api/job-cards creates job card', async () => {
    const res = await request(app)
      .post('/api/job-cards')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ vehicleId, customerId, description: 'Oil change' });
    expect(res.status).toBe(201);
    expect(res.body.jobCard).toHaveProperty('id');
    expect(res.body.jobCard.status).toBe('PENDING');
    jobCardId = res.body.jobCard.id;
  });

  it('GET /api/job-cards lists job cards', async () => {
    const res = await request(app)
      .get('/api/job-cards')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.jobCards).toBeInstanceOf(Array);
  });

  it('PATCH /api/job-cards/:id/status transitions status', async () => {
    const res = await request(app)
      .patch(`/api/job-cards/${jobCardId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DIAGNOSTIC' });
    expect(res.status).toBe(200);
    expect(res.body.jobCard.status).toBe('DIAGNOSTIC');
  });

  it('PATCH invalid status returns error', async () => {
    const res = await request(app)
      .patch(`/api/job-cards/${jobCardId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INVALID' });
    expect(res.status).toBe(400);
  });

  it('GET /api/job-cards/:id returns job card', async () => {
    const res = await request(app)
      .get(`/api/job-cards/${jobCardId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.jobCard.status).toBe('DIAGNOSTIC');
  });

  it('GET /api/job-cards/mine for customer', async () => {
    const res = await request(app)
      .get('/api/job-cards/mine')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.jobCards).toBeInstanceOf(Array);
  });
});

describe('Invoices', () => {
  it('POST /api/invoices/generate creates invoice', async () => {
    const res = await request(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ jobCardId, laborCost: 150, taxRate: 15 });
    expect(res.status).toBe(201);
    expect(res.body.invoice).toHaveProperty('invoice_number');
    expect(res.body.invoice.lineItems).toBeInstanceOf(Array);
    expect(parseFloat(res.body.invoice.total)).toBeGreaterThan(0);

    await db.query('DELETE FROM invoices WHERE id = $1', [res.body.invoice.id]);
  });

  it('POST /api/invoices/generate requires jobCardId', async () => {
    const res = await request(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('Appointments', () => {
  it('POST /api/appointments creates appointment', async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId, vehicleId, title: 'Test service', scheduledDate: tomorrow, startTime: '09:00', endTime: '10:00' });
    expect(res.status).toBe(201);
    expect(res.body.appointment).toHaveProperty('id');
    await db.query('DELETE FROM appointments WHERE id = $1', [res.body.appointment.id]);
  });

  it('GET /api/appointments/slots returns slots', async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const res = await request(app)
      .get(`/api/appointments/slots?date=${tomorrow}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.slots).toBeInstanceOf(Array);
  });
});

describe('Inventory', () => {
  let partId;
  it('POST /api/parts creates part', async () => {
    const res = await request(app)
      .post('/api/parts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Oil Filter', sku: 'OIL-001', category: 'Filters', unitPrice: 15.99, quantity: 10 });
    expect(res.status).toBe(201);
    partId = res.body.part.id;
  });

  it('GET /api/parts lists parts', async () => {
    const res = await request(app)
      .get('/api/parts')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.parts).toBeInstanceOf(Array);
  });

  afterAll(async () => {
    if (partId) await db.query('DELETE FROM parts_inventory WHERE id = $1', [partId]);
  });
});

describe('Reports', () => {
  it('GET /api/reports/dashboard returns stats', async () => {
    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('activeJobs');
  });
});

describe('Workshops (SuperAdmin)', () => {
  it('GET /api/workshops lists workshops', async () => {
    const res = await request(app)
      .get('/api/workshops')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.workshops).toBeInstanceOf(Array);
  });

  it('GET /api/workshops/overview returns aggregate stats', async () => {
    const res = await request(app)
      .get('/api/workshops/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totals');
  });

  it('GET /api/workshops/:id returns workshop detail', async () => {
    const res = await request(app)
      .get(`/api/workshops/${workshopId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.workshop.name).toBe('Test Workshop');
    expect(res.body).toHaveProperty('stats');
  });
});