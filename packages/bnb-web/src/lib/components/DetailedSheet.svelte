<script lang="ts">
	import { formatKey, parseSumValue, formatBreakdown, formatMod } from '$lib/format';
	import InventorySection from './InventorySection.svelte';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let { character }: { character: Record<string, any> } = $props();
	const desc = $derived(character.description ?? {});
	const abilities = $derived(character.abilities ?? {});
	const levels = $derived(character.levels ?? {});
	const combat = $derived(character.combat ?? {});
	const movement = $derived(character.movement ?? {});
	const skills = $derived(character.skills ?? {});
	const special = $derived(character.special ?? {});
	const inventory = $derived(character.inventory ?? {});
	const spells = $derived(character.spells ?? {});
	const notes = $derived(character.notes ?? {});

	const levelSkipKeys = new Set(['xp', 'hd', 'hp', 'max-hp', 'ecl', 'level-adjustment']);

	function classEntries(lvls: Record<string, unknown>) {
		return Object.entries(lvls).filter(([k]) => !levelSkipKeys.has(k));
	}

	function abilityMod(val: unknown): string {
		const parsed = parseSumValue(val);
		// The mod is the second element's value (e.g., str: 6)
		if (Array.isArray(val) && val.length > 1) {
			const second = val[1];
			if (second && typeof second === 'object') {
				const v = Object.values(second)[0];
				return formatMod(v as number);
			}
		}
		return '';
	}

	function abilityScore(val: unknown): string {
		return parseSumValue(val).total;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function attackEntries(attacks: Record<string, any>): [string, unknown][] {
		return Object.entries(attacks).filter(([k]) => k !== '_');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function baseAttack(attacks: Record<string, any>): string {
		if (attacks._) {
			const p = parseSumValue(attacks._);
			return `${formatMod(Number(p.total))} (${formatBreakdown(p.breakdown)})`;
		}
		return '';
	}

	function parseWeapon(val: unknown): {
		atk: string;
		damage: string;
		crit: string;
		atkBreakdown: Record<string, unknown>;
		dmgBreakdown: Record<string, unknown>;
		tags: string[];
	} {
		if (!Array.isArray(val))
			return { atk: '', damage: '', crit: '', atkBreakdown: {}, dmgBreakdown: {}, tags: [] };
		const atk = String(val[0] ?? '');
		const damage = String(val[1] ?? '');
		const crit = String(val[2] ?? '');
		const atkBreakdown: Record<string, unknown> = {};
		const dmgBreakdown: Record<string, unknown> = {};
		const tags: string[] = [];

		// Elements 3+ are atk breakdown, dmg breakdown, tags array
		let objIdx = 0;
		for (let i = 3; i < val.length; i++) {
			const item = val[i];
			if (Array.isArray(item)) {
				tags.push(...item.map(String));
			} else if (item && typeof item === 'object') {
				if (objIdx === 0) Object.assign(atkBreakdown, item);
				else Object.assign(dmgBreakdown, item);
				objIdx++;
			}
		}
		return { atk, damage, crit, atkBreakdown, dmgBreakdown, tags };
	}

	function inventoryLocations(inv: Record<string, unknown>): string[] {
		if (Array.isArray(inv._on)) return inv._on as string[];
		return Object.keys(inv).filter((k) => !k.startsWith('_') && k !== 'money');
	}

	function inventoryItems(inv: Record<string, unknown>, location: string): unknown[][] {
		const items = inv[location];
		if (!Array.isArray(items)) return [];
		return items.filter((item: unknown) => Array.isArray(item) && (item as unknown[]).length > 0);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function hasSpells(sp: Record<string, any>): boolean {
		return Object.keys(sp).length > 0;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function spellSections(sp: Record<string, any>): { key: string; section: Record<string, any> }[] {
		// Some characters have spells directly (caster-class, caster-level, etc.)
		// Others have nested class keys (cleric: { caster-level, ... })
		if (sp['caster-class'] || sp['caster-level'] || sp['spells-per-day']) {
			return [{ key: 'spells', section: sp }];
		}
		// Otherwise check for class-keyed sections
		const sections: { key: string; section: Record<string, unknown> }[] = [];
		for (const [k, v] of Object.entries(sp)) {
			if (v && typeof v === 'object' && !Array.isArray(v) && k !== 'special-spells') {
				sections.push({ key: k, section: v as Record<string, unknown> });
			}
		}
		if (sections.length === 0 && Object.keys(sp).length > 0) {
			return [{ key: 'spells', section: sp }];
		}
		return sections;
	}

	function spellList(prepared: Record<string, unknown>): [string, string[]][] {
		return Object.entries(prepared)
			.sort(([a], [b]) => Number(a) - Number(b))
			.map(([level, spells]) => [level, Array.isArray(spells) ? spells.map(String) : [String(spells)]]);
	}
</script>

<div class="sheet">
	<!-- HEADER -->
	<header class="char-header">
		<h1>{desc.name ?? 'Unknown'}</h1>
		<div class="subtitle">
			{#if desc.player}<span>Player: {desc.player}</span>{/if}
			{#if desc.race}<span>{desc.race}</span>{/if}
			{#if desc.alignment}<span>{desc.alignment}</span>{/if}
			{#if desc.size}<span>Size: {desc.size}</span>{/if}
		</div>
		{#if desc.age || desc.height || desc.weight}
			<div class="desc-details">
				{#if desc.age}<span>{desc.age}</span>{/if}
				{#if desc.height}<span>{desc.height}</span>{/if}
				{#if desc.weight}<span>{desc.weight}</span>{/if}
				{#if desc.eyes}<span>Eyes: {desc.eyes}</span>{/if}
				{#if desc.hair}<span>Hair: {desc.hair}</span>{/if}
			</div>
		{/if}
	</header>

	<div class="columns">
		<!-- LEFT COLUMN -->
		<div class="col">
			<!-- CLASSES & LEVELS -->
			<section>
				<h2>Levels</h2>
				<div class="stat-row">
					<span class="label">XP</span>
					<span>{levels.xp?.toLocaleString() ?? '—'}</span>
				</div>
				{#if levels.ecl}
					<div class="stat-row">
						<span class="label">ECL</span>
						<span>{levels.ecl}</span>
					</div>
				{/if}
				{#each classEntries(levels) as [cls, val]}
					{@const p = parseSumValue(val)}
					<div class="stat-row">
						<span class="label">{formatKey(cls)}</span>
						<span>Level {p.total}</span>
					</div>
				{/each}
				{#if levels.hd}
					{@const hd = parseSumValue(levels.hd)}
					<div class="stat-row">
						<span class="label">HD</span>
						<span>{hd.total}{#if Object.keys(hd.breakdown).length > 0}
								<span class="detail">({formatBreakdown(hd.breakdown)})</span>
							{/if}</span>
					</div>
				{/if}
				{#if levels.hp}
					{@const hp = parseSumValue(levels.hp)}
					<div class="stat-row hp-row">
						<span class="label">HP</span>
						<span class="hp-value">{hp.total}
							{#if hp.breakdown['max-hp']}
								<span class="detail">/ {hp.breakdown['max-hp']} max</span>
							{/if}
							{#if hp.breakdown.damage}
								<span class="damage">({hp.breakdown.damage} dmg)</span>
							{/if}
						</span>
					</div>
				{/if}
			</section>

			<!-- ABILITIES -->
			<section>
				<h2>Abilities</h2>
				<table class="ability-table">
					<thead>
						<tr>
							<th>Ability</th>
							<th>Score</th>
							<th>Mod</th>
							<th>Details</th>
						</tr>
					</thead>
					<tbody>
						{#each Object.entries(abilities) as [name, val]}
							{@const p = parseSumValue(val)}
							<tr>
								<td class="ability-name">{formatKey(name)}</td>
								<td class="centered">{abilityScore(val)}</td>
								<td class="centered mod">{abilityMod(val)}</td>
								<td class="detail">{#if Object.keys(p.breakdown).length > 0}{formatBreakdown(p.breakdown)}{/if}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</section>

			<!-- COMBAT -->
			<section>
				<h2>Combat</h2>
				{#if combat.initiative}
					{@const init = parseSumValue(combat.initiative)}
					<div class="stat-row">
						<span class="label">Initiative</span>
						<span>{formatMod(Number(init.total))}
							<span class="detail">({formatBreakdown(init.breakdown)})</span>
						</span>
					</div>
				{/if}

				<!-- Saves -->
				{#if combat.saves}
					<h3>Saving Throws</h3>
					{#each Object.entries(combat.saves) as [save, val]}
						{@const p = parseSumValue(val)}
						<div class="stat-row">
							<span class="label">{formatKey(save)}</span>
							<span>{formatMod(Number(p.total))}
								<span class="detail">({formatBreakdown(p.breakdown)})</span>
							</span>
						</div>
					{/each}
				{/if}

				<!-- BAB & Grapple -->
				{#if combat.attack}
					<h3>Attack</h3>
					{#if combat.attack.bab}
						{@const bab = parseSumValue(combat.attack.bab)}
						<div class="stat-row">
							<span class="label">BAB</span>
							<span>{formatMod(Number(bab.total))}
								<span class="detail">({formatBreakdown(bab.breakdown)})</span>
							</span>
						</div>
					{/if}
					{#if combat.attack.grapple}
						{@const grapple = parseSumValue(combat.attack.grapple)}
						<div class="stat-row">
							<span class="label">Grapple</span>
							<span>{formatMod(Number(grapple.total))}
								<span class="detail">({formatBreakdown(grapple.breakdown)})</span>
							</span>
						</div>
					{/if}

					<!-- Melee -->
					{#if combat.attack.melee}
						<h4>Melee {#if combat.attack.melee._}<span class="base-atk">{baseAttack(combat.attack.melee)}</span>{/if}</h4>
						{#each attackEntries(combat.attack.melee) as [name, val]}
							{@const w = parseWeapon(val)}
							<div class="weapon">
								<span class="weapon-name">{formatKey(name)}</span>
								<span class="weapon-stats">
									{formatMod(Number(w.atk))} | {w.damage} | {w.crit}
								</span>
								{#if w.tags.length > 0}
									<span class="weapon-tags">{w.tags.join(', ')}</span>
								{/if}
							</div>
						{/each}
					{/if}

					<!-- Ranged -->
					{#if combat.attack.ranged}
						<h4>Ranged {#if combat.attack.ranged._}<span class="base-atk">{baseAttack(combat.attack.ranged)}</span>{/if}</h4>
						{#each attackEntries(combat.attack.ranged) as [name, val]}
							{@const w = parseWeapon(val)}
							<div class="weapon">
								<span class="weapon-name">{formatKey(name)}</span>
								<span class="weapon-stats">
									{formatMod(Number(w.atk))} | {w.damage} | {w.crit}
								</span>
								{#if w.tags.length > 0}
									<span class="weapon-tags">{w.tags.join(', ')}</span>
								{/if}
							</div>
						{/each}
					{/if}

					<!-- Full Attack -->
					{#if combat.attack.melee?.['full-attack']}
						<h4>Full Attack</h4>
						{#each combat.attack.melee['full-attack'] as atk}
							<div class="weapon">
								<span class="weapon-name">{atk[0]}</span>
								<span class="weapon-stats">
									{formatMod(Number(atk[1]))} | {atk[2]} | {atk[3]}
								</span>
							</div>
						{/each}
					{/if}
				{/if}

				<!-- Defense -->
				{#if combat.defense}
					<h3>Defense</h3>
					{#each Object.entries(combat.defense) as [key, val]}
						{@const p = parseSumValue(val)}
						<div class="stat-row">
							<span class="label">{formatKey(key)}</span>
							<span>{p.total}
								{#if Object.keys(p.breakdown).length > 0}
									<span class="detail">({formatBreakdown(p.breakdown)})</span>
								{/if}
							</span>
						</div>
					{/each}
				{/if}

				<!-- Special Attacks -->
				{#if combat['special-attacks']}
					<h3>Special Attacks</h3>
					{#each Object.entries(combat['special-attacks']) as [name, val]}
						<div class="stat-row">
							<span class="label">{formatKey(name)}</span>
							<span>{Array.isArray(val) ? val.join(', ') : val}</span>
						</div>
					{/each}
				{/if}
			</section>

			<!-- MOVEMENT -->
			<section>
				<h2>Movement</h2>
				{#each Object.entries(movement) as [key, val]}
					{@const p = parseSumValue(val)}
					{#if key === 'capacity'}
						<div class="stat-row">
							<span class="label">Capacity</span>
							<span>
								{#each Object.entries(val as Record<string, unknown>) as [cap, amt], i}
									{#if i > 0} / {/if}{formatKey(cap)}: {amt}
								{/each}
							</span>
						</div>
					{:else}
						<div class="stat-row">
							<span class="label">{formatKey(key)}</span>
							<span>{p.total}
								{#if Object.keys(p.breakdown).length > 0}
									<span class="detail">({formatBreakdown(p.breakdown)})</span>
								{/if}
							</span>
						</div>
					{/if}
				{/each}
			</section>
		</div>

		<!-- RIGHT COLUMN -->
		<div class="col">
			<!-- SKILLS -->
			<section>
				<h2>Skills</h2>
				{#if skills._points}
					{@const pts = parseSumValue(skills._points)}
					<div class="stat-row">
						<span class="label">Skill Points</span>
						<span>{pts.total}
							<span class="detail">({formatBreakdown(pts.breakdown)})</span>
						</span>
					</div>
				{/if}
				<table class="skill-table">
					<thead>
						<tr>
							<th>Skill</th>
							<th>Total</th>
							<th>Breakdown</th>
						</tr>
					</thead>
					<tbody>
						{#each Object.entries(skills).filter(([k]) => !k.startsWith('_')) as [name, val]}
							{@const p = parseSumValue(val)}
							<tr>
								<td>{formatKey(name)}</td>
								<td class="centered">{formatMod(Number(p.total))}</td>
								<td class="detail">{formatBreakdown(p.breakdown)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</section>

			<!-- SPECIAL -->
			<section>
				<h2>Special Abilities</h2>
				{#if special.feats}
					<h3>Feats</h3>
					<ul class="feat-list">
						{#each special.feats as feat}
							<li>
								<strong>{feat[0]}</strong>
								{#if feat[1]}
									<span class="detail">
										({#if typeof feat[1] === 'object'}{Object.entries(feat[1]).map(([k, v]) => `${formatKey(k)}: ${v}`).join(', ')}{:else}{feat[1]}{/if})
									</span>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}

				{#if special.racial}
					<h3>Racial Traits</h3>
					<ul>
						{#each special.racial as trait}
							<li>{trait}</li>
						{/each}
					</ul>
				{/if}

				{#if special['class-abilities']}
					<h3>Class Abilities</h3>
					{#each Object.entries(special['class-abilities']) as [name, val]}
						<div class="stat-row">
							<span class="label">{formatKey(name)}</span>
							<span>
								{#if typeof val === 'string'}
									{val}
								{:else if Array.isArray(val)}
									<ul>
										{#each val as item}
											<li>{item}</li>
										{/each}
									</ul>
								{:else if typeof val === 'object' && val !== null}
									{#each Object.entries(val) as [k, v]}
										<div>{formatKey(k)}: {v}</div>
									{/each}
								{:else}
									{val}
								{/if}
							</span>
						</div>
					{/each}
				{/if}

				{#if special.proficiencies}
					<h3>Proficiencies</h3>
					<p>{special.proficiencies.join(', ')}</p>
				{/if}

				{#if special.languages}
					<h3>Languages</h3>
					<p>{special.languages.join(', ')}</p>
				{/if}
			</section>

			<!-- SPELLS -->
			{#if hasSpells(spells)}
				<section class="page-break-before">
					<h2>Spells</h2>
					{#each spellSections(spells) as { key, section }}
						{#if spellSections(spells).length > 1}
							<h3>{formatKey(key)}</h3>
						{/if}
						{#if section['caster-level']}
							<div class="stat-row">
								<span class="label">Caster Level</span>
								<span>{section['caster-level']}</span>
							</div>
						{/if}
						{#if section['key-ability']}
							<div class="stat-row">
								<span class="label">Key Ability</span>
								<span>{formatKey(section['key-ability'])}</span>
							</div>
						{/if}
						{#if section.domains}
							<div class="stat-row">
								<span class="label">Domains</span>
								<span>{Array.isArray(section.domains) ? section.domains.join(', ') : section.domains}</span>
							</div>
						{/if}
						{#if section.ranges}
							<div class="stat-row">
								<span class="label">Ranges</span>
								<span>{Object.entries(section.ranges).map(([k, v]) => `${formatKey(k)}: ${v}`).join(', ')}</span>
							</div>
						{/if}
						{#if section['spells-per-day']}
							<div class="stat-row">
								<span class="label">Spells/Day</span>
								<span>{Object.entries(section['spells-per-day']).map(([k, v]) => `${k}: ${v}`).join(' | ')}</span>
							</div>
						{/if}
						{#if section['save-dc']}
							<div class="stat-row">
								<span class="label">Save DC</span>
								<span>{Object.entries(section['save-dc']).map(([k, v]) => `${k}: ${v}`).join(' | ')}</span>
							</div>
						{/if}
						{#if section['spells-prepared']}
							<h4>Prepared</h4>
							{#each spellList(section['spells-prepared']) as [level, names]}
								<div class="spell-level">
									<span class="label">Lv {level}</span>
									<span>{names.join(', ')}</span>
								</div>
							{/each}
						{/if}
						{#if section.spellbook}
							<h4>Spellbook</h4>
							{#each spellList(section.spellbook) as [level, names]}
								<div class="spell-level">
									<span class="label">Lv {level}</span>
									<span>{names.join(', ')}</span>
								</div>
							{/each}
						{/if}
					{/each}

					{#if spells['special-spells']}
						<h3>Special Spells</h3>
						<table class="skill-table">
							<thead>
								<tr><th>Spell</th><th>Lv</th><th>Source</th><th>Replaces</th></tr>
							</thead>
							<tbody>
								{#each spells['special-spells'] as sp}
									<tr>
										<td>{sp.spell}</td>
										<td class="centered">{sp.level}</td>
										<td>{sp.source ?? ''}</td>
										<td>{sp.replaces ?? ''}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</section>
			{/if}
		</div>
	</div>

	<!-- INVENTORY (full width) -->
	<InventorySection {inventory} />

	<!-- NOTES -->
	{#if Object.keys(notes).length > 0}
		<section>
			<h2>Notes</h2>
			{#each Object.entries(notes) as [key, val]}
				<div class="stat-row">
					<span class="label">{formatKey(key)}</span>
					<span>{val}</span>
				</div>
			{/each}
		</section>
	{/if}
</div>

<style>
	.sheet {
		max-width: 1100px;
		margin: 0 auto;
		font-size: 0.9rem;
		line-height: 1.4;
	}
	.char-header {
		margin-bottom: 1.5rem;
		border-bottom: 2px solid #333;
		padding-bottom: 0.75rem;
	}
	.char-header h1 {
		margin: 0 0 0.25rem;
		font-size: 1.8rem;
	}
	.subtitle span,
	.desc-details span {
		margin-right: 1.5rem;
		color: #555;
	}
	.desc-details {
		margin-top: 0.25rem;
		font-size: 0.85rem;
	}
	.columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}
	section {
		margin-bottom: 1.25rem;
	}
	h2 {
		font-size: 1.15rem;
		border-bottom: 1px solid #999;
		padding-bottom: 0.25rem;
		margin: 0 0 0.5rem;
	}
	h3 {
		font-size: 0.95rem;
		margin: 0.75rem 0 0.35rem;
		color: #444;
	}
	h4 {
		font-size: 0.85rem;
		margin: 0.5rem 0 0.25rem;
		color: #555;
	}
	.stat-row {
		display: flex;
		gap: 0.5rem;
		margin: 0.15rem 0;
		flex-wrap: wrap;
	}
	.label {
		font-weight: 600;
		min-width: 6rem;
		flex-shrink: 0;
	}
	.detail {
		color: #777;
		font-size: 0.8rem;
	}
	.hp-row .hp-value {
		font-weight: 700;
		font-size: 1rem;
	}
	.damage {
		color: #c33;
		font-weight: 600;
	}
	.mod {
		font-weight: 600;
	}
	.centered {
		text-align: center;
	}

	/* Tables */
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.82rem;
		margin: 0.25rem 0;
	}
	th,
	td {
		padding: 0.2rem 0.4rem;
		text-align: left;
		border-bottom: 1px solid #e0e0e0;
	}
	th {
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		color: #666;
		border-bottom: 2px solid #ccc;
	}
	.ability-table .ability-name {
		font-weight: 600;
		text-transform: capitalize;
	}

	/* Weapons */
	.weapon {
		margin: 0.15rem 0;
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		align-items: baseline;
	}
	.weapon-name {
		font-weight: 600;
		min-width: 8rem;
	}
	.weapon-stats {
		font-family: monospace;
		font-size: 0.82rem;
	}
	.weapon-tags {
		font-size: 0.75rem;
		color: #888;
		font-style: italic;
	}
	.base-atk {
		font-weight: 400;
		font-size: 0.8rem;
		color: #666;
	}

	/* Feats */
	.feat-list {
		padding-left: 1.25rem;
		margin: 0.25rem 0;
	}
	.feat-list li {
		margin: 0.15rem 0;
	}
	ul {
		padding-left: 1.25rem;
		margin: 0.25rem 0;
	}
	li {
		margin: 0.1rem 0;
	}
	p {
		margin: 0.25rem 0;
	}

	/* Spells */
	.spell-level {
		display: flex;
		gap: 0.5rem;
		margin: 0.15rem 0;
		flex-wrap: wrap;
	}
	.spell-level .label {
		min-width: 3rem;
		font-weight: 600;
		color: #555;
	}


	/* Print */
	@media print {
		:global(.no-print) {
			display: none !important;
		}
		.sheet {
			max-width: none;
			font-size: 8pt;
			line-height: 1.3;
		}
		.char-header {
			margin-bottom: 0.75rem;
		}
		.columns {
			gap: 1rem;
		}
		section {
			margin-bottom: 0.75rem;
		}
		h2 {
			font-size: 10pt;
		}
		table {
			font-size: 7.5pt;
		}
		.page-break-before {
			break-before: auto;
		}
		@page {
			margin: 0.4in;
		}
	}
</style>
