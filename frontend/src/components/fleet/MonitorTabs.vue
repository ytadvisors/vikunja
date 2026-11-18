<template>
	<nav
		class="tabs work-tabs"
		aria-label="Monitoring"
	>
		<RouterLink
			:to="{name: 'fleet.live', query: {tab: 'availability'}}"
			:class="{on: current === 'availability'}"
		>
			Availability
		</RouterLink>
		<RouterLink
			:to="{name: 'fleet.live', query: {tab: 'monitors'}}"
			:class="{on: current === 'monitors'}"
		>
			Monitors
		</RouterLink>
		<RouterLink
			:to="{name: 'fleet.live', query: {tab: 'issues'}}"
			:class="{on: current === 'issues'}"
		>
			Issues
		</RouterLink>
		<RouterLink
			:to="{name: 'fleet.live', query: {tab: 'events'}}"
			:class="{on: current === 'events'}"
		>
			Events
		</RouterLink>
	</nav>
</template>

<script setup lang="ts">
// Tabs of the Monitoring area (Yomi 2026-11-18: "We need tabs per left panel section. We don't want to repeat the sections
// twice on the left side"). Monitoring leads with availability.
import {computed} from 'vue'
import {useRoute} from 'vue-router'

const route = useRoute()
const current = computed(() => (['events', 'issues', 'monitors'].includes(String(route.query.tab)) ? String(route.query.tab) : 'availability'))
</script>
