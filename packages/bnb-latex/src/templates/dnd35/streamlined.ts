export const DND35_STREAMLINED_TEMPLATE = String.raw`\documentclass[11pt]{article}
\usepackage[margin=0.5in]{geometry}
\begin{document}
\section*{D\&D 3.5 Character Sheet (Streamlined)}
\textbf{Name:} {{character.name}} \hfill \textbf{Player:} {{character.player}} \\
\textbf{Race:} {{character.race}} \hfill \textbf{Alignment:} {{character.alignment}} \\
\textbf{Classes:} {{character.classes}} \hfill \textbf{Level:} {{character.level}} \\

\subsection*{Core Combat}
\begin{tabular}{|l|l|l|l|}
\hline
HP & AC & Initiative & Speed \\
\hline
{{combat.hp}} & {{combat.ac}} & {{combat.initiative}} & {{movement.speed}} \\
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
\end{document}
`
