import { useState } from 'react'

import { cx } from '../lib/cx'
import { profileMeta } from '../lib/labels'
import type { Profile } from '../lib/profiles'
import { fitsShape, sameName } from '../lib/profiles'
import { Modal } from './Modal'
import styles from './ProfilesModal.module.css'

interface ProfilesModalProps {
  profiles: Profile[]
  /** Seeds the name box — the workspace name. */
  defaultName: string
  /** Shape of the loaded records, for the "fits this data" badge. */
  shape: string
  /** What saving right now would capture. */
  setup: string
  onSave: (name: string) => void
  onUpdate: (id: string) => void
  onDelete: (id: string) => void
  onLoad: (profile: Profile) => void
  onClose: () => void
}

const HINT = 'profiles store columns, filters and sort — not the data'
const EMPTY =
  'No profiles yet. Save the current columns, filters and sort to reuse them on data of the same shape.'

export function ProfilesModal({
  profiles,
  defaultName,
  shape,
  setup,
  onSave,
  onUpdate,
  onDelete,
  onLoad,
  onClose,
}: ProfilesModalProps) {
  const [draft, setDraft] = useState(defaultName)

  const name = draft.trim()
  // Saving under a name already in the list replaces it rather than adding a twin.
  const replacing = profiles.some((p) => sameName(p.name, name))

  const save = () => {
    if (!name) return
    onSave(name)
  }

  return (
    <Modal
      title="Profiles"
      subtitle="saved table configurations"
      width={600}
      onClose={onClose}
      footer={
        <>
          <span className={styles.hint}>{HINT}</span>
          <button type="button" className="wb-btn" style={{ marginLeft: 'auto' }} onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div className={styles.save}>
        <label className={cx('wb-field', styles.field)}>
          <span className="wb-label">Save current setup</span>
          <input
            className="wb-input"
            value={draft}
            placeholder="profile name"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') save()
            }}
          />
        </label>
        <button type="button" className="wb-btn-primary" disabled={!name} onClick={save}>
          {replacing ? 'Replace' : 'Save'}
        </button>
      </div>
      <div className={styles.setup}>{setup}</div>

      <div className={styles.list}>
        {profiles.map((profile) => (
          <div key={profile.id} className={styles.row}>
            <div className={styles.labels}>
              <div className={styles.nameRow}>
                <span className={styles.name}>{profile.name}</span>
                {fitsShape(profile, shape) ? (
                  <span className={styles.fits} title="Saved from data with the same top-level keys">
                    fits this data
                  </span>
                ) : null}
              </div>
              <span className={styles.meta}>{profileMeta(profile)}</span>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className="wb-btn wb-btn-sm wb-btn-accent"
                onClick={() => onLoad(profile)}
              >
                Load
              </button>
              <button
                type="button"
                className="wb-btn wb-btn-sm"
                title="Replace with the current setup"
                onClick={() => onUpdate(profile.id)}
              >
                Update
              </button>
              <button
                type="button"
                className={styles.delete}
                title="Delete profile"
                aria-label={`Delete ${profile.name}`}
                onClick={() => onDelete(profile.id)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
        {profiles.length === 0 ? <div className={styles.empty}>{EMPTY}</div> : null}
      </div>
    </Modal>
  )
}
