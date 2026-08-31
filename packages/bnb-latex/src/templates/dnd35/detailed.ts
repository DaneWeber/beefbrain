export const DND35_DETAILED_TEMPLATE = String.raw`\documentclass[10pt]{article}
\usepackage[margin=0.45in]{geometry}
\begin{document}
\section*{D\&D 3.5 Primary Character Sheet (Detailed Draft)}
\subsection*{Character Description}
\begin{tabular}{|l|l|l|l|}
\hline
Name & {{character.name}} & Player & {{character.player}} \\
Race & {{character.race}} & Alignment & {{character.alignment}} \\
Classes & {{character.classes}} & Level & {{character.level}} \\
Size & {{character.size}} & Sex & {{character.sex}} \\
Age & {{character.age}} & Height & {{character.height}} \\
Weight & {{character.weight}} & Eyes & {{character.eyes}} \\
Hair & {{character.hair}} & Build & {{character.build}} \\
\hline
\end{tabular}

\subsection*{Combat Snapshot}
\begin{tabular}{|l|r|p{5.3in}|}
\hline
Field & Final & Components \\
\hline
HP & {{combat.hp}} & {{combat.hp.breakdown}} \\
AC & {{combat.ac}} & {{combat.ac.breakdown}} \\
Touch AC & {{combat.touchAc}} & {{combat.touchAc.breakdown}} \\
Flat-Footed AC & {{combat.flatFootedAc}} & {{combat.flatFootedAc.breakdown}} \\
ACP & {{combat.acp}} & {{combat.acp.breakdown}} \\
Initiative & {{combat.initiative}} & {{combat.initiative.breakdown}} \\
Speed & {{movement.speed}} & {{movement.speed.breakdown}} \\
\hline
\end{tabular}

\textbf{Defense Special:} {{combat.defenseSpecial}} \\
\textbf{Run:} {{movement.run}} \hfill \textbf{Max Dex:} {{combat.maxDex}} \\

\subsection*{Saves}
\begin{tabular}{|l|r|p{5.3in}|}
\hline
Save & Final & Components \\
\hline
Fortitude & {{saves.fortitude}} & {{saves.fortitude.breakdown}} \\
Reflex & {{saves.reflex}} & {{saves.reflex.breakdown}} \\
Will & {{saves.will}} & {{saves.will.breakdown}} \\
\hline
\end{tabular}

\subsection*{Abilities}
\begin{tabular}{|l|r|r|}
\hline
Ability & Score & Mod \\
\hline
STR & {{abilities.strength.score}} & {{abilities.strength.mod}} \\
DEX & {{abilities.dexterity.score}} & {{abilities.dexterity.mod}} \\
CON & {{abilities.constitution.score}} & {{abilities.constitution.mod}} \\
INT & {{abilities.intelligence.score}} & {{abilities.intelligence.mod}} \\
WIS & {{abilities.wisdom.score}} & {{abilities.wisdom.mod}} \\
CHA & {{abilities.charisma.score}} & {{abilities.charisma.mod}} \\
\hline
\end{tabular}

\subsection*{Skills (Detailed Breakdown)}
\small {{skills.summaryDetailed}} \normalsize

\subsection*{Writable Encounter Notes}
\begin{tabular}{|p{6.8in}|}
\hline
\rule{0pt}{1.0em}Conditions, temporary effects, and in-combat adjustments: \\
\\
\\
\hline
\end{tabular}

\newpage
\section*{Inventory Sheet (Detailed Draft)}
\textbf{Current Load:} {{movement.load}} \\
\textbf{Capacity Thresholds:} {{movement.capacity}} \\

\subsection*{Items by Container}
\small {{inventory.itemsByContainer}} \normalsize

\subsection*{Equipped Magic Items}
\small {{inventory.equippedMagicItems}} \normalsize

\subsection*{Inventory Change Log}
\begin{tabular}{|p{1.3in}|p{0.7in}|p{1.5in}|p{2.9in}|}
\hline
Item & Qty & Location & Reason / Session Notes \\
\hline
 & & & \\
\hline
 & & & \\
\hline
 & & & \\
\hline
 & & & \\
\hline
 & & & \\
\hline
\end{tabular}

\newpage
\section*{Spell Sheet (Detailed Draft)}
\textbf{Casting Profile:} {{spells.summary}} \\
\textbf{Slots by Level:} {{spells.slotsSummary}} \\
\textbf{Prepared / Known by Level:} {{spells.preparedSummary}} \\

\subsection*{Prepared and Expended Tracking}
\begin{tabular}{|l|l|l|p{4.7in}|}
\hline
Level & Total Slots & Used & Prepared / Changes \\
\hline
0 & & & \\
\hline
1 & & & \\
\hline
2 & & & \\
\hline
3 & & & \\
\hline
4 & & & \\
\hline
5 & & & \\
\hline
6 & & & \\
\hline
7 & & & \\
\hline
8 & & & \\
\hline
9 & & & \\
\hline
\end{tabular}
\end{document}
`
