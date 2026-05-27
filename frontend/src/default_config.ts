export const APP_CONFIG = {
	brand: {
		title: 'PlayTactix',
	},
	timing: {
		chunkSize: 1000,
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
			color: '#e60c0c',
			width: 2,
		},
		passingOption: {
			color: '#eded0b',
			width: 2,
		},
		onBallEngagement: {
			color: '#f746aa',
			width: 2,
		},
		offBallRun: {
			color: '#0bf7e6',
			width: 2,
		},
	},
	theme: {
		cssVariables: {
			'--app-bg-primary': '#2C2F33',
			'--app-bg-secondary': '#ffffff4c',
				'--app-bg-accent': '#f59e0b',
				'--app-bg-accent-light': '#f59e0bbe',
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