<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import { useWizardState } from '~/composables/useWizardState'
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

type FormWizardStepId = Extract<WizardStepId, 'account' | 'profile' | 'preferences'>
type VisibleWizardStepId = WizardStepId

interface WizardStepMeta {
  id: VisibleWizardStepId
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
    description: 'Добавим базовые данные для персонализации и review summary.',
  },
  {
    id: 'preferences',
    title: 'Настройте интересы и формат работы',
    eyebrow: 'Step 3',
    description: 'Зафиксируем интересы, уведомления и preferred workspace mode.',
  },
  {
    id: 'review',
    title: 'Проверьте введённые данные',
    eyebrow: 'Step 4',
    description: 'Перед завершением сверим все введённые поля в одной сводке.',
  },
  {
    id: 'complete',
    title: 'Onboarding completed',
    eyebrow: 'Step 5',
    description: 'Базовый поток завершён. Можно сбросить черновик и начать заново.',
  },
]

const formStepOrder: FormWizardStepId[] = ['account', 'profile', 'preferences']
const visibleStepOrder = stepMetaList.map((step) => step.id)
const stepTouchState = reactive<Record<FormWizardStepId, boolean>>({
  account: false,
  profile: false,
  preferences: false,
})

const {
  draft,
  hasHydrated,
  currentStep,
  previousStep,
  setCurrentStep,
  goToPreviousStep,
  resetDraft,
  setCompletedSteps,
} = useWizardState()

const isFormStep = (stepId: WizardStepId): stepId is FormWizardStepId =>
  formStepOrder.includes(stepId as FormWizardStepId)

const getVisibleStepIndex = (stepId: VisibleWizardStepId): number =>
  visibleStepOrder.indexOf(stepId)

const validations = computed<WizardValidationMap>(() => ({
  account: validateAccountStep(draft.value.data.account),
  profile: validateProfileStep(draft.value.data.profile),
  preferences: validatePreferencesStep(draft.value.data.preferences),
}))

const getContiguousFormSteps = (): FormWizardStepId[] => {
  const completedSteps: FormWizardStepId[] = []

  for (const stepId of formStepOrder) {
    if (!validations.value[stepId].isValid) {
      break
    }

    completedSteps.push(stepId)
  }

  return completedSteps
}

const canAccessReview = computed(() => getContiguousFormSteps().length === formStepOrder.length)
const canAccessComplete = computed(() => draft.value.completedSteps.includes('review'))

const getAllowedCompletedSteps = (): VisibleWizardStepId[] => {
  const baseSteps = getContiguousFormSteps()
  const completedSteps: VisibleWizardStepId[] = [...baseSteps]

  if (canAccessComplete.value) {
    completedSteps.push('review', 'complete')
  }

  return completedSteps
}

const syncProgressState = () => {
  const nextCompletedSteps = getAllowedCompletedSteps()
  const currentCompletedSteps = draft.value.completedSteps.filter(
    (stepId): stepId is VisibleWizardStepId => visibleStepOrder.includes(stepId),
  )

  if (
    nextCompletedSteps.length !== currentCompletedSteps.length ||
    nextCompletedSteps.some((stepId, index) => stepId !== currentCompletedSteps[index])
  ) {
    setCompletedSteps(nextCompletedSteps)
  }

  if (currentStep.value === 'complete' && !canAccessComplete.value) {
    setCurrentStep('review')
    return
  }

  if (currentStep.value === 'review' && !canAccessReview.value) {
    setCurrentStep(formStepOrder[getContiguousFormSteps().length] ?? 'account')
    return
  }

  if (!visibleStepOrder.includes(currentStep.value)) {
    setCurrentStep(formStepOrder[0])
  }
}

watch(
  () => draft.value.data,
  () => {
    if (!hasHydrated.value) {
      return
    }

    syncProgressState()
  },
  { deep: true },
)

watch(
  hasHydrated,
  (isHydrated) => {
    if (!isHydrated) {
      return
    }

    syncProgressState()
  },
  { immediate: true },
)

const currentVisibleStep = computed<VisibleWizardStepId>(() =>
  visibleStepOrder.includes(currentStep.value) ? currentStep.value : 'account',
)

const currentMeta = computed(
  () => stepMetaList.find((step) => step.id === currentVisibleStep.value) ?? stepMetaList[0],
)

const currentFormStep = computed<FormWizardStepId | null>(() =>
  isFormStep(currentVisibleStep.value) ? currentVisibleStep.value : null,
)

const currentErrorList = computed<string[]>(() => {
  if (!currentFormStep.value || !stepTouchState[currentFormStep.value]) {
    return []
  }

  return Object.values(validations.value[currentFormStep.value].errors).filter(
    (message): message is string => typeof message === 'string' && message.length > 0,
  )
})

const completedSteps = computed<VisibleWizardStepId[]>(() =>
  draft.value.completedSteps.filter((stepId): stepId is VisibleWizardStepId =>
    visibleStepOrder.includes(stepId),
  ),
)

const highestUnlockedStepIndex = computed(() => {
  if (canAccessComplete.value) {
    return getVisibleStepIndex('complete')
  }

  if (canAccessReview.value) {
    return getVisibleStepIndex('review')
  }

  return getContiguousFormSteps().length
})

const progressValue = computed(
  () => ((getVisibleStepIndex(currentVisibleStep.value) + 1) / visibleStepOrder.length) * 100,
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

const primaryActionLabel = computed(() => {
  switch (currentVisibleStep.value) {
    case 'preferences':
      return 'Перейти к Review'
    case 'review':
      return 'Complete onboarding'
    case 'complete':
      return 'Start over'
    default:
      return 'Next'
  }
})

const reviewSummary = computed(() => [
  {
    title: 'Account',
    rows: [
      { label: 'Email', value: draft.value.data.account.email || 'Не заполнено' },
      {
        label: 'Password',
        value: draft.value.data.account.password
          ? '•'.repeat(draft.value.data.account.password.length)
          : 'Не заполнено',
      },
    ],
  },
  {
    title: 'Profile',
    rows: [
      { label: 'First name', value: draft.value.data.profile.firstName || 'Не заполнено' },
      { label: 'Last name', value: draft.value.data.profile.lastName || 'Не заполнено' },
      { label: 'Role', value: draft.value.data.profile.jobTitle || 'Не заполнено' },
      { label: 'Location', value: draft.value.data.profile.location || 'Не заполнено' },
    ],
  },
  {
    title: 'Preferences',
    rows: [
      {
        label: 'Interests',
        value: draft.value.data.preferences.interests.length
          ? draft.value.data.preferences.interests.join(', ')
          : 'Не заполнено',
      },
      {
        label: 'Notifications',
        value: draft.value.data.preferences.notifications.length
          ? draft.value.data.preferences.notifications.join(', ')
          : 'Не заполнено',
      },
      { label: 'Workspace mode', value: draft.value.data.preferences.workspaceMode },
    ],
  },
])

const isStepUnlocked = (stepId: VisibleWizardStepId): boolean =>
  getVisibleStepIndex(stepId) <= highestUnlockedStepIndex.value

const isStepComplete = (stepId: VisibleWizardStepId): boolean =>
  completedSteps.value.includes(stepId)

const getFieldError = (stepId: FormWizardStepId, fieldName: string): string => {
  if (!stepTouchState[stepId]) {
    return ''
  }

  return (
    validations.value[stepId].errors[
      fieldName as keyof (typeof validations.value)[typeof stepId]['errors']
    ] ?? ''
  )
}

const goToStep = (stepId: VisibleWizardStepId) => {
  if (!isStepUnlocked(stepId)) {
    return
  }

  setCurrentStep(stepId)
}

const handleBack = () => {
  if (!previousStep.value) {
    return
  }

  goToPreviousStep()
}

const handlePrimaryAction = () => {
  if (currentVisibleStep.value === 'complete') {
    resetDraft()
    return
  }

  if (currentVisibleStep.value === 'review') {
    setCompletedSteps([...getContiguousFormSteps(), 'review', 'complete'])
    setCurrentStep('complete')
    return
  }

  if (!currentFormStep.value) {
    return
  }

  const stepId = currentFormStep.value
  stepTouchState[stepId] = true

  if (!validations.value[stepId].isValid) {
    return
  }

  if (stepId === 'preferences') {
    setCompletedSteps(getContiguousFormSteps())
    setCurrentStep('review')
    return
  }

  const nextIndex = formStepOrder.indexOf(stepId) + 1
  const nextStep = formStepOrder[nextIndex]

  if (nextStep) {
    setCompletedSteps(getContiguousFormSteps())
    setCurrentStep(nextStep)
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
            Базовый flow теперь включает Review со сводкой данных и экран Complete после
            подтверждения.
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
                >{{ getVisibleStepIndex(currentVisibleStep) + 1 }}/{{
                  visibleStepOrder.length
                }}</span
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
                    step.id === currentVisibleStep && $style.stepButtonCurrent,
                    isStepComplete(step.id) && $style.stepButtonComplete,
                  ]"
                  :disabled="!isStepUnlocked(step.id)"
                  @click="goToStep(step.id)"
                >
                  <span :class="$style.stepIndex">{{ getVisibleStepIndex(step.id) + 1 }}</span>
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
              <li>review собирает сводку всех введённых данных</li>
              <li>после подтверждения flow заканчивается экраном complete</li>
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
            <template v-if="currentVisibleStep === 'account'">
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

            <template v-else-if="currentVisibleStep === 'profile'">
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

            <template v-else-if="currentVisibleStep === 'preferences'">
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

            <template v-else-if="currentVisibleStep === 'review'">
              <div :class="$style.reviewStack">
                <section
                  v-for="section in reviewSummary"
                  :key="section.title"
                  :class="$style.reviewCard"
                >
                  <h3 :class="$style.reviewTitle">{{ section.title }}</h3>
                  <dl :class="$style.reviewGrid">
                    <template
                      v-for="row in section.rows"
                      :key="row.label"
                    >
                      <dt :class="$style.reviewLabel">{{ row.label }}</dt>
                      <dd :class="$style.reviewValue">{{ row.value }}</dd>
                    </template>
                  </dl>
                </section>
              </div>

              <p :class="$style.infoBox">
                Если всё корректно, подтвердите данные и перейдите к экрану завершения.
              </p>
            </template>

            <template v-else>
              <div :class="$style.completeCard">
                <p :class="$style.completeEyebrow">Flow complete</p>
                <h3 :class="$style.completeTitle">Черновик wizard завершён</h3>
                <p :class="$style.completeText">
                  Базовый onboarding flow доведён до конца. Можно вернуться к review или сбросить
                  состояние и начать сценарий заново.
                </p>
              </div>
            </template>

            <div
              v-if="currentFormStep && currentErrorList.length"
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

            <div :class="$style.actions">
              <button
                type="button"
                :class="[$style.actionButton, $style.actionButtonGhost]"
                :disabled="currentVisibleStep === 'account'"
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
