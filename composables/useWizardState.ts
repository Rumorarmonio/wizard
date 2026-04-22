import { computed, watch } from 'vue'

import {
  WIZARD_STEP_ORDER,
  createInitialWizardDraft,
  getNextWizardStep,
  getPreviousWizardStep,
} from '../lib/wizard'
import { clearWizardDraft, loadWizardDraft, saveWizardDraft } from '../lib/wizard-storage'
import type {
  WizardAccountData,
  WizardDraft,
  WizardPreferencesData,
  WizardProfileData,
  WizardStepId,
} from '../types/wizard'

export const useWizardState = () => {
  const draft = useState<WizardDraft>('wizard-draft', createInitialWizardDraft)
  const hasHydrated = useState<boolean>('wizard-draft-hydrated', () => false)
  const hasPersistenceSync = useState<boolean>('wizard-draft-persistence-sync', () => false)
  const skipNextPersist = useState<boolean>('wizard-draft-skip-next-persist', () => false)

  const persistDraft = () => {
    saveWizardDraft({
      ...draft.value,
      lastUpdatedAt: new Date().toISOString(),
    })
  }

  if (import.meta.client && !hasPersistenceSync.value) {
    hasPersistenceSync.value = true

    watch(
      draft,
      () => {
        if (!hasHydrated.value) {
          return
        }

        if (skipNextPersist.value) {
          skipNextPersist.value = false
          return
        }

        persistDraft()
      },
      { deep: true },
    )
  }

  const hydrate = () => {
    if (!import.meta.client || hasHydrated.value) {
      return
    }

    const storedDraft = loadWizardDraft()

    if (storedDraft) {
      draft.value = storedDraft
    }

    hasHydrated.value = true
  }

  hydrate()

  const currentStep = computed(() => draft.value.currentStep)
  const currentStepIndex = computed(() => WIZARD_STEP_ORDER.indexOf(draft.value.currentStep))
  const nextStep = computed(() => getNextWizardStep(draft.value.currentStep))
  const previousStep = computed(() => getPreviousWizardStep(draft.value.currentStep))
  const isFirstStep = computed(() => currentStepIndex.value <= 0)
  const isLastStep = computed(() => currentStepIndex.value === WIZARD_STEP_ORDER.length - 1)

  const setCurrentStep = (stepId: WizardStepId) => {
    draft.value.currentStep = stepId
  }

  const goToNextStep = () => {
    if (!nextStep.value) {
      return
    }

    draft.value.currentStep = nextStep.value
  }

  const goToPreviousStep = () => {
    if (!previousStep.value) {
      return
    }

    draft.value.currentStep = previousStep.value
  }

  const markStepCompleted = (stepId: WizardStepId) => {
    if (draft.value.completedSteps.includes(stepId)) {
      return
    }

    draft.value.completedSteps.push(stepId)
  }

  const resetDraft = () => {
    skipNextPersist.value = true
    draft.value = createInitialWizardDraft()
    hasHydrated.value = true
    clearWizardDraft()
  }

  const updateAccount = (patch: Partial<WizardAccountData>) => {
    draft.value.data.account = {
      ...draft.value.data.account,
      ...patch,
    }
  }

  const updateProfile = (patch: Partial<WizardProfileData>) => {
    draft.value.data.profile = {
      ...draft.value.data.profile,
      ...patch,
    }
  }

  const updatePreferences = (patch: Partial<WizardPreferencesData>) => {
    draft.value.data.preferences = {
      ...draft.value.data.preferences,
      ...patch,
    }
  }

  return {
    draft,
    currentStep,
    currentStepIndex,
    nextStep,
    previousStep,
    hasHydrated,
    isFirstStep,
    isLastStep,
    stepOrder: WIZARD_STEP_ORDER,
    hydrate,
    setCurrentStep,
    goToNextStep,
    goToPreviousStep,
    markStepCompleted,
    resetDraft,
    updateAccount,
    updateProfile,
    updatePreferences,
  }
}
