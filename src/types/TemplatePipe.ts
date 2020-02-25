/**
 * Represents a variable-length tuple containing a template pipe function
 * identifier, where any remaining values are additional values passed to
 * the pipe function at runtime after the piped-in value
 * @internal
 */
export type TemplatePipe = [string, ...(string | number | boolean)[]];
