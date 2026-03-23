const fs = require('fs');
const path = require('path');

// Intentar leer .env si no estamos en producción
if (process.env.NODE_ENV !== 'production') {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    }
}

const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' || process.env.production === 'true';

const envFile = `export const environment = {
    production: ${isProd},
    SUPABASE_URL: '${process.env.SUPABASE_URL || process.env.supabaseUrl || ''}',
    SUPABASE_KEY: '${process.env.SUPABASE_KEY || process.env.supabaseKey || ''}',
    recaptchaSiteKey: '${process.env.RECAPTCHA_SITE_KEY || process.env.recaptchaSiteKey || ''}',
    translateApiUrl: '${isProd ? '/api/translate' : 'http://localhost:3000/api/translate'}'
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
