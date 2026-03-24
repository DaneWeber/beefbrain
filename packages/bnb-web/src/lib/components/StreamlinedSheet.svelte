<script lang="ts">
	import { formatKey, parseSumValue, formatMod } from '$lib/format';
	import { categorizeAllSkills, getSkillAbility } from '$lib/skillCategories';

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
	const viewNotes = $derived(character['view-notes'] ?? {});

	const levelSkipKeys = new Set(['xp', 'hd', 'hp', 'max-hp', 'ecl', 'level-adjustment']);

	const classLine = $derived(
		Object.entries(levels)
			.filter(([k]) => !levelSkipKeys.has(k))
			.map(([k, v]) => `${formatKey(k)} ${parseSumValue(v).total}`)
			.join(' / ')
	);

	const hp = $derived(parseSumValue(levels.hp));
	const maxHp = $derived(hp.breakdown['max-hp'] ?? hp.total);
	const damage = $derived(hp.breakdown.damage ? Math.abs(Number(hp.breakdown.damage)) : 0);

	/** Extract ability modifiers as a lookup: { strength: 6, dexterity: 1, ... } */
	const abilityMods = $derived(
		Object.fromEntries(
			Object.entries(abilities).map(([name, v]) => {
				if (Array.isArray(v) && v.length > 1 && typeof v[1] === 'object' && v[1] !== null) {
					return [name, Number(Object.values(v[1])[0]) || 0];
				}
				return [name, 0];
			})
		) as Record<string, number>
	);

	const categorized = $derived(categorizeAllSkills(skills, abilityMods));

	function val(v: unknown): string {
		return parseSumValue(v).total;
	}

	function mod(v: unknown): string {
		return formatMod(Number(parseSumValue(v).total));
	}

	/** Is a skill's total better than the bare ability modifier? */
	function isBoosted(skillKey: string, skillVal: unknown): boolean {
		const total = Number(parseSumValue(skillVal).total);
		const ability = getSkillAbility(skillKey);
		const abilMod = abilityMods[ability] ?? 0;
		return total > abilMod;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function attackEntries(attacks: Record<string, any>): [string, unknown][] {
		return Object.entries(attacks).filter(([k]) => !k.startsWith('_') && k !== 'full-attack');
	}

	function parseWeapon(val: unknown): {
		atk: string;
		damage: string;
		crit: string;
		tags: string[];
	} {
		if (!Array.isArray(val)) return { atk: '', damage: '', crit: '', tags: [] };
		const tags: string[] = [];
		for (let i = 3; i < val.length; i++) {
			if (Array.isArray(val[i])) tags.push(...val[i].map(String));
		}
		return { atk: formatMod(Number(val[0])), damage: String(val[1] ?? ''), crit: String(val[2] ?? ''), tags };
	}

	// Extract senses from racial traits
	const senses = $derived(
		(special.racial ?? [])
			.map(String)
			.filter(
				(t: string) =>
					/darkvision|blinds|low-light|keen senses|tremorsense|scent/i.test(t)
			)
	);

	const nonSenseRacial = $derived(
		(special.racial ?? [])
			.map(String)
			.filter(
				(t: string) =>
					!/darkvision|blinds|low-light|keen senses|tremorsense|scent/i.test(t)
			)
	);

	// Extract immunities/resistances/DR from racial traits
	const defenseTraits = $derived(
		(special.racial ?? [])
			.map(String)
			.filter(
				(t: string) =>
					/immun|resist|DR |damage reduction|spell resistance/i.test(t)
			)
	);

	const otherRacial = $derived(
		nonSenseRacial.filter(
			(t: string) => !/immun|resist|DR |damage reduction|spell resistance/i.test(t)
		)
	);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function hasSpells(sp: Record<string, any>): boolean {
		return Object.keys(sp).length > 0;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function spellSections(sp: Record<string, any>): { key: string; section: Record<string, any> }[] {
		if (sp['caster-class'] || sp['caster-level'] || sp['spells-per-day']) {
			return [{ key: 'spells', section: sp }];
		}
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
			.map(([level, spells]) => [
				level,
				Array.isArray(spells) ? spells.map(String) : [String(spells)]
			]);
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

	function skillRows(entries: [string, unknown][]): { name: string; total: string; boosted: boolean }[] {
		return entries.map(([k, v]) => ({ name: formatKey(k), total: mod(v), boosted: isBoosted(k, v) }));
	}
</script>

<div class="sheet">
	<!-- === HEADER BAR === -->
	<header class="header-bar">
		<div class="identity">
			<h1>{desc.name ?? 'Unknown'}</h1>
			<div class="tagline">
				{#if desc.race}<span>{desc.race}</span>{/if}
				{#if classLine}<span>{classLine}</span>{/if}
				{#if desc.alignment}<span class="align-badge">{desc.alignment}</span>{/if}
			</div>
		</div>
		<div class="vital-stats">
			<div class="vital">
				<span class="vital-label">HP</span>
				<span class="vital-value" class:damaged={damage > 0}>
					{hp.total}<span class="vital-max">/{maxHp}</span>
				</span>
			</div>
			<div class="vital">
				<span class="vital-label">AC</span>
				<span class="vital-value">{val(combat.defense?.ac)}</span>
				<span class="vital-sub">T{val(combat.defense?.['touch-ac'])} FF{val(combat.defense?.['flat-footed-ac'])}</span>
			</div>
			<div class="vital">
				<span class="vital-label">Init</span>
				<span class="vital-value">{mod(combat.initiative)}</span>
			</div>
			<div class="vital">
				<span class="vital-label">Speed</span>
				<span class="vital-value">{val(movement.speed)}</span>
			</div>
		</div>
	</header>

	<!-- === ABILITIES ROW === -->
	<div class="ability-bar">
		{#each Object.entries(abilities) as [name, v]}
			<div class="ability-chip">
				<span class="ability-label">{name.slice(0, 3).toUpperCase()}</span>
				<span class="ability-score">{val(v)}</span>
				<span class="ability-mod">({#if Array.isArray(v) && v.length > 1 && typeof v[1] === 'object'}{formatMod(Object.values(v[1])[0] as number)}{/if})</span>
			</div>
		{/each}
	</div>

	<div class="columns">
		<!-- === LEFT: COMBAT === -->
		<div class="col">
			<section class="combat-section">
				<h2>Combat</h2>

				<!-- Offense -->
				<div class="subsection">
					<h3>Offense</h3>
					{#if viewNotes['combat-offense']}
						<div class="view-note">{viewNotes['combat-offense']}</div>
					{/if}
					{#if combat.attack?.bab}
						<div class="inline-stat">
							<span class="label">BAB</span> {mod(combat.attack.bab)}
							{#if combat.attack.grapple}
								<span class="sep">|</span>
								<span class="label">Grapple</span> {mod(combat.attack.grapple)}
							{/if}
							{#if combat.attack?.['sneak-attack'] || combat['sneak-attack']}
								<span class="sep">|</span>
								<span class="label">Sneak</span> {combat.attack?.['sneak-attack'] ?? combat['sneak-attack']}
							{/if}
						</div>
					{/if}

					{#if combat.attack?.melee}
						<h4>Melee</h4>
						{#each attackEntries(combat.attack.melee) as [name, v]}
							{@const w = parseWeapon(v)}
							<div class="weapon-row">
								<span class="weapon-name">{formatKey(name)}</span>
								<span class="weapon-stat">{w.atk}</span>
								<span class="weapon-dmg">{w.damage}</span>
								<span class="weapon-crit">{w.crit}</span>
								{#if w.tags.length > 0}
									<span class="tags">{w.tags.join(', ')}</span>
								{/if}
							</div>
						{/each}
					{/if}

					{#if combat.attack?.melee?.['full-attack']}
						<h4>Full Attack</h4>
						{#each combat.attack.melee['full-attack'] as atk}
							<div class="weapon-row">
								<span class="weapon-name">{atk[0]}</span>
								<span class="weapon-stat">{formatMod(Number(atk[1]))}</span>
								<span class="weapon-dmg">{atk[2]}</span>
								<span class="weapon-crit">{atk[3]}</span>
							</div>
						{/each}
					{/if}

					{#if combat.attack?.['full-two-weapon-attack']}
						<div class="inline-stat">
							<span class="label">Full TWF</span> {combat.attack['full-two-weapon-attack']}
						</div>
					{/if}

					{#if combat.attack?.ranged}
						<h4>Ranged</h4>
						{#each attackEntries(combat.attack.ranged) as [name, v]}
							{@const w = parseWeapon(v)}
							<div class="weapon-row">
								<span class="weapon-name">{formatKey(name)}</span>
								<span class="weapon-stat">{w.atk}</span>
								<span class="weapon-dmg">{w.damage}</span>
								<span class="weapon-crit">{w.crit}</span>
								{#if w.tags.length > 0}
									<span class="tags">{w.tags.join(', ')}</span>
								{/if}
							</div>
						{/each}
					{/if}

					{#if combat['special-attacks']}
						<h4>Special Attacks</h4>
						{#each Object.entries(combat['special-attacks']) as [name, v]}
							<div class="inline-stat">
								<span class="label">{formatKey(name)}</span>
								{Array.isArray(v) ? v.join(', ') : v}
							</div>
						{/each}
					{/if}
				</div>

				<!-- Defense -->
				<div class="subsection">
					<h3>Defense</h3>
					{#if viewNotes['combat-defense']}
						<div class="view-note">{viewNotes['combat-defense']}</div>
					{/if}
					<div class="inline-stat">
						<span class="label">Fort</span> {mod(combat.saves?.fortitude)}
						<span class="sep">|</span>
						<span class="label">Ref</span> {mod(combat.saves?.reflex)}
						<span class="sep">|</span>
						<span class="label">Will</span> {mod(combat.saves?.will)}
					</div>
					{#if combat.saves?.['will-vs-mental-acuity']}
						<div class="inline-stat">
							<span class="label">Will (Mental Acuity)</span> {mod(combat.saves['will-vs-mental-acuity'])}
							<span class="tags">{parseSumValue(combat.saves['will-vs-mental-acuity']).breakdown['3/day'] ?? '3/day'}</span>
						</div>
					{/if}
					{#if combat.defense?.acp}
						{@const acp = val(combat.defense.acp)}
						{#if acp !== '0'}
							<div class="inline-stat"><span class="label">ACP</span> {acp}</div>
						{/if}
					{/if}
					{#if combat.defense?.['spell-resistance']}
						<div class="inline-stat"><span class="label">SR</span> {combat.defense['spell-resistance']}</div>
					{/if}
					{#if defenseTraits.length > 0}
						<ul class="compact-list">
							{#each defenseTraits as trait}
								<li>{trait}</li>
							{/each}
						</ul>
					{/if}
				</div>
			</section>
		</div>

		<!-- === RIGHT: EXPLORATION & SOCIAL === -->
		<div class="col">
			<!-- Senses & Awareness -->
			<section>
				<h2>Senses & Awareness</h2>
				{#if viewNotes.senses}
					<div class="view-note">{viewNotes.senses}</div>
				{/if}
				{#if senses.length > 0}
					<div class="trait-line">{senses.join(' / ')}</div>
				{/if}
				<div class="skill-group">
					{#each skillRows([...categorized.detection, ...categorized.knowledge]) as s}
						<span class="skill-chip" class:boosted={s.boosted}><span class="skill-name">{s.name}</span> {s.total}</span>
					{/each}
				</div>
			</section>

			<!-- Movement & Exploration -->
			<section>
				<h2>Movement & Exploration</h2>
				{#if viewNotes.movement}
					<div class="view-note">{viewNotes.movement}</div>
				{/if}
				<div class="inline-stat">
					{#each Object.entries(movement).filter(([k]) => k !== 'capacity' && k !== 'load') as [key, v]}
						{@const p = parseSumValue(v)}
						<span class="label">{formatKey(key)}</span> {p.total}
						{#if key !== Object.entries(movement).filter(([k]) => k !== 'capacity' && k !== 'load').at(-1)?.[0]}
							<span class="sep">|</span>
						{/if}
					{/each}
				</div>
				{#if movement.load}
					<div class="inline-stat muted">
						<span class="label">Load</span> {val(movement.load)}
						{#if movement.capacity}
							<span class="sep">|</span>
							Lt {(movement.capacity as Record<string, unknown>).light} / Med {(movement.capacity as Record<string, unknown>).medium} / Hvy {(movement.capacity as Record<string, unknown>).heavy}
						{/if}
					</div>
				{/if}
				<div class="skill-group">
					{#each skillRows([...categorized.stealth, ...categorized.physical]) as s}
						<span class="skill-chip" class:boosted={s.boosted}><span class="skill-name">{s.name}</span> {s.total}</span>
					{/each}
				</div>
			</section>

			<!-- Social -->
			<section>
				<h2>Social</h2>
				{#if viewNotes.social}
					<div class="view-note">{viewNotes.social}</div>
				{/if}
				{#if special.languages}
					<div class="inline-stat">
						<span class="label">Languages</span> {special.languages.join(', ')}
					</div>
				{/if}
				<div class="skill-group">
					{#each skillRows(categorized.social) as s}
						<span class="skill-chip" class:boosted={s.boosted}><span class="skill-name">{s.name}</span> {s.total}</span>
					{/each}
				</div>
			</section>

			<!-- Practical Skills -->
			<section>
				<h2>Practical</h2>
				{#if viewNotes.practical}
					<div class="view-note">{viewNotes.practical}</div>
				{/if}
				<div class="skill-group">
					{#each skillRows([...categorized.practical, ...categorized.magic, ...categorized.other]) as s}
						<span class="skill-chip" class:boosted={s.boosted}><span class="skill-name">{s.name}</span> {s.total}</span>
					{/each}
				</div>
			</section>
		</div>
	</div>

	<!-- === MAGIC (full width, casters only) === -->
	{#if hasSpells(spells)}
		<section class="full-width">
			<h2>Magic</h2>
			{#if viewNotes.magic}
				<div class="view-note">{viewNotes.magic}</div>
			{/if}
			{#each spellSections(spells) as { key, section }}
				{#if spellSections(spells).length > 1}
					<h3>{formatKey(key)}</h3>
				{/if}
				<div class="spell-header">
					{#if section['caster-level']}
						<span><span class="label">CL</span> {section['caster-level']}</span>
					{/if}
					{#if section['key-ability']}
						<span><span class="label">Key</span> {formatKey(section['key-ability'])}</span>
					{/if}
					{#if section.domains}
						<span><span class="label">Domains</span> {Array.isArray(section.domains) ? section.domains.join(', ') : section.domains}</span>
					{/if}
					{#if section.ranges}
						<span><span class="label">Ranges</span> {Object.entries(section.ranges).map(([k, v]) => `${formatKey(k)}: ${v}`).join(', ')}</span>
					{/if}
				</div>
				{#if section['spells-per-day']}
					<div class="spell-slots">
						<span class="label">Slots</span>
						{#each Object.entries(section['spells-per-day']) as [lv, count], i}
							{#if i > 0}<span class="slot-sep">|</span>{/if}
							<span class="slot"><span class="slot-lv">{lv}:</span>{count}</span>
						{/each}
					</div>
				{/if}
				{#if section['save-dc']}
					<div class="spell-slots">
						<span class="label">DC</span>
						{#each Object.entries(section['save-dc']) as [lv, dc], i}
							{#if i > 0}<span class="slot-sep">|</span>{/if}
							<span class="slot"><span class="slot-lv">{lv}:</span>{dc}</span>
						{/each}
					</div>
				{/if}
				{#if section['spells-prepared']}
					<h4>Prepared</h4>
					{#each spellList(section['spells-prepared']) as [level, names]}
						<div class="spell-row">
							<span class="spell-lv">{level}</span>
							<span>{names.join(', ')}</span>
						</div>
					{/each}
				{/if}
				{#if section.spellbook}
					<h4>Spellbook</h4>
					{#each spellList(section.spellbook) as [level, names]}
						<div class="spell-row">
							<span class="spell-lv">{level}</span>
							<span>{names.join(', ')}</span>
						</div>
					{/each}
				{/if}
				{#if section['spells-known']}
					<h4>Spells Known</h4>
					{#each spellList(section['spells-known']) as [level, names]}
						<div class="spell-row">
							<span class="spell-lv">{level}</span>
							<span>{names.join(', ')}</span>
						</div>
					{/each}
				{/if}
			{/each}
			{#if spells['special-spells']}
				<h4>Special Spells</h4>
				{#each spells['special-spells'] as sp}
					<div class="inline-stat">
						<span class="label">{sp.spell}</span> Lv {sp.level}
						{#if sp.source} <span class="tags">({sp.source})</span>{/if}
					</div>
				{/each}
			{/if}
			{#if categorized.magic.length > 0}
				<div class="skill-group" style="margin-top: 0.5rem">
					{#each skillRows(categorized.magic) as s}
						<span class="skill-chip" class:boosted={s.boosted}><span class="skill-name">{s.name}</span> {s.total}</span>
					{/each}
				</div>
			{/if}
		</section>
	{/if}

	<!-- === SPECIAL ABILITIES === -->
	<section class="full-width">
		<h2>Special Abilities</h2>
		<div class="columns three-col">
			{#if special.feats}
				<div>
					<h3>Feats</h3>
					<ul class="compact-list">
						{#each special.feats as feat}
							<li>{feat[0]}</li>
						{/each}
					</ul>
				</div>
			{/if}
			{#if special['class-abilities'] || otherRacial.length > 0}
				<div>
					{#if otherRacial.length > 0}
						<h3>Racial</h3>
						<ul class="compact-list">
							{#each otherRacial as trait}
								<li>{trait}</li>
							{/each}
						</ul>
					{/if}
					{#if special['class-abilities']}
						<h3>Class Abilities</h3>
						{#each Object.entries(special['class-abilities']) as [cls, abilities]}
							<h4>{formatKey(cls)}</h4>
							{#if Array.isArray(abilities)}
								<ul class="compact-list">
									{#each abilities as ab}
										<li>{ab}</li>
									{/each}
								</ul>
							{/if}
						{/each}
					{/if}
				</div>
			{/if}
			<div>
				{#if special.proficiencies}
					<h3>Proficiencies</h3>
					<p class="compact">{special.proficiencies.join(', ')}</p>
				{/if}
			</div>
		</div>
	</section>

	<!-- === EQUIPMENT === -->
	<section class="full-width">
		<h2>Equipment</h2>
		{#if viewNotes.equipment}
			<div class="view-note">{viewNotes.equipment}</div>
		{/if}
		{#if inventory.money}
			<div class="inline-stat">
				<span class="label">Money</span> {inventory.money._total}
			</div>
		{/if}
		{#each inventoryLocations(inventory) as location}
			{@const items = inventoryItems(inventory, location)}
			{#if items.length > 0}
				<h3>{formatKey(location)}</h3>
				<table class="inv-table">
					<thead>
						<tr>
							<th>Item</th>
							<th>Qty</th>
							<th>Wt</th>
							<th>Notes</th>
						</tr>
					</thead>
					<tbody>
						{#each items as item}
							<tr>
								<td class="item-name">{item[0] ?? ''}</td>
								<td class="centered">{item[1] ?? ''}</td>
								<td class="right">{item[3] ?? ''}</td>
								<td class="notes-cell">
									{#if item[5] && typeof item[5] === 'object' && !Array.isArray(item[5])}
										{Object.entries(item[5])
											.filter(([k]) => !['damage', 'crit'].includes(k))
											.map(([k, v]) => `${k}: ${v}`)
											.join(', ')}
									{/if}
									{#if Array.isArray(item[6])}
										{#if item[5] && typeof item[5] === 'object'} | {/if}
										{item[6].join(', ')}
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		{/each}
	</section>

	<!-- === NOTES === -->
	{#if Object.keys(notes).length > 0}
		<section class="full-width">
			<h2>Notes</h2>
			{#each Object.entries(notes) as [key, v]}
				<div class="inline-stat">
					<span class="label">{formatKey(key)}</span> {v}
				</div>
			{/each}
		</section>
	{/if}
</div>

<style>
	/* === LAYOUT === */
	.sheet {
		max-width: 1100px;
		margin: 0 auto;
		font-size: 0.88rem;
		line-height: 1.35;
		color: #222;
	}

	/* === HEADER BAR === */
	.header-bar {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		border-bottom: 3px solid #333;
		padding-bottom: 0.5rem;
		margin-bottom: 0.75rem;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.identity h1 {
		margin: 0;
		font-size: 1.6rem;
		line-height: 1.1;
	}
	.tagline {
		display: flex;
		gap: 0.75rem;
		color: #555;
		font-size: 0.85rem;
		flex-wrap: wrap;
	}
	.align-badge {
		font-weight: 600;
	}
	.vital-stats {
		display: flex;
		gap: 1.25rem;
		flex-wrap: wrap;
	}
	.vital {
		text-align: center;
		min-width: 3.5rem;
	}
	.vital-label {
		display: block;
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #888;
		font-weight: 600;
	}
	.vital-value {
		font-size: 1.4rem;
		font-weight: 700;
		line-height: 1.1;
	}
	.vital-value.damaged {
		color: #c33;
	}
	.vital-max {
		font-size: 0.8rem;
		font-weight: 400;
		color: #888;
	}
	.vital-sub {
		display: block;
		font-size: 0.7rem;
		color: #888;
	}

	/* === ABILITY BAR === */
	.ability-bar {
		display: flex;
		gap: 0.35rem;
		margin-bottom: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
	}
	.ability-chip {
		display: flex;
		align-items: baseline;
		gap: 0.25rem;
		padding: 0.2rem 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.82rem;
	}
	.ability-label {
		font-weight: 700;
		font-size: 0.7rem;
		color: #666;
	}
	.ability-score {
		font-weight: 600;
	}
	.ability-mod {
		color: #888;
		font-size: 0.75rem;
	}

	/* === COLUMNS === */
	.columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.three-col {
		grid-template-columns: 1fr 1fr 1fr;
	}

	/* === SECTIONS === */
	section {
		margin-bottom: 0.75rem;
	}
	.full-width {
		margin-top: 0.5rem;
	}
	h2 {
		font-size: 1rem;
		border-bottom: 1px solid #aaa;
		padding-bottom: 0.15rem;
		margin: 0 0 0.4rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #444;
	}
	h3 {
		font-size: 0.88rem;
		margin: 0.5rem 0 0.2rem;
		color: #555;
	}
	h4 {
		font-size: 0.8rem;
		margin: 0.35rem 0 0.15rem;
		color: #666;
	}
	.subsection {
		margin-bottom: 0.5rem;
	}

	/* === INLINE STATS === */
	.inline-stat {
		margin: 0.1rem 0;
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
		align-items: baseline;
	}
	.label {
		font-weight: 600;
		white-space: nowrap;
	}
	.sep {
		color: #ccc;
	}
	.muted {
		color: #888;
		font-size: 0.8rem;
	}
	.tags {
		font-size: 0.75rem;
		color: #999;
		font-style: italic;
	}
	.view-note {
		font-size: 0.8rem;
		color: #6a4c00;
		background: #fef9e7;
		border-left: 3px solid #d4a017;
		padding: 0.2rem 0.5rem;
		margin: 0.2rem 0 0.35rem;
		line-height: 1.3;
	}
	.trait-line {
		font-size: 0.82rem;
		margin-bottom: 0.35rem;
		color: #555;
	}

	/* === WEAPON ROWS === */
	.weapon-row {
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
		margin: 0.1rem 0;
		font-size: 0.84rem;
	}
	.weapon-name {
		font-weight: 600;
		min-width: 10rem;
		flex-shrink: 0;
	}
	.weapon-stat,
	.weapon-dmg,
	.weapon-crit {
		font-family: monospace;
		font-size: 0.82rem;
	}
	.weapon-stat::after,
	.weapon-dmg::after {
		content: '|';
		margin-left: 0.5rem;
		color: #ddd;
	}

	/* === SKILL CHIPS === */
	.skill-group {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin: 0.25rem 0;
	}
	.skill-chip {
		display: inline-flex;
		gap: 0.25rem;
		padding: 0.15rem 0.4rem;
		background: #f5f5f5;
		border: 1px solid #e0e0e0;
		border-radius: 3px;
		font-size: 0.8rem;
	}
	.skill-chip.boosted {
		font-weight: 700;
		border-color: #999;
	}
	.skill-name {
		font-weight: inherit;
	}

	/* === SPELL SECTIONS === */
	.spell-header {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
		font-size: 0.82rem;
		margin-bottom: 0.25rem;
	}
	.spell-slots {
		display: flex;
		gap: 0.25rem;
		align-items: baseline;
		margin: 0.15rem 0;
		font-size: 0.82rem;
		flex-wrap: wrap;
	}
	.slot {
		font-family: monospace;
	}
	.slot-lv {
		font-weight: 600;
		margin-right: 0.15rem;
	}
	.slot-sep {
		color: #ddd;
	}
	.spell-row {
		display: flex;
		gap: 0.5rem;
		margin: 0.1rem 0;
		font-size: 0.82rem;
	}
	.spell-lv {
		font-weight: 700;
		min-width: 1.5rem;
		color: #666;
	}

	/* === LISTS === */
	.compact-list {
		margin: 0.15rem 0;
		padding-left: 1.1rem;
		font-size: 0.82rem;
	}
	.compact-list li {
		margin: 0.05rem 0;
	}
	.compact {
		margin: 0.15rem 0;
		font-size: 0.82rem;
	}
	ul {
		margin: 0.15rem 0;
		padding-left: 1.1rem;
	}
	p {
		margin: 0.15rem 0;
	}

	/* === INVENTORY TABLE === */
	.inv-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.78rem;
		margin: 0.15rem 0;
	}
	.inv-table th,
	.inv-table td {
		padding: 0.12rem 0.3rem;
		text-align: left;
		border-bottom: 1px solid #eee;
	}
	.inv-table th {
		font-weight: 600;
		font-size: 0.7rem;
		text-transform: uppercase;
		color: #888;
		border-bottom: 1px solid #ccc;
	}
	.item-name {
		font-weight: 500;
	}
	.centered {
		text-align: center;
	}
	.right {
		text-align: right;
	}
	.notes-cell {
		color: #888;
		font-size: 0.75rem;
	}

	/* === PRINT === */
	@media print {
		.sheet {
			max-width: none;
			font-size: 8pt;
		}
		.header-bar {
			border-bottom-width: 2px;
		}
		.vital-value {
			font-size: 12pt;
		}
		.ability-chip {
			border-color: #ccc;
		}
		.skill-chip {
			background: none;
			border-color: #ccc;
		}
		h2 {
			font-size: 9pt;
		}
		table {
			font-size: 7pt;
		}
		.columns {
			gap: 0.75rem;
		}
		section {
			break-inside: avoid;
		}
		@page {
			margin: 0.4in;
			size: letter;
		}
	}
</style>
