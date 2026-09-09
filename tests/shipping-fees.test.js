'use strict';
// A fresh temporary database: never load the project DB or notification settings.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chaien-fees-'));
const dbPath = require.resolve('../db');
const dbModule = new Module(dbPath, module);
dbModule.filename = dbPath;
dbModule.paths = module.paths;
dbModule._compile(fs.readFileSync(dbPath, 'utf8').replace("path.join(__dirname, 'shipus.db')", JSON.stringify(path.join(tmp, 'test.db'))), dbPath);
require.cache[dbPath] = dbModule;
const db = dbModule.exports;
const express = require('express');
const shipments = require('../routes/shipments');
const { computePaidStatus } = require('../lib/paidStatus');
const app = express();
app.use(express.json());
app.use('/api/shipments', shipments);
app.use('/api/customers', require('../routes/customers'));
app.use('/api/dashboard', require('../routes/dashboard'));
const server = app.listen(0, '127.0.0.1');
after(() => { server.close(); db.close(); fs.rmSync(tmp, { recursive: true, force: true }); });
async function request(url, body) {
  if (!server.listening) await new Promise(r => server.once('listening', r));
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api/${url}`, body === undefined ? {} : {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

test('arrival exceptions stay scoped; ledger, FIFO, reports and notices agree', async () => {
  const cid = Number(db.prepare("INSERT INTO customers (code,name) VALUES ('FEE-TEST','Test fee')").run().lastInsertRowid);
  const other = Number(db.prepare("INSERT INTO customers (code,name) VALUES ('FEE-OTHER','Other')").run().lastInsertRowid);
  const wid = Number(db.prepare("INSERT INTO partner_warehouses (code,name,rate_per_kg) VALUES ('FEE-WH','Test WH',1)").run().lastInsertRowid);
  const insert = db.prepare('INSERT INTO shipments (import_date,customer_id,warehouse_id,weight,customer_rate,surcharge) VALUES (?,?,?,?,?,?)');
  insert.run('2026-09-08',cid,wid,0.1,240000,10000);
  insert.run('2026-09-08',cid,wid,0.1,240000,0);
  insert.run('2026-09-08',cid,null,0.1,100000,0);
  insert.run('2026-09-09',cid,wid,0.3,240000,0);
  insert.run('2026-09-08',other,wid,0.1,240000,0);
  for (const [date,id] of [['2026-09-08',cid],['2026-09-09',cid],['2026-09-08',other]]) shipments.triggerAutoDebit(date,id);
  db.prepare("INSERT INTO transactions (trans_date,customer_id,credit,reference_type) VALUES ('2026-09-08',?,400000,'payment')").run(cid);
  const body = { batch_date:'2026-09-08',customer_id:cid,warehouse_id:wid,waive_minimum:true,discount:8000,reason:'Frequent arrivals',updated_by:'Test operator' };
  assert.equal((await request('shipments/batch-fee',body)).data.fee,50000);
  const rows = (await request(`shipments?customer_id=${cid}`)).data;
  const adjusted = rows.find(r=>r.import_date===body.batch_date && r.warehouse_id===wid);
  assert.equal(adjusted.batch_fee,50000);
  assert.equal(adjusted.fee_discount,8000);
  assert.equal(rows.find(r=>r.warehouse_id===null).batch_fee,50000);
  assert.equal(rows.find(r=>r.import_date==='2026-09-09').batch_fee,120000);
  assert.equal((await request(`shipments?customer_id=${other}`)).data[0].batch_fee,120000);
  const ledger = db.prepare('SELECT SUM(debit) AS debit,SUM(credit) AS credit FROM transactions WHERE customer_id=?').get(cid);
  assert.equal(ledger.debit,220000); assert.equal(ledger.credit,400000);
  assert.equal(ledger.debit-ledger.credit,-180000);
  assert.equal(computePaidStatus([cid]).get(`2026-09-08|${cid}|${wid}`).status,'paid');
  const list = (await request('customers')).data.find(c=>c.id===cid);
  const detail = (await request(`customers/${cid}`)).data;
  assert.equal(list.total_vc_fee,220000);
  assert.equal(detail.stats.total_vc_fee,220000);
  assert.equal(detail.stats.credit_balance,180000);
  const { feeTotals } = await import('../client/src/feeTotals.js');
  assert.equal(feeTotals(rows).fee,220000); // do not count repeated batch metadata twice
  process.env.ZALO_RUNNER_API_KEY = 'isolated-test-key';
  const printed = await request(`shipments/print-data?batch_date=2026-09-08&customer_id=${cid}&key=isolated-test-key`);
  assert.equal(printed.status,200);
  assert.equal(feeTotals(printed.data.items).fee,100000);
  assert.equal(feeTotals(printed.data.items).discount,8000);
  const batch = (await request(`shipments/bao-khach?customer_id=${cid}`)).data.find(b=>b.batch_date===body.batch_date);
  assert.equal(batch.total_vc_fee,100000);
  assert.equal(batch.details.find(r=>r.warehouse_id===wid).batch_fee,50000);
  const dashboard = await request('dashboard?start_date=2026-09-01&end_date=2026-09-30');
  assert.equal(dashboard.status,200); assert.equal(dashboard.data.summary.total_vc_fee_customer,340000);
  const rev = await request('dashboard/vc-revenue?month=2026-09');
  assert.equal(rev.data.by_customer.find(c=>c.id===cid).total_vc_fee,220000);
  for (const bad of [{ discount:58001 },{ discount:-1 },{ discount:1.5 },{ reason:' ' },{ waive_minimum:'true' }]) {
    assert.equal((await request('shipments/batch-fee',{...body,...bad})).status,400);
  }
  const info = await request(`shipments/batch-fee?batch_date=${body.batch_date}&customer_id=${cid}&warehouse_id=${wid}`);
  assert.equal(info.data.history.length,1);
  // Discount alone, full waiver (zero must remain zero), then restore the standard fee.
  assert.equal((await request('shipments/batch-fee',{...body,waive_minimum:false,discount:10000})).data.fee,120000);
  assert.equal((await request('shipments/batch-fee',{...body,discount:58000})).data.fee,0);
  assert.equal((await request(`shipments?customer_id=${cid}`)).data.find(r=>r.id===adjusted.id).batch_fee,0);
  assert.equal((await request('shipments/batch-fee',{...body,waive_minimum:false,discount:0,reason:'Restore standard'})).data.fee,130000);
  assert.equal(db.prepare('SELECT SUM(credit) AS credit FROM transactions WHERE customer_id=?').get(cid).credit,400000);
  // Unknown groups must not create phantom adjustments.
  assert.equal((await request('shipments/batch-fee',{...body,batch_date:'2099-01-01'})).status,404);
});
