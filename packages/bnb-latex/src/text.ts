/** `knowledge-arcana` -> `Knowledge Arcana`. */
export function formatTitleKey(key: string): string {
  return key
    .split('-')
    .map((part) => {
      if (part.length === 0) {
        return part
      }
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(' ')
}
