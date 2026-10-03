import { SHEET_PREAMBLE } from './sheetPreamble'

// One landscape page to answer most of what a player looks up during a
// session: the detailed sheet's blocks, tables, striping and icons, in three
// columns, with final values only. Where a bonus comes from is the detailed
// sheet's job. Each column is one block, scaled down to fit the page when a
// character has more than it holds, as the detailed sheet's page 1 is. The
// sheet repeats the detailed one, so it is shaded tan rather than gray, to
// tell the two apart at a glance.
export const DND35_QUICK_REFERENCE_TEMPLATE =
  SHEET_PREAMBLE +
  String.raw`% Tan rather than gray: striping, group rows, the rules between blocks and
% the spine.
\definecolor{zebra}{HTML}{F4E8C6}
\definecolor{zebradark}{HTML}{E4CD94}
\definecolor{blockrulecolor}{HTML}{A8844F}
% The outer columns hold short labels and single numbers (Init, Abilities,
% Saves, Defense, Movement, Attack; Skills), so they are narrow, and the
% middle one, with weapons, options, conditionals and spells, takes the rest.
\newlength{\qnarrow} \setlength{\qnarrow}{0.265\textwidth}
\newlength{\qgap}    \setlength{\qgap}{12pt}
\newlength{\qwide}
\setlength{\qwide}{\dimexpr\textwidth-2\qnarrow-2\qgap\relax}
% Cells are padded less than the detailed sheet's, and every table's widths
% add up to what fits in its column beside that padding.
\setlength{\tabcolsep}{3pt}
\renewcommand{\sheettitle}{Quick Reference}
% A total with no sources: #1 icon, #2 label, #3 the value.
\newcommand{\qvalrow}[3]{\rowstrut \rowicon{#1}#2 & #3 \\}
% #1 icon, #2 ability, #3 score, #4 modifier.
\newcommand{\qabilityrow}[4]{\rowstrut \rowicon{#1}#2 & #3 & #4 \\}
% Weapons: #1 name, #2 attack, #3 damage, #4 crit; a ranged
% weapon's #4 is its crit and range together, which share a column.
\newcommand{\qmeleerow}[4]{\rowstrut #1 & #2 & #3 & #4 \\}
\newcommand{\qrangedrow}[4]{\rowstrut #1 & #2 & #3 & #4 \\}
% Skills: #1 icon, #2 name, #3 bonus. A skill's conditional bonuses are in
% the Conditionals.
\newcommand{\qskillrow}[3]{\rowstrut \rowicon{#1}#2 & #3 \\}
% A group's heading row in a Full Attack-style block: the spell-like
% abilities' source and caster level.
\newcommand{\qgrouprow}[1]{\rowcolor{zebradark}%
  \multicolumn{2}{L{\dimexpr\linewidth-2\tabcolsep\relax}}{\rowstrut\textbf{#1}} \\}
% A caster's spells, one row per spell level: #1 class and list ("Cleric
% Prepared").
\newenvironment{qspells}[1]{%
  \begin{sheetblock}{#1}%
  \begin{tabular}{R{0.07\linewidth}R{0.10\linewidth}R{0.07\linewidth}N{0.67\linewidth}}
  \footnotesize Lvl & \footnotesize /Day & \footnotesize DC & \footnotesize Spells \\}
  {\end{tabular}\end{sheetblock}}
% #1 spell level, #2 per day, #3 save DC, #4 the spells.
\newcommand{\qspellrow}[4]{\rowstrut #1 & #2 & #3 & #4 \\}
% The caster's level, key ability and domains, across the table.
\newcommand{\qspellgroup}[1]{\rowcolor{zebradark}%
  \multicolumn{4}{L{\dimexpr\linewidth-2\tabcolsep\relax}}{\rowstrut\textbf{#1}} \\}
% A column: #1 its width, #2 its blocks, scaled down to the page's height
% when they are taller. The \vspace{0pt} puts the column's reference point
% at its top edge, so the three line up by their tops: otherwise each hangs
% from its first block's baseline, and a tall first block (Skills) pushes
% its column down the page. Lined up that way the row has no height above
% its reference point, so the page adds no \topskip over it either: the
% columns get the whole \textheight.
\newcommand{\qcolumn}[2]{%
  \begin{minipage}[t]{#1}\vspace{0pt}\fitblock{\textheight}{#2}\end{minipage}}
\setlength{\topskip}{0pt}

\begin{document}
\fontsize{\bodysize}{\bodyleading}\selectfont
\noindent
% Stats: who the character is, what keeps them alive, and their attack
% bonuses.
\qcolumn{\qnarrow}{%
\begin{sheetblock}{Init}
\begin{tabular}{L{0.62\linewidth}R{0.31\linewidth}}
\qvalrow{stopwatch}{Initiative}{ {{combat.initiative}} }
\end{tabular}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Abilities}
\begin{tabular}{L{0.48\linewidth}R{0.20\linewidth}R{0.20\linewidth}}
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
\begin{tabular}{L{0.58\linewidth}R{0.35\linewidth}}
\qvalrow{red-heart}{HP}{ {{combat.hp}} }
\qvalrow{shield}{AC}{ {{combat.ac}} }
\qvalrow{raised-hand}{Touch AC}{ {{combat.touchAc}} }
\qvalrow{astonished-face}{Flat-Footed}{ {{combat.flatFootedAc}} }
{{{quickRef.defenseRows}}}
\end{tabular}
{{{combat.defenseNotes}}}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Movement}
\begin{tabular}{L{0.50\linewidth}R{0.43\linewidth}}
{{{quickRef.movementRows}}}
\end{tabular}
{{{movement.notes}}}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Attack}
\begin{tabular}{L{0.50\linewidth}R{0.43\linewidth}}
\qvalrow{bullseye}{BAB}{ {{combat.bab}} }
\qvalrow{dagger}{Melee}{ {{combat.melee}} }
{{{quickRef.rangedRow}}}
\qvalrow{people-wrestling}{Grapple}{ {{combat.grapple}} }
\end{tabular}
{{{quickRef.attackNotes}}}
\end{sheetblock}}%
\hspace{\qgap}%
% Actions: weapons, what to bring to an attack, what applies only now and
% then, and magic.
\qcolumn{\qwide}{%
\begin{sheetblock}{Melee}
\begin{tabular}{L{0.42\linewidth}R{0.14\linewidth}L{0.22\linewidth}C{0.12\linewidth}}
\footnotesize Weapon & \footnotesize Atk & \footnotesize Damage & Crit \\
{{{quickRef.meleeTable}}}
\end{tabular}
\end{sheetblock}
{{{quickRef.rangedBlock}}}
{{{quickRef.fullAttackBlock}}}
{{{quickRef.optionsBlock}}}
{{{quickRef.conditionalsBlock}}}
{{{quickRef.spellLikeBlock}}}
{{{quickRef.spellBlocks}}}}%
\hspace{\qgap}%
% Skills, and what the character can say and notice.
\qcolumn{\qnarrow}{%
\begin{sheetblock}{Skills}
\begin{tabular}{L{0.73\linewidth}R{0.19\linewidth}}
{{{quickRef.skillsTable}}}
\end{tabular}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Awareness}
\begin{tabular}{L{0.46\linewidth}N{0.47\linewidth}}
{{{character.awarenessTable}}}
\end{tabular}
{{{character.awarenessNotes}}}
\end{sheetblock}}
\end{document}
`
