export const DND35_DETAILED_TEMPLATE = String.raw`\documentclass[12pt]{article}
\usepackage[landscape, margin=0.25in]{geometry}
\usepackage{array}
\newcolumntype{L}[1]{>{\raggedright\arraybackslash}p{#1}}
\newcolumntype{R}[1]{>{\raggedleft\arraybackslash}p{#1}}
\newcolumntype{C}[1]{>{\footnotesize\raggedright\arraybackslash}p{#1}}
\setlength{\tabcolsep}{3pt}
\renewcommand{\arraystretch}{0.8}
\setlength{\parskip}{2pt}
\begin{document}
\fontsize{14}{16}\selectfont
\section*{D\&D 3.5 Primary Character Sheet (Detailed Draft)}

\noindent
\begin{minipage}[t]{0.47\linewidth}
\noindent\textbf{Character Description}\\[1pt]
\begin{tabular}{|L{0.19\linewidth}|L{0.26\linewidth}|L{0.19\linewidth}|L{0.26\linewidth}|}
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

\noindent\textbf{Abilities}\\[1pt]
\begin{tabular}{|L{0.32\linewidth}|R{0.29\linewidth}|R{0.29\linewidth}|}
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

\noindent\textbf{Combat Snapshot}\\[1pt]
\begin{tabular}{|L{0.20\linewidth}|R{0.11\linewidth}|C{0.58\linewidth}|}
\hline
Field & Final & \normalsize Components \\
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

\footnotesize\textbf{Defense Special:} {{combat.defenseSpecial}} \\
\textbf{Run:} {{movement.run}} \quad \textbf{Max Dex:} {{combat.maxDex}}\normalsize \\

\noindent\textbf{Saves}\\[1pt]
\begin{tabular}{|L{0.20\linewidth}|R{0.11\linewidth}|C{0.58\linewidth}|}
\hline
Save & Final & \normalsize Components \\
\hline
Fortitude & {{saves.fortitude}} & {{saves.fortitude.breakdown}} \\
Reflex & {{saves.reflex}} & {{saves.reflex.breakdown}} \\
Will & {{saves.will}} & {{saves.will.breakdown}} \\
\hline
\end{tabular}

\noindent\textbf{Encounter Notes}\\[1pt]
\begin{tabular}{|L{0.95\linewidth}|}
\hline
\rule{0pt}{1.0em}Conditions, temporary effects, and in-combat adjustments: \\
\\
\hline
\end{tabular}
\end{minipage}%
\hfill
\begin{minipage}[t]{0.47\linewidth}
\noindent\textbf{Skills}\\[1pt]
\begin{tabular}{|L{0.27\linewidth}|R{0.11\linewidth}|R{0.13\linewidth}|C{0.38\linewidth}|}
\hline
Skill & Final & Pre-ACP & \normalsize Sources \\
\hline
{{{skills.detailedTable}}}
\hline
\end{tabular}
\end{minipage}

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
