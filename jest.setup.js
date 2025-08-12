import '@testing-library/jest-dom'

// Set up test environment variables
process.env.JWT_SECRET = 'test-secret-for-jest'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb'