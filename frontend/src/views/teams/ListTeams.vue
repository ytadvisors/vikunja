<template>
	<div
		class="fleet-page loader-container"
		:class="{ 'is-loading': loading}"
	>
		<p class="crumb"><RouterLink :to="{name: 'fleet.home'}">Fleet</RouterLink> / Teams</p>
		<header class="page-head">
			<div>
				<h1><span class="h-icon" style="--c:#9065b0">◎</span>Teams</h1>
				<p class="sub">People and agents who work together. A team can share projects.</p>
			</div>
			<div class="actions">
				<XButton
					:to="{name:'teams.create'}"
					icon="plus"
				>
					{{ $t('team.create.title') }}
				</XButton>
			</div>
		</header>

		<div
			v-if="teams.length > 0"
			class="card"
		>
			<table class="ntable teams-table">
				<thead>
					<tr>
						<th>Team</th>
						<th>Description</th>
						<th>Members</th>
						<th>Created</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="team in teams"
						:key="team.id"
						@click="router.push({name: 'teams.edit', params: {id: team.id}})"
					>
						<td>
							<RouterLink
								:to="{name: 'teams.edit', params: {id: team.id}}"
								class="team-name"
								@click.stop
							>
								{{ team.name }}
							</RouterLink>
						</td>
						<td class="muted">
							{{ plain(team.description) || '–' }}
						</td>
						<td>
							<span class="muted">{{ (team.members || []).length }}</span>
							<span class="team-members">{{ (team.members || []).slice(0, 5).map((m: any) => m.name || m.username).join(', ') }}{{ (team.members || []).length > 5 ? ' …' : '' }}</span>
						</td>
						<td class="muted">
							{{ team.created ? new Date(team.created).toLocaleDateString() : '' }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<p
			v-else-if="!isFetching"
			class="empty"
		>
			{{ $t('team.noTeams') }}
			<RouterLink :to="{name: 'teams.create'}">
				{{ $t('team.create.title') }}.
			</RouterLink>
		</p>
		<Pagination
			:total-pages="totalPages"
			:current-page="page"
		/>
	</div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {useRouteQuery} from '@vueuse/router'

import {useRouter} from 'vue-router'
import Pagination from '@/components/misc/Pagination.vue'
import {normalizePageNumber} from '@/client/queries/pagination'
import {useClampedPage} from '@/composables/useClampedPage'
import {useTeamsPage} from '@/composables/useTeams'
import { useTitle } from '@/composables/useTitle'
import {useDelayedLoading} from '@/composables/useDelayedLoading'

const { t } = useI18n({useScope: 'global'})
const router = useRouter()
const plain = (html?: string) => (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140)
useTitle(() => t('team.title'))

const page = useRouteQuery('page', '1', {transform: normalizePageNumber})
const teamsPage = useTeamsPage(page)
const {teams, totalPages, isFetching} = teamsPage
useClampedPage(page, teamsPage)
const loading = useDelayedLoading(isFetching)
</script>

<style lang="scss" scoped>
ul.teams {
  padding: 0;
  margin-block-start: 0;
  margin-inline-start: 0;
  border-radius: $radius;
  overflow: hidden;

  li {
    list-style: none;
    margin: 0;
    border-inline-end: 1px solid var(--grey-200);

    a {
      color: var(--text);
      display: block;
      padding: 0.5rem 1rem;
      transition: background-color $transition;

      &:hover {
        background: var(--grey-100);
      }
    }
  }

  li:last-child {
    border-inline-end: none;
  }
}
</style>
