export const APP_CONFIG = {
	brand: {
		title: 'PlayTactix',
	},
	timing: {
		chunkSize: 10,
		sleepIntervalMs: 100,
	},
	selection: {
		selectedPointsOpacity: 1,
		unselectedPointsOpacity: 0.6,
	},
	plot: {
		title: 'Player Positions',
		xAxisTitle: 'X Axis',
		yAxisTitle: 'Y Axis',
		xAxisRange: [0, 100] as [number, number],
		yAxisRange: [0, 100] as [number, number],
		markerSize: 10,
		markerColor: '#d85e1d',
		focusLineColor: '#2563eb',
		focusLineWidth: 2,
		paperBackgroundColor: '#ffffff',
		plotBackgroundColor: '#ffffff',
		modeBarButtonsToAdd: ['drawline', 'drawrect', 'eraseshape'] as const,
		modeBarButtonsToRemove: ['zoom', 'pan', 'select', 'lasso', 'zoomin', 'zoomout', 'autoScale2d'] as const,
	},
	theme: {
		cssVariables: {
			'--app-bg-gradient-start': '#f8fafc',
			'--app-bg-gradient-end': '#eef2ff',
			'--surface-bg': 'rgba(255, 255, 255, 0.9)',
			'--surface-border': '#dbe3f1',
			'--surface-shadow': 'rgba(15, 23, 42, 0.06)',
			'--app-title-color': '#0f172a',
			'--frame-pill-bg': '#e8efff',
			'--frame-pill-border': '#c6d2ef',
			'--frame-pill-text': '#1e3a8a',

			'--controls-button-bg': '#2563eb',
			'--controls-button-bg-hover': '#1d4ed8',
			'--controls-button-text': '#ffffff',
			'--controls-slider-progress': '#ef4444',
			'--controls-slider-cached': '#9ca3af',
			'--controls-slider-track': '#d1d5db',
			'--controls-slider-thumb': '#ef4444',
			'--controls-label-text': '#1f2937',

			'--annotation-panel-bg': '#f3f4f6',
			'--annotation-panel-border': '#d1d5db',
			'--annotation-text': '#1f2937',
			'--annotation-heading': '#111827',
			'--annotation-frame-bg': '#e5e7eb',
			'--annotation-frame-text': '#374151',
			'--annotation-empty-border': '#cbd5e1',
			'--annotation-empty-text': '#64748b',
			'--annotation-empty-bg': '#f8fafc',
			'--annotation-card-bg-start': '#2563eb',
			'--annotation-card-bg-end': '#1d4ed8',
			'--annotation-card-text': '#ffffff',
			'--annotation-type-bg': 'rgba(255, 255, 255, 0.2)',
			'--annotation-type-text': '#ffffff',
			'--annotation-type-border': 'rgba(255, 255, 255, 0.35)',
		},
	},
} as const;

export const CHUNK_SIZE = APP_CONFIG.timing.chunkSize;
export const SLEEP_INTERVAL = APP_CONFIG.timing.sleepIntervalMs;

export const SELECTED_POINTS_OPACITY = APP_CONFIG.selection.selectedPointsOpacity;
export const UNSELECTED_POINTS_OPACITY = APP_CONFIG.selection.unselectedPointsOpacity;

export const THEME_CSS_VARIABLES = APP_CONFIG.theme.cssVariables;