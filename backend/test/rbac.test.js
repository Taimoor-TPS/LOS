import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

const password = 'Admin#Initial1';
const nextPassword = 'Desk#Access2026';

let mongo;
let app;

test('dynamic access control', async (t) => {
  const { MongoMemoryReplSet } = await import('mongodb-memory-server');
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.JWT_SECRET = 'test-jwt-secret-value-32chars';
  process.env.FIELD_ENCRYPTION_KEY = 'test-field-encryption-key-32';
  process.env.ADMIN_INITIAL_PASSWORD = password;
  process.env.MONGODB_URI = mongo.getUri();
  process.env.MONGODB_DB = 'los_test';
  process.env.DEMO_MODE = 'true';
  process.env.NODE_ENV = 'test';
  const { createApp } = await import('../src/app.js');
  const { runSeed } = await import('../src/seed/seed.js');
  await runSeed({ disconnect: false });
  app = createApp();

  try {
    await t.test('only admin exists and the staff directory is gone', async () => {
      const { User } = await import('../src/modules/identity/model/User.js');
      assert.equal(await User.countDocuments(), 1);
      assert.equal((await User.findOne().lean()).username, 'admin');
      assert.equal((await request(app).get('/api/identity/staff-directory')).status, 404);
    });

    const admin = request.agent(app);
    const login = await admin.post('/api/identity/login').set('X-LOS-Client', 'web').send({ username: 'admin', password });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    assert.equal(login.body.user.mustChangePassword, true);
    const changed = await admin.post('/api/identity/change-password').set('X-LOS-Client', 'web').send({ currentPassword: password, newPassword: nextPassword });
    assert.equal(changed.status, 200, JSON.stringify(changed.body));

    const single = await admin.get('/api/admin/checker-mode?permission=application:approve');
    assert.equal(single.body.singleChecker, true);

    const analystRole = await admin.post('/api/admin/roles').set('X-LOS-Client', 'web').send({
      code: 'ANALYST', name: 'Credit Analyst', type: 'BUSINESS', maxScope: 'ALL',
      permissions: ['application:view'],
      doa: [{ productFamily: '*', maxAmount: 100000, maxDeviationLevel: 'NONE' }],
    });
    assert.equal(analystRole.status, 201, JSON.stringify(analystRole.body));
    assert.equal((await admin.post('/api/admin/users').set('X-LOS-Client', 'web').send({
      username: 'analyst', name: 'Credit Analyst', password: 'Analyst#Pass2026',
      roles: [{ roleId: analystRole.body.item._id, scopeType: 'ALL' }],
    })).status, 201);

    const { Customer } = await import('../src/modules/customers/model/Customer.js');
    const { Application } = await import('../src/modules/applications/model/Application.js');
    const customer = await Customer.create({ tenantId: 'noor-horizon', customerNo: 'CIF00000001', fullName: 'Test Customer', status: 'ACTIVE' });
    const application = await Application.create({
      tenantId: 'noor-horizon', reference: 'PK01PFS261001000099', customerId: customer._id, productCode: 'PF-SAL',
      productFamily: 'PERSONAL', stage: 'S2', status: 'IN_QUEUE', amount: 500000, totalExposure: 500000,
      version: 1, workflowCode: 'WF-RETAIL', createdBy: login.body.user.id,
    });

    const analyst = request.agent(app);
    const analystLogin = await analyst.post('/api/identity/login').set('X-LOS-Client', 'web').send({ username: 'analyst', password: 'Analyst#Pass2026' });
    assert.equal(analystLogin.status, 200);
    await analyst.post('/api/identity/change-password').set('X-LOS-Client', 'web').send({ currentPassword: 'Analyst#Pass2026', newPassword: 'Analyst#Changed1' });
    const denied = await analyst.post(`/api/applications/${application._id}/transitions`).set('X-LOS-Client', 'web').send({ outcome: 'APPROVE', version: 1, reason: 'try' });
    assert.equal(denied.status, 403);

    const checkerRole = await admin.post('/api/admin/roles').set('X-LOS-Client', 'web').send({
      code: 'CHECKER', name: 'Checker', type: 'SUPERVISORY', maxScope: 'ALL',
      permissions: ['application:view', 'application:approve'],
      doa: [{ productFamily: '*', maxAmount: 100000, maxDeviationLevel: 'D3' }],
    });
    const checkerUser = await admin.post('/api/admin/users').set('X-LOS-Client', 'web').send({
      username: 'checker', name: 'Second Checker', password: 'Checker#Pass2026',
      roles: [{ roleId: checkerRole.body.item._id, scopeType: 'ALL' }],
    });
    assert.equal(checkerUser.status, 201, JSON.stringify(checkerUser.body));
    const mode = await admin.get('/api/admin/checker-mode?permission=application:approve');
    assert.equal(mode.body.singleChecker, false);

    const sod = await admin.post(`/api/applications/${application._id}/transitions`).set('X-LOS-Client', 'web').send({ outcome: 'APPROVE', version: 1, reason: 'self' });
    assert.equal(sod.status, 403);
    assert.equal(sod.body.code, 'SOD_BLOCK');

    const checker = request.agent(app);
    await checker.post('/api/identity/login').set('X-LOS-Client', 'web').send({ username: 'checker', password: 'Checker#Pass2026' });
    await checker.post('/api/identity/change-password').set('X-LOS-Client', 'web').send({ currentPassword: 'Checker#Pass2026', newPassword: 'Checker#Changed1' });
    const doa = await checker.post(`/api/applications/${application._id}/transitions`).set('X-LOS-Client', 'web').send({ outcome: 'APPROVE', version: 1, reason: 'within role' });
    assert.equal(doa.status, 403);
    assert.equal(doa.body.code, 'DOA_EXCEEDED');

    const me = await admin.get('/api/identity/me');
    const removed = await admin.delete(`/api/admin/users/${me.body.user.id}`).set('X-LOS-Client', 'web').send({ reason: 'should fail' });
    assert.equal(removed.status, 409);
    assert.equal(removed.body.code, 'LAST_SUPER_ADMIN');
  } finally {
    const mongoose = (await import('mongoose')).default;
    await mongoose.disconnect();
    await mongo.stop();
  }
});
