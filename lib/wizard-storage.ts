import {
  WIZARD_INTEREST_OPTIONS,
  WIZARD_NOTIFICATION_OPTIONS,
  WIZARD_STORAGE_VERSION,
  WIZARD_WORKSPACE_MODE_OPTIONS,
  createInitialWizardDraft,
  isWizardStepId,
  sanitizeCompletedSteps,
} from '~~/lib/wizard'
import type {
  WizardDraft,
  WizardInterest,
  WizardNotificationChannel,
  WizardWorkspaceMode,
} from '~~/types/wizard'

const WIZARD_STORAGE_KEY = 'wizard:onboarding:draft'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

const sanitizeArray = <T extends string>(value: unknown, allowedValues: readonly T[]): T[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const uniqueValues = new Set<T>()

  for (const item of value) {
    if (typeof item === 'string' && allowedValues.includes(item as T)) {
      uniqueValues.add(item as T)
    }
  }

  return Array.from(uniqueValues)
}

export const normalizeWizardDraft = (value: unknown): WizardDraft | null => {
  if (!isRecord(value)) {
    return null
  }

  const defaultDraft = createInitialWizardDraft()
  const data = isRecord(value.data) ? value.data : {}
  const account = isRecord(data.account) ? data.account : {}
  const profile = isRecord(data.profile) ? data.profile : {}
  const preferences = isRecord(data.preferences) ? data.preferences : {}

  const currentStep = isWizardStepId(value.currentStep)
    ? value.currentStep
    : defaultDraft.currentStep
  const workspaceMode = WIZARD_WORKSPACE_MODE_OPTIONS.includes(
    preferences.workspaceMode as WizardWorkspaceMode,
  )
    ? (preferences.workspaceMode as WizardWorkspaceMode)
    : defaultDraft.data.preferences.workspaceMode

  const interests = sanitizeArray<WizardInterest>(preferences.interests, WIZARD_INTEREST_OPTIONS)
  const notifications = sanitizeArray<WizardNotificationChannel>(
    preferences.notifications,
    WIZARD_NOTIFICATION_OPTIONS,
  )

  return {
    version:
      typeof value.version === 'number' && value.version >= WIZARD_STORAGE_VERSION
        ? value.version
        : WIZARD_STORAGE_VERSION,
    currentStep,
    completedSteps: sanitizeCompletedSteps(value.completedSteps),
    data: {
      account: {
        email: asString(account.email),
        password: asString(account.password),
      },
      profile: {
        firstName: asString(profile.firstName),
        lastName: asString(profile.lastName),
        jobTitle: asString(profile.jobTitle),
        location: asString(profile.location),
      },
      preferences: {
        interests,
        notifications:
          notifications.length > 0 ? notifications : defaultDraft.data.preferences.notifications,
        workspaceMode,
      },
    },
    lastUpdatedAt: typeof value.lastUpdatedAt === 'string' ? value.lastUpdatedAt : null,
  }
}

export const loadWizardDraft = (): WizardDraft | null => {
  if (!import.meta.client) {
    return null
  }

  const storedValue = window.localStorage.getItem(WIZARD_STORAGE_KEY)

  if (!storedValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(storedValue) as unknown

    return normalizeWizardDraft(parsedValue)
  } catch {
    return null
  }
}

export const saveWizardDraft = (draft: WizardDraft): void => {
  if (!import.meta.client) {
    return
  }

  window.localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(draft))
}

export const clearWizardDraft = (): void => {
  if (!import.meta.client) {
    return
  }

  window.localStorage.removeItem(WIZARD_STORAGE_KEY)
}
