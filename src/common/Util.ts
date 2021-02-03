import React from 'react';

export default function getBoundingClient(ref: React.RefObject<HTMLElement>) {
	const boundingClient = ref.current?.getBoundingClientRect();

	return {
		top: boundingClient?.top ?? 0,
		left: boundingClient?.left ?? 0,
		right: boundingClient?.right ?? 0,
		bottom: boundingClient?.bottom ?? 0,
		height: boundingClient?.height ?? 0,
		width: boundingClient?.width ?? 0,
	};
}
