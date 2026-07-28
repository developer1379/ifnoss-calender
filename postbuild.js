const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'dist', 'ifnoss-calender', 'browser');
const destDir = path.join(__dirname, 'dist', 'ifnoss-calender');

if (fs.existsSync(srcDir)) {
    // Copy all files from browser folder to the parent dist folder
    const files = fs.readdirSync(srcDir);
    for (const file of files) {
        const srcFile = path.join(srcDir, file);
        const destFile = path.join(destDir, file);
        fs.renameSync(srcFile, destFile);
    }
    // Remove the now-empty browser folder
    fs.rmdirSync(srcDir);
    console.log('✅ Post-build: Successfully moved browser assets to dist/ifnoss-calender root.');
} else {
    console.log('⚠️ Post-build: Browser directory not found. Skipping asset relocation.');
}
