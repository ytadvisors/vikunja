<template>
	<aside
		:class="{'is-active': baseStore.menuActive, 'is-resizing': isResizing, 'is-rail': sidebarRail && !isMobile}"
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
				v-if="sidebarRail && !isMobile"
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
			v-if="!sidebarRail || isMobile"
			class="panel2"
		>
			<header class="p2-head">
				{{ SECTION_TITLE[section] }}
			</header>

			<menu
				v-if="section === 'fleet'"
				class="menu-list p2-list"
			>
				<li><RouterLink :to="{name: 'fleet.home'}">Overview</RouterLink></li>
				<li><RouterLink :to="{name: 'fleet.devices'}">Devices</RouterLink></li>
				<li><RouterLink :to="{name: 'fleet.models'}">Models</RouterLink></li>
				<li><RouterLink :to="{name: 'fleet.live'}">Live monitoring</RouterLink></li>
			</menu>

			<template v-else-if="section === 'teams'">
				<menu class="menu-list p2-list">
					<li><RouterLink :to="{name: 'teams.index'}">All teams</RouterLink></li>
					<li><RouterLink :to="{name: 'teams.create'}">New team</RouterLink></li>
				</menu>
			</template>

			<template v-else-if="section === 'settings'">
				<menu class="menu-list p2-list">
					<li><RouterLink :to="{name: 'user.settings.general'}">General</RouterLink></li>
					<li><RouterLink :to="{name: 'user.settings.avatar'}">Avatar</RouterLink></li>
					<li><RouterLink :to="{name: 'about'}">About Fleet HQ</RouterLink></li>
				</menu>
				<p class="p2-note">
					All settings are listed on the settings page.
				</p>
			</template>

			<template v-else>
				<menu class="menu-list p2-list">
					<li><RouterLink :to="{name: 'fleet.overview'}">My tasks</RouterLink></li>
					<li><RouterLink :to="{name: 'tasks.range'}">Upcoming</RouterLink></li>
					<li><RouterLink :to="{name: 'projects.index'}">Projects</RouterLink></li>
					<li><RouterLink :to="{name: 'labels.index'}">Labels</RouterLink></li>
					<li v-if="timeTrackingEnabled">
						<RouterLink :to="{name: 'time-tracking'}">
							{{ $t('timeTracking.title') }}
						</RouterLink>
					</li>
					<li><RouterLink :to="{name: 'trash'}">Trash</RouterLink></li>
				</menu>

				<Loading
					v-if="projectList.isLoading"
					variant="small"
				/>
				<template v-else>
					<p
						v-if="favoriteProjects.length"
						class="p2-group"
					>
						Favorites
					</p>
					<nav
						v-if="favoriteProjects.length"
						class="menu"
						:aria-label="$t('project.pseudo.favorites.title')"
					>
						<ProjectsNavigation
							:model-value="favoriteProjects"
							:can-edit-order="false"
							:can-collapse="false"
						/>
					</nav>
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
					<p class="p2-group">
						{{ $t('project.projects') }}
					</p>
					<nav
						class="menu"
						:aria-label="$t('project.projects')"
					>
						<ProjectsNavigation
							:model-value="projects"
							:can-edit-order="true"
							:can-collapse="true"
						/>
					</nav>
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
			v-if="!isMobile && !sidebarRail"
			class="resize-handle"
			@mousedown="startResize"
			@touchstart="startResize"
		/>
	</aside>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {useRoute} from 'vue-router'

import {SHORTCUTS} from '@/constants/shortcuts'
import LogoMark from '@/assets/fleet-mark.svg?component'
import Loading from '@/components/misc/Loading.vue'

import {useBaseStore} from '@/stores/base'
import {useProjects} from '@/composables/useProjects'
import {useConfigStore} from '@/stores/config'
import {PRO_FEATURE} from '@/constants/proFeatures'
import ProjectsNavigation from '@/components/home/ProjectsNavigation.vue'
import {useSidebarResize, sidebarRail, toggleSidebarRail} from '@/composables/useSidebarResize'

// Two-level navigation after Sentry (Yomi 2026-11-18: "I like the sentry design for the left panel. Can't we copy that?"):
// a primary rail of areas and a secondary panel with the pages of the selected area.
const RAIL = [
	{key: 'fleet', label: 'Fleet', icon: 'tachometer-alt', color: '#e16b16', to: {name: 'fleet.home'}, shortcut: undefined},
	{key: 'devices', label: 'Devices', icon: 'sitemap', color: '#0f7b6c', to: {name: 'fleet.devices'}, shortcut: undefined},
	{key: 'monitoring', label: 'Monitoring', icon: 'bolt', color: '#2383e2', to: {name: 'fleet.live'}, shortcut: undefined},
	{key: 'models', label: 'Models', icon: 'layer-group', color: '#ad1a72', to: {name: 'fleet.models'}, shortcut: undefined},
	{key: 'tasks', label: 'Tasks', icon: 'calendar', color: '#e03e3e', to: {name: 'fleet.overview'}, shortcut: SHORTCUTS.navigation.overview},
	{key: 'teams', label: 'Teams', icon: 'users', color: '#d9730d', to: {name: 'teams.index'}, shortcut: SHORTCUTS.navigation.teams},
]
const SECTION_TITLE: Record<string, string> = {fleet: 'Fleet', tasks: 'Tasks', teams: 'Teams', settings: 'Settings'}

const baseStore = useBaseStore()
const route = useRoute()
const routeName = computed(() => String(route.name || ''))
// The area the current page belongs to: picks the secondary panel's contents.
const section = computed(() => {
	const n = routeName.value
	if (/^fleet\.(home|devices|models|live|mission)/.test(n)) return 'fleet'
	if (n.startsWith('teams')) return 'teams'
	if (n.startsWith('user.settings')) return 'settings'
	return 'tasks'
})
// The lit rail item: the exact Fleet page where there is one, otherwise the area.
const activeRail = computed(() => {
	const n = routeName.value
	if (n.startsWith('fleet.devices')) return 'devices'
	if (n.startsWith('fleet.live')) return 'monitoring'
	if (n.startsWith('fleet.models')) return 'models'
	if (section.value === 'fleet') return 'fleet'
	return section.value
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
