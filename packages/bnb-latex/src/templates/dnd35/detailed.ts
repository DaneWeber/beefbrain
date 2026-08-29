export const DND35_DETAILED_TEMPLATE = String.raw`\documentclass[11pt]{article}
\usepackage[margin=0.5in]{geometry}
\begin{document}
\section*{D\&D 3.5 Character Sheet (Detailed)}
\textbf{Name:} {{character.name}} \\
\textbf{Player:} {{character.player}} \\
\textbf{Race:} {{character.race}} \\
\textbf{Alignment:} {{character.alignment}} \\
\textbf{Classes:} {{character.classes}} \\
\textbf{Level:} {{character.level}} \\

\subsection*{Combat Summary}
\begin{tabular}{|l|l|l|l|l|}
\hline
HP & AC & Touch AC & Flat-Footed AC & Initiative \\
\hline
{{combat.hp}} & {{combat.ac}} & {{combat.touchAc}} & {{combat.flatFootedAc}} & {{combat.initiative}} \\
\hline
\end{tabular}

\subsection*{Saving Throws}
\begin{tabular}{|l|r|}
\hline
Fortitude & {{saves.fortitude}} \\
Reflex & {{saves.reflex}} \\
Will & {{saves.will}} \\
\hline
\end{tabular}

\subsection*{Movement}
\textbf{Speed:} {{movement.speed}} \\
\textbf{Run:} {{movement.run}} \\
\end{document}
`
