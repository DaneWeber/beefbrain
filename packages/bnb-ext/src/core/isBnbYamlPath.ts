const BNB_YAML_SUFFIXES = ['.bnb.yaml', '.bnb.yml']
const YAML_SUFFIXES = ['.yaml', '.yml']

/**
 * Determines whether a file path should be treated as BeefBrain character
 * data. Files ending in `.bnb.yaml`/`.bnb.yml` always match. Plain
 * `.yaml`/`.yml` files match only when `associateAllYaml` is enabled (the
 * `bnb.associateAllYaml` setting).
 */
export function isBnbYamlPath(
  filePath: string,
  associateAllYaml: boolean,
): boolean {
  const lower = filePath.toLowerCase()

  if (BNB_YAML_SUFFIXES.some((suffix) => lower.endsWith(suffix))) {
    return true
  }

  return (
    associateAllYaml && YAML_SUFFIXES.some((suffix) => lower.endsWith(suffix))
  )
}
