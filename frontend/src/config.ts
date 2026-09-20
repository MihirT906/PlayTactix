// First entry is the initial theme; clicking cycles through the rest (see CursorGlow).
const THEME_CYCLE = [
	{ primary: '#233d4d', accent: '#fe7f2d' }, // charcoal with pumpkin accent
	{ primary: '#02182B', accent: '#D7263D' }, // nights with crimson accent
	{ primary: '#1A281E', accent: '#FEFCE0' }, // emerald with lime accent
	// { primary: '#372F3D', accent: '#FEBCC4' },
	// { primary: '#722F37', accent: '#EFDFBB' },
] as const;

export const APP_CONFIG = {
	brand: {
		title: "Tapp'd",
	},
	timing: {
		chunkSize: 300,
		sleepIntervalMs: 100,
	},
	selection: {
		selectedPointsOpacity: 1,
		unselectedPointsOpacity: 0.3,
	},
	plot: {
		xAxisRange: [-50, 50] as [number, number],
		yAxisRange: [-50, 50] as [number, number],
		markerSize: 15,
		markerColor: '#d85e1d',
		focusLineColor: '#d85e1d',
		focusLineWidth: 2,
		rectLineColor: '#d85e1d',
		rectLineWidth: 2,
		rectFillColor: 'rgba(0, 0, 0, 0.2)',
		highlightRingGap: 5,
		highlightRingWidth: 1,
		paperBackgroundColor: '#ffffff',
		plotBackgroundColor: '#ffffff',
		modeBarButtonsToAdd: ['eraseshape'] as const,
		modeBarButtonsToRemove: [
			'zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d',
			'autoScale2d', 'resetScale2d', 'hoverClosestCartesian', 'hoverCompareCartesian',
			'toggleSpikelines', 'toImage',
		] as const,
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
		themeCycle: THEME_CYCLE,
		defaultTeamColors: {
			home: '#3B82F6',
			away: '#EF4444',
		},
		cssVariables: {
			'--app-bg-primary': THEME_CYCLE[0].primary,
			'--app-bg-secondary': '#ffffff4c',
				'--app-bg-accent': THEME_CYCLE[0].accent,
				'--app-bg-accent-light': `${THEME_CYCLE[0].accent}be`,
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