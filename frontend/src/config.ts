export const APP_CONFIG = {
	brand: {
		title: 'PlayTactix',
	},
	timing: {
		chunkSize: 300,
		sleepIntervalMs: 100,
	},
	selection: {
		selectedPointsOpacity: 1,
		unselectedPointsOpacity: 0.6,
	},
	plot: {
		xAxisRange: [-50, 50] as [number, number],
		yAxisRange: [-50, 50] as [number, number],
		markerSize: 15,
		markerColor: '#d85e1d',
		focusLineColor: '#2563eb',
		focusLineWidth: 2,
		paperBackgroundColor: '#ffffff',
		plotBackgroundColor: '#ffffff',
		modeBarButtonsToAdd: ['drawline', 'drawrect', 'eraseshape'] as const,
		modeBarButtonsToRemove: ['zoom', 'pan', 'select', 'lasso', 'zoomin', 'zoomout', 'autoScale2d'] as const,
		ballMarkerSize: 7,
		ballMarkerColor: '#FFFFFF',
	},
	events: {
		playerPossession: {
			color: '#FFD60A',
			width: 2,
		},
		passingOption: {
			color: '#32D7FF',
			width: 2,
		},
		onBallEngagement: {
			color: '#FF4D9D',
			width: 2,
		},
		offBallRun: {
			color: '#FF6B3D',
			width: 2,
		},
	},
	theme: {
		cssVariables: {
			'--app-bg-primary': '#2C2F33',
			'--app-bg-secondary': '#ffffff4c',
			'--app-bg-accent': '#F27805',
			'--app-bg-accent-light': '#f27805be',
			'--app-border-color': '#000000',
			'--app-border-radius': '12px',
			'--app-info-font-size': '14px',
			'--app-info-font-color': '#FFFFFFE6',
			'--app-heading-font-size': '18px',
			'--app-heading-font-color': '#000000',
		},
	},
} as const;

export const CHUNK_SIZE = APP_CONFIG.timing.chunkSize;
export const SLEEP_INTERVAL = APP_CONFIG.timing.sleepIntervalMs;

export const SELECTED_POINTS_OPACITY = APP_CONFIG.selection.selectedPointsOpacity;
export const UNSELECTED_POINTS_OPACITY = APP_CONFIG.selection.unselectedPointsOpacity;

export const THEME_CSS_VARIABLES = APP_CONFIG.theme.cssVariables;