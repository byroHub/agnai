import { Component, createMemo, createSignal, onMount } from 'solid-js'
import { AlertTriangle, Save } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import {
  applyDotProperty,
  getFormEntries,
  getStrictForm,
  setComponentPageTitle,
} from '../../shared/util'
import { settingStore, userStore } from '../../store'
import UISettings from './UISettings'
import Tabs from '../../shared/Tabs'
import AISettings from './AISettings'
import { Show } from 'solid-js'
import { VoiceSettings } from './Voice/VoiceSettings'
import { toArray } from '/common/util'
import { useSearchParams } from '@solidjs/router'
import { RootModal } from '/web/shared/Modal'
import { THIRDPARTY_FORMATS } from '/common/adapters'
import { SubscriptionPage } from '../Profile/SubscriptionPage'
import { Page } from '/web/Layout'

const settingTabs: Record<Tab, string> = {
  ai: 'AI Settings',
  ui: 'UI Settings',
  voice: 'Voice Settings',
  guest: 'Guest Data',
  subscription: 'Subscription',
}

enum MainTab {
  ai = 0,
  ui = 1,
  voice = 2,
  guest = 3,
  subscription = 4,
}

type Tab = keyof typeof MainTab

export const SettingsModal = () => {
  const state = settingStore()
  const [footer, setFooter] = createSignal<any>()
  return (
    <RootModal
      show={state.showSettings}
      close={() => settingStore.modal(false)}
      fixedHeight
      maxWidth="half"
      footer={
        <>
          <Button schema="secondary" onClick={() => settingStore.modal(false)}>
            Close
          </Button>
          {footer()}
        </>
      }
    >
      <Settings footer={setFooter} />
    </RootModal>
  )
}

const Settings: Component<{ footer?: (children: any) => void }> = (props) => {
  let formRef: HTMLFormElement

  setComponentPageTitle('Settings')
  const state = userStore()

  const [query, setQuery] = useSearchParams()
  const [tab, setTab] = createSignal<number>(+(query.tab ?? '0'))
  const [workers, setWorkers] = createSignal<string[]>(toArray(state.user?.hordeWorkers))
  const [models, setModels] = createSignal<string[]>(toArray(state.user?.hordeModel))

  onMount(() => {
    if (!query.tab) {
      setQuery({ tab: tab() })
    }
  })

  const tabs: Tab[] = ['ai', 'ui', 'voice']

  if (state.tiers.length > 0 || state.user?.billing) {
    tabs.push('subscription')
  }

  if (!state.loggedIn) tabs.push('guest')

  const currentTab = createMemo(() => tabs[tab()])

  const onSubmit = () => {
    const adapterConfig = getAdapterConfig(getFormEntries(formRef))
    const body = getStrictForm(formRef, settingsForm)

    const {
      speechToTextEnabled,
      speechToTextAutoSubmit,
      speechToTextAutoRecord,

      textToSpeechEnabled,
      textToSpeechFilterActions,

      elevenLabsApiKey,
      enableLTM,
      ...base
    } = body

    userStore.updateConfig({
      ...base,
      disableLTM: !enableLTM,
      adapterConfig,
      hordeWorkers: workers(),
      hordeModels: models(),
      speechtotext: {
        enabled: speechToTextEnabled,
        autoSubmit: speechToTextAutoSubmit,
        autoRecord: speechToTextAutoRecord,
      },
      elevenLabsApiKey,
      texttospeech: {
        enabled: textToSpeechEnabled,
        filterActions: textToSpeechFilterActions,
      },
    })
  }

  const tabClass = `flex flex-col gap-4`

  const version = (window.agnai_version?.includes('unknown') ? '' : window.agnai_version).slice(
    0,
    7
  )

  onMount(() => {
    props.footer?.(footer)
  })

  const footer = (
    <Button onClick={onSubmit}>
      <Save />
      Update Settings
    </Button>
  )

  return (
    <Page>
      <PageHeader
        title="Settings"
        subtitle={
          <Show when={!!version}>
            <em>v.{version}</em>
          </Show>
        }
        noDivider
      />

      <div class="my-2">
        <Tabs
          tabs={tabs.map((t) => settingTabs[t])}
          selected={tab}
          select={(id) => {
            setTab(id)
            setQuery({ tab: id })
          }}
        />
      </div>
      <form ref={formRef!} autocomplete="off">
        <div class="flex flex-col gap-4">
          <div class={currentTab() === 'ai' ? tabClass : 'hidden'}>
            <AISettings onHordeWorkersChange={setWorkers} onHordeModelsChange={setModels} />
          </div>

          <div class={currentTab() === 'ui' ? tabClass : 'hidden'}>
            <UISettings />
          </div>

          <div class={currentTab() === 'voice' ? tabClass : 'hidden'}>
            <VoiceSettings />
          </div>

          <div class={currentTab() === 'subscription' ? tabClass : 'hidden'}>
            <SubscriptionPage />
          </div>

          <div class={currentTab() === 'guest' ? tabClass : 'hidden'}>
            <div class="mb-4 mt-8 flex w-full flex-col items-center justify-center">
              <div>This cannot be undone!</div>
              <Button schema="red" onClick={userStore.clearGuestState}>
                <AlertTriangle /> Delete Guest State <AlertTriangle />
              </Button>
            </div>
          </div>
        </div>

        <Show when={!props.footer}>
          <div class="flex justify-end gap-2 pt-4">{footer}</div>
        </Show>
      </form>
    </Page>
  )
}

export default Settings

const settingsForm = {
  defaultPreset: 'string?',
  koboldUrl: 'string?',
  thirdPartyFormat: THIRDPARTY_FORMATS,
  oobaUrl: 'string?',
  thirdPartyPassword: 'string?',
  novelApiKey: 'string?',
  novelModel: 'string?',
  hordeUseTrusted: 'boolean?',
  hordeKey: 'string?',
  hordeModel: 'string?',
  oaiKey: 'string?',
  mistralKey: 'string?',
  featherlessApiKey: 'string?',
  scaleApiKey: 'string?',
  scaleUrl: 'string?',
  claudeApiKey: 'string?',
  logPromptsToBrowserConsole: 'boolean?',
  enableLTM: 'boolean?',

  useLocalPipeline: 'boolean?',

  speechToTextEnabled: 'boolean',
  speechToTextAutoSubmit: 'boolean',
  speechToTextAutoRecord: 'boolean',

  textToSpeechEnabled: 'boolean',
  textToSpeechFilterActions: 'boolean',

  elevenLabsApiKey: 'string?',
} as const

function getAdapterConfig(entries: Array<[string, any]>) {
  let obj: any = {}

  for (const [prop, value] of entries) {
    if (!prop.startsWith('adapterConfig.')) continue
    applyDotProperty(obj, prop.replace('adapterConfig.', ''), value)
    // const name = prop.replace('adapterConfig.', '')
    // obj[name] = value
  }

  return obj
}
