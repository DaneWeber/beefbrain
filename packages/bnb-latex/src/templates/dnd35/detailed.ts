export const DND35_DETAILED_TEMPLATE = String.raw`\documentclass[12pt]{article}
\usepackage[landscape, margin=0.25in]{geometry}
\usepackage{array}
\usepackage{multicol}
\usepackage{adjustbox}
\usepackage{fontspec}
\setmainfont{Atkinson Hyperlegible Next}
\newcolumntype{L}[1]{>{\raggedright\arraybackslash}p{#1}}
\newcolumntype{R}[1]{>{\raggedleft\arraybackslash}p{#1}}
\newcolumntype{C}[1]{>{\footnotesize\raggedright\arraybackslash}p{#1}}

% Body type size. Sources in the skills table are reference material consulted
% rarely, so they set at half the body's size AND half its leading: two source
% lines then occupy exactly one skill line.
\newlength{\bodysize}      \setlength{\bodysize}{12pt}
\newlength{\bodyleading}   \setlength{\bodyleading}{14pt}
\newlength{\sourcesize}    \setlength{\sourcesize}{0.5\bodysize}
\newlength{\sourceleading} \setlength{\sourceleading}{0.5\bodyleading}
% Q because the obvious letters are taken: array defines W, and adjustbox loads
% varwidth, which defines V.
\newcolumntype{Q}[1]{>{\fontsize{\sourcesize}{\sourceleading}\selectfont\raggedright\arraybackslash}p{#1}}

% Skills column widths, measured against the widest content at these sizes, in
% a 370.4pt column: \wskill (148.2pt) clears the longest skill name, "Knowledge
% Dungeoneering" at 142.9pt, so no name wraps. \wbonus (40.8pt) clears the
% widest header word, "Penalty" at 38.8pt. \wsource takes the rest, which wraps
% the longest source list to the two 6pt lines that fit one 12pt skill row.
% The four widths plus 26pt of rules and \tabcolsep must stay under \linewidth.
\newcommand{\wskill}{0.400\linewidth}
\newcommand{\wbonus}{0.110\linewidth}
\newcommand{\wsource}{0.309\linewidth}
\newcolumntype{K}{|L{\wskill}|R{\wbonus}|R{\wbonus}|Q{\wsource}|}
\setlength{\tabcolsep}{3pt}
\renewcommand{\arraystretch}{0.8}
\setlength{\parskip}{2pt}
\setlength{\columnsep}{18pt}

% One table row per skill. The strut holds every row to exactly one body line.
% \arraystretch{0.8} would otherwise compress a row to 11.2pt, which is less
% than the 14pt two 6pt source lines need, so a two-line source list would push
% its own row taller than its neighbours. With the strut the rows stay uniform
% and two source lines fit exactly one skill line, which is the point of the
% half-size source font.
\newcommand{\skillstrut}{\rule[-0.3\bodyleading]{0pt}{\bodyleading}}
\newcommand{\skillrow}[4]{\skillstrut #1 & #2 & #3 & #4 \\}
% Each labelled block is a single box, so a column break can land between two
% blocks but never between a label and the table it names. \\* is not enough
% here: multicol splits with \vsplit, which broke at the label anyway.
\newenvironment{sheetblock}[1]{%
  \par\noindent\minipage{\linewidth}\noindent\textbf{#1}\\[1pt]}%
  {\endminipage\par}

\begin{document}
\fontsize{\bodysize}{\bodyleading}\selectfont

\begin{multicols*}{2}
\raggedcolumns
\begin{sheetblock}{Character Description}
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
\end{sheetblock}

\begin{sheetblock}{Abilities}
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
\end{sheetblock}

\begin{sheetblock}{Combat Snapshot}
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
\end{sheetblock}

\footnotesize\textbf{Defense Special:} {{combat.defenseSpecial}} \\
\textbf{Run:} {{movement.run}} \quad \textbf{Max Dex:} {{combat.maxDex}}\normalsize \\

\begin{sheetblock}{Saves}
\begin{tabular}{|L{0.20\linewidth}|R{0.11\linewidth}|C{0.58\linewidth}|}
\hline
Save & Final & \normalsize Components \\
\hline
Fortitude & {{saves.fortitude}} & {{saves.fortitude.breakdown}} \\
Reflex & {{saves.reflex}} & {{saves.reflex.breakdown}} \\
Will & {{saves.will}} & {{saves.will.breakdown}} \\
\hline
\end{tabular}
\end{sheetblock}

\begin{sheetblock}{Encounter Notes}
\begin{tabular}{|L{0.95\linewidth}|}
\hline
\rule{0pt}{1.0em}Conditions, temporary effects, and in-combat adjustments: \\
\\
\hline
\end{tabular}
\end{sheetblock}

\columnbreak

% The whole skills list stays in the right column: at natural size when it
% fits, scaled down uniformly when a character has more skills than one column
% holds. max totalheight only ever shrinks.
\begin{adjustbox}{max totalheight=\textheight}
\begin{sheetblock}{Skills}
\begin{tabular}{K}
\hline
% The header keeps body size rather than shrinking to source size.
Skills & Bonus & w/o AC Penalty & \multicolumn{1}{L{\wsource}|}{Sources} \\
\hline
{{{skills.detailedTable}}}
\hline
\end{tabular}
\end{sheetblock}
\end{adjustbox}
\end{multicols*}

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
