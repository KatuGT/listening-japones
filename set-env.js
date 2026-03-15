const fs = require('fs');
const path = require('path');

const envFile = `export const environment = {
    production: ${process.env.production === 'true' || process.env.NODE_ENV === 'production'},
    supabaseUrl: '${process.env.SUPABASE_URL || process.env.supabaseUrl || ''}',
    supabaseKey: '${process.env.SUPABASE_KEY || process.env.supabaseKey || ''}',
    recaptchaSiteKey: '${process.env.RECAPTCHA_SITE_KEY || process.env.recaptchaSiteKey || ''}'
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
