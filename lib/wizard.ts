import type {
  WizardAccountData,
  WizardDraft,
  WizardFormData,
  WizardInterest,
  WizardNotificationChannel,
  WizardPreferencesData,
  WizardProfileData,
  WizardStepId,
  WizardWorkspaceMode,
} from '~~/types/wizard'

export const WIZARD_STORAGE_VERSION = 1

export const WIZARD_STEP_ORDER: WizardStepId[] = [
  'account',
  'profile',
  'preferences',
  'review',
  'complete',
]

export const WIZARD_INTEREST_OPTIONS: WizardInterest[] = [
  'automation',
  'analytics',
  'design',
  'growth',
  'engineering',
]

export const WIZARD_NOTIFICATION_OPTIONS: WizardNotificationChannel[] = ['email', 'sms', 'push']

export const WIZARD_WORKSPACE_MODE_OPTIONS: WizardWorkspaceMode[] = ['solo', 'team']

export const createInitialAccountData = (): WizardAccountData => ({
  email: '',
  password: '',
})

export const createInitialProfileData = (): WizardProfileData => ({
  firstName: '',
  lastName: '',
  jobTitle: '',
  location: '',
})

export const createInitialPreferencesData = (): WizardPreferencesData => ({
  interests: [],
  notifications: ['email'],
  workspaceMode: 'solo',
})

export const createInitialWizardFormData = (): WizardFormData => ({
  account: createInitialAccountData(),
  profile: createInitialProfileData(),
  preferences: createInitialPreferencesData(),
})

export const createInitialWizardDraft = (): WizardDraft => ({
  version: WIZARD_STORAGE_VERSION,
  currentStep: 'account',
  completedSteps: [],
  data: createInitialWizardFormData(),
  lastUpdatedAt: null,
})

export const isWizardStepId = (value: unknown): value is WizardStepId =>
  typeof value === 'string' && WIZARD_STEP_ORDER.includes(value as WizardStepId)

export const getWizardStepIndex = (stepId: WizardStepId): number =>
  WIZARD_STEP_ORDER.indexOf(stepId)

export const getNextWizardStep = (stepId: WizardStepId): WizardStepId | null => {
  const nextIndex = getWizardStepIndex(stepId) + 1

  return WIZARD_STEP_ORDER[nextIndex] ?? null
}

export const getPreviousWizardStep = (stepId: WizardStepId): WizardStepId | null => {
  const previousIndex = getWizardStepIndex(stepId) - 1

  return WIZARD_STEP_ORDER[previousIndex] ?? null
}

export const sanitizeCompletedSteps = (steps: unknown): WizardStepId[] => {
  if (!Array.isArray(steps)) {
    return []
  }

  const uniqueSteps = new Set<WizardStepId>()

  for (const step of steps) {
    if (isWizardStepId(step)) {
      uniqueSteps.add(step)
    }
  }

  return WIZARD_STEP_ORDER.filter((step) => uniqueSteps.has(step))
}
