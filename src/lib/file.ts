/** Extensions offered by the source file picker. */
export const SOURCE_FILE_ACCEPT = '.json,.jsonl,.ndjson,.txt,application/json,text/plain'

/** Reads a picked or dropped file as text. Nothing leaves the tab. */
export function readTextFile(file: File): Promise<string> {
  return file.text()
}

/** The first file of a drag payload, or null when the drag carried no file. */
export function firstFile(list: FileList | null | undefined): File | null {
  return list && list.length > 0 ? list[0] : null
}

/** True when a drag is carrying files rather than selected text. */
export function isFileDrag(types: readonly string[]): boolean {
  return types.includes('Files')
}
