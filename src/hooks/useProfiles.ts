import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { hasPortugueseData, migrateProfileData } from '../utils/migration';
import { ProfileSettings } from '../utils/inventory';

const PROFILES_KEY = 'user_profiles';
const ACTIVE_PROFILE_KEY = 'active_user_profile';
const DEFAULT_PROFILE = 'Default';
const PROFILE_DATA_KEYS = ['products', 'withdrawn', 'blacklist', 'flagged', 'settings', 'fractioning'];
const DEFAULT_PROFILE_SETTINGS: ProfileSettings = { flagFunctionEnabled: false, singleProductResultEnabled: false };

const getProfileSettings = (profileName: string): ProfileSettings => {
  try {
    const raw = window.localStorage.getItem(`profile_${profileName}_settings`);
    if (raw) return { ...DEFAULT_PROFILE_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PROFILE_SETTINGS;
};

const saveProfileSettings = async (profileName: string, settings: ProfileSettings) => {
  const key = `profile_${profileName}_settings`;
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  if (isTauri) {
    try {
      const fs = await import('@tauri-apps/plugin-fs');
      await fs.writeTextFile(`${key}.json`, JSON.stringify(settings), { baseDir: fs.BaseDirectory.AppLocalData });
      return;
    } catch (e) {
      console.warn('[saveProfileSettings] Tauri write failed, falling back:', e);
    }
  }
  window.localStorage.setItem(key, JSON.stringify(settings));
};

// Helper to trigger file download
const downloadFile = async (filename: string, content: string) => {
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  
  if (isTauri) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      
      const filePath = await save({
        defaultPath: filename,
        filters: [{ name: 'JSON Backup', extensions: ['json'] }]
      });
      
      if (filePath) {
        await writeTextFile(filePath, content);
      }
      return;
    } catch (err) {
      console.warn("Tauri save failed, falling back to web download:", err);
    }
  }
  
  try {
    const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error saving file:", error);
  }
};

// Helper function to get the profiled key
const getProfiledKey = (profile: string, key: string): string => {
  return `profile_${profile}_${key}`;
};

export function useProfiles() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<string[]>([]);
  const [activeProfile, setActiveProfileState] = useState<string>(DEFAULT_PROFILE);
  const [activeProfileSettings, setActiveProfileSettingsState] = useState<ProfileSettings>(DEFAULT_PROFILE_SETTINGS);

  const refreshProfiles = useCallback(() => {
    try {
      const storedProfiles = window.localStorage.getItem(PROFILES_KEY);
      const storedActiveProfile = window.localStorage.getItem(ACTIVE_PROFILE_KEY);

      let parsedProfiles = storedProfiles ? JSON.parse(storedProfiles) : [DEFAULT_PROFILE];
      if (!Array.isArray(parsedProfiles) || parsedProfiles.length === 0) {
        parsedProfiles = [DEFAULT_PROFILE];
        window.localStorage.setItem(PROFILES_KEY, JSON.stringify(parsedProfiles));
      }
      setProfiles(parsedProfiles);

      let initialActive = DEFAULT_PROFILE;
      if (storedActiveProfile && parsedProfiles.includes(storedActiveProfile)) {
        initialActive = storedActiveProfile;
      } else {
        const newActive = parsedProfiles[0];
        initialActive = newActive;
        window.localStorage.setItem(ACTIVE_PROFILE_KEY, newActive);
      }
      setActiveProfileState(initialActive);
      setActiveProfileSettingsState(getProfileSettings(initialActive));

      // check if initial active profile has Portuguese data
      if (hasPortugueseData(initialActive)) {
        migrateProfileData(initialActive);
      }

    } catch (error) {
      console.error("Failed to load profiles from localStorage.", error);
      setProfiles([DEFAULT_PROFILE]);
      setActiveProfileState(DEFAULT_PROFILE);
      setActiveProfileSettingsState(DEFAULT_PROFILE_SETTINGS);
      window.localStorage.setItem(PROFILES_KEY, JSON.stringify([DEFAULT_PROFILE]));
      window.localStorage.setItem(ACTIVE_PROFILE_KEY, DEFAULT_PROFILE);
    }
  }, [t]);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  const setActiveProfile = useCallback((profileName: string) => {
    if (profiles.includes(profileName)) {
      try {
        // Check for migration before switching
        if (hasPortugueseData(profileName)) {
            migrateProfileData(profileName);
        }

        window.localStorage.setItem(ACTIVE_PROFILE_KEY, profileName);
        setActiveProfileState(profileName);
        setActiveProfileSettingsState(getProfileSettings(profileName));
        window.dispatchEvent(new CustomEvent('profileChanged'));
      } catch (error) {
        console.error(`Failed to set active profile to "${profileName}".`, error);
      }
    }
  }, [profiles, t]);

  const updateActiveProfileSettings = useCallback(async (settings: ProfileSettings) => {
    await saveProfileSettings(activeProfile, settings);
    setActiveProfileSettingsState(settings);
    window.dispatchEvent(new CustomEvent('profileSettingsChanged'));
  }, [activeProfile]);

  // Every component calling this hook holds its own copy of the active profile. A switch made in
  // one copy (the profile picker) must reach the others, or the context keeps the old profile's
  // settings and learning until a reload.
  useEffect(() => {
    const handleProfileChanged = () => {
      const storedActive = window.localStorage.getItem(ACTIVE_PROFILE_KEY) || DEFAULT_PROFILE;
      setActiveProfileState(storedActive);
      setActiveProfileSettingsState(getProfileSettings(storedActive));
    };
    const handleSettingsChanged = () => {
      const storedActive = window.localStorage.getItem(ACTIVE_PROFILE_KEY) || DEFAULT_PROFILE;
      setActiveProfileSettingsState(getProfileSettings(storedActive));
    };
    window.addEventListener('profileChanged', handleProfileChanged);
    window.addEventListener('profileSettingsChanged', handleSettingsChanged);
    return () => {
      window.removeEventListener('profileChanged', handleProfileChanged);
      window.removeEventListener('profileSettingsChanged', handleSettingsChanged);
    };
  }, []);

  const createProfile = useCallback((profileName: string, settings: ProfileSettings = DEFAULT_PROFILE_SETTINGS) => {
    if (profileName && !profiles.includes(profileName)) {
      try {
        window.localStorage.setItem(`profile_${profileName}_settings`, JSON.stringify(settings));
        const newProfiles = [...profiles, profileName];
        window.localStorage.setItem(PROFILES_KEY, JSON.stringify(newProfiles));
        window.location.reload();
      } catch (error) {
        console.error(`Failed to create new profile "${profileName}".`, error);
      }
    }
  }, [profiles]);

  const deleteProfile = useCallback((profileNameToDelete: string) => {
    if (profileNameToDelete === DEFAULT_PROFILE) {
      return;
    }
    if (profileNameToDelete === activeProfile) {
      return;
    }
    try {
      PROFILE_DATA_KEYS.forEach(key => {
        window.localStorage.removeItem(getProfiledKey(profileNameToDelete, key));
      });
      const newProfiles = profiles.filter(p => p !== profileNameToDelete);
      window.localStorage.setItem(PROFILES_KEY, JSON.stringify(newProfiles));
      window.location.reload();
    } catch (error) {
      console.error(`Failed to delete profile "${profileNameToDelete}".`, error);
    }
  }, [profiles, activeProfile]);

  const backupProfile = useCallback(async (profileNameToBackup: string): Promise<{ success: boolean; isEmpty: boolean }> => {
    try {
      let totalItems = 0;
      const backupData: { [key: string]: any } = {};
      
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      
      for (const key of PROFILE_DATA_KEYS) {
        const storageKey = getProfiledKey(profileNameToBackup, key);
        let data: any = null;

        if (isTauri) {
          try {
            const fs = await import('@tauri-apps/plugin-fs');
            const fileExists = await fs.exists(`${storageKey}.json`, { baseDir: fs.BaseDirectory.AppLocalData });
            if (fileExists) {
              const fileContent = await fs.readTextFile(`${storageKey}.json`, { baseDir: fs.BaseDirectory.AppLocalData });
              data = JSON.parse(fileContent);
            }
          } catch (e) {
            console.warn(`[Backup] Tauri FS read failed for ${key}, trying localStorage`, e);
          }
        }
        
        // Fallback to localStorage
        if (!data) {
          const partsMeta = window.localStorage.getItem(`${storageKey}_parts`);
          if (partsMeta) {
            try {
              const partsCount = Number(partsMeta);
              const items: any[] = [];
              for (let i = 0; i < partsCount; i++) {
                const part = window.localStorage.getItem(`${storageKey}_part_${i}`);
                if (part) {
                  const parsedPart = JSON.parse(part);
                  if (Array.isArray(parsedPart)) items.push(...parsedPart);
                  else items.push(parsedPart);
                }
              }
              data = items;
            } catch (e) {
              console.warn(`[Backup] Failed to reconstruct chunks for ${key}`, e);
            }
          }
          if (!data) {
            const item = window.localStorage.getItem(storageKey);
            data = item ? JSON.parse(item) : [];
          }
        }

        backupData[key] = data;
        if (Array.isArray(data)) totalItems += data.length;
      }

      const backupObject = {
        profileName: profileNameToBackup,
        backupDate: new Date().toISOString(),
        data: backupData,
      };

      const date = new Date().toISOString().split('T')[0];
      await downloadFile(`backup-${profileNameToBackup}-${date}.json`, JSON.stringify(backupObject, null, 2));
      return { success: true, isEmpty: totalItems === 0 };
    } catch (error) {
      console.error(`Failed to backup profile "${profileNameToBackup}".`, error);
      return { success: false, isEmpty: true };
    }
  }, []);

  const restoreProfile = useCallback(async (backupContent: string) => {
    try {
      const backupObject = JSON.parse(backupContent);
      const profileNameFromBackup = backupObject.profileName;

      if (!backupObject.data || !profileNameFromBackup) {
        throw new Error("Invalid or corrupted backup file.");
      }

      const profileExists = profiles.includes(profileNameFromBackup);
      let confirmation = true;

      // Handle legacy Portuguese keys in backup
      const mappedData: { [key: string]: any } = {};
      const ptToEn: { [key: string]: string } = {
          'produtos': 'products',
          'retirados': 'withdrawn',
          'blacklist': 'blacklist'
      };

      Object.keys(backupObject.data).forEach(key => {
          const enKey = ptToEn[key] || key;
          mappedData[enKey] = backupObject.data[key];
      });

      if (profileExists) {
        confirmation = window.confirm(t('profile.deleteConfirm', { name: profileNameFromBackup }));
      }

      if (!confirmation) return;

      if (!profileExists) {
        const newProfiles = [...profiles, profileNameFromBackup];
        window.localStorage.setItem(PROFILES_KEY, JSON.stringify(newProfiles));
      }

      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      
      for (const key of PROFILE_DATA_KEYS) {
        if (mappedData[key]) {
          if (isTauri) {
            try {
              const fs = await import('@tauri-apps/plugin-fs');
              await fs.writeTextFile(
                `${getProfiledKey(profileNameFromBackup, key)}.json`,
                JSON.stringify(mappedData[key]),
                { baseDir: fs.BaseDirectory.AppLocalData }
              );
            } catch (e) {
              console.warn(`[Restore] Tauri FS write failed for ${key}, writing to localStorage`, e);
              window.localStorage.setItem(getProfiledKey(profileNameFromBackup, key), JSON.stringify(mappedData[key]));
            }
          } else {
            window.localStorage.setItem(getProfiledKey(profileNameFromBackup, key), JSON.stringify(mappedData[key]));
          }
        }
      }

      window.location.reload();

    } catch (error) {
      console.error(`Failed to restore profile.`, error);
    }
  }, [profiles, t]);

  const editProfileName = useCallback(async (oldName: string, newName: string) => {
    if (!newName || oldName === newName) return;
    if (oldName === DEFAULT_PROFILE) return;
    if (profiles.includes(newName)) return;

    try {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      
      for (const key of PROFILE_DATA_KEYS) {
        if (isTauri) {
          try {
            const fs = await import('@tauri-apps/plugin-fs');
            const oldFile = `${getProfiledKey(oldName, key)}.json`;
            const newFile = `${getProfiledKey(newName, key)}.json`;
            const oldExists = await fs.exists(oldFile, { baseDir: fs.BaseDirectory.AppLocalData });
            if (oldExists) {
              const content = await fs.readTextFile(oldFile, { baseDir: fs.BaseDirectory.AppLocalData });
              await fs.writeTextFile(newFile, content, { baseDir: fs.BaseDirectory.AppLocalData });
              await fs.remove(oldFile, { baseDir: fs.BaseDirectory.AppLocalData });
            }
          } catch (e) {
            console.warn(`[Rename] Tauri FS rename failed for ${key}, using localStorage`, e);
          }
        }
        // Also migrate localStorage keys (web fallback)
        const data = window.localStorage.getItem(getProfiledKey(oldName, key));
        if (data) {
          window.localStorage.setItem(getProfiledKey(newName, key), data);
          window.localStorage.removeItem(getProfiledKey(oldName, key));
        }
      }

      const newProfiles = profiles.map(p => (p === oldName ? newName : p));
      window.localStorage.setItem(PROFILES_KEY, JSON.stringify(newProfiles));

      if (activeProfile === oldName) {
        window.localStorage.setItem(ACTIVE_PROFILE_KEY, newName);
      }

      window.location.reload();

    } catch (error) {
      console.error(`Failed to rename profile "${oldName}".`, error);
    }
  }, [profiles, activeProfile]);

  return { profiles, activeProfile, setActiveProfile, createProfile, deleteProfile, backupProfile, restoreProfile, editProfileName, activeProfileSettings, updateActiveProfileSettings };
}
