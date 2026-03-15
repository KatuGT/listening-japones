const fs = require('fs');
const path = require('path');

const envFile = `export const environment = {
    production: ${process.env.NODE_ENV === 'production'},
    supabaseUrl: '${process.env.SUPABASE_URL || ''}',
    supabaseKey: '${process.env.SUPABASE_KEY || ''}',
    recaptchaSiteKey: '${process.env.RECAPTCHA_SITE_KEY || ''}'
};
`;

const targetPath = path.join(__dirname, 'src', 'environments', 'environment.ts');
const targetPathDev = path.join(__dirname, 'src', 'environments', 'environment.development.ts');

const dir = path.join(__dirname, 'src', 'environments');
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(targetPath, envFile);
fs.writeFileSync(targetPathDev, envFile);

console.log(`Environment files generated at ${targetPath}`);
