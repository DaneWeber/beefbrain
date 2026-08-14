#!/usr/bin/env node

/**
 * Restructure skill points tracking in character YAML files
 * 
 * OLD: climb: [13, {str: 5, ranks: 8}, {points: {ranger: 7, fighter: 1}}]
 * NEW: climb: [13, {str: 5, ranks: [8, {ranger: 7, fighter: 1}]}]
 */

import { readFileSync, writeFileSync } from 'fs';
import { parse as parseYAML } from 'yaml';
import { glob } from 'glob';

// Import bnb-core's formatter - need to use the built version
import { dataToCompactYAML } from '../packages/bnb-core/dist/index.js';

function restructureSkills(data) {
  if (!data?.character?.skills) {
    return false; // No changes needed
  }

  const skills = data.character.skills;
  let hasChanges = false;

  for (const [skillName, skillValue] of Object.entries(skills)) {
    // Skip special _points entry
    if (skillName === '_points') continue;

    // Skills must be arrays
    if (!Array.isArray(skillValue)) continue;

    // Look for the pattern: [total, {breakdown with ranks: number}, {points: {...}}]
    if (skillValue.length >= 3) {
      const breakdown = skillValue[1];
      const pointsObj = skillValue[2];
      
      // Check if this is the old pattern
      if (
        breakdown &&
        typeof breakdown === 'object' &&
        !Array.isArray(breakdown) &&
        typeof breakdown.ranks === 'number' &&
        pointsObj &&
        typeof pointsObj === 'object' &&
        pointsObj.points &&
        typeof pointsObj.points === 'object'
      ) {
        // Transform: Move points breakdown into ranks array
        const ranksTotal = breakdown.ranks;
        const ranksBreakdown = pointsObj.points;
        
        // Create new breakdown with ranks as [total, {breakdown}]
        breakdown.ranks = [ranksTotal, ranksBreakdown];
        
        // Remove the points object and shift remaining elements
        skillValue.splice(2, 1);
        
        hasChanges = true;
      }
    }
    
    // Handle edge case where structure is malformed: [1, ranks: 1, {points: {...}}]
    // This happens when the breakdown is not properly enclosed in {}
    if (skillValue.length >= 3) {
      // Check if position 1 is a plain value (not an object)
      if (typeof skillValue[1] !== 'object' || Array.isArray(skillValue[1])) {
        // This is a malformed case - we'll skip it for now
        continue;
      }
      
      // Check if we still have a points object that wasn't caught above
      const pointsIndex = skillValue.findIndex(
        item => item && typeof item === 'object' && 
                !Array.isArray(item) && 'points' in item
      );
      
      if (pointsIndex !== -1) {
        const breakdown = skillValue[1];
        const pointsObj = skillValue[pointsIndex];
        
        if (breakdown.ranks && typeof breakdown.ranks === 'number') {
          const ranksTotal = breakdown.ranks;
          const ranksBreakdown = pointsObj.points;
          
          breakdown.ranks = [ranksTotal, ranksBreakdown];
          skillValue.splice(pointsIndex, 1);
          
          hasChanges = true;
        }
      }
    }
  }

  return hasChanges;
}

async function main() {
  // Find all character YAML files
  const yamlFiles = await glob('reference_material/beefy_boys_spreadsheets/yaml/*.yaml', {
    cwd: process.cwd(),
    absolute: true
  });

  console.log(`Found ${yamlFiles.length} YAML files to process\n`);

  let updatedCount = 0;

  for (const filePath of yamlFiles) {
    const content = readFileSync(filePath, 'utf8');
    
    try {
      // Parse the YAML
      const data = parseYAML(content);
      
      // Restructure skills
      const hasChanges = restructureSkills(data);

      if (hasChanges) {
        // Use bnb-core's formatter to output with proper formatting
        const formatted = dataToCompactYAML(data);
        
        // Write back the updated data
        writeFileSync(filePath, formatted, 'utf8');
        
        console.log(`✓ Updated: ${filePath.split('/').pop()}`);
        updatedCount++;
      } else {
        console.log(`  Skipped: ${filePath.split('/').pop()} (no changes needed)`);
      }
    } catch (error) {
      console.error(`✗ Error processing ${filePath}:`, error.message);
    }
  }

  console.log(`\nUpdated ${updatedCount} of ${yamlFiles.length} files`);
}

main().catch(console.error);
