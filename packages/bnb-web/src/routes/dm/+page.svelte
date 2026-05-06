<script lang="ts">
	import { formatKey, parseSumValue, formatMod } from '$lib/format';
	import { getSkillAbility } from '$lib/skillCategories';
	import InventorySpreadsheet from '$lib/components/InventorySpreadsheet.svelte';
	import { extractAllInventoryItems, getInventorySummary } from '$lib/inventory';

	let { data } = $props();
	const chars = $derived(data.characters);
	const dmMetadata = $derived(data.dmMetadata);

	type Tab = 'overview' | 'skills' | 'combat' | 'social' | 'languages' | 'spells' | 'inventory';
	let activeTab: Tab = $state('overview');

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function v(val: unknown): string {
		return parseSumValue(val).total;
	}
	function m(val: unknown): string {
		return formatMod(Number(parseSumValue(val).total));
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function charName(c: Record<string, any>): string {
		return c.description?.name ?? 'Unknown';
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function charPlayer(c: Record<string, any>): string {
		return c.description?.player ?? '';
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function getAbilityMods(c: Record<string, any>): Record<string, number> {
		const abilities = c.abilities ?? {};
		return Object.fromEntries(
			Object.entries(abilities).map(([name, val]) => {
				if (Array.isArray(val) && val.length > 1 && typeof val[1] === 'object' && val[1] !== null) {
					return [name, Number(Object.values(val[1])[0]) || 0];
				}
				return [name, 0];
			})
		);
	}

	/** Collect all unique skill keys across all characters */
	const allSkillKeys = $derived(() => {
		const keys = new Set<string>();
		for (const { character: c } of chars) {
			const skills = c.skills ?? {};
			for (const k of Object.keys(skills)) {
				if (!k.startsWith('_')) keys.add(k);
			}
		}
		return [...keys].sort();
	});

	/** Get skill total for a character, returns null if untrained */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function getSkillTotal(c: Record<string, any>, skillKey: string): number {
		const skills = c.skills ?? {};
		if (skills[skillKey]) {
			return Number(v(skills[skillKey]));
		}
		// Fall back to bare ability mod
		const ability = getSkillAbility(skillKey);
		const mods = getAbilityMods(c);
		return mods[ability] ?? 0;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function hasExplicitSkill(c: Record<string, any>, skillKey: string): boolean {
		return skillKey in (c.skills ?? {});
	}

	/** Find the best value in a column and return which chars have it */
	function bestInColumn(values: number[]): Set<number> {
		const max = Math.max(...values);
		const indices = new Set<number>();
		values.forEach((v, i) => { if (v === max) indices.add(i); });
		return indices;
	}

	/** Collect all languages across all characters */
	const allLanguages = $derived(() => {
		const langMap = new Map<string, string[]>();
		for (const { character: c } of chars) {
			const langs = c.special?.languages ?? [];
			const name = charName(c);
			for (const lang of langs) {
				const l = String(lang);
				if (!langMap.has(l)) langMap.set(l, []);
				langMap.get(l)!.push(name);
			}
		}
		return [...langMap.entries()].sort(([a], [b]) => a.localeCompare(b));
	});

	// Pre-compute overview "best" highlights
	const overviewBests = $derived(() => {
		const extractors: [string, (c: Record<string, unknown>) => number][] = [
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			['hp', (c: any) => Number(v(c.levels?.hp))],
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			['ac', (c: any) => Number(v(c.combat?.defense?.ac))],
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			['init', (c: any) => Number(v(c.combat?.initiative))],
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			['fort', (c: any) => Number(v(c.combat?.saves?.fortitude))],
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			['ref', (c: any) => Number(v(c.combat?.saves?.reflex))],
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			['will', (c: any) => Number(v(c.combat?.saves?.will))]
		];
		const result: Record<string, Set<number>> = {};
		for (const [key, fn] of extractors) {
			const vals = chars.map(({ character: c }) => fn(c));
			result[key] = bestInColumn(vals);
		}
		return result;
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function getSpellSections(sp: Record<string, any>): { key: string; section: Record<string, any> }[] {
		if (sp['caster-class'] || sp['caster-level'] || sp['spells-per-day']) {
			return [{ key: 'spells', section: sp }];
		}
		const sections = Object.entries(sp)
			.filter(([k, v]) => v && typeof v === 'object' && !Array.isArray(v) && k !== 'special-spells')
			.map(([k, v]) => ({ key: k, section: v as Record<string, unknown> }));
		return sections.length > 0 ? sections : [];
	}

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'skills', label: 'Skills' },
		{ id: 'combat', label: 'Combat' },
		{ id: 'social', label: 'Social' },
		{ id: 'languages', label: 'Languages' },
		{ id: 'spells', label: 'Spells' },
		{ id: 'inventory', label: 'Inventory' }
	];
</script>

<svelte:head>
	<title>DM View - Beefbrain</title>
</svelte:head>

<div class="dm-view">
	<div class="dm-header no-print">
		<a href="/" class="back-link">&larr; Characters</a>
		<h1>DM View</h1>
		<button class="print-btn" onclick={() => window.print()}>Print</button>
	</div>

	<nav class="tabs no-print">
		{#each tabs as tab}
			<button class:active={activeTab === tab.id} onclick={() => (activeTab = tab.id)}>
				{tab.label}
			</button>
		{/each}
	</nav>

	<!-- === OVERVIEW TAB === -->
	{#if activeTab === 'overview'}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Character</th>
						<th>Player</th>
						<th>Race</th>
						<th>HP</th>
						<th>AC</th>
						<th>Init</th>
						<th>Speed</th>
						<th>Fort</th>
						<th>Ref</th>
						<th>Will</th>
						<th>STR</th>
						<th>DEX</th>
						<th>CON</th>
						<th>INT</th>
						<th>WIS</th>
						<th>CHA</th>
					</tr>
				</thead>
				<tbody>
					{#each chars as { character: c, slug }, i}
						<tr>
							<td class="name-cell"><a href="/characters/{slug}">{charName(c)}</a></td>
							<td>{charPlayer(c)}</td>
							<td>{c.description?.race ?? ''}</td>
							<td class="num" class:best={overviewBests().hp.has(i)}>
								{v(c.levels?.hp)}<span class="sub">/{parseSumValue(c.levels?.hp).breakdown['max-hp'] ?? v(c.levels?.hp)}</span>
							</td>
							<td class="num" class:best={overviewBests().ac.has(i)}>{v(c.combat?.defense?.ac)}</td>
							<td class="num" class:best={overviewBests().init.has(i)}>{m(c.combat?.initiative)}</td>
							<td class="num">{v(c.movement?.speed)}</td>
							<td class="num" class:best={overviewBests().fort.has(i)}>{m(c.combat?.saves?.fortitude)}</td>
							<td class="num" class:best={overviewBests().ref.has(i)}>{m(c.combat?.saves?.reflex)}</td>
							<td class="num" class:best={overviewBests().will.has(i)}>{m(c.combat?.saves?.will)}</td>
							{#each ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as ab}
								<td class="num">{v(c.abilities?.[ab])}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- === SKILLS TAB === -->
	{#if activeTab === 'skills'}
		{@const keys = allSkillKeys()}
		<div class="table-wrap">
			<table class="skill-compare">
				<thead>
					<tr>
						<th class="sticky-col">Skill</th>
						{#each chars as { character: c }}
							<th>{charName(c)}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each keys as skillKey}
						{@const totals = chars.map(({ character: c }) => getSkillTotal(c, skillKey))}
						{@const best = bestInColumn(totals)}
						<tr>
							<td class="sticky-col skill-label">{formatKey(skillKey)}</td>
							{#each chars as { character: c }, i}
								{@const total = totals[i]}
								{@const explicit = hasExplicitSkill(c, skillKey)}
								<td class="num" class:best={best.has(i)} class:explicit={explicit} class:bare={!explicit}>
									{formatMod(total)}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- === COMBAT TAB === -->
	{#if activeTab === 'combat'}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Character</th>
						<th>AC</th>
						<th>Touch</th>
						<th>FF</th>
						<th>Fort</th>
						<th>Ref</th>
						<th>Will</th>
						<th>BAB</th>
						<th>Grapple</th>
						<th>Init</th>
						<th>HP</th>
					</tr>
				</thead>
				<tbody>
					{#each chars as { character: c, slug }}
						<tr>
							<td class="name-cell"><a href="/characters/{slug}">{charName(c)}</a></td>
							<td class="num">{v(c.combat?.defense?.ac)}</td>
							<td class="num">{v(c.combat?.defense?.['touch-ac'])}</td>
							<td class="num">{v(c.combat?.defense?.['flat-footed-ac'])}</td>
							<td class="num">{m(c.combat?.saves?.fortitude)}</td>
							<td class="num">{m(c.combat?.saves?.reflex)}</td>
							<td class="num">{m(c.combat?.saves?.will)}</td>
							<td class="num">{m(c.combat?.attack?.bab)}</td>
							<td class="num">{m(c.combat?.attack?.grapple)}</td>
							<td class="num">{m(c.combat?.initiative)}</td>
							<td class="num">{v(c.levels?.hp)}/{parseSumValue(c.levels?.hp).breakdown['max-hp'] ?? v(c.levels?.hp)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Weapons per character -->
		{#each chars as { character: c }}
			{@const melee = c.combat?.attack?.melee ?? {}}
			{@const ranged = c.combat?.attack?.ranged ?? {}}
			{@const weapons = [...Object.entries(melee), ...Object.entries(ranged)].filter(([k]) => !k.startsWith('_') && k !== 'full-attack')}
			{#if weapons.length > 0}
				<h3>{charName(c)}</h3>
				<div class="weapon-list">
					{#each weapons as [name, val]}
						{@const arr = Array.isArray(val) ? val : []}
						<span class="weapon-chip">
							<strong>{formatKey(name)}</strong>
							{#if arr.length >= 3}
								{formatMod(Number(arr[0]))} | {arr[1]} | {arr[2]}
							{/if}
						</span>
					{/each}
				</div>
			{/if}
		{/each}
	{/if}

	<!-- === SOCIAL TAB === -->
	{#if activeTab === 'social'}
		{@const socialSkillKeys = ['bluff', 'diplomacy', 'disguise', 'gather-information', 'handle-animal', 'intimidate', 'sense-motive']}
		<div class="table-wrap">
			<table class="skill-compare">
				<thead>
					<tr>
						<th class="sticky-col">Skill</th>
						{#each chars as { character: c }}
							<th>{charName(c)}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each socialSkillKeys as skillKey}
						{@const totals = chars.map(({ character: c }) => getSkillTotal(c, skillKey))}
						{@const best = bestInColumn(totals)}
						<tr>
							<td class="sticky-col skill-label">{formatKey(skillKey)}</td>
							{#each chars as { character: c }, i}
								{@const total = totals[i]}
								{@const explicit = hasExplicitSkill(c, skillKey)}
								<td class="num" class:best={best.has(i)} class:explicit={explicit} class:bare={!explicit}>
									{formatMod(total)}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Perform skills (some characters have these) -->
		{@const performKeys = allSkillKeys().filter((k: string) => k.startsWith('perform'))}
		{#if performKeys.length > 0}
			<h3>Perform</h3>
			<div class="table-wrap">
				<table class="skill-compare">
					<thead>
						<tr>
							<th class="sticky-col">Skill</th>
							{#each chars as { character: c }}
								<th>{charName(c)}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each performKeys as skillKey}
							{@const totals = chars.map(({ character: c }) => getSkillTotal(c, skillKey))}
							{@const best = bestInColumn(totals)}
							<tr>
								<td class="sticky-col skill-label">{formatKey(skillKey)}</td>
								{#each chars as { character: c }, i}
									{@const total = totals[i]}
									<td class="num" class:best={best.has(i)}>
										{formatMod(total)}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}

	<!-- === LANGUAGES TAB === -->
	{#if activeTab === 'languages'}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Language</th>
						{#each chars as { character: c }}
							<th>{charName(c)}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each allLanguages() as [lang, speakers]}
						<tr>
							<td class="skill-label">{lang}</td>
							{#each chars as { character: c }}
								{@const knows = (c.special?.languages ?? []).map(String).includes(lang)}
								<td class="num" class:knows>{#if knows}Yes{/if}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- === SPELLS TAB === -->
	{#if activeTab === 'spells'}
		{#each chars as { character: c }}
			{@const sp = c.spells ?? {}}
			{#if Object.keys(sp).length > 0}
				<section class="spell-section">
					<h3>{charName(c)}</h3>
					{#each getSpellSections(sp) as { key, section }}
						{#if getSpellSections(sp).length > 1}
							<h4>{formatKey(key)}</h4>
						{/if}
						<div class="spell-meta">
							{#if section['caster-level']}<span>CL {section['caster-level']}</span>{/if}
							{#if section['spells-per-day']}
								<span>Slots: {Object.entries(section['spells-per-day']).map(([k, v]) => `${k}:${v}`).join(' | ')}</span>
							{/if}
							{#if section['save-dc']}
								<span>DC: {Object.entries(section['save-dc']).map(([k, v]) => `${k}:${v}`).join(' | ')}</span>
							{/if}
						</div>
						{#if section['spells-prepared']}
							<div class="spell-list-block">
								<strong>Prepared:</strong>
								{#each Object.entries(section['spells-prepared']).sort(([a], [b]) => Number(a) - Number(b)) as [lv, spells]}
									<div class="spell-lv-row"><span class="lv">{lv}:</span> {Array.isArray(spells) ? spells.join(', ') : spells}</div>
								{/each}
							</div>
						{/if}
						{#if section['spells-known']}
							<div class="spell-list-block">
								<strong>Known:</strong>
								{#each Object.entries(section['spells-known']).sort(([a], [b]) => Number(a) - Number(b)) as [lv, spells]}
									<div class="spell-lv-row"><span class="lv">{lv}:</span> {Array.isArray(spells) ? spells.join(', ') : spells}</div>
								{/each}
							</div>
						{/if}
						{#if section.spellbook}
							<div class="spell-list-block">
								<strong>Spellbook:</strong>
								{#each Object.entries(section.spellbook).sort(([a], [b]) => Number(a) - Number(b)) as [lv, spells]}
									<div class="spell-lv-row"><span class="lv">{lv}:</span> {Array.isArray(spells) ? spells.join(', ') : spells}</div>
								{/each}
							</div>
						{/if}
					{/each}
					{#if Array.isArray(sp.ranger)}
						<div class="spell-list-block">
							<strong>Ranger:</strong> {sp.ranger.join(', ')}
						</div>
					{/if}
				</section>
			{/if}
		{/each}
	{/if}

	<!-- === INVENTORY TAB === -->
	{#if activeTab === 'inventory'}
		{@const allItems = extractAllInventoryItems(chars, dmMetadata)}
		{@const summary = getInventorySummary(allItems)}
		<InventorySpreadsheet items={allItems} {summary} />
	{/if}
</div>

<style>
	.dm-view {
		max-width: 1400px;
		margin: 0 auto;
		font-size: 0.85rem;
	}
	.dm-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}
	.dm-header h1 {
		margin: 0;
		font-size: 1.4rem;
	}
	.back-link {
		color: #555;
		text-decoration: none;
		font-size: 0.9rem;
	}
	.print-btn {
		margin-left: auto;
		padding: 0.3rem 0.75rem;
		background: #333;
		color: #fff;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.82rem;
	}

	/* Tabs */
	.tabs {
		display: flex;
		gap: 0;
		border-bottom: 2px solid #333;
		margin-bottom: 1rem;
	}
	.tabs button {
		padding: 0.4rem 1rem;
		border: none;
		background: none;
		cursor: pointer;
		font-size: 0.85rem;
		color: #666;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
	}
	.tabs button.active {
		color: #222;
		font-weight: 600;
		border-bottom-color: #333;
	}

	/* Tables */
	.table-wrap {
		overflow-x: auto;
		margin-bottom: 1rem;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.82rem;
		white-space: nowrap;
	}
	th, td {
		padding: 0.25rem 0.5rem;
		text-align: left;
		border-bottom: 1px solid #e0e0e0;
	}
	th {
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		color: #666;
		border-bottom: 2px solid #ccc;
		position: sticky;
		top: 0;
		background: #fafafa;
	}
	.num {
		text-align: center;
		font-family: monospace;
		font-size: 0.82rem;
	}
	.best {
		font-weight: 700;
		background: #e8f5e9;
	}
	.bare {
		color: #bbb;
	}
	.explicit {
		color: #222;
	}
	.knows {
		background: #e3f2fd;
		font-weight: 600;
		color: #1565c0;
	}
	.sub {
		color: #999;
		font-size: 0.75rem;
	}
	.name-cell {
		font-weight: 600;
	}
	.name-cell a {
		color: inherit;
		text-decoration: none;
	}
	.name-cell a:hover {
		text-decoration: underline;
	}
	.skill-label {
		font-weight: 500;
		min-width: 8rem;
	}
	.sticky-col {
		position: sticky;
		left: 0;
		background: #fafafa;
		z-index: 1;
	}

	/* Skill compare table */
	.skill-compare th:first-child,
	.skill-compare td:first-child {
		min-width: 10rem;
	}

	/* Combat weapons */
	h3 {
		font-size: 0.95rem;
		margin: 0.75rem 0 0.3rem;
		color: #444;
	}
	h4 {
		font-size: 0.85rem;
		margin: 0.5rem 0 0.2rem;
		color: #555;
	}
	.weapon-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-bottom: 0.5rem;
	}
	.weapon-chip {
		padding: 0.15rem 0.5rem;
		background: #f5f5f5;
		border: 1px solid #e0e0e0;
		border-radius: 3px;
		font-size: 0.8rem;
		font-family: monospace;
	}

	/* Spells */
	.spell-section {
		margin-bottom: 1.25rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e0e0e0;
	}
	.spell-meta {
		display: flex;
		gap: 1.5rem;
		font-size: 0.82rem;
		color: #555;
		margin-bottom: 0.25rem;
		flex-wrap: wrap;
	}
	.spell-list-block {
		margin: 0.25rem 0;
		font-size: 0.82rem;
	}
	.spell-lv-row {
		margin-left: 1rem;
	}
	.lv {
		font-weight: 700;
		color: #666;
		display: inline-block;
		min-width: 1.5rem;
	}

	/* Print */
	@media print {
		:global(.no-print) {
			display: none !important;
		}
		.dm-view {
			max-width: none;
			font-size: 7.5pt;
		}
		table {
			font-size: 7pt;
		}
		th {
			position: static;
		}
		.sticky-col {
			position: static;
		}
		@page {
			margin: 0.4in;
			size: landscape;
		}
	}
</style>
