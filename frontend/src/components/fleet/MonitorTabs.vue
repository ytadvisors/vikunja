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
			:to="{name: 'fleet.live', query: {tab: 'events'}}"
			:class="{on: current === 'events'}"
		>
			Events
		</RouterLink>
		<RouterLink
			:to="{name: 'fleet.home'}"
			:class="{on: current === 'overview'}"
		>
			Overview
		</RouterLink>
	</nav>
</template>

<script setup lang="ts">
// Tabs of the Monitoring area (Yomi 2026-11-18: "We need tabs per left panel section. We don't want to repeat the sections
// twice on the left side"). Monitoring leads with availability; the Fleet overview is one of its tabs.
import {computed} from 'vue'
import {useRoute} from 'vue-router'

const route = useRoute()
const current = computed(() => (route.name === 'fleet.home' ? 'overview' : route.query.tab === 'events' ? 'events' : 'availability'))
</script>
