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
			v-shortcut="SHORTCUTS.navigation.labels"
			:to="{name: 'labels.index'}"
			:class="{on: is('labels.index')}"
		>
			Labels
		</RouterLink>
		<RouterLink
			:to="{name: 'trash'}"
			:class="{on: is('trash')}"
		>
			Trash
		</RouterLink>
	</nav>
</template>

<script setup lang="ts">
// One tab bar for every task-management page (Yomi 2026-11-18: "simplify and consolidates sections for the task management").
import {useRoute} from 'vue-router'
import {SHORTCUTS} from '@/constants/shortcuts'

const route = useRoute()
const is = (name: string) => String(route.name || '').startsWith(name)
</script>
