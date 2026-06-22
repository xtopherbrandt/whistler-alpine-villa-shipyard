import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from the project root .env.local and .env files
// so that DATABASE_URL is available for integration tests.
// This worktree lives at .claude/worktrees/<id>/src/ — go up 4 levels to reach the project root.
config({ path: resolve(__dirname, '../../../../.env.local') })
config({ path: resolve(__dirname, '../../../../.env') })
