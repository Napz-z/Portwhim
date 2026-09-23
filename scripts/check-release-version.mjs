import { readFileSync } from 'node:fs';

const packageVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version;
const tauriVersion = JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url))).version;
const cargo = readFileSync(new URL('../src-tauri/Cargo.toml', import.meta.url), 'utf8');
const cargoPackage = cargo.split('[package]')[1]?.split(/^\[/m)[0];
const cargoVersion = cargoPackage?.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const tag = process.env.GITHUB_REF_NAME;

if (!tag || tag !== `v${packageVersion}` || tauriVersion !== packageVersion || cargoVersion !== packageVersion) {
  console.error(`Release version mismatch: tag=${tag}, package=${packageVersion}, tauri=${tauriVersion}, cargo=${cargoVersion}`);
  process.exit(1);
}
console.log(`Release version verified: ${tag}`);
