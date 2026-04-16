// (customer)/page.tsx conflicts with app/page.tsx for the / route.
// Next.js skips its artifacts, causing an ENOENT on Vercel at startup.
// Temporarily rename the file so Next.js never sees the duplicate.
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const conflictingPage = path.join(__dirname, '../src/app/(customer)/page.tsx')
const backup = conflictingPage + '.bak'

let renamed = false
try {
  if (fs.existsSync(conflictingPage)) {
    fs.renameSync(conflictingPage, backup)
    renamed = true
    console.log('ℹ Temporarily removed conflicting (customer)/page.tsx for build')
  }
  execSync('next build', { stdio: 'inherit' })
} finally {
  if (renamed && fs.existsSync(backup)) {
    fs.renameSync(backup, conflictingPage)
    console.log('ℹ Restored (customer)/page.tsx')
  }
}
