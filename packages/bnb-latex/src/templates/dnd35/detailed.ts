export const DND35_DETAILED_TEMPLATE = String.raw`\documentclass[11pt]{article}
\usepackage[margin=0.5in]{geometry}
\begin{document}
\section*{D\&D 3.5 Character Sheet (Detailed)}
\subsection*{Character Description}
\begin{tabular}{|l|l|}
\hline
Name & {{character.name}} \\
Player & {{character.player}} \\
Race & {{character.race}} \\
Alignment & {{character.alignment}} \\
Classes & {{character.classes}} \\
Level & {{character.level}} \\
Size & {{character.size}} \\
Sex & {{character.sex}} \\
Age & {{character.age}} \\
Height & {{character.height}} \\
Weight & {{character.weight}} \\
Eyes & {{character.eyes}} \\
Hair & {{character.hair}} \\
Complexion & {{character.complexion}} \\
Build & {{character.build}} \\
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

\subsection*{Saves and Defenses}
\begin{tabular}{|l|l|l|l|l|}
\hline
Fortitude & Reflex & Will & Initiative & HP \\
\hline
{{saves.fortitude}} & {{saves.reflex}} & {{saves.will}} & {{combat.initiative}} & {{combat.hp}} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|}
\hline
AC & Touch AC & Flat-Footed AC & ACP & Max DEX \\
\hline
{{combat.ac}} & {{combat.touchAc}} & {{combat.flatFootedAc}} & {{combat.acp}} & {{combat.maxDex}} \\
\hline
\end{tabular}

\textbf{Defense Special:} {{combat.defenseSpecial}} \\

\subsection*{Movement}
\textbf{Speed:} {{movement.speed}} \\
\textbf{Run:} {{movement.run}} \\

\subsection*{Skills}
{{skills.summary}} \\

\subsection*{Equipped Magic Items}
{{inventory.equippedMagicItems}} \\
\end{document}
`
