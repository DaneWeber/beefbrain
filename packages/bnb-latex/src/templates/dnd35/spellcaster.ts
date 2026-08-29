export const DND35_SPELLCASTER_TEMPLATE = String.raw`\documentclass[11pt]{article}
\usepackage[margin=0.5in]{geometry}
\begin{document}
\section*{D\&D 3.5 Character Sheet (Spellcaster)}
\textbf{Name:} {{character.name}} \hfill \textbf{Player:} {{character.player}} \\
\textbf{Classes:} {{character.classes}} \hfill \textbf{Level:} {{character.level}} \\

\subsection*{Casting Stats}
\begin{tabular}{|l|r|r|r|}
\hline
Ability & Score & Mod & Save DC Base \\
\hline
INT & {{abilities.intelligence.score}} & {{abilities.intelligence.mod}} & 10 + spell level + INT mod \\
WIS & {{abilities.wisdom.score}} & {{abilities.wisdom.mod}} & 10 + spell level + WIS mod \\
CHA & {{abilities.charisma.score}} & {{abilities.charisma.mod}} & 10 + spell level + CHA mod \\
\hline
\end{tabular}

\subsection*{Combat}
\textbf{HP:} {{combat.hp}} \\
\textbf{AC:} {{combat.ac}} \\
\textbf{Initiative:} {{combat.initiative}} \\
\end{document}
`
