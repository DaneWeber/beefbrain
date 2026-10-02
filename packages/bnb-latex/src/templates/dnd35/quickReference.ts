// One page to answer most of what a player looks up at the table: the
// character as a stat block, in the style of WotC's later 3.5 books, in the
// detailed sheet's font. The lines come from statBlock.ts; the template only
// sets them. A companion or familiar with a sheet of its own prints the
// same way, in a few lines.
export const DND35_QUICK_REFERENCE_TEMPLATE = String.raw`\documentclass[11pt]{article}
\usepackage[letterpaper, margin=0.4in]{geometry}
\usepackage{multicol}
\usepackage{graphicx}
\usepackage{eso-pic}
\usepackage{xcolor}
\usepackage{fontspec}
% The installed font is a variable font, one file for every weight, so fontspec
% finds no separate bold and \textbf would print regular. Bold is the same file
% at weight 700.
\setmainfont{Atkinson Hyperlegible Next}[
  BoldFont={Atkinson Hyperlegible Next},
  BoldFeatures={RawFeature={axis={wght=700}}}]
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{1pt}
\setlength{\columnsep}{18pt}
\setlength{\columnseprule}{0.4pt}
\renewcommand{\columnseprulecolor}{\color{black!25}}

% Which bnb-latex made the sheet, and when, in tiny type in the bottom
% margin: enough to tell an old printout from a new one.
\AddToShipoutPictureBG{\AtPageLowerLeft{\put(\LenToUnit{0.4in},\LenToUnit{0.18in}){%
  \fontsize{5pt}{6pt}\selectfont\textcolor{black!50}{ {{sheet.generated}} }}}}

% The block's title: the name large, the player at the right margin, then
% a line each for who and what the character is.
\newcommand{\sbname}[2]{%
  \noindent{\LARGE\bfseries\ignorespaces #1\unskip}\hfill
  {\small\textcolor{black!60}{\ignorespaces #2\unskip}}\par}
\newcommand{\sbidentity}[1]{\noindent #1\par}
% A section: its name small and gray, then a rule to the column's edge. A
% column never ends on one.
\newcommand{\sbsection}[1]{%
  \par\vspace{5pt}\noindent
  {\small\bfseries\textcolor{black!60}{\MakeUppercase{#1}}}%
  \ \textcolor{black!30}{\leaders\hrule height 3.4pt depth -2.8pt\hfill}%
  \par\nobreak\vspace{1pt}}
% A section with nothing in it is left out. The template ends each line
% inside the argument with %, so an empty section is truly empty.
\newcommand{\sbsectionif}[2]{%
  \if\relax\detokenize{#2}\relax\else\sbsection{#1}#2\fi}
% One entry: a line that wraps with a hanging indent, so each entry's label
% stands out at the left edge.
\newcommand{\sbline}[1]{\par\hangindent=1.2em\hangafter=1 #1\par}
\newcommand{\sbl}[1]{\textbf{#1}}
% One spell level (or number of uses) under a spells line: "6th (3/day,
% DC 20)" then the spells, indented below it.
\newcommand{\sbspell}[2]{%
  \par\hangindent=2.4em\hangafter=1\hspace*{1.2em}#1\,\textemdash\,#2\par}
% A special ability: bold name, then what it does.
\newcommand{\sbability}[2]{\sbline{\textbf{#1} #2}}

% The whole block must fit on the page, scaled down if it is taller. Scaling
% alone would narrow it too, leaving white space beside it, so it is first
% laid out wider, in steps of \fitstep, until at that width it is short
% enough that scaling it back to \linewidth brings it within \textheight.
% Its text wraps less at each step, so it shrinks less than a plain scale
% would. Never more than 3 times as wide, which is well past any real sheet.
\newsavebox{\fitbox}
\newlength{\fitwidth}
\newlength{\fitstep}
\newcommand{\fitset}[1]{%
  \sbox{\fitbox}{\begin{minipage}[t]{\fitwidth}\raggedright #1\end{minipage}}}
\newif\iffitwider
\newcommand{\fitcheck}{%
  \fitwiderfalse
  \ifdim\dimexpr(\ht\fitbox+\dp\fitbox)*\linewidth/\fitwidth\relax>\textheight
    \ifdim\fitwidth<3\linewidth \fitwidertrue\fi
  \fi}
\newcommand{\fitpage}[1]{%
  \setlength{\fitwidth}{\linewidth}%
  \setlength{\fitstep}{0.02\linewidth}%
  \fitset{#1}%
  \fitcheck
  \loop\iffitwider
    \addtolength{\fitwidth}{\fitstep}%
    \fitset{#1}%
    \fitcheck
  \repeat
  \noindent\resizebox{\linewidth}{!}{\usebox{\fitbox}}}

\begin{document}
\fitpage{%
\sbname{ {{character.name}} }{ {{quick.player}} }
{{{quick.identity}}}
\vspace{2pt}
% Balanced columns: a short block (a mule, a hawk) takes the top of the
% page and leaves the rest for notes.
\begin{multicols}{2}
{{{quick.header}}}
\sbsectionif{Defense}{%
{{{quick.defense}}}%
}
\sbsectionif{Offense}{%
{{{quick.offense}}}%
}
\sbsectionif{Statistics}{%
{{{quick.statistics}}}%
}
\sbsectionif{Special Abilities}{%
{{{quick.special}}}%
}
\end{multicols}}
\end{document}
`
