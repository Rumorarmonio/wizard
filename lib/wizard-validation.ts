import { WIZARD_NOTIFICATION_OPTIONS, WIZARD_WORKSPACE_MODE_OPTIONS } from './wizard'
import type {
  WizardAccountData,
  WizardNotificationChannel,
  WizardPreferencesData,
  WizardProfileData,
  WizardWorkspaceMode,
} from '~~/types/wizard'

export interface WizardAccountErrors {
  email?: string
  password?: string
}

export interface WizardProfileErrors {
  firstName?: string
  lastName?: string
  jobTitle?: string
  location?: string
}

export interface WizardPreferencesErrors {
  interests?: string
  notifications?: string
  workspaceMode?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isNotificationChannel = (value: string): value is WizardNotificationChannel =>
  WIZARD_NOTIFICATION_OPTIONS.includes(value as WizardNotificationChannel)

const isWorkspaceMode = (value: string): value is WizardWorkspaceMode =>
  WIZARD_WORKSPACE_MODE_OPTIONS.includes(value as WizardWorkspaceMode)

export const validateAccountStep = (
  account: WizardAccountData,
): { isValid: boolean; errors: WizardAccountErrors } => {
  const errors: WizardAccountErrors = {}

  if (!account.email.trim()) {
    errors.email = 'Укажите email.'
  } else if (!EMAIL_PATTERN.test(account.email.trim())) {
    errors.email = 'Введите корректный email.'
  }

  if (!account.password.trim()) {
    errors.password = 'Укажите пароль.'
  } else if (account.password.trim().length < 8) {
    errors.password = 'Пароль должен содержать минимум 8 символов.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export const validateProfileStep = (
  profile: WizardProfileData,
): { isValid: boolean; errors: WizardProfileErrors } => {
  const errors: WizardProfileErrors = {}

  if (!profile.firstName.trim()) {
    errors.firstName = 'Укажите имя.'
  }

  if (!profile.lastName.trim()) {
    errors.lastName = 'Укажите фамилию.'
  }

  if (!profile.jobTitle.trim()) {
    errors.jobTitle = 'Укажите роль или должность.'
  }

  if (!profile.location.trim()) {
    errors.location = 'Укажите локацию.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export const validatePreferencesStep = (
  preferences: WizardPreferencesData,
): { isValid: boolean; errors: WizardPreferencesErrors } => {
  const errors: WizardPreferencesErrors = {}

  if (preferences.interests.length === 0) {
    errors.interests = 'Выберите хотя бы одно направление.'
  }

  if (
    preferences.notifications.length === 0 ||
    preferences.notifications.some((item) => !isNotificationChannel(item))
  ) {
    errors.notifications = 'Выберите хотя бы один канал уведомлений.'
  }

  if (!isWorkspaceMode(preferences.workspaceMode)) {
    errors.workspaceMode = 'Выберите формат работы.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
