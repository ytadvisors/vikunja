// Reads the hub's mission comments (briefing, job results, debrief) into plain data. Only text is extracted; nothing from a
// comment is rendered as HTML, so a comment cannot inject markup into these screens.
const doc = (html: string) => new DOMParser().parseFromString(html || '', 'text/html')
const txt = (el: Element | null | undefined) => (el?.textContent || '').replace(/\s+\n/g, '\n').trim()

export interface Briefing {general: string; model: string; seconds: string; text: string; team: string; jobs: {n: string; name: string; instruction: string; checks: string}[]; then: string; cannot: boolean}
export interface Debrief {incomplete: string; general: string; answer: string; confidence: string; untrusted: string[]; cost: string; trustedAll: boolean}
export interface JobResult {station: string; output: string; model: string; seconds: string; tokens: string; checks: {name: string; command: string; exit: string}[]}

export function findBriefing(comments: any[]): Briefing | null {
	const c = comments.find(x => /<b>BRIEFING<\/b>/.test(x.comment))
	if (!c) {
		return null
	}
	const d = doc(c.comment)
	const ps = [...d.querySelectorAll('p')]
	const head = txt(ps[0])
	const m = head.match(/general \(([^,]+), model ([^,]+), (\d+) s\)/) || []
	const cannot = /cannot be done by the stations/.test(head)
	const rows = [...d.querySelectorAll('table tr')].slice(1).map(r => [...r.querySelectorAll('td')].map(td => txt(td)))
	const find = (label: string) => txt(ps.find(p => txt(p.querySelector('b')) === label)).replace(new RegExp(`^${label}:?\\s*`), '')
	return {
		general: m[1] || '', model: m[2] || '', seconds: m[3] || '', cannot,
		text: txt(ps[1]),
		team: find('Team'),
		then: find('Then'),
		jobs: rows.map(r => ({n: r[0], name: r[1], instruction: r[2], checks: r[4] || ''})),
	}
}

export function findDebrief(comments: any[]): Debrief | null {
	const c = comments.find(x => /<b>DEBRIEF/.test(x.comment))
	if (!c) {
		return null
	}
	const d = doc(c.comment)
	const ps = [...d.querySelectorAll('p')]
	const head = txt(ps[0])
	const find = (label: string) => txt(ps.find(p => txt(p.querySelector('b')).startsWith(label))).replace(new RegExp(`^${label}:?\\s*`), '')
	return {
		incomplete: (head.match(/INCOMPLETE: ([^)]+)\)/) || [])[1] || '',
		general: (head.match(/general \(([^,]+),/) || [])[1] || '',
		answer: txt(d.querySelector('pre')),
		confidence: find('Confidence'),
		untrusted: [...d.querySelectorAll('ul li')].map(li => txt(li)),
		trustedAll: /trusted every job result/.test(c.comment),
		cost: find('Cost'),
	}
}

export function findStopped(comments: any[]): string {
	const c = comments.find(x => /the mission stopped/.test(x.comment))
	return c ? txt(doc(c.comment).body).replace(/^fleet-hub: the mission stopped\. Reason:\s*/, '') : ''
}

export function findJobResult(comments: any[]): JobResult | null {
	const c = comments.find(x => /did this task on its own local model/.test(x.comment))
	if (!c) {
		return null
	}
	const d = doc(c.comment)
	const ps = [...d.querySelectorAll('p')]
	const meta = txt(ps.find(p => /^model /.test(txt(p))))
	const m = meta.match(/model (.+?), ([\d.?]+) s, (\S+) tokens/) || []
	return {
		station: txt(ps[0]?.querySelector('b')),
		output: txt(d.querySelector('pre')),
		model: m[1] || '', seconds: m[2] || '', tokens: m[3] || '',
		checks: [...d.querySelectorAll('table tr')].slice(1).map(r => {
			const td = [...r.querySelectorAll('td')].map(x => txt(x))
			return {name: td[0], command: td[1], exit: td[2]}
		}),
	}
}
