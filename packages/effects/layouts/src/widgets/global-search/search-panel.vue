<script setup lang="ts">
import type { MenuRecordRaw } from '@vben/types'

import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { onKeyStroke, useLocalStorage, useThrottleFn } from '@vueuse/core'

import { SearchX, X } from '@vben/icons'
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
    <div class="flex! h-full justify-center px-2 sm:max-h-112.5">
      <div
        v-if="keyword && displayResults.length === 0"
        class="text-muted-foreground text-center"
      >
        <SearchX class="mx-auto mt-4 size-12" />
        <p class="mt-6 mb-10 text-xs">
          {{ $t('ui.widgets.search.noResults') }}
          <span class="text-foreground text-sm font-medium">
            "{{ keyword }}"
          </span>
        </p>
      </div>
      <div
        v-if="!keyword && displayResults.length === 0"
        class="text-muted-foreground text-center"
      >
        <p class="my-10 text-xs">
          {{ $t('ui.widgets.search.noRecent') }}
        </p>
      </div>

      <ul v-show="displayResults.length > 0" class="w-full">
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
              ? 'active bg-primary text-primary-foreground'
              : ''
          "
          :data-index="index"
          :data-search-item="index"
          class="group flex-center bg-accent mb-3 w-full cursor-pointer rounded-lg p-4"
          @click="handleEnter(index)"
          @mouseenter="handleMouseenter(index)"
        >
          <VbenIcon :icon="item.icon" class="mr-2 size-5 shrink-0" fallback />

          <span class="flex-1">{{ item.name }}</span>
          <div
            class="flex-center hover:text-primary-foreground dark:hover:bg-accent rounded-full p-1 hover:scale-110"
            @click.stop="removeItem(index)"
          >
            <X class="size-4" />
          </div>
        </li>
      </ul>
    </div>
  </VbenScrollbar>
</template>
