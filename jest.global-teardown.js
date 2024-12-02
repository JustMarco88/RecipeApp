const { cleanupTestDb } = require('./src/__tests__/utils/test-db')

module.exports = async () => {
  // Clean up test database
  await cleanupTestDb()

  // Clean up performance measurement data
  if (process.env.JEST_WORKER_ID === '1') {
    delete global.__PERF_BASELINE__
  }
}
