const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const csv = require('csvtojson');
const yaml = require('js-yaml');

// Exercise the real importer and CSV parser, with isolated metadata and database writes.
async function runFixture(text, { categorical = false, strataKeys = ['region'], defaultStrata = {}, failWrite = false } = {}) {
  const documents = [];
  const updates = [];
  const logs = [];
  let activeWrites = 0;
  let maxWrites = 0;
  const models = Object.fromEntries(['Source', 'Measure', 'Collection', 'Series', 'Strata', 'Surface'].map(name => [name, {
    deleteMany: async () => {},
    insertMany: async docs => {
      if (name !== 'Surface') return;
      if (failWrite) throw new Error('Database write failed');
      activeWrites += 1;
      maxWrites = Math.max(maxWrites, activeWrites);
      assert.equal(docs.length, 1);
      await new Promise(resolve => setTimeout(resolve, 1));
      documents.push(...docs);
      activeWrites -= 1;
    },
    updateOne: async (...args) => updates.push(args),
  }]));
  const metadata = {
    'sources.yml': { sources: [] },
    'measures.yml': { measures: [{ key: 'fixture', name: 'Fixture', unit: 'count', statType: categorical ? 'categorical' : 'count', axes: {}, category: 'test' }] },
    'measure-category.yml': { measureCategories: [{ key: 'test', label: 'Test', order: 1 }] },
    'collections.yml': { collections: [{ key: 'global', name: 'All' }] },
    'series.yml': { series: [{ key: 'fixture-series', measureKey: 'fixture', strataKeys, defaultStrata }] },
  };
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, 'import.js'), 'utf8');
  vm.runInNewContext(source, {
    module, exports: module.exports, __dirname,
    console: { log: line => logs.push(line), error: line => logs.push(line) },
    require: name => {
      if (name === './models') return models;
      if (name === 'fs') return {
        existsSync: p => !p.endsWith('strata'),
        readFileSync: p => yaml.dump(metadata[path.basename(p)]),
      };
      if (name === 'csvtojson') return options => {
        assert.equal(options.needEmitAll, false);
        return { fromFile: () => csv(options).fromString(text) };
      };
      return require(name);
    },
  });
  await module.exports.runImport();
  // Normalize cross-VM prototypes without losing Infinity.
  return { documents: structuredClone(documents), updates: structuredClone(updates), logs, maxWrites };
}

test('streams grouped surfaces, preserves sparse geometry and numeric values, and reports progress', async () => {
  const result = await runFixture('x,y,wx,wy,z,region\n2,1,2,3,Inf,A\n1,2,1,4,.,A\n1,1,1,1,7,B\n');
  assert.equal(result.maxWrites, 1);
  assert.equal(result.documents.length, 2);
  assert.deepEqual(result.documents[0], {
    seriesKey: 'fixture-series', strata: { region: 'A' },
    xValues: [1, 2], yValues: [1, 2],
    wxValues: [null, 2, 1, null], wyValues: [null, 3, 4, null],
    zValues: [null, Infinity, null, null], zEncoding: 'row-major-y',
  });
  assert.deepEqual(result.documents[1].zValues, [7]);
  assert.deepEqual(result.updates[0][1].$set.strataValues, { region: ['A', 'B'] });
  assert(result.logs.includes('Surfaces imported: 0'));
  assert(result.logs.includes('Surfaces imported: 1; fixture-series: 1'));
  assert(result.logs.includes('Surfaces imported: 2; fixture-series: 2'));
  assert(result.logs.includes('Import complete. Surfaces imported: 2.'));
  assert(!result.logs.some(line => line.includes('Series imported:')));
});

test('handles categorical values and final unstratified surface', async () => {
  const result = await runFixture('x,y,wx,wy,z\n1,1,1,1, label \n2,1,1,1,.\n', { categorical: true, strataKeys: [] });
  assert.deepEqual(result.documents[0].zValues, ['label', null]);
  assert.deepEqual(result.documents[0].strata, {});
});

test('rejects interleaved strata groups', async () => {
  await assert.rejects(runFixture('x,y,wx,wy,z,region\n1,1,1,1,1,A\n1,1,1,1,2,B\n2,1,1,1,3,A\n'), /Non-contiguous strata combination/);
});

test('propagates database write failures during streaming and final flush', async () => {
  const header = 'x,y,wx,wy,z,region\n';
  const first = '1,1,1,1,1,A\n';
  await assert.rejects(runFixture(header + first, { failWrite: true }), /Database write failed/);
  await assert.rejects(runFixture(header + first + '1,1,1,1,2,B\n', { failWrite: true }), /Database write failed/);
});

test('still validates missing strata, widths, and default selections', async () => {
  await assert.rejects(runFixture('x,y,wx,wy,z,region\n1,1,1,1,1,\n'), /Missing region/);
  await assert.rejects(runFixture('x,y,wx,wy,z,region\n1,1,invalid,1,1,A\n'), /Invalid wx/);
  await assert.rejects(runFixture('x,y,wx,wy,z,region\n1,1,1,1,1,A\n', { defaultStrata: { region: 'B' } }), /defaultStrata/);
});
