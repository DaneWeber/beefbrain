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
\newcolumntype{N}[1]{>{\small\raggedright\arraybackslash}p{#1}}

% Body type size. Sources in the skills table are reference material consulted
% rarely, so they set at half the body's size AND half its leading: two source
% lines then occupy exactly one skill line.
\newlength{\bodysize}      \setlength{\bodysize}{12pt}
\newlength{\bodyleading}   \setlength{\bodyleading}{14pt}
\newlength{\sourcesize}    \setlength{\sourcesize}{0.5\bodysize}
\newlength{\sourceleading} \setlength{\sourceleading}{0.5\bodyleading}
% Q because the obvious letters are taken: array defines W, and V was taken
% by varwidth when the sheet loaded adjustbox.
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
% Alternate rows of every table are shaded, starting with the first row;
% light enough to stay legible in grayscale.
\colorlet{zebra}{black!10}
\rowcolors{1}{zebra}{}
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
        \rlap{\normalsize\inlineicon{dragon}{{character.player}}}\hfill
        {\large\bfseries {{character.name}}}\hfill
        \llap{\large\bfseries\sheettitle}\hspace{\spinepad}}}}}}}
\AddToShipoutPictureBG{\sheetspine}
% Which bnb-latex made the sheet, and when, in tiny type in the margin below
% the spine: enough to tell an old printout from a new one.
\AddToShipoutPictureBG{\AtPageLowerLeft{\put(\LenToUnit{0.25in},\LenToUnit{0.1in}){%
  \fontsize{5pt}{6pt}\selectfont\textcolor{black!50}{ {{sheet.generated}} }}}}

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
% A block's optional row for a note rather than a total (Mike's DR
% 10/silver): #1 the label column's share of the block's width, #2 label,
% #3 the note, set small across the total and sources columns. The columns
% of every block that has such rows add up to 0.93 of its width. Like the
% block's other optional rows it has no icon, but keeps the room for one so
% the labels line up.
\newcommand{\noterow}[3]{\rowstrut \rowicon{}#2 &
  \multicolumn{2}{C{\dimexpr0.93\linewidth-#1\linewidth+2\tabcolsep\relax}}{#3} \\}
% A block's note with no label (the view notes under Defense and Movement):
% #1 the note, set small across all three columns.
% \multicolumn has to open the row, so the strut goes inside it.
\newcommand{\fullnoterow}[1]{%
  \multicolumn{3}{C{\dimexpr0.93\linewidth+4\tabcolsep\relax}}{\rowstrut #1} \\}
% Notes under a block's table, for what bears on the block but is not a
% total of its own: a charged item, a conditional bonus. #1 the notes, each
% parted from the next by \notesep. Set small, unshaded, across the table's
% width and in line with its text. A line may break after a \notesep but
% not before it, so no line opens with one.
\newcommand{\notesep}{\ifsheetemoji\nobreak\ \emoji{small-blue-diamond}\ \else\nobreak\ \textbullet\ \fi}
\newcommand{\blocknotes}[1]{%
  \par\vspace{2pt}%
  {\footnotesize\leftskip\tabcolsep\rightskip\tabcolsep plus 1fil\noindent #1\par}}
% A label and a note set small beside it, in a two-column table: the Build
% page's notes, and the social note after the languages.
\newcommand{\textrow}[2]{\rowstrut #1 & {\footnotesize #2} \\}
% Languages, two to a row.
\newcommand{\langrow}[2]{\rowstrut #1 & #2 \\}
% Character description, two fields per row: icon, label, value, twice.
\newcommand{\descrow}[6]{\rowstrut \rowicon{#1}#2 & #3 & \rowicon{#4}#5 & #6 \\}
% Stacked tables for the inventory page. Each row is its own one-row tabular,
% stacked with no space between, so a long table can break across columns and
% pages; one tabular cannot. The rows of a table share a column spec, so the
% stack reads as one table, and a counter carries the zebra striping across
% rows. Header rows end in \nobreak so a column never ends on a header.
% Rows sit \stackindent in from the column edge, clear of the table's label;
% inside a sheetblock, which already leaves that room, the indent is zero.
\newcounter{stackrow}
\newlength{\stackindent}
\newcommand{\stackline}[2]{% #1 column spec, #2 cells
  \par\nointerlineskip\noindent\hspace*{\stackindent}%
  \begin{tabular}{#1}#2 \\ \end{tabular}\par}
% A table's first row, and container rows inside the inventory, restart the
% striping. A column header is shaded like any first row, as on page 1; the
% row after it, or after a container (shaded darker), is not.
\newcommand{\stackheader}[3][zebra]{% #1 background (default zebra), #2 spec, #3 cells
  \setcounter{stackrow}{1}%
  \rowcolors{1}{#1}{}\stackline{#2}{#3}\nobreak}
% A table with no header starts shaded, as on page 1.
\newcommand{\stackopen}{\setcounter{stackrow}{0}}
\newcommand{\stackbody}[2]{%
  \stepcounter{stackrow}%
  \ifodd\value{stackrow}\rowcolors{1}{zebra}{}\else\rowcolors{1}{}{}\fi
  \stackline{#1}{#2}}

% Column specs, sized when the multicols column starts from the width left
% beside the tables' labels.
\newlength{\invqty}  \setlength{\invqty}{2.1em}
\newlength{\invwt}   \setlength{\invwt}{3.3em}
\newlength{\stackwidth}
\newlength{\invname}
\newlength{\slotname}
\newlength{\slotitems}
\newlength{\traitname}
\newlength{\traitdetail}
\newcommand{\setstackwidths}{%
  \setlength{\stackindent}{\blocklabel}%
  \setlength{\stackwidth}{\dimexpr\linewidth-\blocklabel\relax}%
  \setlength{\invname}{\dimexpr\stackwidth-\invqty-\invwt-6\tabcolsep\relax}%
  \setlength{\slotname}{0.27\stackwidth}%
  \setlength{\slotitems}{\dimexpr\stackwidth-\slotname-4\tabcolsep\relax}%
  \setlength{\traitname}{0.4\stackwidth}%
  \setlength{\traitdetail}{\dimexpr\stackwidth-\traitname-4\tabcolsep\relax}}
% Column types rather than macros: tabular does not expand a macro in its
% column spec.
\newcolumntype{I}{L{\invname}R{\invqty}R{\invwt}}
\newcolumntype{J}{L{\slotname}L{\slotitems}}
\newcolumntype{T}{L{\traitname}C{\traitdetail}}

% Inventory: #1 item, #2 quantity, #3 the line's total weight in pounds.
\newcommand{\invheader}{\stackheader{I}{\footnotesize Item & \footnotesize Qty & \footnotesize Wt (lb)}}
% A container row spans Item and Qty: #1 container, #2 its subtotal weight.
\newcommand{\invcontainer}[2]{\stackheader[black!20]{I}{%
  \multicolumn{2}{L{\dimexpr\invname+\invqty+2\tabcolsep\relax}}{\textbf{#1}} & \textbf{#2}}}
\newcommand{\invitem}[3]{\stackbody{I}{#1 & #2 & #3}}

% Money: #1 the coin or "Total", #2 how much, #3 where it is carried. A
% sheet with several purses heads each with \moneygroup.
\newcommand{\moneyrow}[3]{#1 & #2 & {\footnotesize #3} \\}
\newcommand{\moneygroup}[1]{\multicolumn{3}{L{\dimexpr\linewidth-2\tabcolsep\relax}}{\textbf{#1}} \\}

% Magic item slots: #1 icon, #2 slot name, #3 1 when more than one item claims
% the slot, #4 the \slotitem entries (empty for a free slot). No header row:
% the slot names and what is in them need no labels.
\newcommand{\slotitem}[1]{#1}
\newcommand{\slotcells}[4]{%
  \rowicon{#1}#2\ifnum#3=1 \ \ifsheetemoji\emoji{warning}\else\textbf{(!)}\fi\fi &
  \if\relax\detokenize{#4}\relax\textcolor{black!40}{\textemdash}\else #4\fi}
\newcommand{\slotrow}[4]{\stackbody{J}{\slotcells{#1}{#2}{#3}{#4}}}
% #1 label ("Slotless", on every row), #2 the \slotitem. No icon, but the
% same room for one, so the labels line up.
\newcommand{\slotlessrow}[2]{\stackbody{J}{\slotcells{}{#1}{0}{#2}}}

% Each labelled block is a single box, so a column break can land between two
% blocks but never between a label and the table it names. \\* is not enough
% here: multicol splits with \vsplit, which broke at the label anyway.
% Each block restarts the striping: xcolor's row count otherwise runs on from
% the previous table, and a block could open on an unshaded row.
% The label runs up the block's left side, centred on the table. It is set
% at body size whatever the size around it, and a label longer than its table
% is tall overhangs the table equally above and below.
\newlength{\blocklabel} \setlength{\blocklabel}{1.4em}
\newcommand{\blocklabelfont}{\fontsize{\bodysize}{\bodyleading}\selectfont\bfseries}
\newsavebox{\blockbox}
\newsavebox{\loadbox}
\newlength{\blocklabellength}
\newenvironment{sheetblock}[1]{%
  \def\blocktitle{#1}%
  \rowcolors{1}{zebra}{}%
  \setlength{\stackindent}{0pt}%
  \par\noindent
  \begin{lrbox}{\blockbox}\begin{minipage}{\dimexpr\linewidth-\blocklabel\relax}}%
  {\end{minipage}\end{lrbox}%
  \settowidth{\blocklabellength}{\blocklabelfont\blocktitle}%
  \ifdim\blocklabellength<\dimexpr\ht\blockbox+\dp\blockbox\relax
    \setlength{\blocklabellength}{\dimexpr\ht\blockbox+\dp\blockbox\relax}\fi
  \parbox[c]{\blocklabel}{\rotatebox{90}{%
    \parbox{\blocklabellength}{\centering\blocklabelfont\blocktitle}}}%
  \usebox{\blockbox}\par}
% The label for a table that flows across columns and pages, and so cannot
% be one box: it runs up the table's left side from the table's top, beside
% the first rows. A \stackindent keeps every row of the table clear of it.
\newcommand{\stacklabel}[1]{%
  \par\nointerlineskip\noindent
  \rlap{\makebox[\blocklabel][l]{\raisebox{-\height}[0pt][0pt]{%
    \rotatebox{90}{\blocklabelfont #1}}}}%
  \par\nointerlineskip\nobreak}
% A stacked table under a \stacklabel, #1, that can break across columns
% and pages: #2 is set in a box first, to measure it, then unboxed, which
% leaves its rows free to break as before. A table shorter than its label
% is padded to the label's length, so the label cannot run into what follows.
\newbox\flowbox
\newlength{\flowheight}
\newcommand{\flowblock}[2]{%
  \setbox\flowbox\vbox{#2}%
  \setlength{\flowheight}{\dimexpr\ht\flowbox+\dp\flowbox\relax}%
  \settowidth{\blocklabellength}{\blocklabelfont #1}%
  \stacklabel{#1}%
  \unvbox\flowbox
  \ifdim\flowheight<\blocklabellength
    \nobreak\vspace{\dimexpr\blocklabellength-\flowheight\relax}\fi}
% A block that must fit in #1 of height, scaled down if it is taller. Scaling
% alone would narrow it too, leaving white space beside it, so it is first
% laid out wider, in steps of \fitstep, until at that width it is short
% enough that scaling it back to \linewidth brings it within #1. Its text
% wraps less at each step, so it shrinks less than a plain scale would.
% Never more than 3 times as wide, which is well past any real sheet.
\newsavebox{\fitbox}
\newlength{\fitwidth}
\newlength{\fitheight}
\newlength{\fitstep}
% Set #1 at \fitwidth. \setstackwidths sizes the stacked tables' columns to
% that width; the skills columns follow \linewidth by themselves.
\newcommand{\fitset}[1]{%
  \sbox{\fitbox}{\begin{minipage}[t]{\fitwidth}\setstackwidths #1\end{minipage}}}
% \fitwider: too tall at this width once scaled, and still room to widen.
\newif\iffitwider
\newcommand{\fitcheck}{%
  \fitwiderfalse
  \ifdim\dimexpr(\ht\fitbox+\dp\fitbox)*\linewidth/\fitwidth\relax>\fitheight
    \ifdim\fitwidth<3\linewidth \fitwidertrue\fi
  \fi}
\newcommand{\fitblock}[2]{%
  \setlength{\fitheight}{#1}%
  \setlength{\fitwidth}{\linewidth}%
  \setlength{\fitstep}{0.02\linewidth}%
  \fitset{#2}%
  \fitcheck
  \loop\iffitwider
    \addtolength{\fitwidth}{\fitstep}%
    \fitset{#2}%
    \fitcheck
  \repeat
  \par\noindent\resizebox{\linewidth}{!}{\usebox{\fitbox}}\par}
% Text between blocks lines up with the tables, not the labels.
\newenvironment{blocknote}{\par\leftskip\blocklabel\noindent}{\par}
% A decorative break between blocks: a gray line a third of the column wide
% with a small diamond at its middle, centred over the tables (not the
% labels), with \blockrulepad above and below.
% It divides two blocks in the same column and nothing else, so it is set as
% leaders, which are glue: a column or page break discards it as it does any
% space, rather than leaving it at the top of the next column. Nothing after
% it is a place to break, so it never ends a column either.
\newlength{\blockrulepad} \setlength{\blockrulepad}{6pt}
\newsavebox{\blockrulebox}
\newcommand{\blockrule}{%
  \par
  \sbox{\blockrulebox}{\hspace*{\blocklabel}%
    \makebox[\dimexpr\linewidth-\blocklabel\relax]{\color{black!45}%
      \rule[2pt]{\dimexpr\linewidth/6-4pt\relax}{0.6pt}%
      \hspace{2pt}\raisebox{0.8pt}{\rotatebox[origin=c]{45}{\rule{3pt}{3pt}}}\hspace{2pt}%
      \rule[2pt]{\dimexpr\linewidth/6-4pt\relax}{0.6pt}}}%
  % \cleaders, centred in its glue: plain \leaders aligns its box to a grid
  % down the page, where a box exactly the glue's height rarely fits, and
  % then draws nothing. \copy, not \usebox, which would start a paragraph.
  \cleaders\vbox to \dimexpr\ht\blockrulebox+\dp\blockrulebox+2\blockrulepad\relax{%
    \vss\copy\blockrulebox\vss}%
    \vskip\dimexpr\ht\blockrulebox+\dp\blockrulebox+2\blockrulepad\relax
  \nointerlineskip}

% The actions page. Weapons: #1 name, #2 attack bonus, #3 damage, then #4
% crit (ranged: #4 range, #5 crit), and last the sources of the attack and
% the damage, with the weapon's tags. Crit and range are set small: they are
% short and looked up, not read. A weapon's sources run past the two lines
% \rowsources centres in a row, so they are set as they are and the row
% grows to hold them.
\newcommand{\meleerow}[5]{\rowstrut #1 & #2 & #3 & #4 & #5 \\}
\newcommand{\rangedrow}[6]{\rowstrut #1 & #2 & #3 & #4 & #5 & #6 \\}
% Ammunition, grouped by the container it is in, as the inventory is: #1
% the container, in a darker row like the inventory's. Each piece of
% ammunition: #1 name, #2 how many. The last column is left empty, for
% marking off what is used.
\newcommand{\ammogroup}[1]{\rowcolor{black!20}%
  \multicolumn{3}{L{\dimexpr0.93\linewidth+4\tabcolsep\relax}}{\rowstrut\textbf{#1}} \\}
\newcommand{\ammorow}[2]{\rowstrut #1 & #2 & \\}
% A table with nothing in it: #1 its number of columns.
\newcommand{\nonerow}[1]{\multicolumn{#1}{L{\dimexpr\linewidth-2\tabcolsep\relax}}{\rowstrut\textcolor{black!40}{None recorded}} \\}
% Full attacks: #1 the routine, #2 its attacks. Conditionals: #1 what the
% modifier is, #2 when it applies and what it changes.
\newenvironment{actionblock}[1]{%
  \begin{sheetblock}{#1}%
  \begin{tabular}{L{0.30\linewidth}N{0.63\linewidth}}}
  {\end{tabular}\end{sheetblock}}
\newcommand{\actionrow}[2]{\rowstrut #1 & #2 \\}
% The Build page's abilities and feats: #1 the group ("Ranger 6"), #2 its
% entries, parted by \notesep and set small. The right margin stretches only
% a little and nothing is hyphenated, so the lines run nearly full rather
% than ragged. The spaces inside an entry are \listtie, where a line breaks
% only when no break between entries will do, so a name stays whole.
\newcommand{\listtie}{\nolinebreak[3]\ }
\newcommand{\listrow}[2]{\rowstrut #1 &
  \footnotesize\setlength{\rightskip}{0pt plus 5em}%
  \hyphenpenalty=10000 \exhyphenpenalty=10000 #2 \\}
% Attack options and spell-like abilities, stacked so a group of them (a
% class, the racial traits) can open with a header row as the inventory's
% containers do. #1 the group's name.
\newcommand{\traitgroup}[1]{\stackheader[black!20]{T}{%
  \multicolumn{2}{L{\dimexpr\stackwidth-2\tabcolsep\relax}}{\rowstrut\textbf{#1}}}}
% #1 the ability, #2 its detail. An ability with no detail takes the whole
% row, so a long one wraps less.
% The test sits outside the row: a conditional cannot span a cell's &.
\newcommand{\traitrow}[2]{%
  \if\relax\detokenize{#2}\relax
    \stackbody{T}{\multicolumn{2}{L{\dimexpr\stackwidth-2\tabcolsep\relax}}{\rowstrut #1}}%
  \else\stackbody{T}{\rowstrut #1 & #2}\fi}
\newcommand{\traitnone}{\stackopen\stackbody{T}{%
  \multicolumn{2}{L{\dimexpr\stackwidth-2\tabcolsep\relax}}{\rowstrut\textcolor{black!40}{None recorded}}}}

% The spells page. Casting: one row per class, #1 class, #2 casting type,
% #3 key ability, #4 caster level, #5 domains.
\newcommand{\castingrow}[5]{\rowstrut #1 & #2 & #3 & #4 & #5 \\}
\newcommand{\castingnone}{\multicolumn{5}{L{\dimexpr\linewidth-2\tabcolsep\relax}}{\rowstrut\textcolor{black!40}{No spellcasting recorded}} \\}
% A class's spells, one row per spell level: #1 class, #2 what its lists are
% ("Prepared" or "Known").
\newenvironment{spelllevels}[2]{%
  \begin{sheetblock}{#1}%
  \begin{tabular}{R{0.08\linewidth}R{0.11\linewidth}R{0.1\linewidth}N{0.61\linewidth}}
  \footnotesize Level & \footnotesize Per Day & \footnotesize Save DC & \footnotesize #2 \\}
  {\end{tabular}\end{sheetblock}}
% #1 spell level, #2 spells per day, #3 save DC, #4 the spells.
\newcommand{\spelllevelrow}[4]{\rowstrut #1 & #2 & #3 & #4 \\}

\begin{document}
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
{{{combat.initiativeSpecialRows}}}
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
\end{sheetblock}
\blockrule
\begin{sheetblock}{Languages}
\begin{tabular}{L{0.465\linewidth}L{0.465\linewidth}}
{{{character.languagesTable}}}
\end{tabular}
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
\statrow{bow-and-arrow}{Ranged}{ {{combat.ranged}} }{ {{combat.ranged.sources}} }
\statrow{people-wrestling}{Grapple}{ {{combat.grapple}} }{ {{combat.grapple.sources}} }
{{{actions.specialAttackRows}}}
{{{actions.offenseNoteRows}}}
\end{tabular}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Melee}
\begin{tabular}{L{0.29\linewidth}R{0.11\linewidth}L{0.17\linewidth}C{0.12\linewidth}Q{0.19\linewidth}}
\footnotesize Weapon & \footnotesize Atk & \footnotesize Damage & Crit & \multicolumn{1}{L{0.19\linewidth}}{\footnotesize Sources} \\
{{{actions.meleeTable}}}
\end{tabular}
\end{sheetblock}
\blockrule
\begin{sheetblock}{Ranged}
\begin{tabular}{L{0.22\linewidth}R{0.10\linewidth}L{0.13\linewidth}C{0.12\linewidth}C{0.12\linewidth}Q{0.16\linewidth}}
\footnotesize Weapon & \footnotesize Atk & \footnotesize Damage & Range & Crit & \multicolumn{1}{L{0.16\linewidth}}{\footnotesize Sources} \\
{{{actions.rangedTable}}}
\end{tabular}
\end{sheetblock}
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
