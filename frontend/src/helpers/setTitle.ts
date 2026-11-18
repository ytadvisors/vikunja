export function setTitle(title : undefined | string) {
	document.title = (typeof title === 'undefined' || title === '')
		? 'Fleet HQ'
		: `${title} | Fleet HQ`
}
