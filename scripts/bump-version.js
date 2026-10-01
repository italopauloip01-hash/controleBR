import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Ler e atualizar package.json
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const versionParts = pkg.version.split('.').map(n => parseInt(n, 10) || 0);
versionParts[2] += 1; // Incrementa patch (1.9.0 -> 1.9.1)
const newVersion = versionParts.join('.');
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

// Calcular versionCode para Android (ex: 1.9.1 -> 191)
const versionCode = versionParts[0] * 100 + versionParts[1] * 10 + versionParts[2];
const today = new Date().toISOString().split('T')[0];

// 2. Atualizar src/version.ts
const versionTsPath = path.join(rootDir, 'src', 'version.ts');
const versionTsContent = `// Arquivo gerado automaticamente pelo bump de versão
export const APP_VERSION = '${newVersion}';
export const APP_BUILD_DATE = '${today}';
export const APP_VERSION_CODE = ${versionCode};
`;
fs.writeFileSync(versionTsPath, versionTsContent, 'utf8');

// 3. Atualizar android/app/build.gradle se existir
const gradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');
if (fs.existsSync(gradlePath)) {
  let gradleContent = fs.readFileSync(gradlePath, 'utf8');
  gradleContent = gradleContent.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  gradleContent = gradleContent.replace(/versionName\s+"[^"]+"/, `versionName "${newVersion}"`);
  fs.writeFileSync(gradlePath, gradleContent, 'utf8');
}

console.log(`\x1b[32m✔ Versão atualizada com sucesso para v${newVersion} (Build ${versionCode})!\x1b[0m`);
