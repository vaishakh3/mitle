import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const buildFile = path.join(projectRoot, 'apps/mobile/android/app/build.gradle');
const wrapperPropertiesFile = path.join(
  projectRoot,
  'apps/mobile/android/gradle/wrapper/gradle-wrapper.properties',
);
const required = [
  'MILTE_UPLOAD_STORE_FILE',
  'MILTE_UPLOAD_STORE_PASSWORD',
  'MILTE_UPLOAD_KEY_ALIAS',
  'MILTE_UPLOAD_KEY_PASSWORD',
];

for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing ${name}; release signing cannot use the debug certificate.`);
}

const signing = `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file(System.getenv('MILTE_UPLOAD_STORE_FILE'))
            storePassword System.getenv('MILTE_UPLOAD_STORE_PASSWORD')
            keyAlias System.getenv('MILTE_UPLOAD_KEY_ALIAS')
            keyPassword System.getenv('MILTE_UPLOAD_KEY_PASSWORD')
        }
    }`;

let source = fs.readFileSync(buildFile, 'utf8');
const signingPattern = /signingConfigs \{\n\s+debug \{[\s\S]*?\n\s+\}\n\s+\}/;
if (!signingPattern.test(source)) throw new Error('Generated Gradle signing block did not match the expected Expo template.');
source = source.replace(signingPattern, signing);
source = source.replace(
  /(buildTypes\s*\{[\s\S]*?\bdebug\s*\{[\s\S]*?)signingConfig signingConfigs\.(?:debug|release)/,
  '$1signingConfig signingConfigs.debug',
);
source = source.replace(
  /(buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?)signingConfig signingConfigs\.(?:debug|release)/,
  '$1signingConfig signingConfigs.release',
);
const buildTypes = source.match(/buildTypes\s*\{([\s\S]*?)\n\s*\}\n\s*packagingOptions/)?.[1] ?? '';
if (!/debug\s*\{[\s\S]*?signingConfig signingConfigs\.debug/.test(buildTypes)) {
  throw new Error('Debug build was not left on the debug certificate.');
}
if (!/release\s*\{[\s\S]*?signingConfig signingConfigs\.release/.test(buildTypes)) {
  throw new Error('Release build was not switched to the upload certificate.');
}
fs.writeFileSync(buildFile, source);

let wrapperProperties = fs.readFileSync(wrapperPropertiesFile, 'utf8');
wrapperProperties = wrapperProperties.replace(/^networkTimeout=.*$/m, 'networkTimeout=120000');
if (!wrapperProperties.includes('networkTimeout=120000')) {
  throw new Error('Generated Gradle wrapper properties did not expose networkTimeout.');
}
fs.writeFileSync(wrapperPropertiesFile, wrapperProperties);
