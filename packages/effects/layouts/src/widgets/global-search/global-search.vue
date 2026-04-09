<script setup lang="ts">
import type { MenuRecordRaw } from '@vben/types'

import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useMagicKeys, whenever } from '@vueuse/core'

import {
  ArrowDownUp,
  CornerDownLeft,
  MdiKeyboardEsc,
  Search
} from '@vben/icons'
import { $t } from '@vben/locales'
import { isWindowsOs } from '@vben/utils'
import { useVbenModal } from '@vben-core/popup-ui'

import SearchPanel from './search-panel.vue'

defineOptions({
  name: 'GlobalSearch'
})

const props = withDefaults(
  defineProps<{ enableShortcutKey?: boolean; menus?: MenuRecordRaw[] }>(),
  {
    enableShortcutKey: true,
    menus: () => []
  }
)

const keyword = ref('')
const searchInputRef = ref<HTMLInputElement>()

const [Modal, modalApi] = useVbenModal({
  onCancel() {
    modalApi.close()
  },
  onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      keyword.value = ''
    }
  }
})
const open = modalApi.useStore(state => state.isOpen)

function handleClose() {
  modalApi.close()
  keyword.value = ''
}

const keys = useMagicKeys()
const cmd = isWindowsOs() ? keys['ctrl+k'] : keys['cmd+k']
if (cmd) {
  whenever(cmd, () => {
    if (props.enableShortcutKey) {
      modalApi.open()
    }
  })
}

whenever(open, () => {
  nextTick(() => {
    searchInputRef.value?.focus()
  })
})

const preventDefaultBrowserSearchHotKey = (event: KeyboardEvent) => {
  if (event.key?.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
  }
}

const toggleKeydownListener = () => {
  if (props.enableShortcutKey) {
    window.addEventListener('keydown', preventDefaultBrowserSearchHotKey)
  } else {
    window.removeEventListener('keydown', preventDefaultBrowserSearchHotKey)
  }
}

const toggleOpen = () => {
  open.value ? modalApi.close() : modalApi.open()
}

watch(() => props.enableShortcutKey, toggleKeydownListener)

onMounted(() => {
  toggleKeydownListener()

  onUnmounted(() => {
    window.removeEventListener('keydown', preventDefaultBrowserSearchHotKey)
  })
})
</script>

<template>
  <Modal
    :fullscreen-button="false"
    :closable="false"
    :centered="true"
    class="bg-background w-130! max-w-[92vw] rounded-2xl! ring-4 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800"
  >
    <template #title>
      <div
        class="bg-input/50 border-input m-2 flex h-9 items-center gap-2 rounded-xl border px-3"
      >
        <Search class="size-4" />
        <input
          ref="searchInputRef"
          v-model="keyword"
          :placeholder="$t('ui.widgets.search.searchNavigate')"
          class="w-full p-2 pl-0 text-sm font-normal outline-none focus-visible:ring-transparent"
        />
      </div>
    </template>

    <SearchPanel
      :keyword="keyword"
      :menus="menus"
      @close="handleClose"
      class="m-2"
    />

    <template #footer>
      <div
        class="text-muted-foreground flex h-10 w-full justify-center gap-4! rounded-br-2xl rounded-bl-2xl bg-neutral-50 text-xs dark:bg-neutral-800"
      >
        <div class="flex items-center gap-2">
          <CornerDownLeft class="size-3" />
          {{ $t('ui.widgets.search.select') }}
        </div>
        <div class="flex items-center gap-2">
          <ArrowDownUp class="size-3" />
          {{ $t('ui.widgets.search.navigate') }}
        </div>
        <div class="flex items-center gap-2">
          <MdiKeyboardEsc class="size-4" />
          {{ $t('ui.widgets.search.close') }}
        </div>
      </div>
    </template>
  </Modal>

  <div
    class="group md:bg-accent flex h-8 cursor-pointer items-center gap-3 rounded-2xl border-none bg-none px-2 py-0.5 outline-hidden"
    @click="toggleOpen()"
  >
    <Search
      class="text-muted-foreground group-hover:text-foreground size-4 group-hover:opacity-100"
    />
    <span
      class="text-muted-foreground group-hover:text-foreground hidden text-xs duration-300 md:block"
    >
      {{ $t('ui.widgets.search.title') }}
    </span>
    <span
      v-if="enableShortcutKey"
      class="border-foreground/60 bg-background text-muted-foreground group-hover:text-foreground relative hidden rounded-sm rounded-r-xl px-1.5 py-1 text-xs leading-none group-hover:opacity-100 md:block"
    >
      {{ isWindowsOs() ? 'Ctrl' : '⌘' }}
      <kbd>K</kbd>
    </span>
  </div>
</template>
