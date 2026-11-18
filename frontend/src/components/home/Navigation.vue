<template>
	<aside
		:class="{'is-active': baseStore.menuActive, 'is-resizing': isResizing, 'is-rail': sidebarRail && !isMobile, 'no-panel': !hasPanel}"
		class="menu-container nav2"
		:style="{'--sidebar-width': sidebarWidthStyle}"
	>
		<!-- Primary rail (after Sentry): one icon and a short label per area; always visible -->
		<nav
			class="rail"
			:aria-label="$t('navigation.main')"
		>
			<RouterLink
				:to="{name: 'fleet.home'}"
				class="rail-logo"
				:aria-label="$t('navigation.home')"
			>
				<LogoMark />
			</RouterLink>
			<RouterLink
				v-for="s in RAIL"
				:key="s.key"
				v-shortcut="s.shortcut"
				:to="s.to"
				class="rail-item"
				:class="{on: activeRail === s.key}"
				:title="s.label"
			>
				<span
					class="ri"
					:style="{'--c': s.color}"
				><Icon :icon="s.icon" /></span>
				<span class="rl">{{ s.label }}</span>
			</RouterLink>
			<span class="rail-spacer" />
			<RouterLink
				:to="{name: 'user.settings'}"
				class="rail-item"
				:class="{on: section === 'settings'}"
				title="Settings"
			>
				<span
					class="ri"
					style="--c:#6a6772"
				><Icon icon="cog" /></span>
				<span class="rl">Settings</span>
			</RouterLink>
			<button
				v-if="sidebarRail && hasPanel && !isMobile"
				type="button"
				class="rail-item rail-expand"
				title="Show the side panel"
				aria-label="Show the side panel"
				@click="toggleSidebarRail"
			>
				<span class="ri">»</span>
			</button>
		</nav>

		<!-- Secondary panel: the pages of the selected area; collapsing hides it and keeps the rail -->
		<div
			v-if="hasPanel && (!sidebarRail || isMobile)"
			class="panel2"
		>
			<header class="p2-head">
				{{ SECTION_TITLE[section] }}
			</header>

			<template v-if="section === 'tasks'">


				<Loading
					v-if="projectList.isLoading"
					variant="small"
				/>
				<template v-else>
					<p
						v-if="savedFilterProjects.length"
						class="p2-group"
					>
						Saved filters
					</p>
					<nav
						v-if="savedFilterProjects.length"
						class="menu"
						:aria-label="$t('navigation.savedFilters')"
					>
						<ProjectsNavigation
							:model-value="savedFilterProjects"
							:can-edit-order="false"
							:can-collapse="false"
						/>
					</nav>
					<ProjectFinder />
				</template>
			</template>

			<div class="p2-foot">
				<button
					v-if="!isMobile"
					type="button"
					class="p2-collapse"
					title="Hide the side panel"
					aria-label="Hide the side panel"
					@click="toggleSidebarRail"
				>
					« <span>Collapse</span>
				</button>
			</div>
		</div>

		<div
			v-if="!isMobile && !sidebarRail && hasPanel"
			class="resize-handle"
			@mousedown="startResize"
			@touchstart="startResize"
		/>
	</aside>
</template>

<script setup lang="ts">
import {computed, watchEffect} from 'vue'
import {useRoute} from 'vue-router'

import {SHORTCUTS} from '@/constants/shortcuts'
import LogoMark from '@/assets/fleet-mark.svg?component'
import Loading from '@/components/misc/Loading.vue'

import {useBaseStore} from '@/stores/base'
import {useProjects} from '@/composables/useProjects'
import {useConfigStore} from '@/stores/config'
import {PRO_FEATURE} from '@/constants/proFeatures'
import ProjectsNavigation from '@/components/home/ProjectsNavigation.vue'
import ProjectFinder from '@/components/fleet/ProjectFinder.vue'
import {useSidebarResize, sidebarRail, toggleSidebarRail, panelAbsent} from '@/composables/useSidebarResize'

// Two-level navigation after Sentry (Yomi 2026-11-18: "I like the sentry design for the left panel. Can't we copy that?"):
// a primary rail of areas and a secondary panel with the pages of the selected area.
const RAIL = [
	{key: 'monitoring', label: 'Monitoring', icon: 'bolt', color: '#2383e2', to: {name: 'fleet.live'}, shortcut: undefined},
	{key: 'tasks', label: 'Tasks', icon: 'calendar', color: '#e03e3e', to: {name: 'fleet.overview'}, shortcut: SHORTCUTS.navigation.overview},
	{key: 'devices', label: 'Devices', icon: 'sitemap', color: '#0f7b6c', to: {name: 'fleet.devices'}, shortcut: undefined},
	{key: 'models', label: 'Models', icon: 'layer-group', color: '#ad1a72', to: {name: 'fleet.models'}, shortcut: undefined},
	{key: 'teams', label: 'Teams', icon: 'users', color: '#d9730d', to: {name: 'teams.index'}, shortcut: SHORTCUTS.navigation.teams},
]
const SECTION_TITLE: Record<string, string> = {tasks: 'Projects'}

const baseStore = useBaseStore()
const route = useRoute()
const routeName = computed(() => String(route.name || ''))
// The area the current page belongs to: picks the secondary panel's contents.
const section = computed(() => {
	const n = routeName.value
	if (/^fleet\.(home|live|mission)/.test(n)) return 'monitoring'
	if (n.startsWith('fleet.devices')) return 'devices'
	if (n.startsWith('fleet.models')) return 'models'
	if (n.startsWith('teams')) return 'teams'
	if (n.startsWith('user.settings') || n === 'about') return 'settings'
	return 'tasks'
})
const activeRail = section
// Only Tasks needs a second column (its projects); every other area shows its sections as tabs inside the page, so nothing
// on the left repeats the rail (Yomi 2026-11-18).
const hasPanel = computed(() => section.value === 'tasks')
watchEffect(() => {
	panelAbsent.value = !hasPanel.value
})
const projectList = useProjects()
const configStore = useConfigStore()

const timeTrackingEnabled = computed(() => configStore.isProFeatureEnabled(PRO_FEATURE.TIME_TRACKING))

const {sidebarWidthStyle, isResizing, startResize, isMobile} = useSidebarResize()

const projects = computed(() => projectList.notArchivedRootProjects)
const favoriteProjects = computed(() => projectList.favoriteProjects)
const savedFilterProjects = computed(() => projectList.savedFilterProjects)
</script>

<style lang="scss" scoped>
.menu-container {
	--sidebar-width: #{$navbar-width};

	display: flex;
	flex-direction: row;
	background: #fff;
	color: $vikunja-nav-color;
	padding: 0;
	transition: transform $transition-duration ease-in;
	position: fixed;
	inset-block-start: $navbar-height;
	inset-block-end: 0;
	inset-inline-start: 0;
	transform: translateX(-100%);
	inline-size: var(--sidebar-width);
	overflow: hidden;

	[dir="rtl"] & {
		transform: translateX(100%);
	}

	@media screen and (max-width: $tablet) {
		inset-block-start: 0;
		inline-size: 70vw;
		z-index: 20;
	}

	&.is-active {
		transform: translateX(0);
		transition: transform $transition-duration ease-out;
	}

	&.is-resizing {
		transition: none;
	}
}

.resize-handle {
	position: absolute;
	inset-block-start: 0;
	inset-block-end: 0;
	inset-inline-end: 0;
	inline-size: 4px;
	cursor: ew-resize;
	background: transparent;
	transition: background-color $transition-duration ease;
	touch-action: none;

	&:hover,
	&:active {
		background-color: var(--primary);
	}
}
</style>
