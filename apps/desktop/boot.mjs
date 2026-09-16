// Do not spawn descendants until the desktop launcher signals start (Windows Job / macOS process ownership).
process.stdin.once('data', () => {
  process.stdin.pause()
  import('../web/src/launch.mjs').catch(error => { console.error(error); process.exitCode = 1 })
})
process.stdin.once('end', () => { process.exitCode = 1 })
