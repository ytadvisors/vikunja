<template>
	<div class="card project-rows">
		<table class="ntable">
			<thead>
				<tr>
					<th>Project</th>
					<th>Description</th>
					<th>Computers working on it</th>
					<th>Teams</th>
					<th />
				</tr>
			</thead>
			<tbody>
				<tr
					v-for="p in projects"
					:key="p.id"
					@click="open(p)"
				>
					<td class="pr-name">
						<i
							class="pr-dot"
							:style="{background: dot(p)}"
						/>
						<span>
							<b>{{ p.title }}</b>
							<small
								v-if="parentOf(p)"
								class="muted"
							>in {{ parentOf(p) }}</small>
						</span>
						<span
							v-if="p.is_favorite"
							class="pr-star"
							title="Favorite"
						>★</span>
						<span
							v-if="p.is_archived"
							class="pill"
						><i />archived</span>
					</td>
					<td class="pr-desc muted">
						{{ brief(p.description) || '–' }}
					</td>
					<td>
						<span
							v-for="c in computersFor(p.id)"
							:key="c"
							class="pill ok"
						><i />{{ c }}</span>
						<span
							v-if="!computersFor(p.id).length"
							class="muted"
						>–</span>
					</td>
					<td>
						<span
							v-for="tm in teamsFor(p.id)"
							:key="tm"
							class="pill info"
						>{{ tm }}</span>
						<span
							v-if="!teamsFor(p.id).length"
							class="muted"
						>–</span>
					</td>
					<td class="pr-open">
						<RouterLink
							:to="{name: 'project.index', params: {projectId: p.id}}"
							class="ghost sm"
							@click.stop
						>
							Open
						</RouterLink>
					</td>
				</tr>
			</tbody>
		</table>
		<div
			v-if="!projects.length"
			class="empty"
		>
			<b>No projects</b>Create one with New project.
		</div>
	</div>
</template>

<script setup lang="ts">
// Projects as horizontal rows (Yomi 2026-11-18: "display horizontally with brief description, computer working on it, and
// assigned teams"). Computers: the fleet stations with open tasks in the project. Teams: the teams the project is shared
// with (needs the viewer to be allowed to see the project's sharing; otherwise shown as none).
import {computed, reactive, watch} from 'vue'
import {useRouter} from 'vue-router'
import {fleetView, vkGet} from '@/fleet/api'

const props = defineProps<{projects: any[]}>()
const router = useRouter()

const all = computed(() => Object.fromEntries((props.projects || []).map((p: any) => [p.id, p])))
const parentOf = (p: any) => (p.parent_project_id && all.value[p.parent_project_id]?.title) || ''
const dot = (p: any) => (p.hex_color ? (p.hex_color.startsWith('#') ? p.hex_color : '#' + p.hex_color) : '#c7c6cd')
const brief = (html?: string) => (html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
const open = (p: any) => router.push({name: 'project.index', params: {projectId: p.id}})

const teams = reactive<Record<number, string[]>>({})
const computers = reactive<Record<number, string[]>>({})
const teamsFor = (id: number) => teams[id] || []
const computersFor = (id: number) => computers[id] || []

async function loadTeams(ids: number[]) {
	await Promise.all(ids.filter(id => id > 0 && !(id in teams)).map(async id => {
		teams[id] = []
		try {
			const t = await vkGet<any[]>(`/projects/${id}/teams`)
			teams[id] = (t || []).map((x: any) => x.name)
		} catch {
			// not allowed to see this project's sharing
		}
	}))
}

async function loadComputers() {
	const view = await fleetView()
	const stations = (view?.computers || []).filter((c: any) => c.member)
	const map: Record<number, Set<string>> = {}
	for (const c of stations) {
		try {
			const filter = encodeURIComponent(`assignees in '${c.member}' && done = false`)
			const tasks = await vkGet<any[]>(`/tasks?filter=${filter}&per_page=200`)
			for (const t of tasks || []) {
				(map[t.project_id] = map[t.project_id] || new Set()).add(c.name)
			}
		} catch {
			// the station's tasks are not visible to this viewer
		}
	}
	for (const [id, set] of Object.entries(map)) {
		computers[Number(id)] = [...set]
	}
}

watch(() => props.projects.map((p: any) => p.id).join(','), () => loadTeams(props.projects.map((p: any) => p.id)), {immediate: true})
loadComputers()
</script>

<style lang="scss" scoped>
.project-rows { overflow: hidden; }
.project-rows .ntable { border: 0 !important; }
.project-rows td { vertical-align: middle; }
.pr-name { display: flex; align-items: center; gap: 10px; min-width: 240px; }
.pr-name b { display: block; font-weight: 500; color: var(--text-strong); }
.pr-name small { font-size: 12px; }
.pr-dot { width: 10px; height: 10px; border-radius: 3px; flex: none; }
.pr-star { color: #d9a400; font-size: 12px; }
.pr-desc { max-width: 520px; }
.pr-open { text-align: right; width: 80px; }
td .pill { margin: 0 4px 4px 0; }
</style>
