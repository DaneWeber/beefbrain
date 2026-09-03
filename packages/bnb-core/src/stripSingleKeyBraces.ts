/**
 * Strip curly braces from single-key maps anywhere in flow-style YAML text,
 * e.g. [14, {str: 2}] => [14, str: 2] and [1/day, {dc: [19, {base: 13, cha: 6}]}]
 * => [1/day, dc: [19, {base: 13, cha: 6}]], while leaving multi-key maps
 * (and empty maps) untouched.
 *
 * A simple regex can't do this correctly once the single value is itself a
 * nested array/map containing its own commas and braces (the DC/hp-rolls
 * cases), so this walks the string tracking bracket depth. Quoted scalars
 * are skipped so literal `,` / `{` / `}` inside a quoted note never confuse
 * the depth count, and a quote is only treated as opening a scalar when it
 * appears in "value position" (right after `:`, `,`, `[`, `{`, or a newline)
 * — not mid-scalar, e.g. the unquoted `6' 0"` height value.
 */
export function stripSingleKeyBraces(text: string): string {
  interface Frame {
    type: '{' | '['
    start: number
    topLevelCommas: number
    hasTopLevelColon: boolean
  }

  const stack: Frame[] = []
  const removeStarts = new Set<number>()
  const removeEnds = new Set<number>()
  let atValueStart = true

  let i = 0
  while (i < text.length) {
    const ch = text[i]!

    if ((ch === '"' || ch === "'") && atValueStart) {
      const quote = ch
      let j = i + 1
      while (j < text.length) {
        if (text[j] === quote) {
          // Doubled quote is an escaped quote within a single-quoted scalar.
          if (quote === "'" && text[j + 1] === "'") {
            j += 2
            continue
          }
          break
        }
        // Double-quoted scalars use backslash escapes.
        if (quote === '"' && text[j] === '\\') {
          j += 2
          continue
        }
        j++
      }
      i = j + 1
      atValueStart = false
      continue
    }

    if (ch === '{' || ch === '[') {
      stack.push({
        type: ch,
        start: i,
        topLevelCommas: 0,
        hasTopLevelColon: false,
      })
      atValueStart = true
      i++
      continue
    }

    if (ch === '}' || ch === ']') {
      const frame = stack.pop()
      if (frame && ch === '}' && frame.type === '{') {
        if (frame.topLevelCommas === 0 && frame.hasTopLevelColon) {
          removeStarts.add(frame.start)
          removeEnds.add(i)
        }
      }
      atValueStart = false
      i++
      continue
    }

    if (ch === ',') {
      if (stack.length > 0) stack[stack.length - 1]!.topLevelCommas++
      atValueStart = true
      i++
      continue
    }

    if (ch === ':') {
      if (stack.length > 0 && stack[stack.length - 1]!.type === '{') {
        stack[stack.length - 1]!.hasTopLevelColon = true
      }
      atValueStart = true
      i++
      continue
    }

    if (ch === '\n') {
      atValueStart = true
      i++
      continue
    }

    if (ch === ' ' || ch === '\t') {
      // Whitespace doesn't change value-start state either way.
      i++
      continue
    }

    atValueStart = false
    i++
  }

  if (removeStarts.size === 0) return text

  let out = ''
  for (let k = 0; k < text.length; k++) {
    if (!removeStarts.has(k) && !removeEnds.has(k)) out += text[k]
  }
  return out
}
