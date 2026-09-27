export const DND35_DETAILED_TEMPLATE = String.raw`\documentclass[12pt]{article}
\usepackage[landscape, margin=0.25in]{geometry}
\usepackage{array}
\usepackage{multicol}
\usepackage{adjustbox}
% table option: loads colortbl, for \rowcolors zebra striping.
\usepackage[table]{xcolor}
\usepackage{fontspec}
\setmainfont{Atkinson Hyperlegible Next}
% Color emoji beside each skill name. Needs LuaLaTeX and the Noto Color Emoji
% system font (Debian/Ubuntu: fonts-noto-color-emoji).
\usepackage{emoji}
\setemojifont{Noto Color Emoji}
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
% a 370.4pt column: \wskill (160.8pt) clears the 16.8pt icon slot plus the
% longest skill name, "Knowledge Dungeoneering" at 142.9pt, so no name wraps.
% \wbonus (40.8pt) clears the widest header word, "Penalty" at 38.8pt.
% \wsource takes the rest (92.6pt), which wraps the longest source list in the
% party data (162.7pt) to the two 6pt lines that fit one 12pt skill row.
% The four widths plus 35pt of rules (5 x 0.6pt) and \tabcolsep (8 x 4pt)
% must stay under \linewidth.
\newcommand{\wskill}{0.434\linewidth}
\newcommand{\wbonus}{0.110\linewidth}
\newcommand{\wsource}{0.250\linewidth}
\newcolumntype{K}{|L{\wskill}|R{\wbonus}|R{\wbonus}|Q{\wsource}|}
% Cell padding and rule weight for every table on the sheet.
\setlength{\tabcolsep}{4pt}
\setlength{\arrayrulewidth}{0.6pt}
\renewcommand{\arraystretch}{0.9}
% Alternate skill rows are shaded; light enough to stay legible in grayscale.
\colorlet{zebra}{black!10}
\setlength{\parskip}{2pt}
\setlength{\columnsep}{18pt}

% One table row per skill. The strut holds every row to one body line plus
% 3pt of padding, split above and below the text so it clears the rules. Two
% 6pt source lines (14pt) fit inside that, so a two-line source list does not
% push its own row taller than its neighbours, which is the point of the
% half-size source font.
\newlength{\skillpad} \setlength{\skillpad}{3pt}
\newcommand{\skillstrut}{\rule[\dimexpr-0.3\bodyleading-0.5\skillpad\relax]{0pt}{\dimexpr\bodyleading+\skillpad\relax}}
% The icon sits in a fixed-width box so names line up whether or not a row has
% an icon (#1 is an \emoji name, or empty). A 12pt emoji is 14.9pt wide, so
% 1.4em (16.8pt) leaves a small gap before the name.
\newcommand{\skillicon}[1]{\makebox[1.4em][l]{\if\relax\detokenize{#1}\relax\else\emoji{#1}\fi}}
% Sources are centred on the row's vertical middle (0.2\bodyleading above the
% baseline, from the strut), so one or two source lines sit inside the row
% rather than hanging from its top edge. An m column would centre too, but it
% adds a full-size strut that makes two-line rows taller than their neighbours.
\newsavebox{\sourcebox}
\newcommand{\skillsources}[1]{%
  \sbox{\sourcebox}{\parbox[b]{\linewidth}{\raggedright #1}}%
  \raisebox{\dimexpr0.2\bodyleading-0.5\ht\sourcebox+0.5\dp\sourcebox\relax}{\usebox{\sourcebox}}}
\newcommand{\skillrow}[5]{\skillstrut \skillicon{#1}#2 & #3 & #4 & \skillsources{#5} \\}
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
% Row 1 is the header; shading starts on the second skill.
\rowcolors{2}{}{zebra}
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
