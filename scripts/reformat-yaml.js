#!/usr/bin/env node

/**
 * Reformat YAML files using bnb-core's dataToCompactYAML
 */

import { readFileSync, writeFileSync } from 'fs';
import { parse as parseYAML } from 'yaml';
import { glob } from 'glob';

// Import from bnb-core
import { dataToCompactYAML } from '../packages/bnb-core/src/dataToCompactYAML.js';

async function main() {
  const yamlFiles = await glob('reference_material/beefy_boys_spreadsheets/yaml/*.yaml', {
    cwd: process.cwd(),
    absolute: true
  });

  console.log(`Found ${yamlFiles.length} YAML files to reformat\n`);

  for (const filePath of yamlFiles) {
    const content = readFileSync(filePath, 'utf8');
    
    try {
      // Parse the YAML
      const data = parseYAML(content);
      
      // Use bnb-core's formatter
      const formatted = dataToCompactYAML(data);
      
      // Write back
      writeFileSync(filePath, formatted, 'utf8');
      
      console.log(`✓ Reformatted: ${filePath.split('/').pop()}`);
    } catch (error) {
      console.error(`✗ Error processing ${filePath}:`, error.message);
    }
  }

  console.log(`\nDone!`);
}

main().catch(console.error);
