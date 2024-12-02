const { setupTestDb } = require('./src/__tests__/utils/test-db')

module.exports = async () => {
  // Set up test environment variables
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL

  // Clean and set up test database
  await setupTestDb()

  // Set up performance measurement baseline
  if (process.env.JEST_WORKER_ID === '1') {
    const start = Date.now()
    // Run some baseline operations to warm up the VM
    for (let i = 0; i < 1000; i++) {
      JSON.stringify({ test: i })
      JSON.parse('{"test":' + i + '}')
    }
    global.__PERF_BASELINE__ = Date.now() - start
  }
}
