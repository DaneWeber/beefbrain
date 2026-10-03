import { SHEET_PREAMBLE } from './sheetPreamble'

// One landscape page to answer most of what a player looks up during a
// session: the detailed sheet's blocks, tables, striping and icons, in three
// columns, with final values only. Where a bonus comes from is the detailed
// sheet's job. Each column is one block, scaled down to fit the page when a
// character has more than it holds, as the detailed sheet's page 1 is.
export const DND35_QUICK_REFERENCE_TEMPLATE =
  SHEET_PREAMBLE +
  String.raw`% Three columns leave each block about 217pt, so cells are padded less
% than the detailed sheet's, and every table's widths add up to what fits
% beside that padding.
\setlength{\tabcolsep}{3pt}
\renewcommand{\sheettitle}{Quick Reference}
% A total with no sources: #1 icon, #2 label, #3 the value.
\newcommand{\qvalrow}[3]{\rowstrut \rowicon{#1}#2 & #3 \\}
% #1 icon, #2 ability, #3 score, #4 modifier.
\newcommand{\qabilityrow}[4]{\rowstrut \rowicon{#1}#2 & #3 & #4 \\}
% Weapons: #1 name, #2 attack, #3 damage, #4 crit (empty for x2); a ranged
% weapon's #4 is its crit and range together, which share a column.
\newcommand{\qmeleerow}[4]{\rowstrut #1 & #2 & #3 & #4 \\}
\newcommand{\qrangedrow}[4]{\rowstrut #1 & #2 & #3 & #4 \\}
% Skills: #1 icon, #2 name, #3 bonus, #4 notes, set small as sources are.
\newcommand{\qskillrow}[4]{\rowstrut \rowicon{#1}#2 & #3 & \rowsources{#4} \\}
% A group's heading row in a Full Attack-style block: the spell-like
% abilities' source and caster level.
\newcommand{\qgrouprow}[1]{\rowcolor{black!20}%
  \multicolumn{2}{L{\dimexpr\linewidth-2\tabcolsep\relax}}{\rowstrut\textbf{#1}} \\}
% A caster's spells, one row per spell level: #1 class and list ("Cleric
% Prepared").
\newenvironment{qspells}[1]{%
  \begin{sheetblock}{#1}%
  \begin{tabular}{R{0.09\linewidth}R{0.13\linewidth}R{0.09\linewidth}N{0.58\linewidth}}
  \footnotesize Lvl & \footnotesize /Day & \footnotesize DC & \footnotesize Spells \\}
  {\end{tabular}\end{sheetblock}}
% #1 spell level, #2 per day, #3 save DC, #4 the spells.
\newcommand{\qspellrow}[4]{\rowstrut #1 & #2 & #3 & #4 \\}
% The caster's level, key ability and domains, across the table.
\newcommand{\qspellgroup}[1]{\rowcolor{black!20}%
  \multicolumn{4}{L{\dimexpr\linewidth-2\tabcolsep\relax}}{\rowstrut\textbf{#1}} \\}

\begin{document}
\fontsize{\bodysize}{\bodyleading}\selectfont

\begin{multicols*}{3}
\raggedcolumns
% Stats: what the character is, and what keeps them alive.
\fitblock{\textheight}{%
\begin{sheetblock}{Init}
\begin{tabular}{L{0.62\linewidth}R{0.31\linewidth}}
\qvalrow{stopwatch}{Initiative}{ {{combat.initiative}} }
\end{tabular}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Abilities}
\begin{tabular}{L{0.50\linewidth}R{0.20\linewidth}R{0.20\linewidth}}
\qabilityrow{ox}{STR}{ {{abilities.strength.score}} }{ {{abilities.strength.mod}} }
\qabilityrow{cat}{DEX}{ {{abilities.dexterity.score}} }{ {{abilities.dexterity.mod}} }
\qabilityrow{bear}{CON}{ {{abilities.constitution.score}} }{ {{abilities.constitution.mod}} }
\qabilityrow{fox}{INT}{ {{abilities.intelligence.score}} }{ {{abilities.intelligence.mod}} }
\qabilityrow{owl}{WIS}{ {{abilities.wisdom.score}} }{ {{abilities.wisdom.mod}} }
\qabilityrow{eagle}{CHA}{ {{abilities.charisma.score}} }{ {{abilities.charisma.mod}} }
\end{tabular}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Saves}
\begin{tabular}{L{0.62\linewidth}R{0.31\linewidth}}
\qvalrow{nauseated-face}{Fortitude}{ {{saves.fortitude}} }
\qvalrow{face-with-open-mouth}{Reflex}{ {{saves.reflex}} }
\qvalrow{smiling-face-with-heart-eyes}{Will}{ {{saves.will}} }
{{{quickRef.saveRows}}}
\end{tabular}
{{{quickRef.saveNotes}}}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Defense}
\begin{tabular}{L{0.55\linewidth}R{0.38\linewidth}}
\qvalrow{red-heart}{HP}{ {{combat.hp}} }
\qvalrow{shield}{AC}{ {{combat.ac}} }
\qvalrow{raised-hand}{Touch AC}{ {{combat.touchAc}} }
\qvalrow{astonished-face}{Flat-Footed AC}{ {{combat.flatFootedAc}} }
{{{quickRef.defenseRows}}}
\end{tabular}
{{{combat.defenseNotes}}}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Movement}
\begin{tabular}{L{0.55\linewidth}R{0.38\linewidth}}
{{{quickRef.movementRows}}}
\end{tabular}
{{{movement.notes}}}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Awareness}
\begin{tabular}{L{0.37\linewidth}N{0.56\linewidth}}
{{{character.awarenessTable}}}
\end{tabular}
{{{character.awarenessNotes}}}
\end{sheetblock}}

\columnbreak

% Actions: what the character can do on a turn.
\fitblock{\textheight}{%
\begin{sheetblock}{Attack}
\begin{tabular}{L{0.55\linewidth}R{0.38\linewidth}}
\qvalrow{bullseye}{BAB}{ {{combat.bab}} }
\qvalrow{dagger}{Melee}{ {{combat.melee}} }
\qvalrow{bow-and-arrow}{Ranged}{ {{combat.ranged}} }
\qvalrow{people-wrestling}{Grapple}{ {{combat.grapple}} }
\end{tabular}
{{{quickRef.attackNotes}}}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Melee}
\begin{tabular}{L{0.40\linewidth}R{0.14\linewidth}L{0.21\linewidth}C{0.12\linewidth}}
\footnotesize Weapon & \footnotesize Atk & \footnotesize Damage & Crit \\
{{{quickRef.meleeTable}}}
\end{tabular}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Ranged}
\begin{tabular}{L{0.32\linewidth}R{0.15\linewidth}L{0.20\linewidth}C{0.20\linewidth}}
\footnotesize Weapon & \footnotesize Atk & \footnotesize Damage & Crit, Range \\
{{{quickRef.rangedTable}}}
\end{tabular}
\end{sheetblock}
{{{quickRef.fullAttackBlock}}}
{{{quickRef.optionsBlock}}}
{{{quickRef.conditionalsBlock}}}}

\columnbreak

% Skills, then magic.
\fitblock{\textheight}{%
\begin{sheetblock}{Skills}
\begin{tabular}{L{0.59\linewidth}R{0.13\linewidth}Q{0.19\linewidth}}
{{{quickRef.skillsTable}}}
\end{tabular}
\blocknotes{Any other skill: its ability's modifier.}
\end{sheetblock}
{{{quickRef.spellLikeBlock}}}
{{{quickRef.spellBlocks}}}}
\end{multicols*}
\end{document}
`
