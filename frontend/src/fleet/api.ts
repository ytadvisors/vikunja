// Fleet screens (ytadvisors fork, Vikunja #1193): small helpers to read Vikunja's own API and the fleet hub's console.
// Missions are Vikunja tasks assigned to the hub account that have sub-tasks (one per job); the hub writes the briefing,
// the job results and the debrief as comments, so this file only reads what Vikunja already stores.
import {getToken} from '@/helpers/auth'
import {getApiRootUrl} from '@/helpers/apiUrl'

export const HUB_USER = 'fleet-hub'
// The hub's read-only console (computers, recommendations). Same machine as the hub; override with window.FLEET_CONSOLE_URL.
export const CONSOLE_URL: string = (window as any).FLEET_CONSOLE_URL || 'http://127.0.0.1:18972'

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
	const r = await fetch(`${getApiRootUrl()}/api/v1${path}`, {
		method,
		headers: {'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json'},
		body: body === undefined ? undefined : JSON.stringify(body),
	})
	if (!r.ok) {
		throw new Error(`${method} ${path}: ${r.status}`)
	}
	return r.json() as Promise<T>
}
export const vkGet = <T>(path: string) => call<T>('GET', path)
export const vkPut = <T>(path: string, body: unknown) => call<T>('PUT', path, body)
export const vkPost = <T>(path: string, body: unknown) => call<T>('POST', path, body)

export interface Computer {name: string; state: string; member: string; chip: string; memory_gb: number | null; system: string; model: string; address: string; jobs: number; last_job: string | null; seconds: number; tokens: number; since: string | null; checks: string[]; checked: number | null}
export interface Recommendation {computer: string; level: string; title: string; seen: string; why: string}
export interface FleetView {now: string; totals: Record<string, any>; computers: Computer[]; recommendations: Recommendation[]; log: {ts: string; who: string; what: string; detail: string}[]}

export async function fleetView(): Promise<FleetView | null> {
	try {
		const r = await fetch(`${CONSOLE_URL}/api/view`)
		return r.ok ? await r.json() : null
	} catch {
		return null
	}
}

// Live updates: the console pushes an event whenever the hub records one (no timer, no polling).
export function onFleetChange(fn: () => void): () => void {
	let es: EventSource | null = null
	try {
		es = new EventSource(`${CONSOLE_URL}/api/events`)
		es.onmessage = () => fn()
	} catch {
		es = null
	}
	return () => es?.close()
}

// The projects where the hub works ("S Stations").
export async function stationProjects(): Promise<any[]> {
	const ps = await vkGet<any[]>('/projects?per_page=200')
	return ps.filter(p => /^S Stations\b/.test(p.title) && !p.is_archived)
}

export async function listTasks(projectId: number, done = false): Promise<any[]> {
	const views = await vkGet<any[]>(`/projects/${projectId}/views`)
	const list = views.find(v => v.view_kind === 'list') || views[0]
	const filter = done ? '&filter=done+%3D+true' : ''
	return vkGet<any[]>(`/projects/${projectId}/views/${list.id}/tasks?per_page=200${filter}`)
}

export const isMission = (t: any) => (t.related_tasks?.subtask?.length ?? 0) > 0 && (t.assignees || []).some((a: any) => a.username === HUB_USER)

// Give the fleet a task: create it in the stations project and assign it to the hub, which turns it into a mission.
export async function giveTask(projectId: number, title: string, description: string): Promise<any> {
	const t = await vkPut<any>(`/projects/${projectId}/tasks`, {title, description: description ? `<p>${escapeHtml(description).replace(/\n/g, '<br>')}</p>` : ''})
	const users = await vkGet<any[]>(`/projects/${projectId}/projectusers?s=${HUB_USER}`)
	const hub = users.find(u => u.username === HUB_USER)
	if (!hub) {
		throw new Error('the hub account is not a member of this project')
	}
	await vkPut(`/tasks/${t.id}/assignees`, {user_id: hub.id})
	return t
}

export const escapeHtml = (s: string) => s.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c] as string))

export function ago(t: string | number | null | undefined, now = Date.now()): string {
	if (!t) {
		return 'never'
	}
	const ms = now - (typeof t === 'number' ? t * 1000 : Date.parse(t))
	const m = Math.round(ms / 60000)
	return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`
}
