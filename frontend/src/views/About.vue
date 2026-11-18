<template>
	<Modal
		variant="hint-modal"
		@close="goBack()"
	>
		<Card
			class="has-no-shadow"
			:title="$t('about.title')"
			:padding="false"
			:show-close="true"
			@close="goBack()"
		>
			<div class="p-4">
				<p v-if="versionsEqual">
					{{ $t('about.version', {version: apiVersion}) }}
				</p>
				<template v-else>
					<p>{{ $t('about.frontendVersion', {version: frontendVersion}) }}</p>
					<p>{{ $t('about.apiVersion', {version: apiVersion}) }}</p>
				</template>
				<p v-if="proActive">
					{{ $t('about.proActive') }}
				</p>
				<p class="fleet-licence">
					Fleet HQ by YT Advisors is based on
					<a
						href="https://vikunja.io"
						target="_blank"
						rel="noopener"
					>Vikunja</a>,
					free software licensed under the
					<a
						href="https://www.gnu.org/licenses/agpl-3.0.html"
						target="_blank"
						rel="noopener"
					>GNU Affero General Public License v3</a>.
					The source code of the version you are using, including YT Advisors' changes, is available from YT Advisors on request; the original Vikunja source is at
					<a
						href="https://github.com/go-vikunja/vikunja"
						target="_blank"
						rel="noopener"
					>github.com/go-vikunja/vikunja</a>.
				</p>
			</div>
			<template #footer>
				<XButton
					variant="secondary"
					@click.prevent.stop="goBack()"
				>
					{{ $t('misc.close') }}
				</XButton>
			</template>
		</Card>
	</Modal>
</template>

<script setup lang="ts">
import {computed} from 'vue'

import {VERSION as frontendVersion} from '@/version.json'

import {useConfigStore} from '@/stores/config'
import {useGoBack} from '@/composables/useGoBack'

const configStore = useConfigStore()
const goBack = useGoBack()
const apiVersion = computed(() => configStore.version)
const versionsEqual = computed(() => apiVersion.value === frontendVersion)
const proActive = computed(() => configStore.enabled_pro_features.length > 0)
</script>
