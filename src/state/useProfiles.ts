import { useState } from 'react'

import type { Profile } from '../lib/profiles'
import { createProfile, sameName } from '../lib/profiles'
import { loadProfiles, saveProfiles } from '../lib/storage'
import type { Workspace } from '../types/workbench'

export interface ProfileStore {
  profiles: Profile[]
  /** Saves the workspace's tables, replacing any profile already using the name. */
  save: (name: string, workspace: Workspace) => void
  /** Re-captures an existing profile from the workspace, keeping its id and name. */
  update: (id: string, workspace: Workspace) => void
  remove: (id: string) => void
}

/**
 * Saved table setups. They outlive any one workspace, so they sit beside the
 * document rather than in it, and are written through on every change.
 */
export function useProfiles(): ProfileStore {
  const [profiles, setProfiles] = useState<Profile[]>(loadProfiles)

  const commit = (next: Profile[]) => {
    saveProfiles(next)
    setProfiles(next)
  }

  return {
    profiles,

    save: (name, workspace) => {
      const profile = createProfile(name, workspace)
      const existing = profiles.find((p) => sameName(p.name, name))
      commit(
        existing
          ? profiles.map((p) => (p.id === existing.id ? { ...profile, id: existing.id } : p))
          : [...profiles, profile],
      )
    },

    update: (id, workspace) => {
      const existing = profiles.find((p) => p.id === id)
      if (!existing) return
      const profile = createProfile(existing.name, workspace)
      commit(profiles.map((p) => (p.id === id ? { ...profile, id } : p)))
    },

    remove: (id) => commit(profiles.filter((p) => p.id !== id)),
  }
}
