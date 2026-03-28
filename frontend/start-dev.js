// Wrapper to ensure process.cwd() is the frontend/ directory before Next.js starts.
// This is required when launching from the project root (e.g. via .claude/launch.json)
// so that PostCSS/Tailwind resolve content globs relative to the correct directory.
process.chdir(__dirname)
require('./node_modules/next/dist/bin/next')
