<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import { useWizardState } from '~~/composables/useWizardState'
import {
  WIZARD_INTEREST_OPTIONS,
  WIZARD_NOTIFICATION_OPTIONS,
  WIZARD_WORKSPACE_MODE_OPTIONS,
} from '~~/lib/wizard'
import {
  validateAccountStep,
  validatePreferencesStep,
  validateProfileStep,
} from '~~/lib/wizard-validation'
import type {
  WizardInterest,
  WizardNotificationChannel,
  WizardStepId,
  WizardWorkspaceMode,
} from '~~/types/wizard'

type EditableWizardStepId = Extract<WizardStepId, 'account' | 'profile' | 'preferences'>

interface WizardStepMeta {
  id: EditableWizardStepId
  title: string
  eyebrow: string
  description: string
}

interface WizardValidationMap {
  account: ReturnType<typeof validateAccountStep>
  profile: ReturnType<typeof validateProfileStep>
  preferences: ReturnType<typeof validatePreferencesStep>
}

const stepMetaList: WizardStepMeta[] = [
  {
    id: 'account',
    title: 'Создайте доступ к workspace',
    eyebrow: 'Step 1',
    description: 'Сохраним email и пароль для первичного доступа в onboarding flow.',
  },
  {
    id: 'profile',
    title: 'Заполните профиль команды',
    eyebrow: 'Step 2',
    description: 'Эти данные пригодятся для персонализации интерфейса и summary на Review.',
  },
  {
    id: 'preferences',
    title: 'Настройте интересы и формат работы',
    eyebrow: 'Step 3',
    description: 'Зафиксируем направления интереса, каналы уведомлений и preferred workspace mode.',
  },
]

const editableStepOrder = stepMetaList.map((step) => step.id)
const stepTouchState = reactive<Record<EditableWizardStepId, boolean>>({
  account: false,
  profile: false,
  preferences: false,
})
const hasAlignedStepAfterHydration = reactive({ value: false })

const stageCompletionMessage =
  'Данные базовых шагов сохранены. Review и Complete будут добавлены на следующем этапе.'

const {
  draft,
  hasHydrated,
  currentStep,
  previousStep,
  setCurrentStep,
  goToNextStep,
  goToPreviousStep,
  setCompletedSteps,
} = useWizardState()

const isEditableStep = (stepId: WizardStepId): stepId is EditableWizardStepId =>
  editableStepOrder.includes(stepId as EditableWizardStepId)

const getStepIndex = (stepId: EditableWizardStepId): number => editableStepOrder.indexOf(stepId)

const validations = computed<WizardValidationMap>(() => ({
  account: validateAccountStep(draft.value.data.account),
  profile: validateProfileStep(draft.value.data.profile),
  preferences: validatePreferencesStep(draft.value.data.preferences),
}))

const getContiguousCompletedSteps = (): EditableWizardStepId[] => {
  const completedSteps: EditableWizardStepId[] = []

  for (const stepId of editableStepOrder) {
    if (!validations.value[stepId].isValid) {
      break
    }

    completedSteps.push(stepId)
  }

  return completedSteps
}

const getHighestUnlockedStepIndex = (): number =>
  Math.min(getContiguousCompletedSteps().length, editableStepOrder.length - 1)

const getCurrentEditableStepIndex = (): number => {
  if (!isEditableStep(currentStep.value)) {
    return 0
  }

  return getStepIndex(currentStep.value)
}

const areStepListsEqual = (left: EditableWizardStepId[], right: EditableWizardStepId[]): boolean =>
  left.length === right.length && left.every((stepId, index) => stepId === right[index])

const clampStepToEditableRange = () => {
  const fallbackStepId = editableStepOrder[getHighestUnlockedStepIndex()]

  if (!isEditableStep(currentStep.value)) {
    setCurrentStep(fallbackStepId)
    return
  }

  if (getStepIndex(currentStep.value) > getHighestUnlockedStepIndex()) {
    setCurrentStep(fallbackStepId)
  }
}

const syncWizardProgress = () => {
  const nextCompletedSteps = getContiguousCompletedSteps()
  const currentCompletedSteps = draft.value.completedSteps.filter(isEditableStep)

  if (!areStepListsEqual(currentCompletedSteps, nextCompletedSteps)) {
    setCompletedSteps(nextCompletedSteps)
  }

  clampStepToEditableRange()
}

watch(
  () => draft.value.data,
  () => {
    if (!hasHydrated.value) {
      return
    }

    syncWizardProgress()
  },
  { deep: true },
)

watch(currentStep, () => {
  if (!hasHydrated.value) {
    return
  }

  clampStepToEditableRange()
})

watch(
  hasHydrated,
  (isHydrated) => {
    if (!isHydrated) {
      return
    }

    syncWizardProgress()

    if (!hasAlignedStepAfterHydration.value) {
      hasAlignedStepAfterHydration.value = true

      const fallbackStepId = editableStepOrder[getHighestUnlockedStepIndex()]

      if (getCurrentEditableStepIndex() < getStepIndex(fallbackStepId)) {
        setCurrentStep(fallbackStepId)
      }
    }
  },
  { immediate: true },
)

const currentEditableStep = computed<EditableWizardStepId>(() =>
  isEditableStep(currentStep.value) ? currentStep.value : editableStepOrder[0],
)

const currentMeta = computed(
  () => stepMetaList.find((step) => step.id === currentEditableStep.value) ?? stepMetaList[0],
)

const stepErrors = computed<Record<EditableWizardStepId, Record<string, string | undefined>>>(
  () => ({
    account: validations.value.account.errors,
    profile: validations.value.profile.errors,
    preferences: validations.value.preferences.errors,
  }),
)
const currentErrorList = computed<string[]>(() =>
  Object.values(stepErrors.value[currentEditableStep.value]).filter(
    (message): message is string => typeof message === 'string' && message.length > 0,
  ),
)
const completedEditableSteps = computed<EditableWizardStepId[]>(() => {
  const completedFromDraft = draft.value.completedSteps.filter(isEditableStep)
  const completedFromCurrentStep = editableStepOrder.slice(0, getCurrentEditableStepIndex())

  return completedFromDraft.length > completedFromCurrentStep.length
    ? completedFromDraft
    : completedFromCurrentStep
})
const progressValue = computed(
  () => ((getStepIndex(currentEditableStep.value) + 1) / editableStepOrder.length) * 100,
)
const lastSavedLabel = computed(() => {
  if (!draft.value.lastUpdatedAt) {
    return 'Автосохранение включено'
  }

  return `Черновик обновлён ${new Date(draft.value.lastUpdatedAt).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
})
const isLastEditableStep = computed(
  () => currentEditableStep.value === editableStepOrder[editableStepOrder.length - 1],
)
const primaryActionLabel = computed(() => (isLastEditableStep.value ? 'Сохранить этап' : 'Next'))
const preferencesSaved = computed(
  () => currentEditableStep.value === 'preferences' && validations.value.preferences.isValid,
)

const highestAccessibleStepIndex = computed(() =>
  Math.max(getHighestUnlockedStepIndex(), getCurrentEditableStepIndex()),
)

const isStepUnlocked = (stepId: EditableWizardStepId): boolean =>
  getStepIndex(stepId) <= highestAccessibleStepIndex.value

const isStepComplete = (stepId: EditableWizardStepId): boolean =>
  completedEditableSteps.value.includes(stepId)

const getFieldError = <T extends EditableWizardStepId>(stepId: T, fieldName: string): string => {
  if (!stepTouchState[stepId]) {
    return ''
  }

  return stepErrors.value[stepId][fieldName] ?? ''
}

const goToStep = (stepId: EditableWizardStepId) => {
  if (!isStepUnlocked(stepId)) {
    return
  }

  setCurrentStep(stepId)
}

const handleBack = () => {
  if (!previousStep.value || !isEditableStep(previousStep.value)) {
    return
  }

  goToPreviousStep()
}

const handlePrimaryAction = () => {
  const stepId = currentEditableStep.value

  stepTouchState[stepId] = true

  if (!validations.value[stepId].isValid) {
    return
  }

  setCompletedSteps(getContiguousCompletedSteps())

  if (!isLastEditableStep.value) {
    goToNextStep()
  }
}

const toggleInterest = (interest: WizardInterest) => {
  const currentInterests = draft.value.data.preferences.interests

  draft.value.data.preferences.interests = currentInterests.includes(interest)
    ? currentInterests.filter((item) => item !== interest)
    : [...currentInterests, interest]
}

const toggleNotification = (channel: WizardNotificationChannel) => {
  const currentChannels = draft.value.data.preferences.notifications

  draft.value.data.preferences.notifications = currentChannels.includes(channel)
    ? currentChannels.filter((item) => item !== channel)
    : [...currentChannels, channel]
}

const setWorkspaceMode = (mode: WizardWorkspaceMode) => {
  draft.value.data.preferences.workspaceMode = mode
}
</script>

<template>
  <main :class="$style.page">
    <section :class="$style.shell">
      <header :class="$style.hero">
        <div>
          <p :class="$style.eyebrow">Nuxt 4 + Vue 3 + TypeScript</p>
          <h1 :class="$style.title">Onboarding wizard data flow</h1>
          <p :class="$style.description">
            Реализованы базовые шаги Account, Profile и Preferences с локальным черновиком и
            пошаговой валидацией.
          </p>
        </div>

        <p :class="$style.statusBadge">{{ lastSavedLabel }}</p>
      </header>

      <div :class="$style.layout">
        <aside :class="$style.sidebar">
          <div :class="$style.progressCard">
            <div :class="$style.progressLabelRow">
              <span>Текущий этап</span>
              <span
                >{{ getStepIndex(currentEditableStep) + 1 }}/{{ editableStepOrder.length }}</span
              >
            </div>

            <div :class="$style.progressTrack">
              <span
                :class="$style.progressBar"
                :style="{ width: `${progressValue}%` }"
              ></span>
            </div>

            <ul :class="$style.stepList">
              <li
                v-for="step in stepMetaList"
                :key="step.id"
              >
                <button
                  type="button"
                  :class="[
                    $style.stepButton,
                    step.id === currentEditableStep && $style.stepButtonCurrent,
                    isStepComplete(step.id) && $style.stepButtonComplete,
                  ]"
                  :disabled="!isStepUnlocked(step.id)"
                  @click="goToStep(step.id)"
                >
                  <span :class="$style.stepIndex">{{ getStepIndex(step.id) + 1 }}</span>
                  <span :class="$style.stepContent">
                    <span :class="$style.stepName">{{ step.title }}</span>
                    <span :class="$style.stepDescription">{{ step.description }}</span>
                  </span>
                </button>
              </li>
            </ul>
          </div>

          <div :class="$style.noteCard">
            <p :class="$style.noteTitle">Что уже работает</p>
            <ul :class="$style.noteList">
              <li>черновик автоматически сохраняется в `localStorage`</li>
              <li>переход вперёд блокируется до валидного текущего шага</li>
              <li>назад можно вернуться без потери данных</li>
            </ul>
          </div>
        </aside>

        <section :class="$style.panel">
          <div :class="$style.panelHeader">
            <p :class="$style.panelEyebrow">{{ currentMeta.eyebrow }}</p>
            <h2 :class="$style.panelTitle">{{ currentMeta.title }}</h2>
            <p :class="$style.panelDescription">{{ currentMeta.description }}</p>
          </div>

          <form
            :class="$style.form"
            @submit.prevent="handlePrimaryAction"
          >
            <template v-if="currentEditableStep === 'account'">
              <label :class="$style.field">
                <span :class="$style.fieldLabel">Email</span>
                <input
                  v-model="draft.data.account.email"
                  :class="[$style.input, getFieldError('account', 'email') && $style.inputInvalid]"
                  type="email"
                  autocomplete="email"
                  placeholder="name@company.com"
                />
                <span
                  v-if="getFieldError('account', 'email')"
                  :class="$style.fieldError"
                >
                  {{ getFieldError('account', 'email') }}
                </span>
              </label>

              <label :class="$style.field">
                <span :class="$style.fieldLabel">Password</span>
                <input
                  v-model="draft.data.account.password"
                  :class="[
                    $style.input,
                    getFieldError('account', 'password') && $style.inputInvalid,
                  ]"
                  type="password"
                  autocomplete="new-password"
                  placeholder="Минимум 8 символов"
                />
                <span
                  v-if="getFieldError('account', 'password')"
                  :class="$style.fieldError"
                >
                  {{ getFieldError('account', 'password') }}
                </span>
              </label>
            </template>

            <template v-else-if="currentEditableStep === 'profile'">
              <div :class="$style.grid">
                <label :class="$style.field">
                  <span :class="$style.fieldLabel">First name</span>
                  <input
                    v-model="draft.data.profile.firstName"
                    :class="[
                      $style.input,
                      getFieldError('profile', 'firstName') && $style.inputInvalid,
                    ]"
                    type="text"
                    autocomplete="given-name"
                    placeholder="Анна"
                  />
                  <span
                    v-if="getFieldError('profile', 'firstName')"
                    :class="$style.fieldError"
                  >
                    {{ getFieldError('profile', 'firstName') }}
                  </span>
                </label>

                <label :class="$style.field">
                  <span :class="$style.fieldLabel">Last name</span>
                  <input
                    v-model="draft.data.profile.lastName"
                    :class="[
                      $style.input,
                      getFieldError('profile', 'lastName') && $style.inputInvalid,
                    ]"
                    type="text"
                    autocomplete="family-name"
                    placeholder="Иванова"
                  />
                  <span
                    v-if="getFieldError('profile', 'lastName')"
                    :class="$style.fieldError"
                  >
                    {{ getFieldError('profile', 'lastName') }}
                  </span>
                </label>
              </div>

              <div :class="$style.grid">
                <label :class="$style.field">
                  <span :class="$style.fieldLabel">Role</span>
                  <input
                    v-model="draft.data.profile.jobTitle"
                    :class="[
                      $style.input,
                      getFieldError('profile', 'jobTitle') && $style.inputInvalid,
                    ]"
                    type="text"
                    autocomplete="organization-title"
                    placeholder="Product Designer"
                  />
                  <span
                    v-if="getFieldError('profile', 'jobTitle')"
                    :class="$style.fieldError"
                  >
                    {{ getFieldError('profile', 'jobTitle') }}
                  </span>
                </label>

                <label :class="$style.field">
                  <span :class="$style.fieldLabel">Location</span>
                  <input
                    v-model="draft.data.profile.location"
                    :class="[
                      $style.input,
                      getFieldError('profile', 'location') && $style.inputInvalid,
                    ]"
                    type="text"
                    autocomplete="address-level2"
                    placeholder="Irkutsk"
                  />
                  <span
                    v-if="getFieldError('profile', 'location')"
                    :class="$style.fieldError"
                  >
                    {{ getFieldError('profile', 'location') }}
                  </span>
                </label>
              </div>
            </template>

            <template v-else>
              <div :class="$style.choiceGroup">
                <div :class="$style.choiceHeader">
                  <span :class="$style.fieldLabel">Interests</span>
                  <span :class="$style.choiceHint">Нужно выбрать минимум одно направление</span>
                </div>

                <div :class="$style.chipGrid">
                  <button
                    v-for="interest in WIZARD_INTEREST_OPTIONS"
                    :key="interest"
                    type="button"
                    :class="[
                      $style.chip,
                      draft.data.preferences.interests.includes(interest) && $style.chipActive,
                    ]"
                    @click="toggleInterest(interest)"
                  >
                    {{ interest }}
                  </button>
                </div>

                <span
                  v-if="getFieldError('preferences', 'interests')"
                  :class="$style.fieldError"
                >
                  {{ getFieldError('preferences', 'interests') }}
                </span>
              </div>

              <div :class="$style.choiceGroup">
                <div :class="$style.choiceHeader">
                  <span :class="$style.fieldLabel">Notification channels</span>
                  <span :class="$style.choiceHint">Можно выбрать несколько вариантов</span>
                </div>

                <div :class="$style.optionStack">
                  <label
                    v-for="channel in WIZARD_NOTIFICATION_OPTIONS"
                    :key="channel"
                    :class="$style.optionCard"
                  >
                    <input
                      :checked="draft.data.preferences.notifications.includes(channel)"
                      type="checkbox"
                      @change="toggleNotification(channel)"
                    />
                    <span>{{ channel }}</span>
                  </label>
                </div>

                <span
                  v-if="getFieldError('preferences', 'notifications')"
                  :class="$style.fieldError"
                >
                  {{ getFieldError('preferences', 'notifications') }}
                </span>
              </div>

              <div :class="$style.choiceGroup">
                <div :class="$style.choiceHeader">
                  <span :class="$style.fieldLabel">Workspace mode</span>
                  <span :class="$style.choiceHint">Выберите основной формат работы</span>
                </div>

                <div :class="$style.segmented">
                  <button
                    v-for="mode in WIZARD_WORKSPACE_MODE_OPTIONS"
                    :key="mode"
                    type="button"
                    :class="[
                      $style.segmentButton,
                      draft.data.preferences.workspaceMode === mode && $style.segmentButtonActive,
                    ]"
                    @click="setWorkspaceMode(mode)"
                  >
                    {{ mode }}
                  </button>
                </div>

                <span
                  v-if="getFieldError('preferences', 'workspaceMode')"
                  :class="$style.fieldError"
                >
                  {{ getFieldError('preferences', 'workspaceMode') }}
                </span>
              </div>
            </template>

            <div
              v-if="stepTouchState[currentEditableStep] && currentErrorList.length"
              :class="$style.errorBox"
            >
              <p :class="$style.errorTitle">Текущий шаг нужно завершить без ошибок:</p>
              <ul :class="$style.errorList">
                <li
                  v-for="message in currentErrorList"
                  :key="message"
                >
                  {{ message }}
                </li>
              </ul>
            </div>

            <p
              v-if="preferencesSaved"
              :class="$style.infoBox"
            >
              {{ stageCompletionMessage }}
            </p>

            <div :class="$style.actions">
              <button
                type="button"
                :class="[$style.actionButton, $style.actionButtonGhost]"
                :disabled="currentEditableStep === 'account'"
                @click="handleBack"
              >
                Back
              </button>

              <button
                type="submit"
                :class="[$style.actionButton, $style.actionButtonPrimary]"
              >
                {{ primaryActionLabel }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  </main>
</template>

<style module src="./index.module.scss"></style>
