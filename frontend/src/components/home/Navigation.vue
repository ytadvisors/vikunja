<template>
	<aside
		:class="{'is-active': baseStore.menuActive, 'is-resizing': isResizing, 'is-rail': sidebarRail && !isMobile}"
		class="menu-container"
		:style="{'--sidebar-width': sidebarWidthStyle}"
	>
		<nav
			class="menu top-menu"
			:aria-label="$t('navigation.main')"
		>
			<RouterLink
				:to="{name: 'home'}"
				class="logo"
				:aria-label="$t('navigation.home')"
			>
				<Logo
					width="164"
					height="48"
				/>
			</RouterLink>
			<p class="menu-label fleet-group">Fleet</p>
			<menu class="menu-list other-menu-items">
				<li><RouterLink :to="{ name: 'fleet.home'}"><span class="menu-item-icon icon"><Icon icon="tachometer-alt" /></span><span class="menu-text">Fleet</span></RouterLink></li>
				<li><RouterLink :to="{ name: 'fleet.devices'}"><span class="menu-item-icon icon"><Icon icon="sitemap" /></span><span class="menu-text">Devices</span></RouterLink></li>
				<li><RouterLink :to="{ name: 'fleet.models'}"><span class="menu-item-icon icon"><Icon icon="layer-group" /></span><span class="menu-text">Models</span></RouterLink></li>
				<li><RouterLink :to="{ name: 'fleet.live'}"><span class="menu-item-icon icon"><Icon icon="bolt" /></span><span class="menu-text">Live monitoring</span></RouterLink></li>
			</menu>
			<p class="menu-label fleet-group">Work</p>
			<menu class="menu-list other-menu-items">
				<li>
					<RouterLink
						:to="{ name: 'fleet.overview'}"
						:class="{'router-link-active': isWork}"
					>
						<span class="menu-item-icon icon"><Icon icon="calendar" /></span><span class="menu-text">Tasks</span>
					</RouterLink>
				</li>
				<li>
					<RouterLink
						v-shortcut="SHORTCUTS.navigation.teams"
						:to="{ name: 'teams.index'}"
					>
						<span class="menu-item-icon icon"><Icon icon="users" /></span>{{ $t('team.title') }}
					</RouterLink>
				</li>
				<li v-if="timeTrackingEnabled">
					<RouterLink :to="{ name: 'time-tracking'}">
						<span class="menu-item-icon icon"><Icon :icon="['far', 'clock']" /></span>{{ $t('timeTracking.title') }}
					</RouterLink>
				</li>
			</menu>
		</nav>

		<Loading
			v-if="projectList.isLoading"
			variant="small"
		/>
		<template v-else>
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

		<PoweredByLink
			class="mbs-auto"
			utm-medium="navigation"
		/>

		<button
			v-if="!isMobile"
			type="button"
			class="rail-toggle edge-toggle"
			:title="sidebarRail ? 'Expand the sidebar' : 'Collapse to icons'"
			:aria-label="sidebarRail ? 'Expand the sidebar' : 'Collapse to icons'"
			@click="toggleSidebarRail"
		>
			<span class="menu-item-icon">{{ sidebarRail ? '»' : '«' }}</span><span class="menu-text">Collapse</span>
		</button>
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
import PoweredByLink from '@/components/home/PoweredByLink.vue'
import Logo from '@/components/home/Logo.vue'
import Loading from '@/components/misc/Loading.vue'

import {useBaseStore} from '@/stores/base'
import {useProjects} from '@/composables/useProjects'
import {useConfigStore} from '@/stores/config'
import {PRO_FEATURE} from '@/constants/proFeatures'
import ProjectsNavigation from '@/components/home/ProjectsNavigation.vue'
import {useSidebarResize, sidebarRail, toggleSidebarRail} from '@/composables/useSidebarResize'

const baseStore = useBaseStore()
const route = useRoute()
// The Tasks entry stays lit on every page behind its tab bar.
const isWork = computed(() => /^(fleet\.overview|tasks\.range|projects\.index|labels\.index|trash)/.test(String(route.name || '')))
const projectList = useProjects()
const configStore = useConfigStore()

const timeTrackingEnabled = computed(() => configStore.isProFeatureEnabled(PRO_FEATURE.TIME_TRACKING))

const {sidebarWidthStyle, isResizing, startResize, isMobile} = useSidebarResize()

const projects = computed(() => projectList.notArchivedRootProjects)
const favoriteProjects = computed(() => projectList.favoriteProjects)
const savedFilterProjects = computed(() => projectList.savedFilterProjects)
</script>

<style lang="scss" scoped>
.logo {
	display: block;

	padding-inline-start: 1rem;
	margin-inline-end: 1rem;
	margin-block-end: 1rem;

	@media screen and (min-width: $tablet) {
		display: none;
	}
}

.menu-container {
	--sidebar-width: #{$navbar-width};

	display: flex;
	flex-direction: column;
	background: var(--site-background);
	color: $vikunja-nav-color;
	padding: 1rem 0;
	transition: transform $transition-duration ease-in;
	position: fixed;
	inset-block-start: $navbar-height;
	inset-block-end: 0;
	inset-inline-start: 0;
	transform: translateX(-100%);
	inline-size: var(--sidebar-width);
	overflow-y: auto;

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

.top-menu .menu-list {
	li {
		font-weight: 600;
		font-family: $vikunja-font;
	}

	.list-menu-link,
	li > a {
		padding-inline-start: 2rem;
		display: inline-block;

		.icon {
			padding-block-end: .25rem;
		}
	}
}

.menu + .menu {
	padding-block-start: math.div($navbar-padding, 2);
}
</style>
