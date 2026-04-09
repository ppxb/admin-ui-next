<script setup lang="ts">
import type { MenuRecordRaw } from '@vben/types'

import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { onKeyStroke, useLocalStorage, useThrottleFn } from '@vueuse/core'

import { X } from '@vben/icons'
import { $t, useI18n } from '@vben/locales'
import { mapTree, traverseTreeValues, uniqueByField } from '@vben/utils'
import { VbenIcon, VbenScrollbar } from '@vben-core/shadcn-ui'
import { isHttpUrl } from '@vben-core/shared/utils'

defineOptions({
  name: 'SearchPanel'
})

const props = withDefaults(
  defineProps<{ keyword?: string; menus?: MenuRecordRaw[] }>(),
  {
    keyword: '',
    menus: () => []
  }
)
const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const { locale } = useI18n()
const searchHistory = useLocalStorage<MenuRecordRaw[]>(
  `__search-history-${location.hostname}__`,
  []
)
const activeIndex = ref(-1)
const searchItems = shallowRef<MenuRecordRaw[]>([])
const searchResults = ref<MenuRecordRaw[]>([])
const displayResults = computed(() =>
  uniqueByField(searchResults.value, 'path')
)
const searchIndex = shallowRef<
  Array<{ item: MenuRecordRaw; nameLower: string }>
>([])

const handleSearch = useThrottleFn(searchFromIndex, 200)

function rebuildSearchSource() {
  searchItems.value = mapTree(props.menus, item => {
    return {
      ...item,
      name: $t(item?.name)
    }
  })

  const index: Array<{ item: MenuRecordRaw; nameLower: string }> = []
  traverseTreeValues(searchItems.value, item => {
    index.push({
      item,
      nameLower: item.name?.toLowerCase() ?? ''
    })
  })
  searchIndex.value = index
}

function searchFromIndex(searchKey: string) {
  searchKey = searchKey.trim().toLowerCase()

  if (!searchKey) {
    searchResults.value = []
    return
  }

  const reg = createSearchReg(searchKey)
  const results: MenuRecordRaw[] = []

  for (const { item, nameLower } of searchIndex.value) {
    if (reg.test(nameLower)) {
      results.push(item)
    }
  }

  searchResults.value = results
  activeIndex.value = results.length > 0 ? 0 : -1
}

function scrollIntoView() {
  const element = document.querySelector(
    `[data-search-item="${activeIndex.value}"]`
  )

  if (element) {
    element.scrollIntoView({ block: 'nearest' })
  }
}

async function handleEnter(clickedIdx?: number) {
  if (displayResults.value.length === 0) {
    return
  }

  const result = displayResults.value
  const index = typeof clickedIdx === 'number' ? clickedIdx : activeIndex.value
  if (index < 0 || index >= result.length) {
    return
  }

  activeIndex.value = index
  const to = result[index]
  if (!to) {
    return
  }

  searchHistory.value = uniqueByField([...searchHistory.value, to], 'path')
  handleClose()
  await nextTick()

  if (isHttpUrl(to.path)) {
    const newTab = window.open(to.path, '_blank', 'noopener,noreferrer')
    if (newTab) {
      newTab.opener = null
    }
  } else {
    router.push({ path: to.path, replace: true })
  }
}

function handleUp() {
  if (displayResults.value.length === 0) {
    return
  }
  activeIndex.value--
  if (activeIndex.value < 0) {
    activeIndex.value = displayResults.value.length - 1
  }
  scrollIntoView()
}

function handleDown() {
  if (displayResults.value.length === 0) {
    return
  }
  activeIndex.value++
  if (activeIndex.value > displayResults.value.length - 1) {
    activeIndex.value = 0
  }
  scrollIntoView()
}

function handleClose() {
  searchResults.value = []
  emit('close')
}

function handleMouseenter(index: number) {
  activeIndex.value = index
}

function handleMouseleave() {
  activeIndex.value = -1
}

function removeItem(index: number) {
  const target = displayResults.value[index]
  if (!target) {
    return
  }

  if (props.keyword) {
    searchResults.value = searchResults.value.filter(
      item => item.path !== target.path
    )
  } else {
    searchHistory.value = searchHistory.value.filter(
      item => item.path !== target.path
    )
    searchResults.value = [...searchHistory.value]
  }

  const length = displayResults.value.length
  if (length === 0) {
    activeIndex.value = -1
    return
  }
  activeIndex.value = Math.min(activeIndex.value, length - 1)
  scrollIntoView()
}

const code = new Set([
  '$',
  '(',
  ')',
  '*',
  '+',
  '.',
  '?',
  '[',
  '\\',
  ']',
  '^',
  '{',
  '|',
  '}'
])

function transform(c: string) {
  return code.has(c) ? `\\${c}` : c
}

function createSearchReg(key: string) {
  const keys = [...key].map(item => transform(item)).join('.*')
  return new RegExp(`.*${keys}.*`)
}

watch(
  () => props.keyword,
  val => {
    if (val) {
      handleSearch(val)
    } else {
      searchResults.value = searchHistory.value
    }
  }
)

watch(
  [() => props.menus, () => locale.value],
  () => {
    rebuildSearchSource()
    if (props.keyword) {
      handleSearch(props.keyword)
    }
  },
  {
    deep: true,
    immediate: true
  }
)

onMounted(() => {
  if (searchHistory.value.length > 0) {
    searchResults.value = [...searchHistory.value]
  }
  onKeyStroke('Enter', () => {
    handleEnter()
  })
  onKeyStroke('ArrowUp', handleUp)
  onKeyStroke('ArrowDown', handleDown)
  onKeyStroke('Escape', handleClose)
})
</script>

<template>
  <VbenScrollbar>
    <div class="flex! max-h-75 min-h-80 justify-center">
      <div
        v-if="keyword && displayResults.length === 0"
        class="text-muted-foreground flex items-center justify-center text-center"
      >
        <p class="text-sm">
          {{ $t('ui.widgets.search.noResults') }}
          <span class="text-foreground"> "{{ keyword }}" </span>
        </p>
      </div>
      <div
        v-if="!keyword && displayResults.length === 0"
        class="text-muted-foreground flex items-center justify-center text-center text-sm"
      >
        {{ $t('ui.widgets.search.noRecent') }}
      </div>

      <ul
        v-show="displayResults.length > 0"
        class="w-full"
        @mouseleave="handleMouseleave"
      >
        <li
          v-if="searchHistory.length > 0 && !keyword"
          class="text-muted-foreground mb-2 text-xs"
        >
          {{ $t('ui.widgets.search.recent') }}
        </li>
        <li
          v-for="(item, index) in displayResults"
          :key="item.path"
          :class="
            activeIndex === index
              ? 'bg-input/50 border-input'
              : 'border-transparent'
          "
          :data-index="index"
          :data-search-item="index"
          class="group flex-center mb-2 w-full cursor-pointer rounded-xl border px-2 py-1.5 text-sm"
          @click="handleEnter(index)"
          @mouseenter="handleMouseenter(index)"
        >
          <VbenIcon :icon="item.icon" class="mr-2 size-5 shrink-0" fallback />

          <span class="flex-1">{{ item.name }}</span>
          <div
            v-if="!keyword"
            class="flex-center hover:text-muted-foreground rounded-full"
            @click.stop="removeItem(index)"
          >
            <X class="size-4" />
          </div>
        </li>
      </ul>
    </div>
  </VbenScrollbar>
</template>
