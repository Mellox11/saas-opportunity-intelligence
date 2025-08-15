#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('yamljs');

const EXPANSION_PACK_NAME = process.argv[2];

if (!EXPANSION_PACK_NAME) {
  console.error('Usage: node tools/install-expansion-pack.js <expansion-pack-name>');
  process.exit(1);
}

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BMAD_CORE_PATH = path.join(PROJECT_ROOT, '.bmad-core');
const EXPANSION_PACK_PATH = path.join(PROJECT_ROOT, 'expansion-packs', `bmad-${EXPANSION_PACK_NAME}-devops`);
const INSTALL_MANIFEST_PATH = path.join(BMAD_CORE_PATH, 'install-manifest.yaml');

console.log(`\n🚀 Installing BMad Expansion Pack: ${EXPANSION_PACK_NAME}`);
console.log(`📁 From: ${EXPANSION_PACK_PATH}`);
console.log(`📁 To: ${BMAD_CORE_PATH}\n`);

// Check if expansion pack exists
if (!fs.existsSync(EXPANSION_PACK_PATH)) {
  console.error(`❌ Expansion pack not found at: ${EXPANSION_PACK_PATH}`);
  process.exit(1);
}

// Read the expansion pack config
const configPath = path.join(EXPANSION_PACK_PATH, 'config.yaml');
let expansionConfig = {};
if (fs.existsSync(configPath)) {
  try {
    expansionConfig = yaml.load(configPath);
    console.log(`✅ Loaded expansion pack config: ${expansionConfig.name || EXPANSION_PACK_NAME}`);
  } catch (error) {
    console.warn(`⚠️  Could not parse config.yaml: ${error.message}`);
  }
}

// Copy expansion pack files to .bmad-core
const directories = ['agents', 'checklists', 'tasks', 'templates', 'data'];
let copiedFiles = [];

directories.forEach(dir => {
  const sourcePath = path.join(EXPANSION_PACK_PATH, dir);
  const targetPath = path.join(BMAD_CORE_PATH, dir);
  
  if (!fs.existsSync(sourcePath)) {
    console.log(`⏭️  Skipping ${dir} (not found in expansion pack)`);
    return;
  }
  
  // Ensure target directory exists
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
  
  // Copy files recursively
  copyRecursive(sourcePath, targetPath, copiedFiles);
  console.log(`✅ Copied ${dir} files to .bmad-core`);
  
  // Also copy to .claude/commands/BMad for IDE integration
  if (dir === 'agents' || dir === 'tasks') {
    const claudeTargetPath = path.join(PROJECT_ROOT, '.claude', 'commands', 'BMad', dir);
    if (!fs.existsSync(claudeTargetPath)) {
      fs.mkdirSync(claudeTargetPath, { recursive: true });
    }
    copyRecursive(sourcePath, claudeTargetPath, []);
    console.log(`✅ Copied ${dir} files to .claude/commands for IDE integration`);
  }
});

// Update install manifest
if (fs.existsSync(INSTALL_MANIFEST_PATH)) {
  try {
    const manifest = yaml.load(INSTALL_MANIFEST_PATH);
    
    // Add to expansion_packs array
    if (!manifest.expansion_packs) {
      manifest.expansion_packs = [];
    }
    
    const packEntry = {
      name: `bmad-${EXPANSION_PACK_NAME}-devops`,
      version: expansionConfig.version || '1.0.0',
      installed_at: new Date().toISOString(),
      files: copiedFiles.map(file => ({
        path: path.relative(PROJECT_ROOT, file),
        modified: false
      }))
    };
    
    // Check if already installed
    const existingIndex = manifest.expansion_packs.findIndex(p => p.name === packEntry.name);
    if (existingIndex >= 0) {
      manifest.expansion_packs[existingIndex] = packEntry;
      console.log(`\n📝 Updated existing expansion pack entry in manifest`);
    } else {
      manifest.expansion_packs.push(packEntry);
      console.log(`\n📝 Added expansion pack to manifest`);
    }
    
    // Write updated manifest
    fs.writeFileSync(INSTALL_MANIFEST_PATH, yaml.stringify(manifest, 4));
    console.log(`✅ Updated install manifest`);
  } catch (error) {
    console.error(`❌ Error updating manifest: ${error.message}`);
  }
}

console.log(`\n✨ BMad ${EXPANSION_PACK_NAME} expansion pack installed successfully!`);
console.log(`\n📚 Available resources:`);
copiedFiles.forEach(file => {
  const relPath = path.relative(BMAD_CORE_PATH, file);
  console.log(`   - ${relPath}`);
});

console.log(`\n💡 Next steps:`);
console.log(`   1. Review the new agents in .bmad-core/agents/`);
console.log(`   2. Check new tasks in .bmad-core/tasks/infra/`);
console.log(`   3. Use templates in .bmad-core/templates/ for infrastructure projects`);

// Helper function to copy files recursively
function copyRecursive(source, target, fileList) {
  const files = fs.readdirSync(source);
  
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      copyRecursive(sourcePath, targetPath, fileList);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
      fileList.push(targetPath);
    }
  });
}