// The emoji switch. The plain variant flips this one line, so both sheets
// stay the same template.
const EMOJI_ON = String.raw`\sheetemojitrue`
const EMOJI_OFF = String.raw`\sheetemojifalse`

export const DND35_DETAILED_TEMPLATE = String.raw`\documentclass[12pt]{article}
% The left margin also holds the spine: a band down the page's left edge
% with the player, character and page title (\sheetspine below).
\usepackage[landscape, margin=0.25in, left=0.63in]{geometry}
\usepackage{array}
\usepackage{multicol}
\usepackage{adjustbox}
\usepackage{graphicx}
\usepackage{eso-pic}
% table option: loads colortbl, for \rowcolors zebra striping.
\usepackage[table]{xcolor}
\usepackage{fontspec}
% The installed font is a variable font, one file for every weight, so fontspec
% finds no separate bold and \textbf would print regular. Bold is the same file
% at weight 700.
\setmainfont{Atkinson Hyperlegible Next}[
  BoldFont={Atkinson Hyperlegible Next},
  BoldFeatures={RawFeature={axis={wght=700}}}]
% Color emoji beside each item on page 1 and each skill. Needs LuaLaTeX and
% the Noto Color Emoji system font (Debian/Ubuntu: fonts-noto-color-emoji).
% With the switch off (the plain sheet) the package is not loaded, so neither
% is the font, and every icon macro below prints nothing.
\newif\ifsheetemoji
${EMOJI_ON}
\ifsheetemoji
  \usepackage{emoji}
  \setemojifont{Noto Color Emoji}
\else
  \newcommand{\emoji}[1]{}
\fi
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

% Skills column widths, measured against the widest content at these sizes.
% The table sits beside its rotated label, so \linewidth is the 358.7pt column
% less \blocklabel: 341.9pt. \wskill (160.7pt) clears the 16.8pt icon slot plus
% the longest skill name, "Knowledge Dungeoneering" at 142.9pt, so no name
% wraps. \wbonus (33.2pt) clears the widest header word, "Penalty", at the
% header's footnote size (32.4pt). \wsource takes the rest (82.0pt), which
% wraps the longest source list in the party data (162.7pt) to the two 6pt
% lines that fit one 12pt skill row. The four widths plus \tabcolsep
% (8 x 4pt) must stay under \linewidth.
\newcommand{\wskill}{0.47\linewidth}
\newcommand{\wbonus}{0.097\linewidth}
\newcommand{\wsource}{0.24\linewidth}
\newcolumntype{K}{L{\wskill}R{\wbonus}R{\wbonus}Q{\wsource}}
% Cell padding for every table on the sheet. No table has rules: the striping
% separates rows.
\setlength{\tabcolsep}{4pt}
\renewcommand{\arraystretch}{0.9}
% Alternate rows of every table are shaded, starting with the second row;
% light enough to stay legible in grayscale.
\colorlet{zebra}{black!10}
\rowcolors{2}{}{zebra}
\setlength{\parskip}{2pt}
\setlength{\columnsep}{14pt}

% The spine: a shaded band in the left margin, level with the text block,
% reading bottom to top. The player sits at its bottom, the character's name
% at its centre and the page title at its top. \rlap and \llap keep the name
% centred on the page however long the other two are. Every page shows the
% current \sheettitle, so an inventory that runs to a second page carries
% "Inventory" there too.
\newlength{\spinewidth} \setlength{\spinewidth}{0.28in}
\newlength{\spinepad}   \setlength{\spinepad}{8pt}
\newcommand{\sheettitle}{Stats}
\newcommand{\sheetspine}{%
  \AtPageLowerLeft{\put(\LenToUnit{0.25in},\LenToUnit{0.25in}){%
    \textcolor{zebra}{\rule{\spinewidth}{\textheight}}}%
  \put(\LenToUnit{0.25in},\LenToUnit{0.25in}){%
    \makebox(\LenToUnit{\spinewidth},\LenToUnit{\textheight}){%
      \rotatebox{90}{\makebox[\textheight]{\hspace{\spinepad}%
        \rlap{\normalsize\inlineicon{game-die}{{character.player}}}\hfill
        {\large\bfseries {{character.name}}}\hfill
        \llap{\large\bfseries\sheettitle}\hspace{\spinepad}}}}}}}
\AddToShipoutPictureBG{\sheetspine}

% Page 1 rows. The strut holds every row to one body line plus 3pt of
% padding, split above and below the text. Two 6pt source lines (14pt) fit
% inside that, so a two-line source list does not push its own row taller
% than its neighbours, which is the point of the half-size source font.
\newlength{\rowpad} \setlength{\rowpad}{3pt}
\newcommand{\rowstrut}{\rule[\dimexpr-0.3\bodyleading-0.5\rowpad\relax]{0pt}{\dimexpr\bodyleading+\rowpad\relax}}
% The icon sits in a fixed-width box so labels line up whether or not a row
% has an icon (#1 is an \emoji name, or empty); on the plain sheet it takes
% no room at all. A 12pt emoji is 14.9pt wide,
% so 1.4em (16.8pt) leaves a small gap before the label.
\newcommand{\rowicon}[1]{\ifsheetemoji\makebox[1.4em][l]{\if\relax\detokenize{#1}\relax\else\emoji{#1}\fi}\fi}
% An icon inline in running text, with its gap before the label.
\newcommand{\inlineicon}[1]{\ifsheetemoji\emoji{#1}\,\fi}
% Sources are centred on the row's vertical middle (0.2\bodyleading above the
% baseline, from the strut), so one or two source lines sit inside the row
% rather than hanging from its top edge. An m column would centre too, but it
% adds a full-size strut that makes two-line rows taller than their neighbours.
\newsavebox{\sourcebox}
\newcommand{\rowsources}[1]{%
  \sbox{\sourcebox}{\parbox[b]{\linewidth}{\raggedright #1}}%
  \raisebox{\dimexpr0.2\bodyleading-0.5\ht\sourcebox+0.5\dp\sourcebox\relax}{\usebox{\sourcebox}}}
% #1 icon, #2 label, then the cells.
% Skills: #3 bonus, #4 bonus without the armor check penalty, #5 sources.
\newcommand{\skillrow}[5]{\rowstrut \rowicon{#1}#2 & #3 & #4 & \rowsources{#5} \\}
% Abilities: #3 score, #4 modifier, #5 what the score is built from.
\newcommand{\abilityrow}[5]{\rowstrut \rowicon{#1}#2 & #3 & #4 & \rowsources{#5} \\}
% Combat and saves: #3 total, #4 sources.
\newcommand{\statrow}[4]{\rowstrut \rowicon{#1}#2 & #3 & \rowsources{#4} \\}
% Character description, two fields per row: icon, label, value, twice.
\newcommand{\descrow}[6]{\rowstrut \rowicon{#1}#2 & #3 & \rowicon{#4}#5 & #6 \\}
% Stacked tables for the inventory page. Each row is its own one-row tabular,
% stacked with no space between, so a long table can break across columns and
% pages; one tabular cannot. The rows of a table share a column spec, so the
% stack reads as one table, and a counter carries the zebra striping across
% rows. Header rows end in \nobreak so a column never ends on a header.
\newcounter{stackrow}
\newcommand{\stackline}[2]{% #1 column spec, #2 cells
  \par\nointerlineskip\noindent
  \begin{tabular}{#1}#2 \\ \end{tabular}\par}
% A table's first row, and container rows inside the inventory, restart the
% striping. The row after a column header is shaded, as on page 1; the row
% after a container, already shaded darker, is not.
\newcommand{\stackheader}[3][]{% #1 background (default none), #2 spec, #3 cells
  \setcounter{stackrow}{\if\relax\detokenize{#1}\relax 1\else 0\fi}%
  \rowcolors{1}{#1}{}\stackline{#2}{#3}\nobreak}
% A table with no header starts unshaded, as on page 1.
\newcommand{\stackopen}{\setcounter{stackrow}{0}}
\newcommand{\stackbody}[2]{%
  \stepcounter{stackrow}%
  \ifodd\value{stackrow}\rowcolors{1}{}{}\else\rowcolors{1}{zebra}{}\fi
  \stackline{#1}{#2}}

% Column specs, sized from \linewidth when the multicols column starts.
\newlength{\invqty}  \setlength{\invqty}{2.1em}
\newlength{\invwt}   \setlength{\invwt}{3.3em}
\newlength{\invname}
\newlength{\slotname}
\newlength{\slotitems}
\newlength{\loadname}
\newlength{\loadweight}
\newcommand{\setstackwidths}{%
  \setlength{\invname}{\dimexpr\linewidth-\invqty-\invwt-6\tabcolsep\relax}%
  \setlength{\slotname}{0.27\linewidth}%
  \setlength{\slotitems}{\dimexpr\linewidth-\slotname-4\tabcolsep\relax}%
  \setlength{\loadname}{0.4\linewidth}%
  \setlength{\loadweight}{\dimexpr\linewidth-\loadname-4\tabcolsep\relax}}
% Column types rather than macros: tabular does not expand a macro in its
% column spec.
\newcolumntype{I}{L{\invname}R{\invqty}R{\invwt}}
\newcolumntype{J}{L{\slotname}L{\slotitems}}
\newcolumntype{G}{L{\loadname}L{\loadweight}}

% Load: #1 label, #2 weight.
\newcommand{\loadrow}[2]{\stackbody{G}{#1 & #2}}

% Inventory: #1 item, #2 quantity, #3 the line's total weight in pounds.
\newcommand{\invheader}{\stackheader{I}{\textbf{Item} & \textbf{Qty} & \textbf{Wt (lb)}}}
% A container row spans Item and Qty: #1 container, #2 its subtotal weight.
\newcommand{\invcontainer}[2]{\stackheader[black!20]{I}{%
  \multicolumn{2}{L{\dimexpr\invname+\invqty+2\tabcolsep\relax}}{\textbf{#1}} & \textbf{#2}}}
\newcommand{\invitem}[3]{\stackbody{I}{#1 & #2 & #3}}

% Magic item slots: #1 slot name, #2 1 when more than one item claims the slot,
% #3 the \slotitem entries (empty for a free slot). The twelve body slots end
% in \nobreak so they stay in one column; the slotless rows after them may
% break, since there can be many.
\newcommand{\slotheader}{\stackheader{J}{\textbf{Slot} & \textbf{Equipped}}}
\newcommand{\slotitem}[2]{#1\if\relax\detokenize{#2}\relax\else\ {\footnotesize(#2)}\fi}
\newcommand{\slotcells}[3]{%
  #1\ifnum#2=1 \ \ifsheetemoji\emoji{warning}\else\textbf{(!)}\fi\fi &
  \if\relax\detokenize{#3}\relax\textcolor{black!40}{\textemdash}\else #3\fi}
\newcommand{\slotrow}[3]{\stackbody{J}{\slotcells{#1}{#2}{#3}}\nobreak}
% #1 label ("Slotless" on the first row only), #2 the \slotitem.
\newcommand{\slotlessrow}[2]{\stackbody{J}{\slotcells{#1}{0}{#2}}}

% Each labelled block is a single box, so a column break can land between two
% blocks but never between a label and the table it names. \\* is not enough
% here: multicol splits with \vsplit, which broke at the label anyway.
% Each block restarts the striping: xcolor's row count otherwise runs on from
% the previous table, and a block could open on a shaded row.
% The label runs up the block's left side, centred on the table and as long
% as the table is tall, so a label longer than that wraps to a second line.
\newlength{\blocklabel} \setlength{\blocklabel}{1.4em}
\newsavebox{\blockbox}
\newenvironment{sheetblock}[1]{%
  \def\blocktitle{#1}%
  \rowcolors{2}{}{zebra}%
  \par\noindent
  \begin{lrbox}{\blockbox}\begin{minipage}{\dimexpr\linewidth-\blocklabel\relax}}%
  {\end{minipage}\end{lrbox}%
  \parbox[c]{\blocklabel}{\rotatebox{90}{%
    \parbox{\dimexpr\ht\blockbox+\dp\blockbox\relax}{\centering\bfseries\blocktitle}}}%
  \usebox{\blockbox}\par}
% Text between blocks lines up with the tables, not the labels.
\newenvironment{blocknote}{\par\leftskip\blocklabel\noindent}{\par}
% A decorative break between blocks: a gray line a third of the column wide
% with a small diamond at its middle, centred over the tables (not the
% labels), with \blockrulepad above and below.
\newlength{\blockrulepad} \setlength{\blockrulepad}{6pt}
\newcommand{\blockrule}{%
  \par\vspace{\blockrulepad}%
  \noindent\hspace*{\blocklabel}%
  \makebox[\dimexpr\linewidth-\blocklabel\relax]{\color{black!45}%
    \rule[2pt]{\dimexpr\linewidth/6-4pt\relax}{0.6pt}%
    \hspace{2pt}\raisebox{0.8pt}{\rotatebox[origin=c]{45}{\rule{3pt}{3pt}}}\hspace{2pt}%
    \rule[2pt]{\dimexpr\linewidth/6-4pt\relax}{0.6pt}}%
  \par\vspace{\blockrulepad}}

\begin{document}
\fontsize{\bodysize}{\bodyleading}\selectfont

\begin{multicols*}{2}
\raggedcolumns
\begin{sheetblock}{Description}
\begin{tabular}{L{0.225\linewidth}L{0.22\linewidth}L{0.225\linewidth}L{0.22\linewidth}}
\descrow{dna}{Race}{ {{character.race}} }{yin-yang}{Alignment}{ {{character.alignment}} }
\descrow{crossed-swords}{Classes}{ {{character.classes}} }{level-slider}{Level}{ {{character.level}} }
\descrow{nesting-dolls}{Size}{ {{character.size}} }{transgender-symbol}{Sex}{ {{character.sex}} }
\descrow{hourglass-not-done}{Age}{ {{character.age}} }{straight-ruler}{Height}{ {{character.height}} }
\descrow{person-lifting-weights}{Weight}{ {{character.weight}} }{eye}{Eyes}{ {{character.eyes}} }
\descrow{person-getting-haircut}{Hair}{ {{character.hair}} }{person-standing}{Build}{ {{character.build}} }
\end{tabular}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Abilities}
\begin{tabular}{L{0.20\linewidth}R{0.12\linewidth}R{0.12\linewidth}Q{0.46\linewidth}}
\abilityrow{flexed-biceps}{STR}{ {{abilities.strength.score}} }{ {{abilities.strength.mod}} }{ {{abilities.strength.sources}} }
\abilityrow{person-juggling}{DEX}{ {{abilities.dexterity.score}} }{ {{abilities.dexterity.mod}} }{ {{abilities.dexterity.sources}} }
\abilityrow{lungs}{CON}{ {{abilities.constitution.score}} }{ {{abilities.constitution.mod}} }{ {{abilities.constitution.sources}} }
\abilityrow{brain}{INT}{ {{abilities.intelligence.score}} }{ {{abilities.intelligence.mod}} }{ {{abilities.intelligence.sources}} }
\abilityrow{owl}{WIS}{ {{abilities.wisdom.score}} }{ {{abilities.wisdom.mod}} }{ {{abilities.wisdom.sources}} }
\abilityrow{smiling-face-with-sunglasses}{CHA}{ {{abilities.charisma.score}} }{ {{abilities.charisma.mod}} }{ {{abilities.charisma.sources}} }
\end{tabular}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Combat Snapshot}
\begin{tabular}{L{0.30\linewidth}R{0.12\linewidth}Q{0.51\linewidth}}
\statrow{red-heart}{HP}{ {{combat.hp}} }{ {{combat.hp.sources}} }
\statrow{shield}{AC}{ {{combat.ac}} }{ {{combat.ac.sources}} }
\statrow{raised-hand}{Touch AC}{ {{combat.touchAc}} }{ {{combat.touchAc.sources}} }
\statrow{astonished-face}{Flat-Footed AC}{ {{combat.flatFootedAc}} }{ {{combat.flatFootedAc.sources}} }
\statrow{anchor}{ACP}{ {{combat.acp}} }{ {{combat.acp.sources}} }
\statrow{high-voltage}{Initiative}{ {{combat.initiative}} }{ {{combat.initiative.sources}} }
\statrow{person-running}{Speed}{ {{movement.speed}} }{ {{movement.speed.sources}} }
\end{tabular}
\end{sheetblock}

\begin{blocknote}
\footnotesize\inlineicon{nazar-amulet}\textbf{Defense Special:} {{combat.defenseSpecial}} \\
\inlineicon{running-shoe}\textbf{Run:} {{movement.run}} \quad \inlineicon{safety-vest}\textbf{Max Dex:} {{combat.maxDex}}
\end{blocknote}
\blockrule
\begin{sheetblock}{Saves}
\begin{tabular}{L{0.30\linewidth}R{0.12\linewidth}Q{0.51\linewidth}}
\statrow{castle}{Fortitude}{ {{saves.fortitude}} }{ {{saves.fortitude.sources}} }
\statrow{dashing-away}{Reflex}{ {{saves.reflex}} }{ {{saves.reflex.sources}} }
\statrow{lion}{Will}{ {{saves.will}} }{ {{saves.will.sources}} }
\end{tabular}
\end{sheetblock}

\columnbreak

% The whole skills list stays in the right column: at natural size when it
% fits, scaled down uniformly when a character has more skills than one column
% holds. max totalheight only ever shrinks.
\begin{adjustbox}{max totalheight=\textheight}
\begin{sheetblock}{Skills}
\begin{tabular}{K}
% The header is set small: it only names the columns.
\footnotesize Skill & \footnotesize Bonus & \footnotesize w/o AC Penalty & \multicolumn{1}{L{\wsource}}{\footnotesize Sources} \\
{{{skills.detailedTable}}}
\end{tabular}
\end{sheetblock}
\end{adjustbox}
\end{multicols*}

\newpage
\renewcommand{\sheettitle}{Inventory}

% Load first, then slots, then the full inventory flowing down the columns
% after them. collectmore below zero makes multicols gather a little less than
% a full page before splitting it into columns. At the default, a long
% inventory whose last page balances (Mike's) overshot the page by 8pt,
% because the header rows' \nobreak leaves few places to split.
\setcounter{collectmore}{-5}
\begin{multicols}{3}
\raggedcolumns
\small
% A little more room above and below each row than page 1's tables need,
% since these rows have no strut.
\renewcommand{\arraystretch}{1.15}
\setlength{\parskip}{0pt}
\setstackwidths
\noindent\textbf{\normalsize Load}\par\nobreak\vspace{1pt}
\stackopen
\loadrow{Current load}{ {{movement.load}} }
\loadrow{Light load}{up to {{movement.capacity.light}} }
\loadrow{Medium load}{up to {{movement.capacity.medium}} }
\loadrow{Heavy load}{up to {{movement.capacity.heavy}} }
\loadrow{Lift over head}{ {{movement.capacity.lift}} }
\loadrow{Push or drag}{ {{movement.capacity.drag}} }

\vspace{8pt}
\noindent\textbf{\normalsize Magic Item Slots}\par\nobreak\vspace{1pt}
\slotheader
{{{inventory.slotsTable}}}

\vspace{8pt}
\noindent\textbf{\normalsize Items by Container}\par\nobreak\vspace{1pt}
\invheader
{{{inventory.detailedTable}}}
\end{multicols}

\newpage
\renewcommand{\sheettitle}{Spells}
\noindent\textbf{Casting Profile:} {{spells.summary}} \\
\textbf{Slots by Level:} {{spells.slotsSummary}} \\
\textbf{Prepared / Known by Level:} {{spells.preparedSummary}}

\subsection*{Prepared and Expended Tracking}
% Rows for writing in, so each gets page 1's full row height.
\rowcolors{2}{}{zebra}
\begin{tabular}{L{0.6in}L{0.9in}L{0.6in}L{\dimexpr\linewidth-2.1in-8\tabcolsep\relax}}
\bfseries Level & \bfseries Total Slots & \bfseries Used & \bfseries Prepared / Changes \\
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
\end{document}
`

// The same sheet with every emoji left out, for players who would rather not
// have them. It needs no emoji font.
export const DND35_DETAILED_PLAIN_TEMPLATE = DND35_DETAILED_TEMPLATE.replace(
  EMOJI_ON,
  EMOJI_OFF,
)
