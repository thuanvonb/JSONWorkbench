import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'

import { cx } from '../lib/cx'
import { SOURCE_FILE_ACCEPT, firstFile, isFileDrag, readTextFile } from '../lib/file'
import { Modal } from './Modal'
import styles from './SourceModal.module.css'

interface SourceModalProps {
  workspaceName: string
  raw: string
  error: string
  onParse: (text: string) => void
  onLoadDemo: () => void
  onClose: () => void
}

const HINT = 'JSON, JSONL/NDJSON and JSON streams all work. Drop a file anywhere in the box.'

/**
 * The textarea is uncontrolled: pasting a multi-megabyte payload should not
 * re-render the app on every keystroke.
 */
export function SourceModal({ workspaceName, raw, error, onParse, onLoadDemo, onClose }: SourceModalProps) {
  const textarea = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [fileError, setFileError] = useState('')
  const [dragging, setDragging] = useState(false)

  const parse = (text: string) => {
    setFileError('')
    onParse(text)
  }

  // A picked file drops straight into the textarea and parses; a failure leaves
  // the modal open with the text still editable.
  const loadFile = async (file: File | null) => {
    if (!file) return
    setDragging(false)
    try {
      const text = await readTextFile(file)
      if (textarea.current) textarea.current.value = text
      parse(text)
    } catch (err) {
      setFileError(`Could not read ${file.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const pickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = firstFile(event.target.files)
    // Clearing the input lets the same file be picked again after an edit.
    event.target.value = ''
    void loadFile(file)
  }

  const onDragOver = (event: DragEvent<HTMLTextAreaElement>) => {
    if (!isFileDrag(event.dataTransfer.types)) return
    event.preventDefault()
    setDragging(true)
  }

  const onDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    const file = firstFile(event.dataTransfer.files)
    if (!file) return
    // Without this the browser navigates away to the dropped file.
    event.preventDefault()
    void loadFile(file)
  }

  return (
    <Modal
      title="Source JSON"
      subtitle={workspaceName}
      width={860}
      onClose={onClose}
      footer={
        <>
          <span className={styles.hint}>{HINT}</span>
          <button
            type="button"
            className={`wb-btn ${styles.spacer}`}
            onClick={() => fileInput.current?.click()}
          >
            Open file…
          </button>
          <button type="button" className="wb-btn" onClick={onLoadDemo}>
            Sample data
          </button>
          <button type="button" className="wb-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="wb-btn-primary" onClick={() => parse(textarea.current?.value ?? '')}>
            Parse &amp; build table
          </button>
        </>
      }
    >
      <input
        ref={fileInput}
        type="file"
        className={styles.fileInput}
        accept={SOURCE_FILE_ACCEPT}
        onChange={pickFile}
        aria-label="Open a JSON or JSONL file"
      />
      <textarea
        ref={textarea}
        className={cx(styles.textarea, dragging && styles.dragging)}
        defaultValue={raw}
        placeholder="Paste a JSON object, an array of objects, or JSONL — or drop a file here…"
        spellCheck={false}
        aria-label="Source JSON"
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      />
      {fileError || error ? <div className={styles.error}>{fileError || error}</div> : null}
    </Modal>
  )
}
