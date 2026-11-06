import { getLogger } from "../services/logger";
import type { DrawShape, Segment } from "../plot/annotationGeometry";

const logger = getLogger("AnnotationStore");

// What each type of annotation is drawn from.
type AnnotationShapes = {
    draw: DrawShape;
    arrow: Segment;
    playerLine: { players: [number, number] };
    teamShape: { players: number[] };
    playerFocus: { playerId: number };
};

export type AnnotationType = keyof AnnotationShapes;

type Annotation = {
    [T in AnnotationType]: { type: T; frameStart?: number; frameEnd?: number; shape: AnnotationShapes[T] };
}[AnnotationType];

type AnnotationOfType<T extends AnnotationType> = Extract<Annotation, { type: T }>;

// An annotation as getAllAnnotations lists it and load takes it back.
export type StoredAnnotation = {
    [T in AnnotationType]: { key: string; type: T; frameStart: number; frameEnd: number | null; shape: AnnotationShapes[T] };
}[AnnotationType];

let drawCounter = 0;
function newDrawKey(type: string): string {
    return `${type}|${Date.now().toString(36)}-${(drawCounter++).toString(36)}`;
}

let playerLineCounter = 0;
function newPlayerLineKey(): string {
    // Immutable identity: independent of the pair and frame range, which are mutable data
    return `playerLine|${Date.now().toString(36)}-${(playerLineCounter++).toString(36)}`;
}

let arrowCounter = 0;
function newArrowKey(): string {
    return `arrow|${Date.now().toString(36)}-${(arrowCounter++).toString(36)}`;
}

let teamShapeCounter = 0;
function newTeamShapeKey(): string {
    return `teamShape|${Date.now().toString(36)}-${(teamShapeCounter++).toString(36)}`;
}

let playerFocusCounter = 0;
function newPlayerFocusKey(): string {
    return `playerFocus|${Date.now().toString(36)}-${(playerFocusCounter++).toString(36)}`;
}

// A team shape needs a triangle at least; fewer players enclose no area.
export const MIN_TEAM_SHAPE_PLAYERS = 3;

// A fresh key for another annotation like this one, made the way its type's keys are.
function newKeyLike(annotation: Annotation): string {
    switch (annotation.type) {
        case 'playerLine': return newPlayerLineKey();
        case 'arrow': return newArrowKey();
        case 'teamShape': return newTeamShapeKey();
        case 'playerFocus': return newPlayerFocusKey();
        default: return newDrawKey(annotation.shape.type);
    }
}

function samePair(a: number[], b: number[]): boolean {
    const norm = (p: number[]) => [...p].sort((x, y) => x - y).join(',');
    return norm(a) === norm(b);
}

export default class AnnotationStore {
    private active_annotations: Map<string, Annotation> = new Map() // Contains all currently active annotations
    private annotations: Map<string, Annotation> = new Map() // Contains all annotations

    reconstruct_active_annotations(currentFrame: number) {
        // Rebuilds the active set from each annotation's own [frameStart, frameEnd) range. The ranges are the
        // single source of truth for visibility (and for the timeline bars), so nothing else may track it.
        this.active_annotations.clear()
        for (const [key, annotation] of this.annotations.entries()) {
            const start = annotation.frameStart ?? 0
            if (start > currentFrame) continue;
            if (annotation.frameEnd !== undefined && annotation.frameEnd <= currentFrame) continue;
            this.active_annotations.set(key, annotation)
        }
    }

    private discardAnnotation(key: string) {
        // Annotation was created and deleted on the same frame - never store it
        this.annotations.delete(key);
        this.active_annotations.delete(key);
    }

    update_active_annotation(currentFrame: number) {
        // Keeps active annotations current
        this.reconstruct_active_annotations(currentFrame)
    }

    addPlayerLineAnnotation(player1: number, player2: number, currentFrame: number){
        // Create a player line annotation and add it to the store
        const annotation: Annotation = {
            type: 'playerLine',
            shape: {
                players: [player1, player2]
            }
        };
        logger.info("Add player line annotation called for players:", player1, player2, "at frame:", currentFrame);
        // const uniqueKey = createShapeKey(annotation.shape, currentFrame);
        // if (this.active_annotations.has(uniqueKey)) return;
        // loop through active annotations to check if an identical annotation already exists (to prevent duplicates from relayout events)
        for (const existingAnnotation of this.active_annotations.values()) {
            if (existingAnnotation.type !== 'playerLine') continue;
            if (samePair(existingAnnotation.shape.players, annotation.shape.players)) {
                return;
            }
        }
        const uniqueKey = newPlayerLineKey();
        annotation.frameStart = currentFrame;
        annotation.frameEnd = undefined;
        this.annotations.set(uniqueKey, annotation);
        this.update_active_annotation(currentFrame)
    }

    addDrawAnnotation(shape: DrawShape, currentFrame: number) {
        // A rectangle or line drawn on the pitch. Shapes saved before they were drawn by PitchKit are Plotly
        // shape objects, which carry the same type and corners, so both load alike.
        logger.info("Added draw annotation at frame:", currentFrame);
        this.annotations.set(newDrawKey(shape.type), {
            type: 'draw',
            frameStart: currentFrame,
            frameEnd: undefined,
            shape: { ...shape },
        });
        this.update_active_annotation(currentFrame)
    }

    updateAnnotationGeometry(key: string, geometry: Segment) {
        // Moves or reshapes a drawn shape or an arrow over its whole range, keeping anything else it carries.
        const annotation = this.annotations.get(key);
        if (annotation?.type === 'draw') annotation.shape = { ...annotation.shape, ...geometry };
        else if (annotation?.type === 'arrow') annotation.shape = { ...annotation.shape, ...geometry };
    }

    addArrowAnnotation(x0: number, y0: number, x1: number, y1: number, currentFrame: number) {
        logger.info("Added arrow annotation at frame:", currentFrame);
        this.annotations.set(newArrowKey(), {
            type: 'arrow',
            frameStart: currentFrame,
            frameEnd: undefined,
            shape: { x0, y0, x1, y1 },
        });
        this.update_active_annotation(currentFrame)
    }

    togglePlayerFocus(playerId: number, currentFrame: number) {
        // Focuses the player from this frame on, open-ended like any new annotation; a player already
        // focused here is unfocused from this frame instead, so the focus still shows before it.
        const focused = this.getPlayerFocusAnnotations().find((focus) => focus.playerId === playerId);
        if (focused) {
            this.endAnnotation(focused.key, currentFrame);
            return;
        }
        logger.info("Added player focus annotation for player:", playerId, "at frame:", currentFrame);
        this.annotations.set(newPlayerFocusKey(), {
            type: 'playerFocus',
            frameStart: currentFrame,
            frameEnd: undefined,
            shape: { playerId },
        });
        this.update_active_annotation(currentFrame)
    }

    private activeOfType<T extends AnnotationType>(type: T): Array<[string, AnnotationOfType<T>]> {
        return Array.from(this.active_annotations.entries()).filter(
            (entry): entry is [string, AnnotationOfType<T>] => entry[1].type === type
        );
    }

    getPlayerFocusAnnotations(): Array<{ key: string; playerId: number }> {
        return this.activeOfType('playerFocus').map(([key, annotation]) => ({ key, playerId: annotation.shape.playerId }));
    }

    setTeamShapePlayers(key: string | null, players: number[], currentFrame: number): string | null {
        // Creates the team shape `key` or changes the players it is drawn around, and returns its key.
        // With too few players left to enclose an area the shape is dropped and null returned.
        const existing = key ? this.annotations.get(key) : undefined;
        if (players.length < MIN_TEAM_SHAPE_PLAYERS) {
            if (key) this.removeAnnotation(key);
            return null;
        }
        if (key && existing?.type === 'teamShape') {
            existing.shape = { players: [...players] };
            return key;
        }
        logger.info("Added team shape annotation at frame:", currentFrame);
        const uniqueKey = newTeamShapeKey();
        this.annotations.set(uniqueKey, {
            type: 'teamShape',
            frameStart: currentFrame,
            frameEnd: undefined,
            shape: { players: [...players] },
        });
        this.update_active_annotation(currentFrame)
        return uniqueKey;
    }

    getTeamShapeAnnotations(): Array<{ key: string; players: number[] }> {
        return this.activeOfType('teamShape').map(([key, annotation]) => ({ key, players: annotation.shape.players }));
    }

    getArrowAnnotations(): Array<Segment & { key: string }> {
        return this.activeOfType('arrow')
            .map(([key, annotation]) => ({ key, x0: annotation.shape.x0, y0: annotation.shape.y0, x1: annotation.shape.x1, y1: annotation.shape.y1 }));
    }

    getPlayerLineAnnotations(): Array<{ key: string; players: [number, number] }> {
        return this.activeOfType('playerLine').map(([key, annotation]) => ({ key, players: annotation.shape.players }));
    }

    getDrawAnnotations(): Array<{ key: string; shape: DrawShape }> {
        return this.activeOfType('draw')
            .filter(([, { shape }]) => shape.type === 'rect' || shape.type === 'line')
            .map(([key, { shape }]) => ({ key, shape: { type: shape.type, x0: shape.x0, y0: shape.y0, x1: shape.x1, y1: shape.y1 } }));
    }

    getAllAnnotations(): StoredAnnotation[] {
        // Returns every annotation ever created (not just the ones active at a given frame), for timeline display
        return Array.from(this.annotations.entries()).map(([key, annotation]) => ({
            key,
            ...annotation,
            frameStart: annotation.frameStart ?? 0,
            frameEnd: annotation.frameEnd ?? null,
        }));
    }

    updateAnnotationRange(key: string, frameStart: number, frameEnd: number | null, currentFrame: number) {
        // Moves/resizes an annotation (used by the timeline's draggable bars) and
        // rebuilds active_annotations for the current frame.
        const annotation = this.annotations.get(key);
        if (!annotation) return;

        annotation.frameStart = frameStart;
        annotation.frameEnd = frameEnd ?? undefined;

        logger.info("Updated annotation range", key, frameStart, frameEnd);
        this.reconstruct_active_annotations(currentFrame);
    }

    splitAnnotation(key: string, frame: number, currentFrame: number) {
        // Cuts an annotation in two at `frame` (the timeline's right-click split): it now ends there and a copy
        // under a new key runs on from it, open-ended if the original was. Nothing happens unless frame is inside it.
        const annotation = this.annotations.get(key);
        if (!annotation) return;
        const start = annotation.frameStart ?? 0;
        if (frame <= start || (annotation.frameEnd !== undefined && frame >= annotation.frameEnd)) return;

        this.annotations.set(newKeyLike(annotation), { ...structuredClone(annotation), frameStart: frame });
        annotation.frameEnd = frame;

        logger.info("Split annotation", key, "at frame:", frame);
        this.reconstruct_active_annotations(currentFrame);
    }

    endAnnotation(key: string, currentFrame: number) {
        // Erases an annotation from this frame on, so it still shows before it; one made on this very frame
        // is never stored.
        const annotation = this.annotations.get(key);
        if (!annotation) return;
        logger.info("Ended annotation", key, "at frame:", currentFrame);
        if ((annotation.frameStart ?? 0) >= currentFrame) this.discardAnnotation(key);
        else annotation.frameEnd = currentFrame;
        this.reconstruct_active_annotations(currentFrame);
    }

    removeAnnotation(key: string) {
        // Permanently drops a single annotation (used by the timeline's right-click delete).
        if (!this.annotations.has(key)) return;
        logger.info("Removed annotation", key);
        this.annotations.delete(key);
        this.active_annotations.delete(key);
    }

    clear() {
        // Discards every annotation, e.g. when the clip's segment changes and old
        // clip-relative frame numbers no longer refer to the same footage.
        logger.info("Clip annotations cleared");
        this.active_annotations.clear();
        this.annotations.clear();
    }

    load(saved: StoredAnnotation[], currentFrame: number = 0) {
        // Replaces the store's contents with previously saved annotations (see getAllAnnotations),
        // then rebuilding which of them are active at currentFrame.
        this.clear();
        for (const { key, ...item } of saved) {
            this.annotations.set(key, { ...item, frameEnd: item.frameEnd ?? undefined });
        }
        logger.info("Loaded annotations", saved.length);
        this.reconstruct_active_annotations(currentFrame);
    }

    describeAnnotationStore(){
        console.log('Active Annotations:', this.active_annotations)
        console.log('All Annotations:', this.annotations)
    }

}