#!/usr/bin/env node

/**
 * Restructure skill points tracking in character YAML files
 * 
 * OLD: climb: [13, {str: 5, ranks: 8}, {points: {ranger: 7, fighter: 1}}]
 * NEW: climb: [13, {str: 5, ranks: [8, {ranger: 7, fighter: 1}]}]
 */

import { readFileSync, writeFileSync } from 'fs';
import { parseDocument, YAMLSeq, YAMLMap } from 'yaml';
import { glob } from 'glob';

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
      const doc = parseDocument(content);
      const data = doc.toJSON();
      const hasChanges = restructureSkills(data);

      if (hasChanges) {
        // Update the document with the modified data
        doc.contents = doc.createNode(data);
        
        // Apply flow style to appropriate paths (including skills)
        applyFlowStyle(doc.contents);
        
        // Write back the updated data
        const newContent = String(doc);
        writeFileSync(filePath, newContent, 'utf8');
        
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

function applyFlowStyle(node, path = []) {
  const flowStylePaths = [
    'character.abilities.*',
    'character.levels.*',
    'character.combat.initiative',
    'character.combat.saves.*',
    'character.combat.attack.bab',
    'character.combat.attack.grapple',
    'character.combat.attack.melee.*',
    'character.combat.attack.ranged.*',
    'character.combat.defense.*',
    'character.movement.*',
    'character.movement.capacity',
    'character.skills.*',
    'character.special.feats.*',
    'character.inventory._on',
    'character.inventory.*.*',
    'character.spells.*.casting',
    'character.spells.*.domains',
    'character.spells.*.slots.*',
    'character.spells.*.prepared.*',
    'character.spells.*.known.*',
  ];

  for (const pattern of flowStylePaths) {
    const patternParts = pattern.split('.');
    const pathParts = path;
    if (
      patternParts.length === pathParts.length &&
      patternParts.every((part, i) => part === '*' || part === pathParts[i])
    ) {
      if (node instanceof YAMLSeq || node instanceof YAMLMap) {
        node.flow = true;
      }
      break;
    }
  }

  if (node instanceof YAMLSeq) {
    node.items.forEach((item, idx) =>
      applyFlowStyle(item, [...path, idx.toString()])
    );
  } else if (node instanceof YAMLMap) {
    node.items.forEach((item) => {
      if (item && item.key && item.value) {
        applyFlowStyle(item.value, [...path, String(item.key)]);
      }
    });
  }
}

main().catch(console.error);
