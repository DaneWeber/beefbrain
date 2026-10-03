import { EMOJI_OFF, EMOJI_ON, SHEET_PREAMBLE } from './sheetPreamble'

export const DND35_DETAILED_TEMPLATE =
  SHEET_PREAMBLE +
  String.raw`\begin{document}
\fontsize{\bodysize}{\bodyleading}\selectfont

\begin{multicols*}{2}
\raggedcolumns
% The left column is one block, so it never runs into the skills column: a
% character with many optional rows (Andy's armor and items under Defense)
% gets it scaled down to fit, laid out wider first as the skills are.
\fitblock{\textheight}{%
\begin{sheetblock}{Init}
\begin{tabular}{L{0.30\linewidth}R{0.12\linewidth}Q{0.51\linewidth}}
\statrow{stopwatch}{Initiative}{ {{combat.initiative}} }{ {{combat.initiative.sources}} }
\end{tabular}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Abilities}
\begin{tabular}{L{0.20\linewidth}R{0.12\linewidth}R{0.12\linewidth}Q{0.46\linewidth}}
\abilityrow{ox}{STR}{ {{abilities.strength.score}} }{ {{abilities.strength.mod}} }{ {{abilities.strength.sources}} }
\abilityrow{cat}{DEX}{ {{abilities.dexterity.score}} }{ {{abilities.dexterity.mod}} }{ {{abilities.dexterity.sources}} }
\abilityrow{bear}{CON}{ {{abilities.constitution.score}} }{ {{abilities.constitution.mod}} }{ {{abilities.constitution.sources}} }
\abilityrow{fox}{INT}{ {{abilities.intelligence.score}} }{ {{abilities.intelligence.mod}} }{ {{abilities.intelligence.sources}} }
\abilityrow{owl}{WIS}{ {{abilities.wisdom.score}} }{ {{abilities.wisdom.mod}} }{ {{abilities.wisdom.sources}} }
\abilityrow{eagle}{CHA}{ {{abilities.charisma.score}} }{ {{abilities.charisma.mod}} }{ {{abilities.charisma.sources}} }
\end{tabular}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Saves}
\begin{tabular}{L{0.30\linewidth}R{0.12\linewidth}Q{0.51\linewidth}}
\statrow{nauseated-face}{Fortitude}{ {{saves.fortitude}} }{ {{saves.fortitude.sources}} }
\statrow{face-with-open-mouth}{Reflex}{ {{saves.reflex}} }{ {{saves.reflex.sources}} }
\statrow{smiling-face-with-heart-eyes}{Will}{ {{saves.will}} }{ {{saves.will.sources}} }
{{{saves.specialRows}}}
\end{tabular}
{{{saves.notes}}}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Defense}
\begin{tabular}{L{0.30\linewidth}R{0.12\linewidth}Q{0.51\linewidth}}
\statrow{red-heart}{HP}{ {{combat.hp}} }{ {{combat.hp.sources}} }
\statrow{game-die}{Hit Dice}{ {{combat.hd}} }{ {{combat.hd.sources}} }
\statrow{shield}{AC}{ {{combat.ac}} }{ {{combat.ac.sources}} }
\statrow{raised-hand}{Touch AC}{ {{combat.touchAc}} }{ {{combat.touchAc.sources}} }
\statrow{astonished-face}{Flat-Footed AC}{ {{combat.flatFootedAc}} }{ {{combat.flatFootedAc.sources}} }
\statrow{anchor}{Max Dex}{ {{combat.maxDex}} }{ {{combat.maxDex.sources}} }
{{{combat.defenseSpecialRows}}}
\end{tabular}
{{{combat.defenseNotes}}}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Movement}
\begin{tabular}{L{0.30\linewidth}R{0.12\linewidth}Q{0.51\linewidth}}
\statrow{person-walking}{Speed}{ {{movement.speed}} }{ {{movement.speed.sources}} }
\statrow{person-running}{Run}{ {{movement.run}} }{ {{movement.run.sources}} }
{{{movement.specialRows}}}
\end{tabular}
{{{movement.notes}}}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Awareness}
\begin{tabular}{L{0.30\linewidth}N{0.63\linewidth}}
{{{character.awarenessTable}}}
\end{tabular}
{{{character.awarenessNotes}}}
\end{sheetblock}}

\columnbreak

% The whole skills list stays in the right column: at natural size when it
% fits, scaled down when a character has more skills than one column holds,
% laid out wider first so it still fills the column's width.
\fitblock{\textheight}{%
\begin{sheetblock}{Skills}
\begin{tabular}{K}
% The header is set small: it only names the columns.
\footnotesize Skill & \footnotesize Bonus & \footnotesize w/o AC Penalty & \multicolumn{1}{L{\wsource}}{\footnotesize Sources} \\
{{{skills.detailedTable}}}
\end{tabular}
\end{sheetblock}}
\end{multicols*}

\newpage
\renewcommand{\sheettitle}{Actions}

% What the character can do on a turn: attacks, and what they can bring to
% one. The page flows, so a character with more than two columns hold
% continues on a second Actions page.
\begin{multicols}{2}
\raggedcolumns
\setstackwidths
\begin{sheetblock}{Attack}
\begin{tabular}{L{0.27\linewidth}R{0.18\linewidth}Q{0.48\linewidth}}
\statrow{bullseye}{BAB}{ {{combat.bab}} }{ {{combat.bab.sources}} }
\statrow{dagger}{Melee}{ {{combat.melee}} }{ {{combat.melee.sources}} }
{{{combat.rangedRow}}}
\statrow{people-wrestling}{Grapple}{ {{combat.grapple}} }{ {{combat.grapple.sources}} }
{{{actions.specialAttackRows}}}
\end{tabular}
{{{actions.attackNotes}}}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Melee}
\begin{tabular}{L{0.29\linewidth}R{0.11\linewidth}L{0.17\linewidth}C{0.12\linewidth}Q{0.19\linewidth}}
\footnotesize Weapon & \footnotesize Atk & \footnotesize Damage & Crit & \multicolumn{1}{L{0.19\linewidth}}{\footnotesize Sources} \\
{{{actions.meleeTable}}}
\end{tabular}
\end{sheetblock}
{{{actions.rangedBlock}}}
\blockrule
\begin{sheetblock}{Ammunition}
\begin{tabular}{L{0.50\linewidth}R{0.10\linewidth}L{0.33\linewidth}}
{{{actions.ammoTable}}}
\end{tabular}
\end{sheetblock}
{{{actions.fullAttackBlock}}}
\blockrule
\fitblock{\textheight}{%
\begin{sheetblock}{Attack Options}
\stackopen
{{{actions.attackOptionsTable}}}
\end{sheetblock}}
{{{actions.conditionalsBlock}}}
{{{actions.spellLikeBlock}}}
\end{multicols}

\newpage
\renewcommand{\sheettitle}{Build}

% Who the character is and how they got here: what changes between
% sessions, if at all, rather than during one. The page flows, so a
% character with many feats and abilities continues on a second Build page.
\begin{multicols}{2}
\raggedcolumns
\setstackwidths
\begin{sheetblock}{Description}
\begin{tabular}{L{0.25\linewidth}L{0.195\linewidth}L{0.25\linewidth}L{0.195\linewidth}}
\descrow{dna}{Race}{ {{character.race}} }{smiling-face-with-halo}{Alignment}{ {{character.alignment}} }
\descrow{nesting-dolls}{Size}{ {{character.size}} }{transgender-symbol}{Sex}{ {{character.sex}} }
\descrow{hourglass-not-done}{Age}{ {{character.age}} }{straight-ruler}{Height}{ {{character.height}} }
\descrow{person-lifting-weights}{Weight}{ {{character.weight}} }{eye}{Eyes}{ {{character.eyes}} }
\descrow{person-getting-haircut}{Hair}{ {{character.hair}} }{person-standing}{Build}{ {{character.build}} }
\descrow{artist-palette}{Complexion}{ {{character.complexion}} }{}{}{}
\end{tabular}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Level}
\begin{tabular}{L{0.30\linewidth}R{0.12\linewidth}Q{0.51\linewidth}}
{{{build.levelRows}}}
\end{tabular}
\end{sheetblock}
\blockrule
\fitblock{\textheight}{%
\begin{sheetblock}{Notes}
\begin{tabular}{L{0.30\linewidth}L{0.63\linewidth}}
{{{build.noteRows}}}
\end{tabular}
\end{sheetblock}}
\blockrule
% Every racial trait, class ability, feat and proficiency by name, a row per
% source, set small and parted by diamonds as a block's notes are: what
% each does is printed on the Stats and Actions pages, where it is used.
\fitblock{\textheight}{%
\begin{sheetblock}{Abilities \& Feats}
\begin{tabular}{L{0.24\linewidth}L{0.69\linewidth}}
{{{build.abilitiesTable}}}
\end{tabular}
\end{sheetblock}}
\end{multicols}

\newpage
\renewcommand{\sheettitle}{Inventory}

% The left column holds Load, Magic Item Slots and Money, and nothing else;
% the full inventory starts at the top of the middle column and flows on from
% there. The columns are not balanced: an inventory that runs onto another
% page fills each column to the bottom before starting the next.
\begin{multicols*}{3}
\raggedcolumns
\small
% A little more room above and below each row than page 1's tables need,
% since these rows have no strut.
\renewcommand{\arraystretch}{1.15}
\setlength{\parskip}{0pt}
\setstackwidths
% Load and the rule under it are set in a box first, so the slots table
% knows how much of the column is left for it.
\setbox\loadbox\vbox{%
\begin{sheetblock}{Load}
\begin{tabular}{L{0.42\linewidth}L{0.5\linewidth}}
Current load & {{movement.load}} \\
Light load & up to {{movement.capacity.light}} \\
Medium load & up to {{movement.capacity.medium}} \\
Heavy load & up to {{movement.capacity.heavy}} \\
Lift over head & {{movement.capacity.lift}} \\
Push or drag & {{movement.capacity.drag}} \\
\end{tabular}
\end{sheetblock}
\blockrule}
\noindent\copy\loadbox\par\nointerlineskip
% The body slots, the slotless rows after them and the money are one block,
% so neither table breaks across columns. A character with many slotless
% items or purses gets the block scaled down to fit the rest of the left
% column, laid out wider first so it still fills the column's width.
\fitblock{\dimexpr\textheight-\ht\loadbox-\dp\loadbox\relax}{%
\begin{sheetblock}{Magic Item Slots}
\stackopen
{{{inventory.slotsTable}}}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Money}
\begin{tabular}{L{0.30\linewidth}R{0.28\linewidth}L{0.34\linewidth}}
{{{inventory.moneyTable}}}
\end{tabular}
\end{sheetblock}}
\columnbreak
\stacklabel{Items by Container}
\invheader
{{{inventory.detailedTable}}}
\end{multicols*}

\newpage
\renewcommand{\sheettitle}{Spells}
\begin{multicols*}{2}
\raggedcolumns
\begin{sheetblock}{Casting}
\begin{tabular}{L{0.17\linewidth}L{0.29\linewidth}L{0.09\linewidth}R{0.1\linewidth}L{0.21\linewidth}}
\footnotesize Class & \footnotesize Casting & \footnotesize Ability & \footnotesize Caster Level & \footnotesize Domains \\
{{{spells.castingTable}}}
\end{tabular}
\end{sheetblock}
{{{spells.levelBlocks}}}

\columnbreak

% Rows for writing in, so each gets page 1's full row height.
\begin{sheetblock}{Tracking}
\begin{tabular}{R{0.1\linewidth}R{0.14\linewidth}R{0.12\linewidth}L{0.54\linewidth}}
\footnotesize Level & \footnotesize Total Slots & \footnotesize Used & \footnotesize Prepared / Changes \\
\rowstrut 0 & & & \\
\rowstrut 1 & & & \\
\rowstrut 2 & & & \\
\rowstrut 3 & & & \\
\rowstrut 4 & & & \\
\rowstrut 5 & & & \\
\rowstrut 6 & & & \\
\rowstrut 7 & & & \\
\rowstrut 8 & & & \\
\rowstrut 9 & & & \\
\end{tabular}
\end{sheetblock}
\end{multicols*}
\end{document}
`

// The same sheet with every emoji left out, for players who would rather not
// have them. It needs no emoji font.
export const DND35_DETAILED_PLAIN_TEMPLATE = DND35_DETAILED_TEMPLATE.replace(
  EMOJI_ON,
  EMOJI_OFF,
)
