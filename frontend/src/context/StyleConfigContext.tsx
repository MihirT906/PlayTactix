import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from 'react';
import { APP_CONFIG } from '../config';
import type { MatchData } from '../types/MatchDataInterfaces';

type EventStyle = {
	color: string;
	width: number;
};

type EventStyleKey = keyof typeof APP_CONFIG.events;

type StyleConfigContextValue = {
	homeTeamColor: string;
	awayTeamColor: string;
	eventStyles: Record<EventStyleKey, EventStyle>;
	setHomeTeamColor: (color: string) => void;
	setAwayTeamColor: (color: string) => void;
	setEventStyleColor: (eventKey: EventStyleKey, color: string) => void;
};

type StyleConfigProviderProps = {
	children: ReactNode;
	matchData: MatchData | null;
};

const normalizeColor = (color: string) => color.toUpperCase();

const DEFAULT_STYLE_CONFIG = {
	homeTeamColor: '#F27805',
	awayTeamColor: '#2563EB',
	eventStyles: {
	playerPossession: { ...APP_CONFIG.events.playerPossession },
	passingOption: { ...APP_CONFIG.events.passingOption },
	onBallEngagement: { ...APP_CONFIG.events.onBallEngagement },
	offBallRun: { ...APP_CONFIG.events.offBallRun },
},
} satisfies {
	homeTeamColor: string;
	awayTeamColor: string;
	eventStyles: Record<EventStyleKey, EventStyle>;
};

const StyleConfigContext = createContext<StyleConfigContextValue | null>(null);

export const StyleConfigProvider = ({ children, matchData }: StyleConfigProviderProps) => {
	const [homeTeamColor, setHomeTeamColor] = useState(DEFAULT_STYLE_CONFIG.homeTeamColor);
	const [awayTeamColor, setAwayTeamColor] = useState(DEFAULT_STYLE_CONFIG.awayTeamColor);
	const [eventStyles, setEventStyles] = useState(DEFAULT_STYLE_CONFIG.eventStyles);

	useEffect(() => {
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

export type { EventStyleKey };