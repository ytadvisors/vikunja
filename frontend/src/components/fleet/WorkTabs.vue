<template>
	<nav
		class="tabs work-tabs"
		aria-label="Tasks"
	>
		<RouterLink
			v-shortcut="SHORTCUTS.navigation.overview"
			:to="{name: 'fleet.overview'}"
			:class="{on: is('fleet.overview')}"
		>
			My tasks
		</RouterLink>
		<RouterLink
			v-shortcut="SHORTCUTS.navigation.upcoming"
			:to="{name: 'tasks.range'}"
			:class="{on: is('tasks.range')}"
		>
			Upcoming
		</RouterLink>
		<RouterLink
			v-shortcut="SHORTCUTS.navigation.projects"
			:to="{name: 'projects.index'}"
			:class="{on: is('projects.index')}"
		>
			Projects
		</RouterLink>
		<RouterLink
			:to="{name: 'trash'}"
			:class="{on: is('trash')}"
		>
			Trash
		</RouterLink>
		<button
			v-if="!embedded"
			v-shortcut="SHORTCUTS.navigation.labels"
			type="button"
			class="labels-open"
			:aria-expanded="labelsOpen"
			@click="labelsOpen = !labelsOpen"
		>
			Labels
		</button>
	</nav>
	<Teleport
		v-if="labelsOpen && !embedded"
		to="body"
	>
		<aside
			class="side-panel labels-drawer"
			aria-label="Labels"
		>
			<header>
				<h2>Labels</h2>
				<button
					type="button"
					class="edge-toggle"
					title="Close"
					aria-label="Close labels"
					@click="labelsOpen = false"
				>
					×
				</button>
			</header>
			<LabelsView />
		</aside>
	</Teleport>
</template>

<script setup lang="ts">
// One tab bar for every task-management page (Yomi 2026-11-18). Labels are not a section of their own: they open as an
// overlay over the current page (Yomi 2026-11-18: "Labels doesn't need it's own section. We need to find a way to overlay
// the details instead.").
import {defineAsyncComponent, ref} from 'vue'
import {useRoute} from 'vue-router'
import {SHORTCUTS} from '@/constants/shortcuts'

withDefaults(defineProps<{embedded?: boolean}>(), {embedded: false})
const LabelsView = defineAsyncComponent(() => import('@/views/labels/ListLabels.vue'))

const route = useRoute()
const labelsOpen = ref(false)
const is = (name: string) => String(route.name || '').startsWith(name)
</script>
