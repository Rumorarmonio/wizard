export type WizardStepId = 'account' | 'profile' | 'preferences' | 'review' | 'complete'

export type WizardInterest = 'automation' | 'analytics' | 'design' | 'growth' | 'engineering'

export type WizardNotificationChannel = 'email' | 'sms' | 'push'

export type WizardWorkspaceMode = 'solo' | 'team'

export interface WizardAccountData {
  email: string
  password: string
}

export interface WizardProfileData {
  firstName: string
  lastName: string
  jobTitle: string
  location: string
}

export interface WizardPreferencesData {
  interests: WizardInterest[]
  notifications: WizardNotificationChannel[]
  workspaceMode: WizardWorkspaceMode
}

export interface WizardFormData {
  account: WizardAccountData
  profile: WizardProfileData
  preferences: WizardPreferencesData
}

export interface WizardDraft {
  version: number
  currentStep: WizardStepId
  completedSteps: WizardStepId[]
  data: WizardFormData
  lastUpdatedAt: string | null
}
