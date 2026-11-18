<template>
	<div class="project-finder">
		<input
			v-model="q"
			type="search"
			class="pf-search"
			placeholder="Find a project"
			aria-label="Find a project"
		>
		<p
			v-if="favorites.length && !q"
			class="p2-group"
		>
			Favorites
		</p>
		<RouterLink
			v-for="p in (q ? [] : favorites)"
			:key="'f' + p.id"
			:to="{name: 'project.index', params: {projectId: p.id}}"
			:class="['pf-row', {on: p.id === activeId}]"
			:title="pathOf(p)"
		>
			<i
				class="pf-dot"
				:style="{background: dot(p)}"
			/>
			<span class="pf-text"><b>{{ p.title }}</b><small v-if="parentOf(p)">{{ parentOf(p) }}</small></span>
			<span class="pf-star">★</span>
		</RouterLink>
		<p class="p2-group">
			{{ q ? `Projects matching “${q}”` : 'All projects' }}
		</p>
		<RouterLink
			v-for="p in shown"
			:key="p.id"
			:to="{name: 'project.index', params: {projectId: p.id}}"
			:class="['pf-row', {on: p.id === activeId}]"
			:title="pathOf(p)"
		>
			<i
				class="pf-dot"
				:style="{background: dot(p)}"
			/>
			<span class="pf-text"><b>{{ p.title }}</b><small v-if="parentOf(p)">{{ parentOf(p) }}</small></span>
		</RouterLink>
		<p
			v-if="!shown.length"
			class="p2-note"
		>
			No project matches.
		</p>
		<RouterLink
			:to="{name: 'projects.index'}"
			class="pf-all"
		>
			Manage projects
		</RouterLink>
	</div>
</template>

<script setup lang="ts">
// Project finder for the side panel (Yomi 2026-11-18: "Need a better way to navigate the projects. They don't work on the
// side panel."): a search box and a flat list with full names, the parent shown underneath, favourites first. Replaces the
// nested tree, which truncated names to a few letters at panel width. Ordering and nesting are managed on the Projects page.
import {computed, ref} from 'vue'
import {useRoute} from 'vue-router'
import {useProjects} from '@/composables/useProjects'

const route = useRoute()
const projectList = useProjects()
const q = ref('')

const all = computed<any[]>(() => (projectList.projectsArray || []).filter((p: any) => p && p.id > 0 && !p.is_archived))
const byId = computed(() => Object.fromEntries(all.value.map((p: any) => [p.id, p])))
const activeId = computed(() => Number(route.params.projectId || 0))
const parentOf = (p: any) => (p.parent_project_id && byId.value[p.parent_project_id]?.title) || ''
const pathOf = (p: any) => {
	const parts = [p.title]
	let cur = p
	for (let i = 0; i < 6 && cur?.parent_project_id && byId.value[cur.parent_project_id]; i++) {
		cur = byId.value[cur.parent_project_id]
		parts.unshift(cur.title)
	}
	return parts.join(' / ')
}
const dot = (p: any) => (p.hex_color ? (p.hex_color.startsWith('#') ? p.hex_color : '#' + p.hex_color) : '#c7c6cd')
const favorites = computed(() => all.value.filter((p: any) => p.is_favorite))
const shown = computed(() => {
	const needle = q.value.trim().toLowerCase()
	const list = needle ? all.value.filter((p: any) => pathOf(p).toLowerCase().includes(needle)) : all.value
	return [...list].sort((a: any, b: any) => pathOf(a).localeCompare(pathOf(b)))
})
</script>

<style lang="scss" scoped>
.project-finder { display: flex; flex-direction: column; padding: 0 8px 8px; }
.pf-search { margin: 8px 0 4px; height: 32px; border: 1px solid var(--fx-line, #dad9de); border-radius: 6px; padding: 0 10px; font: inherit; font-size: 13px; background: #fff; color: var(--text-strong); }
.pf-search:focus { outline: 0; border-color: #2383e2; box-shadow: 0 0 0 2px rgba(35, 131, 226, .15); }
.pf-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; color: var(--text); text-decoration: none; min-width: 0; }
.pf-row:hover { background: var(--fx-grey, #f3f3f6); }
.pf-row.on { background: var(--fx-grey, #f3f3f6); }
.pf-row.on b { font-weight: 600; color: var(--text-strong); }
.pf-dot { width: 8px; height: 8px; border-radius: 2px; flex: none; }
.pf-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.pf-text b { font-weight: 400; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pf-text small { font-size: 11px; color: var(--text-light); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pf-star { color: #d9a400; font-size: 12px; }
.pf-all { margin: 8px 8px 0; font-size: 12px; color: var(--text-light); }
.p2-group { margin: 0; padding: 12px 8px 4px; font-size: 11px; font-weight: 500; letter-spacing: .06em; text-transform: uppercase; color: var(--text-light); }
.p2-note { padding: 4px 8px; font-size: 12px; color: var(--text-light); }
</style>
