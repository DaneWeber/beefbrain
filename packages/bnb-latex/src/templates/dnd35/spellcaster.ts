export const DND35_SPELLCASTER_TEMPLATE = String.raw`\documentclass[10pt]{article}
\usepackage[margin=0.45in]{geometry}
\begin{document}
\section*{D\&D 3.5 Spellcaster Sheet (Draft)}
\textbf{Name:} {{character.name}} \hfill \textbf{Player:} {{character.player}} \\
\textbf{Classes:} {{character.classes}} \hfill \textbf{Level:} {{character.level}} \\
\textbf{Alignment:} {{character.alignment}} \hfill \textbf{Race:} {{character.race}} \\

\subsection*{Casting Profile}
\textbf{Spellcasting Summary:} {{spells.summary}} \\
\textbf{Slots by Level:} {{spells.slotsSummary}} \\
\textbf{Prepared / Known:} {{spells.preparedSummary}} \\

\subsection*{Casting Ability Snapshot}
\begin{tabular}{|l|r|r|l|}
\hline
Ability & Score & Mod & Base DC Rule \\
\hline
INT & {{abilities.intelligence.score}} & {{abilities.intelligence.mod}} & 10 + level + INT mod \\
WIS & {{abilities.wisdom.score}} & {{abilities.wisdom.mod}} & 10 + level + WIS mod \\
CHA & {{abilities.charisma.score}} & {{abilities.charisma.mod}} & 10 + level + CHA mod \\
\hline
\end{tabular}

\subsection*{Combat Quick Reference}
\begin{tabular}{|l|r|p{5.2in}|}
\hline
Field & Final & Components \\
\hline
HP & {{combat.hp}} & {{combat.hp.breakdown}} \\
AC & {{combat.ac}} & {{combat.ac.breakdown}} \\
Touch AC & {{combat.touchAc}} & {{combat.touchAc.breakdown}} \\
Flat-Footed AC & {{combat.flatFootedAc}} & {{combat.flatFootedAc.breakdown}} \\
Initiative & {{combat.initiative}} & {{combat.initiative.breakdown}} \\
\hline
\end{tabular}

\textbf{Saves:} Fort {{saves.fortitude}} ({{saves.fortitude.breakdown}}), Ref {{saves.reflex}} ({{saves.reflex.breakdown}}), Will {{saves.will}} ({{saves.will.breakdown}}) \\

\newpage
\section*{Spell Use Tracker}
\begin{tabular}{|l|l|l|p{4.7in}|}
\hline
Level & Slots & Used & Prepared / Expended / Notes \\
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

\subsection*{Concentration and Condition Notes}
\begin{tabular}{|p{6.8in}|}
\hline
\rule{0pt}{1.0em}Concentration checks, dispels, duration tracking, and temporary modifiers: \\
\\
\\
\hline
\end{tabular}

\newpage
\section*{Inventory Companion (Spellcaster Draft)}
\textbf{Current Load:} {{movement.load}} \\
\textbf{Capacity:} {{movement.capacity}} \\
\small
\textbf{Items by Container:} {{inventory.itemsByContainer}} \\
\textbf{Equipped Magic Items:} {{inventory.equippedMagicItems}}
\normalsize
\end{document}
`
