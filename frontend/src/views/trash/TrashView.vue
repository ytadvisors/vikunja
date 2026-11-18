<template>
	<div class="fleet-page">
		<p class="crumb"><RouterLink :to="{name: 'fleet.home'}">Fleet</RouterLink> / Trash</p>
		<header class="page-head">
			<div>
				<h1><span class="h-icon" style="--c:#787774">⌫</span>{{ $t('trash.title') }}</h1>
				<p class="sub">Deleted tasks and projects. Restore them, or empty the trash.</p>
			</div>
		</header>
		<WorkTabs />
		<div class="trash-header">
			<SwitchView
				is="nav"
				:aria-label="$t('trash.tabs.label')"
			>
				<BaseButton
					class="switch-view-button"
					:class="{'is-active': route.name === 'trash.tasks'}"
					:to="{name: 'trash.tasks'}"
				>
					{{ $t('quickActions.tasks') }}
				</BaseButton>
				<BaseButton
					class="switch-view-button"
					:class="{'is-active': route.name === 'trash.projects'}"
					:to="{name: 'trash.projects'}"
				>
					{{ $t('quickActions.projects') }}
				</BaseButton>
			</SwitchView>
			<!-- Each tab teleports its own actions here -->
			<div id="trash-actions" />
		</div>
		<RouterView />
	</div>
</template>

<script setup lang="ts">
import WorkTabs from '@/components/fleet/WorkTabs.vue'
import {useRoute} from 'vue-router'
import {useI18n} from 'vue-i18n'

import BaseButton from '@/components/base/BaseButton.vue'
import SwitchView from '@/components/misc/SwitchView.vue'
import {useTitle} from '@/composables/useTitle'

const route = useRoute()
const {t} = useI18n({useScope: 'global'})
useTitle(() => t('trash.title'))
</script>

<style lang="scss" scoped>
.trash-header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	margin-block-end: 1rem;
}
</style>
