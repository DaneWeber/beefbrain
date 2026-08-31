export const DND35_STREAMLINED_TEMPLATE = String.raw`\documentclass[10pt]{article}
\usepackage[margin=0.45in]{geometry}
\begin{document}
\section*{D\&D 3.5 Primary Sheet (Streamlined Draft)}
\textbf{Name:} {{character.name}} \hfill \textbf{Player:} {{character.player}} \\
\textbf{Race:} {{character.race}} \hfill \textbf{Alignment:} {{character.alignment}} \\
\textbf{Classes:} {{character.classes}} \hfill \textbf{Level:} {{character.level}} \\

\subsection*{Core Totals (Final First)}
\begin{tabular}{|l|r|r|r|r|r|}
\hline
HP & AC & Touch & Flat-Footed & Init & Speed \\
\hline
{{combat.hp}} & {{combat.ac}} & {{combat.touchAc}} & {{combat.flatFootedAc}} & {{combat.initiative}} & {{movement.speed}} \\
\hline
\end{tabular}

\small
\textbf{HP components:} {{combat.hp.breakdown}} \\
\textbf{AC components:} {{combat.ac.breakdown}} \\
\textbf{Touch AC components:} {{combat.touchAc.breakdown}} \\
\textbf{Flat-footed components:} {{combat.flatFootedAc.breakdown}} \\
\textbf{Initiative components:} {{combat.initiative.breakdown}} \\
\textbf{Speed components:} {{movement.speed.breakdown}} \\
\normalsize

\subsection*{Saves}
\begin{tabular}{|l|r|l|}
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

\subsection*{Skills (Totals + Components)}
\small {{skills.summary}} \normalsize

\subsection*{Writable Play Notes}
\begin{tabular}{|p{6.8in}|}
\hline
\rule{0pt}{1.0em}Conditions / temporary bonuses / penalties: \\
\\
\\
\hline
\end{tabular}

\newpage
\section*{Inventory Sheet (Draft)}
\textbf{Current Load:} {{movement.load}} \\
\textbf{Capacity:} {{movement.capacity}} \\

\subsection*{Items by Container}
\small {{inventory.itemsByContainer}} \normalsize

\subsection*{Equipped Magic and Notable Effects}
\small {{inventory.equippedMagicItems}} \normalsize

\subsection*{Session Loot and Expenditure Log}
\begin{tabular}{|p{1.4in}|p{1.4in}|p{1.4in}|p{2.2in}|}
\hline
Item & Qty & Location & Notes \\
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
\section*{Spell Sheet (Draft)}
\textbf{Casting Profile:} {{spells.summary}} \\
\textbf{Slots by Level:} {{spells.slotsSummary}} \\
\textbf{Prepared / Known:} {{spells.preparedSummary}} \\

\subsection*{At-Table Casting Tracker}
\begin{tabular}{|l|l|l|p{4.7in}|}
\hline
Level & Slots & Used & Notes / Prepared Spell Changes \\
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
\end{tabular}
\end{document}
`
