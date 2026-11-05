import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import { APP_CONFIG } from '../config';
import type { MatchData } from '../types/MatchDataInterfaces';
import type { SavedStyle } from '../types/SavedProject';

type EventStyle = {
	color: string;
	width: number;
};

type EventStyleKey = keyof typeof APP_CONFIG.events;
type TeamVisibilityKey = 'home' | 'away';
// type OverlayVisibilityKey = 'pass_option_prob' | 'pitch_control';

type VisibilityState<T extends string> = Record<T, boolean>;

type StyleConfigContextValue = {
	homeTeamColor: string;
	awayTeamColor: string;
	eventStyles: Record<EventStyleKey, EventStyle>;
	teamVisibility: VisibilityState<TeamVisibilityKey>;
	eventVisibility: VisibilityState<EventStyleKey>;
	// overlayVisibility: VisibilityState<OverlayVisibilityKey>;
	setAllStyle: (style: SavedStyle) => void;
	setHomeTeamColor: (color: string) => void;
	setAwayTeamColor: (color: string) => void;
	setEventStyleColor: (eventKey: EventStyleKey, color: string) => void;
	setTeamVisibility: (teamKey: TeamVisibilityKey, visible: boolean) => void;
	setEventVisibility: (eventKey: EventStyleKey, visible: boolean) => void;
	// setOverlayVisibility: (overlayKey: OverlayVisibilityKey, visible: boolean) => void;
};

type StyleConfigProviderProps = {
	children: ReactNode;
	matchData: MatchData | null;
};

const normalizeColor = (color: string) => color.toUpperCase();

const DEFAULT_STYLE_CONFIG = {
	homeTeamColor: APP_CONFIG.theme.defaultTeamColors.home,
	awayTeamColor: APP_CONFIG.theme.defaultTeamColors.away,
	eventStyles: {
		playerPossession: { ...APP_CONFIG.events.playerPossession },
		passingOption: { ...APP_CONFIG.events.passingOption },
		onBallEngagement: { ...APP_CONFIG.events.onBallEngagement },
		offBallRun: { ...APP_CONFIG.events.offBallRun },
	},
	teamVisibility: {
		home: true,
		away: true,
	},
	eventVisibility: {
		playerPossession: true,
		passingOption: true,
		onBallEngagement: true,
		offBallRun: true,
	},
	// overlayVisibility: {
	// 	pass_option_prob: false,
	// 	pitch_control: false,
	// },
} satisfies {
	homeTeamColor: string;
	awayTeamColor: string;
	eventStyles: Record<EventStyleKey, EventStyle>;
	teamVisibility: VisibilityState<TeamVisibilityKey>;
	eventVisibility: VisibilityState<EventStyleKey>;
	// overlayVisibility: VisibilityState<OverlayVisibilityKey>;
};

const StyleConfigContext = createContext<StyleConfigContextValue | null>(null);

export const StyleConfigProvider = ({ children, matchData }: StyleConfigProviderProps) => {
	const [homeTeamColor, setHomeTeamColor] = useState<string>(DEFAULT_STYLE_CONFIG.homeTeamColor);
	const [awayTeamColor, setAwayTeamColor] = useState<string>(DEFAULT_STYLE_CONFIG.awayTeamColor);
	const [eventStyles, setEventStyles] = useState(DEFAULT_STYLE_CONFIG.eventStyles);
	const [teamVisibility, setTeamVisibilityState] = useState(DEFAULT_STYLE_CONFIG.teamVisibility);
	const [eventVisibility, setEventVisibilityState] = useState(DEFAULT_STYLE_CONFIG.eventVisibility);
	// const [overlayVisibility, setOverlayVisibilityState] = useState<VisibilityState<OverlayVisibilityKey>>(DEFAULT_STYLE_CONFIG.overlayVisibility);

	// The match whose kit colours a loaded project has already overridden, so the
	// metadata effect below doesn't clobber restored colours (effect order vs. restore is not guaranteed).
	const restoredForMatchData = useRef<MatchData | null>(null);

	useEffect(() => {
		if (matchData !== null && restoredForMatchData.current === matchData) return;

		const homeColor = matchData?.home_team_kit?.jersey_color;
		const awayColor = matchData?.away_team_kit?.jersey_color;

		if (typeof homeColor === 'string' && homeColor.length > 0) {
			setHomeTeamColor(normalizeColor(homeColor));
		}

		if (typeof awayColor === 'string' && awayColor.length > 0) {
			setAwayTeamColor(normalizeColor(awayColor));
		}
	}, [matchData]);

	return (
		<StyleConfigContext.Provider
			value={{
				homeTeamColor,
				awayTeamColor,
				eventStyles,
				teamVisibility,
				eventVisibility,
				// overlayVisibility,
				setAllStyle: (style) => {
					restoredForMatchData.current = matchData;
					setHomeTeamColor(normalizeColor(style.homeTeamColor));
					setAwayTeamColor(normalizeColor(style.awayTeamColor));
					// Merge over defaults so a file missing a key (e.g. a style added later) still works.
					setEventStyles((current) => {
						const next: Record<EventStyleKey, EventStyle> = { ...current };
						for (const key of Object.keys(current) as EventStyleKey[]) {
							const saved = style.eventStyles[key];
							if (saved) next[key] = { color: normalizeColor(saved.color), width: saved.width };
						}
						return next as typeof current;
					});
					setTeamVisibilityState((current) => ({ ...current, ...style.teamVisibility }));
					setEventVisibilityState((current) => ({ ...current, ...style.eventVisibility }));
				},
				setHomeTeamColor: (color: string) => setHomeTeamColor(normalizeColor(color)),
				setAwayTeamColor: (color: string) => setAwayTeamColor(normalizeColor(color)),
				setEventStyleColor: (eventKey, color) => {
					setEventStyles((currentStyles) => ({
						...currentStyles,
						[eventKey]: {
							...currentStyles[eventKey],
							color: normalizeColor(color),
						},
					}));
				},
				setTeamVisibility: (teamKey, visible) => {
					setTeamVisibilityState((currentVisibility) => ({
						...currentVisibility,
						[teamKey]: visible,
					}));
				},
				setEventVisibility: (eventKey, visible) => {
					setEventVisibilityState((currentVisibility) => ({
						...currentVisibility,
						[eventKey]: visible,
					}));
				},
				// setOverlayVisibility: (overlayKey, visible) => {
				// 	setOverlayVisibilityState((currentVisibility) => {
				// 		if (!visible) {
				// 			return {
				// 				...currentVisibility,
				// 				[overlayKey]: false,
				// 			};
				// 		}

				// 		return Object.keys(currentVisibility).reduce(
				// 			(nextVisibility, key) => ({
				// 				...nextVisibility,
				// 				[key]: key === overlayKey,
				// 			}),
				// 			{} as VisibilityState<OverlayVisibilityKey>
				// 		);
				// 	});
				// },
			}}
		>
			{children}
		</StyleConfigContext.Provider>
	);
};

export const useStyleConfig = () => {
	const context = useContext(StyleConfigContext);

	if (!context) {
		throw new Error('useStyleConfig must be used within a StyleConfigProvider');
	}

	return context;
};

export type { EventStyleKey, TeamVisibilityKey };