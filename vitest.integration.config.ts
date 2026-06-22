import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { config } from 'dotenv'

// Load env vars at config time so they are available to Vitest workers
const projectRoot = resolve(__dirname)
config({ path: resolve(projectRoot, '.env.local') })
config({ path: resolve(projectRoot, '.env') })

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.integration.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
