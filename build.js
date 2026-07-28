const { spawn } = require('child_process');

console.log('Starting custom build wrapper...');

const child = spawn('npx', ['ng', 'build'], {
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe']
});

let exited = false;

function forceExit(code) {
  if (exited) return;
  exited = true;
  console.log(`\nBuild wrapper: Forcing exit with code ${code}...`);
  setTimeout(() => {
    process.exit(code);
  }, 1000);
}

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.stdout.on('data', (data) => {
  const str = data.toString();
  process.stdout.write(data);

  if (str.includes('Application bundle generation complete') || str.includes('Output location:')) {
    console.log('\nBuild wrapper: Detected build completion!');
    forceExit(0);
  }
});

child.on('close', (code) => {
  console.log(`\nBuild wrapper: Child process exited with code ${code}`);
  forceExit(code || 0);
});

child.on('error', (err) => {
  console.error('\nBuild wrapper: Failed to start child process:', err);
  forceExit(1);
});
