// Generic small utilities
export function debounce<T extends (...args: any[]) => void>(
	fn: T,
	wait = 500
) {
	let timeout: ReturnType<typeof setTimeout>;
	const debounced = (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => fn(...args), wait);
	};
	(debounced as any).cancel = () => clearTimeout(timeout);
	return debounced as T & { cancel: () => void };
}
